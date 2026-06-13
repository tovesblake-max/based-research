import type { Metadata } from "next";
import SignUpForm from "@/components/SignUpForm";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Create Account | Based Research — Analytical-Grade Biochemical Reference Standards",
  description:
    "Based Research supplies analytical-grade biochemical reference standards for laboratory research use only. A2LA-accredited HPLC verified with batch-linked Certificates of Analysis. For academic, biotech, contract research, and laboratory buyers. Not for human consumption. Must be 21 or older.",
  robots: { index: false, follow: true },
};

export default function SignUpPage() {
  return (
    <>
      <Suspense>
        <SignUpForm />
      </Suspense>

      {/*
        Server-rendered compliance band.

        This is a pure server component, so its full text is in the SSR
        HTML on every request — no JS execution, no hydration, no auth
        required. It exists because the storefront sits behind a site-wide
        signup gate (added 2026-05-21): the sign-up page is the only public
        surface a payment-processor pre-vet crawler can reach, so every
        MCC 5169 compliance signal must live here in plain crawlable text.

        Signals covered (do NOT remove without re-checking the processor
        pre-vet requirements):
          1. age-gate / age verification (21+)
          2. not-for-human-consumption
          3. Certificate of Analysis reference
          4. analytical-grade biochemical reference standards
          5. academic / biotech / contract research / laboratory buyers
          6. research-use-only
      */}
      <section
        aria-label="Compliance and product-use disclosures"
        className="bg-footer-bg text-footer-fg/80 border-t border-white/10"
      >
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-5 text-xs leading-relaxed">
          <div>
            <h2 className="text-footer-fg font-semibold text-sm mb-1.5">
              Analytical-Grade Biochemical Reference Standards
            </h2>
            <p>
              Based Research supplies <strong>analytical-grade biochemical reference standards</strong> intended
              exclusively for in-vitro laboratory research. Our catalog is sold to <strong>academic, biotech,
              contract research organization (CRO), and laboratory buyers</strong> for use as research reagents and
              reference materials. We are a research-supply vendor; we do not sell consumer health products.
            </p>
          </div>

          <div>
            <h2 className="text-footer-fg font-semibold text-sm mb-1.5">Certificates of Analysis</h2>
            <p>
              Every batch is A2LA-accredited <strong>HPLC</strong> verified and ships with a batch-linked{" "}
              <strong>Certificate of Analysis (CoA)</strong> documenting purity and identity. Certificates of
              Analysis are published and verifiable per batch. Sample and batch CoAs are available on request and via
              our public lab-results page.
            </p>
          </div>

          <div>
            <h2 className="text-footer-fg font-semibold text-sm mb-1.5">Age Verification Required (21+)</h2>
            <p>
              <strong>Age verification is required.</strong> You must be <strong>21 years of age or older</strong> and
              a qualified researcher to access this site or create an account. By continuing you affirm that you are
              at least 21 years old. Access is age-gated and restricted to verified, eligible buyers.
            </p>
          </div>

          <div>
            <h2 className="text-footer-fg font-semibold text-sm mb-1.5">Research Use Only — Not For Human Consumption</h2>
            <p>
              <strong>For Research Use Only (RUO).</strong> All products are sold strictly as laboratory research
              materials. They are <strong>not for human consumption</strong>, not for animal consumption, and not
              intended for any therapeutic, diagnostic, cosmetic, or other in-vivo use. Products are not drugs,
              foods, dietary supplements, or medical devices, and have not been evaluated by the FDA. By purchasing,
              you agree to use these products solely for in-vitro research and to comply with all applicable laws and
              regulations.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
