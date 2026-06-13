/**
 * Day-by-day cash-flow report.
 *
 * For each day in the requested window (default 30, max 180), returns:
 *
 *   - orders         — paid orders booked that day
 *   - revenue        — sum of order.total for paid orders (gross)
 *   - refunds        — sum of refunded_amount_cents for orders booked
 *                      that day (partial OR full); subtracted from
 *                      revenue/profit math so the report reflects what
 *                      actually stuck
 *   - cogs           — sum of unit cost × quantity from order_items, per
 *                      catalog costCents lookup
 *   - hasMissingCost — true if any line on a paid order that day had no
 *                      cost-on-file (so admin knows the COGS / profit
 *                      number is incomplete)
 *   - fee            — estimated processor fee = revenue × PROCESSING_FEE_RATE.
 *                      This template ships without a processor, so the rate
 *                      defaults to 0. Set it to your processor's effective
 *                      rate once you wire one.
 *   - cashDeposited  — revenue − refunds − fee
 *   - grossProfit    — (revenue − refunds) − cogs. Excludes processor
 *                      economics; use this for product-mix decisions
 *   - netProfit      — (revenue − refunds) − cogs − fee. Bottom-line P&L
 *
 * `paymentStatus = 'completed'` filter matches the rest of the admin
 * stats endpoints so revenue numbers reconcile across reports.
 *
 * Refunds: we count orders by their original booked day (`created_at`),
 * not the refund timestamp — matching how an accountant books the reversal.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { sql, gte, eq, and } from "drizzle-orm";
import { getVariantCostCents } from "@/lib/profit";

// Estimated processor fee rate. No payment processor is wired in this
// template, so this defaults to 0. Set it to your processor's effective
// rate (e.g. 0.029 for ~2.9%) once you integrate one — the report + UI
// reconcile automatically.
const PROCESSING_FEE_RATE = 0;

interface DailyRow {
  day: string;                  // YYYY-MM-DD in America/Chicago
  orders: number;               // paid orders booked that day
  revenue: number;              // gross, cents
  refunds: number;              // cents
  cogs: number;                 // cents
  hasMissingCost: boolean;
  fee: number;                  // cents — revenue × PROCESSING_FEE_RATE
  cashDeposited: number;        // cents — revenue − refunds − fee
  grossProfit: number;          // cents — (revenue − refunds) − cogs
  netProfit: number;            // cents — (revenue − refunds) − cogs − fee
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = parseInt(searchParams.get("days") || "30", 10);
  // Clamp to a sane range — too short isn't useful, too long is a perf
  // and cost-lookup hit. 180d covers a fiscal quarter comfortably.
  const days = Math.max(1, Math.min(180, Number.isFinite(daysParam) ? daysParam : 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // ── 1) Per-day order rollup (revenue + refunds) ──────────────────
  const dayRows = await db
    .select({
      day: sql<string>`to_char((${orders.createdAt} AT TIME ZONE 'America/Chicago')::date, 'YYYY-MM-DD')`,
      orders: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      refunds: sql<number>`coalesce(sum(${orders.refundedAmountCents}), 0)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, since),
        eq(orders.paymentStatus, "completed"),
      ),
    )
    .groupBy(sql`(${orders.createdAt} AT TIME ZONE 'America/Chicago')::date`)
    .orderBy(sql`(${orders.createdAt} AT TIME ZONE 'America/Chicago')::date asc`);

  // ── 2) Per-day COGS rollup (computed in JS from per-line items) ──
  const lineRows = await db
    .select({
      day: sql<string>`to_char((${orders.createdAt} AT TIME ZONE 'America/Chicago')::date, 'YYYY-MM-DD')`,
      sku: orderItems.variantSku,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .innerJoin(orders, sql`${orders.id} = ${orderItems.orderId}`)
    .where(
      and(
        gte(orders.createdAt, since),
        eq(orders.paymentStatus, "completed"),
      ),
    );

  const cogsByDay = new Map<string, { cogs: number; missing: boolean }>();
  for (const r of lineRows) {
    const cur = cogsByDay.get(r.day) || { cogs: 0, missing: false };
    const unitCost = getVariantCostCents(r.sku);
    if (unitCost == null) {
      cur.missing = true;
    } else {
      cur.cogs += unitCost * Number(r.quantity);
    }
    cogsByDay.set(r.day, cur);
  }

  // ── 3) Stitch together + apply fee math ──────────────────────────
  const rollup: DailyRow[] = dayRows.map((d) => {
    const revenue = Number(d.revenue);
    const refunds = Number(d.refunds);
    const ordersCount = Number(d.orders);
    const { cogs, missing } = cogsByDay.get(d.day) || { cogs: 0, missing: false };

    const fee = Math.round(revenue * PROCESSING_FEE_RATE);
    const netRevenue = revenue - refunds;
    const cashDeposited = netRevenue - fee;
    const grossProfit = netRevenue - cogs;
    const netProfit = netRevenue - cogs - fee;

    return {
      day: d.day,
      orders: ordersCount,
      revenue,
      refunds,
      cogs,
      hasMissingCost: missing,
      fee,
      cashDeposited,
      grossProfit,
      netProfit,
    };
  });

  const totals = rollup.reduce(
    (acc, r) => {
      acc.orders += r.orders;
      acc.revenue += r.revenue;
      acc.refunds += r.refunds;
      acc.cogs += r.cogs;
      acc.fee += r.fee;
      acc.cashDeposited += r.cashDeposited;
      acc.grossProfit += r.grossProfit;
      acc.netProfit += r.netProfit;
      acc.hasMissingCost = acc.hasMissingCost || r.hasMissingCost;
      return acc;
    },
    {
      orders: 0,
      revenue: 0,
      refunds: 0,
      cogs: 0,
      fee: 0,
      cashDeposited: 0,
      grossProfit: 0,
      netProfit: 0,
      hasMissingCost: false,
    },
  );

  return NextResponse.json({
    days,
    constants: {
      processingFeeRate: PROCESSING_FEE_RATE,
    },
    rollup,
    totals,
  });
}
