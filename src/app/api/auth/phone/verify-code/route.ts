import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createToken, setSessionCookie } from "@/lib/auth";
import { checkVerificationCode, normalizePhone } from "@/lib/twilio";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // Aggressive rate limit on code-check — 10 attempts per 15 min per IP
    if (!(await rateLimit(`phone-verify:ip:${ip}`, 10, 15 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.phone !== "string" || typeof body.code !== "string") {
      return NextResponse.json(
        { error: "Phone and code are required." },
        { status: 400 }
      );
    }

    const countryCode = typeof body.countryCode === "string" ? body.countryCode : "+1";
    const phoneE164 = normalizePhone(body.phone, countryCode);

    if (!phoneE164) {
      return NextResponse.json(
        { error: "Invalid phone number." },
        { status: 400 }
      );
    }

    // Only digits allowed in code (Twilio Verify uses numeric codes)
    const code = body.code.trim().replace(/\D/g, "");
    if (code.length < 4 || code.length > 10) {
      return NextResponse.json(
        { error: "Invalid code." },
        { status: 400 }
      );
    }

    // Ask Twilio whether the code is valid
    const result = await checkVerificationCode(phoneE164, code);

    if (!result.valid) {
      const msg =
        result.status === "expired"
          ? "This code has expired. Please request a new one."
          : "Invalid code. Please try again.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Code is valid — find or create the user keyed on phone
    const existing = await db
      .select({
        id: users.id,
        role: users.role,
        phoneVerified: users.phoneVerified,
      })
      .from(users)
      .where(eq(users.phone, phoneE164))
      .limit(1);

    let userId: string;
    let role: string;

    if (existing.length > 0) {
      userId = existing[0].id;
      role = existing[0].role;

      // Mark phone verified if it wasn't already
      if (!existing[0].phoneVerified) {
        await db
          .update(users)
          .set({ phoneVerified: true, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }
    } else {
      // Capture signup geo from Vercel edge headers
      const signupCountry = request.headers.get("x-vercel-ip-country") || null;
      const signupRegion = request.headers.get("x-vercel-ip-country-region") || null;
      const signupCityRaw = request.headers.get("x-vercel-ip-city");
      const signupCity = signupCityRaw ? decodeURIComponent(signupCityRaw) : null;
      const signupIp = ip === "unknown" ? null : ip;

      // Phone-only "guest" accounts have no email until the user provides one.
      // Password hash is unusable (starts with "!") so email/password login is impossible.
      const unusablePasswordHash = `!${crypto.randomBytes(32).toString("hex")}`;

      const [created] = await db
        .insert(users)
        .values({
          email: null,
          passwordHash: unusablePasswordHash,
          phone: phoneE164,
          phoneVerified: true,
          signupIp,
          signupCountry,
          signupRegion,
          signupCity,
        })
        .returning({ id: users.id, role: users.role });

      userId = created.id;
      role = created.role;
    }

    // Issue session — reaching this point means Twilio Verify just
    // accepted the OTP for `phoneE164` AND the user row has phoneVerified
    // set (either pre-existing or just now via the update/create above).
    const token = await createToken(userId, role, true);
    await setSessionCookie(token);

    return NextResponse.json({
      message: "Signed in.",
      isNewAccount: existing.length === 0,
      // Surfaced so the client can branch the post-sign-in redirect
      // by role (admins → /admin, customers → /account) without an
      // extra round-trip to /api/auth/me.
      role,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Phone verify-code error:", msg);

    if (msg.includes("Twilio is not configured")) {
      return NextResponse.json(
        { error: "Phone login is not currently available." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Could not verify code. Please try again." },
      { status: 500 }
    );
  }
}
