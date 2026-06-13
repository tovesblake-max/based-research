export interface CategoryHero {
  title: string;
  bullets: string[];
}

// Category landing copy is framed around laboratory methodology — in-vitro
// assays, receptor-binding, analytical method development, and reference
// standards — rather than physiological outcomes, per the research-use-only
// / non-clinical posture.
export const categoryHeroContent: Record<string, CategoryHero> = {
  "metabolic-research": {
    title: "Metabolic Pathway Research Materials",
    bullets: [
      "Reference standards for GLP-1, GIP, and glucagon receptor-binding and functional in-vitro assays",
      "Used in cell-based signaling assays and analytical method development for metabolic-pathway research",
      "Supplied as characterized, HPLC-verified lyophilized reference compounds for non-clinical laboratory use",
    ],
  },
  "tissue-repair-research": {
    title: "Wound-Assay & Matrix Research Materials",
    bullets: [
      "Reference compounds used in in-vitro scratch/wound-closure and endothelial tube-formation (angiogenesis) assays",
      "Applied in cell-migration and extracellular-matrix in-vitro models and assay method development",
      "Characterized lyophilized reference standards for non-clinical, cell-culture research workflows",
    ],
  },
  "growth-hormone-research": {
    title: "GH-Axis Receptor Research Materials",
    bullets: [
      "GHRH and secretagogue reference standards for receptor-binding and pituitary-cell in-vitro studies",
      "Used in receptor-pharmacology assays and analytical identity/purity method development",
      "HPLC-verified lyophilized reference compounds for non-clinical laboratory research only",
    ],
  },
  "longevity-research": {
    title: "Cellular & Longevity Research Materials",
    bullets: [
      "Reference compounds for in-vitro senescence, telomere-biology, and mitochondrial assay models",
      "Used in NAD+/sirtuin-pathway cell-culture studies and analytical method development",
      "Characterized lyophilized reference standards for non-clinical research workflows",
    ],
  },
  "nootropic-research": {
    title: "Neuro Receptor Research Materials",
    bullets: [
      "Neuropeptide reference standards for receptor-binding and neuroprotection assay models",
      "Used in cell-culture neuroplasticity assays (e.g., BDNF expression) and analytical method development",
      "HPLC-verified lyophilized reference compounds for non-clinical laboratory use",
    ],
  },
  "inflammation-research": {
    title: "Cytokine-Signaling Research Materials",
    bullets: [
      "Reference compounds for NF-κB signaling and cytokine-expression in-vitro assays",
      "Used in cell-culture inflammatory-pathway and barrier-integrity assay models",
      "Characterized lyophilized reference standards for non-clinical research workflows",
    ],
  },
  "neuroendocrine-research": {
    title: "Neuroendocrine Receptor Research Materials",
    bullets: [
      "Melanocortin and kisspeptin/HPG-axis reference standards for receptor-binding assays",
      "Used in receptor-pharmacology and cell-signaling in-vitro studies and method development",
      "HPLC-verified lyophilized reference compounds for non-clinical laboratory research only",
    ],
  },
  "immune-modulation-research": {
    title: "Immune-Assay Research Materials",
    bullets: [
      "Thymic and immune-pathway reference standards for in-vitro immunomodulation assays",
      "Used in innate/adaptive immune-signaling cell-culture studies and method development",
      "Characterized lyophilized reference compounds for non-clinical research workflows",
    ],
  },
  "circadian-research": {
    title: "Circadian-Biology Research Materials",
    bullets: [
      "Reference compounds for melatonergic and circadian-pathway receptor-binding assays",
      "Used in in-vitro circadian-signaling and neuroendocrine-pathway assay models",
      "HPLC-verified lyophilized reference standards for non-clinical laboratory research only",
    ],
  },
  clearance: {
    title: "Clearance",
    bullets: [
      "Same third-party tested quality at reduced prices while supplies last",
      "All clearance items maintain the same A2LA-accredited HPLC purity verification standards",
      "Limited availability — quantities are not restocked once sold out",
    ],
  },
};

export function getCategoryHero(categoryId: string): CategoryHero | undefined {
  return categoryHeroContent[categoryId];
}
