import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Based Research",
  description: "Terms and conditions for using Based Research products and services.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
      <h1 className="font-serif text-4xl text-foreground mb-8">Terms of Service</h1>
      <div className="prose prose-sm text-muted space-y-6 leading-relaxed">
        <p className="text-sm text-muted">Last updated: April 2026</p>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">1. Agreement to Terms</h2>
          <p>
            By accessing or using the Based Research website and purchasing products, you agree
            to be bound by these Terms of Service. If you do not agree to these terms, do not use
            our services.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">2. Research Use Only</h2>
          <p>
            All products sold by Based Research are for laboratory research use only. They are
            not for human or veterinary use, and not for diagnostic or therapeutic use. By
            purchasing, you confirm that you will use products solely for lawful research purposes.
          </p>
          <p className="mt-3">
            Products are not drugs, dietary supplements, foods, cosmetics, or medical devices. They
            have not been submitted for regulatory review and are not validated, approved, or
            cleared for clinical, therapeutic, diagnostic, prophylactic, or any in-vivo use in humans
            or animals, and have not been evaluated for safety or efficacy in any such use. Products
            are supplied without any warranty, express or implied, of fitness for clinical,
            therapeutic, or diagnostic application. Any use of a product outside of controlled
            laboratory research is solely at the purchaser&apos;s risk and responsibility.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">3. Account Registration</h2>
          <p>
            You must create an account to place orders. You are responsible for maintaining the
            confidentiality of your account credentials and for all activity that occurs under your
            account.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">4. Pricing and Payment</h2>
          <p>
            All prices are listed in US dollars and are subject to change without notice. Payment is
            due at the time of order. We accept Visa, Mastercard, and American Express,
            plus ACH bank transfers from any US bank account.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">5. Shipping and Delivery</h2>
          <p>
            Orders placed before 2PM EST on business days ship the same day. Shipping times are
            estimates and not guaranteed. Risk of loss passes to you upon delivery to the carrier.
            Free shipping is available on US orders over $200.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">6. Limitation of Liability</h2>
          <p>
            Based Research shall not be liable for any indirect, incidental, special, or
            consequential damages arising from the use or inability to use our products or services.
            Our total liability shall not exceed the amount paid for the specific product at issue.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">7. Contact &amp; Operating Entity</h2>
          <p>
            Based Research is operated by Based Research LLC, a limited liability company.
            References to &ldquo;Based Research,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo; in these Terms mean Based Research LLC.
          </p>
          <p>
            For questions about these terms, contact us at{" "}
            <a href="mailto:support@basedresearch.com" className="text-primary hover:underline">
              support@basedresearch.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
