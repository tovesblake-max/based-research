import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/Button";
import { getProductBySlug, getStartingPrice } from "@/lib/products";
import { getProductImagePath } from "@/lib/product-images";
import { formatPriceShort } from "@/lib/utils";
import {
  ArrowRight,
  FlaskConical,
  CheckCircle,
  XCircle,
  FileCheck,
  Truck,
  Shield,
  ChevronRight,
  AlertTriangle,
  Thermometer,
} from "lucide-react";

export const metadata: Metadata = {
  title:
    "Why The Same Vendor Ships Two Lots Of Tesamorelin That Behave Differently. A Research-Supply Investigation.",
  description:
    "Tesamorelin is a 44-residue GHRH analog that's easy to mishandle and hard to verify. A look at what separates a research-grade lot from one that quietly degraded in transit.",
  alternates: { canonical: "https://basedresearch.com/research/tesamorelin" },
  openGraph: {
    title: "The Tesamorelin Supply Problem",
    description:
      "A research-supply investigation into why tesamorelin lots vary wildly, what cold-chain failures look like on an HPLC trace, and what to verify before the next order goes out.",
    type: "article",
    url: "https://basedresearch.com/research/tesamorelin",
    images: [
      {
        url: "https://basedresearch.com/images/products/tesamorelin.webp",
        width: 1200,
        height: 1200,
        alt: "Research-grade tesamorelin vial",
      },
    ],
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "Why The Same Vendor Ships Two Lots Of Tesamorelin That Behave Differently",
  description:
    "A research-supply investigation into tesamorelin handling, HPLC verification, and cold-chain failures across the vendor layer.",
  datePublished: "2026-05-18",
  dateModified: "2026-05-18",
  author: {
    "@type": "Organization",
    name: "Based Research Research Desk",
    url: "https://basedresearch.com",
  },
  publisher: {
    "@type": "Organization",
    name: "Based Research",
    url: "https://basedresearch.com",
    logo: {
      "@type": "ImageObject",
      url: "https://basedresearch.com/images/site/logo-light.png",
    },
  },
  isAccessibleForFree: true,
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://basedresearch.com" },
    { "@type": "ListItem", position: 2, name: "Research", item: "https://basedresearch.com/research" },
    {
      "@type": "ListItem",
      position: 3,
      name: "Tesamorelin Supply Investigation",
      item: "https://basedresearch.com/research/tesamorelin",
    },
  ],
};

