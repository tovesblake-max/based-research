/**
 * Sign-up API — requires phone verification.
 *
 * Two-step flow (client drives the steps):
 *   1. Client gathers email + password + first/last name + phone + Turnstile
 *   2. Client calls /api/auth/phone/send-code to dispatch OTP
 *   3. User enters the 6-digit code
 *   4. Client POSTs the full payload (email, password, name, phone, code) to HERE
 *   5. We verify the OTP with Twilio, then create the account
 *
 * If the OTP is invalid, no account is created. This blocks bot signups at the
 * phone layer — attackers can't batch-create accounts without a real SIM.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, affiliates } from "@/lib/db/schema";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import { signUpSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizePhone, checkVerificationCode } from "@/lib/twilio";
import { encrypt } from "@/lib/crypto";
import { ACCEPTED_BUSINESS_TYPE_VALUES } from "@/lib/business-types";
import { eq } from "drizzle-orm";
import { z } from "zod";

const phoneOtpSchema = z.object({
  phone: z.string().min(7).max(20),
  countryCode: z.string().default("+1"),
  code: z.string().regex(/^\d{4,10}$/, "Invalid verification code"),
});

// Business-type classification + research-use affirmation, collected at
// account creation (2026-05-21). Business type is constrained to the
// shared source-of-truth enum (src/lib/business-types.ts) so signup +
// checkout never drift. Saved to the user profile so checkout pre-fills
// it and the customer never re-declares.
//
// company name + EIN are OPTIONAL business identifiers. EIN is encrypted
// at rest (same posture as wholesale_accounts.ein). EIN format is lenient
// on input (we accept "12-3456789", "123456789", or blank) — it's a
// reference identifier, not an auth credential, so we don't hard-reject.
const researcherSchema = z.object({
  researcherType: z.enum(ACCEPTED_BUSINESS_TYPE_VALUES, {
    message: "Please select your business type / industry.",
  }),
  researchUseAcknowledged: z.literal(true, {
    message: "You must confirm these products are for laboratory research use only.",
  }),
  companyName: z.string().trim().max(255).optional().or(z.literal("")),
  ein: z.string().trim().max(20).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!(await rateLimit(`sign-up:${ip}`, 5, 60 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Too many sign-up attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // 1. Validate core signup fields (email/password/name)
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // 2. Validate phone + OTP fields
    const otpParsed = phoneOtpSchema.safeParse(body);
    if (!otpParsed.success) {
      return NextResponse.json(
        { error: "Phone number and verification code are required." },
        { status: 400 }
      );
    }

    // 2b. Validate researcher classification + research-use affirmation.
    const researcherParsed = researcherSchema.safeParse(body);
    if (!researcherParsed.success) {
      return NextResponse.json(
        { error: researcherParsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName } = parsed.data;
    const { phone, countryCode, code } = otpParsed.data;
    const { researcherType, companyName: rawCompanyName, ein: rawEin } = researcherParsed.data;
    const referralCode = body.referralCode as string | undefined;

    // Optional business identifiers. Normalize empty strings to null.
    // EIN is encrypted at rest; we strip to digits-with-optional-dash for
    // storage consistency but don't reject malformed input (optional field).
    const companyName = rawCompanyName && rawCompanyName.trim().length > 0 ? rawCompanyName.trim() : null;
    const einPlain = rawEin && rawEin.trim().length > 0 ? rawEin.trim() : null;
    const einEncrypted = einPlain ? encrypt(einPlain) : null;

    // 3. Normalize phone to E.164
    const phoneE164 = normalizePhone(phone, countryCode);
    if (!phoneE164) {
      return NextResponse.json(
        { error: "Invalid phone number." },
        { status: 400 }
      );
    }

    // 4. Verify the OTP with Twilio. This is the bot gate.
    const verifyResult = await checkVerificationCode(phoneE164, code.trim());
    if (!verifyResult.valid) {
      const msg =
        verifyResult.status === "expired"
          ? "This code has expired. Please request a new one."
          : "Invalid code. Please try again.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const emailLower = email.toLowerCase();

    // 5. Check email uniqueness
    const [emailClash] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emailLower))
      .limit(1);
    if (emailClash) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // 6. Check phone uniqueness — if taken, guide the user to sign in instead
    const [phoneClash] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.phone, phoneE164))
      .limit(1);
    if (phoneClash) {
      // Phone exists. If it's attached to a guest account (email=null), upgrade
      // the guest to a full account with email+password.
      if (!phoneClash.email) {
        const passwordHash = await hashPassword(password);
        await db
          .update(users)
          .set({
            email: emailLower,
            passwordHash,
            firstName: firstName || null,
            lastName: lastName || null,
            phoneVerified: true,
            researcherType,
            researchUseAcknowledgedAt: new Date(),
            companyName,
            ein: einEncrypted,
            updatedAt: new Date(),
          })
          .where(eq(users.id, phoneClash.id));

        const [u] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, phoneClash.id))
          .limit(1);

        // phone-clash branch sets phoneVerified=true above on the
        // upgraded row, so the new session JWT carries the verified flag.
        const token = await createToken(phoneClash.id, u?.role || "customer", true);
        await setSessionCookie(token);

        return NextResponse.json(
          { message: "Account upgraded successfully." },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          error:
            "This phone number is already associated with an account. Sign in with your phone instead.",
        },
        { status: 409 }
      );
    }

    // 7. Look up affiliate if referral code provided
    let referredBy: string | null = null;
    if (referralCode) {
      const [affiliate] = await db
        .select({ id: affiliates.id })
        .from(affiliates)
        .where(eq(affiliates.affiliateCode, referralCode))
        .limit(1);
      if (affiliate) {
        referredBy = affiliate.id;
      }
    }

    // 8. Capture signup geo — Vercel edge injects these headers on every request
    const signupCountry = request.headers.get("x-vercel-ip-country") || null;
    const signupRegion = request.headers.get("x-vercel-ip-country-region") || null;
    const signupCityRaw = request.headers.get("x-vercel-ip-city");
    const signupCity = signupCityRaw ? decodeURIComponent(signupCityRaw) : null;
    const signupIp = ip === "unknown" ? null : ip;

    // 9. Create the verified user
    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({
        email: emailLower,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phoneE164,
        phoneVerified: true,
        researcherType,
        researchUseAcknowledgedAt: new Date(),
        companyName,
        ein: einEncrypted,
        referredBy,
        signupIp,
        signupCountry,
        signupRegion,
        signupCity,
      })
      .returning({ id: users.id, role: users.role });

    // 10. Session cookie — sign-up only succeeds after Twilio Verify
    // accepts the OTP, so phoneVerified is always true here.
    const token = await createToken(user.id, user.role, true);
    await setSessionCookie(token);

    return NextResponse.json(
      { message: "Account created successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Sign-up error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
