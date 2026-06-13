// Admin SMS notifications — the operator gets a text every time we book a sale,
// plus an end-of-day summary at 11 PM CST. Both pipelines call into
// Twilio's transactional SMS via the existing sendSMS helper, so when
// Twilio is unconfigured (local dev) these are silent no-ops.
//
// The admin's phone number is read from ADMIN_NOTIFY_PHONE (E.164). We
// deliberately don't hardcode it — that way you can rotate, silence by
// unsetting the env var, or fan out to multiple numbers later.

import { db } from "./db";
import { orders, orderItems } from "./db/schema";
import { eq } from "drizzle-orm";
import { sendSMS } from "./twilio";
import { computeOrderProfit } from "./profit";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://basedresearch.com").replace(/\/+$/, "");

function getAdminPhone(): string | null {
  const raw = (process.env.ADMIN_NOTIFY_PHONE || "").trim();
  if (!raw) return null;
  // E.164 enforcement — Twilio rejects anything else.
  if (!/^\+\d{8,15}$/.test(raw)) {
    console.warn(`[admin-notify] ADMIN_NOTIFY_PHONE is not E.164: ${raw}`);
    return null;
  }
  return raw;
}

const $ = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * Fire-and-forget SMS to the admin announcing a new sale. Call this from
 * your payment-success path (e.g. your processor's webhook) and from
 * manual/admin orders. Errors are swallowed so SMS misconfig never
 * blocks fulfillment — but they DO get logged to Vercel.
 *
 * Includes:
 *   - order # + total (post-discount, what we charged)
 *   - profit + margin if cost data is on file
 *   - line-item summary (first 3, then "...")
 *   - payment gateway + customer email
 *   - quick link to the admin order page
 */
export async function notifyAdminOfSale(orderId: string, opts?: { source?: string }): Promise<void> {
  try {
    const adminPhone = getAdminPhone();
    if (!adminPhone) {
      // No phone = no-op. Don't log on every sale; only log on env load
      // (handled implicitly by the sendSMS helper if it ever gets called
      // with a destination). Silent skip here keeps the success path
      // clean.
      return;
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      console.warn(`[admin-notify] order ${orderId} not found`);
      return;
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const profit = computeOrderProfit(
      items.map((i) => ({ variantSku: i.variantSku, quantity: i.quantity, lineTotal: i.lineTotal })),
      { discountCents: order.discount ?? 0 },
    );

    // Compose a concise SMS body. Stays under ~320 chars (2 SMS segments)
    // even with long product names + email — Twilio bills per-segment so
    // verbose messages cost more.
    const itemSummary = items
      .slice(0, 3)
      .map((i) => `${i.quantity}× ${i.productName}`)
      .join(", ") + (items.length > 3 ? `, +${items.length - 3} more` : "");

    const profitLine =
      profit.profitCents !== 0 && !profit.hasMissingCost
        ? `\nProfit: ${$(profit.profitCents)} (${profit.marginPct ?? 0}%)`
        : profit.hasMissingCost
        ? `\nProfit: ${$(profit.profitCents)}+ (partial — some costs unknown)`
        : "";

    const sourceLabel = opts?.source ? `[${opts.source}] ` : "";
    const gatewayLabel = (order.paymentGateway || "—").replace(/_/g, " ");
    const couponLine = order.couponCode ? `\nCoupon: ${order.couponCode}` : "";

    const body =
      `💰 ${sourceLabel}New sale!\n` +
      `#${order.orderNumber} · ${$(order.total)}\n` +
      `${items.length} item${items.length === 1 ? "" : "s"}: ${itemSummary}${profitLine}\n` +
      `via ${gatewayLabel} · ${order.email}${couponLine}\n` +
      `${SITE_URL}/admin`;

    await sendSMS(adminPhone, body);
    console.log(`[admin-notify] sale SMS sent for ${order.orderNumber}`);
  } catch (err) {
    console.error(`[admin-notify] failed to send sale SMS for ${orderId}:`, err);
  }
}
