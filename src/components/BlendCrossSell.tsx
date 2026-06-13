"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Sparkles, ShoppingBag } from "lucide-react";
import Button from "@/components/Button";
import { useCart } from "@/components/CartProvider";
import { useCurrencySubscription } from "@/components/CurrencyProvider";
import { Product, ProductVariant, getProductBySlug } from "@/lib/products";
import { formatPriceShort } from "@/lib/utils";

/**
 * Blend cross-sell module on single-peptide PDPs.
 *
 * For products that have a corresponding multi-component blend (e.g.
 * BPC-157 → BPC+TB blend AND Glow Blend, Ipamorelin → CJC+Ipa blend AND
 * Tesa+Ipa blend), surface every applicable blend as a "researchers
 * studying X often combine with Y — get the blend for less than the
 * singles" upsell. One card per blend, stacked.
 *
 * Math is computed live from the product catalog at render time, so a
 * price change on either the singles or the blend automatically updates
 * the savings line. No hardcoded prices in the component.
 *
 * Per-constituent variant index is explicit because some blends (Glow)
 * use larger sizes than the constituent's smallest variant — we need to
 * compare BPC-157 10mg ($90) not BPC-157 5mg ($45) against the Glow
 * Blend's 10mg-of-BPC component.
 *
 * A card is hidden when:
 *   - The blend or its constituents are missing from the catalog
 *   - The blend is upsellOnly (hidden from public catalog)
 *   - Computed savings is ≤ 0 (no point showing if singles are cheaper)
 */

type BlendConstituent = {
  slug: string;
  // Index into the constituent product's variants array. Defaults to 0
  // (smallest size). Set to 1+ when the blend uses a larger size of the
  // constituent so the singles math compares apples-to-apples.
  variantIndex?: number;
};

type BlendMapping = {
  blendSlug: string;
  constituents: BlendConstituent[];
  // Index into the blend product's variants array — usually 0, but for
  // blends with multiple sizes we may want to compare against a
  // specific tier.
  blendVariantIndex?: number;
};

