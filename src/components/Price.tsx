"use client";

import { useFormatPrice } from "@/components/CurrencyProvider";

/**
 * Drop-in client-side price display. Renders the cents amount in the
 * customer's currently-selected display currency (USD or COP) and
 * re-renders automatically when they flip the toggle.
 *
 * Use this in any client component that previously rendered
 * `formatPrice(cents)` or `formatPriceShort(cents)` directly. Server
 * components and lib helpers should keep using the pure functions in
 * `@/lib/utils` (those are USD-only by design — we settle in USD).
 *
 * Usage:
 *   <Price cents={4500} />          // "$45.00" or "$167,000 COP"
 *   <Price cents={4500} short />    // "$45" or "$167,000 COP"
 */
export default function Price({
  cents,
  short = false,
  className,
}: {
  cents: number;
  short?: boolean;
  className?: string;
}) {
  const { format, formatShort } = useFormatPrice();
  const text = short ? formatShort(cents) : format(cents);
  return <span className={className}>{text}</span>;
}
