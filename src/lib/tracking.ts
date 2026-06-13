import { createHash } from "crypto";

// ── Types ──────────────────────────────────────────────────
interface TrackingEvent {
  event: string;
  eventId: string;
  url: string;
  ip?: string;
  userAgent?: string;
  email?: string;
  // Product-specific
  productId?: string;
  productName?: string;
  value?: number; // cents
  currency?: string;
  quantity?: number;
  category?: string;
}

// ── Hashing helper (SHA-256 for PII) ───────────────────────
function sha256(value: string): string {
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ── META CONVERSIONS API ───────────────────────────────────
async function sendMetaEvent(event: TrackingEvent) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_TOKEN;
  if (!pixelId || !accessToken) return;

  const userData: Record<string, string> = {};
  if (event.email) userData.em = [sha256(event.email)].toString();
  if (event.ip) userData.client_ip_address = event.ip;
  if (event.userAgent) userData.client_user_agent = event.userAgent;

  const eventData: Record<string, unknown> = {
    event_name: event.event,
    event_time: Math.floor(Date.now() / 1000),
    event_id: event.eventId,
    event_source_url: event.url,
    action_source: "website",
    user_data: userData,
  };

  if (event.value !== undefined) {
    eventData.custom_data = {
      currency: event.currency || "USD",
      value: (event.value / 100).toFixed(2),
      content_name: event.productName,
      content_ids: event.productId ? [event.productId] : undefined,
      content_type: "product",
      num_items: event.quantity,
      content_category: event.category,
    };
  }

  try {
    await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [eventData] }),
      }
    );
  } catch (err) {
    console.error("[Meta CAPI]", err);
  }
}

// ── TIKTOK EVENTS API ──────────────────────────────────────
async function sendTikTokEvent(event: TrackingEvent) {
  const pixelCode = process.env.TIKTOK_PIXEL_ID;
  const accessToken = process.env.TIKTOK_CAPI_TOKEN;
  if (!pixelCode || !accessToken) return;

  // Map our event names to TikTok event names
  const tiktokEventMap: Record<string, string> = {
    PageView: "Pageview",
    ViewContent: "ViewContent",
    AddToCart: "AddToCart",
    InitiateCheckout: "InitiateCheckout",
    CompleteRegistration: "CompleteRegistration",
    Contact: "SubmitForm",
    Lead: "CompleteRegistration",
  };

  const context: Record<string, unknown> = {
    page: { url: event.url },
  };
  if (event.ip) context.ip = event.ip;
  if (event.userAgent) context.user_agent = event.userAgent;

  const user: Record<string, string> = {};
  if (event.email) user.email = sha256(event.email);

  const properties: Record<string, unknown> = {};
  if (event.value !== undefined) {
    properties.value = (event.value / 100).toFixed(2);
    properties.currency = event.currency || "USD";
    properties.content_type = "product";
    properties.contents = event.productId
      ? [{ content_id: event.productId, content_name: event.productName, quantity: event.quantity || 1 }]
      : undefined;
  }

  try {
    await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": accessToken,
      },
      body: JSON.stringify({
        pixel_code: pixelCode,
        event: tiktokEventMap[event.event] || event.event,
        event_id: event.eventId,
        timestamp: new Date().toISOString(),
        context,
        user,
        properties,
      }),
    });
  } catch (err) {
    console.error("[TikTok CAPI]", err);
  }
}

// ── REDDIT CONVERSIONS API ─────────────────────────────────
async function sendRedditEvent(event: TrackingEvent) {
  const pixelId = process.env.REDDIT_PIXEL_ID;
  const accessToken = process.env.REDDIT_CAPI_TOKEN;
  if (!pixelId || !accessToken) return;

  // Map our event names to Reddit event types
  const redditEventMap: Record<string, string> = {
    PageView: "PageVisit",
    ViewContent: "ViewContent",
    AddToCart: "AddToCart",
    InitiateCheckout: "AddToCart",
    CompleteRegistration: "SignUp",
    Contact: "Lead",
    Lead: "SignUp",
  };

  const user: Record<string, string> = {};
  if (event.email) user.email = sha256(event.email);
  if (event.ip) user.ip_address = sha256(event.ip);
  if (event.userAgent) user.user_agent = event.userAgent;

  const eventMetadata: Record<string, unknown> = {};
  if (event.value !== undefined) {
    eventMetadata.currency = event.currency || "USD";
    eventMetadata.value_decimal = (event.value / 100).toFixed(2);
    eventMetadata.item_count = event.quantity;
  }
  if (event.productId) {
    eventMetadata.products = [
      { id: event.productId, name: event.productName, category: event.category },
    ];
  }

  try {
    await fetch("https://ads-api.reddit.com/api/v2.0/conversions/events/" + pixelId, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        events: [
          {
            event_at: new Date().toISOString(),
            event_type: {
              tracking_type: redditEventMap[event.event] || "Custom",
            },
            user,
            event_metadata: eventMetadata,
            click_id: event.eventId,
          },
        ],
      }),
    });
  } catch (err) {
    console.error("[Reddit CAPI]", err);
  }
}

// ── PUBLIC API ─────────────────────────────────────────────
export function createEventId(): string {
  return generateEventId();
}

export async function trackEvent(event: Omit<TrackingEvent, "eventId"> & { eventId?: string }) {
  const fullEvent: TrackingEvent = {
    ...event,
    eventId: event.eventId || generateEventId(),
  };

  // Fire all three in parallel — never block on tracking
  await Promise.allSettled([
    sendMetaEvent(fullEvent),
    sendTikTokEvent(fullEvent),
    sendRedditEvent(fullEvent),
  ]);
}
