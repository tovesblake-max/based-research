"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Button from "@/components/Button";
import Turnstile from "@/components/Turnstile";
import { getTurnstileSiteKey } from "@/lib/turnstile";
import { RESEARCHER_TYPES } from "@/lib/gate";
import GateShell from "@/components/gate/GateShell";

const COUNTRY_CODES = [
  { code: "+1", label: "US/CA" },
  { code: "+44", label: "GB" },
  { code: "+61", label: "AU" },
  { code: "+64", label: "NZ" },
  { code: "+52", label: "MX" },
  { code: "+49", label: "DE" },
];

const input =
  "w-full h-11 px-3.5 rounded-lg border border-border-strong bg-background text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

export default function VerifyGate({ initialPhone, redirect: rawRedirect }: { initialPhone: string; redirect?: string }) {
  // Only honor same-origin relative redirects — never an absolute or
  // protocol-relative URL (open-redirect / phishing guard).
  const redirect =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : null;
  const siteKey = getTurnstileSiteKey();

  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState(initialPhone);
  const [researcherType, setResearcherType] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(isResend = false) {
    setError(null);
    if (!researcherType) {
      setError("Please select your researcher type.");
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
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // RUO consent was captured at Stage A; the send-code route still
        // requires the flag, so we pass it explicitly here.
        body: JSON.stringify({ phone, countryCode, consent: true, turnstileToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send code.");
        setSubmitting(false);
        return;
      }
      setStage("code");
      setResendIn(30);
      const t = setInterval(() => {
        setResendIn((s) => {
          if (s <= 1) {
            clearInterval(t);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      if (isResend) setCode("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verify() {
    setError(null);
    if (!code.trim()) {
      setError("Please enter the code.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/phone/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, countryCode, code, researcherType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid code.");
        setSubmitting(false);
        return;
      }
      // Hard navigation so AuthProvider re-reads the new session cookie.
      const dest = redirect || (data.role === "admin" ? "/admin" : "/shop");
      window.location.href = dest;
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <GateShell
      step={3}
      title={stage === "phone" ? "Verify your phone" : "Enter your code"}
      subtitle={
        stage === "phone"
          ? "We verify every account with a one-time code by text before granting access."
          : `We sent a 6-digit code to ${countryCode} ${phone}.`
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {stage === "phone" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendCode(false);
          }}
          className="space-y-3"
          noValidate
        >
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Researcher type</label>
            <select
              className={input}
              value={researcherType}
              onChange={(e) => setResearcherType(e.target.value)}
              required
            >
              <option value="" disabled>
                Select your research context…
              </option>
              {RESEARCHER_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
            <div className="flex gap-2">
              <select
                className="h-11 px-2 rounded-lg border border-border-strong bg-background text-sm w-24"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Country code"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.label} value={c.code}>
                    {c.code} {c.label}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="4691234567"
                required
                className={`${input} flex-1`}
              />
            </div>
          </div>

          <div className="flex justify-start pt-1">
            <Turnstile
              siteKey={siteKey}
              onVerify={(t) => setTurnstileToken(t)}
              onExpire={() => setTurnstileToken("")}
              onError={() => setTurnstileToken("")}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || !phone || !researcherType || !turnstileToken}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
              </>
            ) : (
              "Send code"
            )}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
          className="space-y-4"
          noValidate
        >
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="123456"
            maxLength={10}
            required
            autoFocus
            className="w-full h-14 px-4 rounded-lg border border-border-strong bg-background text-foreground text-2xl text-center tracking-[0.5em] font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <Button type="submit" size="lg" className="w-full" disabled={submitting || code.length < 4}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…
              </>
            ) : (
              "Verify & enter site"
            )}
          </Button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setStage("phone");
                setCode("");
                setError(null);
              }}
              className="text-muted hover:text-foreground"
            >
              Change number
            </button>
            {resendIn > 0 ? (
              <span className="text-muted">Resend in {resendIn}s</span>
            ) : (
              <button
                type="button"
                onClick={() => sendCode(true)}
                disabled={submitting}
                className="text-primary hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            )}
          </div>
        </form>
      )}
    </GateShell>
  );
}
