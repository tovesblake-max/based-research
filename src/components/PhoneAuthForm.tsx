"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ChevronDown } from "lucide-react";
import Button from "@/components/Button";
import Turnstile from "@/components/Turnstile";
import { getTurnstileSiteKey } from "@/lib/turnstile";

// Common country codes — extend as needed
const COUNTRY_CODES = [
  { code: "+1", flag: "🇺🇸", label: "US" },
  { code: "+1", flag: "🇨🇦", label: "CA" },
  { code: "+44", flag: "🇬🇧", label: "GB" },
  { code: "+61", flag: "🇦🇺", label: "AU" },
  { code: "+64", flag: "🇳🇿", label: "NZ" },
  { code: "+52", flag: "🇲🇽", label: "MX" },
  { code: "+33", flag: "🇫🇷", label: "FR" },
  { code: "+49", flag: "🇩🇪", label: "DE" },
  { code: "+81", flag: "🇯🇵", label: "JP" },
];

type Step = "phone" | "code";

export default function PhoneAuthForm() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("phone");
  const [country, setCountry] = useState(COUNTRY_CODES[0]);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [countryOpen, setCountryOpen] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const countryRef = useRef<HTMLDivElement>(null);
  const siteKey = getTurnstileSiteKey();

  // Close country dropdown on click-outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Resend countdown tick
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const sendCode = async (isResend = false) => {
    setError("");
    if (!consent) {
      setError("Please confirm the research-use-only terms to continue.");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    if (!turnstileToken) {
      setError("Please complete the verification challenge.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          countryCode: country.code,
          consent,
          turnstileToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send code.");
        setLoading(false);
        return;
      }
      setStep("code");
      setResendCountdown(30);
      if (isResend) {
        setCode("");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    if (!code.trim()) {
      setError("Please enter the code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/phone/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, countryCode: country.code, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid code.");
        setLoading(false);
        return;
      }
      // Hard navigation so AuthProvider re-reads the new session cookie.
      // Explicit `?redirect=` wins (middleware bounced them here for a
      // specific page); otherwise admins land on /admin and customers
      // on /account.
      const explicit = searchParams.get("redirect");
      const roleDefault = data.role === "admin" ? "/admin" : "/account";
      window.location.href = explicit || roleDefault;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] grid lg:grid-cols-2">
      {/* Left Panel — Hero */}
      <div className="hidden lg:flex items-center justify-center bg-accent/40 px-12 py-16 relative overflow-hidden">
        <div className="max-w-lg w-full">
          <h1 className="font-serif text-5xl leading-[1.05] text-foreground mb-4">
            Batch <span className="text-primary">Tested,</span>
            <br />
            Batch <span className="text-primary">Produced</span>
          </h1>
          <p className="text-muted text-lg mb-10">COAs available for every batch</p>

          {/* Phone mockup — decorative */}
          <div className="mt-6 rounded-[2.5rem] border-8 border-foreground/90 bg-white shadow-2xl overflow-hidden max-w-sm">
            <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-border">
              <span className="text-[11px] font-medium">10:25</span>
              <div className="w-20 h-5 bg-foreground rounded-full" aria-hidden="true" />
              <span className="text-[11px] font-medium">100%</span>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <Image
                  src="/images/site/logo-light.png"
                  alt="Based Research"
                  width={140}
                  height={32}
                  className="h-6 w-auto"
                />
                <div className="flex gap-3 text-muted">
                  <div className="w-5 h-4 flex flex-col justify-between">
                    <span className="block h-[2px] bg-current rounded" />
                    <span className="block h-[2px] bg-current rounded" />
                    <span className="block h-[2px] bg-current rounded" />
                  </div>
                </div>
              </div>

              <div className="bg-foreground text-white rounded-xl px-4 py-2.5 flex items-center justify-between text-xs mb-4">
                <span>Fast and Discreet Shipping</span>
                <span className="text-secondary">✓ Affordable Pricing</span>
              </div>

              <h3 className="font-serif text-xl text-foreground mb-1">Certificate of Analysis</h3>
              <p className="text-[11px] text-muted leading-relaxed mb-4">
                Verify that a specific product or batch has undergone quality control
                tests and meets established specifications for quality and safety.
              </p>

              <div className="bg-accent/60 rounded-lg px-3 py-2 flex items-center gap-2 mb-3">
                <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></svg>
                <span className="text-[11px] text-muted">Search by product name or lot number</span>
              </div>

              <div className="flex items-center gap-3 py-2 border-t border-border">
                <div className="w-10 h-10 rounded bg-accent flex items-center justify-center">
                  <div className="w-6 h-7 bg-white border border-muted/30 rounded-sm" />
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <div className="text-muted uppercase tracking-wider">Product</div>
                    <div className="font-medium text-foreground">BPC-157</div>
                  </div>
                  <div>
                    <div className="text-muted uppercase tracking-wider">Dose</div>
                    <div className="font-medium text-foreground">5mg</div>
                  </div>
                  <div>
                    <div className="text-muted uppercase tracking-wider">Lot / Batch</div>
                    <div className="font-medium text-primary">09876 / 45678</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex items-center justify-center px-4 py-12 lg:px-16">
        <div className="w-full max-w-md">
          <Link href="/" className="block lg:hidden mb-10" aria-label="Based Research home">
            <Image
              src="/images/site/logo-light.png"
              alt="Based Research"
              width={180}
              height={45}
              className="h-9 w-auto"
            />
          </Link>

          {step === "phone" ? (
            <>
              <h2 className="font-serif text-3xl text-foreground mb-2">Login with phone number</h2>
              <p className="text-muted mb-8 text-sm leading-relaxed">
                Due to regulatory considerations in this industry, we offer account login
                via phone verification to access product information and place orders.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendCode(false);
                }}
                className="space-y-5"
                noValidate
              >
                <div>
                  <label htmlFor="phone-input" className="block text-sm font-medium text-foreground mb-1.5">
                    Phone <span className="text-destructive">*</span>{" "}
                    <span className="text-muted font-normal">(Required)</span>
                  </label>
                  <div className="flex gap-2">
                    {/* Country selector */}
                    <div className="relative" ref={countryRef}>
                      <button
                        type="button"
                        onClick={() => setCountryOpen(!countryOpen)}
                        className="h-12 px-3 rounded-lg border border-border bg-white flex items-center gap-1.5 text-sm hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        aria-haspopup="listbox"
                        aria-expanded={countryOpen}
                      >
                        <span className="text-base leading-none">{country.flag}</span>
                        <span className="text-foreground">{country.code}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                      </button>
                      {countryOpen && (
                        <ul
                          role="listbox"
                          className="absolute left-0 top-14 z-20 w-44 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto py-1"
                        >
                          {COUNTRY_CODES.map((c, i) => (
                            <li key={`${c.code}-${c.label}-${i}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setCountry(c);
                                  setCountryOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-accent/40 text-sm"
                                role="option"
                                aria-selected={country.label === c.label}
                              >
                                <span className="text-base leading-none">{c.flag}</span>
                                <span className="text-foreground">{c.label}</span>
                                <span className="text-muted ml-auto">{c.code}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <input
                      id="phone-input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="4691234567"
                      required
                      className="flex-1 h-12 px-4 rounded-lg border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-start">
                  <Turnstile
                    siteKey={siteKey}
                    onVerify={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken("")}
                    onError={() => setTurnstileToken("")}
                  />
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={loading || !phone || !consent || !turnstileToken}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Code"
                  )}
                </Button>

                <label className="flex gap-3 items-start cursor-pointer select-none pt-2">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary/30 flex-shrink-0"
                  />
                  <span className="text-xs text-muted leading-relaxed">
                    I confirm that I am a qualified researcher or institutional
                    professional, that all products purchased are strictly for lawful
                    Research Use Only (not for human or animal use, clinical,
                    diagnostic, or therapeutic purposes), and that I accept full
                    responsibility for compliance with all applicable laws and
                    regulations. I assume all risks associated with handling research
                    materials and agree to hold the company harmless from any claims or
                    liabilities.
                  </span>
                </label>
              </form>

              <p className="text-xs text-muted text-center mt-8">
                Prefer email?{" "}
                <Link
                  href={`/auth/sign-in${searchParams.get("redirect") ? `?redirect=${searchParams.get("redirect")}` : ""}`}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in with email
                </Link>
              </p>
            </>
          ) : (
            <>
              <h2 className="font-serif text-3xl text-foreground mb-2">Enter your code</h2>
              <p className="text-muted mb-8 text-sm leading-relaxed">
                We sent a 6-digit code to{" "}
                <span className="text-foreground font-medium">
                  {country.code} {phone}
                </span>
                .{" "}
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                    setError("");
                  }}
                  className="text-primary hover:underline"
                >
                  Change number
                </button>
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  verifyCode();
                }}
                className="space-y-5"
                noValidate
              >
                <div>
                  <label htmlFor="code-input" className="block text-sm font-medium text-foreground mb-1.5">
                    Verification Code
                  </label>
                  <input
                    id="code-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="123456"
                    maxLength={10}
                    required
                    autoFocus
                    className="w-full h-14 px-4 rounded-lg border border-border bg-white text-foreground text-2xl text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={loading || code.length < 4}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>

                <div className="text-center">
                  {resendCountdown > 0 ? (
                    <p className="text-xs text-muted">
                      Resend code in {resendCountdown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sendCode(true)}
                      disabled={loading}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      Didn&apos;t receive it? Resend code
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
