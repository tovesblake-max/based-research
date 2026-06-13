import type { Metadata } from "next";
import Link from "next/link";
import Button from "@/components/Button";
import { ShieldCheck, FileCheck, Building2, GraduationCap, Landmark, FlaskConical, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Institutional Use & Buyer Eligibility | Based Research",
  description:
    "Based Research supplies research reference materials to qualified laboratories, academic researchers, government and institutional buyers, and verified research organizations for in-vitro and non-clinical use only.",
  alternates: { canonical: "https://basedresearch.com/institutional-use" },
  robots: { index: true, follow: true },
};

const ELIGIBLE = [
  {
    icon: <FlaskConical className="w-5 h-5" aria-hidden="true" />,
    title: "Qualified laboratories",
    body: "Commercial, contract, and private research laboratories conducting in-vitro or non-clinical work.",
  },
  {
    icon: <GraduationCap className="w-5 h-5" aria-hidden="true" />,
    title: "Academic researchers",
    body: "University and college faculty, postdoctoral, and research staff purchasing for institutional research.",
  },
  {
    icon: <Landmark className="w-5 h-5" aria-hidden="true" />,
    title: "Government & institutional buyers",
    body: "Government agencies, hospitals, and other institutional procurement offices.",
  },
  {
    icon: <Building2 className="w-5 h-5" aria-hidden="true" />,
    title: "Verified research organizations",
    body: "Biotech, pharmaceutical, and analytical organizations with a documented research function.",
  },
];

export default function InstitutionalUsePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest mb-3">
        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
        Buyer Eligibility
      </div>
      <h1 className="font-serif text-3xl md:text-4xl text-foreground leading-tight">
        Institutional Use &amp; Buyer Eligibility
      </h1>
      <p className="mt-4 text-muted leading-relaxed">
        Based Research supplies analytical reference materials and research compounds for
        in-vitro and non-clinical laboratory use only. We sell exclusively to qualified
        institutional and professional research buyers. Products are not sold for personal use and
        are not intended for human or animal administration, diagnostic, or therapeutic use.
      </p>

      <h2 className="font-serif text-xl text-foreground mt-10 mb-4">Who we supply</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ELIGIBLE.map((e) => (
          <div key={e.title} className="bg-card rounded-xl border border-border p-5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
              {e.icon}
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{e.title}</h3>
            <p className="text-sm text-muted leading-relaxed">{e.body}</p>
          </div>
        ))}
      </div>

      <h2 className="font-serif text-xl text-foreground mt-10 mb-4">Verification &amp; procurement</h2>
      <ul className="space-y-3">
        {[
          "At account creation and checkout, buyers self-certify they are a qualified researcher or authorized institutional buyer. We capture your organization, role/department, and (optionally) EIN, and may request additional documentation for certain orders.",
          "Batch-specific certificates of analysis and supporting documentation are available on request for every lot.",
          "Purchase order and institutional invoicing support is available for qualifying organizations.",
          "All materials are supplied as lyophilized powders for laboratory research use only.",
        ].map((line, i) => (
          <li key={i} className="flex gap-3 text-sm text-foreground leading-relaxed">
            <FileCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-10 p-4 rounded-xl bg-accent/50 border border-border">
        <p className="text-xs text-muted leading-relaxed">
          By creating an account and placing an order, you certify that you are a qualified
          researcher or authorized institutional buyer acquiring these materials for research use
          only, and that the materials will not be used for human or animal consumption,
          diagnostic, or therapeutic purposes.
        </p>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link href="/auth/sign-up">
          <Button variant="primary" size="lg">
            Create an institutional account
            <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
          </Button>
        </Link>
        <Link href="/catalog">
          <Button variant="outline" size="lg">View Catalog</Button>
        </Link>
      </div>
    </div>
  );
}
