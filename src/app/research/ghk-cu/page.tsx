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
  Droplets,
  Lock,
} from "lucide-react";

export const metadata: Metadata = {
  title:
    "The Quiet Problem With Most Copper Peptide Samples. What Researchers Need To Verify Before Ordering.",
  description:
    "A research-supply investigation into why GHK-Cu, the most-studied copper tripeptide in regenerative research, is also the most commonly mishandled at the vendor layer.",
  alternates: { canonical: "https://basedresearch.com/research/ghk-cu" },
  openGraph: {
    title: "The Quiet Problem With Most Copper Peptide Samples",
    description:
      "An investigation into why researchers are getting inconsistent results from GHK-Cu, and what a legitimate research-grade sample actually looks like.",
    type: "article",
    url: "https://basedresearch.com/research/ghk-cu",
    images: [
      {
        url: "https://basedresearch.com/images/products/ghk-cu.webp",
        width: 1200,
        height: 1200,
        alt: "GHK-Cu copper peptide research vial",
      },
    ],
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "The Quiet Problem With Most Copper Peptide Samples",
  description:
    "A research-supply investigation into GHK-Cu purity, copper coordination, and what researchers should verify before ordering.",
  datePublished: "2026-04-16",
  dateModified: "2026-04-16",
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
      name: "GHK-Cu Supply Investigation",
      item: "https://basedresearch.com/research/ghk-cu",
    },
  ],
};

