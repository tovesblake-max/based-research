/**
 * Stale unpaid-order cleanup cron.
 *
 * Checkout mints an order row the moment the customer completes their
 * address — even if they bail before paying. Those phantom rows pile up
 * in the admin Orders tab with paymentStatus="unpaid" forever unless we
 * clean them.
 *
 * This cron flips any order that's been sitting unpaid for >24 hours
 * to status="cancelled" so they drop off the active orders view but
 * stay in the DB for analytics + audit. If you wire a payment processor
 * whose webhook can land late, promote those orders to paid before this
 * cron runs; whatever remains unpaid after 24h is genuinely abandoned.
 *
 * Schedule: every 6 hours (4x daily). Heartbeat at the end so the
 * cron's silent failure mode is detectable.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { and, inArray, lt, ne, sql } from "drizzle-orm";

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24h
const BATCH_SIZE = 200;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

  // Find stale unpaid / pending orders that aren't already terminal.
  // Both `paymentStatus` AND `status` are checked so a row marked
  // "cancelled" through some other path doesn't get re-touched.
  const stale = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      paymentGateway: orders.paymentGateway,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        inArray(orders.paymentStatus, ["unpaid", "pending"]),
        ne(orders.status, "cancelled"),
        ne(orders.status, "refunded"),
        lt(orders.createdAt, cutoff),
      ),
    )
    .limit(BATCH_SIZE);

  if (stale.length === 0) {
    if (process.env.HEARTBEAT_URL_CLEANUP_STALE_ORDERS) {
      fetch(process.env.HEARTBEAT_URL_CLEANUP_STALE_ORDERS).catch(() => {});
    }
    return NextResponse.json({ ok: true, cleaned: 0 });
  }

  // Single bulk UPDATE flipping status + appending the audit note in
  // SQL itself (so we don't clobber any pre-existing notes if an admin
  // had annotated the order before it timed out). drizzle's `sql`
  // template handles parameter binding for us.
  const auditLine = `Auto-cancelled ${new Date().toISOString()} — stale unpaid order >24h.`;
  await db
    .update(orders)
    .set({
      status: "cancelled",
      paymentStatus: "cancelled",
      notes: sql`COALESCE(${orders.notes}, '') || E'\n' || ${auditLine}`,
      updatedAt: new Date(),
    })
    .where(
      inArray(
        orders.id,
        stale.map((o) => o.id),
      ),
    );

  // Heartbeat (optional; configure HEARTBEAT_URL_CLEANUP_STALE_ORDERS
  // in env to point at a Better Stack / Cronitor / etc. URL).
  if (process.env.HEARTBEAT_URL_CLEANUP_STALE_ORDERS) {
    fetch(process.env.HEARTBEAT_URL_CLEANUP_STALE_ORDERS).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    cleaned: stale.length,
    cutoff: cutoff.toISOString(),
    sample: stale.slice(0, 5).map((o) => ({
      orderNumber: o.orderNumber,
      gateway: o.paymentGateway,
      ageHours: Math.round((Date.now() - o.createdAt.getTime()) / (60 * 60 * 1000)),
    })),
  });
}
