import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy | Based Research",
  description:
    "Shipping policy, carriers, rates, delivery timelines, and cold-chain handling for Based Research research peptide orders.",
  robots: { index: true, follow: true },
};

export default function ShippingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
      <h1 className="font-serif text-4xl text-foreground mb-8">Shipping Policy</h1>
      <div className="prose prose-sm text-muted space-y-6 leading-relaxed">
        <p className="text-sm text-muted">Last updated: April 2026</p>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">1. Shipping Areas</h2>
          <p>
            Based Research ships exclusively within the United States, including the 48
            contiguous states, Alaska, and Hawaii. We do not currently ship to US territories,
            APO/FPO addresses, or internationally.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">2. Carrier &amp; Service</h2>
          <p>
            All orders ship via <strong className="text-foreground">UPS 2nd Day Air</strong> from
            our temperature-controlled facility. Tracking is provided on every order and sent to
            your email on file once the shipment is picked up.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">3. Shipping Rates</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Orders over <strong className="text-foreground">$200</strong>: free UPS 2nd Day Air</li>
            <li>Orders under $200: flat <strong className="text-foreground">$14.99</strong> UPS 2nd Day Air</li>
          </ul>
          <p>
            Rates are calculated at checkout based on your cart subtotal and shown before order
            confirmation.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">4. Processing Time</h2>
          <p>
            Orders placed before 12:00 PM CT Monday through Friday ship the same business day.
            Orders placed after the cutoff or on weekends ship the following business day. Most
            customers receive tracking within 24 hours of order confirmation.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">5. Cold-Chain Handling</h2>
          <p>
            Lyophilized peptide research compounds are shipped at ambient temperature in
            insulated, research-grade packaging designed to maintain stability during transit. Upon
            arrival, store products according to the Storage instructions listed on each product
            page (typically −20°C for long-term, 2–8°C for reconstituted solutions).
          </p>
          <p>
            Temperature-sensitive products ship with freezer packs during summer months at no
            additional cost.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">6. Delivery &amp; Signature</h2>
          <p>
            UPS 2nd Day Air typically delivers within 2 business days of shipment. Signature is
            not required by default. If your order is delayed or lost in transit, contact our
            support team at{" "}
            <a href="mailto:support@basedresearch.com" className="text-primary hover:underline">
              support@basedresearch.com
            </a>{" "}
            or{" "}
            <a href="tel:+10000000000" className="text-primary hover:underline">
              (000) 000-0000
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">7. Lost or Damaged Shipments</h2>
          <p>
            If a shipment is marked delivered but not received, please check with neighbors and
            your building management first, then contact us within 48 hours. If the package is
            confirmed lost or arrives damaged, we will ship a replacement at no additional cost or
            issue a full refund per our{" "}
            <a href="/legal/refund" className="text-primary hover:underline">
              Refund Policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">8. Address Accuracy</h2>
          <p>
            You are responsible for providing a complete and accurate shipping address at
            checkout. Shipments returned to us due to an incorrect or incomplete address will
            incur a re-shipment fee of $14.99. We recommend reviewing your address carefully
            before placing an order.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">9. Research Use Only</h2>
          <p>
            All products are intended strictly for in-vitro laboratory research purposes. See our{" "}
            <a href="/legal/research-use-only" className="text-primary hover:underline">
              Research Use Only Policy
            </a>{" "}
            for details.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">10. Contact</h2>
          <p>
            Questions about shipping?
            <br />
            Based Research
            <br />
            [Registered business address]
            <br />
            <a href="mailto:support@basedresearch.com" className="text-primary hover:underline">
              support@basedresearch.com
            </a>
            <br />
            <a href="tel:+10000000000" className="text-primary hover:underline">
              (000) 000-0000
            </a>{" "}
            · Mon–Fri 9AM–5PM CST
          </p>
        </section>
      </div>
    </div>
  );
}
