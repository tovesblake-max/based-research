"use client";

import Link from "next/link";
import Button from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";
import { Building2, BadgePercent, Clock, Shield, FileCheck, Users, ArrowRight, CheckCircle } from "lucide-react";

export default function WholesalePage() {
  const { user } = useAuth();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.05)_0%,transparent_50%)]" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto px-4 pt-20 pb-24 text-center">
          <p className="text-sm font-medium text-white/60 tracking-wide uppercase mb-4">
            Wholesale & Institutional Accounts
          </p>
          <h1 className="font-serif text-4xl md:text-5xl leading-[1.1] tracking-tight">
            Bulk Pricing for Research Institutions
          </h1>
          <p className="mt-5 text-base md:text-lg text-white/75 max-w-2xl mx-auto leading-relaxed">
            Dedicated accounts for universities, labs, hospitals, and biotech companies. Volume discounts up to 25%, flexible payment terms, and priority fulfillment.
          </p>
          <div className="mt-8">
            <Link href={user ? "/wholesale/apply" : "/auth/sign-up?redirect=/wholesale/apply"}>
              <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
                Apply for Wholesale <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-2xl md:text-3xl text-foreground text-center mb-10">Account Tiers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { tier: "Tier 1", name: "New", discount: "20%", terms: "Prepaid", desc: "Approved wholesale accounts" },
              { tier: "Tier 2", name: "Established", discount: "22%", terms: "Net 15", desc: "After $1,500+ in orders" },
              { tier: "Tier 3", name: "Verified", discount: "25%", terms: "Net 30", desc: "After $5,000+ in orders" },
              { tier: "Tier 4", name: "Institutional", discount: "Custom", terms: "Net 30-60", desc: "Negotiated pricing" },
            ].map((t) => (
              <div key={t.tier} className="bg-card rounded-xl border border-border p-5">
                <p className="text-[11px] font-medium text-primary uppercase tracking-wider">{t.tier}</p>
                <p className="text-lg font-medium text-foreground mt-1">{t.name}</p>
                <p className="text-2xl font-medium text-foreground mt-2">{t.discount} <span className="text-sm text-muted font-normal">off</span></p>
                <p className="text-xs text-muted mt-1">{t.terms} payment terms</p>
                <p className="text-xs text-muted mt-3 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 bg-accent/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-2xl md:text-3xl text-foreground text-center mb-10">Wholesale Benefits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: BadgePercent, title: "Up to 25% Off", desc: "Volume-based pricing that increases with your order history" },
              { icon: Clock, title: "Flexible Terms", desc: "Prepaid, Net 15, or Net 30 based on your account tier" },
              { icon: Shield, title: "Priority Fulfillment", desc: "Wholesale orders ship first — same-day processing before 2PM EST" },
              { icon: FileCheck, title: "Batch-Level COAs", desc: "Full certificates of analysis for every order, linked to your lot numbers" },
              { icon: Building2, title: "PO-Based Ordering", desc: "Submit purchase orders for institutional procurement workflows" },
              { icon: Users, title: "Dedicated Support", desc: "Direct line to our research team for technical questions and custom orders" },
            ].map((b) => (
              <div key={b.title} className="flex items-start gap-3 bg-card rounded-lg border border-border p-4">
                <b.icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-foreground">{b.title}</p>
                  <p className="text-[13px] text-muted mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Qualifies */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6">Who Qualifies?</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {["Universities", "Research Labs", "Hospitals", "Biotech Companies", "Distributors", "Contract Research Orgs"].map((type) => (
              <div key={type} className="flex items-center gap-2 bg-card rounded-lg border border-border p-3">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span className="text-sm text-foreground">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-2xl md:text-3xl mb-3">Start Saving on Bulk Orders</h2>
          <p className="text-white/70 text-sm mb-6">Applications are reviewed within 24 hours. No commitment required.</p>
          <Link href={user ? "/wholesale/apply" : "/auth/sign-up?redirect=/wholesale/apply"}>
            <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
              Apply Now <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
