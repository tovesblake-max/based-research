/**
 * Maps product slugs (or product IDs) to relevant research blog articles
 * on blog.basedresearch.com. Rendered in the "Related Research" block
 * on each product page to boost E-E-A-T and time-on-site.
 */

export interface BlogLink {
  slug: string;     // blog post slug (URL is `https://blog.../{slug}/`)
  title: string;    // display title
  readingTime: string;
}

const BLOG_BASE = "https://blog.basedresearch.com";

function link(slug: string, title: string, readingTime: string): BlogLink {
  return { slug, title, readingTime };
}

const ARTICLES: Record<string, BlogLink> = {
  "glp1": link("glp1-receptor-agonism-mechanisms", "GLP-1 Receptor Agonism: Mechanisms of Action in Metabolic Research", "9 min"),
  "dual-triple": link("dual-vs-triple-incretin-agonists", "Dual vs Triple Incretin Receptor Agonists: A Comparative Preclinical Overview", "10 min"),
  "amylin": link("amylin-receptor-pharmacology-satiety", "Amylin Receptor Pharmacology and Its Role in Satiety Research", "8 min"),
  "gip": link("gip-receptor-signaling-beyond-insulin", "GIP Receptor Signaling: Beyond Glucose-Dependent Insulin Secretion", "9 min"),
  "bpc157": link("bpc157-cytoprotection-angiogenesis", "BPC-157: Mechanisms of Cytoprotection and Angiogenesis in Preclinical Models", "10 min"),
  "tb4": link("thymosin-beta4-actin-sequestration", "Thymosin Beta-4 and Actin Sequestration: Implications for Tissue Repair Research", "9 min"),
  "ghkcu": link("ghk-cu-copper-peptide-gene-expression", "GHK-Cu Tripeptide: Copper-Dependent Gene Expression and In-Vitro Wound-Closure Assay Models", "8 min"),
  "pentadecarginine": link("pentadecarginine-arginine-peptide-research", "Pentadecarginine: A Novel Approach to Arginine-Based Peptide Research", "8 min"),
  "ghrh-vs-ghs": link("ghrh-analogs-vs-gh-secretagogues", "GHRH Analogs vs GH Secretagogues: Distinct Mechanisms of GH Axis Stimulation", "9 min"),
  "ipamorelin": link("ipamorelin-ghrelin-receptor-selectivity", "Ipamorelin Selectivity: Why Ghrelin Receptor Specificity Matters in Research", "8 min"),
  "gh-synergy": link("synergistic-gh-pulse-amplification", "The Synergistic Amplification of GH Pulses: Combining GHRH and GHRP Pathways", "9 min"),
  "melanocortin": link("melanocortin-system-mc3r-mc4r", "Melanocortin System Pharmacology: MC3R and MC4R in CNS Research", "10 min"),
  "selank": link("selank-bdnf-tuftsin-neuroscience", "Selank and BDNF Expression: Tuftsin-Derived Peptides in Neuroscience", "9 min"),
  "semax": link("semax-neuroprotection-acth-fragment", "Semax and Neuroprotection: ACTH Fragment Research in Ischemia Models", "9 min"),
  "epithalon": link("epithalon-telomerase-telomere-research", "Epithalon and Telomerase: Peptide-Mediated Telomere Research", "9 min"),
  "nad": link("nad-precursors-sirtuin-activation", "NAD+ Precursors and Sirtuin Activation in Aging Research Models", "10 min"),
  "motsc": link("mots-c-mitochondrial-derived-peptide", "MOTS-c: Mitochondrial-Derived Peptides and Metabolic Regulation", "9 min"),
  "ta1": link("thymosin-alpha1-immune-modulation", "Thymosin Alpha-1: Innate and Adaptive Immune Modulation in Preclinical Studies", "9 min"),
  "kpv": link("kpv-tripeptide-anti-inflammatory", "KPV Tripeptide: Alpha-MSH Fragment and Anti-Inflammatory Signaling", "8 min"),
  "hplc": link("hplc-mass-spectrometry-peptide-purity", "Understanding HPLC and Mass Spectrometry in Peptide Purity Analysis", "11 min"),
};

/**
 * Map product slug → list of relevant blog articles (up to 3).
 * Slugs reference their keys in ARTICLES.
 */
