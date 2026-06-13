"use client";

import { getActiveTier, getDiscountedPrice, getLineTotal } from "@/lib/discounts";
import { TrendingDown } from "lucide-react";
import { useCurrencySubscription, useCurrency } from "@/components/CurrencyProvider";

/**
 * Interactive volume-discount calculator on the PDP. Replaces the static
 * "Buy 3+ for $39.90 each, save 5%" tier list with a slider that lets
 * researchers see exactly what their order math looks like at any
 * quantity — and rebuild trust in the volume tiers by making them
 * legible at a glance.
 *
 * Two-way binding to the PDP's quantity state: drag the slider, the
 * Add to Cart quantity input updates. Type into the quantity input,
 * the slider follows. Single source of truth lives in the parent.
 *
 * Tier breakpoints are read from the same `getActiveTier` helper that
 * `discounts.ts` uses everywhere else, so the math the customer sees
 * here matches what they pay at checkout exactly.
 */

interface Props {
  /** Cents — the variant's full price before any volume discount. */
  basePrice: number;
  /** Product slug — passed to discount logic for SKU-specific tiers (BPC/GHK/Glow). */
  slug: string;
  /** All visible tiers for this SKU, computed by `getVolumeTiersForPrice`. */
  tiers: Array<{ qty: number; discount: number; price: number }>;
  /** Current quantity from the PDP's parent state. */
  quantity: number;
  /** Setter so the slider can move the parent's quantity. */
  onQuantityChange: (qty: number) => void;
}

// Slider top end. Pick something past the highest tier so users can
// see the bulk-buy savings curve without typing into the qty input.
const SLIDER_MAX = 50;