// Map: single-peptide slug → list of every blend it appears in. A
// product can map to multiple blends (e.g. BPC-157 is in both the
// BPC+TB blend and the Glow Blend) — we render one card per blend.
//
// To add a new mapping:
//   1. Pick the single-peptide slug
//   2. Add an entry with the blend's slug + each constituent's slug
//      and (if the blend uses a larger size) the right variantIndex
const BLEND_CROSS_SELL: Record<string, BlendMapping[]> = {
  "bpc-157": [
    {
      blendSlug: "bpc-157-tb-500-blend",
      // Default 5mg/5mg variant of the blend → compare against 5mg of
      // each single (variants[0]).
      constituents: [{ slug: "bpc-157" }, { slug: "tb-500" }],
    },
    {
      blendSlug: "glow-blend",
      // Glow Blend = 10mg BPC + 10mg TB + 50mg GHK → compare against
      // BPC 10mg (variant 1), TB 10mg (variant 1), GHK 50mg (variant 0).
      constituents: [
        { slug: "bpc-157", variantIndex: 1 },
        { slug: "tb-500", variantIndex: 1 },
        { slug: "ghk-cu" },
      ],
    },
    {
      blendSlug: "klow-blend",
      // Klow Blend = 50mg GHK + 10mg KPV + 10mg BPC + 10mg TB. Same
      // BPC/TB/GHK variants as Glow plus KPV. KPV variants[0] is 10mg.
      constituents: [
        { slug: "ghk-cu" },
        { slug: "kpv" },
        { slug: "bpc-157", variantIndex: 1 },
        { slug: "tb-500", variantIndex: 1 },
      ],
    },
  ],
  "tb-500": [
    {
      blendSlug: "bpc-157-tb-500-blend",
      constituents: [{ slug: "bpc-157" }, { slug: "tb-500" }],
    },
    {
      blendSlug: "glow-blend",
      constituents: [
        { slug: "bpc-157", variantIndex: 1 },
        { slug: "tb-500", variantIndex: 1 },
        { slug: "ghk-cu" },
      ],
    },
    {
      blendSlug: "klow-blend",
      constituents: [
        { slug: "ghk-cu" },
        { slug: "kpv" },
        { slug: "bpc-157", variantIndex: 1 },
        { slug: "tb-500", variantIndex: 1 },
      ],
    },
  ],
  "cjc-1295-no-dac": [
    {
      blendSlug: "cjc-1295-ipamorelin-blend",
      constituents: [{ slug: "cjc-1295-no-dac" }, { slug: "ipamorelin" }],
    },
  ],
  "cjc-1295-with-dac": [
    {
      blendSlug: "cjc-1295-with-dac-ipamorelin-blend",
      constituents: [{ slug: "cjc-1295-with-dac" }, { slug: "ipamorelin" }],
    },
  ],
  ipamorelin: [
    {
      blendSlug: "cjc-1295-ipamorelin-blend",
      constituents: [{ slug: "cjc-1295-no-dac" }, { slug: "ipamorelin" }],
    },
    {
      blendSlug: "cjc-1295-with-dac-ipamorelin-blend",
      constituents: [{ slug: "cjc-1295-with-dac" }, { slug: "ipamorelin" }],
    },
    {
      blendSlug: "tesamorelin-ipamorelin-blend",
      constituents: [{ slug: "tesamorelin" }, { slug: "ipamorelin" }],
    },
  ],
  tesamorelin: [
    {
      blendSlug: "tesamorelin-ipamorelin-blend",
      constituents: [{ slug: "tesamorelin" }, { slug: "ipamorelin" }],
    },
  ],
  "ghk-cu": [
    {
      blendSlug: "glow-blend",
      constituents: [
        { slug: "bpc-157", variantIndex: 1 },
        { slug: "tb-500", variantIndex: 1 },
        { slug: "ghk-cu" },
      ],
    },
    {
      blendSlug: "klow-blend",
      constituents: [
        { slug: "ghk-cu" },
        { slug: "kpv" },
        { slug: "bpc-157", variantIndex: 1 },
        { slug: "tb-500", variantIndex: 1 },
      ],
    },
  ],
  // KPV is unique to Klow Blend (no other multi-component product in
  // the catalog includes it). Surface Klow as the only blend cross-sell.
  kpv: [
    {
      blendSlug: "klow-blend",
      constituents: [
        { slug: "ghk-cu" },
        { slug: "kpv" },
        { slug: "bpc-157", variantIndex: 1 },
        { slug: "tb-500", variantIndex: 1 },
      ],
    },
  ],
};

/**
 * Lightweight lookup used by the inline "Looking for the X Blend?"
 * pills near the top of the PDP. Returns just the slug + name of every
 * applicable blend, filtering out hidden (upsellOnly) blends.
 *
 * Intentionally does NOT compute savings — the pills are a navigation
 * affordance, not a savings sell. The full BlendCrossSell card lower on
 * the page does the math.
 */
export function getBlendsForProduct(
  productSlug: string,
): Array<{ slug: string; name: string }> {
  const mappings = BLEND_CROSS_SELL[productSlug];
  if (!mappings) return [];
  return mappings
    .map((m) => getProductBySlug(m.blendSlug))
    .filter((p): p is Product => !!p && !p.upsellOnly)
    .map((p) => ({ slug: p.slug, name: p.name }));
}

interface Props {
  product: Product;
}

