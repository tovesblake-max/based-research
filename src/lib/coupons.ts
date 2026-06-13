// Coupon code validation + application.
//
// Flow:
//   1. Customer types a code on the cart page, we POST to /api/coupons/validate
//   2. API returns { valid, discountCents, couponId, error? } based on the cart state
//   3. Cart stores the applied code + discount; checkout routes revalidate
//      server-side and insert a coupon_redemptions row on order success
//
// Never trust the client-computed discount. Every call recomputes from the
// authoritative cart items + server-side coupon row.

import { db } from "./db";
import { coupons, couponRedemptions, affiliates, type Coupon } from "./db/schema";
import { eq, and, sql } from "drizzle-orm";
import { computeShippingCents } from "./discounts";
import { getProductBySlug } from "./products";

export interface CartItemShape {
  slug: string;
  price: number; // unit price in cents
  quantity: number;
}

export interface ValidationSuccess {
  valid: true;
  // Real coupon row this resolved against. Null when the code matched an
  // active affiliate (no coupon row exists; we synthesize the discount).
  // The checkout route uses this to decide whether to record a redemption
  // or just attach the affiliate ID to the order.
  couponId: string | null;
  // Affiliate this code belongs to, if it was used as a coupon. Order
  // creation uses this to populate orders.referralAffiliateId so the
  // commission flows to that affiliate even if the buyer wasn't
  // originally referred (no users.referredBy at signup).
  affiliateId?: string;
  code: string;
  discountCents: number;
  description: string | null;
}

export interface ValidationFailure {
  valid: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// Discount applied when an affiliate code is used as a coupon at
// checkout. Independent of the affiliate's commission rate — the buyer's
// 10% off and the affiliate's commission % are separate levers the operator
// can tune. Set as a flat percent of the eligible subtotal.
export const AFFILIATE_COUPON_DISCOUNT_PERCENT = 10;

/**
 * Validate a coupon code against a cart. Pure — does not mutate anything.
 * Caller is responsible for recomputing totals using discountCents.
 *
 * Codes resolve in two passes:
 *   1. Real coupon row (`coupons.code = X AND is_active`)
 *   2. Active affiliate code (`affiliates.affiliate_code = X AND status = 'active'`)
 * The first match wins. An affiliate match yields a flat 10% off the
 * subtotal and stamps the order with the affiliate ID for commission
 * routing. Real coupon rows always take precedence so a merchant promo
 * can override an affiliate code if the codes ever collide (uniqueness
 * is enforced inside each table but not across them).
 */
export async function validateCoupon(
  codeInput: string,
  items: CartItemShape[],
  userId?: string | null,
): Promise<ValidationResult> {
  const code = codeInput.trim().toUpperCase();
  if (!code) return { valid: false, error: "Enter a code." };

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.code, code), eq(coupons.isActive, true)))
    .limit(1);

  if (!coupon) {
    // Fall back to affiliate-as-coupon lookup before giving up.
    const affResult = await tryAffiliateAsCoupon(code, items);
    if (affResult) return affResult;
    return { valid: false, error: "Invalid or expired code." };
  }

  // Window
  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now) {
    return { valid: false, error: "This code isn't active yet." };
  }
  if (coupon.validUntil && coupon.validUntil < now) {
    return { valid: false, error: "This code has expired." };
  }

  // Total-use cap
  if (coupon.maxRedemptions && coupon.timesRedeemed >= coupon.maxRedemptions) {
    return { valid: false, error: "This code has reached its usage limit." };
  }

  // Per-user cap
  if (coupon.maxPerUser && userId) {
    const userRedemptions = await db
      .select({ id: couponRedemptions.id })
      .from(couponRedemptions)
      .where(
        and(
          eq(couponRedemptions.couponId, coupon.id),
          eq(couponRedemptions.userId, userId),
        ),
      );
    if (userRedemptions.length >= coupon.maxPerUser) {
      return { valid: false, error: "You've already used this code." };
    }
  }

  // Product-match check — applies only when appliesTo is set. Cart must
  // contain at least one item whose slug is in the list.
  if (coupon.appliesTo && coupon.appliesTo.length > 0) {
    const cartSlugs = new Set(items.map((i) => i.slug));
    const hasMatch = coupon.appliesTo.some((slug) => cartSlugs.has(slug));
    if (!hasMatch) {
      return {
        valid: false,
        error: "Add an eligible product to your cart to use this code.",
      };
    }
  }

  // Minimum subtotal check — runs BEFORE the discount computation and the
  // free-shipping short-circuit below, so a min-subtotal coupon (including a
  // free-shipping one whose discountCents is 0) can never apply under its
  // threshold. Placed after the product-match check so the error stays
  // specific ("add eligible product" vs "subtotal too low").
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  if (coupon.minSubtotalCents && subtotal < coupon.minSubtotalCents) {
    return {
      valid: false,
      error: `Spend at least $${(coupon.minSubtotalCents / 100).toFixed(2)} to use this code.`,
    };
  }

  // Compute discount amount
  const discountCents = computeDiscount(coupon, items);
  if (discountCents <= 0) {
    // Free-shipping coupons get a friendlier "already-applied" success
    // when the cart is already over the threshold — UX-wise we want to
    // tell the customer "you're already getting free shipping" rather
    // than silently failing the code.
    const isFreeShipping =
      coupon.freeShipping || coupon.discountType === "free_shipping";
    if (isFreeShipping) {
      return {
        valid: true,
        couponId: coupon.id,
        code: coupon.code,
        discountCents: 0,
        description: "Free shipping (your cart already qualifies)",
      };
    }
    return {
      valid: false,
      error: "This code doesn't apply to your current cart.",
    };
  }

  // Free-shipping coupons override the generic description so the cart UI
  // can show a clean "Free shipping" badge instead of the coupon's
  // (often verbose) admin description.
  const isFreeShipping =
    coupon.freeShipping || coupon.discountType === "free_shipping";

  return {
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    discountCents,
    description: isFreeShipping ? "Free shipping" : coupon.description,
  };
}

