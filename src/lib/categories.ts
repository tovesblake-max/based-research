export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
}

// Category copy is framed around research methodology (in-vitro assays,
// receptor-binding, reference standards) rather than physiological
// outcomes, consistent with the research-use-only / non-clinical posture.
export const categories: Category[] = [
  {
    id: "metabolic-research",
    name: "Metabolic Pathway Research",
    description: "Incretin and metabolic-pathway reference compounds for receptor-binding and in-vitro assay method development",
    icon: "Scale",
  },
  {
    id: "tissue-repair-research",
    name: "Wound-Assay & Matrix Research",
    description: "Reference compounds used in in-vitro wound-closure, angiogenesis, and extracellular-matrix assays",
    icon: "Heart",
  },
  {
    id: "growth-hormone-research",
    name: "GH-Axis Receptor Research",
    description: "GHRH and secretagogue reference standards for receptor-binding and pituitary-cell in-vitro studies",
    icon: "TrendingUp",
  },
  {
    id: "longevity-research",
    name: "Cellular & Longevity Research",
    description: "Reference compounds for senescence, telomere-biology, and mitochondrial in-vitro models",
    icon: "Clock",
  },
  {
    id: "nootropic-research",
    name: "Neuro Receptor Research",
    description: "Neuropeptide reference standards for neuroprotection and receptor-binding assay models",
    icon: "Brain",
  },
  {
    id: "inflammation-research",
    name: "Cytokine-Signaling Research",
    description: "Reference compounds for cytokine-signaling and inflammatory-pathway in-vitro assays",
    icon: "Shield",
  },
  {
    id: "neuroendocrine-research",
    name: "Neuroendocrine Receptor Research",
    description: "Melanocortin and HPA-axis reference standards for receptor-binding and cell-signaling studies",
    icon: "Flame",
  },
  {
    id: "immune-modulation-research",
    name: "Immune-Assay Research",
    description: "Thymic and immune-pathway reference compounds for in-vitro immunomodulation assays",
    icon: "ShieldCheck",
  },
  {
    id: "circadian-research",
    name: "Circadian-Biology Research",
    description: "Reference compounds for melatonergic and circadian-pathway in-vitro and receptor studies",
    icon: "Moon",
  },
  {
    id: "clearance",
    name: "Clearance",
    description: "Discounted reference materials while supplies last",
    icon: "Tag",
  },
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
