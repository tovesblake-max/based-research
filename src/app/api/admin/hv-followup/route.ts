/**
 * Admin tab data feed: high-value abandoned carts that warrant a
 * personalized follow-up text.
 *
 * GET → returns the eligible queue plus a pre-generated educational SMS body
 *       per cart (the body is what the click-to-text button drops into iMessage).
 * POST → stamps admin_followup_sent_at on a given orderId so it falls off the
 *        queue. Idempotent; also accepts { clear: true } to RE-arm a row.
 *
 * Eligibility:
 *   - payment_status='unpaid' AND status='pending'
 *   - customer_phone IS NOT NULL
 *   - total >= MIN_TOTAL_CENTS (default $100)
 *   - created_at within last 7 days (older than that, the customer is gone)
 *   - admin_followup_sent_at IS NULL (so once admin clicks, it disappears)
 *
 * Ordering: newest-first by default — operator presence at the moment of
 * abandonment matters more than total. Easy to flip in the UI later.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import {
  and,
  eq,
  isNull,
  isNotNull,
  gte,
  desc,
  inArray,
  gt,
  notInArray,
  ne,
  or,
  not,
  ilike,
  sql,
} from "drizzle-orm";
import { normalizePhone } from "@/lib/twilio";
import { buildFollowupMessage } from "@/lib/admin-followup-message";

// Tuned 2026-05-18 per the operator: expand window to 30d so every recent
// abandoned customer surfaces, not just the prior 7d slice. Floor lowered
// from $100 → $20 so we still filter out one-off trivial test carts
// without gating most real customer abandons. The UI sorts by total DESC
// so the biggest carts still rise to the top of the list.
const MIN_TOTAL_CENTS = 2_000;
const LOOKBACK_DAYS = 30;

// Internal accounts that should never appear in the customer follow-up
// queue (operator + test/QA addresses + ops integrations). The admin-role
// filter (via JOIN) catches role=admin users, but a literal email list ALSO
// catches guest checkouts where an internal email was typed in without a
// backing user account. Configure via the EXCLUDED_INTERNAL_EMAILS env var
// (comma-separated, lowercased).
const EXCLUDED_EMAILS_LOWER = (process.env.EXCLUDED_INTERNAL_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Pattern filters for emails that aren't worth typing into the EXCLUDED list
// one-by-one. Test-suite addresses use these conventions.
const EXCLUDED_EMAIL_PATTERNS = [
  "%@basedresearch.com", // internal test domain
  "%@example.com",            // smoketest_*
  "smoketest%",
  "%+test@%",
  "%test+%",
];

export async function GET() {
  try {
    await requireAdmin();

    const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // LEFT JOIN users so we can also exclude orders attached to admin-role
     // accounts (catches signed-in test orders where the email might not
     // match a static list — e.g. if the operator creates a new admin email later).
    // Guest orders have NULL userId, so the JOIN row is null and the
     // role check passes vacuously — we still rely on EXCLUDED_EMAILS_LOWER
     // and EXCLUDED_EMAIL_PATTERNS for those.
    const patternConds = EXCLUDED_EMAIL_PATTERNS.map((p) =>
      not(ilike(orders.email, p)),
    );

    // First, find every email that successfully paid for ANYTHING in the
    // lookback window. We exclude these from the follow-up queue because a
    // customer who eventually bought (even a different cart) doesn't need a
    // "you abandoned your cart" SMS — that reads as broken automation.
    const paidEmails = await db
      .selectDistinct({ emailLower: sql<string>`lower(${orders.email})` })
      .from(orders)
      .where(
        and(
          eq(orders.paymentStatus, "completed"),
          gte(orders.createdAt, cutoff),
        ),
      );
    const paidEmailsLower = new Set(paidEmails.map((r) => r.emailLower));

    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        email: orders.email,
        customerPhone: orders.customerPhone,
        total: orders.total,
        subtotal: orders.subtotal,
        shippingAddress: orders.shippingAddress,
        createdAt: orders.createdAt,
        recoverySmsSentAt: orders.recoverySmsSentAt,
        adminFollowupSentAt: orders.adminFollowupSentAt,
        paymentStatus: orders.paymentStatus,
        paymentGateway: orders.paymentGateway,
      })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .where(
        and(
          // Broader: anything that didn't end up paying. Express auto-fire
          // creates unpaid rows that the every-6h cleanup cron later marks
          // cancelled, so a 7-day window without `cancelled` misses 90% of
          // the abandoned-cart surface. `failed` catches card declines —
          // those customers DO want a retry nudge.
          inArray(orders.paymentStatus, ["unpaid", "failed", "cancelled"]),
          isNotNull(orders.customerPhone),
          gt(orders.total, MIN_TOTAL_CENTS - 1),
          gte(orders.createdAt, cutoff),
          isNull(orders.adminFollowupSentAt),
          // Exclude admin-role users (NULL JOIN row = guest = passes).
          or(isNull(users.role), ne(users.role, "admin")),
          // Exclude internal/test literal emails (case-insensitive — we
          // lowercase the column inline since orders.email isn't itself
          // stored lowercased).
          notInArray(sql`lower(${orders.email})`, EXCLUDED_EMAILS_LOWER),
          // Pattern exclusions
          ...patternConds,
        ),
      )
      // Sort by total DESC so the highest-value abandoned carts are at top
      // of the queue — that's what "high-value follow-up" should feel like
      // when scrolling. Date is the tiebreaker for equal totals.
      .orderBy(desc(orders.total), desc(orders.createdAt))
      .limit(500);

    // Drop rows whose email later completed a payment in the same window —
    // they're not really "abandoned" from a customer perspective.
    const eligibleRows = rows.filter(
      (r) => !paidEmailsLower.has(r.email.toLowerCase()),
    );

    if (eligibleRows.length === 0) {
      return NextResponse.json({ carts: [] });
    }

    // Batch-fetch items so we can describe each cart without N+1.
    const orderIds = eligibleRows.map((r) => r.id);
    const items = await db
      .select({
        orderId: orderItems.orderId,
        productName: orderItems.productName,
        variantSize: orderItems.variantSize,
        slug: orderItems.slug,
        quantity: orderItems.quantity,
        lineTotal: orderItems.lineTotal,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    const itemsByOrder = new Map<string, typeof items>();
    for (const it of items) {
      const arr = itemsByOrder.get(it.orderId) ?? [];
      arr.push(it);
      itemsByOrder.set(it.orderId, arr);
    }

    const allCarts = eligibleRows.map((r) => {
      const sa = r.shippingAddress as { firstName?: string } | null;
      const firstName = sa?.firstName?.trim() || null;
      const cartItems = (itemsByOrder.get(r.id) ?? []).map((it) => ({
        productName: it.productName,
        variantSize: it.variantSize,
        slug: it.slug,
        quantity: it.quantity,
        lineTotalCents: it.lineTotal,
      }));

      const suggestedMessage = buildFollowupMessage({
        firstName,
        totalCents: r.total,
        items: cartItems,
      });

      const customerPhoneE164 =
        normalizePhone(r.customerPhone || "", "+1") || r.customerPhone;

      const ageMinutes = Math.round(
        (Date.now() - new Date(r.createdAt).getTime()) / 60_000,
      );

      return {
        orderId: r.id,
        orderNumber: r.orderNumber,
        email: r.email,
        customerPhone: r.customerPhone,
        customerPhoneE164,
        firstName,
        totalCents: r.total,
        subtotalCents: r.subtotal,
        ageMinutes,
        createdAt: r.createdAt.toISOString(),
        recoverySmsSentAt: r.recoverySmsSentAt
          ? r.recoverySmsSentAt.toISOString()
          : null,
        // Why this cart ended up here. "failed" = card declined (might
        // want to swap to a softer-touch message). "cancelled" = aged
        // out via cleanup cron. "unpaid" = still actively pending,
        // typically <1h old.
        paymentStatus: r.paymentStatus,
        paymentGateway: r.paymentGateway,
        items: cartItems,
        suggestedMessage,
      };
    });

    // Dedupe by email (lowercased) — keep the highest-total cart per
    // customer, then date-tiebreak by most-recent. A customer who retries
    // checkout can leave several unpaid rows within a few minutes, so the
    // same email routinely has 2-5 unpaid rows. Texting each one separately
    // would look unhinged. One row per unique customer email gives the operator
    // one decision per actual abandon and the phone on the highest-
    // total row is also the most-recent context the customer entered.
    //
    // We also track the duplicate count so the UI can show a
    // "+N other carts from this customer" affordance if the operator wants
    // to drill into the full sibling list later — for now it's just
    // metadata. ghostCartCount=0 means a clean single cart.
    const byEmail = new Map<string, (typeof allCarts)[number] & { ghostCartCount: number }>();
    for (const cart of allCarts) {
      const key = cart.email.toLowerCase();
      const existing = byEmail.get(key);
      if (!existing) {
        byEmail.set(key, { ...cart, ghostCartCount: 0 });
      } else {
        existing.ghostCartCount += 1;
        // Already sorted by total DESC then createdAt DESC at the SQL
        // layer, so the first one we see for an email is the winner.
        // The else branch just bumps the counter on subsequent rows.
      }
    }

    const carts = Array.from(byEmail.values());

    return NextResponse.json({
      carts,
      threshold: MIN_TOTAL_CENTS / 100,
      lookbackDays: LOOKBACK_DAYS,
      rawCartCount: allCarts.length,
      uniqueCustomerCount: carts.length,
    });
  } catch (error) {
    console.error("Admin hv-followup GET error:", error);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

// Mark sent (or re-arm) — called when the operator clicks "Send" in the UI.
// Stamps adminFollowupSentAt so the row disappears from the queue on next
// fetch. Best-effort: we can't confirm the operator actually sent the iMessage
// after the sms: link opened, but stamping the click prevents the same row
// from being surfaced twice.
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const orderId = typeof body.orderId === "string" ? body.orderId : null;
    const clear = body.clear === true;

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
    }

    // Find the order's email so we can stamp all the ghost siblings in
    // one shot (a customer who retried checkout can leave multiple unpaid
    // rows; texting one then leaving the others in the queue would
    // re-surface the same customer next refresh).
    const [target] = await db
      .select({ id: orders.id, email: orders.email })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const stamp = clear ? null : new Date();
    const targetEmailLower = target.email.toLowerCase();

    // Update every unpaid sibling under the same email so the customer
    // disappears from the queue entirely after one click. Limiting to
    // unpaid+pending so we don't trample stamps on historical paid orders.
    const updated = await db
      .update(orders)
      .set({ adminFollowupSentAt: stamp, updatedAt: new Date() })
      .where(
        and(
          eq(orders.paymentStatus, "unpaid"),
          eq(orders.status, "pending"),
          sql`lower(${orders.email}) = ${targetEmailLower}`,
        ),
      )
      .returning({
        id: orders.id,
        orderNumber: orders.orderNumber,
        adminFollowupSentAt: orders.adminFollowupSentAt,
      });

    return NextResponse.json({
      ok: true,
      stampedCount: updated.length,
      orders: updated,
    });
  } catch (error) {
    console.error("Admin hv-followup POST error:", error);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
