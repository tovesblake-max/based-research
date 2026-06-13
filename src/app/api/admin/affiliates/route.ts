import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { affiliates, affiliateClicks, users, passwordResetTokens } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, desc, count, sql, or } from "drizzle-orm";
import {
  sendAffiliateApprovalEmail,
  sendAffiliateRejectionEmail,
  sendPasswordResetEmail,
} from "@/lib/email";
import { z } from "zod";
import { randomBytes } from "crypto";

// GET — list all affiliates with stats
export async function GET() {
  try {
    await requireAdmin();

    const allAffiliates = await db
      .select({
        id: affiliates.id,
        userId: affiliates.userId,
        affiliateCode: affiliates.affiliateCode,
        commissionRate: affiliates.commissionRate,
        totalEarned: affiliates.totalEarned,
        totalPaid: affiliates.totalPaid,
        payoutMethod: affiliates.payoutMethod,
        status: affiliates.status,
        createdAt: affiliates.createdAt,
        // Personal info from the linked user record. phone may be null
        // on legacy affiliates (pre-application-form). Admin uses these
        // to reach out to applicants directly via SMS / email.
        userEmail: users.email,
        userName: sql<string>`coalesce(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userPhone: users.phone,
        // Application context — free-text submitted by the applicant
        // (audience, platforms, why-they're-a-fit). Admin reads before
        // activating the code. Null on legacy affiliates that signed
        // up before the application form launched 2026-05-05.
        applicationNotes: affiliates.applicationNotes,
      })
      .from(affiliates)
      .innerJoin(users, eq(affiliates.userId, users.id))
      .orderBy(desc(affiliates.totalEarned));

    // Get referral counts per affiliate
    const refCounts = await db
      .select({
        referredBy: users.referredBy,
        count: count(),
      })
      .from(users)
      .where(sql`${users.referredBy} IS NOT NULL`)
      .groupBy(users.referredBy);

    const refMap = new Map(refCounts.map((r) => [r.referredBy, r.count]));

    // Click counts per affiliate (UTC-day-deduped at insert time)
    const clickCounts = await db
      .select({ affiliateId: affiliateClicks.affiliateId, count: count() })
      .from(affiliateClicks)
      .groupBy(affiliateClicks.affiliateId);

    const clickMap = new Map(clickCounts.map((c) => [c.affiliateId, c.count]));

    const result = allAffiliates.map((a) => {
      const clicks = clickMap.get(a.id) || 0;
      const signups = refMap.get(a.id) || 0;
      return {
        ...a,
        referralCount: signups,
        clickCount: clicks,
        // Click → signup conversion as integer percent (null when no clicks)
        clickConversionPct: clicks > 0 ? Math.round((signups / clicks) * 100) : null,
        pendingBalance: a.totalEarned - a.totalPaid,
      };
    });

    return NextResponse.json({ affiliates: result });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

// PATCH — update affiliate (commission rate, status). Server-side
// validation is strict on commissionRate because the admin UI sends
// whatever the operator types; a typo of "2500" instead of "0.25"
// previously would have written 2500x commission to the DB.
const ALLOWED_AFFILIATE_STATUSES = new Set(["active", "inactive", "suspended"]);

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const { affiliateId, commissionRate, status } = await request.json();

    if (!affiliateId || typeof affiliateId !== "string") {
      return NextResponse.json({ error: "affiliateId required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (commissionRate !== undefined) {
      const r = Number(commissionRate);
      if (!Number.isFinite(r) || r < 0 || r > 1) {
        return NextResponse.json(
          { error: "commissionRate must be a decimal between 0 and 1 (e.g. 0.25 for 25%)." },
          { status: 400 },
        );
      }
      // Stored as numeric(5,4) — preserve up to 4 decimals.
      updates.commissionRate = r.toFixed(4);
    }

    if (status !== undefined) {
      if (typeof status !== "string" || !ALLOWED_AFFILIATE_STATUSES.has(status)) {
        return NextResponse.json(
          { error: `status must be one of: ${[...ALLOWED_AFFILIATE_STATUSES].join(", ")}` },
          { status: 400 },
        );
      }
      updates.status = status;
    }

    // Capture the prior status so we can detect approval / rejection
    // transitions and fire the matching email exactly once per status
    // change. Re-firing on every PATCH would mean the partner gets a
    // fresh approval email every time admin tweaks their commission
    // rate, which is bad.
    const [prior] = await db
      .select({ status: affiliates.status, userId: affiliates.userId })
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId))
      .limit(1);

    const [updated] = await db
      .update(affiliates)
      .set(updates)
      .where(eq(affiliates.id, affiliateId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    // Fire the approval / rejection email when status TRANSITIONS into
    // the corresponding state. Both are best-effort: failures are
    // logged but never block the API response, since the admin needs
    // the status update to land regardless of email deliverability.
    if (
      status !== undefined &&
      prior &&
      prior.status !== status &&
      (status === "active" || status === "suspended")
    ) {
      try {
        const [user] = await db
          .select({
            email: users.email,
            firstName: users.firstName,
          })
          .from(users)
          .where(eq(users.id, prior.userId))
          .limit(1);

        if (user?.email) {
          if (status === "active") {
            await sendAffiliateApprovalEmail({
              email: user.email,
              firstName: user.firstName,
              affiliateCode: updated.affiliateCode,
              payoutMethod: (updated.payoutMethod as "crypto" | "ach") ?? "crypto",
              // Surface the per-affiliate checkout discount in the
              // approval email when set. Falls back to omitting the
              // line when null (we deliberately don't quote the
              // global default rate publicly).
              customerDiscountPercent: updated.couponDiscountPercent ?? null,
            });
          } else if (status === "suspended" && prior.status === "inactive") {
            // Treat suspended-from-inactive as a rejection of the
            // application. Suspended-from-active is a different case
            // (an existing partner being deactivated for cause); we
            // do not auto-email there because admin may want to
            // contact the partner with a custom message instead.
            await sendAffiliateRejectionEmail({
              email: user.email,
              firstName: user.firstName,
            });
          }
        }
      } catch (err) {
        console.error("[admin/affiliates] decision email failed", err);
      }
    }

    return NextResponse.json({ affiliate: updated });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

// POST — admin-initiated affiliate creation.
//
// Used to onboard partners who don't go through the public /affiliate/signup
// flow (e.g. influencers the operator reaches out to directly, like a named influencer).
// The admin types the partner's name, email, optional phone, picks a code +
// commission rate + optional checkout-discount, and we:
//
//   1. Find or create a `users` row keyed by email (or phone if no email).
//      Phone-only "passwordless" accounts use the same unusable-placeholder
//      hash convention as guest checkout accounts — admin-created partners
//      can later set a password by going through the standard sign-in flow.
//   2. Insert the `affiliates` row with status="active" so the code works
//      from the moment we save (admins onboard partners synchronously, not
//      with a vetting delay like the public application flow).
//   3. Optionally fire the approval email so the partner gets their custom
//      link + payout instructions immediately.
//
// Idempotency: if the email/phone already maps to a user who already has
// an affiliate row, returns 409. The admin can use the existing PATCH
// flow to update the existing affiliate instead.

const createAffiliateSchema = z.object({
  // Partner identity. firstName + email are required so we have at least
  // one durable contact channel for payouts + comms.
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email(),
  // E.164 — same format the rest of the codebase stores. Optional for
  // partners who'd rather only share email.
  phone: z.string().max(30).optional(),
  // Affiliate code: 3-30 chars alphanum, uppercased server-side. Must be
  // unique across the affiliates table.
  affiliateCode: z.string().min(3).max(30).regex(/^[A-Za-z0-9]+$/),
  // Commission rate as a decimal: 0.20 = 20%. Same validation as PATCH.
  commissionRate: z.number().min(0).max(1),
  // Optional per-affiliate checkout discount override. When set, customers
  // using this code get this % off their cart instead of the global
  // default. Pass null/undefined to inherit the global default.
  couponDiscountPercent: z.number().int().min(0).max(100).nullable().optional(),
  payoutMethod: z.enum(["crypto", "ach"]).default("crypto"),
  // Free-text admin note shown alongside the row. Useful for capturing
  // "where did this partner come from" / "what platform" without polluting
  // applicationNotes (which is intended for self-applied partners).
  applicationNotes: z.string().max(5000).optional(),
  // When true, fire the approval email immediately on create. Defaults
  // to true because the most common reason to admin-create is "I just
  // told them they're approved on a call, send them their link."
  sendApprovalEmail: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: z.infer<typeof createAffiliateSchema>;
  try {
    const json = await request.json();
    const parsed = createAffiliateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Normalize the affiliate code — store uppercase so lookups elsewhere
  // (coupon validation, click tracking) match consistently.
  const code = payload.affiliateCode.toUpperCase();
  const email = payload.email.trim().toLowerCase();
  const phone = payload.phone?.trim() || null;

  // Reject if the code is already in use. Better to surface the conflict
  // than to silently let the unique-index throw a 500.
  const [codeClash] = await db
    .select({ id: affiliates.id })
    .from(affiliates)
    .where(eq(affiliates.affiliateCode, code))
    .limit(1);
  if (codeClash) {
    return NextResponse.json(
      { error: `Affiliate code "${code}" is already in use.` },
      { status: 409 },
    );
  }

  // Find existing user by email or phone — admin frequently creates an
  // affiliate for someone who already bought from us as a customer.
  // Linking to the existing row preserves their order history under the
  // same identity instead of creating a ghost duplicate user.
  let userId: string;
  // Track whether we just minted a fresh user — if so, the create-flow
  // below fires a password-reset email so the partner can actually sign
  // in. Without it the placeholder hash blocks every sign-in attempt
  // (bug discovered 2026-05-07 with an affiliate code).
  let createdNewUser = false;
  const existingUserCandidates = await db
    .select({ id: users.id, email: users.email, phone: users.phone, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(
      phone
        ? or(eq(users.email, email), eq(users.phone, phone))
        : eq(users.email, email),
    )
    .limit(2);

  if (existingUserCandidates.length > 1) {
    // Email + phone matched two different rows. Don't merge them blindly
    // — admin should reconcile via the user-management tooling first.
    return NextResponse.json(
      {
        error:
          "This email and phone match different existing accounts. Reconcile the duplicate users before creating the affiliate.",
      },
      { status: 409 },
    );
  }

  if (existingUserCandidates.length === 1) {
    const existing = existingUserCandidates[0];
    userId = existing.id;

    // Backfill name/phone on the linked user when they're missing — same
    // posture as the public signup flow. Don't overwrite values that are
    // already populated (the user may have set a different preferred
    // name on their account).
    const userPatch: Record<string, string | Date> = {};
    if (payload.firstName && !existing.firstName) userPatch.firstName = payload.firstName;
    if (payload.lastName && !existing.lastName) userPatch.lastName = payload.lastName;
    if (phone && !existing.phone) userPatch.phone = phone;
    if (Object.keys(userPatch).length > 0) {
      userPatch.updatedAt = new Date();
      await db.update(users).set(userPatch).where(eq(users.id, userId));
    }

    // Reject if they're already an affiliate — admin should PATCH the
    // existing row instead of creating a duplicate.
    const [existingAffiliate] = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.userId, userId))
      .limit(1);
    if (existingAffiliate) {
      return NextResponse.json(
        {
          error:
            "This person is already an affiliate. Edit the existing row instead of creating a new one.",
        },
        { status: 409 },
      );
    }
  } else {
    // length must be 0 here — length > 1 returned early up-top.
    // No existing user — create a phone-only/email passwordless account.
    // The placeholder hash never matches anything, so the affiliate
    // can't sign in until they go through the password-reset flow we
    // fire below. Same convention guest checkout accounts use.
    const PASSWORDLESS_PLACEHOLDER = "$2b$10$ADMIN_CREATED_NO_PASSWORD_SET_YET___________________";
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        phone,
        firstName: payload.firstName,
        lastName: payload.lastName ?? null,
        passwordHash: PASSWORDLESS_PLACEHOLDER,
        role: "customer",
        // Email/phone NOT marked verified — admin asserted them but the
        // partner hasn't confirmed. They'll verify naturally when they
        // first complete the password-reset flow.
      })
      .returning({ id: users.id });
    userId = newUser.id;
    createdNewUser = true;
  }

  // Insert the affiliate row.
  const [newAffiliate] = await db
    .insert(affiliates)
    .values({
      userId,
      affiliateCode: code,
      commissionRate: payload.commissionRate.toFixed(4),
      payoutMethod: payload.payoutMethod,
      status: "active",
      applicationNotes: payload.applicationNotes ?? null,
      couponDiscountPercent:
        payload.couponDiscountPercent === undefined
          ? null
          : payload.couponDiscountPercent,
    })
    .returning();

  // Fire the approval email if requested. Best-effort — email failures
  // never roll back the affiliate creation. Admin can resend manually
  // by toggling status off/on (the existing PATCH path emails on
  // inactive→active transition).
  if (payload.sendApprovalEmail) {
    try {
      await sendAffiliateApprovalEmail({
        email,
        firstName: payload.firstName,
        affiliateCode: code,
        payoutMethod: payload.payoutMethod,
        customerDiscountPercent: payload.couponDiscountPercent ?? null,
      });
    } catch (err) {
      console.error("[admin/affiliates POST] approval email failed", err);
    }
  }

  // ── PASSWORD-RESET EMAIL FOR NEW USERS ──
  // When we just minted a fresh user account (no prior order history,
  // no existing password), fire a password-reset email so the partner
  // has a way to set a real password and actually sign in. Without
  // this they get stuck at the sign-in form forever — the placeholder
  // hash never matches anything. Existing users (linked to a previous
  // checkout) already have a password and don't need this.
  let passwordResetSent = false;
  if (createdNewUser) {
    try {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h — longer than the standard reset (1h) since affiliates may not check email immediately
      await db.insert(passwordResetTokens).values({
        userId,
        token,
        expiresAt,
      });
      await sendPasswordResetEmail(email, token);
      passwordResetSent = true;
    } catch (err) {
      console.error("[admin/affiliates POST] password-reset email failed", err);
    }
  }

  return NextResponse.json({
    affiliate: newAffiliate,
    userId,
    affiliateCode: code,
    emailSent: payload.sendApprovalEmail,
    passwordResetSent,
    createdNewUser,
  });
}
