/**
 * Back-to-back duplicate-order detection.
 *
 * When a customer places a second paid order within DUP_WINDOW_MIN
 * minutes of an earlier paid order AND the line-item contents are
 * identical (same SKUs and same quantities), we treat it as a likely
 * accidental double-submit and:
 *
 *   1. Stamp `orders.dup_of_order_id` on the newer order pointing at
 *      the original. Surfaces as "Possible duplicate" in the admin
 *      Orders tab.
 *   2. Send the customer a confirmation SMS giving them a window to
 *      reply "DUP" if they actually meant to cancel the second.
 *   3. Update `orders.dup_confirmation_sms_sent_at` so a retry does
 *      not double-text.
 *
 * Call this from your payment processor's success path (e.g. its
 * webhook) as fire-and-forget. Errors are logged but never block
 * fulfillment.
 *
 * The detection scope is per-userId (when present) AND falls back to
 * email when guest-checkout. We do NOT match across email + user (a
 * signed-in customer with a different email on file is treated as
 * separate). Phone match would be more reliable but requires phone
 * being captured at order time — already standard since the
 * 2026-05-03 backfill.
 */
import { db } from "./db";
import { orders, orderItems, users } from "./db/schema";
import { eq, and, gte, lt, isNull, ne, sql } from "drizzle-orm";
import { sendSMS } from "./twilio";

const DUP_WINDOW_MIN = 5;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://basedresearch.com")
  .replace(/\/+$/, "");

interface ItemKey {
  sku: string;
  qty: number;
}

/**
 * Canonicalize a list of items into a comparable string. Sorted by
 * SKU + summed qty per SKU so two carts with the same end-state in
 * different add-orders compare equal.
 */
function fingerprint(items: ItemKey[]): string {
  const totals = new Map<string, number>();
  for (const it of items) {
    totals.set(it.sku, (totals.get(it.sku) ?? 0) + it.qty);
  }
  return [...totals.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([sku, qty]) => `${sku}x${qty}`)
    .join("|");
}

/**
 * Pre-checkout duplicate guard. Looks for a recent COMPLETED order
 * (within DUP_WINDOW_MIN minutes) from the same customer with an
 * identical line-item fingerprint. Returns the matching order if
 * found so the caller can 409-block the new checkout request.
 *
 * Only completed orders count as duplicates. Unpaid / pending rows
 * are NOT blockers — the gated CheckoutClient auto-fires a fresh
 * order mint every time the address fingerprint stabilizes, which
 * legitimately creates several unpaid rows during a single checkout
 * session. Treating those as "duplicates" was a false-positive that
 * silently broke /checkout on 2026-05-12 (the iframe stopped
 * minting after the customer's first address-edit, so they could
 * never pay). Iframe-invalidation client-side + the stale-order
 * cleanup cron handle the unpaid-row hygiene; this guard's only
 * job is preventing an actual second charge.
 *
 * Strictly stronger than `detectAndFlagDuplicateOrder` (which runs
 * AFTER create and only flags + texts). This one prevents creation
 * entirely — called from /api/checkout on each POST.
 *
 * Caller passes the cart they're about to charge for plus either a
 * userId (signed-in flow) or email (guest). Returns:
 *   - the existing order's `orderNumber` + `paymentStatus` if a
 *     match is found — caller should 409 with a redirect back to
 *     that order's callback page
 *   - null if there's no recent matching paid order — proceed
 */
export async function findRecentMatchingOrder(args: {
  userId: string | null;
  email: string;
  items: ItemKey[];
}): Promise<{
  orderNumber: string;
  paymentStatus: string | null;
  createdAt: Date;
} | null> {
  const cutoff = new Date(Date.now() - DUP_WINDOW_MIN * 60 * 1000);
  // Match by user when signed in, by email otherwise. Same scope
  // semantics as detectAndFlagDuplicateOrder.
  const scope = args.userId
    ? eq(orders.userId, args.userId)
    : eq(orders.email, args.email);
  const recent = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        scope,
        gte(orders.createdAt, cutoff),
        // CRITICAL: only completed orders trigger the block. See
        // header docblock for why — short version, the auto-firing
        // iframe creates unpaid rows that this guard would
        // false-positive on.
        eq(orders.paymentStatus, "completed"),
      ),
    )
    .orderBy(sql`${orders.createdAt} desc`)
    .limit(10);
  if (recent.length === 0) return null;

  const incomingFp = fingerprint(args.items);

  for (const candidate of recent) {
    const lineRows = await db
      .select({
        sku: orderItems.variantSku,
        qty: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, candidate.id));
    if (lineRows.length === 0) continue;
    const candidateFp = fingerprint(
      lineRows.map((r) => ({ sku: r.sku, qty: Number(r.qty) })),
    );
    if (candidateFp === incomingFp) {
      return {
        orderNumber: candidate.orderNumber,
        paymentStatus: candidate.paymentStatus,
        createdAt: candidate.createdAt,
      };
    }
  }
  return null;
}