/**
 * Resolve an entered code as an affiliate code. Returns a synthesized
 * coupon-shaped success when the code matches an active affiliate, or
 * null to let the caller emit "invalid code". Discount is a flat
 * percentage of the cart subtotal (no per-product gating, no minimum).
 *
 * Buyers don't see different copy for an affiliate-as-coupon match vs a
 * real coupon — both surfaces show "Discount applied". The affiliateId
 * is consumed only by the checkout route to attach `referralAffiliateId`
 * to the order; it doesn't leak to the cart UI.
 */
async function tryAffiliateAsCoupon(
  code: string,
  items: CartItemShape[],
): Promise<ValidationSuccess | null> {
  const [affiliate] = await db
    .select({
      id: affiliates.id,
      affiliateCode: affiliates.affiliateCode,
      status: affiliates.status,
      // Per-affiliate override (column added 2026-05-05). NULL falls
      // back to the global AFFILIATE_COUPON_DISCOUNT_PERCENT default.
      couponDiscountPercent: affiliates.couponDiscountPercent,
    })
    .from(affiliates)
    .where(eq(affiliates.affiliateCode, code))
    .limit(1);

  if (!affiliate || affiliate.status !== "active") return null;

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  if (subtotal <= 0) return null;

  // Resolve the discount rate: per-affiliate override > global default.
  // Clamp to a sane range so a stray DB value (e.g. 200) cannot push
  // the cart negative.
  const rawPercent =
    typeof affiliate.couponDiscountPercent === "number"
      ? affiliate.couponDiscountPercent
      : AFFILIATE_COUPON_DISCOUNT_PERCENT;
  const discountPercent = Math.max(0, Math.min(75, rawPercent));

  const discountCents = Math.round(subtotal * (discountPercent / 100));
  if (discountCents <= 0) return null;

  return {
    valid: true,
    couponId: null,
    affiliateId: affiliate.id,
    code: affiliate.affiliateCode,
    discountCents,
    description: `${discountPercent}% off — affiliate code ${affiliate.affiliateCode}`,
  };
}

/**
 * Core discount arithmetic. Applied against either the matching-items
 * subtotal (when appliesTo is set) or the full cart (when sitewide).
 * Capped at the relevant subtotal so an order never goes negative.
 *
 * Three discount families:
 *   - `fixed_amount` — flat cents off the eligible subtotal
 *   - `percentage`   — % off the eligible subtotal
 *   - `free_shipping` (or `coupon.freeShipping = true` regardless of
 *     `discountType`) — discount equals the cart's shipping cost. Lets
 *     a single coupon zero out shipping whether the cart is below or
 *     above the $200 free-shipping threshold (above = the discount is
 *     just $0, the customer gets a "shipping already free" notice).
 */
