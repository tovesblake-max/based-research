/**
 * Cohort retention by signup month.
 *
 * For each calendar month of user signups, computes:
 *   - cohortSize:    distinct users who signed up in this month
 *   - buyersM0:      users who placed their first paid order in their
 *                    signup month
 *   - buyersM1/3/6:  users whose nth paid order came within 30/60/90/180d
 *                    of their first paid order (≥ 1 second order)
 *   - revenueM0:     revenue from first orders booked in the signup month
 *   - revenueLifetime: total paid revenue from this cohort (all-time)
 *   - aovLifetime:   lifetime revenue / lifetime order count for the cohort
 *
 * The "repeat at N days" columns are how you tell whether your
 * customer base is one-shot buyers or genuine repeats. For peptide
 * brands the 60-90 day window is the meaningful one — that's the
 * natural reorder cadence for most compounds.
 *
 * America/Chicago for month bucketing so months don't span weirdly
 * around midnight UTC.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sql } from "drizzle-orm";

interface CohortRow {
  cohort: string;            // YYYY-MM
  cohortSize: number;
  buyers: number;            // ever-purchased users in cohort
  conversionPct: number;     // buyers / cohortSize × 100
  buyersWithRepeat30d: number;
  buyersWithRepeat60d: number;
  buyersWithRepeat90d: number;
  buyersWithRepeat180d: number;
  revenueLifetime: number;   // cents
  ordersLifetime: number;
  aovLifetime: number;       // cents
  revenuePerSignup: number;  // cents — revenue / cohortSize
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const months = Math.max(1, Math.min(36, parseInt(searchParams.get("months") || "12", 10)));

  // One big CTE-style query — cheaper than 3 round trips. We bucket users
  // by signup month, join their paid orders, derive per-user
  // first/second-order timestamps, then aggregate cohort metrics.
  const result = await db.execute(sql`
    WITH user_cohorts AS (
      SELECT
        id AS user_id,
        to_char((created_at AT TIME ZONE 'America/Chicago')::date, 'YYYY-MM') AS cohort_month,
        created_at
      FROM users
      WHERE created_at >= (now() - (${months} || ' months')::interval)
    ),
    user_orders AS (
      SELECT
        o.user_id,
        o.created_at AS order_at,
        o.total AS order_total,
        ROW_NUMBER() OVER (PARTITION BY o.user_id ORDER BY o.created_at) AS rn
      FROM orders o
      WHERE o.payment_status = 'completed'
        AND o.user_id IS NOT NULL
    ),
    user_first_orders AS (
      SELECT user_id, order_at AS first_order_at FROM user_orders WHERE rn = 1
    ),
    user_repeat_metrics AS (
      SELECT
        uo.user_id,
        ufo.first_order_at,
        MAX(CASE WHEN uo.rn >= 2 AND uo.order_at <= ufo.first_order_at + interval '30 days' THEN 1 ELSE 0 END) AS r30,
        MAX(CASE WHEN uo.rn >= 2 AND uo.order_at <= ufo.first_order_at + interval '60 days' THEN 1 ELSE 0 END) AS r60,
        MAX(CASE WHEN uo.rn >= 2 AND uo.order_at <= ufo.first_order_at + interval '90 days' THEN 1 ELSE 0 END) AS r90,
        MAX(CASE WHEN uo.rn >= 2 AND uo.order_at <= ufo.first_order_at + interval '180 days' THEN 1 ELSE 0 END) AS r180,
        SUM(uo.order_total) AS lifetime_revenue,
        COUNT(*) AS lifetime_orders
      FROM user_orders uo
      JOIN user_first_orders ufo ON ufo.user_id = uo.user_id
      GROUP BY uo.user_id, ufo.first_order_at
    )
    SELECT
      uc.cohort_month AS cohort,
      COUNT(DISTINCT uc.user_id) AS cohort_size,
      COUNT(DISTINCT urm.user_id) AS buyers,
      COALESCE(SUM(urm.r30), 0) AS r30,
      COALESCE(SUM(urm.r60), 0) AS r60,
      COALESCE(SUM(urm.r90), 0) AS r90,
      COALESCE(SUM(urm.r180), 0) AS r180,
      COALESCE(SUM(urm.lifetime_revenue), 0) AS lifetime_revenue,
      COALESCE(SUM(urm.lifetime_orders), 0) AS lifetime_orders
    FROM user_cohorts uc
    LEFT JOIN user_repeat_metrics urm ON urm.user_id = uc.user_id
    GROUP BY uc.cohort_month
    ORDER BY uc.cohort_month DESC
  `);

  const rows = (result.rows as Array<{
    cohort: string;
    cohort_size: string | number;
    buyers: string | number;
    r30: string | number;
    r60: string | number;
    r90: string | number;
    r180: string | number;
    lifetime_revenue: string | number;
    lifetime_orders: string | number;
  }>).map((r): CohortRow => {
    const cohortSize = Number(r.cohort_size);
    const buyers = Number(r.buyers);
    const lifetimeRevenue = Number(r.lifetime_revenue);
    const ordersLifetime = Number(r.lifetime_orders);
    return {
      cohort: r.cohort,
      cohortSize,
      buyers,
      conversionPct: cohortSize > 0 ? (buyers / cohortSize) * 100 : 0,
      buyersWithRepeat30d: Number(r.r30),
      buyersWithRepeat60d: Number(r.r60),
      buyersWithRepeat90d: Number(r.r90),
      buyersWithRepeat180d: Number(r.r180),
      revenueLifetime: lifetimeRevenue,
      ordersLifetime,
      aovLifetime: ordersLifetime > 0 ? Math.round(lifetimeRevenue / ordersLifetime) : 0,
      revenuePerSignup: cohortSize > 0 ? Math.round(lifetimeRevenue / cohortSize) : 0,
    };
  });

  return NextResponse.json({ months, cohorts: rows });
}
