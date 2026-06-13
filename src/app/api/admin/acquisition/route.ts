/**
 * Acquisition source attribution. Rolls up paid orders by:
 *
 *   - utm_source / utm_medium / utm_campaign  (paid + tagged campaigns)
 *   - referrer_domain                         (organic / referral / social)
 *   - landing_path                            (which page they entered on)
 *
 * Returns three independent rollups (sources, referrers, landings) so
 * the UI can render each as its own table without the caller having to
 * pivot a flat list.
 *
 * Pure first-touch attribution, captured client-side (90d localStorage
 * TTL) and replayed at checkout. See src/lib/acquisition.ts for the
 * client tracker and src/lib/acquisition-server.ts for the server-side
 * extractor that persists to orders.utm_*.
 *
 * For orders booked before 2026-05-05 (when these columns landed), all
 * UTM fields are null — those orders bucket to "Untagged / direct" so
 * the rollup still totals to 100% of revenue, just with a chunky
 * unknown bucket near the top until the new columns fill in.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sql } from "drizzle-orm";

interface SourceRow {
  source: string;
  medium: string | null;
  campaign: string | null;
  orders: number;
  revenue: number;
  refunds: number;
  netRevenue: number;
  aov: number;
  distinctBuyers: number;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.max(1, Math.min(365, parseInt(searchParams.get("days") || "90", 10)));
  const groupBy = searchParams.get("groupBy") || "source"; // "source" | "campaign"

  // Three queries in parallel — separate concerns, separate tables.
  const sourcePromise = db.execute(sql`
    SELECT
      COALESCE(NULLIF(utm_source, ''), 'untagged') AS source,
      ${groupBy === "campaign"
        ? sql`COALESCE(NULLIF(utm_medium, ''), '—') AS medium, COALESCE(NULLIF(utm_campaign, ''), '—') AS campaign,`
        : sql`NULL::text AS medium, NULL::text AS campaign,`}
      COUNT(*) AS orders,
      COALESCE(SUM(total), 0) AS revenue,
      COALESCE(SUM(refunded_amount_cents), 0) AS refunds,
      COUNT(DISTINCT email) AS distinct_buyers
    FROM orders
    WHERE payment_status = 'completed'
      AND created_at >= now() - (${days} || ' days')::interval
    GROUP BY ${groupBy === "campaign"
      ? sql`COALESCE(NULLIF(utm_source, ''), 'untagged'), COALESCE(NULLIF(utm_medium, ''), '—'), COALESCE(NULLIF(utm_campaign, ''), '—')`
      : sql`COALESCE(NULLIF(utm_source, ''), 'untagged')`}
    ORDER BY revenue DESC
  `);

  const referrerPromise = db.execute(sql`
    SELECT
      COALESCE(NULLIF(referrer_domain, ''), 'direct / no referrer') AS referrer,
      COUNT(*) AS orders,
      COALESCE(SUM(total), 0) AS revenue,
      COALESCE(SUM(refunded_amount_cents), 0) AS refunds,
      COUNT(DISTINCT email) AS distinct_buyers
    FROM orders
    WHERE payment_status = 'completed'
      AND created_at >= now() - (${days} || ' days')::interval
    GROUP BY COALESCE(NULLIF(referrer_domain, ''), 'direct / no referrer')
    ORDER BY revenue DESC
    LIMIT 25
  `);

  const landingPromise = db.execute(sql`
    SELECT
      COALESCE(NULLIF(landing_path, ''), '/') AS path,
      COUNT(*) AS orders,
      COALESCE(SUM(total), 0) AS revenue,
      COUNT(DISTINCT email) AS distinct_buyers
    FROM orders
    WHERE payment_status = 'completed'
      AND created_at >= now() - (${days} || ' days')::interval
      AND landing_path IS NOT NULL
    GROUP BY COALESCE(NULLIF(landing_path, ''), '/')
    ORDER BY revenue DESC
    LIMIT 25
  `);

  const [sourceRes, referrerRes, landingRes] = await Promise.all([
    sourcePromise,
    referrerPromise,
    landingPromise,
  ]);

  const toNum = (v: unknown) => Number(v ?? 0);

  const sources: SourceRow[] = (sourceRes.rows as Array<Record<string, unknown>>).map((r) => {
    const orders = toNum(r.orders);
    const revenue = toNum(r.revenue);
    const refunds = toNum(r.refunds);
    return {
      source: String(r.source || "untagged"),
      medium: (r.medium as string | null) ?? null,
      campaign: (r.campaign as string | null) ?? null,
      orders,
      revenue,
      refunds,
      netRevenue: revenue - refunds,
      aov: orders > 0 ? Math.round(revenue / orders) : 0,
      distinctBuyers: toNum(r.distinct_buyers),
    };
  });

  const referrers = (referrerRes.rows as Array<Record<string, unknown>>).map((r) => {
    const orders = toNum(r.orders);
    const revenue = toNum(r.revenue);
    const refunds = toNum(r.refunds);
    return {
      referrer: String(r.referrer || "direct"),
      orders,
      revenue,
      refunds,
      netRevenue: revenue - refunds,
      distinctBuyers: toNum(r.distinct_buyers),
      aov: orders > 0 ? Math.round(revenue / orders) : 0,
    };
  });

  const landings = (landingRes.rows as Array<Record<string, unknown>>).map((r) => {
    const orders = toNum(r.orders);
    const revenue = toNum(r.revenue);
    return {
      path: String(r.path || "/"),
      orders,
      revenue,
      distinctBuyers: toNum(r.distinct_buyers),
      aov: orders > 0 ? Math.round(revenue / orders) : 0,
    };
  });

  return NextResponse.json({ days, groupBy, sources, referrers, landings });
}
