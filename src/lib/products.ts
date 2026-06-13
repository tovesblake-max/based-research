export interface ProductVariant {
  size: string;
  price: number; // in cents
  sku: string;
  /**
   * COGS for this variant in cents (what we pay our supplier per unit).
   * Optional — when set, the GMC/Meta feed emits
   *   custom_label_3 = "margin:fat"   (>50% gross margin)
   *                  | "margin:lean"  (≤50% gross margin)
   * Used in Meta Ads Manager to bid harder on fat-margin SKUs and floor
   * lean ones. Set per-variant since a 5mg vial vs a 10mg vial often have
   * meaningfully different unit economics.
   */
  costCents?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  longDescription: string;
  variants: ProductVariant[];
  purity: string;
  cas?: string;
  molecularWeight?: string;
  sequence?: string;
  form: string;
  storage: string;
  appearance: string;
  featured?: boolean;
  badge?: string;
  tags?: string[];
  /**
   * ISO date string ("2026-04-15") for when this SKU first went live.
   * Optional — when present and within the last 30 days, the GMC/Meta
   * feed emits custom_label_4 = "new-arrival" so Ads Manager can bid
   * extra on fresh launches while organic interest builds. Past 30 days
   * the label drops automatically.
   */
  launchedAt?: string;
  /**
   * Hidden-from-catalog products. Still addressable by slug so cart / upsell
   * components can add them, but excluded from shop index, sitemap, GMC feed,
   * and /product/[slug] static generation (direct URL returns 404).
   */
  upsellOnly?: boolean;
  /**
   * Items that don't require physical fulfillment. Orders containing only
   * `noShipping` items skip the $15 shipping surcharge and are not pushed
   * to ShipStation. Used for internal test SKUs and future digital goods.
   */
  noShipping?: boolean;
  /**
   * Multi-compound vial breakdown. Set on every blend SKU so the PDP
   * can render a prominent "What's in the vial" panel up top — most
   * blend questions ("how many mg of GHK?") are answered before the
   * customer has to open the size selector or read the long
   * description. Variants per-size MAY override this when the same
   * blend ships at different ratios (rare).
   */
  composition?: Array<{ name: string; amount: string }>;
  /**
   * Per-lot Certificate of Analysis. When set, the PDP renders a COA
   * card with preview / download. PDF lives in /public/coa/ — keep
   * filenames stable so old order receipts that link the PDF still
   * resolve. `lot` is the lab's lot identifier (we use Vanguard's
   * "Clear Cap" / numeric IDs verbatim — no internal renumbering).
   */
  coa?: {
    pdfPath: string;       // absolute path served from /public, e.g. "/coa/gip3.pdf"
    lab: string;           // testing lab name
    accreditation?: string;// e.g. "ISO 17025:2017 · A2LA #6377.01.01"
    lot: string;           // lot identifier matching the report
    laboratoryId?: string; // lab's internal report ID
    purity: string;        // human-readable purity result, e.g. ">99.80% ± 0.18%"
    quantity?: string;     // e.g. "10.82 mg" — actual measured fill
    method: string;        // e.g. "HPLC-UV/VIS"
    testDate: string;      // ISO date string (YYYY-MM-DD)
  };
}

// Available tags for filtering
export const productTags = [
  "Best Seller",
  "New Arrival",
  "Popular",
  "Bundle",
] as const;

