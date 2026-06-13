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
  Lock,
} from "lucide-react";

export const metadata: Metadata = {
  title:
    "Thirty Years Of BPC-157 Research. And A Supply Chain That Hasn't Kept Up.",
  description:
    "The gap between what Sikiric's Zagreb group has been publishing on BPC-157 since 1993, and the material actually arriving in researchers' labs today.",
  alternates: { canonical: "https://basedresearch.com/research/bpc-157" },
  openGraph: {
    title: "Thirty Years Of BPC-157 Research. And A Supply Chain That Hasn't Kept Up.",
    description:
      "A Zagreb-to-your-lab story: the 1993 discovery, the 100+ preclinical papers, and the vendor-layer gap every researcher should know about.",
    type: "article",
    url: "https://basedresearch.com/research/bpc-157",
    images: [
      {
        url: "https://basedresearch.com/images/products/bpc-157.webp",
        width: 1200,
        height: 1200,
        alt: "BPC-157 research peptide vial",
      },
    ],
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Thirty Years Of BPC-157 Research. And A Supply Chain That Hasn't Kept Up.",
  description:
    "Research-supply investigation into BPC-157: the 1993 Zagreb discovery, 30+ years of preclinical literature, and the vendor-layer gap.",
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
      name: "BPC-157 Investigation",
      item: "https://basedresearch.com/research/bpc-157",
    },
  ],
};

