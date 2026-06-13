/**
 * Meta Pixel + PostHog browser helpers.
 *
 * Every funnel event (ViewContent, AddToCart, InitiateCheckout,
 * Purchase) fans out to THREE destinations from the browser:
 *
 *   1. Meta Pixel (`fbq`) — the original surface
 *   2. Meta CAPI via /api/meta/track — server-side dedupe-paired with
 *      a shared `eventID` so ad-blockers can't kill attribution
 *   3. PostHog (`posthog.capture`) — so our own funnel/replay analytics
 *      see the same events Meta sees. Without this the FB-attributed
 *      drop-off analysis can't tell AddToCart from a bare PageView.
 *
 * Server-side dedupe contract: each call still accepts an `eventID`
 * shared between the browser pixel call and the CAPI fire. Meta dedupes
 * within a 48h window. PostHog gets the same eventID stamped on the
 * event properties so we can cross-reference across the two systems.
 */

import posthog from "posthog-js";

declare global {
  interface Window {
    fbq?: {
      (command: "init", pixelId: string): void;
      (command: "track", eventName: string, params?: Record<string, unknown>, opts?: { eventID?: string }): void;
      (command: "trackCustom", eventName: string, params?: Record<string, unknown>, opts?: { eventID?: string }): void;
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
    };
  }
}

/**
 * Mirror a funnel event into PostHog. Safe to call before posthog-js
 * has loaded — calls through the proxy hit the queue and replay once
 * init finishes.
 */
function captureToPostHog(
  eventName: string,
  properties: Record<string, unknown>,
  eventID?: string,
): void {
  if (typeof window === "undefined") return;
  try {
    posthog.capture(eventName, {
      ...properties,
      ...(eventID ? { meta_event_id: eventID } : {}),
    });
  } catch {
    // PostHog SDK might not be loaded yet (race during first paint).
    // posthog-js usually queues these up internally; if it doesn't,
    // the loss is one event during boot — not worth blocking on.
  }
}

interface PixelItem {
  id: string;
  name?: string;
  price?: number; // cents
  quantity?: number;
  category?: string;
}

function centsToDollars(cents: number): number {
  return +(cents / 100).toFixed(2);
}

function trackSafe(
  eventName: string,
  params: Record<string, unknown>,
  eventID?: string,
) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (eventID) {
    window.fbq("track", eventName, params, { eventID });
  } else {
    window.fbq("track", eventName, params);
  }
}

export function pixelViewContent(item: PixelItem, eventID?: string) {
  const params = {
    content_ids: [item.id],
    content_type: "product",
    content_name: item.name,
    content_category: item.category,
    value: item.price !== undefined ? centsToDollars(item.price) : undefined,
    currency: "USD",
  };
  trackSafe("ViewContent", params, eventID);
  captureToPostHog("ViewContent", params, eventID);
}

export function pixelAddToCart(item: PixelItem, eventID?: string) {
  const qty = item.quantity || 1;
  const params = {
    content_ids: [item.id],
    content_type: "product",
    content_name: item.name,
    value:
      item.price !== undefined ? centsToDollars(item.price * qty) : undefined,
    currency: "USD",
    quantity: qty,
  };
  trackSafe("AddToCart", params, eventID);
  captureToPostHog("AddToCart", params, eventID);
}

export function pixelInitiateCheckout(
  items: PixelItem[],
  subtotalCents: number,
  eventID?: string,
) {
  const params = {
    content_ids: items.map((i) => i.id),
    content_type: "product",
    contents: items.map((i) => ({ id: i.id, quantity: i.quantity || 1 })),
    num_items: items.reduce((n, i) => n + (i.quantity || 1), 0),
    value: centsToDollars(subtotalCents),
    currency: "USD",
  };
  trackSafe("InitiateCheckout", params, eventID);
  captureToPostHog("InitiateCheckout", params, eventID);
}

export function pixelPurchase(opts: {
  orderNumber: string;
  items: PixelItem[];
  totalCents: number;
  eventID?: string;
}) {
  const params = {
    content_ids: opts.items.map((i) => i.id),
    content_type: "product",
    contents: opts.items.map((i) => ({ id: i.id, quantity: i.quantity || 1 })),
    num_items: opts.items.reduce((n, i) => n + (i.quantity || 1), 0),
    value: centsToDollars(opts.totalCents),
    currency: "USD",
    order_id: opts.orderNumber,
  };
  trackSafe("Purchase", params, opts.eventID);
  captureToPostHog("Purchase", params, opts.eventID);
}

/**
 * Generate an event_id shared between client pixel fires and the CAPI
 * server event. Any UUID-ish value works; we prefix by event type for
 * easy grep in debug tools.
 */
export function makeEventId(eventName: string): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${eventName}-${rnd}`;
}

// ── Server-side CAPI trigger from the browser ──
//
// Each helper below fires the browser pixel + POSTs to /api/meta/track
// with a shared eventID. The server route sends the CAPI event with the
// matching event_id, so Meta dedupes the pair. Both calls are
// fire-and-forget — errors just warn to console and never block UX.

interface CAPICustomDataClient {
  currency?: "USD";
  value?: number;
  contentIds?: string[];
  contentType?: "product" | "product_group";
  contents?: Array<{ id: string; quantity: number; item_price?: number }>;
  numItems?: number;
}

function postCAPI(
  eventName: "ViewContent" | "AddToCart" | "InitiateCheckout",
  eventId: string,
  customData?: CAPICustomDataClient,
): void {
  if (typeof window === "undefined") return;
  const payload = {
    eventName,
    eventId,
    eventSourceUrl: window.location.href,
    customData,
  };
  // keepalive: true lets the request finish even if the user navigates
  // away mid-flight (common for AddToCart → cart drawer, InitiateCheckout
  // → checkout page transitions).
  fetch("/api/meta/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    /* silent — already logged server-side if it reached the route */
  });
}

export function trackViewContent(item: PixelItem): string {
  const eventId = makeEventId("ViewContent");
  pixelViewContent(item, eventId);
  postCAPI("ViewContent", eventId, {
    currency: "USD",
    value: item.price !== undefined ? centsToDollars(item.price) : undefined,
    contentIds: [item.id],
    contentType: "product",
  });
  return eventId;
}

export function trackAddToCart(item: PixelItem): string {
  const eventId = makeEventId("AddToCart");
  pixelAddToCart(item, eventId);
  const qty = item.quantity || 1;
  postCAPI("AddToCart", eventId, {
    currency: "USD",
    value:
      item.price !== undefined ? centsToDollars(item.price * qty) : undefined,
    contentIds: [item.id],
    contentType: "product",
    contents: [
      {
        id: item.id,
        quantity: qty,
        item_price: item.price !== undefined ? centsToDollars(item.price) : undefined,
      },
    ],
    numItems: qty,
  });
  return eventId;
}

export function trackInitiateCheckout(
  items: PixelItem[],
  subtotalCents: number,
): string {
  const eventId = makeEventId("InitiateCheckout");
  pixelInitiateCheckout(items, subtotalCents, eventId);
  postCAPI("InitiateCheckout", eventId, {
    currency: "USD",
    value: centsToDollars(subtotalCents),
    contentIds: items.map((i) => i.id),
    contentType: "product",
    contents: items.map((i) => ({
      id: i.id,
      quantity: i.quantity || 1,
      item_price: i.price !== undefined ? centsToDollars(i.price) : undefined,
    })),
    numItems: items.reduce((n, i) => n + (i.quantity || 1), 0),
  });
  return eventId;
}