/**
 * Check the order against orders booked in the previous DUP_WINDOW_MIN
 * minutes for the same customer. If a content match is found, mark
 * + text. Idempotent — safe to call from multiple webhook paths for
 * the same order; the existence check on dup_of_order_id prevents
 * double-tagging and dup_confirmation_sms_sent_at prevents
 * double-texting.
 */
export async function detectAndFlagDuplicateOrder(orderId: string): Promise<void> {
  try {
    // Pull the just-booked order. If it is already tagged we are done.
    const [current] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        email: orders.email,
        customerPhone: orders.customerPhone,
        createdAt: orders.createdAt,
        paymentStatus: orders.paymentStatus,
        dupOfOrderId: orders.dupOfOrderId,
        dupSmsSentAt: orders.dupConfirmationSmsSentAt,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!current) return;
    if (current.dupOfOrderId) return; // already flagged
    if (current.paymentStatus !== "completed") return;
    if (!current.email) return;

    const windowStart = new Date(
      current.createdAt.getTime() - DUP_WINDOW_MIN * 60 * 1000,
    );

    // Look for prior paid orders inside the window for the same
    // customer. Match by userId when present, otherwise by email
    // (case-insensitive). We exclude the current order itself.
    const matchOnUserId =
      current.userId !== null
        ? eq(orders.userId, current.userId)
        : sql`lower(${orders.email}) = lower(${current.email})`;

    const candidates = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        and(
          matchOnUserId,
          ne(orders.id, current.id),
          eq(orders.paymentStatus, "completed"),
          gte(orders.createdAt, windowStart),
          lt(orders.createdAt, current.createdAt),
          // Don't match against orders that were themselves already
          // flagged as duplicates — only the original.
          isNull(orders.dupOfOrderId),
        ),
      );

    if (candidates.length === 0) return;

    // Pull line items for the current order + each candidate so we can
    // compare contents.
    const currentItems = await loadOrderItems(current.id);
    const currentFp = fingerprint(currentItems);
    if (!currentFp) return;

    let matched: { id: string; orderNumber: string } | null = null;
    for (const cand of candidates) {
      const candItems = await loadOrderItems(cand.id);
      if (fingerprint(candItems) === currentFp) {
        matched = { id: cand.id, orderNumber: cand.orderNumber };
        break;
      }
    }

    if (!matched) return;

    // Tag the newer order. Atomic claim so a concurrent run can't double-stamp.
    const tagged = await db
      .update(orders)
      .set({ dupOfOrderId: matched.id, updatedAt: new Date() })
      .where(and(eq(orders.id, current.id), isNull(orders.dupOfOrderId)))
      .returning({ id: orders.id });
    if (tagged.length === 0) return; // someone else got there first

    // Confirmation SMS to the customer. Best-effort — log on failure
    // but never throw out of this helper.
    if (current.customerPhone && !current.dupSmsSentAt) {
      try {
        const firstName = await resolveFirstName(current.userId);
        const namePart = firstName ? `${firstName}, ` : "";
        const body =
          `Based Research: ${namePart}we received two orders from you within ${DUP_WINDOW_MIN} min ` +
          `(${matched.orderNumber} and ${current.orderNumber}) with the same items. ` +
          `If both are intentional, no action needed. If the second was a duplicate, ` +
          `reply DUP and we will cancel & refund it. Otherwise both ship as ordered.`;
        const sent = await sendSMS(current.customerPhone, body);
        if (sent) {
          await db
            .update(orders)
            .set({ dupConfirmationSmsSentAt: new Date() })
            .where(eq(orders.id, current.id));
        }
      } catch (err) {
        console.warn(
          `[dup-detection] SMS to ${current.customerPhone} failed for ${current.orderNumber}:`,
          err,
        );
      }
    }

    console.log(
      `[dup-detection] Flagged ${current.orderNumber} as duplicate of ${matched.orderNumber} (window ${DUP_WINDOW_MIN}min, identical contents).`,
    );
  } catch (err) {
    console.error(`[dup-detection] failed for ${orderId}:`, err);
  }
}

async function loadOrderItems(orderId: string): Promise<ItemKey[]> {
  const rows = await db
    .select({ sku: orderItems.variantSku, qty: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  return rows.map((r) => ({ sku: r.sku, qty: r.qty }));
}

async function resolveFirstName(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const [u] = await db
    .select({ firstName: users.firstName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return u?.firstName ?? null;
}

// Re-exported for testing + so the linter knows we're not unused.
export { SITE_URL as _DUP_SITE_URL_FOR_TESTS };
