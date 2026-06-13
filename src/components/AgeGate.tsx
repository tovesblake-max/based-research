"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ShieldCheck, XCircle } from "lucide-react";

/**
 * Age verification modal — 21+ confirmation required before accessing the site.
 *
 * Required by card-network secret shoppers and by Visa/MC Brand Risk and
 * Acquirer Monitoring (BRAM) programs for regulated-ingredient merchants.
 *
 * The confirmation is stored in localStorage for 90 days. If a visitor
 * declines, they're redirected away from the site.
 */

const STORAGE_KEY = "br-age-verified";
const EXPIRY_DAYS = 90;

type StoredValue = { verified: true; ts: number };

function isVerified(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as StoredValue;
    if (!parsed.verified) return false;
    const ageDays = (Date.now() - parsed.ts) / (1000 * 60 * 60 * 24);
    return ageDays < EXPIRY_DAYS;
  } catch {
    return false;
  }
}

function setVerified() {
  try {
    const v: StoredValue = { verified: true, ts: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // localStorage unavailable — fail open for the session
  }
}

export default function AgeGate() {
  const [open, setOpen] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    // Open the modal on every page-load unless already verified
    if (!isVerified()) setOpen(true);
  }, []);

  // Lock body scroll while the modal is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  if (declined) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-foreground/95 backdrop-blur-md flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-decline-title"
      >
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-7 h-7 text-destructive" aria-hidden="true" />
          </div>
          <h2 id="age-decline-title" className="font-serif text-2xl text-foreground mb-3">
            Access Denied
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Based Research products are available only to qualified researchers who are 21
            years of age or older. You will not be able to access this site.
          </p>
          <button
            onClick={() => {
              window.location.href = "https://www.google.com";
            }}
            className="mt-6 text-sm text-primary hover:underline"
          >
            Leave site
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-foreground/90 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/site/logo-light.png"
            alt="Based Research"
            width={180}
            height={45}
            className="h-10 w-auto"
            priority
          />
        </div>

        {/* Shield */}
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="w-7 h-7 text-primary" aria-hidden="true" />
        </div>

        <h2
          id="age-gate-title"
          className="font-serif text-2xl text-foreground text-center mb-3"
        >
          Age Verification Required
        </h2>
        <p className="text-sm text-muted text-center mb-6 leading-relaxed">
          This site sells <strong className="text-foreground">research-grade peptides for
          laboratory use only</strong>. You must be 21 years of age or older and a qualified
          researcher to access this site.
        </p>

        <div className="space-y-2.5 mb-2">
          <button
            onClick={() => {
              setVerified();
              setOpen(false);
            }}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          >
            I am 21 or older — Enter site
          </button>
          <button
            onClick={() => setDeclined(true)}
            className="w-full h-12 rounded-xl border border-border bg-white text-muted font-medium hover:bg-accent/40 hover:text-foreground transition-colors"
          >
            I am under 21
          </button>
        </div>

        <p className="text-[10px] text-muted/80 text-center leading-relaxed mt-5">
          By entering, you agree that products are for research use only and not for human or
          animal consumption. See our{" "}
          <a href="/legal/terms" className="text-primary hover:underline">Terms</a> and{" "}
          <a href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
