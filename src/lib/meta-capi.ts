/**
 * Meta Conversions API (CAPI) — server-side events.
 *
 * Why we send server-side events in addition to the browser Pixel:
 *   1. Ad-blocker resistance — ~20-30% of users block `fbevents.js`.
 *      CAPI fires from our server so those conversions still get
 *      attributed.
 *   2. Higher match quality — we hash real PII (email, phone, name,
 *      address, IP, UA) server-side and send it in `user_data`.
 *      Meta's matching improves by 10-25% on a well-wired CAPI.
 *   3. Dedup — every CAPI event carries the same `event_id` as the
 *      browser pixel call, so Meta dedupes them (48h window) and
 *      attribution survives whichever hit lands first.
 *
 * Required env:
 *   META_CAPI_TOKEN            — long-lived Meta access token with
 *                                 `ads_management` + CAPI scopes
 *   NEXT_PUBLIC_META_PIXEL_ID  — same pixel id used by the browser
 *
 * Optional env:
 *   META_CAPI_TEST_CODE        — test event code; surfaces events in
 *                                 Events Manager → Test Events. Do NOT
 *                                 set in production.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import { createHash } from "crypto";

const GRAPH_API_VERSION = "v21.0";

function hashPII(value: string): string {
  return createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

/** Hash a phone for CAPI: digits only, then SHA-256. */
function hashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return createHash("sha256").update(digits).digest("hex");
}

export interface CAPIUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null; // ISO-2
  externalId?: string | null; // your user id
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null; // _fbp cookie value
  fbc?: string | null; // _fbc cookie value
}

export interface CAPICustomData {
  currency?: string;
  value?: number; // dollars
  orderId?: string;
  contentIds?: string[];
  contentType?: "product" | "product_group";
  contents?: Array<{ id: string; quantity: number; item_price?: number }>;
  numItems?: number;
}

export interface CAPIEvent {
  eventName:
    | "PageView"
    | "ViewContent"
    | "AddToCart"
    | "InitiateCheckout"
    | "Purchase"
    | "Lead"
    | "CompleteRegistration";
  eventId: string; // MUST match the client-side pixel eventID for dedup
  eventSourceUrl?: string;
  eventTime?: number; // unix seconds; defaults to now
  userData: CAPIUserData;
  customData?: CAPICustomData;
  actionSource?: "website" | "email" | "app";
}

interface GraphPayload {
  data: Array<{
    event_name: string;
    event_time: number;
    event_id: string;
    event_source_url?: string;
    action_source: string;
    user_data: Record<string, string | string[]>;
    custom_data?: Record<string, unknown>;
  }>;
  test_event_code?: string;
}

/**
 * Send a single event to Meta CAPI. Fire-and-forget caller pattern:
 * any failure is logged but never rethrown, so a Meta outage can't
 * block a checkout.
 */
export async function sendCAPIEvent(event: CAPIEvent): Promise<void> {
  const token = process.env.META_CAPI_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  if (!token || !pixelId) {
    // Silent no-op when unconfigured — keeps the call-sites clean.
    return;
  }

  // ── Hash and shape user_data per Meta CAPI spec ──
  const userData: Record<string, string | string[]> = {};
  const u = event.userData;
  if (u.email) userData.em = hashPII(u.email);
  if (u.phone) userData.ph = hashPhone(u.phone);
  if (u.firstName) userData.fn = hashPII(u.firstName);
  if (u.lastName) userData.ln = hashPII(u.lastName);
  if (u.city) userData.ct = hashPII(u.city);
  if (u.state) userData.st = hashPII(u.state);
  if (u.zip) userData.zp = hashPII(u.zip);
  if (u.country) userData.country = hashPII(u.country);
  if (u.externalId) userData.external_id = hashPII(u.externalId);
  // IP + UA are sent in cleartext (Meta hashes server-side).
  if (u.clientIp) userData.client_ip_address = u.clientIp;
  if (u.clientUserAgent) userData.client_user_agent = u.clientUserAgent;
  if (u.fbp) userData.fbp = u.fbp;
  if (u.fbc) userData.fbc = u.fbc;

  const customData: Record<string, unknown> = {};
  const c = event.customData;
  if (c) {
    if (c.currency) customData.currency = c.currency;
    if (c.value !== undefined) customData.value = c.value;
    if (c.orderId) customData.order_id = c.orderId;
    if (c.contentIds) customData.content_ids = c.contentIds;
    if (c.contentType) customData.content_type = c.contentType;
    if (c.contents) customData.contents = c.contents;
    if (c.numItems !== undefined) customData.num_items = c.numItems;
  }

  const payload: GraphPayload = {
    data: [
      {
        event_name: event.eventName,
        event_time: event.eventTime || Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        event_source_url: event.eventSourceUrl,
        action_source: event.actionSource || "website",
        user_data: userData,
        custom_data: Object.keys(customData).length ? customData : undefined,
      },
    ],
  };

  const testCode = process.env.META_CAPI_TEST_CODE;
  if (testCode) payload.test_event_code = testCode;

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const raw = await res.text();
      console.warn("[meta-capi] non-2xx", {
        http_status: res.status,
        event: event.eventName,
        eventId: event.eventId,
        raw: raw.slice(0, 500),
      });
    }
  } catch (err) {
    console.warn("[meta-capi] fetch failed", {
      event: event.eventName,
      eventId: event.eventId,
      err: String(err),
    });
  }
}
