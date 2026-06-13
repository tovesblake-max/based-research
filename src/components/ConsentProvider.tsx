"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

type ConsentRegime = "gdpr" | "ccpa" | null;
type ConsentStatus = "pending" | "granted" | "denied";

interface ConsentContextType {
  regime: ConsentRegime;
  status: ConsentStatus;
  grant: () => void;
  deny: () => void;
  isReady: boolean; // geo detection complete
}

const ConsentContext = createContext<ConsentContextType>({
  regime: null,
  status: "granted",
  grant: () => {},
  deny: () => {},
  isReady: false,
});

const COOKIE_NAME = "br-consent";
const COOKIE_DAYS = 365;

function setCookie(value: string) {
  const expires = new Date(Date.now() + COOKIE_DAYS * 86400000).toUTCString();
  document.cookie = `${COOKIE_NAME}=${value};path=/;expires=${expires};SameSite=Lax`;
}

function getCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? match[1] : null;
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [regime, setRegime] = useState<ConsentRegime>(null);
  const [status, setStatus] = useState<ConsentStatus>("granted");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check existing cookie first
    const existing = getCookie();
    if (existing === "granted" || existing === "denied") {
      setStatus(existing as ConsentStatus);
      setIsReady(true);
      // Still detect regime for UI purposes but don't show banner
      fetch("/api/geo")
        .then((r) => r.json())
        .then((data) => setRegime(data.consentRequired))
        .catch(() => {});
      return;
    }

    // Detect geo
    fetch("/api/geo")
      .then((r) => r.json())
      .then((data) => {
        const r = data.consentRequired as ConsentRegime;
        setRegime(r);

        if (r === "gdpr") {
          // GDPR: opt-in — deny by default until consent
          setStatus("pending");
        } else if (r === "ccpa") {
          // CCPA: opt-out — granted by default, user can opt out
          setStatus("pending");
        } else {
          // No regulation — auto-grant
          setStatus("granted");
          setCookie("granted");
        }
        setIsReady(true);
      })
      .catch(() => {
        // If geo detection fails, default to granted (non-EU assumed)
        setStatus("granted");
        setIsReady(true);
      });
  }, []);

  const grant = useCallback(() => {
    setStatus("granted");
    setCookie("granted");
  }, []);

  const deny = useCallback(() => {
    setStatus("denied");
    setCookie("denied");
  }, []);

  return (
    <ConsentContext.Provider value={{ regime, status, grant, deny, isReady }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  return useContext(ConsentContext);
}
