"use client";

import {
  createContext, useContext, useEffect, useState, ReactNode, useCallback,
} from "react";
import { setDisplayLocale, type Locale } from "@/lib/i18n";

/**
 * Display-locale provider for the customer-facing site.
 *
 * Same shape as CurrencyProvider: a state-backed context paired with a
 * module-level setter in lib/i18n. Components that render translated
 * strings via `t()` opt in to re-rendering on locale change by calling
 * `useLocaleSubscription()` (the hook returns nothing — it just
 * subscribes the caller to the context).
 *
 * Persisted to localStorage (`sw-locale`). Default is "en".
 *
 * Scope notes (per the operator): blog and admin remain English-only.
 * Translation coverage focuses on the customer purchase flow:
 * header / footer / catalog / PDP / cart / checkout / thank-you
 * page / account dashboard / common forms.
 */

const STORAGE_KEY = "br-locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "es") {
        setLocaleState(stored);
      }
    } catch {
      /* localStorage disabled — stay on English default */
    }
  }, []);

  // Sync the module-level locale used by lib/i18n's `t()` so every
  // call site picks up the active language without subscribing to the
  // React context.
  useEffect(() => {
    setDisplayLocale(locale);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value: LocaleContextValue = {
    locale: mounted ? locale : "en",
    setLocale,
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/**
 * Subscription hook for components that render translated strings via
 * the pure `t()` helper. Calling this once at the top of a component
 * registers it as a context consumer so it re-renders when the user
 * flips the language toggle.
 */
export function useLocaleSubscription(): void {
  useContext(LocaleContext);
}
