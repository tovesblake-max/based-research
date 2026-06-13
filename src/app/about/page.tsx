import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical, Shield, Eye, Award, Microscope, Beaker, CheckCircle, ArrowRight } from "lucide-react";
import TrustBadges from "@/components/TrustBadges";
import Button from "@/components/Button";

export const metadata: Metadata = {
  title: "About Us | Based Research",
  description:
    "Learn about Based Research — our mission, values, and rigorous four-step testing process. Built on trust, driven by science.",
  openGraph: {
    title: "About Based Research",
    description:
      "Learn about Based Research — our mission, values, and rigorous four-step testing process.",
    type: "website",
  },
};

const values = [
  {
    icon: <FlaskConical className="w-7 h-7" aria-hidden="true" />,
    title: "Precision",
    description:
      "Every compound is synthesized to exacting standards and verified through independent analytical testing. We accept nothing less than 99%+ purity.",
    iconBg: "bg-secondary/10",
    iconColor: "text-secondary",
  },
  {
    icon: <Eye className="w-7 h-7" aria-hidden="true" />,
    title: "Transparency",
    description:
      "Public, batch-linked certificates of analysis. Full HPLC chromatograms from an A2LA-accredited independent lab on every product we sell.",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: <Shield className="w-7 h-7" aria-hidden="true" />,
    title: "Integrity",
    description:
      "We exist to serve the research community. Every decision we make—from sourcing to shipping—prioritizes the quality and reliability of our products.",
    iconBg: "bg-warm/10",
    iconColor: "text-warm",
  },
];

const process = [
  {
    step: "01",
    icon: <Beaker className="w-6 h-6" aria-hidden="true" />,
    title: "Synthesis",
    description:
      "Peptides are synthesized using solid-phase peptide synthesis (SPPS) in cGMP-compliant facilities with rigorous quality controls.",
    iconBg: "bg-primary/8",
    iconColor: "text-primary",
  },
  {
    step: "02",
    icon: <Microscope className="w-6 h-6" aria-hidden="true" />,
    title: "HPLC Testing",
    description:
      "High-Performance Liquid Chromatography confirms purity levels. We require ≥99% purity for every batch before it enters our catalog.",
    iconBg: "bg-secondary/10",
    iconColor: "text-secondary",
  },
  {
    step: "03",
    icon: <FlaskConical className="w-6 h-6" aria-hidden="true" />,
    title: "Mass Spectrometry",
    description:
      "Mass spec analysis verifies molecular identity, confirming the compound matches its expected molecular weight and structure.",
    iconBg: "bg-primary/8",
    iconColor: "text-primary",
  },
  {
    step: "04",
    icon: <CheckCircle className="w-6 h-6" aria-hidden="true" />,
    title: "Certificate Issued",
    description:
      "A batch-linked Certificate of Analysis is generated and made publicly available, complete with chromatograms and test data.",
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 md:py-28 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto">
          <span className="text-xs font-medium uppercase tracking-wider text-primary mb-4 block">
            About Us
          </span>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight">
            Built on trust, driven by science.
          </h1>
          <p className="mt-6 text-muted text-lg leading-relaxed max-w-2xl mx-auto">
            Based Research was founded on a simple premise: researchers
            deserve access to verified, high-purity peptides with full
            analytical transparency. No compromises.
          </p>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-y border-border bg-accent/30">
        <TrustBadges />
      </section>

      {/* Our Story */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl text-foreground mb-6">Our Story</h2>
          <div className="space-y-4 text-muted leading-relaxed">
            <p>
              The research peptide market has long been plagued by inconsistency.
              Vendors making purity claims without public verification. Certificates
              of analysis that can&apos;t be independently confirmed. Compounds that
              don&apos;t match their labels.
            </p>
            <p>
              Based Research was created to be different. We believe that the
              foundation of good research is good materials—and good materials
              require verifiable quality. That&apos;s why every batch we sell undergoes
              independent A2LA-accredited HPLC purity testing, with results
              published publicly and linked to specific lot numbers.
            </p>
            <p>
              Our name reflects our philosophy. Still water runs deep. Beneath a
              calm surface lies rigorous methodology, meticulous quality control,
              and an unwavering commitment to the research community.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 bg-accent/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">
              Our Values
            </h2>
            <p className="text-muted mt-2">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value) => (
              <div key={value.title} className="text-center">
                <div className={`w-14 h-14 rounded-2xl ${value.iconBg} flex items-center justify-center ${value.iconColor} mx-auto mb-4`}>
                  {value.icon}
                </div>
                <h3 className="font-serif text-xl text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testing Process */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">
              Our Testing Process
            </h2>
            <p className="text-muted mt-2">
              Four steps. Zero shortcuts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {process.map((step) => (
              <div
                key={step.step}
                className="p-6 rounded-xl border border-border bg-card"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl font-serif text-primary/30 font-bold">
                    {step.step}
                  </span>
                  <div className={`w-10 h-10 rounded-lg ${step.iconBg} flex items-center justify-center ${step.iconColor}`}>
                    {step.icon}
                  </div>
                </div>
                <h3 className="font-serif text-lg text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quality Badge */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <Award className="w-12 h-12 mx-auto mb-4 text-white/80" aria-hidden="true" />
          <h2 className="font-serif text-3xl">2-Day Shipping from Cold Storage</h2>
          <p className="mt-3 text-white/70">
            All orders ship within 24 hours via UPS from temperature-controlled
            cold storage facilities to ensure maximum peptide integrity.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl text-foreground mb-4">
            Ready to explore our catalog?
          </h2>
          <p className="text-muted mb-8">
            Browse our full range of third-party verified research peptides.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/catalog">
              <Button variant="primary" size="lg">
                Browse Catalog <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/membership">
              <Button variant="outline" size="lg">
                Join Free Membership
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
