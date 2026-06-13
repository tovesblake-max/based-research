import Image from "next/image";

/**
 * Payment-method visibility badge for the product detail page (and
 * anywhere else we want to pre-answer the "can I actually pay with my
 * card here?" question — a real friction in the research-compounds
 * category where most competitors are crypto-only or require manual
 * invoicing).
 *
 * Shows the brand marks we actually accept (Visa, MC, Amex) in a
 * single row with one supporting line of copy. The copy is
 * intentionally matter-of-fact — bragging about taking cards reads as
 * desperate; the icons themselves do the legitimacy signaling.
 *
 * SVG assets live at /public/images/payment/ and are also used by the
 * Footer and CheckoutClient — single source of truth. Only brands the
 * current processor settles are listed here; advertising a brand we
 * can't charge guarantees a decline at checkout.
 */
const BRANDS: { src: string; alt: string }[] = [
  { src: "/images/payment/visa.svg", alt: "Visa" },
  { src: "/images/payment/mastercard.svg", alt: "Mastercard" },
  { src: "/images/payment/amex.svg", alt: "American Express" },
];

interface Props {
  /** Optional one-line tagline rendered under the icon row. */
  tagline?: string;
  className?: string;
}

export default function PaymentBadgeStrip({
  tagline = "Pay with Visa, Mastercard, or AMEX · ACH bank transfer saves 5%",
  className = "",
}: Props) {
  return (
    <div
      className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border border-border bg-accent/30 ${className}`}
      aria-label="Accepted payment methods"
    >
      {/* Brand row — kept tight so 5 icons fit on mobile without wrap.
          flex-wrap is a defensive escape hatch: on very narrow viewports
          or constrained parent columns the icons drop to a second line
          rather than overflowing horizontally. */}
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 sm:gap-x-3">
        {BRANDS.map((b) => (
          <Image
            key={b.alt}
            src={b.src}
            alt={b.alt}
            width={36}
            height={22}
            className="h-5 w-auto sm:h-6 select-none"
            // The brand SVGs are deterministic, no layout shift concerns.
            priority={false}
          />
        ))}
      </div>
      <p className="text-[11px] sm:text-xs text-muted text-center leading-tight">
        {tagline}
      </p>
    </div>
  );
}
