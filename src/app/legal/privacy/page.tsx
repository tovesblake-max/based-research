import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Based Research",
  description: "How Based Research collects, uses, and protects your personal information.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
      <h1 className="font-serif text-4xl text-foreground mb-8">Privacy Policy</h1>
      <div className="prose prose-sm text-muted space-y-6 leading-relaxed">
        <p className="text-sm text-muted">Last updated: April 2026</p>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">1. Information We Collect</h2>
          <p>
            We collect information you provide directly: name, email address, shipping address,
            and payment information when you create an account or place an order. We also collect
            usage data such as pages visited and browser type through standard web analytics.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">2. How We Use Your Information</h2>
          <p>
            We use your information to process orders, communicate about your account, improve our
            services, and comply with legal obligations. We do not sell your personal information
            to third parties.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">3. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your personal information,
            including encryption of data in transit and at rest. Payment processing is handled by
            PCI-compliant third-party providers.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">4. Cookies</h2>
          <p>
            We use essential cookies to maintain your shopping cart and session. We may use
            analytics cookies to understand how visitors interact with our site. You can control
            cookie preferences through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">5. Third-Party Services</h2>
          <p>
            We may share necessary information with payment processors, shipping carriers, and
            analytics providers to fulfill orders and improve our services. These partners are
            contractually obligated to protect your information.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">6. Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at any time
            by contacting us. We will respond to requests within 30 days.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mt-8 mb-3">7. Data Controller &amp; Contact</h2>
          <p>
            The entity responsible for your personal information (the data controller) is Based
            Research LLC, with its registered business address available upon request.
          </p>
          <p>
            For privacy-related inquiries, contact us at{" "}
            <a href="mailto:support@basedresearch.com" className="text-primary hover:underline">
              support@basedresearch.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
