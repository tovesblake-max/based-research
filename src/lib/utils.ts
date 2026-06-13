// Module-level display-currency holder. CurrencyProvider syncs this on
// mount and on user toggle so every formatPrice / formatPriceShort
// caller renders in the customer's chosen currency without each call
// site needing the React context. SSR/server callers leave this at
// "USD" (default) since the cookie/localStorage isn't readable there.
//
// Conversion: 1 USD = 3,700 COP per the operator's spec, ceil-rounded to
// nearest 1,000 so the displayed COP value is always >= true converted
// amount and reads as a clean number.
type DisplayCurrency = "USD" | "COP";
let _displayCurrency: DisplayCurrency = "USD";
const USD_TO_COP_RATE = 3_700;
const COP_ROUND_TO = 1_000;

export function setDisplayCurrency(c: DisplayCurrency): void {
  _displayCurrency = c;
}

export function getDisplayCurrency(): DisplayCurrency {
  return _displayCurrency;
}

function toCopCeil(usdCents: number): number {
  if (!Number.isFinite(usdCents)) return 0;
  const usd = usdCents / 100;
  const rawCop = usd * USD_TO_COP_RATE;
  return Math.ceil(rawCop / COP_ROUND_TO) * COP_ROUND_TO;
}

export function formatPrice(cents: number): string {
  if (_displayCurrency === "COP") {
    return `$${toCopCeil(cents).toLocaleString("en-US")} COP`;
  }
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatPriceShort(cents: number): string {
  if (_displayCurrency === "COP") {
    return `$${toCopCeil(cents).toLocaleString("en-US")} COP`;
  }
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
