// Rate limiting, backed by Upstash Redis.
//
// Previous implementation used a process-local `Map` which resets per
// serverless instance — attackers could bypass it by fanning out across
// warm lambdas. This version stores counters in Upstash so limits are
// shared across all instances.
//
// Policy: fail OPEN on KV errors / unavailability. Availability > security
// for rate limiting — a 30-second KV blip shouldn't lock every user out of
// sign-in and checkout. Persistent failures are logged.

import { Ratelimit } from "@upstash/ratelimit";
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
    console.warn("[rate-limit] Redis.fromEnv() failed", err);
    return null;
  }
}

// Cache Ratelimit instances by (limit, windowMs) signature so each request
// doesn't rebuild them. A typical deploy creates 5–10 unique signatures.
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const sig = `${limit}:${windowMs}`;
  let l = limiters.get(sig);
  if (!l) {
    // Sliding-window algorithm gives a smoother curve than fixed-window
    // (no edge-of-window burst). Duration accepts `${number} ms`.
    l = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: false,
      prefix: "rl",
    });
    limiters.set(sig, l);
  }
  return l;
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const limiter = getLimiter(limit, windowMs);
  if (!limiter) {
    // Dev: KV not wired. Fail open. Production will always have the KV env
    // vars via the Vercel Upstash integration.
    if (process.env.NODE_ENV === "production") {
      console.warn("[rate-limit] Upstash unavailable in production; failing open", { key });
    }
    return true;
  }
  try {
    const result = await limiter.limit(key);
    return result.success;
  } catch (err) {
    console.warn("[rate-limit] Upstash error; failing open", { key, err: String(err) });
    return true;
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
