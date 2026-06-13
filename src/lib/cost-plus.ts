/**
 * Cost-plus pricing helpers.
 *
 * When a user has `cost_plus_margin_cents` set on their row, every line
 * item in their cart is effectively priced at:
 *
 *     variant.costCents + cost_plus_margin_cents
 *
 * instead of the public retail price. The difference is surfaced as a
 * single auto-applied discount line so the cart UI doesn't have to be
 * re-plumbed to render two prices per item.
 *
 * Server is authoritative — the checkout APIs call computeCostPlusDiscountCents
 * with the freshly-read users.cost_plus_margin_cents at order-mint, so a
 * client that fakes a larger discount on its way in gets recomputed to the
 * real number before the order row lands.
 */

import { getProductBySlug } from "@/lib/products";

export interface CostPlusLineInput {
  slug: string;
  variantSku: string;
  quantity: number;
  /** Retail unit price as the client sees it. Used as a sanity check;
   *  the function ultimately ignores it and computes the real retail
   *  from the catalog (so a client passing fake retail can't widen
   *  the apparent discount). */
  retailPriceCents: number;
}

export interface CostPlusResult {
  /** Cents to subtract from the retail subtotal. >= 0. Zero when no
   *  variant in the cart has a costCents on file. */
  discountCents: number;
  /** True if the cart contains any variant we couldn't price. The caller
   *  should fail closed (do NOT apply the discount) if this flips true
   *  in a server-side path so we never under-charge for a missing-cost
   *  item by accident. */
  hasMissingCosts: boolean;
  /** Per-line breakdown for diagnostics + admin UI. */
  lines: Array<{
    slug: string;
    variantSku: string;
    quantity: number;
    retailUnitCents: number;
    costPlusUnitCents: number | null; // null when costCents missing
    lineDiscountCents: number; // 0 when costCents missing
  }>;
}

/**
 * Compute the cost-plus discount for a cart given the per-user margin.
 * Pure function — no DB calls — so it can be reused on client and server.
 * Resolves catalog data via getProductBySlug.
 *
 * marginCents semantics: the FLAT per-unit markup. e.g. marginCents=3000
 * means the customer pays variant.costCents + 3000 cents per unit. If the
 * computed cost-plus unit price would exceed retail (a tiny-margin product),
 * we cap the line discount at 0 — they never pay MORE than retail just
 * because cost-plus inverted on a low-margin SKU.
 */
export function computeCostPlusDiscountCents(
  items: CostPlusLineInput[],
  marginCents: number,
): CostPlusResult {
  if (!Number.isFinite(marginCents) || marginCents < 0) {
    return { discountCents: 0, hasMissingCosts: false, lines: [] };
  }

  let totalDiscount = 0;
  let hasMissingCosts = false;
  const lines: CostPlusResult["lines"] = [];

  for (const item of items) {
    const product = getProductBySlug(item.slug);
    const variant = product?.variants.find((v) => v.sku === item.variantSku);
    // Use the catalog retail not the client-supplied retail. Defensive.
    const retailUnitCents = variant?.price ?? item.retailPriceCents;

    if (!variant || typeof variant.costCents !== "number") {
      // No cost on file means we can't compute cost-plus for this line.
      // Discount 0 for the line, flag the cart as missing-cost so a
      // server-side caller can choose to fail closed.
      hasMissingCosts = true;
      lines.push({
        slug: item.slug,
        variantSku: item.variantSku,
        quantity: item.quantity,
        retailUnitCents,
        costPlusUnitCents: null,
        lineDiscountCents: 0,
      });
      continue;
    }

    const costPlusUnit = variant.costCents + marginCents;
    // Cap so the discount can never invert (charge more than retail).
    const lineDiscountPerUnit = Math.max(0, retailUnitCents - costPlusUnit);
    const lineDiscount = lineDiscountPerUnit * item.quantity;

    totalDiscount += lineDiscount;
    lines.push({
      slug: item.slug,
      variantSku: item.variantSku,
      quantity: item.quantity,
      retailUnitCents,
      costPlusUnitCents: costPlusUnit,
      lineDiscountCents: lineDiscount,
    });
  }

  return { discountCents: totalDiscount, hasMissingCosts, lines };
}

/**
 * Human-readable label rendered in the cart UI next to the auto-applied
 * discount. Kept short so it fits in the existing coupon-line layout.
 */
export const COST_PLUS_LABEL = "Insider pricing";
