/**
 * Revenue by US state. Aggregates paid orders by
 * shipping_address.state and returns counts + revenue. Used to:
 *   - Set Meta / Google Ads state-level bid modifiers
 *   - Plan eventual regional fulfillment (East-coast warehouse, etc.)
 *   - Spot organic-search hot spots that warrant local content / SEO
 *
 * Default window 90d (covers a full quarter of buying patterns).
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.max(1, Math.min(365, parseInt(searchParams.get("days") || "90", 10)));

  // shipping_address is a jsonb column with { state: "TX", ... }. We
  // upper-case + strip non-letters so "tx", "Tx", "Texas" don't fragment
  // (most order forms hard-validate to 2-letter caps but the cleanup
  // is cheap insurance).
  const result = await db.execute(sql`
    SELECT
      UPPER(NULLIF(REGEXP_REPLACE(COALESCE(shipping_address->>'state', ''), '[^A-Za-z]', '', 'g'), '')) AS state,
      COUNT(*) AS orders,
      COALESCE(SUM(total), 0) AS revenue,
      COALESCE(SUM(refunded_amount_cents), 0) AS refunds,
      COUNT(DISTINCT email) AS distinct_buyers
    FROM orders
    WHERE payment_status = 'completed'
      AND created_at >= now() - (${days} || ' days')::interval
      AND shipping_address IS NOT NULL
    GROUP BY state
    HAVING UPPER(NULLIF(REGEXP_REPLACE(COALESCE(shipping_address->>'state', ''), '[^A-Za-z]', '', 'g'), '')) IS NOT NULL
    ORDER BY revenue DESC
  `);

  const rows = (result.rows as Array<{
    state: string;
    orders: string | number;
    revenue: string | number;
    refunds: string | number;
    distinct_buyers: string | number;
  }>).map((r) => {
    const orders = Number(r.orders);
    const revenue = Number(r.revenue);
    const refunds = Number(r.refunds);
    const buyers = Number(r.distinct_buyers);
    return {
      state: r.state,
      orders,
      revenue,
      refunds,
      netRevenue: revenue - refunds,
      distinctBuyers: buyers,
      aov: orders > 0 ? Math.round(revenue / orders) : 0,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.orders += r.orders;
      acc.revenue += r.revenue;
      acc.refunds += r.refunds;
      acc.netRevenue += r.netRevenue;
      acc.distinctBuyers += r.distinctBuyers;
      return acc;
    },
    { orders: 0, revenue: 0, refunds: 0, netRevenue: 0, distinctBuyers: 0 },
  );

  return NextResponse.json({ days, rows, totals });
}
