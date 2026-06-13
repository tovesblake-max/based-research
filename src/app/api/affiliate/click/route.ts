import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { affiliates, affiliateClicks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

// Click capture for the affiliate program. Fired once-per-page-load by
// `<ReferralCapture />` in the root layout when `?ref=CODE` is present.
//
// Dedupe strategy: we hash (ipBucket + code + UTC date) and rely on a
// unique index on `dedupe_hash` to collapse repeat hits — page reloads,
// SPA navigations, and back-button traffic all dedupe to one row per
// visitor per code per UTC day. The IP itself never lands in the DB
// (PII minimization) — only the hash does. Geo (`country`) is read
// from the Vercel edge header so we still get useful segmentation.

const bodySchema = z.object({
  code: z.string().min(1).max(30),
  // First-party landing path so we know which entry point the affiliate's
  // traffic actually used. Cap length to keep the column lean and to
  // avoid storing query strings full of UTM/PII.
  path: z.string().max(500).optional(),
});

function clientIp(request: Request): string {
  // Vercel populates x-forwarded-for; first IP is the client. Fall back
  // to the user-agent string so dedupe still works (best-effort) when
  // edge headers are absent (local dev, custom proxies).
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("user-agent") || "unknown";
}

function dedupeHash(code: string, ip: string, dayBucket: string): string {
  // Bucket the IP to a /24 (IPv4) or /48 (IPv6 first 3 groups) so
  // shared-NAT customers don't count as a single visitor. A loose
  // /24 keeps dedupe meaningful for the common ISP / coffee-shop case
  // without over-merging traffic from large NATs.
  let ipBucket = ip;
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) ipBucket = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  } else if (ip.includes(":")) {
    const parts = ip.split(":");
    ipBucket = parts.slice(0, 3).join(":");
  }
  return crypto
    .createHash("sha256")
    .update(`${ipBucket}|${code}|${dayBucket}`)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      // Bad payload — accept silently. We never want a click endpoint to
      // surface errors to the page, and a 400 here would noise the
      // browser console.
      return NextResponse.json({ ok: true });
    }
    const code = parsed.data.code.trim().toUpperCase();
    const path = parsed.data.path?.slice(0, 500) ?? null;

    const [affiliate] = await db
      .select({ id: affiliates.id, status: affiliates.status })
      .from(affiliates)
      .where(eq(affiliates.affiliateCode, code))
      .limit(1);

    // Unknown or paused codes silently no-op. Don't reveal whether a
    // code exists by status code — affiliate codes leak attribution.
    if (!affiliate || affiliate.status !== "active") {
      return NextResponse.json({ ok: true });
    }

    const ip = clientIp(request);
    const dayBucket = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
    const hash = dedupeHash(code, ip, dayBucket);
    const country = request.headers.get("x-vercel-ip-country");
    const referer = request.headers.get("referer")?.slice(0, 500) ?? null;
    const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

    // ON CONFLICT DO NOTHING via the unique index on dedupe_hash.
    // Drizzle exposes this as `.onConflictDoNothing()`.
    await db
      .insert(affiliateClicks)
      .values({
        affiliateId: affiliate.id,
        landingPath: path,
        country: country?.slice(0, 2) ?? null,
        dedupeHash: hash,
        referer,
        userAgent,
      })
      .onConflictDoNothing();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("[Affiliate Click] capture failed", err);
    return NextResponse.json({ ok: true });
  }
}
