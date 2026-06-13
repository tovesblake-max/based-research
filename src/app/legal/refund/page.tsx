import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | Based Research",
  description: "Based Research refund and return policy for research peptide products.",
  robots: { index: true, follow: true },
};

export default function RefundPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
      <h1 className="font-serif text-4xl text-foreground mb-8">Refund Policy</h1>
      <div className="prose prose-sm text-muted space-y-6 leading-relaxed">
        <p className="text-sm text-muted">Last updated: April 2026</p>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">1. Unopened Products</h2>
          <p>
            Unopened products in their original sealed packaging may be returned within 14 days of
            delivery for a full refund. Products must be in their original condition with all seals
            intact. Contact our support team to initiate a return.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">2. Opened Products</h2>
          <p>
            Due to the sensitive nature of research compounds and strict quality control
            requirements, we cannot accept returns on opened or used products. This policy ensures
            the integrity of all products in our supply chain.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">3. Damaged or Defective Products</h2>
          <p>
            If your order arrives damaged or you believe a product is defective, contact our support
            team within 48 hours of delivery. Please include photos of the damage and your order
            number. We will replace the product or issue a full refund at no additional cost.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">4. Order Cancellation</h2>
          <p>
            Orders may be cancelled within 1 hour of placement for a full refund. After this window,
            orders enter our fulfillment process and cannot be cancelled. Contact support immediately
            if you need to cancel.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">5. Refund Processing</h2>
          <p>
            Approved refunds are processed within 5-7 business days. Refunds are issued to the
            original payment method. Shipping costs are non-refundable unless the return is due to
            our error or a defective product.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">6. Contact</h2>
          <p>
            To initiate a return or report an issue, contact us at{" "}
            <a href="mailto:support@basedresearch.com" className="text-primary hover:underline">
              support@basedresearch.com
            </a>.
          </p>
          <p className="mt-3 text-sm text-muted">
            Based Research is operated by Based Research LLC. Registered business address
            available upon request.
          </p>
        </section>
      </div>
    </div>
  );
}
