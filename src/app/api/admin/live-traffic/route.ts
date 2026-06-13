/**
 * Live traffic metrics for the admin dashboard.
 *
 * Pulls four panels straight from PostHog's HogQL query endpoint:
 *   1. Active users — unique distinct_ids with a $pageview in the last 5 min
 *   2. Pageviews last 24h
 *   3. Top pages last hour (pathname → count)
 *   4. Funnel counts last 24h — ViewContent → AddToCart → InitiateCheckout → Purchase
 *
 * All data is server-queried with our POSTHOG_PERSONAL_KEY; the token
 * never leaves the edge. Client only calls `/api/admin/live-traffic`
 * and gets a thin shaped payload.
 *
 * 30s cache so a dashboard refresh loop doesn't hammer PostHog.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
// PostHog API lives on a different subdomain than the ingest host —
// swap `i.posthog.com` → `posthog.com` for the query endpoint.
const POSTHOG_API_HOST = POSTHOG_HOST.replace("://us.i.", "://us.").replace(
  "://eu.i.",
  "://eu.",
);

interface HogQLResponse {
  results?: unknown[][];
  columns?: string[];
}

async function runHogQL(query: string): Promise<HogQLResponse | null> {
  const token = process.env.POSTHOG_PERSONAL_KEY;
  const projectId = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID;
  if (!token || !projectId) return null;

  try {
    const res = await fetch(
      `${POSTHOG_API_HOST}/api/projects/${projectId}/query/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: { kind: "HogQLQuery", query },
        }),
        // Short server-side timeout so a PostHog stall doesn't block the
        // admin dashboard load.
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) {
      const raw = await res.text();
      console.warn("[live-traffic] posthog non-2xx", {
        status: res.status,
        raw: raw.slice(0, 300),
      });
      return null;
    }
    return (await res.json()) as HogQLResponse;
  } catch (err) {
    console.warn("[live-traffic] posthog query failed", err);
    return null;
  }
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Query 1: active users in last 5 minutes ──
  const activeUsersQ = `
    SELECT count(DISTINCT distinct_id)
    FROM events
    WHERE event = '$pageview'
      AND timestamp > now() - INTERVAL 5 MINUTE
  `;

  // ── Query 2: pageviews last 24h ──
  const pageviews24hQ = `
    SELECT count()
    FROM events
    WHERE event = '$pageview'
      AND timestamp > now() - INTERVAL 24 HOUR
  `;

  // ── Query 3: top pages last hour ──
  // `properties.$pathname` is the relative path; falls back to
  // `properties.$current_url` if pathname is missing.
  const topPagesQ = `
    SELECT
      coalesce(properties.$pathname, properties.$current_url, '/') AS path,
      count() AS views
    FROM events
    WHERE event = '$pageview'
      AND timestamp > now() - INTERVAL 1 HOUR
    GROUP BY path
    ORDER BY views DESC
    LIMIT 5
  `;

  // ── Query 4: funnel event counts last 24h ──
  // These are the event names we fire via Meta Pixel dedup + server CAPI,
  // captured by PostHog autocapture too.
  const funnelQ = `
    SELECT
      countIf(event = 'ViewContent' OR event = '$pageview' AND properties.$pathname LIKE '/product/%') AS views,
      countIf(event = 'AddToCart') AS adds,
      countIf(event = 'InitiateCheckout' OR event = 'begin_checkout') AS checkouts,
      countIf(event = 'order_completed' OR event = 'Purchase') AS purchases
    FROM events
    WHERE timestamp > now() - INTERVAL 24 HOUR
  `;

  const [active, pv24h, topPages, funnel] = await Promise.all([
    runHogQL(activeUsersQ),
    runHogQL(pageviews24hQ),
    runHogQL(topPagesQ),
    runHogQL(funnelQ),
  ]);

  const payload = {
    activeUsers: Number(active?.results?.[0]?.[0] ?? 0),
    pageviews24h: Number(pv24h?.results?.[0]?.[0] ?? 0),
    topPages: (topPages?.results ?? []).map((row) => ({
      path: String(row[0] ?? "/"),
      views: Number(row[1] ?? 0),
    })),
    funnel: {
      views: Number(funnel?.results?.[0]?.[0] ?? 0),
      adds: Number(funnel?.results?.[0]?.[1] ?? 0),
      checkouts: Number(funnel?.results?.[0]?.[2] ?? 0),
      purchases: Number(funnel?.results?.[0]?.[3] ?? 0),
    },
    // If any query failed, the non-null panels still render; the
    // failed ones show zeros. `ok: false` lets the UI surface a
    // subtle "stale data" warning without blanking the widget.
    ok: !!(active && pv24h && topPages && funnel),
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: {
      // 30s CDN-level + browser cache so a dashboard poll every 15s
      // only actually hits PostHog every other call.
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}
