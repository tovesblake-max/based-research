import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { affiliates, affiliateClicks, commissions, payouts, users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { eq, desc, count, sql } from "drizzle-orm";
import { z } from "zod";

// ACH payout routing/account numbers are encrypted at rest using the same
// AES-256-GCM helper that protects subscription ACH credentials. Only the
// last 4 digits of the account number are stored in the clear for display.
function maskAccount(acct: string): string {
  if (acct.length <= 4) return acct;
  return "*".repeat(acct.length - 4) + acct.slice(-4);
}

function generateAffiliateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// GET — fetch current user's affiliate data + stats
export async function GET() {
  try {
    const user = await requireAuth();

    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.userId, user.id))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ affiliate: null });
    }

    // Count referrals
    const [refCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.referredBy, affiliate.id));

    // Count clicks (deduped per visitor per UTC day)
    const [clickCount] = await db
      .select({ count: count() })
      .from(affiliateClicks)
      .where(eq(affiliateClicks.affiliateId, affiliate.id));

    // Recent commissions
    const recentCommissions = await db
      .select()
      .from(commissions)
      .where(eq(commissions.affiliateId, affiliate.id))
      .orderBy(desc(commissions.createdAt))
      .limit(20);

    // Recent payouts
    const recentPayouts = await db
      .select()
      .from(payouts)
      .where(eq(payouts.affiliateId, affiliate.id))
      .orderBy(desc(payouts.createdAt))
      .limit(10);

    // Strip the encrypted blobs before returning — the affiliate sees their
    // masked last-4 account number in the UI, never the ciphertext.
    const safePayoutDetails = affiliate.payoutDetails
      ? {
          walletAddress: (affiliate.payoutDetails as Record<string, string>).walletAddress,
          accountName: (affiliate.payoutDetails as Record<string, string>).accountName,
          accountNumberMasked: (affiliate.payoutDetails as Record<string, string>).accountNumberMasked,
          accountNumberLast4: (affiliate.payoutDetails as Record<string, string>).accountNumberLast4,
        }
      : null;

    return NextResponse.json({
      affiliate: { ...affiliate, payoutDetails: safePayoutDetails },
      referralCount: refCount?.count || 0,
      clickCount: clickCount?.count || 0,
      commissions: recentCommissions,
      payouts: recentPayouts,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const signupSchema = z.object({
  payoutMethod: z.enum(["crypto", "ach"]),
  payoutDetails: z.object({
    walletAddress: z.string().optional(),
    routingNumber: z.string().optional(),
    accountNumber: z.string().optional(),
    accountName: z.string().optional(),
  }),
  customCode: z.string().max(30).regex(/^[a-zA-Z0-9]+$/).optional(),
  // Application context — collected up-front so admin can vet the
  // applicant before activating the code. Required at the form level;
  // server tolerates blanks for backwards compat with any external
  // tool calling this endpoint directly.
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  applicationNotes: z.string().max(5000).optional(),
});

// POST — sign up as an affiliate
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Check if already an affiliate
    const [existing] = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.userId, user.id))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "You are already an affiliate" }, { status: 409 });
    }

    const {
      payoutMethod,
      payoutDetails,
      customCode,
      firstName,
      lastName,
      phone,
      applicationNotes,
    } = parsed.data;

    // Backfill the user's name + phone if missing — many of our existing
    // users came in via guest checkout and don't have a phone on file,
    // and admin needs to be able to reach an applicant directly. We do
    // NOT overwrite existing values (the user might have a different
    // preferred contact, e.g. business phone, that they put in their
    // account profile separately).
    const userPatch: Record<string, string | Date> = { updatedAt: new Date() };
    let needsUserPatch = false;
    if (firstName && !user.firstName) {
      userPatch.firstName = firstName;
      needsUserPatch = true;
    }
    if (lastName && !user.lastName) {
      userPatch.lastName = lastName;
      needsUserPatch = true;
    }
    if (phone && !user.phone) {
      userPatch.phone = phone;
      needsUserPatch = true;
    }
    if (needsUserPatch) {
      await db
        .update(users)
        .set(userPatch)
        .where(eq(users.id, user.id))
        .catch((err) => console.warn("[Affiliate Signup] user backfill failed", err));
    }

    // Encrypt ACH bank details at rest. Wallet address is a public identifier
    // for crypto payouts and stays in the clear so admin payouts flow can use
    // it directly without decryption ceremony.
    const protectedPayoutDetails: Record<string, string> = {};
    if (payoutDetails.walletAddress) {
      protectedPayoutDetails.walletAddress = payoutDetails.walletAddress;
    }
    if (payoutDetails.accountName) {
      protectedPayoutDetails.accountName = payoutDetails.accountName;
    }
    if (payoutDetails.routingNumber) {
      protectedPayoutDetails.routingNumberEncrypted = encrypt(payoutDetails.routingNumber);
    }
    if (payoutDetails.accountNumber) {
      protectedPayoutDetails.accountNumberEncrypted = encrypt(payoutDetails.accountNumber);
      protectedPayoutDetails.accountNumberLast4 = payoutDetails.accountNumber.slice(-4);
      protectedPayoutDetails.accountNumberMasked = maskAccount(payoutDetails.accountNumber);
    }

    // Generate or validate affiliate code
    let code = customCode || generateAffiliateCode();

    // Check code uniqueness
    const [codeExists] = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.affiliateCode, code.toUpperCase()))
      .limit(1);

    if (codeExists) {
      if (customCode) {
        return NextResponse.json({ error: "That affiliate code is already taken" }, { status: 409 });
      }
      code = generateAffiliateCode(); // retry with random
    }

    const [affiliate] = await db
      .insert(affiliates)
      .values({
        userId: user.id,
        affiliateCode: code.toUpperCase(),
        payoutMethod,
        payoutDetails: protectedPayoutDetails,
        // Application notes — admin reads this to vet before activating
        // the code. Plain text, multi-line. Schema clamps to 5000 chars.
        applicationNotes: applicationNotes || null,
        // New applications default to "inactive" (pending admin review).
        // This is the gate that makes the application flow real: the
        // affiliate code is reserved for the applicant but not yet
        // usable as a coupon. Admin flips status → "active" via the
        // admin dashboard, which fires the approval email.
        status: "inactive",
      })
      .returning();

    return NextResponse.json({ affiliate }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Affiliate Signup]", error);
    return NextResponse.json({ error: "Failed to create affiliate" }, { status: 500 });
  }
}
