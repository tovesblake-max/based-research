import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { catalogProducts } from "@/lib/products";
import { notifyAdminOfSale } from "@/lib/admin-notify";
import { z } from "zod";

/**
 * Admin-only endpoint to log a manual order — for paid-out-of-band
 * sales (Apple Pay, Cash App, Telegram-DM, wholesale wire transfer,
 * etc.) where the customer paid us directly and we just need to push
 * the order to the warehouse + record it for analytics.
 *
 * Replaces the one-off CLI scripts we used to write per-customer.
 *
 * Inputs:
 *   - email (string, required) — placeholder OK if we don't have one
 *   - shipping address fields
 *   - lineItems: [{ sku, quantity, unitPriceCents, productName?, size? }]
 *   - subtotalCents (optional — defaults to sum of line totals)
 *   - discountCents (optional — flat-dollar adjustment)
 *   - shippingCostCents (optional — defaults to 0; manual orders usually free)
 *   - totalCents (required — what the customer actually paid)
 *   - paymentGateway (string — apple_pay / cash_app / wire / venmo / other)
 *   - couponCode (optional — display label like "BIOCODE-T2")
 *   - notes (optional)
 *
 * The order is inserted with status='confirmed' + payment_status='completed'
 * since it's already paid. ShipStation will pull it on next poll.
 */

function generateOrderNumber(): string {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BR-${now}${rand}`;
}

const lineItemSchema = z.object({
  sku: z.string().min(1).max(50),
  productName: z.string().min(1).max(200),
  variantSize: z.string().max(100).default(""),
  productId: z.string().max(100).optional(),
  slug: z.string().max(100).optional(),
  quantity: z.number().int().min(1).max(999),
  unitPriceCents: z.number().int().min(0),
});

const bodySchema = z.object({
  email: z.string().min(3).max(255),
  shippingAddress: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    address1: z.string().min(1).max(255),
    address2: z.string().max(255).optional(),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(50),
    zip: z.string().min(1).max(20),
    country: z.string().max(50).default("US"),
  }),
  lineItems: z.array(lineItemSchema).min(1),
  subtotalCents: z.number().int().min(0).optional(),
  discountCents: z.number().int().min(0).default(0),
  shippingCostCents: z.number().int().min(0).default(0),
  totalCents: z.number().int().min(0),
  paymentGateway: z.string().min(1).max(20),
  couponCode: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    const json = await request.json();
    parsed = bodySchema.parse(json);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid payload", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const orderNumber = generateOrderNumber();
  const orderId = crypto.randomUUID();
  const now = new Date();

  // If admin didn't provide subtotal, compute from line items.
  const computedSubtotal = parsed.lineItems.reduce(
    (sum, it) => sum + it.unitPriceCents * it.quantity,
    0,
  );
  const subtotal = parsed.subtotalCents ?? computedSubtotal;

  // Look up canonical productId/slug for any line items that didn't provide
  // them — keeps the catalog connection clean for line items that match a
  // real SKU. Freeform SKUs (CJC w/DAC, BAC-10) just keep whatever was sent.
  const items = parsed.lineItems.map((it) => {
    let productId = it.productId;
    let slug = it.slug;
    if (!productId || !slug) {
      for (const p of catalogProducts) {
        const v = p.variants.find((v) => v.sku === it.sku);
        if (v) {
          productId = productId || p.id;
          slug = slug || p.slug;
          break;
        }
      }
    }
    return {
      id: crypto.randomUUID(),
      orderId,
      productId: productId || it.sku.toLowerCase(),
      productName: it.productName,
      variantSku: it.sku,
      variantSize: it.variantSize || "",
      slug: slug || it.sku.toLowerCase(),
      quantity: it.quantity,
      unitPrice: it.unitPriceCents,
      lineTotal: it.unitPriceCents * it.quantity,
      createdAt: now,
    };
  });

  await db.insert(orders).values({
    id: orderId,
    orderNumber,
    email: parsed.email,
    status: "confirmed",
    subtotal,
    shippingCost: parsed.shippingCostCents,
    discount: parsed.discountCents,
    total: parsed.totalCents,
    paymentStatus: "completed",
    paymentGateway: parsed.paymentGateway,
    couponCode: parsed.couponCode || null,
    notes: parsed.notes || `Manual order via admin — paid ${parsed.paymentGateway} out-of-band.`,
    shippingAddress: parsed.shippingAddress,
    fraudScore: 0,
    fraudSignals: [],
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(orderItems).values(items);

  console.log(`[Manual Order] Created ${orderNumber} for ${parsed.email} — total ${(parsed.totalCents / 100).toFixed(2)} via ${parsed.paymentGateway}`);

  // Admin SMS confirmation. Source-tagged "manual" so the operator can tell at
  // a glance these are out-of-band sales he keyed in (vs organic
  // checkouts) — useful when reconciling Apple Pay / Cash App receipts.
  notifyAdminOfSale(orderId, { source: "manual" });

  return NextResponse.json({
    success: true,
    orderNumber,
    orderId,
  });
}
