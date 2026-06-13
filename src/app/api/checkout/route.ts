import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { generateOrderNumber, gatedShippingAddressSchema } from "@/lib/checkout-shared";
import {
  getLineTotal,
  computeShippingCents,
  computeCardProcessingFeeCents,
} from "@/lib/discounts";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { scoreOrder } from "@/lib/fraud-score";
import { findRecentMatchingOrder } from "@/lib/duplicate-detection";
import { captureEvent } from "@/lib/posthog";
import { validateCoupon } from "@/lib/coupons";
import { resolveCartItemPrices } from "@/lib/price-resolver";
import { getProductBySlug } from "@/lib/products";
import { extractAcquisition } from "@/lib/acquisition-server";
import {
  claimIdempotencyKey,
  recordIdempotentResponse,
  isValidIdempotencyKey,
} from "@/lib/idempotency";

/**
 * Checkout — order creation.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  PAYMENT INTEGRATION POINT                                         │
 * │                                                                    │
 * │  This template ships WITHOUT a payment processor. This route does  │
 * │  everything up to (but not including) charging the customer:       │
 * │  it authenticates, re-prices the cart server-side, applies         │
 * │  coupons + per-user pricing, runs fraud scoring + duplicate        │
 * │  detection, and writes a `pending` / `unpaid` order row.           │
 * │                                                                    │
 * │  To accept money, wire your processor where marked below:          │
 * │    1. Create a charge / checkout session for `order.total`.        │
 * │    2. Stamp the provider id on the order (`paymentReference`) and  │
 * │       set `paymentGateway` to the provider name.                   │
 * │    3. Confirm payment via the provider's webhook, then flip        │
 * │       paymentStatus → "completed" and run fulfillment.             │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * The order number is both the customer-facing reference and the natural
 * idempotency key to hand your processor.
 */

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        productName: z.string(),
        variantSku: z.string(),
        variantSize: z.string(),
        price: z.number(),
        quantity: z.number().min(1),
        slug: z.string(),
      }),
    )
    .min(1),
  shippingAddress: gatedShippingAddressSchema,
  bumpShown: z.boolean().optional(),
  couponCode: z.string().min(1).max(50).optional(),
  // Client-generated idempotency key — protects against double-submit.
  idempotencyKey: z.string().regex(/^[a-fA-F0-9-]{16,64}$/).optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!(await rateLimit(`checkout:${ip}`, 60, 15 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const user = await requireAuth();

    if (!(await rateLimit(`checkout:user:${user.id}`, 30, 15 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Too many checkout attempts. Please wait a few minutes." },
        { status: 429 },
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "Please add your email before checking out" },
        { status: 400 },
      );
    }
    const userEmail: string = user.email;

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { items: rawItems, shippingAddress, bumpShown, couponCode, idempotencyKey } = parsed.data;

    // ── Idempotency gate ──
    // Double-clicks on the submit button + automatic retries (network
    // blips, mobile background-tab churn) all replay the same client-
    // generated UUID. Without this, each replay would mint a new order.
    // Fail-open on KV unavailability — better one rare double-order than
    // blocking every checkout during a KV outage.
    if (idempotencyKey && !isValidIdempotencyKey(idempotencyKey)) {
      return NextResponse.json({ error: "Invalid idempotency key format" }, { status: 400 });
    }
    const idempScope = `checkout:${user.id}`;
    let trackIdemp = false;
    if (idempotencyKey) {
      const claim = await claimIdempotencyKey(idempScope, idempotencyKey);
      if (claim.kind === "cached") {
        return NextResponse.json(claim.body, { status: claim.status });
      }
      if (claim.kind === "inflight") {
        return NextResponse.json(
          { error: "Your order is already being processed. Please wait a moment." },
          { status: 409 },
        );
      }
      trackIdemp = claim.kind === "first";
    }

    // Server-side price authority — never trust client `price` values.
    const resolution = resolveCartItemPrices(rawItems);
    if (resolution.rejected.length > 0) {
      console.warn("[Checkout] price resolution rejected items", {
        rejected: resolution.rejected,
      });
      return NextResponse.json(
        {
          error: `Some items in your cart are no longer available: ${resolution.rejected.map((r) => r.slug).join(", ")}. Please refresh your cart and try again.`,
        },
        { status: 400 },
      );
    }
    const items = resolution.items;

    const subtotal = items.reduce(
      (sum, item) => sum + getLineTotal(item.price, item.quantity, item.slug),
      0,
    );
    const allNoShipping = items.every(
      (i) => getProductBySlug(i.slug)?.noShipping === true,
    );
    const shippingCost = allNoShipping ? 0 : computeShippingCents(subtotal);
    const cardProcessingFee = computeCardProcessingFeeCents(subtotal, shippingCost, "card");

    let couponResult: Awaited<ReturnType<typeof validateCoupon>> | null = null;
    let couponDiscount = 0;
    if (couponCode) {
      couponResult = await validateCoupon(
        couponCode,
        items.map((i) => ({ slug: i.slug, price: i.price, quantity: i.quantity })),
        user.id,
      );
      if (couponResult.valid) {
        couponDiscount = couponResult.discountCents;
      }
    }

    // Per-user cost-plus / insider pricing. When the customer's user row
    // has costPlusMarginCents set, every line item gets repriced server-
    // side as (variant.costCents + margin) and we apply the difference as
    // an additional discount on top of any explicit coupon.
    let costPlusDiscount = 0;
    if (typeof user.costPlusMarginCents === "number" && user.costPlusMarginCents >= 0) {
      const { computeCostPlusDiscountCents } = await import("@/lib/cost-plus");
      const result = computeCostPlusDiscountCents(
        items.map((i) => ({
          slug: i.slug,
          variantSku: i.variantSku,
          quantity: i.quantity,
          retailPriceCents: i.price,
        })),
        user.costPlusMarginCents,
      );
      // Fail-closed: if any cart line lacks a costCents on file, skip the
      // discount entirely.
      if (!result.hasMissingCosts) {
        costPlusDiscount = result.discountCents;
      }
    }

    const total = Math.max(
      0,
      subtotal + shippingCost + cardProcessingFee - couponDiscount - costPlusDiscount,
    );
    const orderNumber = generateOrderNumber();

    // ── DUPLICATE-ORDER PREVENTION ──────────────────────────────
    // Block creation if this user already placed an identical-cart order
    // in the last 5 minutes — regardless of payment status. Protects
    // against a missed confirmation leading the customer to re-submit.
    const recentMatch = await findRecentMatchingOrder({
      userId: user.id,
      email: userEmail,
      items: items.map((i) => ({ sku: i.variantSku, qty: i.quantity })),
    });
    if (recentMatch) {
      console.warn("[Checkout] blocked duplicate submit", {
        userId: user.id,
        existing: recentMatch.orderNumber,
        existingStatus: recentMatch.paymentStatus,
        secondsAgo: Math.round((Date.now() - recentMatch.createdAt.getTime()) / 1000),
      });
      return NextResponse.json(
        {
          error: `You just placed an order with these same items (${recentMatch.orderNumber}). If you genuinely meant to place a second order, wait 5 minutes and try again.`,
          existingOrderNumber: recentMatch.orderNumber,
          redirectTo: `/checkout/callback?order_number=${recentMatch.orderNumber}`,
        },
        { status: 409 },
      );
    }

    // Pre-order fraud scoring.
    const fraud = await scoreOrder({
      userId: user.id,
      email: userEmail,
      ip,
      orderTotalCents: total,
      shippingState: shippingAddress.state,
      shippingCountry: shippingAddress.country,
      ipCountry: request.headers.get("x-vercel-ip-country"),
    }).catch(() => null);

    if (fraud && fraud.score >= 85) {
      console.warn("[fraud-block]", {
        userId: user.id,
        score: fraud.score,
        signals: fraud.signals,
      });
      captureEvent({
        distinctId: user.id,
        event: "checkout_fraud_blocked",
        properties: {
          score: fraud.score,
          signals: fraud.signals,
          totalCents: total,
        },
      }).catch((err) => console.warn("[Checkout] fraud-block PostHog capture failed", err));
      return NextResponse.json(
        { error: "Your order could not be processed at this time. Please contact support." },
        { status: 402 },
      );
    }

    // Create the order row as pending / unpaid.
    const [order] = await db.transaction(async (tx) => {
      const [newOrder] = await tx
        .insert(orders)
        .values({
          orderNumber,
          userId: user.id,
          email: userEmail,
          customerPhone: user.phone || null,
          status: "pending",
          paymentStatus: "unpaid",
          subtotal,
          shippingCost,
          // Combined discount = explicit coupon + per-user cost-plus override.
          discount: couponDiscount + costPlusDiscount,
          cardSurcharge: cardProcessingFee,
          total,
          shippingAddress,
          fraudScore: fraud?.score ?? null,
          fraudSignals: fraud?.signals ?? null,
          bumpShown: bumpShown === true,
          couponId: couponResult?.valid ? couponResult.couponId : null,
          couponCode: couponResult?.valid ? couponResult.code : null,
          referralAffiliateId:
            couponResult?.valid && couponResult.affiliateId
              ? couponResult.affiliateId
              : null,
          // First-touch acquisition attribution (utm_*, landing_path, ...).
          ...extractAcquisition(body),
        })
        .returning();

      await tx.insert(orderItems).values(
        items.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          productName: item.productName,
          variantSku: item.variantSku,
          variantSize: item.variantSize,
          slug: item.slug,
          quantity: item.quantity,
          unitPrice: item.price,
          lineTotal: getLineTotal(item.price, item.quantity, item.slug),
        })),
      );

      return [newOrder];
    });

    captureEvent({
      distinctId: user.id,
      event: "checkout_order_created",
      properties: {
        order_number: orderNumber,
        total_cents: total,
        item_count: items.length,
        coupon_code: order.couponCode ?? null,
      },
    }).catch(() => { /* analytics never blocks checkout */ });

    // ── WIRE YOUR PAYMENT PROCESSOR HERE ────────────────────────
    // Create a charge / hosted-checkout session for `order.total`, stamp
    // the provider id on the order, and return whatever the client needs
    // to complete payment (a redirect URL, a client secret, etc.).
    //
    // This template returns `paymentConfigured: false`; the checkout UI
    // shows a placeholder and the order stays `unpaid` until you confirm
    // payment via your processor's webhook and run fulfillment.
    const successBody = {
      orderNumber,
      orderId: order.id,
      total,
      paymentConfigured: false,
    };

    // Cache the response so a double-submit returns the same order instead
    // of minting a new one.
    if (trackIdemp && idempotencyKey) {
      await recordIdempotentResponse(idempScope, idempotencyKey, 200, successBody);
    }

    return NextResponse.json(successBody, { status: 200 });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Please sign in to checkout" }, { status: 401 });
    }
    console.error("[Checkout]", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
