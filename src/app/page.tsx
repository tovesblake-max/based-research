import type { Metadata } from "next";
import Hero from "@/components/Hero";
import TrustBadges from "@/components/TrustBadges";
import MembershipBar from "@/components/MembershipBar";
import ProductCard from "@/components/ProductCard";
import { getFeaturedProducts } from "@/lib/products";
import { categories } from "@/lib/categories";
import Link from "next/link";
import Button from "@/components/Button";
import {
  ArrowRight,
  FlaskConical,
  Eye,
  Zap,
  Heart,
  Scale,
  TrendingUp,  Flame,
  Shield,
  FileCheck,
  Clock,
  ShieldCheck,
  Brain,
  Package,
  Moon,
  Tag,
} from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  "metabolic-research": <Scale className="w-6 h-6" aria-hidden="true" />,
  "tissue-repair-research": <Heart className="w-6 h-6" aria-hidden="true" />,
  "growth-hormone-research": <TrendingUp className="w-6 h-6" aria-hidden="true" />,
  "longevity-research": <Clock className="w-6 h-6" aria-hidden="true" />,
  "nootropic-research": <Brain className="w-6 h-6" aria-hidden="true" />,
  "inflammation-research": <Shield className="w-6 h-6" aria-hidden="true" />,
  "neuroendocrine-research": <Flame className="w-6 h-6" aria-hidden="true" />,
  "immune-modulation-research": <ShieldCheck className="w-6 h-6" aria-hidden="true" />,
  "circadian-research": <Moon className="w-6 h-6" aria-hidden="true" />,
  clearance: <Tag className="w-6 h-6" aria-hidden="true" />,
  accessories: <Package className="w-6 h-6" aria-hidden="true" />,
};

// Homepage-specific metadata. Overrides the site-wide default (set in
// layout.tsx) so the home title/description describe the catalog as
// lyophilized research compounds rather than using the prior term.
export const metadata: Metadata = {
  title: "Based Research | High-Purity Lyophilized Research Compounds",
  description:
    "A2LA-accredited HPLC-tested, lyophilized research compounds in powder form. Public batch-linked certificates of analysis. Free US shipping over $200.",
  alternates: { canonical: "https://basedresearch.com" },
  openGraph: {
    title: "Based Research | High-Purity Lyophilized Research Compounds",
    description:
      "A2LA-accredited HPLC-tested, lyophilized research compounds in powder form. Public batch-linked certificates of analysis. Free US shipping over $200.",
    url: "https://basedresearch.com",
    type: "website",
  },
};

export default function HomePage() {
  const featured = getFeaturedProducts();

  return (
    <>
      {/* Hero */}
      <Hero />

      {/* Advanced Lab Testing Bar */}
      <section className="py-6 border-y border-border bg-accent/30">
        <TrustBadges />
      </section>

      {/* Why Become a Member — hidden when logged in */}
      <MembershipBar />

      {/* Featured Products */}
      <section className="py-12 px-4 bg-accent/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-serif text-2xl md:text-3xl text-foreground">
                Featured Products
              </h2>
              <p className="text-muted mt-1 text-sm">Our most popular research compounds</p>
            </div>
            <Link
              href="/catalog"
              className="hidden md:flex items-center gap-1 text-sm text-primary font-medium hover:gap-2 transition-all"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link href="/catalog">
              <Button variant="outline">
                View All Products <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Based Research — trust differentiators */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">
              Why Based Research
            </h2>
            <p className="text-muted mt-2">
              Built on transparency, precision, and trust
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary mx-auto mb-4">
                <FlaskConical className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl text-foreground mb-2">
                99%+ Purity
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Every batch is independently HPLC-verified by an
                A2LA-accredited (ISO 17025:2017) third-party laboratory.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <Eye className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl text-foreground mb-2">
                Full Transparency
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Public, batch-linked certificates of analysis. Every COA includes
                HPLC chromatograms, MS identity confirmation, and lot numbers.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-warm/10 flex items-center justify-center text-warm mx-auto mb-4">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl text-foreground mb-2">
                Procurement Ready
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Purchase orders and institutional invoicing supported. Orders
                placed before 2PM EST ship the same business day with tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-4 bg-accent/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">
              Research Categories
            </h2>
            <p className="text-muted mt-2">
              Browse compounds by area of research
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalog?category=${cat.id}`}
                className="group p-6 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mb-4 group-hover:bg-secondary/15 transition-colors">
                  {categoryIcons[cat.id] || <FlaskConical className="w-6 h-6" />}
                </div>
                <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {cat.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 px-4 bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Shield className="w-5 h-5 text-white/80" aria-hidden="true" />
              <span className="text-2xl md:text-3xl font-bold">99%+</span>
            </div>
            <p className="text-sm text-white/70">Verified Purity</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <FileCheck className="w-5 h-5 text-white/80" aria-hidden="true" />
              <span className="text-2xl md:text-3xl font-bold">COA</span>
            </div>
            <p className="text-sm text-white/70">Batch Documentation</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-5 h-5 text-white/80" aria-hidden="true" />
              <span className="text-2xl md:text-3xl font-bold">Same Day</span>
            </div>
            <p className="text-sm text-white/70">Shipping Before 2PM EST</p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-foreground">
            Ready to start your research?
          </h2>
          <p className="mt-4 text-muted text-lg">
            Browse our complete catalog of third-party verified, lyophilized research compounds.
          </p>
          <p className="mt-2 text-sm text-muted/80 font-medium">
            Orders placed before 2PM EST ship the same business day
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link href="/catalog">
              <Button variant="primary" size="lg">
                Browse Catalog <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/institutional-use">
              <Button variant="outline" size="lg">
                Institutional Use &amp; Eligibility
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
