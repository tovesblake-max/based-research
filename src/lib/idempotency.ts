// Idempotency keys for payment endpoints, backed by Upstash Redis.
//
// Problem being solved: if a user double-clicks Submit on checkout, two
// concurrent POST requests race each other. Without a dedupe layer, both
// pass the rate limit (in-memory was per-lambda; Upstash takes a few ms to
// see the second request), both call the payment gateway, and the user
// gets double-charged.
//
// Solution: the client generates a UUID once per checkout attempt and sends
// it in the request body. The server atomically claims the key in Upstash
// (SET NX with TTL). If the claim succeeds, we process normally. If it
// fails — because another in-flight request already claimed it — we return
// the cached response from that request.
//
// We cache the final response (status + body) under the same key so even a
// retry after the first request completes still returns the same result.

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  try {
    redis = Redis.fromEnv();
    return redis;
  } catch (err) {
    console.warn("[idempotency] Redis.fromEnv() failed", err);
    return null;
  }
}

// How long to cache a completed response. 10 minutes covers typical
// user-retry windows without filling Upstash with stale records.
const RESPONSE_TTL_SECONDS = 600;

// How long to hold the "in-flight" marker while the first request is
// processing. Long enough to cover a slow ACH call + order insert; short
// enough that a crashed request doesn't block a legitimate retry forever.
const INFLIGHT_TTL_SECONDS = 60;

interface CachedResponse {
  status: number;
  body: unknown;
}

/**
 * Try to claim an idempotency key for the given scope + key. Returns:
 *   - { kind: "first" }       — this caller may proceed
 *   - { kind: "cached", ... } — a prior call already completed; replay it
 *   - { kind: "inflight" }    — another call is still in progress
 *   - { kind: "unavailable" } — Upstash not reachable; fall through to
 *                               normal processing (accept the small
 *                               double-charge risk — the alternative is
 *                               blocking all checkouts during a KV outage)
 */
export async function claimIdempotencyKey(
  scope: string,
  key: string,
): Promise<
  | { kind: "first" }
  | { kind: "cached"; status: number; body: unknown }
  | { kind: "inflight" }
  | { kind: "unavailable" }
> {
  const r = getRedis();
  if (!r) return { kind: "unavailable" };

  const fullKey = `idemp:${scope}:${key}`;

  try {
    // Check for a completed response first.
    const cached = await r.get<CachedResponse>(`${fullKey}:done`);
    if (cached) {
      return { kind: "cached", status: cached.status, body: cached.body };
    }

    // Atomically claim the in-flight slot. SET NX returns null if the key
    // already exists (another request has the claim).
    const claim = await r.set(`${fullKey}:inflight`, "1", {
      nx: true,
      ex: INFLIGHT_TTL_SECONDS,
    });
    if (claim === null) {
      return { kind: "inflight" };
    }
    return { kind: "first" };
  } catch (err) {
    console.warn("[idempotency] claim failed", { scope, key, err: String(err) });
    return { kind: "unavailable" };
  }
}

/**
 * Record the completed response so future retries replay it instead of
 * reprocessing. Also clears the in-flight marker.
 */
export async function recordIdempotentResponse(
  scope: string,
  key: string,
  status: number,
  body: unknown,
): Promise<void> {
  const r = getRedis();
  if (!r) return;

  const fullKey = `idemp:${scope}:${key}`;
  try {
    await r.set<CachedResponse>(`${fullKey}:done`, { status, body }, {
      ex: RESPONSE_TTL_SECONDS,
    });
    await r.del(`${fullKey}:inflight`);
  } catch (err) {
    console.warn("[idempotency] record failed", { scope, key, err: String(err) });
  }
}

/**
 * Release the in-flight marker without caching a response. Used when the
 * request fails in a way that shouldn't be cached (e.g. auth errors,
 * validation errors) — the user should be able to correct and retry.
 */
export async function releaseIdempotencyKey(scope: string, key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(`idemp:${scope}:${key}:inflight`);
  } catch {
    // Best effort — TTL will clean up anyway.
  }
}

/**
 * Shape validation for incoming idempotency keys. Must be a UUID-ish string
 * to prevent key poisoning (an attacker providing arbitrary keys to enumerate
 * Redis namespace). 16–64 chars, hex + dashes only.
 */
export function isValidIdempotencyKey(key: unknown): key is string {
  return typeof key === "string" && /^[a-fA-F0-9-]{16,64}$/.test(key);
}
