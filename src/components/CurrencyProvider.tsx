"use client";

import {
  createContext, useContext, useEffect, useState, ReactNode, useCallback,
} from "react";
import { setDisplayCurrency } from "@/lib/utils";

/**
 * Display currency switcher.
 *
 * IMPORTANT: this is a DISPLAY-ONLY converter. Charge in USD regardless
 * of display currency, and every order row in the database is stored in
 * USD cents. The conversion to COP happens at
 * the render layer only. When a customer in COP-display mode hits
 * checkout we still process the underlying USD amount; the receipt
 * email still shows USD because emails render server-side without
 * the client's currency preference.
 *
 * Conversion rate: 3,700 COP per USD (per the operator's spec, intentionally
 * conservative vs the live FX market rate to avoid the customer ever
 * paying more in USD than the COP price they saw). Round-up policy is
 * applied so the displayed COP amount is always >= the true converted
 * value, e.g.:
 *
 *   $100.00  USD  ->  $370,000 COP
 *   $45.00   USD  ->  $167,000 COP   (166,500 ceiled to nearest 1,000)
 *   $200.00  USD  ->  $740,000 COP
 *
 * Persisted to localStorage (`sw-currency`) so the choice survives
 * navigation + reload. Default is USD.
 */

export type Currency = "USD" | "COP";

const STORAGE_KEY = "br-currency";
// USD -> COP multiplier. Per the operator's spec: $100 USD = $370,000 COP.
// Pinned in code; if the operator renegotiates the rate, change this constant.
export const USD_TO_COP_RATE = 3_700;
// COP rounding: ceil to nearest 1,000 so the displayed value is always
// at or above the true converted amount and reads as a clean number.
const COP_ROUND_TO = 1_000;

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  setCurrency: () => {},
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("USD");
  const [mounted, setMounted] = useState(false);

  // Load persisted choice on first client render.
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "USD" || stored === "COP") {
        setCurrencyState(stored);
      }
    } catch {
      /* localStorage disabled — stay on USD default */
    }
  }, []);

  // Sync the module-level display-currency var in lib/utils so every
  // formatPrice / formatPriceShort caller (98+ across the codebase)
  // renders in the chosen currency without needing the React context
  // wired into every component.
  useEffect(() => {
    setDisplayCurrency(currency);
  }, [currency]);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
  }, []);

  // Avoid hydration mismatch: while not mounted, render USD (matches
  // server). After mount we may swap to COP based on stored pref.
  const value: CurrencyContextValue = {
    currency: mounted ? currency : "USD",
    setCurrency,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}

/**
 * Subscribe a component to currency changes so it re-renders (and
 * its formatPrice/formatPriceShort calls pick up the new currency)
 * when the user flips the toggle. Use this in client components that
 * render prices via the pure utils (most of them) instead of via the
 * <Price> component or useFormatPrice() hook.
 *
 * Call once at the top of the component. The hook returns nothing —
 * its only purpose is the subscription.
 */
export function useCurrencySubscription(): void {
  useContext(CurrencyContext);
}

// ─────────────────────────────────────────────────────────────────
// Pure conversion + formatting helpers (no React)
// ─────────────────────────────────────────────────────────────────

/**
 * Convert a USD-cents amount to the COP integer amount, ceil-rounded
 * to the nearest COP_ROUND_TO. Always returns a non-negative integer.
 */
export function convertUsdCentsToCop(usdCents: number): number {
  if (!Number.isFinite(usdCents)) return 0;
  const usd = usdCents / 100;
  const rawCop = usd * USD_TO_COP_RATE;
  // Ceil to round_to so $45.00 (=> 166,500) lands at 167,000.
  return Math.ceil(rawCop / COP_ROUND_TO) * COP_ROUND_TO;
}

/**
 * Format a USD-cents amount in the chosen display currency. Returns
 * the dollar/peso glyph + locale-grouped digits. Used by the
 * `useFormatPrice()` hook below; pure callers (server contexts,
 * emails) can call this directly with currency="USD".
 */
export function formatPriceWithCurrency(
  usdCents: number,
  currency: Currency,
): string {
  if (currency === "COP") {
    const cop = convertUsdCentsToCop(usdCents);
    return `$${cop.toLocaleString("en-US")} COP`;
  }
  // USD — match the existing site convention: dollars with two decimals.
  return `$${(usdCents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Short USD format ("$45" instead of "$45.00") for compact layouts.
 * In COP we use the same format as long since pesos don't render
 * fractional cents anyway.
 */
export function formatPriceShortWithCurrency(
  usdCents: number,
  currency: Currency,
): string {
  if (currency === "COP") {
    return formatPriceWithCurrency(usdCents, currency);
  }
  return `$${(usdCents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Hook that returns currency-aware formatters bound to the current
 * provider value. Components should prefer this over calling the raw
 * functions so the display updates when the customer flips the toggle.
 */
export function useFormatPrice() {
  const { currency } = useCurrency();
  return {
    currency,
    format: (cents: number) => formatPriceWithCurrency(cents, currency),
    formatShort: (cents: number) =>
      formatPriceShortWithCurrency(cents, currency),
    convertCents: (cents: number) =>
      currency === "COP" ? convertUsdCentsToCop(cents) : cents,
  };
}