export default function BlendCrossSell({ product }: Props) {
  useCurrencySubscription(); // re-render on USD <-> COP toggle
  const { addItem } = useCart();

  // Resolve every applicable blend for this product. Returns an array
  // of { blend, blendVariant, constituents-with-chosen-variant, totals }
  // entries — empty array means nothing to render.
  const data = useMemo(() => {
    const mappings = BLEND_CROSS_SELL[product.slug];
    if (!mappings || mappings.length === 0) return [];

    return mappings
      .map((mapping) => {
        const blend = getProductBySlug(mapping.blendSlug);
        if (!blend?.variants?.length) return null;
        // Don't cross-sell to a hidden blend even if it's mapped — the
        // PDP at /product/[hidden-slug] returns 404, so the link would
        // break.
        if (blend.upsellOnly) return null;

        const blendVariant = blend.variants[mapping.blendVariantIndex ?? 0];
        if (!blendVariant) return null;

        // Resolve each constituent to (product, chosen variant). Drop
        // the whole mapping if any constituent or its requested variant
        // is missing — better to render nothing than render broken math.
        const constituents = mapping.constituents
          .map((c) => {
            const p = getProductBySlug(c.slug);
            const variant = p?.variants[c.variantIndex ?? 0];
            if (!p || !variant) return null;
            return { product: p, variant };
          })
          .filter(
            (c): c is { product: Product; variant: ProductVariant } => !!c,
          );
        if (constituents.length !== mapping.constituents.length) return null;

        const singlesTotal = constituents.reduce(
          (sum, c) => sum + c.variant.price,
          0,
        );
        const savings = singlesTotal - blendVariant.price;
        if (savings <= 0) return null;

        const savingsPct = Math.round((savings / singlesTotal) * 100);

        return {
          blend,
          blendVariant,
          constituents,
          singlesTotal,
          savings,
          savingsPct,
        };
      })
      .filter(
        (
          d,
        ): d is {
          blend: Product;
          blendVariant: ProductVariant;
          constituents: { product: Product; variant: ProductVariant }[];
          singlesTotal: number;
          savings: number;
          savingsPct: number;
        } => !!d,
      );
  }, [product.slug]);

  if (data.length === 0) return null;

  return (
    <section className="mt-12 space-y-6" aria-label="Blend cross-sell">
      {data.map((d) => {
        const {
          blend,
          blendVariant,
          constituents,
          singlesTotal,
          savings,
          savingsPct,
        } = d;
        return (
          <div
            key={blend.slug}
            className="bg-gradient-to-br from-secondary/5 via-card to-card rounded-2xl border border-secondary/30 overflow-hidden"
          >
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles
                  className="w-4 h-4 text-secondary"
                  aria-hidden="true"
                />
                <p className="text-xs font-semibold text-secondary tracking-widest uppercase">
                  Researchers studying {product.name} often combine
                </p>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl text-foreground leading-tight mb-2">
                Save {formatPriceShort(savings)} with the {blend.name}
              </h2>
              <p className="text-sm text-muted leading-relaxed mb-5">
                All {constituents.length} compounds in a single lyophilized
                vial. Pre-blended at researcher-validated ratios for in-vitro
                co-incubation studies — no separate reconstitutions to manage.
              </p>

              {/* Singles vs. blend math */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-4 items-stretch">
                {/* Singles column */}
                <div className="bg-background/50 rounded-xl border border-border p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
                    Buying singles
                  </p>
                  <ul className="space-y-1 mb-3">
                    {constituents.map((c) => (
                      <li
                        key={c.product.slug}
                        className="flex justify-between text-xs text-muted"
                      >
                        <span className="truncate pr-2">
                          {c.product.name} {c.variant.size}
                        </span>
                        <span className="tabular-nums">
                          {formatPriceShort(c.variant.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between text-sm font-semibold text-foreground pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {formatPriceShort(singlesTotal)}
                    </span>
                  </div>
                </div>

                {/* vs */}
                <div className="hidden sm:flex items-center justify-center">
                  <span className="text-xs font-medium text-muted uppercase tracking-wider rotate-[-6deg]">
                    vs.
                  </span>
                </div>

                {/* Blend column — primary visual weight */}
                <div className="bg-secondary/5 rounded-xl border-2 border-secondary/40 p-4 relative">
                  <span className="absolute -top-2.5 right-3 bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Save {savingsPct}%
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary mb-2">
                    {blend.name}
                  </p>
                  <p className="text-xs text-muted mb-3 truncate">
                    {blendVariant.size}
                  </p>
                  <div className="flex justify-between text-sm font-semibold text-foreground pt-2 border-t border-secondary/30">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {formatPriceShort(blendVariant.price)}
                    </span>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => addItem(blend, blendVariant, 1)}
                >
                  <ShoppingBag
                    className="w-4 h-4 mr-2"
                    aria-hidden="true"
                  />
                  Add the blend — save {formatPriceShort(savings)}
                </Button>
                <Link
                  href={`/product/${blend.slug}`}
                  className="flex-shrink-0"
                >
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full sm:w-auto"
                  >
                    View blend details
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
