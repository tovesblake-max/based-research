// Bump offer configuration — single source of truth for which SKU is the
// current bump, how it's priced, and which messaging it gets. Swapping the
// bump product at a later date means editing this file, not hunting for
// strings across the checkout UI.

import { getProductBySlug } from "./products";
import { getProductImagePath } from "./product-images";

// Bumped from the storage fridge (low attach rate, high price barrier)
// to bacteriostatic water on 2026-05-03 — every reconstituted-peptide
// buyer needs it, and at $20 the friction to add is near-zero.
export const BUMP_OFFER_SLUG = "bacteriostatic-water";
export const BUMP_OFFER_SKU = "BAC-10";

// Optional discount applied to the normal catalog price when the user takes
// the bump. 0 = sell at list price; 0.15 = 15% off. Keep this conservative —
// the conversion win on a bump is usually the convenience, not the discount.
export const BUMP_OFFER_DISCOUNT_PERCENT = 0;

export interface BumpOfferPayload {
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  imageSrc: string;
  listPriceCents: number;
  bumpPriceCents: number;
}

/**
 * Resolve the current bump offer from the product catalog. Returns null
 * if the underlying product was removed or is unavailable for any reason,
 * which safely hides the UI.
 */
export function getBumpOffer(): BumpOfferPayload | null {
  // Master kill-switch. Set NEXT_PUBLIC_BUMP_OFFER_DISABLED=true (or
  // flip the literal default below to true) to hide the bump everywhere
  // without touching the call sites — every UI render path already
  // checks `if (!bumpOffer)`, so returning null here hides it cleanly.
  // DISABLED 2026-05-21 — bac-water hidden from customer-facing surfaces
  // as part of the research-only compliance posture. Re-enable here ONLY
  // if you swap BUMP_OFFER_SLUG to a SKU that fits the research-use lane.
  const DISABLED_BY_DEFAULT = true;
  const envDisabled = process.env.NEXT_PUBLIC_BUMP_OFFER_DISABLED === "true";
  const envEnabled = process.env.NEXT_PUBLIC_BUMP_OFFER_DISABLED === "false";
  const disabled = envEnabled ? false : envDisabled || DISABLED_BY_DEFAULT;
  if (disabled) return null;

  const p = getProductBySlug(BUMP_OFFER_SLUG);
  if (!p) return null;
  const variant = p.variants[0];
  if (!variant) return null;

  const listPriceCents = variant.price;
  const bumpPriceCents = Math.round(listPriceCents * (1 - BUMP_OFFER_DISCOUNT_PERCENT));

  return {
    slug: p.slug,
    sku: variant.sku,
    name: p.name,
    // Intentionally distinct from p.description — bump copy needs to be
    // scannable in the 3-second attention window on a checkout page.
    shortDescription:
      "10mL USP-grade sterile water for reconstituting your lyophilized peptides — required for any vial that ships dry.",
    imageSrc: getProductImagePath(p.slug),
    listPriceCents,
    bumpPriceCents,
  };
}
