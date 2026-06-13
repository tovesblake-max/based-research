import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research Use Only Policy | Based Research",
  description:
    "Based Research Research Use Only (RUO) policy. All products are intended strictly for in-vitro laboratory research and are not for human or animal consumption.",
  robots: { index: true, follow: true },
};

export default function ResearchUseOnlyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
      <h1 className="font-serif text-4xl text-foreground mb-8">Research Use Only Policy</h1>
      <div className="prose prose-sm text-muted space-y-6 leading-relaxed">
        <p className="text-sm text-muted">Last updated: April 2026</p>

        <div className="bg-warm/5 border-l-4 border-warm p-5 rounded-r-lg not-prose mb-6">
          <p className="text-sm text-foreground font-medium leading-relaxed">
            All products sold by Based Research are intended <strong>strictly for in-vitro
            laboratory research purposes</strong>. They are not for human or animal consumption,
            therapeutic use, diagnostic use, or any other clinical or commercial application.
          </p>
        </div>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">1. Definition of Research Use</h2>
          <p>
            &quot;Research Use Only&quot; (RUO) means the products are intended solely for
            laboratory research — including in-vitro cell culture work, biochemical assays, and
            animal-model studies conducted by qualified researchers within an appropriately
            equipped research facility. RUO products have not been evaluated by the FDA and are
            not intended to diagnose, treat, cure, or prevent any disease or condition.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">2. Who Our Products Are For</h2>
          <p>Our products are sold to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Academic research institutions and universities</li>
            <li>Private research laboratories and biotechnology companies</li>
            <li>Independent researchers who are 21 years of age or older and have the facilities
                and expertise to handle research compounds safely</li>
          </ul>
          <p>
            By purchasing from Based Research, you confirm that you are a qualified researcher
            or institutional professional, that all products will be used strictly for lawful
            research purposes, and that you accept full responsibility for compliance with all
            applicable laws and regulations.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">3. Prohibited Uses</h2>
          <p>Our products are <strong className="text-foreground">not</strong> intended for, and may not be used for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Human consumption, injection, inhalation, topical application, or any other
                human administration</li>
            <li>Animal consumption or veterinary treatment</li>
            <li>Therapeutic, diagnostic, or clinical use of any kind</li>
            <li>Food, dietary supplement, or cosmetic use</li>
            <li>Resale to end consumers for personal use</li>
            <li>Any use that would violate FDA, DEA, state, or local regulations</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">4. Age Verification</h2>
          <p>
            All purchasers must be 21 years of age or older. A 21+ age verification is required
            before accessing our product catalog. We reserve the right to refuse or cancel any
            order if we reasonably believe the purchaser is under 21 or intends to use products
            outside of the research contexts permitted by this policy.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">5. Safe Handling</h2>
          <p>
            Research compounds may be hazardous if mishandled. Purchasers are responsible for:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Reviewing Safety Data Sheets (SDS) before handling any compound</li>
            <li>Using appropriate personal protective equipment (PPE) including gloves, safety
                glasses, and lab coats</li>
            <li>Conducting work in an appropriately ventilated laboratory environment</li>
            <li>Storing compounds per the Storage instructions on each product page</li>
            <li>Disposing of unused material and packaging in accordance with local hazardous
                waste regulations</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">6. Certificates of Analysis</h2>
          <p>
            Every batch of Based Research research compound is independently tested via
            reversed-phase high-performance liquid chromatography (HPLC) for purity and via mass
            spectrometry (MS) for molecular identity. Batch-linked Certificates of Analysis are
            publicly available at{" "}
            <a href="/coa" className="text-primary hover:underline">
              /coa
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">7. Regulatory Compliance</h2>
          <p>
            Compliance with federal, state, and local laws governing the purchase, handling,
            storage, and use of research chemicals is the sole responsibility of the purchaser.
            Laws vary by jurisdiction and change over time. Purchasers should consult their
            institution&apos;s compliance office or legal counsel before ordering.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">8. No Medical Advice</h2>
          <p>
            Information on this site — including product pages, blog articles, research
            summaries, and customer support communications — is provided for educational and
            research-reference purposes only. Nothing on this site is medical advice. Consult a
            qualified healthcare provider for medical questions.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">9. Liability &amp; Hold Harmless</h2>
          <p>
            By purchasing from Based Research, you agree to hold the company, its officers,
            employees, and suppliers harmless from any claims, damages, losses, or liabilities
            arising from the handling, storage, or use of our products. You assume all risk
            associated with the handling and use of research compounds.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">10. Violations</h2>
          <p>
            We actively monitor for misuse of our products and reserve the right to terminate
            accounts, refuse future orders, and report suspected violations to appropriate
            regulatory authorities. Repeat or egregious violations of this policy may result in
            permanent banning and legal action.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">11. Contact</h2>
          <p>
            Questions about this policy?
            <br />
            Based Research
            <br />
            [Registered business address]
            <br />
            <a href="mailto:support@basedresearch.com" className="text-primary hover:underline">
              support@basedresearch.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