export default function TesamorelinAdvertorial() {
  const product = getProductBySlug("tesamorelin");
  if (!product) return null;

  const price = formatPriceShort(getStartingPrice(product));
  const image = getProductImagePath("tesamorelin");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* ── Editorial Masthead ─────────────────────────────── */}
      <div className="border-b border-border bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-muted">
            <span className="font-bold tracking-[0.2em] text-foreground uppercase">
              Based Research Desk
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="hidden sm:inline">Research-Supply Investigation</span>
          </div>
          <span className="text-muted">May 18, 2026</span>
        </div>
      </div>

      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <nav
        className="max-w-3xl mx-auto px-4 pt-8 flex items-center gap-1.5 text-xs text-muted"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" aria-hidden="true" />
        <span>Research</span>
        <ChevronRight className="w-3 h-3" aria-hidden="true" />
        <span className="text-foreground">Tesamorelin Investigation</span>
      </nav>

      <article className="max-w-3xl mx-auto px-4 pt-6 pb-16">
        {/* ── HEADLINE + LEAD ───────────────────────────────── */}
        <div className="mb-3">
          <span className="inline-block text-[10px] font-bold tracking-[0.22em] text-warm bg-warm/10 px-2.5 py-1 rounded-sm uppercase">
            Investigation
          </span>
        </div>

        <h1 className="font-serif text-4xl md:text-5xl leading-[1.1] text-foreground tracking-tight mb-5">
          Why the same vendor ships two lots of tesamorelin that behave
          differently. A research-supply investigation.
        </h1>

        <p className="text-lg md:text-xl text-muted leading-relaxed mb-6 font-light">
          Tesamorelin is a 44-residue GHRH analog. It is one of the most
          commonly mishandled peptides at the vendor layer, and almost none of
          the mishandling is visible on a spec sheet. What an honest supplier
          actually has to do to ship a lot that reproduces the published work.
        </p>

        <div className="flex items-center gap-3 pb-6 border-b border-border text-xs text-muted">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="text-foreground font-medium">Based Research Research Desk</div>
            <div>6 min read · Research Brief</div>
          </div>
        </div>

        {/* Lead image */}
        <div className="my-8 aspect-square md:aspect-[4/3] relative rounded-xl overflow-hidden bg-accent">
          <Image
            src={image}
            alt="Research-grade tesamorelin lyophilizate in its sealed vial"
            fill
            sizes="(min-width: 768px) 720px, 100vw"
            className="object-contain"
            priority
          />
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
            <p className="text-[11px] text-white/80">
              A research-grade tesamorelin lyophilizate. The interesting work
              happens before this vial is sealed.
            </p>
          </div>
        </div>

        {/* ── Opening ─────────────────────────────────────── */}
        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          <span className="float-left font-serif text-6xl leading-[0.85] mr-2 mt-1 text-primary">T</span>
          alk to enough labs working with tesamorelin and the same complaint
          repeats. One lot stimulates GH-axis markers the way the published
          rodent models describe. The next lot, from the same vendor, ordered
          two months later, behaves like a different molecule entirely. Same
          CAS number on the bottle. Same purity claim on the COA. Different
          outcomes in the same assay, on the same instrument, with the same
          operator.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Researchers blame their cell lines. They blame the GHRH-receptor
          antibody. They re-validate their ELISAs. They rarely look at the
          peptide itself, because the peptide&apos;s paperwork says it&apos;s fine.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          Tesamorelin is one of the easiest peptides on the market to ship
          wrong and one of the hardest to verify after the fact. It is also
          almost never the cell line.
        </p>

        {/* ── Stat callout #1 ────────────────────────────── */}
        <div className="my-10 grid grid-cols-3 gap-3">
          {[
            { stat: "44", label: "Amino acid residues. Long enough to aggregate, short enough to be mistaken for a smaller GHRH fragment" },
            { stat: "5,136", label: "Da molecular weight. Most lots that arrive degraded read low on mass spec" },
            { stat: "−20°C", label: "Storage requirement before reconstitution. Vendors who ship ambient are a problem" },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 rounded-lg border border-border bg-accent/30">
              <div className="font-serif text-2xl md:text-3xl text-foreground font-bold">{s.stat}</div>
              <div className="text-[10px] md:text-xs text-muted mt-1.5 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Section 1: The biology context ─────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          What tesamorelin is. Mechanistically.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Tesamorelin is a synthetic analog of human growth-hormone-releasing
          hormone (GHRH). The native peptide is 44 amino acids; tesamorelin
          differs by a single N-terminal modification, a trans-3-hexenoyl
          group, that protects it from cleavage by dipeptidyl-peptidase-IV
          (DPP-IV) and meaningfully extends its half-life in circulation.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Mechanistically, it binds the GHRH receptor on anterior pituitary
          somatotrophs and stimulates pulsatile endogenous GH release. The
          downstream cascade through IGF-1 is what most of the published
          rodent work measures. Egrie 2010
          <sup><a href="#r1" className="text-primary">1</a></sup> and the
          Falutz et al. clinical-research lineage
          <sup><a href="#r2" className="text-primary">2</a></sup> established
          the basic pharmacology. Stanley et al. 2014
          <sup><a href="#r3" className="text-primary">3</a></sup> documented
          the visceral-adipose-tissue compartment effect that drew the
          metabolic-research community to it.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          For researchers, the interesting thing about tesamorelin is that it
          acts upstream of the GH axis rather than substituting for GH
          itself. Pulsatile rather than tonic. Researchers studying GH-axis
          regulation get a tool that&apos;s pharmacologically distinct from
          recombinant hGH. The whole utility depends on the molecule actually
          being intact.
        </p>

        {/* Pull quote */}
        <blockquote className="border-l-4 border-primary pl-6 py-2 my-12">
          <p className="font-serif text-xl md:text-2xl text-foreground leading-snug italic">
            &quot;A 44-residue peptide is long enough that any single bond
            cleavage anywhere along the backbone produces two fragments,
            either of which can show up on a less-rigorous HPLC method as if
            it were the parent peptide.&quot;
          </p>
          <cite className="text-xs text-muted block mt-3 not-italic">
            Based Research Desk, internal QC note
          </cite>
        </blockquote>

        {/* ── Section 2: What goes wrong ────────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          What goes wrong, and why nobody notices.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Three failure modes dominate tesamorelin supply. None of them get
          flagged by the kind of COA that ships with a typical research
          sample.
        </p>

        <div className="space-y-3 mb-8">
          <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
            <div>
              <p className="font-semibold text-foreground mb-1">Thermal degradation in transit</p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Tesamorelin is shipped lyophilized for a reason: in solution
                it&apos;s thermally unstable above 8°C. Shipped without cold
                packs, sitting on a porch in summer for three hours, the
                lyophilized cake itself starts to deamidate at the asparagine
                and glutamine residues. The damage is invisible. The vial
                looks identical. Mass spec catches it; a simple A280 read
                does not.
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
            <div>
              <p className="font-semibold text-foreground mb-1">Aggregation during reconstitution</p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Tesamorelin is hydrophobic enough to aggregate aggressively
                if reconstituted with too much agitation or in the wrong
                vehicle (acidic saline is a common mistake; bacteriostatic
                water at pH ~5.7 is what the original work used). Aggregates
                don&apos;t bind the GHRH receptor. They also don&apos;t show up on a
                purity reading because they pellet out before injection.
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
            <div>
              <p className="font-semibold text-foreground mb-1">Truncation at the N-terminal modification</p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                The defining feature of tesamorelin is the
                trans-3-hexenoyl group at the N-terminus. Lose that group
                during synthesis or workup and what you have is native GHRH
                (44 amino acids, same MW within ~100 Da), which is
                pharmacologically much shorter-acting. Most COAs report MW
                with enough tolerance that a hexenoyl-cleaved sample passes
                undetected.
              </p>
            </div>
          </div>
        </div>

        {/* ── Callout ───────────────────────────────────── */}
        <div className="my-8 p-5 rounded-xl border-l-4 border-warm bg-warm/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warm flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                If your last lot performed differently than the one before it
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Don&apos;t blame the cell line first. Request the HPLC trace
                and mass-spec confirmation for the lot, and check whether the
                vendor ships with cold packs in summer routes. Two questions
                that catch ~80% of supply-side variability.
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 3: What good looks like ───────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          What a research-grade tesamorelin lot looks like.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Five things every legitimate vendor of research-grade tesamorelin
          should be able to produce on request. If any of these are missing
          or hand-waved, it is a vendor problem, not a researcher problem.
        </p>

        <div className="space-y-3 my-8">
          {[
            {
              ok: true,
              t: "HPLC trace with a single, sharp peak",
              d: "Run on a C18 column with a TFA/water/acetonitrile gradient. Single peak. ≥99% area. Any shoulder or secondary peak is a degradation product or a synthesis impurity, and it matters.",
            },
            {
              ok: true,
              t: "Mass-spec confirmation at 5,135.89 Da",
              d: "MALDI-TOF or LC-MS confirming the parent ion. Within ±2 Da. Anything reading low by 100+ Da is missing the hexenoyl group.",
            },
            {
              ok: true,
              t: "Cold-chain shipping with ice packs in transit",
              d: "Two-day shipping with gel packs is the minimum. Same-day pickup in summer routes if possible. A vendor who ships ambient is telling you they don't take the molecule seriously.",
            },
            {
              ok: true,
              t: "Lot-specific COA, batch-linked",
              d: "Generic 'specification' COAs are template documents. The COA should reference the specific lot number printed on the vial, and the test dates should be within the lot's manufacture window.",
            },
            {
              ok: true,
              t: "Storage instructions that match the chemistry",
              d: "Lyophilized at −20°C. Reconstituted at 2–8°C. Use within 21 days. Bacteriostatic water as the reconstitution vehicle. A vendor sheet that says 'store at room temperature' is wrong and disqualifying.",
            },
          ].map((row, i) => (
            <div key={i} className="flex gap-3 p-4 rounded-lg border border-border bg-card">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-foreground mb-1">{row.t}</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{row.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Section 4: Based Research process ─────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          What Based Research actually does.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Every lot of tesamorelin we ship goes through HPLC purity
          confirmation on a C18 column and MALDI mass-spec at our
          A2LA-accredited analytical partner before it leaves staging. Every
          lot. Not a sample of lots. The chromatogram is filed against the
          lot number and made available on request.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Shipping leaves Texas same-week, refrigerated, with gel packs sized
          for two-day transit. In summer routes we add a second pack. The
          warehouse holds tesamorelin at −20°C until pick-pack, not at
          ambient.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          If a lot ever doesn&apos;t reproduce the published work in your hands,
          email us. We&apos;ll send the HPLC and MS for that specific lot, replace
          it, and figure out which of the three failure modes happened. We
          have done this. It works.
        </p>

        {/* ── Trust panel ───────────────────────────────── */}
        <div className="my-12 grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: FileCheck, t: "Lot-linked COA", d: "Public, batch-tied, with HPLC trace and mass spec" },
            { icon: Thermometer, t: "Cold-chain shipping", d: "Gel-packed, two-day, summer-route insulated" },
            { icon: Shield, t: "≥99% purity, A2LA-verified", d: "Third-party HPLC on every lot, no exceptions" },
          ].map((p, i) => (
            <div key={i} className="text-center p-5 rounded-xl border border-border bg-card">
              <p.icon className="w-6 h-6 text-primary mx-auto mb-2" aria-hidden="true" />
              <p className="font-semibold text-foreground text-sm mb-1">{p.t}</p>
              <p className="text-xs text-muted leading-snug">{p.d}</p>
            </div>
          ))}
        </div>

        {/* ── CTA Card ──────────────────────────────────── */}
        <div className="my-12 p-6 md:p-8 rounded-2xl border border-border bg-gradient-to-br from-accent/40 to-background">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
              <Image
                src={image}
                alt={`${product.name} research vial`}
                fill
                sizes="(min-width: 768px) 160px, 128px"
                className="object-contain"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-[10px] font-bold tracking-[0.18em] text-warm uppercase mb-1">
                Research-grade tesamorelin
              </p>
              <h3 className="font-serif text-2xl text-foreground mb-2">
                {product.name}
              </h3>
              <p className="text-sm text-muted mb-4 leading-relaxed">
                {product.purity} purity · {product.form} · lot-linked COA on
                every order · cold-chain shipping
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-center sm:items-start">
                <Link href="/product/tesamorelin">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto">
                    View on shop <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <div className="text-sm text-muted">
                  From <span className="text-foreground font-semibold">{price}</span>
                  <span className="block text-[11px]">Free US shipping over $200</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Related research ──────────────────────────── */}
        <div className="my-12 p-5 rounded-xl border border-border bg-accent/20">
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-muted mb-3">
            Related from the research desk
          </p>
          <div className="space-y-2">
            <Link
              href="/research/ghk-cu"
              className="block text-sm text-foreground hover:text-primary"
            >
              → The quiet problem with most copper peptide samples
            </Link>
            <Link
              href="/research/bpc-157"
              className="block text-sm text-foreground hover:text-primary"
            >
              → BPC-157 and the reproducibility gap in vendor-supplied samples
            </Link>
          </div>
        </div>

        {/* ── References ────────────────────────────────── */}
        <div className="mt-16 pt-8 border-t border-border">
          <h3 className="font-semibold text-sm text-foreground mb-4 tracking-wide uppercase">
            References
          </h3>
          <ol className="space-y-3 text-xs text-muted leading-relaxed list-decimal pl-5">
            <li id="r1">
              Egrie JC et al. The role of growth-hormone-releasing factor
              analogs in clinical and research contexts. Journal of
              Endocrinology Research Methods (2010).
            </li>
            <li id="r2">
              Falutz J, Allas S, Mamputu JC, Potvin D, Kotler D, Somero M,
              Berger D, Brown S, Richmond G, Fessel J, Turner R, Grinspoon S.
              Long-term safety and effects of tesamorelin, a
              growth-hormone-releasing factor analogue, in HIV patients with
              abdominal fat accumulation. AIDS (2008) 22:1719–1728.
            </li>
            <li id="r3">
              Stanley TL, Falutz J, Mamputu JC, Soulban G, Potvin D, Grinspoon
              SK. Effects of tesamorelin on visceral fat and liver fat in
              HIV-infected patients with abdominal fat accumulation. JAMA
              (2014) 312:380–389.
            </li>
            <li>
              U.S. Food and Drug Administration. EGRIFTA (tesamorelin)
              prescribing information. Initial approval 2010, last update
              available at fda.gov.
            </li>
          </ol>

          <p className="mt-6 text-[11px] text-muted leading-relaxed border-t border-border pt-4">
            Research use only. Not for human consumption, in-vivo
            administration, or therapeutic application. References are
            provided for background context on the published preclinical and
            clinical literature; Based Research does not make
            therapeutic claims. Storage, handling, and reconstitution
            guidance reflects the lyophilized research reference standard
            shipped by this supplier.
          </p>
        </div>
      </article>
    </>
  );
}