function computeDiscount(coupon: Coupon, items: CartItemShape[]): number {
  // Free-shipping coupons short-circuit the subtotal-based math entirely.
  // The discount tracks the cart's actual shipping cost so the order
  // total ends up at (subtotal + cardFee) — exactly as if the customer
  // had hit the free-shipping threshold organically.
  if (coupon.freeShipping || coupon.discountType === "free_shipping") {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (subtotal <= 0) return 0;
    // If every line in the cart is a no-ship SKU (internal test
    // products, digital goods, etc.) shipping is already $0 — discount
    // is also 0. Same logic the checkout routes use.
    const allNoShipping = items.every(
      (i) => getProductBySlug(i.slug)?.noShipping === true,
    );
    return computeShippingCents(subtotal, allNoShipping);
  }

  const relevantItems =
    coupon.appliesTo && coupon.appliesTo.length > 0
      ? items.filter((i) => coupon.appliesTo!.includes(i.slug))
      : items;
  const eligibleSubtotal = relevantItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0,
  );
  if (eligibleSubtotal <= 0) return 0;

  if (coupon.discountType === "fixed_amount" && coupon.discountCents) {
    return Math.min(coupon.discountCents, eligibleSubtotal);
  }
  if (coupon.discountType === "percentage" && coupon.discountPercent) {
    return Math.round(eligibleSubtotal * (coupon.discountPercent / 100));
  }
  return 0;
}

/**
 * Mint a one-time, cart-specific recovery code for the stage-3 abandoned
 * cart email. Each code is unique (tied to the recovery token), limited
 * to 1 redemption, valid for 7 days. We generate just-in-time rather
 * than pre-seeding a pool, so codes never leak into the wild before
 * they're attached to a real follow-up email.
 *
 * Returns null if coupon creation fails — caller should fall back to
 * sending the email without a code rather than blocking the send.
 */
export async function generateRecoveryCoupon(opts: {
  recoveryToken: string; // cart's recovery token; we use a slice as code entropy
  discountPercent?: number; // default 5
  validDays?: number; // default 7
}): Promise<{ code: string; discountPercent: number } | null> {
  const discountPercent = opts.discountPercent ?? 5;
  const validDays = opts.validDays ?? 7;
  // First 10 chars of the hex recovery token → uppercase code suffix.
  // Recovery tokens are 64 hex chars so collisions are vanishingly rare;
  // the unique-index on `code` backstops anyway.
  const suffix = opts.recoveryToken.slice(0, 10).toUpperCase();
  const code = `COMEBACK${suffix}`;

  const now = new Date();
  const validUntil = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);

  try {
    await db.insert(coupons).values({
      code,
      description: `Abandoned-cart recovery (${discountPercent}% off)`,
      discountType: "percentage",
      discountPercent,
      maxRedemptions: 1,
      maxPerUser: 1,
      validFrom: now,
      validUntil,
      isActive: true,
    });
    return { code, discountPercent };
  } catch (err) {
    // Unique-constraint violation = the code was already generated for
    // this same token on a prior run (e.g. a cron retry). That's fine —
    // reuse it.
    const [existing] = await db
      .select({ code: coupons.code, discountPercent: coupons.discountPercent })
      .from(coupons)
      .where(eq(coupons.code, code))
      .limit(1);
    if (existing) {
      return { code: existing.code, discountPercent: existing.discountPercent ?? discountPercent };
    }
    console.warn("[coupons] generateRecoveryCoupon failed", err);
    return null;
  }
}

/**
 * Persist a redemption. Call this once an order's payment is confirmed
 * (e.g. from your payment processor's webhook). Bumps the coupon's
 * timesRedeemed counter too.
 *
 * Idempotent on `orderId`: if a redemption row already exists for the
 * order we no-op. This protects against:
 *   - A processor retrying its success webhook
 *   - Both a synchronous success branch and a late webhook firing for
 *     the same order
 *   - Any future replay path
 *
 * Wrapped in a transaction so we never count a redemption against a
 * coupon cap without the audit row existing (or vice versa).
 */
export async function recordCouponRedemption(args: {
  couponId: string;
  code: string;
  userId: string | null;
  orderId: string;
  discountAppliedCents: number;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: couponRedemptions.id })
      .from(couponRedemptions)
      .where(eq(couponRedemptions.orderId, args.orderId))
      .limit(1);
    if (existing) return;

    await tx.insert(couponRedemptions).values({
      couponId: args.couponId,
      code: args.code,
      userId: args.userId,
      orderId: args.orderId,
      discountAppliedCents: args.discountAppliedCents,
    });
    // Atomic counter bump under concurrent redemptions.
    await tx
      .update(coupons)
      .set({
        timesRedeemed: sql`${coupons.timesRedeemed} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(coupons.id, args.couponId));
  });
}
