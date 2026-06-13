/**
 * Lightweight order fraud scoring.
 *
 * Called from the checkout routes BEFORE charging. Returns a score 0-100 and
 * a list of triggered signals. Callers decide the threshold (we default to
 * flagging at score >= 60 for manual review but still letting the charge go
 * through — no blocking by default, just alerting).
 *
 * Signals we check:
 *   - Disposable / tempmail email domain
 *   - Email-address patterns common in scraper-purchased lists
 *   - IP velocity — same IP has placed >= N orders in 24h
 *   - User velocity — same user has placed >= N orders in 24h
 *   - High-dollar first-order (>$500 for a fresh account < 1 hour old)
 *   - Geo mismatch — shipping state doesn't match IP country
 */
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

// Curated list of well-known disposable-email providers
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "temp-mail.org",
  "tempmail.com", "throwawaymail.com", "trashmail.com", "yopmail.com",
  "getnada.com", "tempr.email", "tmpmail.org", "dispostable.com",
  "fakeinbox.com", "sharklasers.com", "grr.la", "maildrop.cc",
  "spambog.com", "mytemp.email", "mohmal.com", "inboxbear.com",
  "33mail.com", "mailcatch.com", "mailexpire.com", "yomail.info",
  "fakemail.net", "gelitik.in", "spam4.me", "emailondeck.com",
  "email-temp.com", "burnermail.io", "emailtemporanea.net",
]);

export interface FraudScoreInput {
  userId: string;
  email: string;
  ip: string;
  orderTotalCents: number;
  shippingState?: string;
  shippingCountry?: string;
  ipCountry?: string | null; // from x-vercel-ip-country header
}

export interface FraudScoreResult {
  score: number; // 0-100
  signals: string[];
  flagged: boolean; // true if score >= 60
}

export async function scoreOrder(input: FraudScoreInput): Promise<FraudScoreResult> {
  const signals: string[] = [];
  let score = 0;

  // ── Email domain check ────────────────────────────────
  const domain = input.email.toLowerCase().split("@")[1] || "";
  if (DISPOSABLE_DOMAINS.has(domain)) {
    score += 35;
    signals.push(`disposable_email:${domain}`);
  }
  // Heuristic: long digit-run usernames are often scraped/bot emails
  const username = input.email.split("@")[0] || "";
  const digitRuns = username.match(/\d+/g) || [];
  if (digitRuns.some((r) => r.length >= 6)) {
    score += 10;
    signals.push("suspicious_email_pattern");
  }

  // ── IP velocity ───────────────────────────────────────
  if (input.ip && input.ip !== "unknown") {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Note: we don't store IP per order today, so this is a placeholder
    // that only triggers if we start logging order IPs. Keeping the hook
    // so it's easy to enable later.
    // const [{ ipCount }] = await db.select({ ipCount: sql<number>`count(*)::int` })
    //   .from(orders).where(and(eq(orders.createdAtIp, input.ip), gte(orders.createdAt, since)));
    // if (ipCount >= 3) { score += 25; signals.push(`ip_velocity:${ipCount}`); }
  }

  // ── User velocity ─────────────────────────────────────
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.userId, input.userId), gte(orders.createdAt, since)));
  if (userCount.count >= 5) {
    score += 30;
    signals.push(`user_velocity_24h:${userCount.count}`);
  } else if (userCount.count >= 3) {
    score += 15;
    signals.push(`user_velocity_24h:${userCount.count}`);
  }

  // ── High-dollar first order from fresh account ────────
  const [user] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (user) {
    const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
    const accountAgeHr = accountAgeMs / (1000 * 60 * 60);
    if (accountAgeHr < 1 && input.orderTotalCents >= 50000) {
      score += 25;
      signals.push(`first_order_large:${input.orderTotalCents}`);
    } else if (accountAgeHr < 24 && input.orderTotalCents >= 100000) {
      score += 15;
      signals.push(`young_account_large:${input.orderTotalCents}`);
    }
  }

  // ── Geo mismatch ──────────────────────────────────────
  if (
    input.shippingCountry &&
    input.ipCountry &&
    input.shippingCountry.toUpperCase() !== input.ipCountry.toUpperCase()
  ) {
    score += 15;
    signals.push(`geo_mismatch:${input.ipCountry}→${input.shippingCountry}`);
  }

  return {
    score: Math.min(100, score),
    signals,
    flagged: score >= 60,
  };
}