export default function GhkCuAdvertorial() {
  const product = getProductBySlug("ghk-cu");
  if (!product) return null;

  const price = formatPriceShort(getStartingPrice(product));
  const image = getProductImagePath("ghk-cu");

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
          <span className="text-muted">April 16, 2026</span>
        </div>
      </div>

      {/* ── Category + Breadcrumb ──────────────────────────── */}
      <nav className="max-w-3xl mx-auto px-4 pt-8 flex items-center gap-1.5 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" aria-hidden="true" />
        <span>Research</span>
        <ChevronRight className="w-3 h-3" aria-hidden="true" />
        <span className="text-foreground">GHK-Cu Investigation</span>
      </nav>

      {/* ── HEADLINE + LEAD ───────────────────────────────── */}
      <article className="max-w-3xl mx-auto px-4 pt-6 pb-16">
        <div className="mb-3">
          <span className="inline-block text-[10px] font-bold tracking-[0.22em] text-warm bg-warm/10 px-2.5 py-1 rounded-sm uppercase">
            Investigation
          </span>
        </div>

        <h1 className="font-serif text-4xl md:text-5xl leading-[1.1] text-foreground tracking-tight mb-5">
          The Quiet Problem With Most Copper Peptide Samples. What Researchers
          Need To Verify Before Ordering.
        </h1>

        <p className="text-lg md:text-xl text-muted leading-relaxed mb-6 font-light">
          GHK-Cu is the most-studied copper tripeptide in regenerative research.
          It&apos;s also the most commonly mishandled at the vendor layer. A research-supply
          investigation into why inconsistent findings are following researchers into
          their labs, and what to check before the next order goes out.
        </p>

        <div className="flex items-center gap-3 pb-6 border-b border-border text-xs text-muted">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="text-foreground font-medium">Based Research Research Desk</div>
            <div>7 min read · Research Brief</div>
          </div>
        </div>

        {/* Lead image */}
        <div className="my-8 aspect-square md:aspect-[4/3] relative rounded-xl overflow-hidden bg-accent">
          <Image
            src={image}
            alt="Research-grade GHK-Cu in its characteristic deep blue-violet form"
            fill
            sizes="(min-width: 768px) 720px, 100vw"
            className="object-contain"
            priority
          />
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
            <p className="text-[11px] text-white/80">
              Research-grade GHK-Cu in its characteristic deep blue-violet form.
              The color is the first test.
            </p>
          </div>
        </div>

        {/* ── Lead / Opening ─────────────────────────────── */}
        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          <span className="float-left font-serif text-6xl leading-[0.85] mr-2 mt-1 text-primary">
            W</span>
          alk the peptide supplier space long enough and you start noticing the
          same complaint from labs working with copper tripeptide. The samples
          arrive. The paperwork looks fine. But the results don&apos;t match what
          the published research shows. Collagen assays come in softer than
          Maquart 1988. Fibroblast gene-expression arrays under-express the genes
          Pickart&apos;s 2012 paper flagged. Something is missing.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          In a lot of these cases, something <em>is</em> missing. It&apos;s the
          copper.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          Unlike most peptide research compounds, GHK isn&apos;t meaningful without its
          copper(II) partner. The native, physiologically-active molecule is the
          <strong className="text-foreground"> glycyl-histidyl-lysine tripeptide
          coordinated with a copper ion</strong>. That complex is what
          modulates ~4,000 genes<sup><a href="#r2" className="text-primary">2</a></sup>, what is studied in collagen/ECM assay models,
          what modulates in-vitro wound-closure assay kinetics in rodent cell-culture systems. Strip the copper and
          you&apos;re left with an inactive version of the peptide. It looks like GHK on a spec
          sheet and fails to reproduce any of the peer-reviewed work that
          defines the compound.
        </p>

        {/* ── Stat callout #1 ────────────────────────────── */}
        <div className="my-10 grid grid-cols-3 gap-3">
          {[
            { stat: "~4,000", label: "Genes modulated by GHK-Cu in fibroblast cultures" },
            { stat: "60%", label: "Age-60 decline in plasma GHK from age 20" },
            { stat: "52 yrs", label: "Since Pickart first isolated the tripeptide (Nature, 1973)" },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 rounded-lg border border-border bg-accent/30">
              <div className="font-serif text-2xl md:text-3xl text-foreground font-bold">{s.stat}</div>
              <div className="text-[10px] md:text-xs text-muted mt-1.5 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Section 1: The Problem ─────────────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          The color is the tell.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Pure GHK is the free tripeptide without its copper, and it&apos;s a white
          powder. GHK-Cu, with copper(II) properly coordinated, is a deep royal
          blue to blue-violet. The color comes from d-d electronic transitions in
          the copper-nitrogen coordination sphere. The shade is so distinctive
          that senior medicinal chemists can assess whether a sample is likely
          real just by eyeballing it.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          A meaningful fraction of the GHK-Cu being sold into research channels
          today is white or pale-gray. It&apos;s been lyophilized without proper
          copper incorporation, or the copper has been lost during aggressive
          purification, or it was never added in the first place. The sample
          sheet says &quot;GHK-Cu.&quot; The sample, mechanistically, is not.
        </p>

        <div className="my-8 p-5 rounded-xl border-l-4 border-warm bg-warm/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warm flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                If your GHK-Cu arrived white or off-white
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                You almost certainly don&apos;t have a biologically active copper
                complex. It might be perfectly pure GHK peptide. But the
                preclinical data that draws researchers to this molecule
                depends entirely on the copper coordination being intact.
              </p>
            </div>
          </div>
        </div>

        {/* Pull quote */}
        <blockquote className="border-l-4 border-primary pl-6 py-2 my-12">
          <p className="font-serif text-xl md:text-2xl text-foreground leading-snug italic">
            &quot;In one analysis, GHK-Cu modulated the expression of roughly 31% of
            the human genome (approximately 4,000 genes) either upward or
            downward in fibroblast cell cultures.&quot;
          </p>
          <cite className="text-xs text-muted block mt-3 not-italic">
            Pickart &amp; Margolina (2012), <em>BioMed Research International</em>
            <sup><a href="#r2" className="text-primary ml-0.5">2</a></sup>
          </cite>
        </blockquote>

        {/* ── Section 2: Why it matters, the biology ──── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          What researchers are actually studying.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          GHK was first isolated from human plasma by Loren Pickart in 1973, in
          work published in <em>Nature New Biology</em><sup><a href="#r1" className="text-primary">1</a></sup>.
          Over the next five decades, it became one of the most densely
          characterized bioactive peptides in regenerative biology. Major
          contributions have come from Pickart&apos;s group, Maquart&apos;s lab at the
          University of Reims, and dozens of independent research teams across
          dermatology, oncology, and geroscience.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          What makes GHK-Cu scientifically interesting is that three amino acids
          and a copper ion carry a signaling program that touches a large
          fraction of the transcriptome. The peptide operates at three distinct
          cellular layers. That&apos;s unusual, and it&apos;s why the published research
          has gotten so broad:
        </p>

        <div className="space-y-3 mb-8">
          <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">
              1
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Gene expression modulation</p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Up-regulates DNA repair and extracellular matrix genes.
                Down-regulates inflammatory and apoptotic pathways. Documented
                across multiple fibroblast array studies.
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">
              2
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Tissue scaffold remodeling</p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Stimulates synthesis of collagen I, III, and IV, elastin, decorin,
                and glycosaminoglycans while modulating metalloproteinase activity.
                Organized, multi-protein remodeling rather than a single-gene effect.
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">
              3
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Redox regulation</p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Elevates superoxide dismutase, glutathione peroxidase, and
                catalase activity. Chelates iron and suppresses lipid peroxidation.
                That&apos;s a two-mechanism antioxidant footprint simple radical
                scavengers don&apos;t match.
              </p>
            </div>
          </div>
        </div>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Plasma concentrations, meanwhile, decline with age. From roughly
          200 ng/mL at age 20 to about 80 ng/mL by age 60<sup><a href="#r7" className="text-primary">7</a></sup>. That&apos;s a
          60% drop in native signaling tone. It has drawn the geroscience
          community into the molecule from a different research angle entirely.
        </p>

        {/* ── Inline CTA #1 ──────────────────────────────── */}
        <InlineCTA
          title={`HPLC-verified GHK-Cu · ${product.variants[0].size} from ${price}`}
          subtitle="Every batch tested for purity and copper coordination. Public batch-linked COA for every lot."
          href={`/product/${product.slug}`}
          image={image}
        />

        {/* ── Section 3: The data ────────────────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          Three findings the preclinical data keeps producing.
        </h2>

        <h3 className="font-serif text-xl text-foreground mb-3 mt-6">
          Collagen/ECM assay signals stack in aged-donor cultures
        </h3>
        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Maquart&apos;s 1988 <em>FEBS Letters</em> paper<sup><a href="#r3" className="text-primary">3</a></sup> remains the
          reference for fibroblast collagen response to GHK-Cu. Two- to six-fold
          increases in type I collagen expression, with parallel bumps in
          elastin, decorin, and glycosaminoglycans. Aged-donor fibroblasts (the
          kind that matter for skin remodeling and geroscience research) showed
          the strongest response. That tracks with the hypothesis that restoring
          signaling input to senescent cells partially recovers their
          matrix-synthesis program.
        </p>

        <h3 className="font-serif text-xl text-foreground mb-3 mt-6">
          Wound closure speeds up in rodent and rabbit models
        </h3>
        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          The Canapp 2003 <em>Veterinary Surgery</em> study<sup><a href="#r5" className="text-primary">5</a></sup> is one of
          the cleaner reads on topical GHK-Cu in ischemic wound models:
          accelerated closure, reduced scar tissue, earlier angiogenic
          infiltration. The angiogenic component is mechanistically distinct
          from standard growth-factor-mediated pathways and appears to involve
          direct endothelial migration stimulation.
        </p>

        <h3 className="font-serif text-xl text-foreground mb-3 mt-6">
          Antioxidant enzyme upregulation is consistent across tissue types
        </h3>
        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          SOD, glutathione peroxidase, and catalase all move in the expected
          direction following GHK-Cu administration in both fibroblasts and
          hepatocytes<sup><a href="#r6" className="text-primary">6</a></sup>. Combined with the iron chelation activity, which
          suppresses Fenton-reaction radical generation upstream, you end up
          with a two-mechanism antioxidant profile that simple scavenger
          compounds can&apos;t reproduce.
        </p>

        {/* ── Section 4: Disqualify alternatives ─────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          Why supplement-grade and bulk sources keep failing labs.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Three failure modes we see repeatedly when researchers arrive at
          Based Research after a bad sample:
        </p>

        <div className="space-y-4 mb-10">
          {[
            {
              title: "Copper coordination incomplete or absent",
              body: "The tell-tale white powder. Often from vendors who lyophilize GHK without adequate copper preincorporation, or who strip copper during aggressive desalting. Mechanistic activity lost.",
            },
            {
              title: "Purity claimed but not published",
              body: "A COA that says ≥99% but no underlying HPLC chromatogram from an accredited lab. Without the actual chromatogram and lot-specific report, the number is a marketing claim, not a quality signal.",
            },
            {
              title: "Cold-chain lapses",
              body: "Reconstituted GHK-Cu is stable at 2-8°C for ~28 days. Lyophilized material degrades if it spends time at room temperature during transit. Many supply chains can't confirm cold-chain integrity.",
            },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-foreground mb-1 text-sm">{item.title}</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Section 5: What a good sample looks like ──── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          What a legitimate research-grade GHK-Cu sample should actually have.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          A checklist researchers should run before they trust a sample for
          published work:
        </p>

        <div className="space-y-3 mb-10">
          {[
            {
              title: "Purity verified via reversed-phase HPLC",
              body: "≥99% target with the chromatogram published on a batch-linked COA.",
            },
            {
              title: "Quantity verified by HPLC",
              body: "The lab measures the actual fill against the labeled mg, so you know what's in the vial isn't short of what's on the label.",
            },
            {
              title: "Correct color signature",
              body: "Deep royal blue to blue-violet. A white or pale-gray sample has lost copper. Demand replacement.",
            },
            {
              title: "Cold-chain from facility to researcher",
              body: "Stored at -20°C pre-ship. Shipped 2-day air with temperature-controlled packaging.",
            },
            {
              title: "Public, lot-specific Certificate of Analysis",
              body: "Not on request. Published and linkable. Anyone can verify the specific lot they received.",
            },
          ].map((item, i) => (
            <div key={i} className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-foreground text-sm">{item.title}</p>
                <p className="text-sm text-foreground/75 leading-relaxed mt-0.5">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Section 6: Brand reveal ───────────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          How we approach GHK-Cu at Based Research.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          We started Based Research because we got tired of the peptide research
          market&apos;s ambient dishonesty. The name on the label matters. The
          label should represent the actual molecule in the vial.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Every batch of our GHK-Cu is HPLC-verified to ≥99%, mass-spec
          confirmed for both peptide identity and copper coordination, visually
          inspected for the correct blue-violet color signature, and shipped
          cold-chain from -20°C storage to the researcher&apos;s door. The
          batch-linked Certificate of Analysis is public and searchable by lot
          number. You can look up the exact batch you&apos;re receiving before you
          place the order, and we don&apos;t get to edit it after the fact.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          It&apos;s an unremarkable operating standard. We just hold it.
        </p>

        {/* Pull quote 2 */}
        <blockquote className="border-l-4 border-secondary pl-6 py-2 my-12">
          <p className="font-serif text-xl md:text-2xl text-foreground leading-snug italic">
            &quot;The batch-linked COA isn&apos;t on request. It&apos;s published, linkable,
            and lives next to the product page. Researchers should be able to
            verify the lot before the order goes out.&quot;
          </p>
          <cite className="text-xs text-muted block mt-3 not-italic">
            Based Research operating principle
          </cite>
        </blockquote>

        {/* ── CLOSE: Pricing + Urgency + Guarantee ─────── */}
        <div className="my-14 p-6 md:p-8 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
            <div className="md:col-span-2 flex justify-center">
              <div className="relative w-40 h-40">
                <Image src={image} alt="GHK-Cu research peptide" fill sizes="160px" className="object-contain" />
              </div>
            </div>
            <div className="md:col-span-3">
              <div className="text-[10px] font-bold tracking-[0.22em] text-primary uppercase mb-2">
                Research-Grade GHK-Cu
              </div>
              <h3 className="font-serif text-2xl md:text-3xl text-foreground mb-3 leading-tight">
                A2LA-accredited HPLC verified. Public COA. Ships cold-chain.
              </h3>

              <div className="space-y-2 mb-4">
                {product.variants.map((v) => (
                  <div
                    key={v.sku}
                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-border"
                  >
                    <div>
                      <div className="text-sm font-semibold text-foreground">{v.size}</div>
                      <div className="text-[11px] text-muted">per-mg gets cheaper at 100mg</div>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {formatPriceShort(v.price)}
                    </div>
                  </div>
                ))}
              </div>

              <Link href={`/product/${product.slug}`}>
                <Button variant="primary" size="lg" className="w-full md:w-auto">
                  Order GHK-Cu. Ships within 24 hrs.
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Trust row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border">
            {[
              { icon: <FlaskConical className="w-4 h-4" aria-hidden="true" />, text: "≥99% HPLC verified" },
              { icon: <FileCheck className="w-4 h-4" aria-hidden="true" />, text: "Public lot COA" },
              { icon: <Truck className="w-4 h-4" aria-hidden="true" />, text: "UPS 2nd Day Air" },
              { icon: <Shield className="w-4 h-4" aria-hidden="true" />, text: "Cold-chain shipping" },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted">
                <span className="text-primary">{t.icon}</span>
                <span>{t.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Urgency/batch note */}
        <div className="my-8 p-4 rounded-lg bg-foreground/5 border border-border text-center">
          <p className="text-sm text-foreground/85">
            <Lock className="inline w-4 h-4 mr-1.5 text-foreground/60 align-text-bottom" aria-hidden="true" />
            We run production in finite batches and we make limited batches.
            When a lot sells through, the next lot gets a new COA and a new lot
            number. That&apos;s why lot-linked COAs matter.
          </p>
        </div>

        {/* ── Crossroads close ───────────────────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-14">
          Two paths, both with a cost.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          A researcher running GHK-Cu experiments has two options.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          The first is to order from the cheapest source, skip the COA check,
          accept whatever shows up in the vial, and live with whatever variance
          ends up in the data. The sticker price is lower. The reproducibility
          cost compounds over the project.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          The second is to pay for verified material. HPLC-confirmed, mass-spec
          identified, cold-chain delivered, batch-linked to a public COA. The
          compound matches the molecule the published research is describing.
          The sticker price is higher. The data-quality cost is what it should
          be, which is zero.
        </p>

        {/* ── Future pacing ──────────────────────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          What clean supply looks like, downstream.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          A researcher working with properly-coordinated, verified GHK-Cu
          shouldn&apos;t have to think about the supply layer. The color is right,
          the purity is right, the COA is linked to the lot, and the only
          variables in the experiment are the ones the researcher actually
          designed in.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          That&apos;s the bar we set, and that&apos;s what the Based Research GHK-Cu lot in
          your lab should feel like.
        </p>

        {/* Final CTA button */}
        <div className="text-center my-12">
          <Link href={`/product/${product.slug}`}>
            <Button variant="primary" size="lg">
              Browse GHK-Cu. {product.variants[0].size} and {product.variants[1]?.size}
              <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
          </Link>
          <p className="text-xs text-muted mt-3">
            Free US shipping on orders over $200 · Ships within 24 hours via UPS 2nd Day Air
          </p>
        </div>

        {/* ── FAQ ────────────────────────────────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-6 mt-14 pt-6 border-t border-border">
          Researcher FAQ
        </h2>

        <div className="space-y-5 mb-12">
          {[
            {
              q: "How do I verify the copper coordination is intact?",
              a: "Three cues, in order: visual color check (deep blue-violet, not white), the mass-spec trace on the COA (should show the Cu-peptide complex mass, not just the peptide), and UV-Vis absorbance at ~525 nm if you have a spectrophotometer on hand.",
            },
            {
              q: "What happens if I receive a sample that looks wrong?",
              a: "Contact us with the lot number. If the color or purity is off, we replace the lot at no additional cost. We publish every batch COA before shipping; any discrepancy is on us.",
            },
            {
              q: "What's the storage protocol?",
              a: "Lyophilized: -20°C, indefinitely stable. Reconstituted: 2-8°C in aqueous laboratory solvent, use within 28 days. Protect from direct light. The copper coordination is photosensitive over extended periods.",
            },
            {
              q: "What solvents work for reconstitution?",
              a: "An aqueous laboratory solvent is standard for research work. GHK-Cu is soluble at physiological pH. Avoid strong reducing agents or chelators in the buffer. They'll strip the copper.",
            },
            {
              q: "Do you ship internationally?",
              a: "United States only, currently. Cold-chain logistics and regulatory framework vary significantly across jurisdictions, and we don't ship where we can't guarantee the chain stays intact.",
            },
            {
              q: "Is this intended for human use?",
              a: "No. Strictly research use only. In-vitro and animal-model preclinical work. Not for human or animal consumption, therapeutic, diagnostic, or any clinical application. See our Research Use Only Policy.",
            },
          ].map((item, i) => (
            <div key={i} className="pb-5 border-b border-border last:border-0">
              <h3 className="font-semibold text-foreground mb-2 text-base">{item.q}</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>

        {/* ── References ────────────────────────────────── */}
        <h2
          id="references"
          className="font-serif text-2xl text-foreground mb-5 mt-12 pt-6 border-t border-border"
        >
          References
        </h2>
        <ol className="list-decimal list-outside ml-5 space-y-2.5 text-sm text-muted leading-relaxed">
          <li id="r1">
            Pickart L, Thaler MM. (1973). Tripeptide in human serum which prolongs survival of
            normal liver cells and stimulates growth in neoplastic liver.{" "}
            <em>Nature New Biology</em>, 243(124), 85-87.
          </li>
          <li id="r2">
            Pickart L, Margolina A. (2012). Regenerative and protective actions of the GHK-Cu
            peptide in the light of the new gene data.{" "}
            <em>BioMed Research International</em>, 2012, 324832.
          </li>
          <li id="r3">
            Maquart FX, Pickart L, Laurent M, Gillery P, Monboisse JC, Borel JP. (1988).
            Stimulation of collagen synthesis in fibroblast cultures by the tripeptide-copper
            complex glycyl-L-histidyl-L-lysine-Cu2+.{" "}
            <em>FEBS Letters</em>, 238(2), 343-346.
          </li>
          <li id="r5">
            Canapp SO, Farese JP, Schultz GS, et al. (2003). The effect of topical tripeptide-
            copper complex on healing of ischemic open wounds.{" "}
            <em>Veterinary Surgery</em>, 32(6), 515-523.
          </li>
          <li id="r6">
            Beretta G, Arlandini E, Artali R, Anton JM, Maffei Facino R. (2008). Acrolein
            sequestering ability of the endogenous tripeptide GHK.{" "}
            <em>Journal of Pharmaceutical and Biomedical Analysis</em>, 47(3), 596-602.
          </li>
          <li id="r7">
            Pickart L, Vasquez-Soltero JM, Margolina A. (2015). GHK-Cu peptide as a natural
            modulator of multiple cellular pathways in skin regeneration.{" "}
            <em>BioMed Research International</em>, 2015, 648108.
          </li>
        </ol>

        {/* Related research links */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs font-bold tracking-[0.22em] text-muted uppercase mb-3">
            Further reading
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href="https://blog.basedresearch.com/ghk-cu-copper-peptide-gene-expression/"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-all"
            >
              <p className="text-sm font-medium text-foreground">
                GHK-Cu: Copper-Dependent Gene Expression and In-Vitro Wound-Closure Assay Models
              </p>
              <p className="text-[11px] text-muted mt-1">
                Blog · Based Research Research
              </p>
            </a>
            <a
              href="https://blog.basedresearch.com/bpc157-cytoprotection-angiogenesis/"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-all"
            >
              <p className="text-sm font-medium text-foreground">
                BPC-157: Mechanisms of Cytoprotection and Angiogenesis
              </p>
              <p className="text-[11px] text-muted mt-1">
                Blog · Based Research Research
              </p>
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-5 rounded-lg bg-accent/40 border border-border">
          <p className="text-[11px] text-muted leading-relaxed">
            <strong className="text-foreground/80">For Research Use Only.</strong> All content
            is for educational and research purposes only. Preclinical and in-vitro studies
            cited are from published peer-reviewed literature. Products sold by Based Research
            are intended strictly for laboratory research and are not for human or
            animal consumption, therapeutic, diagnostic, or any other clinical or commercial use.
          </p>
        </div>
      </article>
    </>
  );
}

// ── Inline sidebar CTA ────────────────────────────────────
function InlineCTA({
  title,
  subtitle,
  href,
  image,
}: {
  title: string;
  subtitle: string;
  href: string;
  image: string;
}) {
  return (
    <Link
      href={href}
      className="group block my-10 p-5 rounded-xl border border-border bg-accent/30 hover:bg-accent/50 hover:border-primary/30 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <Image src={image} alt="" fill sizes="64px" className="object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold tracking-[0.22em] text-primary uppercase mb-0.5">
            Available Now
          </div>
          <p className="font-semibold text-foreground text-sm md:text-base leading-tight">
            {title}
          </p>
          <p className="text-xs text-muted mt-1 leading-relaxed">{subtitle}</p>
        </div>
        <ArrowRight
          className="w-4 h-4 text-primary flex-shrink-0 group-hover:translate-x-0.5 transition-transform hidden sm:block"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
