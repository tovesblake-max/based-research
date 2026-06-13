"use client";

import { useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";

const REF_KEY = "br-ref";
// Storage key used to dedupe click POSTs from the same affiliate code on
// the same calendar day. Server-side dedupe is also enforced — this is
// just to avoid spamming the endpoint on every SPA navigation.
const CLICK_PING_KEY = "br-ref-clicked";

export default function ReferralCapture() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref || ref.length === 0) return;

    let stored = false;
    try {
      localStorage.setItem(REF_KEY, ref);
      stored = true;
    } catch {
      /* SSR safety / private mode — fall through to firing the click anyway */
    }

    // Only ping the click endpoint once per (code, UTC day) per browser.
    // Server-side has the authoritative dedupe; this is just polite.
    let alreadyPinged = false;
    try {
      const dayBucket = new Date().toISOString().slice(0, 10);
      const stamp = `${ref.toUpperCase()}|${dayBucket}`;
      if (localStorage.getItem(CLICK_PING_KEY) === stamp) {
        alreadyPinged = true;
      } else {
        localStorage.setItem(CLICK_PING_KEY, stamp);
      }
    } catch {
      /* private mode — fire anyway, server will dedupe by IP+code+day */
    }

    if (!alreadyPinged) {
      // Fire-and-forget. Failures don't surface to the page; the
      // endpoint always returns 200 so a user-visible network panel
      // still looks clean if logging is enabled.
      fetch("/api/affiliate/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: ref, path: pathname || "/" }),
        keepalive: true,
      }).catch(() => {});
    }

    // Suppress unused-var warning when storage works but ping was deduped.
    void stored;
  }, [searchParams, pathname]);

  return null;
}
