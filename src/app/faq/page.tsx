import type { Metadata } from "next";
import Accordion from "@/components/Accordion";
import Link from "next/link";
import { Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Based Research",
  description:
    "Find answers about ordering, shipping, product quality, storage, and returns for Based Research research peptides.",
  openGraph: {
    title: "FAQ | Based Research",
    description:
      "Find answers about ordering, shipping, product quality, storage, and returns for Based Research research peptides.",
    type: "website",
  },
};

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  id: string;
  items: FAQItem[];
}

const faqData: FAQSection[] = [
  {
    title: "Ordering",
    id: "ordering",
    items: [
      {
        question: "Do I need an account to place an order?",
        answer:
          "Yes, you need to create a free account to browse our catalog and place orders. This helps us maintain compliance and ensure our products reach qualified researchers.",
      },
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept Visa, Mastercard, and American Express, plus ACH bank transfers from any US bank account. Pay by ACH and you automatically save 5% at checkout.",
      },
      {
        question: "Is there a minimum order amount?",
        answer:
          "No minimum order is required. However, orders over $200 qualify for free US shipping.",
      },
      {
        question: "Can I modify or cancel my order after placing it?",
        answer:
          "Orders can be modified or cancelled within 1 hour of placement. After that, orders enter our fulfillment queue and cannot be changed. Contact support immediately if you need to make changes.",
      },
    ],
  },
  {
    title: "Shipping",
    id: "shipping",
    items: [
      {
        question: "How long does shipping take?",
        answer:
          "Orders placed before 2PM EST Monday\u2013Friday ship the same business day. Standard shipping typically arrives within 2-5 business days. Expedited options are available at checkout.",
      },
      {
        question: "Do you offer free shipping?",
        answer:
          "Yes! All US orders over $200 qualify for free standard shipping. Orders under $200 incur a flat $15 shipping fee.",
      },
      {
        question: "Do you ship internationally?",
        answer:
          "Currently, we ship within the United States only. International shipping is being evaluated and may be available in the future.",
      },
      {
        question: "How are products packaged for shipping?",
        answer:
          "All products are shipped in insulated packaging with cold packs to maintain stability. Lyophilized peptides are stable at ambient temperature for short periods, but we take extra precautions to ensure product integrity during transit.",
      },
    ],
  },
  {
    title: "Quality & Testing",
    id: "quality",
    items: [
      {
        question: "How do you verify product purity?",
        answer:
          "Every batch undergoes independent third-party testing using High-Performance Liquid Chromatography (HPLC) for purity analysis and Mass Spectrometry (MS) for identity confirmation. We require \u226599% purity for all products.",
      },
      {
        question: "Where can I find Certificates of Analysis?",
        answer:
          "COAs are available on each product page and on our dedicated Lab Results page. Every COA is batch-linked and includes HPLC chromatograms, MS data, test date, lot number, and the testing laboratory\u2019s information.",
      },
      {
        question: "Who performs your third-party testing?",
        answer:
          "We partner with accredited analytical laboratories that specialize in peptide characterization. These labs are independent of our manufacturing process, ensuring unbiased results.",
      },
    ],
  },
  {
    title: "Storage & Handling",
    id: "storage",
    items: [
      {
        question: "How should these materials be stored?",
        answer:
          "Lyophilized (freeze-dried) reference materials should be stored at -20\u00b0C for long-term storage. For short-term laboratory use, 2-8\u00b0C is acceptable. Storage guidance is provided per lot on the certificate of analysis.",
      },
    ],
  },
  {
    title: "Returns & Refunds",
    id: "returns",
    items: [
      {
        question: "What is your return policy?",
        answer:
          "Due to the nature of our products and strict quality requirements, we cannot accept returns on opened products. Unopened products in original packaging may be returned within 14 days of delivery for a full refund.",
      },
      {
        question: "What if I receive a damaged product?",
        answer:
          "If your order arrives damaged, contact our support team within 48 hours of delivery with photos of the damage. We will replace the product or issue a full refund at no additional cost.",
      },
    ],
  },
];

// Build FAQ structured data
const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqData.flatMap((section) =>
    section.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    }))
  ),
};

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl md:text-5xl text-foreground">
            Frequently Asked Questions
          </h1>
          <p className="text-muted mt-3">
            Everything you need to know about ordering, shipping, and quality
          </p>
        </div>

        {/* Search prompt (decorative) */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-3 text-muted">
            <Search className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Search questions...</span>
          </div>
        </div>

        {/* Section Nav */}
        <nav className="flex flex-wrap gap-2 mb-10 justify-center" aria-label="FAQ sections">
          {faqData.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="px-4 py-2 text-xs font-semibold rounded-full border border-border bg-card text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm"
            >
              {section.title}
            </a>
          ))}
        </nav>

        {/* FAQ Sections */}
        <div className="space-y-10">
          {faqData.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`heading-${section.id}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 rounded-full bg-secondary" aria-hidden="true" />
                <h2 id={`heading-${section.id}`} className="font-serif text-2xl text-foreground">
                  {section.title}
                </h2>
              </div>
              <div className="space-y-2">
                {section.items.map((item, i) => (
                  <Accordion key={i} question={item.question} answer={item.answer} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-16 text-center p-8 md:p-12 bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-xl">
          <h3 className="font-serif text-2xl text-white mb-2">
            Still have questions?
          </h3>
          <p className="text-sm text-white/80 mb-6">
            Our support team is here to help with any questions about our products
            or services.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="mailto:support@basedresearch.com"
              className="inline-flex items-center justify-center h-11 px-5 text-sm font-medium rounded-lg border border-white text-white hover:bg-white hover:text-primary transition-all duration-200"
            >
              Email Support
            </a>
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center h-11 px-5 text-sm font-medium rounded-lg border border-white/50 text-white hover:bg-white hover:text-primary transition-all duration-200"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
