// Quick-access admin login.
//
// Single shared code (env: ADMIN_QUICK_CODE) grants admin access without
// going through the email + password + phone-OTP flow. Bound to a real
// admin user (env: ADMIN_QUICK_USER_EMAIL, defaulting to the first admin
// in the DB) so the audit trail keeps working — every action taken
// after quick-access is attributed to that user.
//
// Security posture:
//   - Constant-time compare on the code (no early exit on mismatch)
//   - Per-IP rate limit (5 attempts / 15 min) — brute force is infeasible
//     against any code ≥ 8 chars even with a botnet
//   - 24-hour session (vs 7-day for the password flow) — narrower blast
//     radius if the cookie leaks from a public terminal
//   - Every attempt is logged to stderr (success + failure) for audit
//   - Endpoint fails closed: missing env var → 503, never auto-grants
//
// Rotation: change ADMIN_QUICK_CODE in Vercel's env settings, redeploy.
// All existing quick-access sessions remain valid until JWT expiry —
// that's intentional (rotating the code shouldn't lock you out mid-task).
// To kick all sessions, also rotate JWT_SECRET.

import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const COOKIE_NAME = "br-session"; // matches src/lib/auth.ts

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET required in production");
  }
  return new TextEncoder().encode(secret || "based-research-dev-secret-local-only");
}

const bodySchema = z.object({
  code: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent")?.slice(0, 200) ?? "unknown";

  // Rate limit BEFORE any work so a flood of bad requests doesn't burn
  // CPU on bcrypt-equivalent compares.
  const allowed = await rateLimit(`admin-quick:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    console.warn(`[admin-quick] rate limited ip=${ip} ua="${ua}"`);
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  const expectedCode = process.env.ADMIN_QUICK_CODE;
  if (!expectedCode) {
    // Fail closed — never auto-grant when the gate isn't configured.
    console.error("[admin-quick] ADMIN_QUICK_CODE not set; refusing all access");
    return NextResponse.json(
      { error: "Quick access is not configured." },
      { status: 503 },
    );
  }
  if (expectedCode.length < 8) {
    // A loud refusal is better than silently accepting a weak code that
    // could be brute-forced over a few weeks.
    console.error("[admin-quick] ADMIN_QUICK_CODE shorter than 8 chars; refusing");
    return NextResponse.json(
      { error: "Quick access is misconfigured (weak code)." },
      { status: 503 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Constant-time compare. Mismatched lengths still need a full compare
  // to keep timing flat, so we pad to the longer of the two before
  // hashing. SHA-256 means any input length normalizes to 32 bytes.
  const submitted = crypto
    .createHash("sha256")
    .update(body.code, "utf8")
    .digest();
  const expected = crypto
    .createHash("sha256")
    .update(expectedCode, "utf8")
    .digest();
  const codeMatches = crypto.timingSafeEqual(submitted, expected);

  if (!codeMatches) {
    console.warn(`[admin-quick] FAILED code attempt ip=${ip} ua="${ua}"`);
    return NextResponse.json(
      { error: "Invalid code." },
      { status: 401 },
    );
  }

  // Find the admin user this code resolves to. Default to the first
  // admin in the DB if no override is set, so a fresh setup works
  // without needing the email config — but ADMIN_QUICK_USER_EMAIL is
  // the recommended explicit binding.
  const targetEmail = process.env.ADMIN_QUICK_USER_EMAIL?.toLowerCase();
  const adminQuery = targetEmail
    ? db
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(and(eq(users.email, targetEmail), eq(users.role, "admin")))
        .limit(1)
    : db
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.role, "admin"))
        .orderBy(users.createdAt)
        .limit(1);

  const [admin] = await adminQuery;
  if (!admin) {
    console.error(
      `[admin-quick] code matched but no admin user found (target=${targetEmail ?? "<first admin>"})`,
    );
    return NextResponse.json(
      { error: "Quick access is misconfigured (no admin user)." },
      { status: 503 },
    );
  }

  // Mint a 24-hour JWT — shorter than the standard 7-day password
  // session. Cookie maxAge tracks the JWT expiry so the cookie evicts
  // itself when the token would no longer verify anyway.
  const token = await new SignJWT({ userId: admin.id, role: admin.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(getJwtSecret());

  const cookieStore = await cookies();
  const isLocalDev =
    process.env.NODE_ENV !== "production" && !process.env.VERCEL;
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: !isLocalDev,
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  console.warn(
    `[admin-quick] SUCCESS ip=${ip} ua="${ua}" admin=${admin.email}`,
  );

  return NextResponse.json({ ok: true, redirect: "/admin" });
}