const PRODUCT_TO_BLOG: Record<string, string[]> = {
  // Metabolic research
  "glp3-rta": ["dual-triple", "gip", "glp1"],
  "cagrilintide": ["amylin", "glp1", "dual-triple"],
  "aod-9604": ["ghrh-vs-ghs", "hplc"],

  // Tissue repair
  "bpc-157": ["bpc157", "tb4", "hplc"],
  "bpc-157-tablets": ["bpc157", "tb4"],
  "tb-500": ["tb4", "bpc157"],
  "pentadecarginine": ["pentadecarginine", "bpc157"],
  "bpc-157-tb-500-blend": ["bpc157", "tb4", "ghkcu"],
  // recovery-tri-blend removed 2026-05-05 alongside the SKU itself.

  // Growth hormone axis
  "cjc-1295-no-dac": ["ghrh-vs-ghs", "gh-synergy"],
  "ipamorelin": ["ipamorelin", "ghrh-vs-ghs", "gh-synergy"],
  "tesamorelin": ["ghrh-vs-ghs", "gh-synergy"],
  "sermorelin": ["ghrh-vs-ghs", "gh-synergy"],
  "cjc-1295-ipamorelin-blend": ["gh-synergy", "ipamorelin", "ghrh-vs-ghs"],
  "cjc-1295-with-dac-ipamorelin-blend": ["gh-synergy", "ipamorelin", "ghrh-vs-ghs"],
  "tesamorelin-ipamorelin-blend": ["gh-synergy", "ipamorelin", "ghrh-vs-ghs"],

  // Longevity
  "ghk-cu": ["ghkcu", "bpc157"],
  "epithalon": ["epithalon", "nad"],
  "nad-plus": ["nad", "motsc"],
  "mots-c": ["motsc", "nad"],
  "ss-31-elamipretide": ["motsc", "nad"],
  "foxo4-dri": ["nad", "epithalon"],
  "5-amino-1mq": ["nad", "motsc"],
  "glow-blend": ["ghkcu", "bpc157", "tb4"],

  // Neuroprotection / nootropic
  "selank": ["selank", "semax"],
  "semax": ["semax", "selank"],
  "dsip": ["selank", "semax"],
  "p21-peptide-spray": ["selank", "semax"],
  "adamax-spray": ["selank", "semax"],
  "ptd-dbm": ["semax"],

  // Inflammation
  "kpv": ["kpv", "melanocortin"],
  "ara-290": ["kpv"],
  "vip": ["kpv"],
  "larazotide": ["kpv"],

  // Immune modulation
  "thymosin-alpha-1": ["ta1"],
  "thymalin": ["ta1"],

  // Neuroendocrine
  "pt-141": ["melanocortin"],
  "kisspeptin-10": ["melanocortin"],
  "oxytocin": ["melanocortin"],

  // ── 2026-05-05 supplier-list expansion ────────────────
  // New SKUs added from the supplier price list. Mappings reuse
  // existing ARTICLES entries where the topic overlap is strong.
  "klow-blend": ["ghkcu", "bpc157", "tb4"],
  "cjc-1295-with-dac": ["ghrh-vs-ghs", "gh-synergy"],
  "follistatin-344": ["gh-synergy", "ghrh-vs-ghs"],
  // frag-176-191 + igf1-lr3 mappings removed 2026-05-05 alongside the
  // SKUs themselves (the operator elected not to carry these compounds).
  "ghrp-2": ["ipamorelin", "gh-synergy", "ghrh-vs-ghs"],
  "ghrp-6": ["ipamorelin", "gh-synergy", "ghrh-vs-ghs"],
  "hexarelin": ["ipamorelin", "gh-synergy", "ghrh-vs-ghs"],
  "ll37": ["kpv"],
  "melanotan-1": ["melanocortin"],
  "melanotan-2": ["melanocortin"],
  "peg-mgf": ["gh-synergy", "ghrh-vs-ghs"],
  "pinealon": ["epithalon", "selank"],
  "snap-8": ["ghkcu"],
  "glutathione": ["nad"],
};

export function getBlogLinksForProduct(slug: string): Array<BlogLink & { url: string }> {
  const keys = PRODUCT_TO_BLOG[slug] || [];
  return keys
    .map((k) => ARTICLES[k])
    .filter((a): a is BlogLink => !!a)
    .map((a) => ({ ...a, url: `${BLOG_BASE}/${a.slug}/` }));
}