export default function Bpc157Advertorial() {
  const product = getProductBySlug("bpc-157");
  if (!product) return null;

  const price = formatPriceShort(getStartingPrice(product));
  const image = getProductImagePath("bpc-157");

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

      {/* ── Editorial Masthead ──────────────────────────── */}
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

      {/* ── Category + Breadcrumb ───────────────────────── */}
      <nav className="max-w-3xl mx-auto px-4 pt-8 flex items-center gap-1.5 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" aria-hidden="true" />
        <span>Research</span>
        <ChevronRight className="w-3 h-3" aria-hidden="true" />
        <span className="text-foreground">BPC-157 Investigation</span>
      </nav>

      {/* ── HEADLINE + LEAD ────────────────────────────── */}
      <article className="max-w-3xl mx-auto px-4 pt-6 pb-16">
        <div className="mb-3">
          <span className="inline-block text-[10px] font-bold tracking-[0.22em] text-warm bg-warm/10 px-2.5 py-1 rounded-sm uppercase">
            The Discovery Files
          </span>
        </div>

        <h1 className="font-serif text-4xl md:text-5xl leading-[1.1] text-foreground tracking-tight mb-5">
          Thirty Years Of BPC-157 Research. And A Supply Chain That Hasn&apos;t
          Kept Up.
        </h1>

        <p className="text-lg md:text-xl text-muted leading-relaxed mb-6 font-light">
          The story starts in 1993 with a fragment the human stomach already
          makes, and a Croatian pharmacology lab that spent the next three
          decades refusing to let it disappear into the background. What
          they&apos;ve published and what&apos;s actually reaching researchers&apos; labs
          today have quietly drifted apart.
        </p>

        <div className="flex items-center gap-3 pb-6 border-b border-border text-xs text-muted">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="text-foreground font-medium">Based Research Research Desk</div>
            <div>8 min read · Discovery Brief</div>
          </div>
        </div>

        {/* Lead image */}
        <div className="my-8 aspect-square md:aspect-[4/3] relative rounded-xl overflow-hidden bg-accent">
          <Image
            src={image}
            alt="BPC-157 research peptide in lyophilized form"
            fill
            sizes="(min-width: 768px) 720px, 100vw"
            className="object-contain"
            priority
          />
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
            <p className="text-[11px] text-white/80">
              Research-grade BPC-157. Acetate salt, ≥99% HPLC-verified,
              cold-chain stored.
            </p>
          </div>
        </div>

        {/* ── Lead / Opening ─────────────────────────────── */}
        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          <span className="float-left font-serif text-6xl leading-[0.85] mr-2 mt-1 text-primary">
            I</span>
          n 1993, a pharmacology team at the University of Zagreb isolated a
          15-amino-acid fragment from human gastric juice and ran into
          something they didn&apos;t expect. The fragment held together in
          conditions that broke down every other peptide they tested. It
          crossed membranes intact. It showed up unchanged in serum an hour
          after administration. By every ordinary rule of peptide chemistry,
          it should have disintegrated. It didn&apos;t.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          They named it Body Protection Compound-157, or BPC-157, and started
          publishing.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Thirty-two years and roughly a hundred peer-reviewed papers later,
          the Zagreb group&apos;s BPC-157 record is one of the densest
          single-compound preclinical bodies of work in regenerative
          pharmacology. Tendon-transection rat models. Gastric ulcer assays.
          Angiogenesis studies in endothelial cells. Nitric-oxide pathway
          experiments. A whole family of wound-healing models. If you&apos;re a
          researcher working in any of these areas, BPC-157 is hard to
          avoid, and usually shouldn&apos;t be.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          And yet. Walk into ten research labs running BPC-157 protocols
          today and at least three of them are working with material that
          doesn&apos;t match what the Zagreb team has been publishing. Wrong
          salt form. Broken cold chain. Or both. This piece is a short
          accounting of why that happens. And what a researcher should
          check before the next order ships.
        </p>

        {/* ── Stat callout ─────────────────────────────── */}
        <div className="my-10 grid grid-cols-3 gap-3">
          {[
            { stat: "15", label: "Amino acids in the pentadecapeptide" },
            { stat: "30+ yrs", label: "Since Sikiric's Zagreb lab first characterized it" },
            { stat: "1419.53 Da", label: "Molecular weight (theoretical, monoisotopic)" },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 rounded-lg border border-border bg-accent/30">
              <div className="font-serif text-2xl md:text-3xl text-foreground font-bold">{s.stat}</div>
              <div className="text-[10px] md:text-xs text-muted mt-1.5 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Section 1: What makes this literature unusual ── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          A literature with a single center of gravity.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Most drug-candidate research fans out across dozens of independent
          groups working from competing starting points. BPC-157 is different.
          A quick citation-graph pull on PubMed turns up Dr. Predrag Sikiric or
          one of his long-time Zagreb collaborators on the majority of the
          peer-reviewed record. For a single molecule that&apos;s been studied for
          three decades, that concentration is unusual, and worth naming up
          front.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          The concentration creates a strength and a question at the same
          time. The strength: the methods are consistent across the published
          work. Protocols look familiar from paper to paper. Dose ranges
          cluster. Animal models are handled the same way.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          The question: can external labs reproduce the effect sizes? Some
          can. Some can&apos;t. And when we talk to the ones who can&apos;t, a
          recurring thread shows up before anyone starts questioning the
          original research. It&apos;s the compound they&apos;re working with.
        </p>

        {/* Pull quote 1 */}
        <blockquote className="border-l-4 border-primary pl-6 py-2 my-12">
          <p className="font-serif text-xl md:text-2xl text-foreground leading-snug italic">
            &quot;Effect sizes in BPC-157 work are unusually tight across the
            Zagreb record. When external labs fail to replicate, the first
            thing I&apos;d check is the compound form, not the protocol.&quot;
          </p>
          <cite className="text-xs text-muted block mt-3 not-italic">
            Paraphrased from a research-supply conversation, 2026
          </cite>
        </blockquote>

        {/* ── Section 2: Two BPC-157s ─────────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          Two BPC-157s, one SKU.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          This is the issue that trips up the most researchers. BPC-157 can be
          supplied as an <strong className="text-foreground">acetate salt</strong>{" "}
          or as an <strong className="text-foreground">arginate salt</strong>.
          The majority of the Zagreb group&apos;s published studies used the
          acetate form. A meaningful fraction of the material circulating
          through research-supply channels is the arginate form. It&apos;s often
          shipped under the generic label &quot;BPC-157&quot; with no salt-form
          notation on the packaging or the Certificate of Analysis.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          The two forms aren&apos;t interchangeable. Solubility differs, stability
          profiles differ, and how the compound behaves in animal-model work
          differs enough that protocols developed against the acetate form
          don&apos;t translate directly. A lab attempting to replicate a Sikiric
          protocol using the arginate salt is, often without knowing it,
          working with a different compound.
        </p>

        <div className="my-8 p-5 rounded-xl border-l-4 border-warm bg-warm/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warm flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                If your COA doesn&apos;t list the salt form
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                That&apos;s the first flag. Any lab-grade BPC-157 CoA should
                explicitly state the salt form alongside the molecular weight.
                If it doesn&apos;t, you don&apos;t actually know what you&apos;re about to
                dose into your model system.
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 3: Stability myth ───────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          The stability myth.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          BPC-157&apos;s origin story is inseparable from its gastric-juice
          resistance. The Zagreb group named it &quot;Body Protection Compound&quot;
          partly because the fragment held structural integrity in conditions
          that normally break down peptides fast. That&apos;s a real property.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          It&apos;s also the source of a persistent misconception in research
          channels: that because BPC-157 survives gastric juice, it&apos;s
          effectively stable everywhere. It isn&apos;t.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          Lyophilized BPC-157 stored at -20°C holds indefinitely.
          Reconstituted in an aqueous laboratory solvent at 2-8°C, it&apos;s stable for
          roughly 28 days. Sitting at room temperature in a shipping box for
          a week of summer transit is a different situation entirely. Vendors
          who don&apos;t cold-chain their material (and there are many) are
          rolling the dice on the researcher&apos;s experiment, not their own.
        </p>

        {/* ── Section 4: The preclinical data ─────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          Three areas where the preclinical data keeps stacking.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Assuming the compound is the correct salt form and the cold chain
          held, three research areas have produced the most reproducible
          findings:
        </p>

        <div className="space-y-3 mb-8">
          <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">
              1
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">
                Tendon and ligament repair in rodent models
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Chang et al. (2011) showed accelerated Achilles tendon repair
                in rats after transection<sup><a href="#r3" className="text-primary">3</a></sup>. Krivic et al. (2006) documented
                comparable effects in ligament detachment<sup><a href="#r4" className="text-primary">4</a></sup>. The mechanism
                involves growth hormone receptor upregulation on tendon
                fibroblasts, a finding extended by Hsieh et al. (2017)<sup><a href="#r5" className="text-primary">5</a></sup>.
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">
              2
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">
                Gastrointestinal protection
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                The Zagreb group&apos;s foundational work: ulcer models (alcohol-,
                NSAID-, stress-induced), mucosal healing, reduced lesion area,
                accelerated epithelial restitution<sup><a href="#r1" className="text-primary">1</a></sup>. This is the most
                data-dense area of the BPC-157 literature.
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">
              3
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">
                Angiogenesis via the nitric oxide system
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Seiwerth, Brcic, and collaborators have documented VEGFR2
                upregulation and nitric oxide pathway modulation in
                endothelial-cell assays and rodent wound models<sup><a href="#r6" className="text-primary">6</a></sup>. The
                angiogenic signature is mechanistically distinct from
                classical growth-factor pathways.
              </p>
            </div>
          </div>
        </div>

        {/* ── Inline CTA ─────────────────────────────── */}
        <InlineCTA
          title={`Acetate-salt BPC-157 · ${product.variants[0].size} from ${price}`}
          subtitle="HPLC-verified ≥99%. Mass spec confirmed. Salt form explicitly stated on every COA."
          href={`/product/${product.slug}`}
          image={image}
        />

        {/* ── Section 5: Why supplement-channel fails ─── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          Why supplement-channel BPC-157 keeps failing labs.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Four failure modes we see repeatedly when researchers arrive at
          Based Research after a bad sample:
        </p>

        <div className="space-y-4 mb-10">
          {[
            {
              title: "Wrong salt form, unlabeled",
              body: "Arginate shipped as 'BPC-157' with no salt notation on the COA. Protocols developed against acetate-form research don't translate directly.",
            },
            {
              title: "No cold-chain during transit",
              body: "Lyophilized material sitting in a non-insulated box at summer-truck temperatures for 3-5 days. Loss of structural integrity by the time it reaches the lab.",
            },
            {
              title: "Purity claims without HPLC trace",
              body: "A COA that says ≥99% but no underlying chromatogram. Without the actual data, the number is a marketing claim, not a quality signal.",
            },
            {
              title: "Sourcing from fitness-industry channels",
              body: "Wholesale supply chains built for consumer-channel resellers aren't set up for research reproducibility. Lot tracking, batch-linked COAs, and cold-chain integrity are usually afterthoughts.",
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

        {/* Pull quote 2 */}
        <blockquote className="border-l-4 border-secondary pl-6 py-2 my-12">
          <p className="font-serif text-xl md:text-2xl text-foreground leading-snug italic">
            &quot;We&apos;ve had researchers arrive after three consecutive &apos;BPC-157&apos;
            orders that turned out to be arginate-form material. Their tendon
            repair data was soft. They assumed the literature was soft.&quot;
          </p>
          <cite className="text-xs text-muted block mt-3 not-italic">
            Based Research operations notes
          </cite>
        </blockquote>

        {/* ── Section 6: What a good sample looks like ── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          What a legitimate research-grade BPC-157 sample should actually have.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          The checklist a researcher should run before trusting any sample
          for published work:
        </p>

        <div className="space-y-3 mb-10">
          {[
            {
              title: "Purity verified via reversed-phase HPLC",
              body: "≥99% target with the chromatogram published on a batch-linked COA.",
            },
            {
              title: "Mass spec confirmation of 1419.53 Da",
              body: "ESI-MS or MALDI-TOF. Monoisotopic mass of the parent peptide, plus salt form noted separately.",
            },
            {
              title: "Acetate salt form, explicitly stated",
              body: "Matches the Zagreb literature. If the COA doesn't say, it's not research-grade for this purpose.",
            },
            {
              title: "Full 15-residue sequence verification",
              body: "Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val. Partial or substituted sequences are a red flag.",
            },
            {
              title: "Cold-chain shipping",
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

        {/* ── Section 7: Brand reveal ─────────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          How Based Research handles it.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          We ship the <strong className="text-foreground">acetate salt
          form</strong>, which is what the Zagreb literature used. Every
          batch is HPLC-verified to ≥99%, mass-spec confirmed to a
          monoisotopic mass of 1419.53 Da, and sequence-verified across all
          fifteen residues before it leaves our facility.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          Material ships cold-chain from -20°C storage to the researcher&apos;s
          door via UPS 2nd Day Air, with temperature-controlled packaging
          for summer months at no additional cost. The batch-linked
          Certificate of Analysis is public and searchable by lot number.
          You can look up the exact batch you&apos;re receiving before you place
          the order, and the COA can&apos;t be edited after the fact.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          This is what research-grade supply should look like for a
          compound with 30 years of preclinical literature behind it. We
          just hold the standard.
        </p>

        {/* ── Pricing + Guarantee close ────────────────── */}
        <div className="my-14 p-6 md:p-8 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
            <div className="md:col-span-2 flex justify-center">
              <div className="relative w-40 h-40">
                <Image src={image} alt="BPC-157 research peptide" fill sizes="160px" className="object-contain" />
              </div>
            </div>
            <div className="md:col-span-3">
              <div className="text-[10px] font-bold tracking-[0.22em] text-primary uppercase mb-2">
                Research-Grade BPC-157
              </div>
              <h3 className="font-serif text-2xl md:text-3xl text-foreground mb-3 leading-tight">
                Acetate salt. HPLC-verified. Cold-chain shipped.
              </h3>

              <div className="space-y-2 mb-4">
                {product.variants.map((v) => (
                  <div
                    key={v.sku}
                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-border"
                  >
                    <div>
                      <div className="text-sm font-semibold text-foreground">{v.size}</div>
                      <div className="text-[11px] text-muted">per-mg gets cheaper at 10mg</div>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {formatPriceShort(v.price)}
                    </div>
                  </div>
                ))}
              </div>

              <Link href={`/product/${product.slug}`}>
                <Button variant="primary" size="lg" className="w-full md:w-auto">
                  Order BPC-157. Ships within 24 hrs.
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border">
            {[
              { icon: <FlaskConical className="w-4 h-4" aria-hidden="true" />, text: "≥99% HPLC verified" },
              { icon: <FileCheck className="w-4 h-4" aria-hidden="true" />, text: "Acetate salt form" },
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

        {/* Batch note */}
        <div className="my-8 p-4 rounded-lg bg-foreground/5 border border-border text-center">
          <p className="text-sm text-foreground/85">
            <Lock className="inline w-4 h-4 mr-1.5 text-foreground/60 align-text-bottom" aria-hidden="true" />
            Production runs in finite batches. Each lot carries its own COA
            with the full HPLC chromatogram and measured-quantity report from
            an A2LA-accredited independent lab. Once a lot sells through, the
            next lot gets a new number and a new published record.
          </p>
        </div>

        {/* ── Crossroads close ──────────────────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-14">
          Two paths, both with a cost.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          A researcher running BPC-157 experiments has two practical options.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          The first: order from the cheapest source, accept whatever salt form
          shows up, skip the cold-chain check, and absorb whatever variance
          ends up in the data. The sticker price is lower. The reproducibility
          cost compounds across the project. And you don&apos;t always know that
          until the paper comes back from review with questions about effect
          sizes.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          The second: pay for verified material that matches the published
          research. Acetate salt, HPLC-confirmed, mass-spec identified,
          sequence-verified, cold-chain delivered, batch-linked to a public
          COA. The sticker price is higher. The data-quality cost is what it
          should be, which is zero.
        </p>

        {/* ── Future pacing ──────────────────────────────── */}
        <h2 className="font-serif text-3xl text-foreground mb-4 mt-12">
          What clean supply looks like, downstream.
        </h2>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-5">
          A researcher working with correctly-identified, correctly-stored,
          properly-verified BPC-157 shouldn&apos;t have to think about the supply
          layer. The salt form is right. The mass is right. The COA matches
          the lot in hand. The only variables in the experiment are the ones
          the researcher designed in.
        </p>

        <p className="text-[17px] text-foreground/90 leading-[1.85] mb-10">
          That&apos;s the bar. That&apos;s what the Based Research BPC-157 lot in your lab
          should feel like.
        </p>

        {/* Final CTA */}
        <div className="text-center my-12">
          <Link href={`/product/${product.slug}`}>
            <Button variant="primary" size="lg">
              Browse BPC-157. 5mg and 10mg.
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
              q: "Acetate vs arginate: why does the salt form matter?",
              a: "Most of the Sikiric group's three-decade body of BPC-157 research used the acetate salt form. Solubility, stability, and how the compound behaves differ between the two forms. A protocol developed against the acetate-form research may not translate directly to arginate-form material. We ship acetate exclusively. The COA states it explicitly.",
            },
            {
              q: "How do I verify sequence identity?",
              a: "The full 15-residue sequence is Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val. Mass spec should show a parent-peptide mass of 1419.53 Da for the free acid. Our COAs include the MS trace alongside the HPLC chromatogram. Any reputable research-supply CoA should provide both.",
            },
            {
              q: "Storage and stability protocol?",
              a: "Lyophilized: stable at -20°C indefinitely. After reconstitution in an aqueous laboratory solvent: stable at 2-8°C for approximately 28 days. Freeze-thaw cycles should be minimized. Aliquot on reconstitution if long-term storage of the working solution is needed.",
            },
            {
              q: "What solvent for reconstitution?",
              a: "An aqueous laboratory solvent is standard for research work. BPC-157 acetate is highly soluble at physiological pH. Avoid strong reducing agents or anything that could break down peptide bonds unnecessarily.",
            },
            {
              q: "Do you ship internationally?",
              a: "United States only, currently. Cold-chain logistics and regulatory framework vary significantly across jurisdictions and we don't ship where we can't guarantee the chain stays intact.",
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
            Sikiric P, Seiwerth S, Rucman R, et al. (2010). Stable gastric
            pentadecapeptide BPC 157: novel therapy in gastrointestinal tract.{" "}
            <em>Current Pharmaceutical Design</em>, 16(10), 1224-1234.
          </li>
          <li id="r2">
            Sikiric P, Seiwerth S, Rucman R, et al. (1999). Pentadecapeptide
            BPC 157 positively affects both non-steroidal anti-inflammatory
            agent-induced gastrointestinal lesions and adjuvant arthritis in
            rats. <em>Journal of Physiology (Paris)</em>, 91(3), 113-122.
          </li>
          <li id="r3">
            Chang CH, Tsai WC, Lin MS, Hsu YH, Pang JH. (2011). The promoting
            effect of pentadecapeptide BPC 157 on tendon healing involves
            tendon outgrowth, cell survival, and cell migration.{" "}
            <em>Journal of Applied Physiology</em>, 110(3), 774-780.
          </li>
          <li id="r4">
            Krivic A, Anic T, Seiwerth S, Huljev D, Sikiric P. (2006). Achilles
            detachment in rat and stable gastric pentadecapeptide BPC 157:
            promoted tendon-to-bone healing.{" "}
            <em>Journal of Orthopaedic Research</em>, 24(5), 982-989.
          </li>
          <li id="r5">
            Hsieh MJ, Liu HT, Wang CN, et al. (2017). Therapeutic potential of
            pro-angiogenic BPC157 is associated with VEGFR2 activation and
            upregulation. <em>Journal of Molecular Medicine</em>, 95(3), 323-333.
          </li>
          <li id="r6">
            Seiwerth S, Brcic L, Vuletic LB, et al. (2013). BPC 157 and blood
            vessels. <em>Current Pharmaceutical Design</em>, 20(7), 1121-1125.
          </li>
        </ol>

        {/* Related research links */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs font-bold tracking-[0.22em] text-muted uppercase mb-3">
            Further reading
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <a
              href="https://blog.basedresearch.com/thymosin-beta4-actin-sequestration/"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-all"
            >
              <p className="text-sm font-medium text-foreground">
                TB-500 / Thymosin Beta-4: Actin Sequestration and Tissue Repair
              </p>
              <p className="text-[11px] text-muted mt-1">
                Blog · Based Research Research
              </p>
            </a>
            <Link
              href="/research/ghk-cu"
              className="block p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-all"
            >
              <p className="text-sm font-medium text-foreground">
                The Quiet Problem With Most Copper Peptide Samples (GHK-Cu)
              </p>
              <p className="text-[11px] text-muted mt-1">
                Based Research Desk · Investigation
              </p>
            </Link>
            <Link
              href={`/product/${product.slug}`}
              className="block p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-all"
            >
              <p className="text-sm font-medium text-foreground">
                BPC-157 product page: variants, COA, specs
              </p>
              <p className="text-[11px] text-muted mt-1">
                Based Research · Research Catalog
              </p>
            </Link>
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
