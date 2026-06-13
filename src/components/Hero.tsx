import Link from "next/link";
import Button from "./Button";
import { IS_OPEN_MODE } from "@/lib/site-mode";
import { ArrowRight, FileCheck, CheckCircle, Shield, FlaskConical, Award, Microscope, Truck } from "lucide-react";

function TrustSeals() {
  return (
    <div className="flex items-center gap-3 sm:gap-4 justify-center flex-wrap">
      <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-card border-2 border-primary/20 flex items-center justify-center shadow-sm" title="99%+ Purity Guaranteed">
        <div className="text-center leading-none">
          <span className="text-[10px] lg:text-[11px] font-bold text-primary block">99%</span>
          <span className="text-[6px] lg:text-[7px] text-muted uppercase tracking-wider -mt-px block">Purity</span>
        </div>
      </div>
      <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-card border-2 border-primary/20 flex items-center justify-center shadow-sm" title="USA Lab Certified">
        <div className="text-center leading-none">
          <Award className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary mx-auto" aria-hidden="true" />
          <span className="text-[6px] lg:text-[7px] text-muted uppercase tracking-wider mt-0.5 block">USA</span>
        </div>
      </div>
      <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-card border-2 border-primary/20 flex items-center justify-center shadow-sm" title="3rd Party Verified">
        <div className="text-center leading-none">
          <Microscope className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary mx-auto" aria-hidden="true" />
          <span className="text-[6px] lg:text-[7px] text-muted uppercase tracking-wider mt-0.5 block">3rd Party</span>
        </div>
      </div>
      <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-card border-2 border-primary/20 flex items-center justify-center shadow-sm" title="Advanced Analysis">
        <div className="text-center leading-none">
          <Shield className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary mx-auto" aria-hidden="true" />
          <span className="text-[6px] lg:text-[7px] text-muted uppercase tracking-wider mt-0.5 block">Verified</span>
        </div>
      </div>
      <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-card border-2 border-primary/20 flex items-center justify-center shadow-sm" title="A2LA HPLC Verified">
        <div className="text-center leading-none">
          <FlaskConical className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary mx-auto" aria-hidden="true" />
          <span className="text-[6px] lg:text-[7px] text-muted uppercase tracking-wider mt-0.5 block">A2LA HPLC</span>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#e8f0f8] via-[#edf3fa] to-[#dce8f4]">
      <div className="relative max-w-3xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
        {/* Eyebrow */}
        <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-4">
          {IS_OPEN_MODE
            ? "A2LA-ACCREDITED HPLC VERIFIED · THIRD-PARTY TESTED, EVERY BATCH"
            : "A2LA-ACCREDITED HPLC VERIFIED · INSTITUTIONAL & QUALIFIED-LAB SUPPLY"}
        </p>

        {/* Headline */}
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] text-foreground leading-[1.05] tracking-tight">
          High-Purity Lyophilized Research Compounds
        </h1>

        {/* Description */}
        <p className="mt-5 text-base md:text-lg text-muted max-w-xl mx-auto leading-relaxed">
          Explore our wide selection of <strong className="text-foreground">99%+ purified, lyophilized research compounds</strong> in powder form, such as BPC-157, TB-500, GHK-Cu, Ipamorelin and more.
        </p>

        {/* Trust seals */}
        <div className="mt-8">
          <TrustSeals />
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link href="/catalog" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              View Catalog
              <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
          </Link>
          <Link href="/coa" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <FileCheck className="w-4 h-4 mr-2" aria-hidden="true" />
              View Lab Results
            </Button>
          </Link>
        </div>

        {/* Same-day shipping urgency */}
        <p className="mt-5 text-xs text-muted tracking-wide">
          <Truck className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-primary" aria-hidden="true" />
          Orders before 2PM EST ship same day
        </p>

        {/* Eligibility / trust banner */}
        <p className="mt-4 text-sm text-muted max-w-lg mx-auto">
          {IS_OPEN_MODE ? (
            <>99%+ purity, third-party tested, with public Certificates of Analysis. For laboratory research use only.</>
          ) : (
            <>
              Supplied to qualified labs, academic researchers, and institutional buyers.{" "}
              <Link href="/institutional-use" className="text-primary font-semibold hover:underline">Buyer eligibility &amp; research-use certification</Link>.
            </>
          )}
        </p>

        {/* Procurement cues */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2.5">
            <FileCheck className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
            <span className="text-sm text-foreground">Batch documentation &amp; COA on request</span>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2.5">
            <FlaskConical className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
            <span className="text-sm text-foreground">HPLC-verified identity &amp; purity</span>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2.5">
            <CheckCircle className="w-4 h-4 text-success flex-shrink-0" aria-hidden="true" />
            <span className="text-sm text-foreground">For qualified labs &amp; institutional buyers</span>
          </div>
        </div>
      </div>
    </section>
  );
}
