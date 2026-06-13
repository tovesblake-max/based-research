"use client";

import Image from "next/image";
import { Check, Plus } from "lucide-react";
import { formatPriceShort } from "@/lib/utils";
import { useCurrencySubscription } from "@/components/CurrencyProvider";
import type { BumpOfferPayload } from "@/lib/bump-offer";

/**
 * Bump offer card — a single-checkbox inline upsell that sits between the
 * order summary and the primary Pay button. Tuned for Based Research's muted
 * scientific aesthetic: cream/amber palette, serif heading, no fake-urgency
 * badges, no ALL-CAPS "YES!" copy. The whole card is clickable; the
 * checkbox mirrors the state.
 *
 * Tracking lives in the parent (CheckoutClient) so all of the checkout's
 * funnel events share one GTM push path.
 */
export default function BumpOffer({
  offer,
  checked,
  onToggle,
}: {
  offer: BumpOfferPayload;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  useCurrencySubscription(); // re-render on USD <-> COP toggle
  const { name, shortDescription, imageSrc, listPriceCents, bumpPriceCents } = offer;
  const discounted = bumpPriceCents < listPriceCents;

  return (
    <button
      type="button"
      onClick={() => onToggle(!checked)}
      aria-pressed={checked}
      className={`group w-full text-left rounded-xl border overflow-hidden transition-all cursor-pointer ${
        checked
          ? "border-[#B7791F] ring-2 ring-[#B7791F]/20"
          : "border-[#E6D5B0] hover:border-[#B7791F]"
      }`}
      style={{ backgroundColor: checked ? "#FEF8EC" : "#FFFDF7" }}
    >
      {/* Badge strip */}
      <div className="px-4 py-2 flex items-center gap-2 border-b" style={{ borderColor: "#E6D5B0" }}>
        <span
          className="inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded"
          style={{ backgroundColor: "#B7791F" }}
        >
          Add to order
        </span>
        <span className="text-[11px] text-[#8B6914]">
          One-click add, rolled into this payment
        </span>
      </div>

      <div className="p-4 sm:p-5 flex items-start gap-4">
        {/* Custom checkbox — bigger than a native input so the click target
            is obvious, colour matches the badge. */}
        <div
          className={`flex-shrink-0 w-6 h-6 mt-0.5 rounded-md border-2 flex items-center justify-center transition-colors ${
            checked ? "border-[#B7791F]" : "border-[#C9B48C]"
          }`}
          style={{ backgroundColor: checked ? "#B7791F" : "white" }}
          aria-hidden="true"
        >
          {checked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
        </div>

        {/* Product image — fixed box, object-contain so it scales cleanly
            for any product swapped into the bump slot later. */}
        <div className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white border" style={{ borderColor: "#E6D5B0" }}>
          <Image
            src={imageSrc}
            alt={name}
            fill
            sizes="80px"
            className="object-contain p-1.5"
          />
        </div>

        {/* Copy + price */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-base sm:text-lg text-foreground leading-snug">
            {checked ? "Added: " : "Add the "}
            {name}
          </h3>
          <p className="text-xs sm:text-sm text-muted leading-relaxed mt-1">
            {shortDescription}
          </p>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-base sm:text-lg font-semibold text-foreground">
              {formatPriceShort(bumpPriceCents)}
            </span>
            {discounted && (
              <>
                <span className="text-xs text-muted line-through">
                  {formatPriceShort(listPriceCents)}
                </span>
                <span className="text-[11px] font-medium text-[#B7791F]">
                  save {formatPriceShort(listPriceCents - bumpPriceCents)}
                </span>
              </>
            )}
            {!discounted && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-[#8B6914]">
                <Plus className="w-3 h-3" aria-hidden="true" />
                added to this order
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
