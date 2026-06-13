import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sharedCarts } from "@/lib/db/schema";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { getProductBySlug } from "@/lib/products";

// Public endpoint — the cart page hits this with the share slug to
// hydrate a customer's cart with the curated items the admin built.
// Increments redeem_count + sets first_redeemed_at on first hit so
// admin can see which links converted.
//
// Resolves each item against the live catalog so we always return
// fresh prices/sizes (the share row only stores slug + variantSku +
// quantity — never a stale price snapshot).
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  if (!slug || slug.length > 20) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(sharedCarts)
    .where(eq(sharedCarts.slug, slug.toLowerCase()))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Shared cart not found" }, { status: 404 });
  }

  // Bump redeem counters fire-and-forget — failures here shouldn't
  // block the customer from loading their cart. firstRedeemedAt only
  // sets on the very first hit thanks to the COALESCE.
  db.update(sharedCarts)
    .set({
      redeemCount: drizzleSql`${sharedCarts.redeemCount} + 1`,
      firstRedeemedAt: drizzleSql`COALESCE(${sharedCarts.firstRedeemedAt}, now())`,
    })
    .where(eq(sharedCarts.slug, slug.toLowerCase()))
    .catch((err) => console.warn("[shared-carts] redeem-count bump failed", err));

  // Resolve each saved item against the live catalog. Skip items whose
  // product/variant has been removed since the share was created
  // (returned in `unavailable` so the UI can warn the customer).
  const resolved: Array<{
    productId: string;
    productName: string;
    variantSku: string;
    variantSize: string;
    price: number;
    quantity: number;
    slug: string;
  }> = [];
  const unavailable: Array<{ slug: string; variantSku: string; reason: string }> = [];

  for (const item of row.items) {
    const product = getProductBySlug(item.slug);
    if (!product) {
      unavailable.push({ slug: item.slug, variantSku: item.variantSku, reason: "product no longer in catalog" });
      continue;
    }
    const variant = product.variants.find((v) => v.sku === item.variantSku);
    if (!variant) {
      unavailable.push({ slug: item.slug, variantSku: item.variantSku, reason: "variant no longer available" });
      continue;
    }
    resolved.push({
      productId: product.id,
      productName: product.name,
      variantSku: variant.sku,
      variantSize: variant.size,
      price: variant.price,
      quantity: item.quantity,
      slug: product.slug,
    });
  }

  return NextResponse.json({
    items: resolved,
    unavailable,
    notes: row.notes,
  });
}