export const products: Product[] = [
  // ─── RECOVERY & REPAIR ────────────────────────────
  {
    id: "bpc-157",
    name: "BPC-157",
    slug: "bpc-157",
    category: "tissue-repair-research",
    description: "A 15-amino acid synthetic peptide fragment derived from human gastric juice protein, supplied as a lyophilized research reference standard for in-vitro cytoprotection assays and receptor-binding studies.",
    longDescription: "BPC-157 is a 15-amino acid synthetic peptide fragment derived from human gastric juice protein. It is supplied as a lyophilized research reference standard for use in in-vitro cytoprotection assays, receptor-binding studies, and structural characterization. Not for use in any living organism. Researchers use this compound for preclinical analysis of growth-factor signaling pathways and cell-migration kinetics.",
    variants: [
      { size: "5mg", price: 4500, sku: "BPC-5", costCents: 1100 },
      { size: "10mg", price: 9000, sku: "BPC-10", costCents: 1800 },
    ],
    purity: "≥99%",
    cas: "137525-51-0",
    molecularWeight: "1419.53 g/mol",
    sequence: "Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 28 days.",
    appearance: "White to off-white powder",
    featured: true,
    badge: "Best Seller",
    tags: ["Best Seller", "Popular"],
  },
  {
    id: "tb-500",
    name: "TB-500",
    slug: "tb-500",
    category: "tissue-repair-research",
    description: "A 43-amino acid synthetic peptide (Thymosin Beta-4 fragment) supplied as a lyophilized powder for in-vitro actin-binding assays and cell-migration studies.",
    longDescription: "TB-500 (Thymosin Beta-4 fragment) is a 43-amino acid synthetic peptide supplied as a lyophilized powder for in-vitro actin-binding assays, cell-migration studies, and structural analysis. Not for use in any living organism. This compound has been characterized in cell-culture models examining actin polymerization dynamics and extracellular matrix interactions.",
    variants: [
      { size: "5mg", price: 6000, sku: "TB5-5", costCents: 1800 },
      { size: "10mg", price: 11000, sku: "TB5-10", costCents: 2800 },
    ],
    purity: "≥99%",
    cas: "77591-33-4",
    molecularWeight: "4963.50 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 28 days.",
    appearance: "White to off-white powder",
    featured: true,
    tags: ["Popular"],
  },
  {
    id: "pentadecarginine",
    name: "Pentadecarginine",
    slug: "pentadecarginine",
    category: "tissue-repair-research",
    description: "A BPC-157 analog in arginine salt form studied for enhanced solubility and in-vitro stability in research formulations.",
    longDescription: "Pentadecarginine is a stable arginine salt form of BPC-157, designed to offer improved solubility and formulation stability compared to the acetate form. Preliminary in-vitro research has examined its cytoprotective and regenerative-research-model activity with advantages in counter-ion chemistry and aqueous stability.",
    variants: [
      { size: "5mg", price: 5500, sku: "PENT-5" },
    ],
    purity: "≥99%",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 28 days.",
    appearance: "White powder",
    tags: ["New Arrival"],
    // Hidden — not in our current supplier catalog. Toggle this off
    // once Pentadecarginine is back on the supplier price list.
    upsellOnly: true,
  },

  // ─── METABOLIC RESEARCH ────────────────────────────
  // Semaglutide + Tirzepatide removed from the catalog — we no longer
  // carry those compounds. Old /product/semaglutide and
  // /product/tirzepatide URLs are handled by middleware.ts returning
  // 410 Gone for faster deindexation.
  {
    id: "glp3-rta",
    name: "GIP3",
    slug: "glp3-rta",
    category: "metabolic-research",
    description: "Triple-agonist research peptide targeting GIP, GLP-1, and glucagon receptors in preclinical metabolic studies.",
    longDescription: "This triple hormone receptor agonist research compound activates GIP, GLP-1, and glucagon receptors simultaneously in preclinical systems. Preclinical and animal-model studies have examined preclinical metabolic-parameter outcomes through this novel triple-agonist mechanism in rodent and cell-based research models.",
    variants: [
      // Per supplier catalog: Retatrutide is available at 10/15/20/30mg.
      // Pricing ladder offers a per-mg discount on bigger sizes so the
      // 30mg vial is a clear upgrade path for repeat researchers.
      { size: "10mg", price: 10000, sku: "RTA-10", costCents: 3000 },
      { size: "15mg", price: 13000, sku: "RTA-15", costCents: 3800 },
      { size: "20mg", price: 17000, sku: "RTA-20", costCents: 5000 },
      { size: "30mg", price: 22000, sku: "RTA-30", costCents: 6000 },
    ],
    purity: "≥98%",
    molecularWeight: "4625.28 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 28 days.",
    appearance: "White to off-white powder",
    tags: ["New Arrival"],
  },
  {
    id: "aod-9604",
    name: "AOD-9604",
    slug: "aod-9604",
    category: "metabolic-research",
    description: "AOD-9604 is a modified C-terminal fragment of human growth hormone supplied as a lyophilized research standard for in-vitro lipolysis assays and receptor-binding studies. Not for use in any living organism.",
    longDescription: "AOD-9604 is a 16-amino acid modified C-terminal fragment of human growth hormone (hGH 177-191), supplied as a lyophilized research standard for in-vitro lipolysis assays, receptor-binding studies, and analytical chemistry workflows. Researchers use this compound for receptor-selectivity profiling and in-vitro adipocyte cell-culture characterization. Not for use in any living organism.",
    variants: [
      { size: "5mg", price: 4500, sku: "AOD-5", costCents: 2200 },
    ],
    purity: "≥99%",
    cas: "221231-10-3",
    molecularWeight: "1815.08 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 28 days.",
    appearance: "White powder",
  },

  // ─── GROWTH & PERFORMANCE ────────────────────────────
  {
    id: "cjc-1295-no-dac",
    name: "CJC-1295 (no DAC)",
    slug: "cjc-1295-no-dac",
    category: "growth-hormone-research",
    description: "CJC-1295 is a 30-amino acid synthetic GHRH analog with a Drug Affinity Complex modification, supplied for in-vitro receptor-binding and half-life characterization studies.",
    longDescription: "CJC-1295 (no DAC / Mod GRF 1-29) is a 30-amino acid synthetic analog of growth hormone releasing hormone (GHRH) supplied as a lyophilized reference standard for in-vitro GHRH-receptor-binding assays, half-life characterization, and structural analysis. Researchers use this compound for receptor-activation assays and analytical method development. Not for use in any living organism.",
    variants: [
      // Supplier stocks CJC no-DAC at 5mg and 10mg.
      { size: "5mg", price: 4500, sku: "CJC-5", costCents: 1100 },
      { size: "10mg", price: 7000, sku: "CJC-10", costCents: 1300 },
    ],
    purity: "≥99%",
    cas: "863288-34-0",
    molecularWeight: "3367.97 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White to off-white powder",
  },
  {
    id: "ipamorelin",
    name: "Ipamorelin",
    slug: "ipamorelin",
    category: "growth-hormone-research",
    description: "Ipamorelin is a 5-amino acid synthetic peptide growth hormone secretagogue supplied for in-vitro GHS-R1a receptor-binding assays and selectivity profiling.",
    longDescription: "Ipamorelin is a 5-amino acid synthetic pentapeptide growth hormone secretagogue supplied as a lyophilized reference standard for in-vitro GHS-R1a (ghrelin receptor) binding assays, selectivity profiling against cortisol/prolactin/ACTH receptor panels, and structural analysis. Researchers use this compound for analytical method development and in-vitro receptor-activation studies. Not for use in any living organism.",
    variants: [
      // Supplier stocks Ipamorelin at 5mg and 10mg.
      { size: "5mg", price: 4500, sku: "IPA-5", costCents: 1200 },
      { size: "10mg", price: 7000, sku: "IPA-10", costCents: 2200 },
    ],
    purity: "≥99%",
    cas: "170851-70-4",
    molecularWeight: "711.85 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White powder",
  },
  {
    id: "tesamorelin",
    name: "Tesamorelin",
    slug: "tesamorelin",
    category: "growth-hormone-research",
    description: "A synthetic GHRH analog supplied as a lyophilized reference standard for in-vitro GHRH-receptor-binding assays, selectivity profiling, and analytical method development. Not for use in any living organism.",
    longDescription: "Tesamorelin is a synthetic analog of human growth hormone-releasing hormone (GHRH), supplied as a lyophilized reference standard for in-vitro GHRH-receptor-binding and receptor-activation assays, structural characterization, and analytical method development. Researchers use this compound for receptor-pharmacology profiling and chromatographic reference work in preclinical cell-culture systems. Not for use in any living organism.",
    variants: [
      // Supplier stocks Tesamorelin at 5mg and 10mg.
      { size: "5mg", price: 8000, sku: "TESA-5", costCents: 1500 },
      { size: "10mg", price: 13000, sku: "TESA-10", costCents: 2900 },
    ],
    purity: "≥99%",
    cas: "218949-48-5",
    molecularWeight: "5135.89 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White to off-white powder",
  },
  {
    id: "sermorelin",
    name: "Sermorelin",
    slug: "sermorelin",
    category: "growth-hormone-research",
    description: "Sermorelin is a 29-amino acid synthetic peptide analog of GHRH(1-29) supplied for in-vitro receptor-activation assays, structural analysis, and analytical method development.",
    longDescription: "Sermorelin is a 29-amino acid synthetic peptide corresponding to the GHRH(1-29) sequence, supplied as a lyophilized reference standard for in-vitro GHRH-receptor-activation assays, structural characterization, and analytical method development. Researchers use this compound for receptor-binding assays and chromatographic method validation. Not for use in any living organism.",
    variants: [
      // Supplier stocks Sermorelin at 5mg and 10mg.
      { size: "5mg", price: 4500, sku: "SERM-5", costCents: 1600 },
      { size: "10mg", price: 8000, sku: "SERM-10", costCents: 2800 },
    ],
    purity: "≥99%",
    cas: "86168-78-7",
    molecularWeight: "3357.88 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White to off-white powder",
  },

  // ─── LONGEVITY & SKIN RESEARCH ────────────────────────────
  {
    id: "ghk-cu",
    name: "GHK-Cu",
    slug: "ghk-cu",
    category: "longevity-research",
    description: "Copper peptide GHK-Cu. Studied in collagen/ECM assay models, in-vitro wound-assay outcomes, and antioxidant-enzyme-induction research.",
    longDescription: "GHK-Cu (glycyl-L-histidyl-L-lysine copper complex) is a naturally occurring copper complex of the tripeptide GHK. Research has examined its role in preclinical skin-remodeling models, in-vitro wound-assay outcomes, studied in collagen/ECM assay models for glycosaminoglycan synthesis, and inflammatory-marker modulation in preclinical studies. Endogenous plasma concentrations naturally decline with age.",
    variants: [
      { size: "50mg", price: 6000, sku: "GHK-50", costCents: 1100 },
      { size: "100mg", price: 10000, sku: "GHK-100", costCents: 2200 },
    ],
    purity: "≥99%",
    cas: "49557-75-7",
    molecularWeight: "403.93 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 28 days.",
    appearance: "Blue powder",
    featured: true,
    badge: "Popular",
    tags: ["Popular"],
  },
  {
    id: "epithalon",
    name: "Epithalon",
    slug: "epithalon",
    category: "longevity-research",
    description: "A synthetic tetrapeptide studied for telomerase-activation assays and cellular-senescence research mechanisms.",
    longDescription: "Epithalon (Epitalon) is a synthetic tetrapeptide (Ala-Glu-Asp-Gly) based on the natural peptide epithalamin produced by the pineal gland. Research has focused on its potential to activate telomerase, thereby elongating telomeres in human somatic cells. Studies suggest it may also regulate melatonin production and influence circadian rhythms.",
    variants: [
      // Supplier stocks Epithalon at 10mg and 50mg — 50mg added as
      // the long-course research size.
      { size: "10mg", price: 5000, sku: "EPIT-10", costCents: 800 },
      { size: "50mg", price: 17000, sku: "EPIT-50", costCents: 2800 },
    ],
    purity: "≥99%",
    cas: "307297-39-8",
    molecularWeight: "390.35 g/mol",
    sequence: "Ala-Glu-Asp-Gly",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 28 days.",
    appearance: "White powder",
  },
  {
    id: "nad-plus",
    name: "NAD+",
    slug: "nad-plus",
    category: "longevity-research",
    description: "Nicotinamide adenine dinucleotide (NAD+). A coenzyme reference standard supplied for in-vitro cell-culture and analytical method-development research. Not for use in any living organism.",
    longDescription: "NAD+ (Nicotinamide Adenine Dinucleotide) is a coenzyme reference standard supplied as a lyophilized powder for in-vitro cell-culture studies, sirtuin- and mitochondrial-pathway assay models, and analytical method development. Researchers use this compound for enzyme-activity assays and chromatographic reference work. Not for use in any living organism.",
    variants: [
      // Supplier offers NAD+ at 500mg only — 750mg variant removed.
      { size: "500mg", price: 14000, sku: "NAD-500", costCents: 2600 },
    ],
    purity: "≥99%",
    cas: "53-84-9",
    molecularWeight: "663.43 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Protect from light and moisture.",
    appearance: "White to yellow powder",
    featured: true,
    badge: "Popular",
    tags: ["Popular"],
  },

  // ─── SEXUAL HEALTH ────────────────────────────
  {
    id: "pt-141",
    name: "PT-141",
    slug: "pt-141",
    category: "neuroendocrine-research",
    description: "Bremelanotide. A melanocortin (MC1R/MC4R) receptor agonist supplied as a lyophilized reference standard for in-vitro receptor-binding assays and analytical characterization. Not for use in any living organism.",
    longDescription: "PT-141 (Bremelanotide) is a synthetic cyclic heptapeptide analog of alpha-melanocyte stimulating hormone (α-MSH), supplied as a lyophilized reference standard for in-vitro melanocortin (MC4R/MC1R) receptor-binding assays, selectivity profiling, and analytical method development. Researchers use this compound for receptor-pharmacology characterization and chromatographic reference work. Not for use in any living organism.",
    variants: [
      { size: "10mg", price: 5500, sku: "PT14-10", costCents: 1800 },
    ],
    purity: "≥99%",
    cas: "189691-06-3",
    molecularWeight: "1025.18 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White powder",
  },

  // ─── BLENDS ────────────────────────────
  {
    id: "bpc-tb-blend",
    name: "BPC-157 + TB-500 Blend",
    slug: "bpc-157-tb-500-blend",
    category: "tissue-repair-research",
    description: "A lyophilized blend combining BPC-157 (15 aa, 1419.53 g/mol) and TB-500 (43 aa, 4963.50 g/mol) for in-vitro co-incubation and synergy assays.",
    longDescription: "This lyophilized research blend combines BPC-157 (5mg, 15 amino acids, 1419.53 g/mol) and TB-500 (5mg, 43 amino acids, 4963.50 g/mol) in a single vial for in-vitro co-incubation and synergy assays. Intended for cell-migration-model co-activation studies, endothelial tube-formation assays, and receptor-binding characterization of the two-component system. Not for use in any living organism.",
    variants: [
      // Supplier stocks BPC/TB500 blend at 5mg/5mg and 10mg/10mg.
      { size: "10mg (5mg/5mg)", price: 8000, sku: "BPTB-10", costCents: 2500 },
      { size: "20mg (10mg/10mg)", price: 13000, sku: "BPTB-20", costCents: 3600 },
    ],
    // Composition shown is for the default (first) variant. The PDP
    // ladder will additionally surface the per-size split via
    // variant.size when a second size is selected.
    composition: [
      { name: "BPC-157", amount: "5mg" },
      { name: "TB-500", amount: "5mg" },
    ],
    purity: "≥99%",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 28 days.",
    appearance: "White to off-white powder",
    badge: "Best Value",
    tags: ["Bundle", "Popular"],
  },
  {
    id: "cjc-ipa-blend",
    name: "CJC-1295 + Ipamorelin Blend",
    slug: "cjc-1295-ipamorelin-blend",
    category: "growth-hormone-research",
    description: "A lyophilized blend combining CJC-1295 no DAC (30 aa, 3367.97 g/mol) and Ipamorelin (5 aa, 711.85 g/mol) for in-vitro receptor co-activation studies.",
    longDescription: "This lyophilized research blend combines CJC-1295 no DAC (5mg, 30 amino acids, 3367.97 g/mol) and Ipamorelin (5mg, 5 amino acids, 711.85 g/mol) for in-vitro co-activation studies targeting the GHRH receptor and the GHS-R1a (ghrelin) receptor respectively. Supplied for receptor-binding characterization and two-receptor selectivity profiling. Not for use in any living organism.",
    variants: [
      { size: "10mg (5mg/5mg)", price: 7500, sku: "CJCIPA-10", costCents: 2100 },
    ],
    composition: [
      { name: "CJC-1295 (no DAC)", amount: "5mg" },
      { name: "Ipamorelin", amount: "5mg" },
    ],
    purity: "≥99%",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White to off-white powder",
    tags: ["Bundle"],
  },
  {
    // ── CJC-1295 with DAC + Ipamorelin Blend ─────────────────
    // Pairs the DAC-modified (extended-half-life, ~1 week) GHRH analog
    // with Ipamorelin's selective GHS-R1a activation. The classic
    // GH-axis research stack for sustained-pulse studies — distinct
    // from the no-DAC variant of this blend (which has a minutes-long
    // half-life on the GHRH side). Added 2026-05-06 by the operator's request.
    id: "cjc-dac-ipa-blend",
    name: "CJC-1295 with DAC + Ipamorelin Blend",
    slug: "cjc-1295-with-dac-ipamorelin-blend",
    category: "growth-hormone-research",
    description:
      "A lyophilized blend pairing CJC-1295 with DAC (extended-half-life GHRH analog) and Ipamorelin (selective GHS-R1a agonist) for in-vitro receptor co-activation studies.",
    longDescription:
      "This lyophilized research blend combines CJC-1295 with DAC (30 amino acids, 3647.27 g/mol) and Ipamorelin (5 amino acids, 711.85 g/mol) for in-vitro co-activation studies targeting the GHRH receptor and the GHS-R1a (ghrelin) receptor respectively. The DAC (Drug Affinity Complex) modification covalently couples CJC-1295 to a maleimide chemistry that binds endogenous albumin in preclinical models, extending serum half-life from minutes (the no-DAC form) to days. Pairing this with Ipamorelin's pulsatile ghrelin-receptor activation lets researchers profile sustained-baseline + pulsed-stimulus signaling in two-receptor selectivity studies and analytical method development. Not for use in any living organism.",
    variants: [
      // Pricing reflects ~10% blend savings vs buying the components
      // separately ($100 + $45 = $145 → $130 for 10mg, $160 + $45 =
      // $205 → $185 for 15mg). Margins land at ~71% on both variants
      // matching the existing CJC-Ipa (no-DAC) blend's economics.
      { size: "10mg (5mg/5mg)", price: 13000, sku: "CJCDACIPA-10", costCents: 3700 },
      { size: "15mg (10mg/5mg)", price: 18500, sku: "CJCDACIPA-15", costCents: 5200 },
    ],
    // Default composition reflects the 10mg (5/5) variant. The PDP's
    // size selector surfaces the variant.size string for the 15mg
    // (10/5) variant so customers see the actual ratio in either case.
    composition: [
      { name: "CJC-1295 with DAC", amount: "5mg" },
      { name: "Ipamorelin", amount: "5mg" },
    ],
    purity: "≥99%",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White to off-white powder",
    tags: ["Bundle", "New Arrival"],
  },
  {
    id: "tesa-ipa-blend",
    name: "Tesamorelin + Ipamorelin Blend",
    slug: "tesamorelin-ipamorelin-blend",
    category: "growth-hormone-research",
    description: "A reference blend of a GHRH analog and a selective GHS-R1a secretagogue, supplied as a lyophilized standard for in-vitro receptor-binding and co-incubation assay research. Not for use in any living organism.",
    longDescription: "This reference blend pairs Tesamorelin (4mg) and Ipamorelin (4mg) for in-vitro co-incubation studies of GHRH-receptor and GHS-R1a (ghrelin receptor) signaling. Researchers use it for receptor-selectivity profiling against cortisol/prolactin/ACTH panels and analytical method development. Supplied as a lyophilized reference standard; not for use in any living organism.",
    variants: [
      // Supplier stocks this blend at 5mg/5mg and 10mg/5mg. We offer
      // both so researchers can pick the ratio they need. Our previous
      // 4mg/4mg blend was not a supplier SKU.
      { size: "10mg (5mg/5mg)", price: 10000, sku: "TESIPA-10", costCents: 3400 },
      { size: "15mg (10mg/5mg)", price: 14000, sku: "TESIPA-15", costCents: 4400 },
    ],
    // Default composition reflects the 10mg (5/5) variant. The PDP's
    // size selector surfaces the variant.size string when the 15mg
    // (10/5) variant is chosen, so customers see the actual ratio in
    // either case.
    composition: [
      { name: "Tesamorelin", amount: "5mg" },
      { name: "Ipamorelin", amount: "5mg" },
    ],
    purity: "≥99%",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White to off-white powder",
    tags: ["Bundle"],
  },
  // Recovery Tri-Blend — REMOVED 2026-05-05 by the operator. We don't carry
  // this SKU. Old /product/recovery-tri-blend URL handled by middleware
  // returning 410 Gone (faster Google deindex than 404). Was previously
  // surfaced as the post-purchase upsell hero; that flow now uses
  // Glow Blend → Klow Blend instead (see PostPurchaseUpsell.tsx).

  // ─── IMMUNE & THYMIC ────────────────────────────
  {
    id: "kpv",
    name: "KPV",
    slug: "kpv",
    category: "inflammation-research",
    description: "A synthetic tripeptide fragment derived from alpha-MSH studied for immune-signaling and inflammatory-marker modulation in preclinical studies.",
    longDescription: "KPV (Lysine-Proline-Valine) is a synthetic tripeptide fragment derived from the C-terminus of alpha-melanocyte-stimulating hormone (α-MSH). Research has examined its potential for modulating immune-signaling and inflammatory-marker pathways in preclinical studies. Studies suggest it may interact with NF-κB signaling and exhibit inflammatory-marker modulation in preclinical cell and tissue models.",
    variants: [
      { size: "10mg", price: 9000, sku: "KPV-10", costCents: 1000 },
    ],
    purity: "≥99%",
    cas: "67727-97-3",
    molecularWeight: "327.42 g/mol",
    sequence: "Lys-Pro-Val",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 28 days.",
    appearance: "White to off-white powder",
  },
  {
    id: "vip",
    name: "VIP (Vasoactive Intestinal Peptide)",
    slug: "vip",
    category: "inflammation-research",
    description: "A 28-amino acid neuropeptide studied in preclinical models for immune-regulation, vasodilation assays, and neuroprotective assay models.",
    longDescription: "Vasoactive Intestinal Peptide (VIP) is a 28-amino acid neuropeptide involved in smooth muscle relaxation, vasodilation, and immune modulation. Preclinical research has explored its role in inflammatory-marker modulation in preclinical studies, neuroprotective assay models, and gastrointestinal preclinical models.",
    variants: [
      // Supplier ships "VIP10" at 10mg only — size corrected from our
      // original 5mg listing, retail adjusted proportionally.
      { size: "10mg", price: 10000, sku: "VIP-10", costCents: 2400 },
    ],
    purity: "≥99%",
    cas: "40077-57-4",
    molecularWeight: "3326.82 g/mol",
    sequence: "His-Ser-Asp-Ala-Val-Phe-Thr-Asp-Asn-Tyr-Thr-Arg-Leu-Arg-Lys-Gln-Met-Ala-Val-Lys-Lys-Tyr-Leu-Asn-Ser-Ile-Leu-Asn",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White powder",
  },
  {
    id: "thymalin",
    name: "Thymalin",
    slug: "thymalin",
    category: "immune-modulation-research",
    description: "A thymic polypeptide hormone studied for immune system regulation and neuroendocrine function.",
    longDescription: "Thymalin is a polypeptide hormone naturally secreted by the thymus gland. Preclinical research has examined its role in immune-function regulation, T-cell maturation in cell-culture models, and neuroendocrine signaling pathways. Studies in research models have investigated its modulation of immune markers and age-related immune-system parameters.",
    variants: [
      { size: "10mg", price: 7000, sku: "THYM-10", costCents: 1200 },
    ],
    purity: "≥99%",
    cas: "63958-90-7",
    molecularWeight: "3108.50 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White to off-white powder",
  },
  {
    id: "thymosin-alpha-1",
    name: "Thymosin Alpha-1",
    slug: "thymosin-alpha-1",
    category: "immune-modulation-research",
    description: "A synthetic 28-amino acid peptide modeled after a thymus gland sequence, studied for immune modulation.",
    longDescription: "Thymosin Alpha-1 is a synthetic peptide based on a naturally occurring sequence from the thymus gland. It has been extensively researched for its immunomodulatory properties, including T-cell activation and maturation, dendritic cell function, and cytokine regulation. It is one of the most studied thymic peptides in clinical research.",
    variants: [
      // Supplier stocks Thymosin α-1 at 5mg and 10mg.
      { size: "5mg", price: 7000, sku: "TA1-5", costCents: 1400 },
      { size: "10mg", price: 12000, sku: "TA1-10", costCents: 2400 },
    ],
    purity: "≥99%",
    cas: "62304-98-7",
    molecularWeight: "3108.27 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White powder",
  },

  // ─── NOOTROPICS & NEURO ────────────────────────────
  {
    id: "dsip",
    name: "DSIP",
    slug: "dsip",
    category: "circadian-research",
    description: "Delta Sleep-Inducing Peptide (DSIP). A naturally occurring nonapeptide supplied as a lyophilized reference standard for in-vitro receptor-binding and circadian-pathway assay research. Not for use in any living organism.",
    longDescription: "DSIP (Delta Sleep-Inducing Peptide) is a naturally occurring nonapeptide, supplied as a lyophilized reference standard for in-vitro circadian-pathway and neuroendocrine receptor-binding assays, structural characterization, and analytical method development. Researchers use this compound for HPA-axis signaling assay models and chromatographic reference work. Not for use in any living organism.",
    variants: [
      { size: "5mg", price: 4500, sku: "DSIP-5", costCents: 1200 },
    ],
    purity: "≥99%",
    cas: "62568-57-4",
    molecularWeight: "848.82 g/mol",
    sequence: "Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White to off-white powder",
  },
  {
    id: "selank",
    name: "Selank",
    slug: "selank",
    category: "nootropic-research",
    description: "A synthetic analog of tuftsin studied for anxiolytic, nootropic, and immunomodulatory effects.",
    longDescription: "Selank is a synthetic heptapeptide analog of the endogenous tetrapeptide tuftsin. It has been researched in preclinical models for anxiolytic-assay and nootropic-assay activity, as well as immunomodulatory signaling and inflammatory-marker modulation in preclinical studies. Studies suggest it may influence GABA, serotonin, and dopamine signaling pathways.",
    variants: [
      { size: "10mg", price: 7000, sku: "SEL-10", costCents: 1600 },
    ],
    purity: "≥99%",
    cas: "129954-34-3",
    molecularWeight: "751.87 g/mol",
    sequence: "Thr-Lys-Pro-Arg-Pro-Gly-Pro",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White to off-white powder",
  },
  {
    id: "semax",
    name: "Semax",
    slug: "semax",
    category: "nootropic-research",
    description: "A synthetic heptapeptide derived from ACTH studied in neuroprotective assay models and cognitive-research preclinical models.",
    longDescription: "Semax is a synthetic heptapeptide derived from the N-terminal fragment of adrenocorticotropic hormone (ACTH 4-10). Preclinical research has examined neuroprotective assay model activity and cognitive-research preclinical-model effects. Studies suggest it may promote BDNF expression, modulate neurotransmitter systems, and support neuronal survival in preclinical cell-culture stress models.",
    variants: [
      // Supplier stocks Semax at 5mg only — size corrected from 30mg,
      // retail adjusted to match the per-mg equivalent of the old 30mg
      // ($99/30mg ≈ $3.30/mg → $5mg vial ≈ $39).
      { size: "5mg", price: 4000, sku: "SMX-5", costCents: 900 },
    ],
    purity: "≥99%",
    cas: "80714-61-0",
    molecularWeight: "813.93 g/mol",
    sequence: "Met-Glu-His-Phe-Pro-Gly-Pro",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White powder",
  },
  {
    id: "oxytocin",
    name: "Oxytocin",
    slug: "oxytocin",
    category: "neuroendocrine-research",
    description: "Oxytocin is a 9-amino acid cyclic neuropeptide supplied as a lyophilized reference standard for in-vitro receptor-binding assays, structural studies, and analytical method validation. Not for use in any living organism.",
    longDescription: "Oxytocin is a 9-amino acid cyclic neuropeptide supplied as a lyophilized reference standard for in-vitro OXTR receptor-binding assays, structural analysis, and analytical method validation. Researchers use this compound for chromatographic characterization, mass-spectrometry reference, and in-vitro receptor-selectivity profiling. Not for use in any living organism.",
    variants: [
      // Supplier catalog offers Oxytocin at 5mg only — 10mg variant
      // removed to keep the catalog fulfillable from our primary supplier.
      { size: "5mg", price: 5000, sku: "OXY-5", costCents: 1200 },
    ],
    purity: "≥99%",
    cas: "50-56-6",
    molecularWeight: "1007.19 g/mol",
    sequence: "Cys-Tyr-Ile-Gln-Asn-Cys-Pro-Leu-Gly-NH₂",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White powder",
  },

  // ─── LONGEVITY & SKIN RESEARCH (continued) ────────────────────────────
  {
    id: "mots-c",
    name: "MOTS-c",
    slug: "mots-c",
    category: "metabolic-research",
    description: "A mitochondrial-derived peptide studied for cellular energy regulation and metabolic signaling.",
    longDescription: "MOTS-c is a 16-amino acid mitochondrial-derived peptide encoded by the 12S rRNA gene within mitochondrial DNA. Research has characterized its activity in cellular-metabolism and exercise-mimetic preclinical cell-culture assays. Studies suggest it activates AMPK signaling markers and may modulate metabolic-homeostasis readouts across multiple tissue-culture systems.",
    variants: [
      // Supplier stocks MOTS-c at 10mg and 40mg — 5mg variant dropped,
      // 40mg added for the volume researcher tier.
      { size: "10mg", price: 9000, sku: "MOTS-10", costCents: 1800 },
      // 40mg pushed from $259 → $275 rather than $260 — at the volume-
      // researcher price tier, $260 reads as a lazy round-down. $275 is
      // a clean half-step that matches the premium positioning.
      { size: "40mg", price: 27500, sku: "MOTS-40", costCents: 5800 },
    ],
    purity: "≥99%",
    cas: "1627580-64-6",
    molecularWeight: "2174.60 g/mol",
    sequence: "Met-Arg-Trp-Gln-Glu-Met-Gly-Tyr-Ile-Phe-Tyr-Pro-Arg-Lys-Leu-Arg",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 28 days.",
    appearance: "White to off-white powder",
    tags: ["New Arrival"],
  },
  {
    id: "ptd-dbm",
    name: "PTD-DBM",
    slug: "ptd-dbm",
    category: "longevity-research",
    description: "A cell-penetrating peptide studied for Wnt/β-catenin pathway modulation and hair follicle research.",
    longDescription: "PTD-DBM is a synthetic peptide combining an arginine-rich protein transduction domain with a Dishevelled-binding motif. Research has focused on its ability to modulate the Wnt/β-catenin signaling pathway. Studies suggest potential applications in hair follicle neogenesis and dermal papilla cell activation.",
    variants: [
      { size: "10mg", price: 18000, sku: "PTD-10" },
    ],
    purity: "≥98%",
    cas: "1609454-11-6",
    molecularWeight: "3082.62 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White to off-white powder",
    tags: ["New Arrival"],
    // Hidden — not on supplier list.
    upsellOnly: true,
  },
  {
    id: "foxo4-dri",
    name: "FOXO4-DRI",
    slug: "foxo4-dri",
    category: "longevity-research",
    description: "A D-retro-inverso peptide of FOXO4 studied for senescent cell modulation and aging research.",
    longDescription: "FOXO4-DRI is a synthetic D-retro-inverso peptide designed to disrupt the FOXO4-p53 interaction in senescent cells. Research has demonstrated its potential to selectively target senescent cells while sparing healthy cells. Studies suggest applications in aging research and cellular senescence modulation.",
    variants: [
      { size: "10mg", price: 30000, sku: "FOX4-10" },
    ],
    purity: "≥98%",
    molecularWeight: "5358.00 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 14 days.",
    appearance: "White to off-white powder",
    tags: ["New Arrival"],
    // Hidden — not on supplier list.
    upsellOnly: true,
  },

  // ─── WEIGHT MANAGEMENT (continued) ────────────────────────────
  {
    id: "cagrilintide",
    name: "Cagrilintide",
    slug: "cagrilintide",
    category: "metabolic-research",
    description: "A long-acting amylin-receptor analog supplied as a lyophilized reference standard for in-vitro amylin/calcitonin receptor-binding assays and metabolic-pathway research. Not for use in any living organism.",
    longDescription: "Cagrilintide is a long-acting amylin-receptor agonist supplied as a lyophilized reference standard for in-vitro amylin (AMY) and calcitonin receptor-binding assays, selectivity profiling, and analytical method development. Researchers use this compound in cell-based metabolic-signaling assays and chromatographic reference work, including co-incubation studies with GLP-1 receptor reference standards. Not for use in any living organism.",
    variants: [
      { size: "10mg", price: 13000, sku: "CAG-10", costCents: 3200 },
    ],
    purity: "≥99%",
    cas: "1415456-99-3",
    molecularWeight: "4409.00 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 28 days.",
    appearance: "White powder",
    tags: ["New Arrival"],
  },
  {
    id: "5-amino-1mq",
    name: "5-Amino-1MQ",
    slug: "5-amino-1mq",
    category: "metabolic-research",
    description: "A small molecule NNMT inhibitor studied for cellular metabolism and NAD+ pathway regulation.",
    longDescription: "5-Amino-1MQ is a small molecule inhibitor of nicotinamide N-methyltransferase (NNMT). Research has demonstrated its potential to increase intracellular NAD+ concentrations, reduce lipogenesis in adipocytes, and modulate cellular energy metabolism. It represents a novel approach to metabolic research.",
    variants: [
      // Supplier stocks 5-Amino-1MQ at 5mg only — size corrected from
      // 50mg. Retail set at a ~3× cost markup.
      { size: "5mg", price: 5000, sku: "5A1M-5", costCents: 1500 },
    ],
    purity: "≥99%",
    cas: "42464-96-0",
    molecularWeight: "159.19 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at room temperature. Protect from light and moisture.",
    appearance: "White to off-white powder",
    tags: ["New Arrival"],
  },

  // ─── RECOVERY & REPAIR (continued) ────────────────────────────
  {
    id: "ara-290",
    name: "ARA-290",
    slug: "ara-290",
    category: "inflammation-research",
    description: "ARA-290 is an 11-amino acid synthetic peptide derived from erythropoietin supplied as a lyophilized research standard for in-vitro receptor-binding assays and structural characterization. Not for use in any living organism.",
    longDescription: "ARA-290 is an 11-amino acid synthetic peptide derived from a structural domain of erythropoietin, supplied as a lyophilized research standard for in-vitro receptor-binding assays, structural characterization, and analytical method development. Researchers use this compound for innate-repair-receptor binding studies and chromatographic reference work in preclinical cell cultures. Not for use in any living organism.",
    variants: [
      // Supplier ships ARA-290 at 10mg — size corrected from 12mg.
      { size: "10mg", price: 7000, sku: "ARA-10", costCents: 1200 },
    ],
    purity: "≥99%",
    cas: "1208243-50-8",
    molecularWeight: "1257.34 g/mol",
    sequence: "Pyr-Glu-Gln-Leu-Glu-Arg-Ala-Leu-Asn-Ser-Ser",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White to off-white powder",
    tags: ["New Arrival"],
  },
  {
    id: "larazotide",
    name: "Larazotide",
    slug: "larazotide",
    category: "inflammation-research",
    description: "A synthetic peptide studied for tight junction modulation and intestinal permeability research.",
    longDescription: "Larazotide is a synthetic octapeptide designed to modulate intestinal tight junctions in GI epithelial cell models. Preclinical research has explored its effects on paracellular permeability in gastrointestinal preclinical models by regulating zonulin-mediated tight-junction dynamics. Research studies have examined its role in gut-barrier-integrity research models.",
    variants: [
      { size: "10mg", price: 11000, sku: "LAR-10" },
    ],
    purity: "≥99%",
    cas: "258818-34-7",
    molecularWeight: "1017.09 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White powder",
    tags: ["New Arrival"],
    // Hidden — not on supplier list.
    upsellOnly: true,
  },

  // ─── SEXUAL HEALTH (continued) ────────────────────────────
  {
    id: "kisspeptin-10",
    name: "Kisspeptin-10",
    slug: "kisspeptin-10",
    category: "neuroendocrine-research",
    description: "A decapeptide fragment of kisspeptin studied for reproductive function and GnRH signaling.",
    longDescription: "Kisspeptin-10 is a decapeptide fragment of the kisspeptin protein, a crucial regulator of mammalian reproductive function. It acts through the GPR54 (KISS1R) receptor to stimulate GnRH release. Research has demonstrated its role in puberty onset, fertility regulation, and hypothalamic-pituitary-gonadal axis modulation.",
    variants: [
      // Supplier offers Kisspeptin at 5mg only — 10mg variant removed.
      { size: "5mg", price: 6000, sku: "KP10-5", costCents: 1500 },
    ],
    purity: "≥99%",
    cas: "374675-21-5",
    molecularWeight: "1302.41 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White powder",
  },

  // ─── ACCESSORIES ────────────────────────────
  // Bacteriostatic Water — HIDDEN from public catalog as of 2026-05-21.
  // Stays addressable by slug so historical orders / admin tools that
  // reference it still resolve, but no longer surfaced anywhere
  // customer-facing (catalog, search, bump offer all suppressed).
  {
    id: "bac-water",
    name: "Bacteriostatic Water",
    slug: "bacteriostatic-water",
    category: "accessories",
    description: "10mL bacteriostatic water for peptide reconstitution. Contains 0.9% benzyl alcohol as a preservative.",
    longDescription: "Bacteriostatic water is sterile water containing 0.9% benzyl alcohol as a bacteriostatic preservative. It is the recommended solvent for reconstituting lyophilized peptides. The benzyl alcohol prevents bacterial growth, allowing multi-use over a period of up to 28 days when stored at 2-8°C.",
    variants: [
      { size: "10mL", price: 2000, sku: "BAC-10", costCents: 1500 },
    ],
    purity: "USP Grade",
    form: "Sterile Solution",
    storage: "Store at room temperature. After first use: 2-8°C, use within 28 days.",
    appearance: "Clear, colorless liquid",
    upsellOnly: true,
  },
  // Syringes + alcohol prep pads removed 2026-05-21 as part of the
  // research-only compliance posture — these are consumption-infrastructure
  // SKUs that contradict the "lab use only, not for human or animal
  // consumption" positioning that most payment processors require for this
  // category, and the 21 CFR §201.128 framing.
  {
    id: "mini-fridge",
    name: "Portable Peptide Storage Fridge",
    slug: "portable-peptide-storage-fridge",
    category: "accessories",
    description: "Compact 4L mini fridge with dual-temperature control, designed for laboratory peptide storage.",
    longDescription: "This compact 4L mini fridge is designed for laboratory environments requiring small-scale, dual-temperature storage. Built with ABS food-grade plastic and semiconductor refrigeration, it features both cooling and heating modes. Cooling range: 15-20°C below ambient temperature. Heating range: 55-65°C. Power consumption: 42W.",
    variants: [
      { size: "4L", price: 12000, sku: "FRIDGE-4L" },
    ],
    purity: "N/A",
    form: "Electronic Device",
    storage: "N/A",
    appearance: "White compact unit",
    // Removed from the open catalog 2026-05-26 — accessories are no longer
    // surfaced in public browse alongside the research-materials catalog.
    upsellOnly: true,
  },
  // ─── ADDITIONAL PRODUCTS (from Power Peptides) ────
  // Removed 2026-05-21 (compliance hardening): P21 Peptide Spray,
  // Adamax Spray, and BPC-157 Tablets. Nasal sprays and oral tablets are
  // human-consumption product formats that contradict the research-use-only
  // posture — a research reference standard ships as lyophilized powder in a
  // vial, not as something you inhale or swallow. These were already
  // upsellOnly (hidden from catalog) and had zero order history. Their
  // /product/* URLs now return 410 Gone via middleware.
  {
    id: "glow-blend",
    name: "Glow Blend",
    slug: "glow-blend",
    category: "longevity-research",
    description: "A lyophilized blend of BPC-157 (15 aa), TB-500 (43 aa), and GHK-Cu (copper tripeptide complex) supplied for in-vitro extracellular-matrix and copper-binding assays.",
    longDescription: "The Glow Blend combines three synthetic compounds in a single lyophilized vial totaling 70mg: BPC-157 (10mg, 15 amino acids, 1419.53 g/mol), TB-500 (10mg, 43 amino acids, 4963.50 g/mol), and GHK-Cu (50mg, glycyl-L-histidyl-L-lysine copper complex, 403.93 g/mol). Supplied for in-vitro extracellular-matrix assay work, copper-binding characterization, and multi-component analytical method development. Not for use in any living organism.",
    variants: [
      { size: "70mg (10mg BPC + 10mg TB + 50mg GHK)", price: 20000, sku: "GLOW-70", costCents: 4800 },
    ],
    composition: [
      { name: "BPC-157", amount: "10mg" },
      { name: "TB-500", amount: "10mg" },
      { name: "GHK-Cu", amount: "50mg" },
    ],
    purity: "≥98%",
    form: "Lyophilized Powder",
    storage: "Store lyophilized at -20°C. Reconstituted: 2-8°C, use within 10 days.",
    appearance: "Blue-tinted lyophilized powder",
    tags: ["New Arrival"],
  },
  // ─── Internal payment test SKUs were removed once checkout was
  // verified end-to-end. Order history references SKUs by string, not FK,
  // so removing a SKU from the catalog never breaks historical data.
  {
    id: "ss-31",
    name: "SS-31 (Elamipretide)",
    slug: "ss-31-elamipretide",
    category: "longevity-research",
    description: "A mitochondria-targeted peptide studied in preclinical cell-culture models of cellular energy regulation and mitochondrial-dysfunction research models.",
    longDescription: "SS-31, also known as Elamipretide or Bendavia, is a cell-permeable tetrapeptide that selectively targets cardiolipin in the inner mitochondrial membrane. By stabilizing electron-transport-chain interactions and modulating reactive oxygen species markers in preclinical models, SS-31 has been investigated for mitochondrial-function parameters in aging and disease-model research systems. Preclinical research has explored its activity in animal models of mitochondrial dysfunction, including cardiac and retinal research-model pathology studies.",
    variants: [
      // Supplier stocks SS-31 at 10mg and 50mg — 5mg variant dropped,
      // 50mg added for the volume researcher tier.
      { size: "10mg", price: 16000, sku: "SS31-10", costCents: 1800 },
      { size: "50mg", price: 38000, sku: "SS31-50", costCents: 6000 },
    ],
    purity: "≥98%",
    cas: "736992-21-5",
    molecularWeight: "640.75 g/mol",
    sequence: "D-Arg-Dmt-Lys-Phe-NH₂",
    form: "Lyophilized Powder",
    storage: "Store lyophilized at -20°C. Reconstituted: 2-8°C, use within 14 days.",
    appearance: "White lyophilized powder",
    tags: ["New Arrival"],
  },

  // ─── 2026-05-05 SUPPLIER-LIST EXPANSION ───────────────
  // Added from the Based Research supplier price list (PDF dated 2026-05-05).
  // All entries priced at ~75% gross margin (cost × 4 with round-up bias
  // to clean retail numbers). These SKUs round out the GH-axis,
  // melanocortin, and longevity research shelves and add the Klow Blend
  // (which the operator confirmed is a supplier-formulated product we should
  // carry).

  // ── Klow Blend ──
  // Four-component lyophilized blend confirmed by the operator on 2026-05-05:
  // GHK-Cu 50mg + KPV 10mg + BPC-157 10mg + TB-500 10mg = 80mg total.
  // Differentiated from Glow Blend (BPC + TB + GHK) by the addition of
  // KPV (alpha-MSH C-terminal tripeptide), giving researchers a
  // four-pathway in-vitro panel covering: copper-tripeptide /
  // ECM (GHK), inflammation-marker modulation (KPV), gastric-juice
  // cytoprotection (BPC), and actin-binding tissue-repair (TB).
  {
    id: "klow-blend",
    name: "Klow Blend",
    slug: "klow-blend",
    category: "longevity-research",
    description:
      "A four-component lyophilized blend (80mg total): GHK-Cu (50mg), KPV (10mg), BPC-157 (10mg), and TB-500 (10mg). Supplied for in-vitro co-incubation and multi-pathway research panels.",
    longDescription:
      "The Klow Blend combines four synthetic compounds in a single lyophilized vial totaling 80mg: GHK-Cu (50mg, glycyl-L-histidyl-L-lysine copper complex, 403.93 g/mol), KPV (10mg, Lysine-Proline-Valine alpha-MSH fragment, 327.42 g/mol), BPC-157 (10mg, 15 amino acids, 1419.53 g/mol), and TB-500 (10mg, 43 amino acids, 4963.50 g/mol). Supplied for multi-pathway in-vitro research panels covering copper-binding / extracellular-matrix assays (GHK), inflammatory-marker modulation studies (KPV), gastric-juice cytoprotection assay models (BPC), and actin-binding / cell-migration assays (TB). Distinct from the Glow Blend by the addition of KPV's alpha-MSH C-terminal pathway. Not for use in any living organism.",
    variants: [
      { size: "80mg (50/10/10/10mg)", price: 20000, sku: "KLOW-80", costCents: 5000 },
    ],
    composition: [
      { name: "GHK-Cu", amount: "50mg" },
      { name: "KPV", amount: "10mg" },
      { name: "BPC-157", amount: "10mg" },
      { name: "TB-500", amount: "10mg" },
    ],
    purity: "≥98%",
    form: "Lyophilized Powder",
    storage: "Store lyophilized at -20°C. Reconstituted: 2-8°C, use within 14 days.",
    appearance: "Blue-tinted lyophilized powder",
    tags: ["New Arrival", "Bundle"],
  },

  // ── CJC-1295 with DAC ──
  // Sibling SKU to the existing no-DAC variant. The DAC (Drug Affinity
  // Complex) modification extends serum half-life from minutes to days
  // in preclinical models — different research use case from the no-DAC
  // form, not a substitute.
  {
    id: "cjc-1295-with-dac",
    name: "CJC-1295 (with DAC)",
    slug: "cjc-1295-with-dac",
    category: "growth-hormone-research",
    description:
      "CJC-1295 with DAC (Drug Affinity Complex) modification, supplied as a lyophilized reference standard for extended-half-life GHRH-receptor research. Distinct from the no-DAC form in pharmacokinetic profile.",
    longDescription:
      "CJC-1295 with DAC is a synthetic 30-amino-acid GHRH analog covalently modified with a Drug Affinity Complex side chain that binds endogenous albumin in preclinical models, extending the molecule's serum half-life from minutes (the no-DAC form) to days. Supplied as a lyophilized reference standard for in-vitro GHRH-receptor binding assays, half-life characterization, and pharmacokinetic method development. Researchers use this compound for extended-pulse-frequency GH-axis studies and analytical chromatographic reference. Not for use in any living organism.",
    variants: [
      { size: "5mg", price: 10000, sku: "CJCDAC-5", costCents: 2500 },
      { size: "10mg", price: 16000, sku: "CJCDAC-10", costCents: 4000 },
    ],
    purity: "≥99%",
    cas: "863288-34-0",
    molecularWeight: "3647.27 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White to off-white powder",
    tags: ["New Arrival"],
  },

  // ── Follistatin 344 ──
  {
    id: "follistatin-344",
    name: "Follistatin 344",
    slug: "follistatin-344",
    category: "growth-hormone-research",
    description:
      "A 344-residue follistatin isoform supplied as a lyophilized reference for myostatin-pathway and TGF-β superfamily research.",
    longDescription:
      "Follistatin 344 is a 344-amino-acid isoform of the endogenous follistatin protein, supplied as a lyophilized reference standard for in-vitro studies of myostatin (GDF-8) inhibition, TGF-β superfamily signaling, and activin-pathway research. Researchers use this compound for receptor-binding characterization and as a positive control in myostatin-inhibition assay panels. Not for use in any living organism.",
    variants: [
      { size: "1mg", price: 24000, sku: "FOLLI-1", costCents: 6000 },
    ],
    purity: "≥98%",
    molecularWeight: "37.5 kDa (approx)",
    form: "Lyophilized Powder",
    storage: "Store lyophilized at -20°C. Reconstituted: 2-8°C, use within 7 days.",
    appearance: "White to off-white lyophilized powder",
    tags: ["New Arrival"],
  },

  // HGH Fragment 176-191 — REMOVED 2026-05-05 by the operator. Not selling
  // this compound. Old /product/hgh-fragment-176-191 URL handled by
  // middleware.ts returning 410 Gone for faster deindexation.

  // ── GHRP-2 ──
  {
    id: "ghrp-2",
    name: "GHRP-2",
    slug: "ghrp-2",
    category: "growth-hormone-research",
    description:
      "Growth Hormone Releasing Peptide-2, supplied as a lyophilized reference standard for in-vitro GHS-R1a receptor research and selectivity panels.",
    longDescription:
      "GHRP-2 (Pralmorelin) is a synthetic hexapeptide growth hormone secretagogue supplied as a lyophilized reference standard for in-vitro GHS-R1a (ghrelin receptor) binding studies, receptor selectivity panels, and analytical method development. Researchers use this compound as a comparative reference alongside Ipamorelin and GHRP-6 for ghrelin-receptor-activation studies. Not for use in any living organism.",
    variants: [
      { size: "5mg", price: 3500, sku: "GHRP2-5", costCents: 800 },
      { size: "10mg", price: 6000, sku: "GHRP2-10", costCents: 1500 },
    ],
    purity: "≥99%",
    cas: "158861-67-7",
    molecularWeight: "817.95 g/mol",
    sequence: "D-Ala-D-2-Nal-Ala-Trp-D-Phe-Lys-NH2",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White powder",
    tags: ["New Arrival"],
  },

  // ── GHRP-6 ──
  {
    id: "ghrp-6",
    name: "GHRP-6",
    slug: "ghrp-6",
    category: "growth-hormone-research",
    description:
      "Growth Hormone Releasing Peptide-6, supplied as a lyophilized reference standard for in-vitro GHS-R1a receptor research and ghrelin-pathway studies.",
    longDescription:
      "GHRP-6 is a synthetic hexapeptide growth hormone secretagogue supplied as a lyophilized reference standard for in-vitro GHS-R1a (ghrelin receptor) binding studies and ghrelin-pathway receptor research. Distinct from GHRP-2 in selectivity and downstream signaling profile in the preclinical literature. Researchers use this compound for receptor-activation studies and as a comparative reference in ghrelin-pathway assay panels. Not for use in any living organism.",
    variants: [
      { size: "5mg", price: 5500, sku: "GHRP6-5", costCents: 1300 },
      { size: "10mg", price: 6000, sku: "GHRP6-10", costCents: 1500 },
    ],
    purity: "≥99%",
    cas: "87616-84-0",
    molecularWeight: "872.02 g/mol",
    sequence: "His-D-Trp-Ala-Trp-D-Phe-Lys-NH2",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White powder",
    tags: ["New Arrival"],
  },

  // ── Hexarelin ──
  {
    id: "hexarelin",
    name: "Hexarelin",
    slug: "hexarelin",
    category: "growth-hormone-research",
    description:
      "A potent synthetic hexapeptide GH secretagogue supplied as a lyophilized reference standard for ghrelin-receptor research and cardiovascular preclinical models.",
    longDescription:
      "Hexarelin is a synthetic hexapeptide growth hormone secretagogue with reported potency at the GHS-R1a receptor in preclinical models. Supplied as a lyophilized reference standard for in-vitro receptor-binding assays, ghrelin-pathway research, and cardiac-tissue preclinical studies (where the compound has been characterized at CD36 binding sites independent of GH release). Not for use in any living organism.",
    variants: [
      { size: "5mg", price: 7500, sku: "HEX-5", costCents: 1800 },
    ],
    purity: "≥99%",
    cas: "140703-51-1",
    molecularWeight: "887.04 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White powder",
    tags: ["New Arrival"],
  },

  // IGF-1 LR3 — REMOVED 2026-05-05 by the operator. Not selling this compound.
  // Old /product/igf1-lr3 URL handled by middleware.ts returning 410
  // Gone for faster deindexation.

  // ── LL-37 ──
  {
    id: "ll37",
    name: "LL-37",
    slug: "ll37",
    category: "inflammation-research",
    description:
      "Cathelicidin-derived antimicrobial peptide (37 amino acids) supplied as a lyophilized reference standard for in-vitro innate-immune and antimicrobial-research workflows.",
    longDescription:
      "LL-37 is the C-terminal 37-amino-acid antimicrobial peptide cleaved from human cathelicidin hCAP-18. Supplied as a lyophilized reference standard for in-vitro antimicrobial assays, innate-immune signaling research, and biofilm-disruption preclinical models. Researchers use this compound for minimum-inhibitory-concentration (MIC) assays against bacterial / fungal panels and for studies of cathelicidin's role in epithelial host defense. Not for use in any living organism.",
    variants: [
      { size: "5mg", price: 7500, sku: "LL37-5", costCents: 1800 },
    ],
    purity: "≥98%",
    cas: "154947-66-7",
    molecularWeight: "4493.33 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 7 days.",
    appearance: "White to off-white powder",
    tags: ["New Arrival"],
  },

  // ── Melanotan 1 ──
  // RUO framing kept tight — "in-vitro melanocortin-receptor research"
  // and "preclinical pigmentation research models" are the only
  // legitimate framings. Do not use lifestyle / tanning copy here.
  {
    id: "melanotan-1",
    name: "Melanotan 1",
    slug: "melanotan-1",
    category: "neuroendocrine-research",
    description:
      "A synthetic α-MSH analog supplied as a lyophilized reference standard for in-vitro melanocortin-receptor research (MC1R-selective profile in preclinical models).",
    longDescription:
      "Melanotan 1 (Afamelanotide) is a synthetic 13-amino-acid analog of α-melanocyte-stimulating hormone (α-MSH) with reported MC1R-selective receptor binding in preclinical models. Supplied as a lyophilized reference standard for in-vitro melanocortin-receptor binding assays, MC1R-selectivity profiling, and pigmentation-pathway research in cell-culture systems. Not for use in any living organism.",
    variants: [
      { size: "10mg", price: 5000, sku: "MT1-10", costCents: 1200 },
    ],
    purity: "≥99%",
    cas: "75921-69-6",
    molecularWeight: "1646.85 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White powder",
    tags: ["New Arrival"],
  },

  // ── Melanotan 2 ──
  {
    id: "melanotan-2",
    name: "Melanotan 2",
    slug: "melanotan-2",
    category: "neuroendocrine-research",
    description:
      "A cyclic synthetic α-MSH analog supplied as a lyophilized reference standard for in-vitro melanocortin-receptor research across MC1R / MC3R / MC4R selectivity panels.",
    longDescription:
      "Melanotan 2 is a synthetic cyclic heptapeptide analog of α-melanocyte-stimulating hormone (α-MSH), supplied as a lyophilized reference standard for in-vitro melanocortin-receptor binding assays. Distinct from Melanotan 1 in receptor selectivity profile (broader MC3R/MC4R activity in preclinical reports). Researchers use this compound for receptor-selectivity panel work and structure-activity-relationship characterization. Not for use in any living organism.",
    variants: [
      { size: "10mg", price: 7500, sku: "MT2-10", costCents: 1800 },
    ],
    purity: "≥99%",
    cas: "121062-08-6",
    molecularWeight: "1024.18 g/mol",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 21 days.",
    appearance: "White powder",
    tags: ["New Arrival"],
  },

  // ── PEG-MGF ──
  {
    id: "peg-mgf",
    name: "PEG-MGF",
    slug: "peg-mgf",
    category: "growth-hormone-research",
    description:
      "Pegylated Mechano Growth Factor (MGF), an IGF-1 splice variant supplied as a lyophilized reference standard for in-vitro muscle-tissue research.",
    longDescription:
      "PEG-MGF is a pegylated form of Mechano Growth Factor (MGF), a splice variant of IGF-1 (also known as IGF-1Ec) supplied as a lyophilized reference standard for in-vitro muscle-cell research. The polyethylene-glycol modification extends serum half-life in preclinical models compared to the native MGF peptide. Researchers use this compound for satellite-cell activation assays, myoblast-proliferation studies, and analytical method development. Not for use in any living organism.",
    variants: [
      { size: "2mg", price: 10000, sku: "PMGF-2", costCents: 2400 },
    ],
    purity: "≥98%",
    form: "Lyophilized Powder",
    storage: "Store lyophilized at -20°C. Reconstituted: 2-8°C, use within 14 days.",
    appearance: "White lyophilized powder",
    tags: ["New Arrival"],
  },

  // ── Pinealon ──
  {
    id: "pinealon",
    name: "Pinealon",
    slug: "pinealon",
    category: "nootropic-research",
    description:
      "A synthetic tripeptide based on a pineal-derived sequence, supplied as a lyophilized reference standard for in-vitro neuroprotective assay models and nootropic research.",
    longDescription:
      "Pinealon is a synthetic tripeptide (Glu-Asp-Arg) based on a sequence derived from pineal-gland regulatory peptides, supplied as a lyophilized reference standard for in-vitro neuroprotective assay models, oxidative-stress preclinical studies, and analytical method development. Researchers use this compound alongside Epithalon as part of pineal-pathway research panels. Not for use in any living organism.",
    variants: [
      { size: "10mg", price: 6000, sku: "PIN-10", costCents: 1400 },
    ],
    purity: "≥99%",
    sequence: "Glu-Asp-Arg",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 28 days.",
    appearance: "White powder",
    tags: ["New Arrival"],
  },

  // ── Snap-8 ──
  {
    id: "snap-8",
    name: "Snap-8",
    slug: "snap-8",
    category: "longevity-research",
    description:
      "An octapeptide derivative of Argireline (Snap-8 / Acetyl Octapeptide-3) supplied as a lyophilized reference standard for in-vitro SNARE-complex and skin-research workflows.",
    longDescription:
      "Snap-8 (Acetyl Octapeptide-3) is a synthetic octapeptide derivative of the Argireline (Acetyl Hexapeptide-8) sequence, supplied as a lyophilized reference standard for in-vitro SNARE-complex disruption studies and skin-research preclinical models. Researchers use this compound in cell-culture studies of vesicular release inhibition and as a comparative reference alongside Argireline. Not for use in any living organism.",
    variants: [
      { size: "10mg", price: 6000, sku: "SNAP-10", costCents: 1500 },
    ],
    purity: "≥98%",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Reconstituted: 2-8°C, use within 28 days.",
    appearance: "White powder",
    tags: ["New Arrival"],
  },

  // ── Glutathione ──
  // Accessory-tier longevity SKU. Different audience than the rest of
  // the catalog (IV-clinic adjacent), included per the operator's "I want all
  // of these on the site" directive.
  {
    id: "glutathione",
    name: "Glutathione",
    slug: "glutathione",
    category: "longevity-research",
    description:
      "Reduced L-Glutathione (GSH), a tripeptide antioxidant supplied as a lyophilized reference standard for in-vitro redox / oxidative-stress research.",
    longDescription:
      "Reduced L-Glutathione (GSH) is the canonical endogenous tripeptide antioxidant (γ-Glu-Cys-Gly), supplied as a lyophilized reference standard for in-vitro redox biology, oxidative-stress research, and analytical method development. Researchers use this compound for cell-culture redox-state titration and as a positive control in glutathione-peroxidase / glutathione-S-transferase enzyme assays. Not for use in any living organism.",
    variants: [
      { size: "1500mg", price: 6500, sku: "GLU-1500", costCents: 1600 },
    ],
    purity: "≥99%",
    cas: "70-18-8",
    molecularWeight: "307.32 g/mol",
    sequence: "γ-Glu-Cys-Gly",
    form: "Lyophilized Powder",
    storage: "Store at -20°C. Protect from light + moisture.",
    appearance: "White to off-white powder",
    tags: ["New Arrival"],
  },
];

