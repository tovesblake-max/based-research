"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Package, MapPin, User, ArrowRight, Loader2, Mail, CheckCircle2, Truck, Search } from "lucide-react";
import Button from "@/components/Button";

export default function AccountOverview() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [trackInput, setTrackInput] = useState("");

  const isGuest = user && !user.email;

  function submitTrack(e: React.FormEvent) {
    e.preventDefault();
    const raw = trackInput.trim().toUpperCase();
    if (!raw) return;
    // Accept either "BR-MOPXPMMKQ74Y" or just "MOPXPMMKQ74Y" — prepend
    // the prefix when the customer pasted only the suffix.
    const orderNumber = raw.startsWith("BR-") ? raw : `BR-${raw}`;
    router.push(`/track/${encodeURIComponent(orderNumber)}`);
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setSaving(true);
    try {
      const res = await fetch("/api/account/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || "Could not save.");
        setSaving(false);
        return;
      }
      setEmailSuccess(true);
      await refreshUser();
    } catch {
      setEmailError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  const greeting = user?.firstName ? `Welcome back, ${user.firstName}!` : "Welcome back!";

  return (
    <div>
      <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">{greeting}</h1>
      <p className="text-muted text-sm mb-6">Manage your account details, view orders, and update your addresses.</p>

      {/* Track-my-order — top-of-page CTA so customers don't have to
          dig through orders → click → tracking. Accepts the order number
          with or without the BR- prefix; submitting goes straight to
          /track/<orderNumber> which renders live carrier events. */}
      <div className="mb-8 p-5 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Truck className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base text-foreground">Track your order</h2>
            <p className="text-xs text-muted mt-0.5">Enter the order number from your confirmation email — UPS tracking opens straight away.</p>
          </div>
        </div>
        <form onSubmit={submitTrack} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" strokeWidth={1.5} aria-hidden="true" />
            <input
              type="text"
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value)}
              placeholder="BR-MOPXPMMKQ74Y"
              autoComplete="off"
              spellCheck={false}
              className="w-full pl-9 pr-3 h-11 rounded-lg border border-border bg-white text-base sm:text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={!trackInput.trim()}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Track
            <ArrowRight className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </form>
        <p className="text-[11px] text-muted mt-2">
          Or go to <Link href="/account/orders" className="text-primary hover:underline">your order history</Link> to track any past order.
        </p>
      </div>

      {isGuest && (
        <div className="mb-8 p-5 rounded-xl border border-amber-200 bg-amber-50/70">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
              <Mail className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm text-foreground mb-1">
                You&apos;re signed in as a guest
              </h2>
              <p className="text-xs text-muted leading-relaxed mb-3">
                You signed in with phone{user?.phone ? ` ${user.phone}` : ""}. Add your email to receive
                order updates, access order history, and recover your account if you change phones.
              </p>

              {emailSuccess ? (
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  Email saved. Your account is now full.
                </div>
              ) : (
                <form onSubmit={submitEmail} className="flex flex-col sm:flex-row gap-2 max-w-md">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="flex-1 h-10 px-3 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <Button type="submit" variant="primary" size="sm" disabled={saving || !emailInput}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add Email"}
                  </Button>
                </form>
              )}
              {emailError && (
                <p className="text-xs text-destructive mt-2">{emailError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/account/orders"
          className="group p-6 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
            <Package className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-foreground text-sm mb-1">Orders</h3>
          <p className="text-xs text-muted leading-relaxed">View your order history and track shipments.</p>
          <span className="flex items-center gap-1 text-xs text-primary font-medium mt-3 group-hover:gap-2 transition-all">
            View Orders <ArrowRight className="w-3 h-3" />
          </span>
        </Link>

        <Link
          href="/account/profile"
          className="group p-6 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary mb-3">
            <User className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-foreground text-sm mb-1">Profile</h3>
          <p className="text-xs text-muted leading-relaxed">Update your name, email, and password.</p>
          <span className="flex items-center gap-1 text-xs text-primary font-medium mt-3 group-hover:gap-2 transition-all">
            Edit Profile <ArrowRight className="w-3 h-3" />
          </span>
        </Link>

        <Link
          href="/account/addresses"
          className="group p-6 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-warm/10 flex items-center justify-center text-warm mb-3">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-foreground text-sm mb-1">Addresses</h3>
          <p className="text-xs text-muted leading-relaxed">Manage your shipping and billing addresses.</p>
          <span className="flex items-center gap-1 text-xs text-primary font-medium mt-3 group-hover:gap-2 transition-all">
            Manage Addresses <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </div>
    </div>
  );
}
