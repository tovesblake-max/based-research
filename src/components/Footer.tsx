import Link from "next/link";
import Image from "next/image";
import { Shield, Lock, CreditCard, Phone, Mail, MapPin } from "lucide-react";
import RegionSwitcher from "./RegionSwitcher";

// Only the brands our processor actually settles. Don't advertise
// what we can't charge — guaranteed-decline brands re-introduced
// here would just create checkout failures.
const paymentIcons = [
  { src: "/images/payment/visa.svg", alt: "Visa" },
  { src: "/images/payment/mastercard.svg", alt: "Mastercard" },
  { src: "/images/payment/amex.svg", alt: "American Express" },
];

const footerLinks = {
  "Research Categories": [
    { href: "/catalog", label: "Full Catalog" },
    { href: "/catalog?category=metabolic-research", label: "Metabolic Pathway Research" },
    { href: "/catalog?category=tissue-repair-research", label: "Wound-Assay & Matrix Research" },
    { href: "/catalog?category=growth-hormone-research", label: "GH-Axis Receptor Research" },
    { href: "/catalog?category=longevity-research", label: "Cellular & Longevity Research" },
    { href: "/catalog?category=nootropic-research", label: "Neuro Receptor Research" },
    { href: "/catalog?category=inflammation-research", label: "Cytokine-Signaling Research" },
    { href: "/catalog?category=immune-modulation-research", label: "Immune-Assay Research" },
  ],
  Company: [
    { href: "/about", label: "About Us" },
    { href: "/institutional-use", label: "Institutional Use & Eligibility" },
    { href: "/coa", label: "Lab Results" },
    { href: "/faq", label: "FAQ" },
    // Research Blog link removed 2026-05-21 — the external blog carries
    // metabolic / satiety / GH articles with human-applicable framing
    // that doesn't fit the research-use-only compliance posture.
  ],
  Support: [
    { href: "/faq", label: "Help Center" },
    { href: "/faq#shipping", label: "Shipping Info" },
    { href: "/faq#returns", label: "Returns" },
    { href: "/contact", label: "Contact Us" },
    // Affiliate Program link removed 2026-05-21. The /affiliate pages
    // still resolve directly (behind the site-wide auth gate) for any
    // existing partners + admins, but the program is no longer surfaced
    // in public navigation.
  ],
  Legal: [
    { href: "/legal/terms", label: "Terms of Service" },
    { href: "/legal/privacy", label: "Privacy Policy" },
    { href: "/legal/shipping", label: "Shipping Policy" },
    { href: "/legal/refund", label: "Refund Policy" },
    { href: "/legal/research-use-only", label: "Research Use Only" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-footer-bg text-footer-fg mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Top Section */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="block mb-4" aria-label="Based Research home">
              <Image
                src="/images/site/logo-dark.png"
                alt="Based Research"
                width={180}
                height={45}
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-sm text-footer-muted leading-relaxed">
              Research-grade peptides, third-party verified. Every batch tested for purity and identity.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-footer-muted mb-4">
                {title}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-footer-fg/70 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Block — required for Google Merchant Center + card-network compliance */}
        <div className="border-t border-white/10 pt-8 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-footer-muted">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-footer-fg/60" aria-hidden="true" />
              <div>
                <div className="text-footer-fg/80 font-medium mb-0.5">Business Address</div>
                <div>
                  Based Research<br />
                  [Registered business address]
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 flex-shrink-0 mt-0.5 text-footer-fg/60" aria-hidden="true" />
              <div>
                <div className="text-footer-fg/80 font-medium mb-0.5">Phone</div>
                <a href="tel:+10000000000" className="hover:text-white transition-colors">
                  (000) 000-0000
                </a>
                <div className="text-[11px] opacity-70 mt-0.5">Mon–Fri 9AM–5PM CST</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 flex-shrink-0 mt-0.5 text-footer-fg/60" aria-hidden="true" />
              <div>
                <div className="text-footer-fg/80 font-medium mb-0.5">Email</div>
                <a
                  href="mailto:support@basedresearch.com"
                  className="hover:text-white transition-colors break-all"
                >
                  support@basedresearch.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-white/10 pt-8">
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <p className="text-xs text-footer-muted leading-relaxed">
              <strong className="text-footer-fg/80">For Research Use Only.</strong> Products sold by
              Based Research are intended strictly for laboratory research. They are not intended for
              human or animal consumption, therapeutic, diagnostic, or any other commercial use. By
              purchasing from Based Research, you agree to use these products solely for in-vitro
              research purposes and accept full responsibility for compliance with all applicable laws and
              regulations.
            </p>
          </div>

          {/* Payment Methods & Trust Labels */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span className="text-xs text-footer-muted mr-1">We Accept</span>
              {paymentIcons.map((card) => (
                <Image
                  key={card.alt}
                  src={card.src}
                  alt={card.alt}
                  width={50}
                  height={32}
                  className="h-7 w-auto rounded-sm"
                />
              ))}
            </div>

            <div className="flex items-center gap-4 flex-wrap justify-center">
              <div className="flex items-center gap-1.5 text-footer-muted">
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="text-[10px] font-medium uppercase tracking-wider">SSL Secured</span>
              </div>
              <div className="flex items-center gap-1.5 text-footer-muted">
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Verified Seller</span>
              </div>
              <div className="flex items-center gap-1.5 text-footer-muted">
                <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Secure Payments</span>
              </div>
            </div>
          </div>

          {/* Region switcher row — auto-renders only for visitors with
              a Spanish browser OR who've toggled before. Default
              English/USD visitors see nothing here; the wrapper
              collapses entirely when the switcher is hidden. */}
          <RegionSwitcher />

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-footer-muted">
            <p>&copy; {new Date().getFullYear()} Based Research LLC. All rights reserved.</p>
            <p>2-Day Shipping from Cold Storage via UPS</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
