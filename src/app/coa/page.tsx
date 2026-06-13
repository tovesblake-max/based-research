import type { Metadata } from "next";
import {
  FlaskConical,
  FileCheck,
  Shield,
  Search,
  Download,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import Button from "@/components/Button";
import CoaRequestForm from "@/components/CoaRequestForm";

export const metadata: Metadata = {
  title: "Lab Results & Certificates of Analysis | Based Research",
  description:
    "View our testing protocols and batch-linked Certificates of Analysis. Every batch HPLC purity-tested by independent A2LA-accredited third-party labs.",
  openGraph: {
    title: "Lab Results | Based Research",
    description:
      "View our testing protocols and batch-linked Certificates of Analysis.",
    type: "website",
  },
};

export default function COAPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 md:py-28 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto">
          <span className="text-xs font-medium uppercase tracking-wider text-primary mb-4 block">
            Lab Results
          </span>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight">
            Every batch tested. Every result public.
          </h1>
          <p className="mt-6 text-muted text-lg leading-relaxed max-w-2xl mx-auto">
            We believe transparency is non-negotiable. Every product we ship
            comes with a batch-linked Certificate of Analysis from an independent
            third-party laboratory.
          </p>
        </div>
      </section>

      {/* What We Test */}
      <section className="py-16 px-4 bg-accent/30 border-y border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl text-foreground text-center mb-10">
            Our Testing Protocol
          </h2>
          <div className="p-6 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                <FlaskConical className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg text-foreground">
                HPLC-UV/VIS Analysis
              </h3>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              Every batch is sent to an A2LA-accredited (ISO 17025:2017)
              independent laboratory for High-Performance Liquid
              Chromatography testing. The lab measures{" "}
              <strong className="text-foreground">chromatographic purity</strong>{" "}
              (we require ≥99%) and{" "}
              <strong className="text-foreground">measured quantity</strong>{" "}
              against the labeled fill weight. The full chromatogram trace
              and the lab&apos;s signed report are included in every COA we
              publish.
            </p>
          </div>
        </div>
      </section>

      {/* What's in a COA */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl text-foreground text-center mb-10">
            What&apos;s in Every COA
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <FileCheck className="w-5 h-5" />, label: "HPLC Chromatogram", color: "text-secondary" },
              { icon: <Shield className="w-5 h-5" />, label: "Purity Percentage", color: "text-success" },
              { icon: <FlaskConical className="w-5 h-5" />, label: "Measured Quantity", color: "text-primary" },
              { icon: <Search className="w-5 h-5" />, label: "Batch / Lot Number", color: "text-primary" },
              { icon: <CheckCircle className="w-5 h-5" />, label: "A2LA-Accredited Lab", color: "text-secondary" },
              { icon: <Download className="w-5 h-5" />, label: "PDF Download Available", color: "text-warm" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 p-4 rounded-lg bg-accent/50 border border-border"
              >
                <div className={item.color}>{item.icon}</div>
                <span className="text-sm font-medium text-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample COA */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl text-foreground text-center mb-8">
            Sample Certificate of Analysis
          </h2>
          <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <div>
                <p className="text-xs text-muted uppercase tracking-wider">Certificate of Analysis</p>
                <p className="font-serif text-xl text-foreground mt-1">BPC-157</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Lot Number</p>
                <p className="font-mono text-sm font-bold text-foreground">SW-BPC-240301</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-accent/50 rounded-lg p-4">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Purity (HPLC)</p>
                <p className="text-2xl font-bold text-success font-mono">99.4%</p>
              </div>
              <div className="bg-accent/50 rounded-lg p-4">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Quantity (HPLC)</p>
                <p className="text-2xl font-bold text-secondary font-mono">5.04 mg</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted">Molecular Weight</span>
                <span className="font-mono font-medium text-foreground">1419.53 g/mol</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted">Appearance</span>
                <span className="font-mono font-medium text-foreground">White lyophilized powder</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted">Test Date</span>
                <span className="font-mono font-medium text-foreground">2024-03-01</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted">Testing Lab</span>
                <span className="font-mono font-medium text-foreground">Independent Third-Party</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">PASS — Meets all specifications</span>
              </div>
              <span className="text-[10px] text-muted uppercase tracking-wider">Sample Only</span>
            </div>
          </div>
        </div>
      </section>

      {/* COA Request Form — opt-in for the actual PDF, replies via email */}
      <section className="py-16 px-4 bg-accent/30 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl text-foreground mb-3">
              Need a COA for a specific batch?
            </h2>
            <p className="text-muted max-w-xl mx-auto">
              We publish samples publicly, but the full PDF for any active
              lot is one click away. Tell us what you need and we&apos;ll
              email it over.
            </p>
          </div>
          <CoaRequestForm />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary to-secondary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl mb-4">
            Questions about our testing?
          </h2>
          <p className="text-white/70 mb-8">
            We&apos;re happy to provide additional information about our testing
            protocols, laboratory partners, or specific batch results.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/catalog">
              <Button variant="secondary" className="bg-white text-primary hover:bg-white/90 font-semibold">Browse Catalog</Button>
            </Link>
            <a href="mailto:support@basedresearch.com">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">Contact Us</Button>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
