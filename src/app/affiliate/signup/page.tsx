"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { Loader2, AlertCircle, FileCheck, Users, Wallet } from "lucide-react";

/**
 * Affiliate APPLICATION form (renamed from "Become an Affiliate" signup).
 *
 * Collects:
 *   - Name + phone (so admin can contact applicants directly without
 *     digging through the user table — and so admin can vet that the
 *     applicant is a real person)
 *   - Application notes (audience, platforms, why-they're-a-good-fit)
 *   - Custom code preference (optional)
 *   - Payout method + payout details
 *
 * Server (POST /api/affiliate) backfills name/phone onto the user
 * record when missing — many of our existing users came in via guest
 * checkout and don't have a phone on file. The application also
 * collects them here regardless to anchor admin's vetting process.
 *
 * No rate (commission %) is shown anywhere on this page or the public
 * /affiliate page — that's a vetting consideration kept private to
 * avoid attracting coupon-hunters.
 */
export default function AffiliateSignupPage() {
  const router = useRouter();

  // Personal info — required for vetting + outreach.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Application context — required free-text.
  const [audience, setAudience] = useState("");
  const [platforms, setPlatforms] = useState("");
  const [whyJoin, setWhyJoin] = useState("");

  // Code + payout.
  const [customCode, setCustomCode] = useState("");
  const [method, setMethod] = useState<"crypto" | "ach">("crypto");
  const [walletAddress, setWalletAddress] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill name + phone from /api/auth/me if the user already has them
  // on file. They're still editable — applicant might want to provide a
  // different (e.g. business) phone for affiliate communications.
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.user) {
          if (j.user.firstName) setFirstName(j.user.firstName);
          if (j.user.lastName) setLastName(j.user.lastName);
          if (j.user.phone) setPhone(j.user.phone);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Composite the three application-context fields into one notes
    // blob with clear labels so admin can read it as one block. Server
    // stores into affiliates.application_notes verbatim.
    const applicationNotes = [
      `Audience / niche:\n${audience.trim()}`,
      `Where you publish (platforms, URLs):\n${platforms.trim()}`,
      `Why you'd be a good partner:\n${whyJoin.trim()}`,
    ].join("\n\n");

    setLoading(true);
    const payoutDetails = method === "crypto"
      ? { walletAddress }
      : { routingNumber, accountNumber, accountName };

    try {
      const res = await fetch("/api/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutMethod: method,
          payoutDetails,
          customCode: customCode || undefined,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          applicationNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit application");
        setLoading(false);
        return;
      }

      router.push("/affiliate/dashboard");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";
  const textareaClass = inputClass.replace("h-11", "min-h-[88px] py-3 leading-relaxed resize-y");

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
      <div className="text-center mb-10">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-3">Partner application</h1>
        <p className="text-muted max-w-lg mx-auto">
          Tell us about you and your audience. We review every application personally and respond within 48 hours.
        </p>
      </div>

      {/* Top trust strip — matches the public page tone */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { icon: <FileCheck className="w-5 h-5" aria-hidden="true" />, label: "We review every application", desc: "48hr response" },
          { icon: <Users className="w-5 h-5" aria-hidden="true" />, label: "Lifetime attribution", desc: "Permanent referrals" },
          { icon: <Wallet className="w-5 h-5" aria-hidden="true" />, label: "Crypto or ACH", desc: "Your choice" },
        ].map((b) => (
          <div key={b.label} className="text-center p-4 rounded-xl bg-accent/50 border border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">{b.icon}</div>
            <p className="text-sm font-semibold text-foreground">{b.label}</p>
            <p className="text-xs text-muted">{b.desc}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Personal info ── */}
        <fieldset className="bg-card rounded-xl border border-border p-6 space-y-5">
          <legend className="px-2 text-sm font-semibold text-foreground">About you</legend>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="aff-fname" className="block text-sm font-medium text-foreground mb-1.5">
                First name <span className="text-destructive">*</span>
              </label>
              <input id="aff-fname" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="aff-lname" className="block text-sm font-medium text-foreground mb-1.5">
                Last name <span className="text-destructive">*</span>
              </label>
              <input id="aff-lname" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label htmlFor="aff-phone" className="block text-sm font-medium text-foreground mb-1.5">
              Phone <span className="text-destructive">*</span>
              <span className="text-muted text-xs font-normal ml-1">(SMS-reachable — for partner comms)</span>
            </label>
            <input id="aff-phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
          </div>
        </fieldset>

        {/* ── Application context ── */}
        <fieldset className="bg-card rounded-xl border border-border p-6 space-y-5">
          <legend className="px-2 text-sm font-semibold text-foreground">Your application</legend>

          <div>
            <label htmlFor="aff-audience" className="block text-sm font-medium text-foreground mb-1.5">
              Your audience / niche <span className="text-destructive">*</span>
            </label>
            <textarea
              id="aff-audience"
              required
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Who do you reach? Demographics, interests, approximate size."
              className={textareaClass}
            />
          </div>

          <div>
            <label htmlFor="aff-platforms" className="block text-sm font-medium text-foreground mb-1.5">
              Where you publish <span className="text-destructive">*</span>
              <span className="text-muted text-xs font-normal ml-1">(URLs to your podcast / channel / newsletter / clinic)</span>
            </label>
            <textarea
              id="aff-platforms"
              required
              value={platforms}
              onChange={(e) => setPlatforms(e.target.value)}
              placeholder="https://your-podcast.com/&#10;https://instagram.com/yourhandle&#10;https://your-substack.com/"
              className={textareaClass}
            />
          </div>

          <div>
            <label htmlFor="aff-why" className="block text-sm font-medium text-foreground mb-1.5">
              Why we&apos;d be a good fit <span className="text-destructive">*</span>
            </label>
            <textarea
              id="aff-why"
              required
              value={whyJoin}
              onChange={(e) => setWhyJoin(e.target.value)}
              placeholder="What do you cover that overlaps with research peptides? How do you envision promoting?"
              className={textareaClass}
            />
          </div>
        </fieldset>

        {/* ── Code + Payout ── */}
        <fieldset className="bg-card rounded-xl border border-border p-6 space-y-5">
          <legend className="px-2 text-sm font-semibold text-foreground">Code &amp; payout preferences</legend>

          <div>
            <label htmlFor="aff-code" className="block text-sm font-medium text-foreground mb-1.5">
              Preferred affiliate code <span className="text-muted text-xs font-normal">(optional, letters &amp; numbers only)</span>
            </label>
            <input
              id="aff-code"
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
              placeholder="e.g. LAB10"
              maxLength={30}
              className={inputClass}
            />
            <p className="text-xs text-muted mt-1">If you&apos;re approved, we&apos;ll try to honor this code. We may suggest an alternative if it&apos;s already taken.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Payout method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod("crypto")}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${method === "crypto" ? "border-primary bg-primary/5" : "border-border hover:border-border-strong"}`}
              >
                <p className="text-sm font-medium text-foreground">Crypto (USDT/USDC)</p>
                <p className="text-xs text-muted">ERC-20 or TRC-20</p>
              </button>
              <button
                type="button"
                onClick={() => setMethod("ach")}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${method === "ach" ? "border-primary bg-primary/5" : "border-border hover:border-border-strong"}`}
              >
                <p className="text-sm font-medium text-foreground">ACH bank transfer</p>
                <p className="text-xs text-muted">US bank account</p>
              </button>
            </div>
          </div>

          {method === "crypto" ? (
            <div>
              <label htmlFor="aff-wallet" className="block text-sm font-medium text-foreground mb-1.5">
                Wallet address <span className="text-destructive">*</span>
              </label>
              <input
                id="aff-wallet"
                type="text"
                required
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x... or T..."
                className={inputClass}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="aff-name" className="block text-sm font-medium text-foreground mb-1.5">
                  Account holder name <span className="text-destructive">*</span>
                </label>
                <input id="aff-name" type="text" required value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="aff-routing" className="block text-sm font-medium text-foreground mb-1.5">Routing number <span className="text-destructive">*</span></label>
                  <input id="aff-routing" type="text" required maxLength={9} value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, ""))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="aff-acct" className="block text-sm font-medium text-foreground mb-1.5">Account number <span className="text-destructive">*</span></label>
                  <input id="aff-acct" type="text" required maxLength={17} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))} className={inputClass} />
                </div>
              </div>
            </div>
          )}
        </fieldset>

        <Button variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> Submitting…</> : "Submit application"}
        </Button>
        <p className="text-xs text-muted text-center">
          We review every application personally. You&apos;ll hear back within 48 hours.
        </p>
      </form>
    </div>
  );
}
