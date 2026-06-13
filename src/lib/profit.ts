// Profit / COGS computation helpers.
//
// Costs live on the Product variant (`costCents`) in src/lib/products.ts.
// At order time we don't snapshot the cost into order_items, so this
// module looks up cost-by-SKU from the live catalog. That's fine while
// supplier prices are stable; if cost-history accuracy becomes important
// (e.g. for accounting) we'd add an order_items.cost_cents column and
// snapshot at /api/checkout.
//
// "Profit" here means GROSS MARGIN ON GOODS SOLD — revenue from line
// items minus COGS. It does NOT subtract:
//   - Shipping the customer paid us (we charge a flat fee / free over
//     $200, but the carrier cost differs — usually less than the flat
//     fee, more on no-shipping-charge orders).
//   - Payment processing fees (these depend on whatever processor you
//     integrate; subtract them at the dashboard level if you need them).
// If the admin needs true net profit later, we'd subtract those at the
// dashboard level. For most decisions ("which products are most
// profitable?", "what's the day looking like?"), gross margin on goods
// is the right number to surface.

import { catalogProducts } from "./products";

// Build a SKU → cost map once at module init. Catalog changes require a
// redeploy anyway, so caching forever is safe.
let _skuCostMap: Map<string, number> | null = null;

function getSkuCostMap(): Map<string, number> {
  if (_skuCostMap) return _skuCostMap;
  const map = new Map<string, number>();
  for (const p of catalogProducts) {
    for (const v of p.variants) {
      if (typeof v.costCents === "number" && v.costCents > 0) {
        map.set(v.sku, v.costCents);
      }
    }
  }
  _skuCostMap = map;
  return map;
}

/**
 * Look up the per-unit cost for a variant SKU. Returns null if the SKU
 * isn't in the catalog OR the variant has no `costCents` field set —
 * callers should treat null as "cost unknown" and surface that to the
 * admin (rather than silently treating cost=0 as profit=revenue).
 */
export function getVariantCostCents(sku: string): number | null {
  const map = getSkuCostMap();
  return map.has(sku) ? map.get(sku)! : null;
}

export interface OrderProfitInput {
  variantSku: string;
  quantity: number;
  lineTotal: number; // cents — pre-order-discount line revenue (qty × unit_price)
}

export interface OrderProfit {
  /** Net revenue from goods — line-total sum MINUS the order-level
   *  discount. This is what we actually got from the customer for the
   *  goods (excludes shipping the customer paid us, excludes card
   *  processing fees we paid out). Going through an affiliate's $606 retail
   *  / $351 BioCode discount / $255 final example: revenue here is $255. */
  revenueCents: number;
  /** Pre-discount line-total sum, for transparency in the per-order panel. */
  grossRevenueCents: number;
  /** Order-level discount that was netted out of revenue. */
  discountCents: number;
  /** Sum of (cost × qty) for line items where cost is on file. */
  cogsCents: number;
  /** Revenue minus COGS. Negative is possible (heavy promo on a low-margin SKU). */
  profitCents: number;
  /** Margin %, rounded. Null when revenueCents = 0. */
  marginPct: number | null;
  /** True if any line item lacks a cost — signals the profit number is incomplete. */
  hasMissingCost: boolean;
  /** Detail per line for admin display. Line revenue is shown PRE-discount
   *  (so it matches what the customer saw on their receipt); the
   *  order-level discount is applied to the total revenue figure above. */
  lines: Array<{
    sku: string;
    quantity: number;
    revenueCents: number;
    unitCostCents: number | null;
    lineCostCents: number | null;
    lineProfitCents: number | null;
  }>;
}

export function computeOrderProfit(
  items: OrderProfitInput[],
  options: { discountCents?: number } = {},
): OrderProfit {
  const discount = options.discountCents ?? 0;
  let grossRevenue = 0;
  let cogs = 0;
  let missing = false;
  const lines: OrderProfit["lines"] = [];

  for (const item of items) {
    grossRevenue += item.lineTotal;
    const unitCost = getVariantCostCents(item.variantSku);
    if (unitCost == null) {
      missing = true;
      lines.push({
        sku: item.variantSku,
        quantity: item.quantity,
        revenueCents: item.lineTotal,
        unitCostCents: null,
        lineCostCents: null,
        lineProfitCents: null,
      });
      continue;
    }
    const lineCost = unitCost * item.quantity;
    cogs += lineCost;
    lines.push({
      sku: item.variantSku,
      quantity: item.quantity,
      revenueCents: item.lineTotal,
      unitCostCents: unitCost,
      lineCostCents: lineCost,
      lineProfitCents: item.lineTotal - lineCost,
    });
  }

  const revenue = grossRevenue - discount;
  const profit = revenue - cogs;
  const marginPct = revenue > 0 ? Math.round((profit / revenue) * 100) : null;

  return {
    revenueCents: revenue,
    grossRevenueCents: grossRevenue,
    discountCents: discount,
    cogsCents: cogs,
    profitCents: profit,
    marginPct,
    hasMissingCost: missing,
    lines,
  };
}
