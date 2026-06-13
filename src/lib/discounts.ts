/**
 * Volume Discount Configuration
 *
 * Edit the tiers below to change discount levels.
 * Each tier defines a minimum quantity and the percentage discount applied.
 * Tiers are evaluated from highest qty to lowest — the first match wins.
 *
 * Example: { minQty: 3, discountPercent: 5 } means "buy 3+, get 5% off each"
 */

export interface DiscountTier {
  minQty: number;
  discountPercent: number;
  /**
   * Optional product-slug whitelist. When set, the tier ONLY applies to
   * cart items whose slug is in the list. When omitted, the tier
   * applies to every product (the standard "global" volume tiers).
   *
   * Used to layer high-margin SKU-specific bulk deals on top of the
   * baseline ladder — e.g. BPC / GHK / GIP3 get an exclusive 40+
   * tier that other SKUs don't qualify for.
   */
  appliesTo?: string[];
}

// ──────────────────────────────────────────────
// EDIT THESE TIERS TO CHANGE DISCOUNT LEVELS
// ──────────────────────────────────────────────
export const volumeDiscountTiers: DiscountTier[] = [
  // Global ladder — every product
  { minQty: 3, discountPercent: 5 },
  { minQty: 5, discountPercent: 10 },
  { minQty: 10, discountPercent: 15 },
  // Bulk-buy tier on our highest-margin / highest-velocity SKUs.
  // Researchers running long-course studies hit 40+ vials regularly.
  {
    minQty: 40,
    discountPercent: 20,
    appliesTo: ["bpc-157", "ghk-cu", "glp3-rta"],
  },
  // Glow Blend has its own steeper 10+ tier — multi-component blend
  // economics let us discount harder at volume. This tier overrides
  // the global 10+ (15%) tier for Glow specifically; the tie-break
  // in `getActiveTier` prefers the higher discount when two tiers
  // share the same minQty.
  {
    minQty: 10,
    discountPercent: 35,
    appliesTo: ["glow-blend"],
  },
];

// ──────────────────────────────────────────────
// CART REWARD THRESHOLDS (in cents)
// ──────────────────────────────────────────────
export const FREE_SHIPPING_THRESHOLD = 20000; // $200
export const FLAT_SHIPPING_CENTS = 1500;      // $15 flat below threshold (whole-dollar policy 2026-05-16)
export const ACH_DISCOUNT_RATE = 0.05;        // 5% off subtotal for bank-transfer (ACH) orders
// Optional card processing fee — applied to (subtotal + shipping) only
// when the customer pays by card. Bank-transfer paths skip it.
//
// Kept at 3% deliberately: that's inside the major card networks' published
// surcharge caps, AND stays under the threshold where state-level
// "surcharge" statutes (CT/MA/PR) typically kick in — but we surface it as
// a "Processing Fee" in user-facing copy since that framing is safer.
export const CARD_PROCESSING_FEE_RATE = 0.03;
export const FREE_BAC_WATER_THRESHOLD = 40000; // $400

/**
 * Single source of truth for the shipping surcharge rule. Pass
 * `allNoShipping=true` for carts made entirely of no-ship SKUs
 * (internal test products, digital goods).
 */
export function computeShippingCents(
  subtotalCents: number,
  allNoShipping = false,
): number {
  if (allNoShipping) return 0;
  if (subtotalCents >= FREE_SHIPPING_THRESHOLD) return 0;
  return FLAT_SHIPPING_CENTS;
}

/**
 * Card processing fee on (subtotal + shipping), rounded to cents.
 * Returns 0 for bank-transfer (ACH) orders; card orders get the flat
 * CARD_PROCESSING_FEE_RATE surfaced as a customer-facing processing fee.
 */
export function computeCardProcessingFeeCents(
  subtotalCents: number,
  shippingCents: number,
  paymentMethod: "card" | "ach",
): number {
  if (paymentMethod === "ach") return 0;
  return Math.round((subtotalCents + shippingCents) * CARD_PROCESSING_FEE_RATE);
}

/**
 * Returns the subset of `volumeDiscountTiers` that apply to a given
 * product slug. Tiers without `appliesTo` are global; tiers with
 * `appliesTo` only return when their list contains the slug.
 *
 * Pass `undefined` to get only the global tiers (i.e. ignore any
 * product-specific bonus tiers).
 */
function tiersForSlug(slug?: string): DiscountTier[] {
  return volumeDiscountTiers.filter(
    (t) => !t.appliesTo || (slug !== undefined && t.appliesTo.includes(slug)),
  );
}

/**
 * Get the active discount tier for a given quantity.
 * Returns the best matching tier (highest minQty that the quantity meets).
 * Returns null if no discount applies.
 *
 * Pass the product slug to evaluate product-specific bonus tiers
 * (e.g. the 40+ BPC/GHK/GIP3 tier). Omit slug to evaluate only the
 * global ladder.
 */
export function getActiveTier(quantity: number, slug?: string): DiscountTier | null {
  const eligible = tiersForSlug(slug);
  // Sort by minQty desc, then by discountPercent desc as the tie-break.
  // The tie-break matters when a SKU-specific tier shares its minQty
  // with a global tier (e.g. Glow Blend's 10+/35% sits alongside the
  // global 10+/15%) — we want the better deal to win.
  const sorted = [...eligible].sort((a, b) => {
    if (b.minQty !== a.minQty) return b.minQty - a.minQty;
    return b.discountPercent - a.discountPercent;
  });
  return sorted.find((tier) => quantity >= tier.minQty) ?? null;
}

/**
 * Calculate the discounted unit price (in cents) for an item.
 * Returns the original price if no discount applies.
 */
export function getDiscountedPrice(basePrice: number, quantity: number, slug?: string): number {
  const tier = getActiveTier(quantity, slug);
  if (!tier) return basePrice;
  return Math.round(basePrice * (1 - tier.discountPercent / 100));
}

/**
 * Calculate the line total (in cents) for a cart item with volume discounts.
 */
export function getLineTotal(basePrice: number, quantity: number, slug?: string): number {
  return getDiscountedPrice(basePrice, quantity, slug) * quantity;
}

/**
 * Get display-ready volume tiers for a given base price.
 * Used in product detail pages and cart item displays. Returns the
 * tiers that apply to the given slug (global + product-specific).
 */
export function getVolumeTiersForPrice(basePrice: number, slug?: string) {
  // Collapse duplicate minQty rows — when a SKU-specific tier covers
  // the same threshold as a global one (Glow Blend has its own 10+
  // at 35% on top of the global 10+ at 15%), we only want one row
  // per qty in the discount-box ladder, and we prefer the better
  // deal so the customer sees what they'd actually get.
  const eligible = tiersForSlug(slug);
  const bestPerQty = new Map<number, DiscountTier>();
  for (const t of eligible) {
    const cur = bestPerQty.get(t.minQty);
    if (!cur || t.discountPercent > cur.discountPercent) {
      bestPerQty.set(t.minQty, t);
    }
  }
  return [...bestPerQty.values()]
    .sort((a, b) => a.minQty - b.minQty)
    .map((tier) => ({
      qty: tier.minQty,
      discount: tier.discountPercent,
      price: Math.round(basePrice * (1 - tier.discountPercent / 100)),
    }));
}
