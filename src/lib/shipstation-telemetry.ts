// ShipStation poll-activity telemetry, backed by Upstash Redis.
//
// The custom-store integration is one-way (ShipStation polls us; we never
// push to them), so the admin has no native way to know whether the
// integration is actually firing. This module records every successful
// poll into Redis and exposes it to the admin overview, giving the operator a
// "last poll: N min ago" pulse he can sanity-check against.
//
// Keys:
//   shipstation:poll:last_at      — ISO timestamp of the most recent poll
//   shipstation:poll:last_count   — number of orders served on that poll
//   shipstation:poll:count_24h    — rolling counter, expires every 24h
//
// All writes are fire-and-forget; if Redis isn't configured (local dev),
// the helpers no-op. Never block a poll on telemetry.

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try {
    redis = Redis.fromEnv();
    return redis;
  } catch {
    return null;
  }
}

const KEY_LAST_AT = "shipstation:poll:last_at";
const KEY_LAST_COUNT = "shipstation:poll:last_count";
const KEY_COUNT_24H = "shipstation:poll:count_24h";

export async function recordShipStationPoll(orderCount: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    const now = new Date().toISOString();
    await Promise.all([
      // Latest poll fingerprint — kept for 7 days so we can spot integration
      // outages that span more than a day.
      r.set(KEY_LAST_AT, now, { ex: 7 * 24 * 60 * 60 }),
      r.set(KEY_LAST_COUNT, String(orderCount), { ex: 7 * 24 * 60 * 60 }),
      // 24h rolling counter — incremented every poll, naturally expires
      // each day so the count reflects only the last 24h of activity.
      r.incr(KEY_COUNT_24H),
      r.expire(KEY_COUNT_24H, 24 * 60 * 60),
    ]);
  } catch (err) {
    console.warn("[shipstation-telemetry] poll-record failed", err);
  }
}

export interface PollHealth {
  lastPollAt: string | null;
  lastPollOrderCount: number | null;
  pollCount24h: number;
}

export async function getShipStationPollHealth(): Promise<PollHealth> {
  const r = getRedis();
  if (!r) return { lastPollAt: null, lastPollOrderCount: null, pollCount24h: 0 };
  try {
    const [lastAt, lastCount, count24h] = await Promise.all([
      r.get<string>(KEY_LAST_AT),
      r.get<string>(KEY_LAST_COUNT),
      r.get<string>(KEY_COUNT_24H),
    ]);
    return {
      lastPollAt: lastAt || null,
      lastPollOrderCount: lastCount ? parseInt(lastCount, 10) : null,
      pollCount24h: count24h ? parseInt(count24h, 10) : 0,
    };
  } catch (err) {
    console.warn("[shipstation-telemetry] health-read failed", err);
    return { lastPollAt: null, lastPollOrderCount: null, pollCount24h: 0 };
  }
}
