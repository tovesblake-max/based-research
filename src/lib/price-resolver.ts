/**
 * Server-side price authority for checkout routes.
 *
 * The wire format that browsers POST to /api/checkout/* contains a
 * `price` field per cart item. We must never trust that field — a
 * scripted POST with price=1 would charge 1 cent for any product.
 *
 * `resolveCartItemPrices()` takes the client-supplied items and returns
 * the SAME items with `price` overridden by the canonical price from
 * the product catalog (matched on slug + variantSku). Items whose slug
 * or variantSku doesn't resolve are returned in `rejected` so the
 * caller can fail the checkout with a clear error.
 *
 * The bump-offer SKU has its own price source (`getBumpOffer()`) and
 * is resolved through that, not the catalog variant price (the bump
 * may be discounted vs. list).
 */

import { getProductBySlug } from "./products";
import { getBumpOffer, BUMP_OFFER_SLUG } from "./bump-offer";

export interface IncomingCartItem {
  productId: string;
  productName: string;
  variantSku: string;
  variantSize: string;
  price: number;
  quantity: number;
  slug: string;
}

export interface ResolvedCartItem extends IncomingCartItem {
  // Always equals the server-canonical price after resolution.
  price: number;
}

export interface PriceResolution {
  items: ResolvedCartItem[];
  rejected: Array<{ slug: string; variantSku: string; reason: string }>;
}

export function resolveCartItemPrices(
  incoming: IncomingCartItem[],
): PriceResolution {
  const items: ResolvedCartItem[] = [];
  const rejected: PriceResolution["rejected"] = [];

  for (const raw of incoming) {
    // Bump offer takes its price from the bump payload (which may be
    // discounted vs. the catalog list price). Variant SKU must match.
    if (raw.slug === BUMP_OFFER_SLUG) {
      const bump = getBumpOffer();
      if (!bump) {
        rejected.push({
          slug: raw.slug,
          variantSku: raw.variantSku,
          reason: "bump offer not currently available",
        });
        continue;
      }
      if (bump.sku !== raw.variantSku) {
        rejected.push({
          slug: raw.slug,
          variantSku: raw.variantSku,
          reason: `bump SKU ${raw.variantSku} does not match active bump SKU ${bump.sku}`,
        });
        continue;
      }
      items.push({
        ...raw,
        // Canonical bump price — never the client-supplied number.
        price: bump.bumpPriceCents,
        productName: bump.name,
      });
      continue;
    }

    // Standard catalog item — match on slug, then on variant SKU
    // within that product's variants list.
    const product = getProductBySlug(raw.slug);
    if (!product) {
      rejected.push({
        slug: raw.slug,
        variantSku: raw.variantSku,
        reason: "product not found in catalog (may have been hidden or removed)",
      });
      continue;
    }
    const variant = product.variants.find((v) => v.sku === raw.variantSku);
    if (!variant) {
      rejected.push({
        slug: raw.slug,
        variantSku: raw.variantSku,
        reason: `variant SKU not found on product ${raw.slug}`,
      });
      continue;
    }
    items.push({
      ...raw,
      // Canonical catalog price — never the client-supplied number.
      price: variant.price,
      // Refresh display fields too in case the client has stale data
      // (we recently renamed GIP3 etc.).
      productName: product.name,
      variantSize: variant.size,
    });
  }

  return { items, rejected };
}
