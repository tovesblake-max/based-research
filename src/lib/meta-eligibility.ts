/**
 * "Is this product in our Meta product feed?"
 *
 * Single source of truth for the filter that decides whether a given
 * SKU / slug appears in /api/gmc/feed.xml. Imported by:
 *
 *   - The feed itself (so the catalog Meta pulls only contains eligible items)
 *   - Every pixel / CAPI call site (so we don't fire events for products
 *     Meta's catalog doesn't know about — every such event becomes a
 *     "Catalog match rate" miss and tanks the dashboard metric)
 *
 * Keep both ends in sync via this module. If a product is in the feed
 * but not eligible here, Meta over-counts misses. If a product is
 * eligible here but not in the feed, the catalog over-charges itself
 * with policy-flagged compounds.
 *
 * Two reasons a product gets excluded:
 *
 *   1. Restricted compounds (GLP-1s) — Meta's commerce policy hard-bans
 *      these for ads. Adding them to the catalog risks the entire
 *      catalog being flagged. We deliberately exclude them from the
 *      feed AND suppress their pixel events.
 *
 *   2. upsellOnly products — accessories (syringes, swabs, BAC water)
 *      and hidden-from-shop SKUs that we don't want appearing as ad
 *      surfaces. They're addressable via cart actions but not
 *      surfaced in the catalog/sitemap/shop.
 */
import { getProductBySlug } from "./products";

export const RESTRICTED_META_SLUGS = new Set<string>([
  "glp3-rta",      // masked retatrutide
  "semaglutide",   // GLP-1 (banned for Meta ads)
  "tirzepatide",   // GIP/GLP-1 (banned for Meta ads)
  "cagrilintide",  // amylin analog (gets policy-flagged with the GLP-1s)
]);

export function isInMetaCatalog(slug: string | null | undefined): boolean {
  if (!slug) return false;
  if (RESTRICTED_META_SLUGS.has(slug)) return false;
  const product = getProductBySlug(slug);
  if (!product) return false;          // unknown slug → not eligible
  if (product.upsellOnly) return false; // hidden / accessory SKU
  return true;
}

/**
 * Filter an array of catalog-shape items down to just the ones in the
 * Meta catalog. Use this before passing a multi-item array to any
 * pixel / CAPI helper that emits content_ids — it preserves the order
 * of eligible items and drops the ones Meta's catalog can't match.
 *
 * Returns a NEW array; doesn't mutate the input.
 */
export function filterMetaEligible<T extends { slug?: string | null }>(
  items: T[],
): T[] {
  return items.filter((i) => isInMetaCatalog(i.slug ?? null));
}
