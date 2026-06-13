/**
 * One-shot analytics endpoint for "behavior of customers who actually
 * checked out" — pulled straight from PostHog so the operator can see what
 * the buyer journey actually looks like vs. the full site traffic.
 *
 * Pulls multiple HogQL queries in parallel:
 *   - Time from first event to Purchase event per converting session
 *   - Pageview counts per converting session
 *   - Top landing pages for buyers
 *   - Top product pages buyers actually visit
 *   - Coupon-attempt vs coupon-apply rate (overall + among buyers)
 *   - Payment method split among buyers
 *   - Hour-of-day distribution of purchases (UTC; admin can mentally
 *     shift 5h to Central)
 *   - Mobile vs desktop split among buyers
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const POSTHOG_API_HOST = POSTHOG_HOST.replace("://us.i.", "://us.").replace("://eu.i.", "://eu.");

interface HogQLResponse {
  results?: unknown[][];
  columns?: string[];
}

async function runHogQL(query: string): Promise<HogQLResponse | null> {
  const token = process.env.POSTHOG_PERSONAL_KEY;
  const projectId = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID;
  if (!token || !projectId) return null;
  try {
    const res = await fetch(`${POSTHOG_API_HOST}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const raw = await res.text();
      return { results: [["__error__", res.status, raw.slice(0, 300)]], columns: ["error"] };
    }
    return (await res.json()) as HogQLResponse;
  } catch (err) {
    return { results: [["__threw__", String(err)]], columns: ["error"] };
  }
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Per-session aggregates for users who completed a Purchase event.
  // We use distinct_id as the session bucket (PostHog's $session_id
  // exists too but is more aggressive about cutting sessions; for a
  // "how long does it take them to buy" question, distinct_id-as-buyer
  // gives the truer answer).
  const buyerJourneysQ = `
    WITH buyers AS (
      SELECT DISTINCT distinct_id, min(timestamp) AS purchase_at
      FROM events
      WHERE event = 'Purchase'
      GROUP BY distinct_id
    ),
    first_seen AS (
      SELECT distinct_id, min(timestamp) AS first_at
      FROM events
      WHERE event = '$pageview'
      GROUP BY distinct_id
    ),
    pageview_counts AS (
      SELECT e.distinct_id, count() AS pv
      FROM events e
      JOIN buyers b ON e.distinct_id = b.distinct_id
      WHERE e.event = '$pageview'
        AND e.timestamp <= b.purchase_at
      GROUP BY e.distinct_id
    )
    SELECT
      b.distinct_id,
      f.first_at,
      b.purchase_at,
      dateDiff('minute', f.first_at, b.purchase_at) AS minutes_to_purchase,
      pv.pv AS pageviews_before_purchase
    FROM buyers b
    LEFT JOIN first_seen f ON b.distinct_id = f.distinct_id
    LEFT JOIN pageview_counts pv ON b.distinct_id = pv.distinct_id
    ORDER BY b.purchase_at DESC
    LIMIT 100
  `;

  const topLandingsBuyersQ = `
    WITH buyers AS (
      SELECT DISTINCT distinct_id, min(timestamp) AS first_at
      FROM events
      WHERE event IN ('Purchase')
      GROUP BY distinct_id
    ),
    first_pv AS (
      SELECT e.distinct_id, argMin(coalesce(properties.$pathname, '/'), e.timestamp) AS landing
      FROM events e
      JOIN buyers b ON e.distinct_id = b.distinct_id
      WHERE e.event = '$pageview'
      GROUP BY e.distinct_id
    )
    SELECT landing, count() AS buyers
    FROM first_pv
    GROUP BY landing
    ORDER BY buyers DESC
    LIMIT 10
  `;

  const productPagesByBuyersQ = `
    WITH buyers AS (
      SELECT DISTINCT distinct_id FROM events WHERE event = 'Purchase'
    )
    SELECT
      coalesce(properties.$pathname, '/') AS path,
      count() AS visits,
      count(DISTINCT e.distinct_id) AS distinct_buyers
    FROM events e
    JOIN buyers b ON e.distinct_id = b.distinct_id
    WHERE e.event = '$pageview'
      AND coalesce(properties.$pathname, '/') LIKE '/product/%'
    GROUP BY path
    ORDER BY distinct_buyers DESC, visits DESC
    LIMIT 15
  `;

  const couponBehaviorQ = `
    SELECT
      countIf(event = 'coupon_attempted') AS attempts,
      countIf(event = 'coupon_applied') AS applied,
      countIf(event = 'Purchase') AS purchases
    FROM events
    WHERE timestamp > now() - INTERVAL 60 DAY
  `;

  const paymentMethodSplitQ = `
    SELECT
      properties.method AS method,
      count() AS picks
    FROM events
    WHERE event = 'checkout_payment_method_selected'
      AND timestamp > now() - INTERVAL 60 DAY
    GROUP BY method
    ORDER BY picks DESC
  `;

  const hourOfDayQ = `
    SELECT
      toHour(timestamp) AS hour_utc,
      count() AS purchases
    FROM events
    WHERE event = 'Purchase'
    GROUP BY hour_utc
    ORDER BY hour_utc
  `;

  const deviceSplitQ = `
    WITH buyers AS (
      SELECT DISTINCT distinct_id FROM events WHERE event = 'Purchase'
    )
    SELECT
      coalesce(properties.$device_type, 'unknown') AS device,
      count(DISTINCT e.distinct_id) AS buyers
    FROM events e
    JOIN buyers b ON e.distinct_id = b.distinct_id
    WHERE e.event = '$pageview'
    GROUP BY device
    ORDER BY buyers DESC
  `;

  const purchasesByDayQ = `
    SELECT
      toDate(timestamp) AS day,
      count() AS purchases,
      count(DISTINCT distinct_id) AS unique_buyers
    FROM events
    WHERE event = 'Purchase'
      AND timestamp > now() - INTERVAL 60 DAY
    GROUP BY day
    ORDER BY day
  `;

  const sessionsBeforePurchaseQ = `
    WITH buyers AS (
      SELECT DISTINCT distinct_id, min(timestamp) AS first_purchase_at
      FROM events
      WHERE event = 'Purchase'
      GROUP BY distinct_id
    )
    SELECT
      e.distinct_id,
      count(DISTINCT properties.$session_id) AS distinct_sessions
    FROM events e
    JOIN buyers b ON e.distinct_id = b.distinct_id
    WHERE e.event = '$pageview'
      AND e.timestamp <= b.first_purchase_at
    GROUP BY e.distinct_id
    ORDER BY distinct_sessions DESC
  `;

  const [
    journeys, landings, productPages, coupons, methods, hours, devices, byDay, sessionsBefore,
  ] = await Promise.all([
    runHogQL(buyerJourneysQ),
    runHogQL(topLandingsBuyersQ),
    runHogQL(productPagesByBuyersQ),
    runHogQL(couponBehaviorQ),
    runHogQL(paymentMethodSplitQ),
    runHogQL(hourOfDayQ),
    runHogQL(deviceSplitQ),
    runHogQL(purchasesByDayQ),
    runHogQL(sessionsBeforePurchaseQ),
  ]);

  return NextResponse.json({
    buyerJourneys: journeys,
    topLandingsForBuyers: landings,
    productPagesByBuyers: productPages,
    couponBehavior: coupons,
    paymentMethodPicks: methods,
    purchaseHourUTC: hours,
    deviceSplit: devices,
    purchasesByDay: byDay,
    sessionsBeforePurchase: sessionsBefore,
  });
}
