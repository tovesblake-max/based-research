/**
 * Client-side acquisition / first-touch attribution tracker.
 *
 * Captures UTM params + landing path + referrer domain at the FIRST
 * page-load of a session that has them, persists to localStorage with a
 * 90-day TTL, and exposes a read-back helper for the checkout flow to
 * attach to order submission.
 *
 * First-touch (not last-touch). A user who lands via a tagged Meta ad,
 * leaves, then comes back direct three days later still attributes the
 * eventual purchase to Meta. This is the right default for a brand
 * audit ("which channel introduced this customer to us?"). Switch to
 * last-touch only if there's a specific reason — most attribution
 * disputes between channels are last-touch's fault.
 *
 * The "FIRST" in first-touch is scoped to the 90-day TTL window. After
 * 90 days of dormancy the localStorage record expires and the next
 * tagged visit becomes the new first-touch. This matches industry
 * convention (Meta uses 7d/28d, Google Ads uses up to 90d).
 *
 * Storage shape (localStorage key `sw_acq`):
 *   {
 *     "ts": 1717590000000,
 *     "utmSource":   "meta" | null,
 *     "utmMedium":   "cpc" | null,
 *     "utmCampaign": "spring-2026-reta" | null,
 *     "utmContent":  "ad-creative-v3" | null,
 *     "utmTerm":     null,
 *     "landingPath": "/product/glp3-rta",
 *     "referrerDomain": "facebook.com" | null
 *   }
 *
 * Server-side: src/app/api/checkout/* routes accept these fields in
 * the POST body and persist to orders.utm_* columns. Server NEVER
 * trusts the client beyond storing what it sent — these are reporting
 * dimensions, not authorization signals.
 */

const STORAGE_KEY = "br_acq";
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export interface AcquisitionTouch {
  ts: number;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  landingPath: string | null;
  referrerDomain: string | null;
}

/**
 * Read URL search params for UTM keys + capture landing context.
 * Returns null if there's nothing meaningful to record (no UTMs AND no
 * usable referrer) — caller should not write null records over an
 * existing first-touch.
 */
function readCurrentTouch(): AcquisitionTouch | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const utmContent = params.get("utm_content");
  const utmTerm = params.get("utm_term");

  // Referrer host. Skip our own domain so reload-mid-flow doesn't
  // overwrite the original referrer with "basedresearch.com".
  let referrerDomain: string | null = null;
  if (document.referrer) {
    try {
      const u = new URL(document.referrer);
      const ourHost = window.location.hostname.replace(/^www\./, "");
      const refHost = u.hostname.replace(/^www\./, "");
      if (refHost && refHost !== ourHost) referrerDomain = refHost;
    } catch {
      // Malformed referrer — ignore.
    }
  }

  const landingPath = window.location.pathname || null;

  // Skip if there's literally nothing to record (no UTMs, no usable
  // referrer). Capturing a bare landing path on every visit would
  // overwrite first-touch on every reload.
  const hasSignal =
    utmSource || utmMedium || utmCampaign || utmContent || utmTerm || referrerDomain;
  if (!hasSignal) return null;

  return {
    ts: Date.now(),
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    landingPath,
    referrerDomain,
  };
}

/**
 * Initialise the first-touch record if absent OR expired. Call at
 * app-mount time (TrackingProvider, layout). Idempotent — safe to call
 * on every render.
 */
export function initAcquisitionTracker(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const existing = JSON.parse(raw) as AcquisitionTouch;
      const fresh = existing.ts && Date.now() - existing.ts < TTL_MS;
      // Existing record still in TTL — preserve it (first-touch wins).
      // BUT: if a NEW UTM-tagged visit arrives, treat it as a re-engagement
      // and overwrite. The reasoning: explicit ad clicks > stale direct
      // session. This mirrors how Google Ads + Meta override their own
      // attribution windows on a new tagged click.
      const current = readCurrentTouch();
      if (fresh && !(current && current.utmSource)) return;
    }
    const touch = readCurrentTouch();
    if (touch) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(touch));
    }
  } catch {
    // localStorage disabled (privacy mode, etc.) — silently no-op.
    // Attribution will be null for these orders, which is correct.
  }
}

/**
 * Read the first-touch payload for inclusion in a checkout POST body.
 * Returns an empty object (not null) so the caller can spread it into
 * the request body unconditionally.
 */
export function readAcquisitionTouch(): Partial<AcquisitionTouch> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const t = JSON.parse(raw) as AcquisitionTouch;
    if (!t.ts || Date.now() - t.ts >= TTL_MS) return {};
    // Drop the timestamp — server doesn't need it.
    return {
      utmSource: t.utmSource,
      utmMedium: t.utmMedium,
      utmCampaign: t.utmCampaign,
      utmContent: t.utmContent,
      utmTerm: t.utmTerm,
      landingPath: t.landingPath,
      referrerDomain: t.referrerDomain,
    };
  } catch {
    return {};
  }
}
