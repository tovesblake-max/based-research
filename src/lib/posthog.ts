// Server-side PostHog event capture.
//
// Use this for business-critical events where client-side capture would be
// unreliable (ad-blocker drops, client crashes before the pixel fires,
// admin/cron-initiated actions with no browser context). Events emitted
// here merge with client-side events in PostHog via a shared distinctId —
// for authenticated users, pass the user's UUID; for anonymous checkouts,
// pass the email (lowercased).

import { PostHog } from "posthog-node";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (client) return client;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  if (!key) {
    // Local dev without PostHog wired up — no-op the helper.
    return null;
  }
  client = new PostHog(key, {
    host,
    // Flush aggressively — serverless functions don't stay warm long enough
    // for a lazy batch interval to actually send. Every event goes in its
    // own HTTP call; still cheap at our volume.
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

export interface CaptureEvent {
  /** User UUID for authenticated users; email-lower for guests. */
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}

/**
 * Fire-and-forget event capture. Never blocks the caller on PostHog's
 * network — if the send fails or the client isn't configured, we log and
 * move on. Never let analytics break a paying-customer code path.
 */
export async function captureEvent({ distinctId, event, properties }: CaptureEvent): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    c.capture({
      distinctId,
      event,
      properties: properties || {},
    });
    // Ensure the event is actually sent in serverless — shutdown() flushes
    // pending batches before the lambda freezes. Safe to call multiple times.
    await c.shutdown();
  } catch (err) {
    console.warn("[posthog] capture failed", { event, err: String(err) });
  }
}

/**
 * Identify a user with profile properties. Called on signup and sign-in so
 * that anonymous pre-login events get re-associated with the user going
 * forward. Server-side version complements the client-side identify() —
 * either alone is fine, both is belt-and-suspenders.
 */
export async function identifyUser(distinctId: string, properties: Record<string, unknown>): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    c.identify({
      distinctId,
      properties,
    });
    await c.shutdown();
  } catch (err) {
    console.warn("[posthog] identify failed", { distinctId, err: String(err) });
  }
}
