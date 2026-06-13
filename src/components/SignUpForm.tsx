"use client";

import Link from "next/link";
import Button from "@/components/Button";
import Turnstile from "@/components/Turnstile";
import { getTurnstileSiteKey } from "@/lib/turnstile";
import { cn } from "@/lib/utils";
import {
  Shield,
  Truck,
  FileCheck,
  Loader2,
  FlaskConical,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { BUSINESS_TYPES } from "@/lib/business-types";

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

type Step = "details" | "verify";

export default function SignUpForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const siteKey = getTurnstileSiteKey();

  // Step 1 fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState(COUNTRY_CODES[0]);
  const [phone, setPhone] = useState("");
  // Researcher classification collected at account creation (2026-05-21) so
  // it lands on the profile before the customer ever reaches checkout. The
  // checkout then pre-fills from the profile (compact "Researching as: X").
  // Picker values must match RESEARCHER_TYPES on the server.
  const [researcherType, setResearcherType] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [ein, setEin] = useState("");
  const [researchUseAcknowledged, setResearchUseAcknowledged] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  // Step 2 fields
  const [code, setCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  // Shared state
  const [step, setStep] = useState<Step>("details");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Close country dropdown on click outside
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

  // Step 1 submit → send OTP
  const sendCode = async (isResend = false) => {
    setError("");
    if (!isResend) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
    }
    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (!isResend && !researcherType) {
      setError("Please select your business type / industry.");
      return;
    }
    if (!isResend && !researchUseAcknowledged) {
      setError("Please confirm you are a professional researcher and acknowledge these products are not for human consumption.");
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
          consent: true,
          turnstileToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send verification code.");
        setLoading(false);
        return;
      }
      setStep("verify");
      setResendCountdown(30);
      if (isResend) setCode("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 submit → verify OTP + create account
  const verifyAndCreate = async () => {
    setError("");
    if (!code.trim()) {
      setError("Please enter the code.");
      return;
    }

    setLoading(true);
    try {
      // Grab referral code if stored
      let referralCode: string | undefined;
      try {
        referralCode = localStorage.getItem("br-ref") || undefined;
      } catch { /* SSR safety */ }

      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone,
          countryCode: country.code,
          code,
          referralCode,
          researcherType,
          researchUseAcknowledged,
          companyName: companyName || undefined,
          ein: ein || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account.");
        setLoading(false);
        return;
      }

      // Clear referral code after successful signup
      try { localStorage.removeItem("br-ref"); } catch { /* SSR safety */ }

      // Hard nav so middleware sees the new session cookie
      window.location.href = redirectTo;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex">
      {/* Left Panel — Dark branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-footer-bg text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-primary/20" aria-hidden="true" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" aria-hidden="true" />

        <div className="relative z-10 flex flex-col justify-center px-16 max-w-lg">
          <Link href="/" className="block mb-12" aria-label="Based Research home">
            <Image
              src="/images/site/logo-dark.png"
              alt="Based Research"
              width={200}
              height={50}
              className="h-10 w-auto"
            />
          </Link>

          <h1 className="font-serif text-4xl leading-tight mb-6">
            Research-grade peptides, verified.
          </h1>

          <div className="space-y-4">
            {[
              { icon: <FlaskConical className="w-4 h-4" aria-hidden="true" />, text: "A2LA-accredited HPLC verified, every batch" },
              { icon: <FileCheck className="w-4 h-4" aria-hidden="true" />, text: "Public, batch-linked certificates of analysis" },
              { icon: <Truck className="w-4 h-4" aria-hidden="true" />, text: "Free US shipping over $200 · ships next business day" },
              { icon: <Shield className="w-4 h-4" aria-hidden="true" />, text: "99%+ purity guaranteed" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-white/70">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {step === "details" ? (
            <>
              <h2 className="font-serif text-3xl text-foreground mb-2">Create an institutional account</h2>
              <p className="text-muted mb-8">
                Already have an account?{" "}
                <Link
                  href={`/auth/sign-in${redirectTo !== "/" ? `?redirect=${redirectTo}` : ""}`}
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </Link>
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
                className="space-y-4"
                noValidate
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="su-first" className="block text-sm font-medium text-foreground mb-1.5">
                      First Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="su-first"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                      className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="su-last" className="block text-sm font-medium text-foreground mb-1.5">
                      Last Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="su-last"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                      className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="su-email" className="block text-sm font-medium text-foreground mb-1.5">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="su-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="su-phone" className="block text-sm font-medium text-foreground mb-1.5">
                    Phone <span className="text-destructive">*</span> <span className="text-muted font-normal text-xs">(verified via SMS)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative" ref={countryRef}>
                      <button
                        type="button"
                        onClick={() => setCountryOpen(!countryOpen)}
                        className="h-11 px-3 rounded-lg border border-border bg-white flex items-center gap-1.5 text-sm hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                          className="absolute left-0 top-12 z-20 w-44 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto py-1"
                        >
                          {COUNTRY_CODES.map((c, i) => (
                            <li key={`${c.code}-${c.label}-${i}`}>
                              <button
                                type="button"
                                onClick={() => { setCountry(c); setCountryOpen(false); }}
                                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-accent/40 text-sm"
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
                      id="su-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="4691234567"
                      className="flex-1 h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="su-pw" className="block text-sm font-medium text-foreground mb-1.5">
                    Password <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="su-pw"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (min 8 chars)"
                    autoComplete="new-password"
                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  {password.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            password.length < 6 ? "w-1/4 bg-destructive" :
                            password.length < 10 ? "w-2/4 bg-warm" :
                            password.length < 14 ? "w-3/4 bg-secondary" :
                            "w-full bg-success"
                          )}
                        />
                      </div>
                      <span className="text-[10px] text-muted">
                        {password.length < 6 ? "Weak" : password.length < 10 ? "Fair" : password.length < 14 ? "Good" : "Strong"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Researcher classification — collected once at account
                    creation, saved to the profile, pre-filled at checkout.
                    Values must match RESEARCHER_TYPES on the server. */}
                <div>
                  <label htmlFor="su-researcher" className="block text-sm font-medium text-foreground mb-1.5">
                    Business Type / Industry <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="su-researcher"
                    required
                    value={researcherType}
                    onChange={(e) => setResearcherType(e.target.value)}
                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  >
                    <option value="">Select Business Type / Industry&hellip;</option>
                    {BUSINESS_TYPES.map((bt) => (
                      <option key={bt.value} value={bt.value}>{bt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Company name + EIN — business identifiers captured for
                    B2B records + card-processor underwriting (MCC 5169).
                    Display a red asterisk to match the rest of the form, but
                    they remain OPTIONAL internally: no `required` attribute
                    here and the submit handler sends `value || undefined`,
                    so a blank submission still succeeds. */}
                <div>
                  <label htmlFor="su-company" className="block text-sm font-medium text-foreground mb-1.5">
                    Company / Organization Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="su-company"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Meridian Research Labs LLC"
                    autoComplete="organization"
                    maxLength={255}
                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="su-ein" className="block text-sm font-medium text-foreground mb-1.5">
                    EIN / Tax ID <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="su-ein"
                    type="text"
                    inputMode="numeric"
                    value={ein}
                    onChange={(e) => setEin(e.target.value.replace(/[^\d-]/g, "").slice(0, 20))}
                    placeholder="12-3456789"
                    autoComplete="off"
                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  <p className="mt-1 text-[11px] text-muted">Stored encrypted. Speeds up wholesale / tax-exempt setup later.</p>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={researchUseAcknowledged}
                    onChange={(e) => setResearchUseAcknowledged(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border"
                    required
                  />
                  <span className="text-[12px] text-muted leading-snug">
                    I am a professional researcher and understand how to properly handle and use these products for research purposes only. I acknowledge these products are not intended for human consumption.
                  </span>
                </label>

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
                  className="w-full mt-2 bg-gradient-to-r from-primary to-secondary hover:from-primary-light hover:to-secondary-light"
                  disabled={loading || !email || !password || !phone || !turnstileToken}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending code...</>
                  ) : (
                    "Continue — verify phone"
                  )}
                </Button>
              </form>

              <p className="text-[10px] text-muted text-center mt-6 leading-relaxed">
                By creating an account, you agree to our{" "}
                <Link href="/legal/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                . Products are intended for research use only.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-serif text-3xl text-foreground mb-2">Verify your phone</h2>
              <p className="text-muted mb-8 text-sm leading-relaxed">
                We sent a 6-digit code to{" "}
                <span className="text-foreground font-medium">
                  {country.code} {phone}
                </span>
                .{" "}
                <button
                  type="button"
                  onClick={() => {
                    setStep("details");
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
                  verifyAndCreate();
                }}
                className="space-y-5"
                noValidate
              >
                <div>
                  <label htmlFor="su-code" className="block text-sm font-medium text-foreground mb-1.5">
                    Verification Code
                  </label>
                  <input
                    id="su-code"
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
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</>
                  ) : (
                    "Verify & Create Account"
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