/**
 * Public-facing product list — everything the shop/catalog renders. Excludes
 * upsellOnly products so they don't appear in category browsing, search,
 * collection filters, etc.
 */
export const catalogProducts: Product[] = products.filter((p) => !p.upsellOnly);

export function getProductBySlug(slug: string): Product | undefined {
  // Still returns upsell-only products — PostPurchaseUpsell + the bump
  // offer look up their SKUs by slug regardless of catalog visibility.
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(categoryId: string): Product[] {
  return catalogProducts.filter((p) => p.category === categoryId);
}

export function getFeaturedProducts(): Product[] {
  return catalogProducts.filter((p) => p.featured);
}

export function getStartingPrice(product: Product): number {
  return Math.min(...product.variants.map((v) => v.price));
}

// Promoted SKUs always appear at the top of the Related Products block
// (unless the current product IS one of them), even across categories.
// Used to surface our top-margin / flagship products on every PDP.
const PROMOTED_RELATED_IDS = ["glp3-rta"];

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const promoted = PROMOTED_RELATED_IDS
    .map((id) => catalogProducts.find((p) => p.id === id))
    .filter((p): p is Product => !!p && p.id !== product.id);

  const sameCategory = catalogProducts.filter(
    (p) =>
      p.category === product.category &&
      p.id !== product.id &&
      !PROMOTED_RELATED_IDS.includes(p.id),
  );

  return [...promoted, ...sameCategory].slice(0, limit);
}

export function getPriceRange(): { min: number; max: number } {
  const prices = catalogProducts.flatMap((p) => p.variants.map((v) => v.price));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function getAvailableForms(): string[] {
  return [...new Set(catalogProducts.map((p) => p.form))];
}

export function getAvailableTags(): { tag: string; count: number }[] {
  const tagCounts = new Map<string, number>();
  for (const p of catalogProducts) {
    for (const tag of p.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

