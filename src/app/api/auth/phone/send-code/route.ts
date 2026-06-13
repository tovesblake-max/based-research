import { NextResponse } from "next/server";
import { normalizePhone, sendVerificationCode } from "@/lib/twilio";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // IP rate limit — 5 codes per 15 min per IP (prevents SMS bombing)
    if (!(await rateLimit(`phone-send:ip:${ip}`, 5, 15 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Too many verification requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.phone !== "string") {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    if (body.consent !== true) {
      return NextResponse.json(
        { error: "You must confirm the research-use-only terms to continue." },
        { status: 400 }
      );
    }

    // Turnstile bot-challenge check
    const turnstile = await verifyTurnstileToken(body.turnstileToken, ip);
    if (!turnstile.success) {
      return NextResponse.json(
        { error: "Verification failed. Please refresh and try again." },
        { status: 403 }
      );
    }

    const countryCode = typeof body.countryCode === "string" ? body.countryCode : "+1";
    const phoneE164 = normalizePhone(body.phone, countryCode);

    if (!phoneE164) {
      return NextResponse.json(
        { error: "Please enter a valid phone number." },
        { status: 400 }
      );
    }

    // Per-phone rate limit — 3 codes per 10 min for the same number
    if (!(await rateLimit(`phone-send:num:${phoneE164}`, 3, 10 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Please wait before requesting another code for this number." },
        { status: 429 }
      );
    }

    await sendVerificationCode(phoneE164);

    return NextResponse.json({
      message: "Verification code sent.",
      phone: phoneE164,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Phone send-code error:", msg);

    // Surface a safe message — don't leak Twilio internals
    if (msg.includes("Twilio is not configured")) {
      return NextResponse.json(
        { error: "Phone login is not currently available." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Could not send verification code. Please check the number and try again." },
      { status: 500 }
    );
  }
}