// Currency-aware formatter. USD path keeps the locale-grouped dollar
// rendering ($1,344) used for big bulk totals. COP path defers to the
// shared utils so the rate + ceil-rounding stays consistent with
// every other price on the site.
function fmtMoney(cents: number, currency: "USD" | "COP"): string {
  if (currency === "COP") {
    // Mirror the lib/utils ceil-to-1000 logic so the COP value here
    // matches what the cart and PDP show for the same cents.
    const cop = Math.ceil((cents / 100) * 3700 / 1000) * 1000;
    return `$${cop.toLocaleString("en-US")} COP`;
  }
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export default function VolumeCalculator({
  basePrice,
  slug,
  tiers,
  quantity,
  onQuantityChange,
}: Props) {
  useCurrencySubscription(); // re-render on USD <-> COP toggle
  const { currency } = useCurrency();
  // Clamp to the slider range — don't let the slider stop at 999 just
  // because the user typed it into the qty input.
  const sliderQty = Math.min(quantity, SLIDER_MAX);

  const tier = getActiveTier(quantity, slug);
  const unitPrice = getDiscountedPrice(basePrice, quantity, slug);
  const total = getLineTotal(basePrice, quantity, slug);
  const fullTotal = basePrice * quantity;
  const savings = fullTotal - total;

  // Position percent for slider marks (qty 1 = 0%, qty SLIDER_MAX = 100%).
  // Returned as a string with a `%` suffix so it can drop straight into
  // CSS `left:` / `width:`.
  const pct = (q: number) => `${Math.max(0, Math.min(100, ((q - 1) / (SLIDER_MAX - 1)) * 100))}%`;
  const fillPct = pct(sliderQty);

  return (
    <div className="mt-5 p-5 sm:p-6 bg-gradient-to-br from-card to-accent/40 rounded-2xl border border-border/60 shadow-sm">
      {/* ── Headline row ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl sm:text-[2rem] font-bold text-foreground tabular-nums tracking-tight leading-none">
              {fmtMoney(total, currency)}
            </span>
            {tier && savings > 0 && (
              <span className="text-sm text-muted/80 line-through tabular-nums">
                {fmtMoney(fullTotal, currency)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-2 tabular-nums">
            {quantity} {quantity === 1 ? "vial" : "vials"} × {fmtMoney(unitPrice, currency)} each
          </p>
        </div>

        {tier && savings > 0 ? (
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success text-white text-[11px] font-semibold tabular-nums shadow-sm">
              <TrendingDown className="w-3 h-3" aria-hidden="true" strokeWidth={2.5} />
              {tier.discountPercent}% OFF
            </span>
            <span className="text-xs text-success font-medium tabular-nums">
              Save {fmtMoney(savings, currency)}
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted text-right max-w-[8rem] leading-snug shrink-0">
            Add {tiers[0]?.qty ?? 3}+ to unlock<br />volume pricing
          </p>
        )}
      </div>

      {/* ── Slider ────────────────────────────────────────── */}
      {/* The faux-track + fill technique:
          The native <input type=range> sits on top, fully transparent
          track. A positioned div behind it draws the gradient fill from
          0 → thumb. The browser still draws the thumb on the input via
          ::-webkit-slider-thumb, sized + positioned so it visually
          aligns with the faux track. */}
      <div className="relative h-12">
        {/* Faux track + filled portion */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-border/50 rounded-full overflow-hidden pointer-events-none">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-[width] duration-150 ease-out"
            style={{ width: fillPct }}
          />
        </div>

        {/* Tier ticks — vertical lines through the track */}
        {tiers.map((t) => (
          <div
            key={`tick-${t.qty}`}
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: pct(t.qty), transform: "translate(-50%, -50%)" }}
          >
            <span
              className={`block w-px h-3.5 transition-colors ${
                quantity >= t.qty ? "bg-white/70" : "bg-muted/40"
              }`}
              aria-hidden="true"
            />
          </div>
        ))}

        {/* The actual slider input — transparent track, custom thumb */}
        <input
          type="range"
          min={1}
          max={SLIDER_MAX}
          step={1}
          value={sliderQty}
          onChange={(e) => onQuantityChange(parseInt(e.target.value, 10))}
          aria-label="Quantity"
          className="absolute inset-0 w-full h-full bg-transparent appearance-none cursor-pointer
                     focus:outline-none
                     [&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent
                     [&::-moz-range-track]:h-full [&::-moz-range-track]:bg-transparent
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-card
                     [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-primary
                     [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(15,23,42,0.18)]
                     [&::-webkit-slider-thumb]:transition-transform
                     [&::-webkit-slider-thumb]:cursor-grab
                     [&::-webkit-slider-thumb]:hover:scale-110
                     [&::-webkit-slider-thumb]:active:scale-110
                     [&::-webkit-slider-thumb]:active:cursor-grabbing
                     [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-card
                     [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-primary
                     [&::-moz-range-thumb]:shadow-[0_2px_6px_rgba(15,23,42,0.18)]
                     [&::-moz-range-thumb]:cursor-grab
                     [&::-moz-range-thumb]:hover:scale-110"
        />
      </div>

      {/* ── Tier ladder ─────────────────────────────────── */}
      {/* Evenly-distributed pill row under the slider. Tap a pill to
          jump the slider to that tier. Decoupled from slider position
          so the early tiers (3+, 5+) don't crowd each other regardless
          of where they sit on the actual slider scale. Each pill lights
          up green once unlocked. */}
      <div className="flex gap-1.5 sm:gap-2 mt-3">
        {tiers.map((t) => {
          const active = quantity >= t.qty;
          return (
            <button
              key={`pill-${t.qty}`}
              type="button"
              onClick={() => onQuantityChange(t.qty)}
              aria-label={`Set quantity to ${t.qty} vials, ${t.discount}% off`}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg border text-center transition-all
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
                          ${
                            active
                              ? "bg-success/10 border-success/30"
                              : "bg-card border-border hover:border-border-strong hover:bg-accent/40"
                          }`}
            >
              <span
                className={`text-[11px] font-bold tabular-nums leading-none ${
                  active ? "text-success" : "text-foreground/80"
                }`}
              >
                {t.qty}+
              </span>
              <span
                className={`text-[10px] font-semibold tabular-nums leading-none ${
                  active ? "text-success" : "text-muted/70"
                }`}
              >
                −{t.discount}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
