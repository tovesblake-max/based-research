"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";
import { useCurrency } from "@/components/CurrencyProvider";
import type { Locale } from "@/lib/i18n";
import type { Currency } from "@/components/CurrencyProvider";

/**
 * Conditional language + currency switcher.
 *
 * Visibility rules — designed so an English/USD visitor on an
 * English browser sees ZERO region chrome anywhere on the site:
 *
 *   1. Visitor has already chosen a non-default value (locale OR
 *      currency stored in localStorage from a previous visit) → SHOW.
 *      They need a way back.
 *   2. Browser's primary language is Spanish (navigator.language
 *      starts with "es") → SHOW. They might want to switch.
 *   3. Otherwise → HIDE. The default English/USD experience is
 *      identical to having no region system at all.
 *
 * Renders as a discreet pair of native <select>s in the footer (not
 * the header). When visible it reads as "preferences" not a primary
 * action.
 */
export default function RegionSwitcher() {
  const { locale, setLocale } = useLocale();
  const { currency, setCurrency } = useCurrency();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let show = false;
    // Rule 1: any explicit prior choice in localStorage.
    try {
      const storedLocale = localStorage.getItem("br-locale");
      const storedCurrency = localStorage.getItem("br-currency");
      if (
        (storedLocale && storedLocale !== "en") ||
        (storedCurrency && storedCurrency !== "USD")
      ) {
        show = true;
      }
    } catch {
      /* localStorage disabled — fall through to browser-language check */
    }
    // Rule 2: Spanish browser locale.
    if (!show && typeof navigator !== "undefined") {
      const lang = (navigator.language || "").toLowerCase();
      if (lang.startsWith("es")) show = true;
    }
    setVisible(show);
  }, []);

  // Also re-evaluate visibility when the user toggles to a non-default
  // value via the switcher itself — so the switcher stays open while
  // they're using it (rather than disappearing the moment they pick
  // English again).
  const showNow = visible || locale !== "en" || currency !== "USD";

  if (!showNow) return null;

  return (
    <div className="flex justify-center pt-2 pb-3">
      <div className="inline-flex items-center gap-3 text-[11px] text-footer-muted">
        <span className="inline-flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" aria-hidden="true" />
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            aria-label="Site language"
            className="bg-transparent border border-footer-muted/30 rounded px-1.5 py-0.5 text-footer-muted hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </span>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          aria-label="Display currency"
          className="bg-transparent border border-footer-muted/30 rounded px-1.5 py-0.5 text-footer-muted hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
        >
          <option value="USD">USD</option>
          <option value="COP">COP (Pesos colombianos)</option>
        </select>
        {currency === "COP" && (
          <span
            className="text-[10px] opacity-70"
            title="Prices shown in COP. All charges processed in USD."
          >
            settles in USD
          </span>
        )}
      </div>
    </div>
  );
}
