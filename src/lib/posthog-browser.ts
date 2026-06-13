/**
 * Thin browser-side helper around posthog-js for capturing custom
 * funnel events outside the Meta Pixel pipeline. Keeps every call
 * site that wants to track an event from importing posthog-js
 * directly + having to handle the "SDK not loaded yet" race.
 */

import posthog from "posthog-js";

export function captureClient(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  try {
    posthog.capture(eventName, properties);
  } catch {
    // posthog-js queues events internally during init; if that ever
    // breaks we'd rather drop one event than block a checkout.
  }
}
