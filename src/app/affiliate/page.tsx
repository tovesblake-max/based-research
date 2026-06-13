"use client";

import Link from "next/link";
import Button from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";
import { Users, Link2, Wallet, ArrowRight, Beaker, Shield, FileCheck, Mic2 } from "lucide-react";

/**
 * Public-facing affiliate landing page.
 *
 * Intentionally does NOT advertise the commission rate or any
 * "what could you earn" math. Two reasons:
 *   1. The affiliate's own code can be used as a discount code by
 *      the customer they're referring (and by themselves) — quoting
 *      the rate publicly invites coupon-hunters who apply purely to
 *      get their own personal 10% off.
 *   2. Rate is a negotiating lever per partner. Some affiliates earn
 *      the standard tier, larger partners earn bespoke deals. A
 *      single number on the public page boxes us in.
 *
 * The signup is an APPLICATION (vetted) rather than a self-serve
 * "instant approval" flow. Application notes + name/phone are
 * collected up-front so admin can decide before issuing a code.
 */
export default function AffiliatePage() {
  const { user } = useAuth();
  const ctaHref = user ? "/affiliate/signup" : "/auth/sign-up?redirect=/affiliate/signup";
  const ctaLabel = user ? "Apply to the program" : "Create account & apply";

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.05)_0%,transparent_50%)]" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto px-4 pt-20 pb-24 text-center">
          <p className="text-sm font-medium text-white/60 tracking-wide uppercase mb-4">
            Based Research Partner Program
          </p>
          <h1 className="font-serif text-4xl md:text-5xl leading-[1.1] tracking-tight">
            Partner with a research-grade peptide brand
          </h1>
          <p className="mt-5 text-base md:text-lg text-white/75 max-w-2xl mx-auto leading-relaxed">
            We work with creators, practitioners, and content producers who reach researchers and
            biohackers. Apply below — we review every application personally and respond within 48
            hours.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={ctaHref}>
              <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
                {ctaLabel}
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Button>
            </Link>
            {user && (
              <Link href="/affiliate/dashboard">
                <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10">
                  Go to dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* How it works — 3 steps, no $ numbers */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-2xl md:text-3xl text-foreground text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                icon: FileCheck,
                title: "Apply",
                desc: "Tell us about your audience, platforms, and the kind of content you create. We review every application.",
              },
              {
                step: "2",
                icon: Link2,
                title: "Get your link",
                desc: "Approved partners receive a unique referral link with a custom code. Share it anywhere your audience lives.",
              },
              {
                step: "3",
                icon: Wallet,
                title: "Earn on every order",
                desc: "Lifetime attribution — once someone arrives through your link, every future order they place is credited to you.",
              },
            ].map((item) => (
              <div key={item.step} className="relative bg-card rounded-xl border border-border p-6">
                <span className="absolute -top-3 -left-1 text-4xl font-serif text-primary/10 font-bold">{item.step}</span>
                <item.icon className="w-5 h-5 text-primary mb-3" strokeWidth={1.5} aria-hidden="true" />
                <h3 className="font-medium text-foreground mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why partner — qualitative benefits, no $ math */}
      <section className="py-16 px-4 bg-accent/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-2xl md:text-3xl text-foreground text-center mb-10">Why partner with us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Beaker, title: "Research-grade product", desc: "A2LA-accredited HPLC testing on every batch. Public certificates of analysis. Lot-traceable supply chain." },
              { icon: Shield, title: "Lifetime attribution", desc: "No cookie window, no expiration. Once a customer arrives via your link, they're permanently yours." },
              { icon: Wallet, title: "Crypto or ACH payouts", desc: "Choose USDT/USDC stablecoin or direct US bank transfer. Paid on a regular schedule." },
              { icon: Users, title: "Repeat-buy category", desc: "Research peptides have natural reorder cycles. Your referrals compound over time, not one-and-done." },
              { icon: Mic2, title: "Co-marketing support", desc: "We provide honest product info, batch test data, and content collaboration for partners who want to go deeper than a basic review." },
              { icon: FileCheck, title: "Vetted partners only", desc: "We don't accept everyone. The program is small and quality-controlled — your audience trusts the brand because we keep it clean." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 bg-card rounded-lg border border-border p-4">
                <item.icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-[13px] text-muted mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who we work with — sets expectations on quality */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-3">Who we work with</h2>
          <p className="text-muted text-sm mb-8 max-w-2xl mx-auto leading-relaxed">
            We&apos;re selective about who joins. We look for people whose audiences already trust them
            on the topics where our product fits — biohacking, longevity, performance, recovery,
            functional medicine, lab research. Niche-relevant beats follower count every time.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {[
              "Podcast hosts in health & longevity",
              "Practitioners (functional med, NDs, coaches)",
              "Lab + research professionals",
              "Biohacker / performance creators",
              "Newsletter operators in adjacent verticals",
              "Forum / community moderators",
            ].map((tag) => (
              <div key={tag} className="bg-card rounded-lg border border-border px-4 py-3 text-foreground">
                {tag}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-2xl md:text-3xl mb-3">Ready to apply?</h2>
          <p className="text-white/70 text-sm mb-6">
            Five minutes to fill out the application. We respond within 48 hours.
          </p>
          <Link href={ctaHref}>
            <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
              {ctaLabel}
              <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
