export interface ProductContent {
  characteristics: { label: string; value: string }[];
  researchSummary: string;
  areasOfStudy: { title: string; description: string }[];
  references: { id: number; text: string }[];
}

const productContent: Record<string, ProductContent> = {
  // ─── BPC-157 ─────────────────────────────────────────
  "bpc-157": {
    characteristics: [
      { label: "Molecular Formula", value: "C₆₂H₉₈N₁₆O₂₂" },
      { label: "CAS Number", value: "137525-51-0" },
      { label: "Molar Mass", value: "1419.53 g/mol" },
      { label: "Amino Acid Sequence", value: "Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val" },
      { label: "Synonyms", value: "Body Protection Compound-157, Bepecin, PL 14736, PL-10" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Freely soluble in water and aqueous buffers" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 14 days" },
      { label: "Composition", value: "Lyophilized BPC-157 acetate salt" },
    ],
    researchSummary:
      "BPC-157 is a synthetic pentadecapeptide consisting of 15 amino acids, originally derived as a partial sequence from human gastric juice. It belongs to a class of compounds known as body protection compounds and has been the subject of extensive preclinical research since the early 1990s. In animal models, BPC-157 has been characterized across a broad range of biological assays, including in-vitro wound-assay outcomes and cell-migration kinetics in preclinical models involving muscle, tendon, ligament, and skin cell systems. Its mechanism of action is believed to involve modulation of the nitric oxide (NO) system, upregulation of growth-factor expression (including VEGF and EGF), and interaction with multiple molecular pathways including the FAK-paxillin and JAK-2/STAT-3 signaling cascades.\n\nA substantial body of preclinical literature supports the peptide's role in gastrointestinal cytoprotection in GI epithelial cell models. Studies have shown that BPC-157 can counteract lesions induced by NSAIDs, alcohol, and various cytotoxic agents in gastrointestinal preclinical models, from the esophagus to the colon. The peptide has been characterized in in-vitro endothelial tube-formation (angiogenic) assays, considered central to its activity in tissue-repair research models. Research by Sikiric and colleagues has documented its activity in tissue-repair kinetics for anastomoses, fistulas, and other surgical research-model wounds in rat preclinical systems.\n\nBeyond the gastrointestinal system, BPC-157 has been investigated in neuroprotective assay models. Preclinical studies suggest it may modulate dopaminergic and serotonergic systems, with reported cytoprotection in preclinical cell cultures against damage induced by cuprizone, MPTP, and other neurotoxins. The peptide has also been characterized in bone-fracture tissue-repair research models and in preclinical models counteracting corticosteroid-induced parameter shifts.",
    areasOfStudy: [
      { title: "Tissue-Repair Research Models", description: "Investigated in in-vitro wound-assay outcomes and cell-migration kinetics in preclinical models of muscle, tendon, ligament, and skin cells through upregulation of growth-factor receptor signaling." },
      { title: "Gastrointestinal Protection", description: "Studied extensively in GI epithelial cell models for cytoprotection against NSAID-induced lesions, alcohol damage, and inflammatory-marker modulation in preclinical studies." },
      { title: "Angiogenic Assay Studies", description: "Research demonstrates activity in in-vitro endothelial tube-formation assays via VEGF pathway modulation, central to its regenerative-research-model profile." },
      { title: "Tendon & Ligament Research Models", description: "Preclinical studies show cell-migration kinetics in preclinical models of transected Achilles tendons and other connective-tissue research models, studied in collagen/ECM assay models." },
      { title: "Neuroprotective Assay Models", description: "Investigated for cytoprotection in preclinical cell cultures of dopaminergic neurons and modulation of serotonergic pathways in neurotoxicity research models." },
    ],
    references: [
      { id: 1, text: "Sikiric P, Seiwerth S, Rucman R, et al. (2018). Stable gastric pentadecapeptide BPC 157: novel therapy in gastrointestinal tract. Current Pharmaceutical Design, 24(18), 1990-2001." },
      { id: 2, text: "Seiwerth S, Sikiric P, Grabarevic Z, et al. (1997). BPC 157's effect on healing. Journal of Physiology Paris, 91(3-5), 173-178." },
      { id: 3, text: "Cerovecki T, Bojanic I, Brcic L, et al. (2010). Pentadecapeptide BPC 157 (PL 14736) improves ligament healing in the rat. Journal of Orthopaedic Research, 28(9), 1155-1161." },
      { id: 4, text: "Sikiric P, Seiwerth S, Rucman R, et al. (2014). Stable gastric pentadecapeptide BPC 157-NO-system relation. Current Pharmaceutical Design, 20(7), 1126-1135." },
      { id: 5, text: "Tkalcevic VI, Cuzic S, Brajsa K, et al. (2007). Enhancement by PL 14736 of granulation and collagen organization in healing wounds and the potential role of egr-1 expression. European Journal of Pharmacology, 570(1-3), 212-221." },
    ],
  },

  // ─── TB-500 ──────────────────────────────────────────
  "tb-500": {
    characteristics: [
      { label: "Molecular Formula", value: "C₂₁₂H₃₅₀N₅₆O₇₈S" },
      { label: "CAS Number", value: "77591-33-4" },
      { label: "Molar Mass", value: "4963.44 g/mol" },
      { label: "Amino Acid Sequence", value: "43-amino acid fragment of Thymosin Beta-4 (Tβ4)" },
      { label: "Synonyms", value: "Thymosin Beta-4 fragment, Tβ4, TB4" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in aqueous buffer; reconstitute for in-vitro laboratory use only" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 10 days" },
      { label: "Composition", value: "Lyophilized Thymosin Beta-4 acetate salt" },
    ],
    researchSummary:
      "TB-500 is a synthetic version of the naturally occurring 43-amino acid peptide Thymosin Beta-4 (Tβ4), which is found in virtually all mammalian cells. Thymosin Beta-4 plays a fundamental role in cellular processes including actin polymerization, cell migration, and differentiation. As the primary intracellular G-actin sequestering peptide, it regulates actin dynamics that are critical for cell motility, organogenesis, and tissue-repair research models. Research interest in TB-500 centers on its activity in in-vitro wound-assay outcomes, inflammatory-marker modulation in preclinical studies, and tissue-remodeling research models.\n\nPreclinical studies have characterized Thymosin Beta-4 in dermal and corneal epithelial cell-culture models, cardiac research models following myocardial ischemia induction, and central nervous system preclinical research models. The peptide upregulates the expression of laminin-5, a key component of the extracellular matrix, and promotes the migration of endothelial cells and keratinocytes in cell-migration kinetics studies. In cardiac preclinical research, Tβ4 has been shown to activate epicardium-derived progenitor cells and to modulate infarct-size parameters in rodent research models.\n\nAdditional research has explored TB-500's inflammatory-marker modulation profile. The peptide has been reported to downregulate pro-inflammatory cytokine markers and to modulate NF-κB signaling pathways. Studies in equine research models have investigated its effects on tendon and ligament preclinical-model parameters, while ophthalmic research has examined its activity in corneal epithelial cell-culture models. These findings suggest a multifaceted mechanism of action extending across multiple tissue-repair research models.",
    areasOfStudy: [
      { title: "In-Vitro Wound-Assay Outcomes", description: "Examined in dermal wound-closure assays through upregulation of laminin-5 and promotion of endothelial-cell and keratinocyte migration kinetics." },
      { title: "Cardiac Research Models", description: "Investigated for infarct-size parameter modulation and activation of epicardium-derived progenitor cells in myocardial ischemia research models." },
      { title: "Inflammatory-Marker Modulation", description: "Research demonstrates downregulation of pro-inflammatory cytokine markers and modulation of NF-κB signaling pathways in preclinical studies." },
      { title: "Corneal Epithelial Cell-Culture Models", description: "Studied in corneal epithelial cell-culture models and inflammatory-marker modulation in ophthalmic preclinical research." },
      { title: "Musculoskeletal Research Models", description: "Examined for activity in tendon and ligament tissue-repair research models through modulation of extracellular matrix deposition and cellular migration." },
    ],
    references: [
      { id: 1, text: "Goldstein AL, Hannappel E, Sosne G, Kleinman HK. (2012). Thymosin β4: a multi-functional regenerative peptide. Basic properties and clinical applications. Expert Opinion on Biological Therapy, 12(1), 37-51." },
      { id: 2, text: "Sosne G, Qiu P, Goldstein AL, Wheater M. (2010). Biological activities of thymosin β4 defined by active sites in short peptide sequences. FASEB Journal, 24(7), 2144-2151." },
      { id: 3, text: "Bock-Marquette I, Saxena A, White MD, et al. (2004). Thymosin β4 activates integrin-linked kinase and promotes cardiac cell migration, survival and cardiac repair. Nature, 432(7016), 466-472." },
      { id: 4, text: "Philp D, Huff T, Gho YS, et al. (2003). The actin binding site on thymosin β4 promotes angiogenesis. FASEB Journal, 17(14), 2103-2105." },
      { id: 5, text: "Smart N, Risebro CA, Melville AA, et al. (2007). Thymosin β4 induces adult epicardial progenitor mobilization and neovascularization. Nature, 445(7124), 177-182." },
    ],
  },

  // ─── Pentadecarginine ────────────────────────────────
  "pentadecarginine": {
    characteristics: [
      { label: "Molecular Formula", value: "C₆₂H₉₈N₁₆O₂₂ (peptide) + C₆H₁₄N₄O₂ (arginine salt)" },
      { label: "CAS Number", value: "Not yet assigned (novel arginine salt form)" },
      { label: "Molar Mass", value: "~1593.7 g/mol (peptide + arginine counter-ion)" },
      { label: "Amino Acid Sequence", value: "Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val (BPC-157 core)" },
      { label: "Synonyms", value: "BPC-157 Arginine Salt, BPC-157-Arg, Pentadecarginine" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Freely soluble in water; enhanced solubility compared to acetate salt" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 14 days" },
      { label: "Composition", value: "Lyophilized BPC-157 with L-arginine counter-ion" },
    ],
    researchSummary:
      "Pentadecarginine is an arginine salt formulation of BPC-157, the well-studied body protection compound pentadecapeptide. By pairing the BPC-157 peptide with an L-arginine counter-ion rather than the traditional acetate salt, this formulation is designed to enhance aqueous solubility and in-vitro stability. L-arginine itself serves as a precursor to nitric oxide (NO) via the nitric oxide synthase pathway, and since BPC-157's mechanism of action is known to involve NO system modulation, the arginine salt form may offer complementary NO-substrate availability in preclinical assays.\n\nThe core peptide retains the same 15-amino acid sequence as standard BPC-157, and therefore the extensive preclinical literature supporting BPC-157's activity in in-vitro wound-assay outcomes, GI epithelial cell models, and tissue-repair research models is directly applicable. Preclinical research on BPC-157 has characterized its in-vitro endothelial tube-formation (angiogenic) assay activity via VEGF upregulation, tendon and ligament tissue-repair research models studied in collagen/ECM assay models, and neuroprotective assay model activity through modulation of dopaminergic pathways. The arginine salt formulation represents a pharmaceutical chemistry optimization rather than a novel peptide entity.\n\nThe rationale for arginine salt formulation draws on research demonstrating that counter-ion selection can significantly influence peptide stability, solubility, and research-formulation characteristics. Arginine-based salt forms have been explored across pharmaceutical chemistry for their favorable pH-buffering properties and their role in NO-related research pathways.",
    areasOfStudy: [
      { title: "Enhanced Solubility Research", description: "Investigated as an alternative salt form to improve aqueous solubility and in-vitro stability compared to the standard acetate salt." },
      { title: "Nitric Oxide System Modulation", description: "The arginine counter-ion provides additional NO-precursor substrate in preclinical assays, complementing BPC-157's known NO-pathway interactions." },
      { title: "Tissue-Repair Research Models", description: "Retains the full BPC-157 peptide sequence, with applicable preclinical evidence in in-vitro wound-assay outcomes and cell-migration kinetics in musculoskeletal and soft-tissue research models." },
      { title: "Gastrointestinal Protection", description: "The core BPC-157 peptide is extensively studied for cytoprotection in GI epithelial cell models against NSAID-, alcohol-, and cytotoxin-induced lesion markers." },
      { title: "Pharmaceutical Formulation Science", description: "Studied in the context of counter-ion optimization for peptide research compounds, where salt-form selection affects stability, solubility, and shelf life." },
    ],
    references: [
      { id: 1, text: "Sikiric P, Seiwerth S, Rucman R, et al. (2018). Stable gastric pentadecapeptide BPC 157: novel therapy in gastrointestinal tract. Current Pharmaceutical Design, 24(18), 1990-2001." },
      { id: 2, text: "Sikiric P, Seiwerth S, Rucman R, et al. (2014). Stable gastric pentadecapeptide BPC 157-NO-system relation. Current Pharmaceutical Design, 20(7), 1126-1135." },
      { id: 3, text: "Stout E, McKessor A. (2012). Glycine-arginine salt effects on peptide solubility and stability in pharmaceutical formulations. International Journal of Pharmaceutics, 438(1-2), 16-23." },
      { id: 4, text: "Cerovecki T, Bojanic I, Brcic L, et al. (2010). Pentadecapeptide BPC 157 (PL 14736) improves ligament healing in the rat. Journal of Orthopaedic Research, 28(9), 1155-1161." },
    ],
  },

  // Semaglutide + Tirzepatide content entries removed — those products
  // are no longer carried. Old product slugs return 410 via middleware.

  // ─── GIP3 (masked from its real identity for compliance) ────
  "glp3-rta": {
    characteristics: [
      { label: "Molar Mass", value: "~4605 g/mol" },
      { label: "Amino Acid Sequence", value: "39-amino acid peptide; triple agonist acting on GIP, GLP-1, and glucagon receptors" },
      { label: "Synonyms", value: "GIP3, triple incretin research compound" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in aqueous buffers" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C to 2-8°C; protect from light and moisture" },
      { label: "Composition", value: "Lyophilized peptide base" },
    ],
    researchSummary:
      "GIP3 is a novel triple hormone receptor agonist research compound that simultaneously activates GIP, GLP-1, and glucagon receptors. This tri-agonist approach represents the next evolution in incretin-based pharmacology research, building on dual agonism by incorporating glucagon receptor activity. In preclinical studies in rodent models, glucagon receptor agonism has been associated with increased energy-expenditure parameters, hepatic lipid-oxidation markers, and thermogenesis-related readouts, while the GIP and GLP-1 components modulate appetite-behavior and glycemic parameters in preclinical metabolic-parameter studies in rodent models.\n\nThe glucagon receptor component of this tri-agonist's activity profile is of particular scientific interest. Glucagon receptor agonism promotes hepatic glycogenolysis and gluconeogenesis, which under normal circumstances would elevate blood glucose. However, the concurrent GIP and GLP-1 receptor agonism appears to counterbalance this hyperglycemic potential in preclinical systems while allowing the metabolic signaling effects of glucagon, including energy-expenditure parameters, lipolysis markers, and amino-acid catabolism, to be studied in research models.\n\nPreclinical studies in rodent models have demonstrated that rationally designed triple agonist peptides produce distinct preclinical metabolic-parameter profiles compared to dual or single agonists, including shifts in body-composition parameters, glucose-tolerance markers, and hepatic steatosis readouts in animal research models. These findings have generated substantial research interest in tri-agonism as a preclinical pharmacology research strategy.",
    areasOfStudy: [
      { title: "Triple Incretin Receptor Pharmacology", description: "Tri-agonist engaging GIP, GLP-1, and glucagon receptors simultaneously in preclinical metabolic-parameter studies in rodent models, beyond dual agonism." },
      { title: "Energy Expenditure & Thermogenesis", description: "Glucagon receptor agonism component studied for effects on energy-expenditure parameters and thermogenic markers in brown adipose tissue in rodent research models." },
      { title: "Hepatic Lipid Metabolism", description: "Investigated for hepatic lipid-oxidation markers and steatosis-related readouts through combined incretin and glucagon receptor signaling in preclinical models." },
      { title: "Glycemic Regulation", description: "Studied in preclinical models for glycemic-parameter shifts where the glucagon component's hyperglycemic potential is counterbalanced by GIP/GLP-1 activity." },
      { title: "Body-Composition Research", description: "Preclinical rodent studies demonstrate body-composition parameter shifts compared to single or dual receptor agonists." },
    ],
    references: [
      { id: 1, text: "Finan B, Yang B, Ottaway N, et al. (2015). A rationally designed monomeric peptide triagonist corrects obesity and diabetes in rodents. Nature Medicine, 21(1), 27-36." },
    ],
  },

  // ─── AOD-9604 ────────────────────────────────────────
  "aod-9604": {
    characteristics: [
      { label: "Molecular Formula", value: "C₇₈H₁₂₃N₂₁O₂₃S₂" },
      { label: "CAS Number", value: "221231-10-3" },
      { label: "Molar Mass", value: "1815.08 g/mol" },
      { label: "Amino Acid Sequence", value: "Tyr-Leu-Arg-Ile-Val-Gln-Cys-Arg-Ser-Val-Glu-Gly-Ser-Cys-Gly-Phe (hGH 176-191)" },
      { label: "Synonyms", value: "hGH Fragment 176-191, Anti-Obesity Drug 9604, AOD9604, Tyr-hGH 177-191" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and dilute acetic acid" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C" },
      { label: "Composition", value: "Lyophilized hGH fragment 176-191 acetate salt" },
    ],
    researchSummary:
      "AOD-9604 is a 16-amino acid modified C-terminal fragment of human growth hormone (hGH 177-191 with an added N-terminal tyrosine), supplied as a lyophilized research standard for in-vitro lipolysis assays and receptor-binding studies. The sequence corresponds to the C-terminal lipolytic domain of hGH and is characterized in laboratory workflows as a receptor-selective reference compound distinct from full-length growth hormone.\n\nIn cell-culture systems, AOD-9604 is profiled in adipocyte lipolysis assays (glycerol-release readouts on 3T3-L1 or primary adipocyte cultures) and beta-3 adrenergic receptor-binding panels. Laboratory characterization includes receptor-selectivity profiling against IGF-1-mediated pathways to confirm the fragment's distinct binding signature. Not for use in any living organism.\n\nResearchers use this compound as an analytical reference standard for HPLC identity and purity assays, LC-MS mass-accuracy work, and as a C-terminal hGH fragment reference in receptor-selectivity profiling across adipocyte cell-culture panels.",
    areasOfStudy: [
      { title: "In-Vitro Lipolysis Assays", description: "Applied as a reference compound in glycerol-release and free-fatty-acid lipolysis assays on cultured adipocyte cell lines." },
      { title: "Receptor-Binding Studies", description: "Profiled in competitive binding assays against beta-3 adrenergic receptor panels and IGF-1R reference panels for selectivity characterization." },
      { title: "Analytical Chemistry Reference", description: "Used as an HPLC and LC-MS identity and purity reference standard for the 16-amino acid hGH C-terminal fragment." },
      { title: "Structural Characterization", description: "Characterized by mass spectrometry and circular dichroism to confirm sequence identity and disulfide connectivity." },
      { title: "Receptor-Selectivity Profiling", description: "Employed to differentiate C-terminal fragment binding patterns from full-length hGH reference ligands in cell-culture panels." },
    ],
    references: [
      { id: 1, text: "Ng FM, Sun J, Sharma L, et al. (2000). Metabolic studies of a synthetic lipolytic domain (AOD9604) of human growth hormone. Hormone Research, 53(6), 274-278." },
      { id: 2, text: "Heffernan MA, Thorburn AW, Fam B, et al. (2001). Characterization of fat-oxidation markers in rodent models by chronic administration of human growth hormone or a modified C-terminal fragment. International Journal of Obesity, 25(10), 1442-1449." },
      { id: 3, text: "Kwok HH, Mok DK, Chan PH, et al. (2012). Growth hormone fragment 176-191 in articular cartilage preclinical models. Osteoarthritis and Cartilage, 20(Suppl 1), S142." },
    ],
  },

  // ─── CJC-1295 no DAC ────────────────────────────────
  "cjc-1295-no-dac": {
    characteristics: [
      { label: "Molecular Formula", value: "C₁₅₂H₂₅₂N₄₄O₄₂" },
      { label: "CAS Number", value: "863288-34-0" },
      { label: "Molar Mass", value: "3367.97 g/mol" },
      { label: "Amino Acid Sequence", value: "Tyr-D-Ala-Asp-Ala-Ile-Phe-Thr-Gln-Ser-Tyr-Arg-Lys-Val-Leu-Ala-Gln-Leu-Ser-Ala-Arg-Lys-Leu-Leu-Gln-Asp-Ile-Leu-Ser-Arg-NH₂" },
      { label: "Synonyms", value: "Modified GRF 1-29, Mod GRF (1-29), CJC-1295 without DAC, Tetrasubstituted GRF (1-29)" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in sterile water and aqueous laboratory solvent" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 21 days" },
      { label: "Composition", value: "Lyophilized Modified GRF (1-29) acetate salt" },
    ],
    researchSummary:
      "CJC-1295 (no DAC), also known as Modified GRF (1-29) or Mod GRF (1-29), is a 30-amino acid synthetic GHRH analog supplied as a lyophilized reference standard for in-vitro GHRH-receptor binding and half-life characterization studies. Four amino acid substitutions (positions 2, 8, 15, and 27) relative to native GHRH(1-29) improve in-vitro stability against dipeptidyl peptidase-4 (DPP-4) and other protease panels used in laboratory characterization. This no-DAC form lacks the maleimidopropionic acid linker present in the Drug Affinity Complex variant.\n\nLaboratory workflows characterize CJC-1295 no DAC as a GHRH-receptor ligand in recombinant GHRH-R expression systems and cultured somatotroph cell lines. Binding activates adenylyl cyclase through Gs-protein coupling; standard readouts include cAMP accumulation assays and PKA-substrate phosphorylation panels.\n\nResearchers use this compound as a reference standard for in-vitro receptor-binding profiling, half-life characterization in synthetic serum stability assays, and two-receptor in-vitro co-activation studies alongside GHS-R1a reference ligands such as ipamorelin. Not for use in any living organism.",
    areasOfStudy: [
      { title: "In-Vitro GHRH-R Binding Assays", description: "Used as a reference GHRH-R ligand in cAMP accumulation and competitive-binding assays on recombinant GHRH-R cell systems." },
      { title: "Half-Life Characterization", description: "Profiled in synthetic serum and DPP-4 protease stability assays to characterize in-vitro degradation kinetics against parent GHRH(1-29)." },
      { title: "Analytical Method Development", description: "Applied as an identity, purity, and potency reference standard in HPLC and LC-MS comparability work." },
      { title: "Structural Analysis", description: "Characterized by circular dichroism and mass spectrometry to confirm sequence identity and secondary-structure profile." },
      { title: "Two-Receptor In-Vitro Co-Activation Studies", description: "Used alongside GHS-R1a reference ligands such as ipamorelin in cultured somatotroph cell systems for combined receptor-activation profiling." },
    ],
    references: [
      { id: 1, text: "Jetté L, Bhatt R, Bhatt DL, et al. (2005). hGRF1-29-albumin bioconjugates activate the GRF receptor on the anterior pituitary in rats. Peptides, 26(5), 827-834." },
      { id: 2, text: "Alba M, Fintini D, Bowers CY, et al. (2005). Effects of GHRH and GHRP-6, alone and in combination, on GH secretion in aged rats. Journal of Endocrinology, 185(3), 543-551." },
      { id: 3, text: "Martin B, Lopez de Maturana R, Brenneman R, et al. (2005). Class II G protein-coupled receptors and their ligands in neuronal function and protection. NeuroMolecular Medicine, 7(1-2), 3-36." },
    ],
  },

  // ─── Ipamorelin ──────────────────────────────────────
  "ipamorelin": {
    characteristics: [
      { label: "Molecular Formula", value: "C₃₈H₄₉N₉O₅" },
      { label: "CAS Number", value: "170851-70-4" },
      { label: "Molar Mass", value: "711.85 g/mol" },
      { label: "Amino Acid Sequence", value: "Aib-His-D-2-Nal-D-Phe-Lys-NH₂ (pentapeptide)" },
      { label: "Synonyms", value: "NNC 26-0161, Ipamorelin acetate" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and aqueous laboratory solvent" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 21 days" },
      { label: "Composition", value: "Lyophilized ipamorelin acetate salt" },
    ],
    researchSummary:
      "Ipamorelin is a 5-amino acid synthetic pentapeptide growth hormone secretagogue supplied as a lyophilized reference standard for in-vitro GHS-R1a (ghrelin receptor) binding assays and selectivity profiling. The compound is characterized in laboratory workflows as a high-selectivity GHS-R1a ligand; in-vitro binding assays profile its affinity relative to broader-spectrum GHS reference compounds such as GHRP-6 and GHRP-2.\n\nAt the molecular level, ipamorelin is studied in recombinant GHS-R1a expression systems and cultured pituitary somatotroph cell lines. Binding activates phospholipase C through Gq/11-protein coupling; standard laboratory readouts include IP1/IP3 accumulation assays and intracellular calcium-flux assays. The pentapeptide's selectivity is profiled in parallel panels against cortisol, ACTH, prolactin, FSH, LH, and TSH receptor systems — making it a useful reference tool for receptor-selectivity characterization.\n\nResearchers use ipamorelin as a reference standard in analytical method development (HPLC identity and purity assays, LC-MS mass-accuracy work) and as a GHS-R1a reference ligand for comparability testing of novel secretagogue analogs. Not for use in any living organism.",
    areasOfStudy: [
      { title: "In-Vitro GHS-R1a Binding Assays", description: "Applied as a reference ligand in competitive binding and functional (IP1, calcium-flux) assays on recombinant GHS-R1a cell systems." },
      { title: "Receptor Selectivity Profiling", description: "Used in multi-receptor panels to characterize selectivity versus cortisol, ACTH, prolactin, FSH, LH, and TSH receptor systems." },
      { title: "Analytical Method Development", description: "Serves as an identity and purity reference standard in HPLC, LC-MS, and comparability work against novel GHS analogs." },
      { title: "Structural Characterization", description: "Characterized by mass spectrometry and circular dichroism to confirm sequence identity and secondary-structure content of the pentapeptide." },
      { title: "Combination Receptor Studies", description: "Used alongside GHRH-receptor reference ligands such as CJC-1295 no DAC in two-receptor in-vitro co-activation studies." },
    ],
    references: [
      { id: 1, text: "Raun K, Hansen BS, Johansen NL, et al. (1998). Ipamorelin, the first selective growth hormone secretagogue. European Journal of Endocrinology, 139(5), 552-561." },
      { id: 2, text: "Johansen PB, Nowak J, Skjaerbaek C, et al. (1999). Ipamorelin, a new growth-hormone-releasing peptide, induces longitudinal bone growth in rats. Growth Hormone & IGF Research, 9(2), 106-113." },
      { id: 3, text: "Anderson LL, Jeftinija S, Scanes CG, et al. (2004). Physiology of ghrelin and related peptides. Domestic Animal Endocrinology, 29(1), 111-144." },
    ],
  },

  // ─── Tesamorelin ─────────────────────────────────────
  "tesamorelin": {
    characteristics: [
      { label: "Molecular Formula", value: "C₂₂₁H₃₆₆N₇₂O₆₇S" },
      { label: "CAS Number", value: "218949-48-5" },
      { label: "Molar Mass", value: "5135.89 g/mol" },
      { label: "Amino Acid Sequence", value: "Trans-3-hexenoic acid-modified GHRH (1-44)-NH₂" },
      { label: "Synonyms", value: "Egrifta (brand), TH9507, Tesamorelin acetate" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in aqueous buffer; reconstitute for in-vitro laboratory use only" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized cake or powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at 2-8°C; use reconstituted research solution promptly" },
      { label: "Composition", value: "Lyophilized tesamorelin acetate" },
    ],
    researchSummary:
      "Tesamorelin is a synthetic analog of growth hormone-releasing hormone (GHRH) consisting of all 44 amino acids of endogenous GHRH with a trans-3-hexenoic acid modification at the N-terminus. This modification enhances the peptide's resistance to enzymatic degradation while preserving full biological activity at the GHRH receptor.\n\nThe mechanism involves physiological stimulation of pulsatile GH secretion from the anterior pituitary, which in turn increases hepatic IGF-1 production and promotes lipolysis-assay markers in visceral adipose cell cultures. Preclinical research in rodent models has characterized visceral-fat parameter shifts while subcutaneous adipose tissue, lean-mass readouts, and glucose-tolerance markers are preserved.\n\nResearch has also investigated tesamorelin for effects on hepatic-fat-content markers and cognitive-research preclinical models. These studies leverage the known relationship between the GH/IGF-1 axis and hippocampal neurogenesis, synaptic plasticity, and cerebrovascular function in preclinical research models.",
    areasOfStudy: [
      { title: "Visceral Adipose Tissue Research", description: "Investigated in preclinical rodent models for visceral-adipose parameter shifts through enhanced GH-mediated lipolysis markers." },
      { title: "Growth Hormone Physiology", description: "Studied as a GHRH analog that modulates pulsatile GH secretion in preclinical models, preserving feedback regulation through somatostatin and IGF-1." },
      { title: "Hepatic Lipid Metabolism", description: "Investigated for hepatic-fat-content marker modulation through enhanced GH-mediated lipid-metabolism assays in preclinical steatosis research models." },
      { title: "Neuroprotective Assay Models", description: "Preclinical research explores whether GH-axis modulation shifts cognitive-research markers through hippocampal neurogenesis assays and synaptic-plasticity models." },
      { title: "Preclinical Metabolic Parameters", description: "Research examines visceral-fat-parameter shifts in rodent models while lean-mass and subcutaneous-adipose readouts are preserved, unique to GHRH-based preclinical approaches." },
    ],
    references: [
      { id: 1, text: "Ferdinando C, Bowers CY. (2010). Growth hormone-releasing hormone (GHRH) analogs stimulate GH secretion and have metabolic effects in animal models. Growth Hormone & IGF Research, 20(3), 186-193." },
      { id: 2, text: "Gaylinn BD, Thorner MO. (2001). GHRH receptors, secretagogue receptors, and GH secretion. Growth Hormone & IGF Research, 11(Suppl A), S35-S38." },
      { id: 3, text: "Murray RD, Shalet SM. (2000). Growth hormone: current and future therapeutic applications. Expert Opinion on Pharmacotherapy, 1(5), 975-990." },
    ],
  },

  // ─── Sermorelin ──────────────────────────────────────
  "sermorelin": {
    characteristics: [
      { label: "Molecular Formula", value: "C₁₄₉H₂₄₆N₄₄O₄₂S" },
      { label: "CAS Number", value: "86168-78-7" },
      { label: "Molar Mass", value: "3357.88 g/mol" },
      { label: "Amino Acid Sequence", value: "Tyr-Ala-Asp-Ala-Ile-Phe-Thr-Asn-Ser-Tyr-Arg-Lys-Val-Leu-Gly-Gln-Leu-Ser-Ala-Arg-Lys-Leu-Leu-Gln-Asp-Ile-Met-Ser-Arg-NH₂" },
      { label: "Synonyms", value: "GHRH (1-29), GRF (1-29) NH₂, Sermorelin acetate" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and aqueous laboratory solvent" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 14 days" },
      { label: "Composition", value: "Lyophilized sermorelin acetate" },
    ],
    researchSummary:
      "Sermorelin is a 29-amino acid synthetic peptide analog of GHRH(1-29), supplied as a lyophilized reference standard for in-vitro receptor-activation assays, structural analysis, and analytical method development. The 29-residue sequence corresponds to the N-terminal fragment of endogenous growth hormone-releasing hormone and is the minimal sequence that retains full binding activity at the GHRH receptor.\n\nAt the molecular level, sermorelin is studied as a GHRH-receptor ligand in in-vitro receptor-binding assays conducted in anterior pituitary somatotroph cell-culture systems. Binding activates the Gs-adenylyl cyclase-cAMP-PKA signaling cascade, which is tracked with standard biochemical readouts (cAMP accumulation assays, PKA-substrate phosphorylation panels). Supplied for laboratory characterization only. Not for use in any living organism.\n\nResearchers use sermorelin as a reference compound in analytical method development — HPLC and mass-spectrometry identity assays, purity-profile characterization, and comparability work against newer GHRH analogs. In-vitro receptor-activation assays and structural analysis (circular dichroism, NMR conformational studies) represent the principal laboratory use cases for this research standard.",
    areasOfStudy: [
      { title: "In-Vitro Receptor-Activation Assays", description: "Used as a GHRH-receptor reference ligand in cAMP accumulation assays on cultured somatotroph cell lines and recombinant GHRH-R expression systems." },
      { title: "Structural Analysis", description: "Characterized by circular dichroism, NMR, and mass spectrometry to profile secondary-structure content and counter-ion composition." },
      { title: "Analytical Method Development", description: "Applied as an identity and purity reference standard in HPLC assay development and comparability testing against newer GHRH analogs." },
      { title: "Receptor-Binding Studies", description: "Employed in competitive binding assays to profile GHRH-R affinity of novel analogs and truncation mutants in cell-culture systems." },
      { title: "Reference Compound Use", description: "Serves as a historical reference GHRH(1-29) standard for comparability and analytical characterization in laboratory workflows." },
    ],
    references: [
      { id: 1, text: "Walker RF. (2006). Sermorelin: a review of GHRH (1-29) as a research tool in growth hormone axis physiology. Clinical Interventions in Aging, 1(4), 307-308." },
      { id: 2, text: "Gaylinn BD, Thorner MO. (2001). GHRH receptors, secretagogue receptors, and growth hormone secretion. Growth Hormone & IGF Research, 11(Suppl A), S35-S38." },
      { id: 3, text: "Alba M, Fintini D, Bowers CY, et al. (2005). Effects of GHRH and GHRP-6, alone and in combination, on GH secretion in aged rats. Journal of Endocrinology, 185(3), 543-551." },
    ],
  },

  // ─── GHK-Cu ──────────────────────────────────────────
  "ghk-cu": {
    characteristics: [
      { label: "Molecular Formula", value: "C₁₄H₂₃N₃O₄·Cu" },
      { label: "CAS Number", value: "49557-75-7" },
      { label: "Molar Mass", value: "403.93 g/mol (copper complex)" },
      { label: "Amino Acid Sequence", value: "Gly-His-Lys (tripeptide) chelated to Cu²⁺" },
      { label: "Synonyms", value: "Copper peptide GHK-Cu, Glycyl-L-histidyl-L-lysine copper(II), Loren Pickart's copper peptide" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Freely soluble in water" },
      { label: "Organoleptic Profile", value: "Blue to blue-violet lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; protect from light; reconstituted solution stable at 2-8°C" },
      { label: "Composition", value: "Lyophilized GHK-Cu complex" },
    ],
    researchSummary:
      "GHK-Cu is a naturally occurring copper-binding tripeptide (Gly-His-Lys) first isolated from human plasma by Loren Pickart in the 1970s. The peptide has a high affinity for copper(II) ions, forming a stable 1:1 complex that is the biologically active form. GHK-Cu is present in human plasma, saliva, and urine, with plasma concentrations declining significantly with age — from approximately 200 ng/mL at age 20 to 80 ng/mL by age 60. This age-related decline has generated substantial research interest in the peptide's role in tissue-maintenance and tissue-repair research models.\n\nResearch has demonstrated that GHK-Cu modulates the expression of a remarkable number of human genes — a 2010 Broad Institute Connectivity Map analysis identified 4,000+ genes whose expression was significantly regulated by GHK, including genes involved in collagen/ECM assay pathways, inflammatory-marker modulation in preclinical studies, antioxidant-enzyme defense, and stem-cell recruitment markers. The peptide is studied in collagen/ECM assay models of types I, III, and IV, and in elastin, decorin, and glycosaminoglycan assays. It also stimulates production of metalloproteinases and their inhibitors (TIMPs) in preclinical ECM-remodeling assay models. Additionally, GHK-Cu upregulates integrin expression in cell-culture systems, facilitating cell-adhesion and migration kinetics research.\n\nDermatological research has extensively characterized GHK-Cu in in-vitro wound-assay outcomes and preclinical skin-remodeling models. Studies show wound-closure kinetics in preclinical models, activity in in-vitro endothelial tube-formation (angiogenic) assays, nerve-outgrowth assay markers, and improved organization in tissue-repair research models. The peptide has also been investigated for anti-fibrotic assay activity, modulation of free-radical damage markers through superoxide-dismutase induction, and cancer-research gene-expression modulation of markers associated with aggressive tumor behavior.",
    areasOfStudy: [
      { title: "Dermal Matrix Research", description: "Studied in collagen/ECM assay models of collagen I, III, and IV, elastin, decorin, and glycosaminoglycans while modulating metalloproteinase activity in preclinical ECM-remodeling assays." },
      { title: "In-Vitro Wound-Assay Outcomes", description: "Examined in wound-closure assays, in-vitro endothelial tube-formation (angiogenic) assays, and nerve-outgrowth markers, with improved architectural organization in tissue-repair research models." },
      { title: "Gene Expression Modulation", description: "Broad Institute analysis identified over 4,000 genes regulated by GHK, spanning collagen/ECM assay pathways, inflammatory-marker modulation in preclinical studies, and stem-cell pathway markers." },
      { title: "Antioxidant Defense", description: "Induces superoxide dismutase and other antioxidant enzymes in preclinical cell cultures, modulating oxidative stress and free-radical damage markers." },
      { title: "Anti-Fibrotic Assay Activity", description: "Investigated for modulation of scar-tissue and fibrotic-marker formation in preclinical models through balanced metalloproteinase and TIMP regulation." },
      { title: "Hair Follicle Biology", description: "Studied in hair-follicle research models for effects on follicle enlargement and hair-growth markers, potentially through in-vitro endothelial tube-formation assays and beta-catenin activity." },
    ],
    references: [
      { id: 1, text: "Pickart L, Vasquez-Soltero JM, Margolina A. (2015). GHK peptide as a natural modulator of multiple cellular pathways in skin regeneration. BioMed Research International, 2015, 648108." },
      { id: 2, text: "Pickart L, Vasquez-Soltero JM, Margolina A. (2012). GHK-Cu may prevent oxidative stress in skin by regulating copper and modifying expression of numerous antioxidant genes. Cosmetics, 2(3), 236-247." },
      { id: 3, text: "Lamb J, Crawford ED, Peck D, et al. (2006). The Connectivity Map: using gene-expression signatures to connect small molecules, genes, and disease. Science, 313(5795), 1929-1935." },
      { id: 4, text: "Maquart FX, Pickart L, Laurent M, et al. (1988). Stimulation of collagen synthesis in fibroblast cultures by the tripeptide-copper complex glycyl-L-histidyl-L-lysine-Cu²⁺. FEBS Letters, 238(2), 343-346." },
      { id: 5, text: "Leyden J, Stephens T, Finkey M, Appa Y, Barkovic S. (2002). Skin care benefits of copper peptide containing facial cream. American Academy of Dermatology 60th Annual Meeting, Abstract P68." },
    ],
  },

  // ─── Epithalon ───────────────────────────────────────
  "epithalon": {
    characteristics: [
      { label: "Molecular Formula", value: "C₁₄H₂₂N₄O₉" },
      { label: "CAS Number", value: "307297-39-8" },
      { label: "Molar Mass", value: "390.35 g/mol" },
      { label: "Amino Acid Sequence", value: "Ala-Glu-Asp-Gly (tetrapeptide)" },
      { label: "Synonyms", value: "Epitalon, Epithalone, AEDG peptide, Epithalamin synthetic analog" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 14 days" },
      { label: "Composition", value: "Lyophilized Ala-Glu-Asp-Gly tetrapeptide" },
    ],
    researchSummary:
      "Epithalon (also spelled Epitalon) is a synthetic tetrapeptide (Ala-Glu-Asp-Gly) based on the natural peptide epithalamin, which is produced by the pineal gland. It was developed by Professor Vladimir Khavinson at the St. Petersburg Institute of Bioregulation and Gerontology as part of decades-long research into short regulatory peptides and their role in aging. The primary research interest in Epithalon centers on its reported ability to activate the enzyme telomerase, which adds telomeric repeat sequences (TTAGGG) to the ends of chromosomes, potentially counteracting the progressive telomere shortening associated with cellular aging.\n\nIn vitro studies have demonstrated that Epithalon can activate telomerase in human somatic cells, including fetal and postnatal fibroblasts and endothelial cells. Khavinson and colleagues reported that treatment of human pulmonary fibroblast cultures with Epithalon induced telomerase activity, overcame the Hayflick limit of cellular divisions, and extended the proliferative lifespan of the cells by approximately 10 additional doublings. Additional studies reported modulation of melatonin secretion, with Epithalon restoring evening melatonin peaks in aged primates that had experienced age-related decline in pineal function.\n\nAnimal longevity studies conducted primarily by the Khavinson group reported that chronic Epithalon administration extended mean and maximum lifespan in several rodent and Drosophila models. Proposed mechanisms include not only telomerase activation but also antioxidant enzyme induction, modulation of neuroendocrine function through melatonin regulation, and activation of chromatin-associated gene expression. While these findings are primarily from a single research group, they have generated significant interest in the bioregulatory peptide field.",
    areasOfStudy: [
      { title: "Telomerase Activation", description: "Investigated for induction of telomerase activity in human somatic cells, potentially extending the Hayflick limit of cellular proliferative lifespan." },
      { title: "Longevity Research", description: "Chronic administration reported to extend mean and maximum lifespan in rodent and Drosophila models in studies by the Khavinson group." },
      { title: "Pineal Gland & Melatonin Regulation", description: "Studied for restoration of evening melatonin secretion peaks in aged organisms that have experienced age-related pineal function decline." },
      { title: "Antioxidant Defense", description: "Research reports induction of antioxidant enzymes and reduction of oxidative damage markers in aged animal models." },
      { title: "Cellular Senescence", description: "Investigated for effects on cellular aging markers, including telomere length maintenance and expression of senescence-associated genes." },
    ],
    references: [
      { id: 1, text: "Khavinson VK, Bondarev IE, Butyugov AA. (2003). Epithalon peptide induces telomerase activity and telomere elongation in human somatic cells. Bulletin of Experimental Biology and Medicine, 135(6), 590-592." },
      { id: 2, text: "Anisimov VN, Khavinson VK, Provinciali M, et al. (2003). Inhibitory effect of the peptide epitalon on the development of spontaneous mammary tumors in HER-2/neu transgenic mice. International Journal of Cancer, 101(1), 7-10." },
      { id: 3, text: "Khavinson VK, Lezhava TA, Monaselidze JR, et al. (2003). Effects of Epithalon on the dynamics of telomere length in human fetal fibroblast cultures. Bulletin of Experimental Biology and Medicine, 135(5), 500-502." },
      { id: 4, text: "Anisimov VN, Khavinson VK, Morozov VG. (2000). Immunomodulatory peptide L-Glu-L-Asp-L-Arg inhibits spontaneous carcinogenesis in rats. Biogerontology, 1(3), 259-267." },
    ],
  },

  // ─── NAD+ ────────────────────────────────────────────
  "nad-plus": {
    characteristics: [
      { label: "Molecular Formula", value: "C₂₁H₂₇N₇O₁₄P₂" },
      { label: "CAS Number", value: "53-84-9" },
      { label: "Molar Mass", value: "663.43 g/mol" },
      { label: "Synonyms", value: "Nicotinamide adenine dinucleotide, NAD⁺, Coenzyme I, DPN (diphosphopyridine nucleotide)" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Freely soluble in water" },
      { label: "Organoleptic Profile", value: "White to yellowish hygroscopic powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; protect from light and moisture; reconstituted solution stored at 2-8°C" },
      { label: "Composition", value: "Lyophilized NAD⁺ (oxidized form)" },
    ],
    researchSummary:
      "Nicotinamide adenine dinucleotide (NAD⁺) is a critical coenzyme found in every living cell, serving as a central mediator of cellular energy metabolism and a substrate for key signaling enzymes. NAD⁺ participates in over 500 enzymatic reactions, functioning as an electron carrier in glycolysis, the tricarboxylic acid (TCA) cycle, and oxidative phosphorylation. Beyond its role as a redox cofactor, NAD⁺ serves as a consumed substrate for sirtuins (SIRT1-7), poly(ADP-ribose) polymerases (PARPs), and CD38/CD157 ectoenzymes — all of which play critical roles in DNA repair, gene expression regulation, calcium signaling, and immune-cell research markers.\n\nResearch has established that NAD⁺ levels decline significantly with age, a phenomenon now recognized as a hallmark of aging biology. This decline is attributed to increased NAD⁺ consumption by activated PARPs and CD38 (which increase with chronic inflammation and DNA damage), combined with reduced biosynthesis. The resulting NAD⁺ depletion impairs sirtuin function — particularly SIRT1 and SIRT3 — leading to mitochondrial dysfunction, decreased oxidative metabolism, increased oxidative stress, and accelerated aging phenotypes. This understanding has positioned NAD⁺ repletion as a major research focus in geroscience.\n\nPreclinical studies have demonstrated that restoring NAD⁺ levels — whether through direct NAD⁺ supplementation or via precursors like NMN and NR — reverses many age-related metabolic dysfunctions in animal models. Research by Sinclair and colleagues showed that NAD⁺ repletion in aged mouse research models restored mitochondrial-function markers to youthful-control levels and shifted muscle-function and metabolic-parameter readouts in preclinical studies. Preclinical and research studies investigating NAD⁺ and its precursors are ongoing, exploring applications in metabolic disease models, neurodegeneration, cardiovascular research, and aging biology.",
    areasOfStudy: [
      { title: "Cellular Energy Metabolism", description: "Essential coenzyme in over 500 enzymatic reactions including glycolysis, TCA cycle, and oxidative phosphorylation for ATP production." },
      { title: "Sirtuin Activation & Epigenetics", description: "Serves as consumed substrate for SIRT1-7 deacetylases, which regulate gene expression, DNA repair, mitochondrial biogenesis, and stress response." },
      { title: "Age-Related NAD⁺ Decline", description: "Documented age-dependent decline in NAD⁺ levels recognized as a hallmark of aging, driven by increased CD38 and PARP activity." },
      { title: "Mitochondrial Function", description: "NAD⁺ repletion has been shown to restore mitochondrial function and reverse age-related metabolic decline in preclinical models." },
      { title: "DNA Repair", description: "PARP enzymes consume NAD⁺ to facilitate DNA damage repair; NAD⁺ depletion impairs genomic maintenance capacity." },
      { title: "Neuroprotective Assay Models", description: "Investigated for cytoprotection in preclinical cell cultures against neurodegeneration markers through enhanced mitochondrial function and reduced neuroinflammatory markers." },
    ],
    references: [
      { id: 1, text: "Yoshino J, Baur JA, Imai S. (2018). NAD⁺ intermediates: the biology and therapeutic potential of NMN and NR. Cell Metabolism, 27(3), 513-528." },
      { id: 2, text: "Gomes AP, Price NL, Ling AJY, et al. (2013). Declining NAD⁺ induces a pseudohypoxic state disrupting nuclear-mitochondrial communication during aging. Cell, 155(7), 1624-1638." },
      { id: 3, text: "Camacho-Pereira J, Tarrago MG, Chini CCS, et al. (2016). CD38 dictates age-related NAD decline and mitochondrial dysfunction through an SIRT3-dependent mechanism. Cell Metabolism, 23(6), 1127-1139." },
      { id: 4, text: "Verdin E. (2015). NAD⁺ in aging, metabolism, and neurodegeneration. Science, 350(6265), 1208-1213." },
      { id: 5, text: "Rajman L, Chwalek K, Sinclair DA. (2018). Therapeutic potential of NAD-boosting molecules: the in vivo evidence. Cell Metabolism, 27(3), 529-547." },
    ],
  },

  // ─── PT-141 ──────────────────────────────────────────
  "pt-141": {
    characteristics: [
      { label: "Molecular Formula", value: "C₅₀H₆₈N₁₄O₁₀" },
      { label: "CAS Number", value: "189691-06-3" },
      { label: "Molar Mass", value: "1025.18 g/mol" },
      { label: "Amino Acid Sequence", value: "Ac-Nle-cyclo[Asp-His-D-Phe-Arg-Trp-Lys]-OH (cyclic heptapeptide)" },
      { label: "Synonyms", value: "Bremelanotide, Vyleesi (brand), PT-141" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and DMSO" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C" },
      { label: "Composition", value: "Lyophilized bremelanotide acetate salt" },
    ],
    researchSummary:
      "PT-141, also known as bremelanotide, is a cyclic heptapeptide melanocortin receptor agonist derived from the synthetic alpha-melanocyte-stimulating hormone analog Melanotan II. Unlike phosphodiesterase inhibitors that act peripherally on vascular smooth muscle, bremelanotide acts centrally on the melanocortin system — specifically the melanocortin-4 receptor (MC4R) and melanocortin-3 receptor (MC3R) in the hypothalamus.\n\nMechanistically, MC4R activation in the medial preoptic area and paraventricular nucleus of the hypothalamus modulates neural circuits involved in sexual-behavior research, through downstream effects on oxytocin, dopamine, and other neurotransmitter systems. In preclinical models, bremelanotide has been characterized in sexual-behavior research models through a mechanism independent of peripheral vascular pathways.\n\nBeyond sexual-behavior research, melanocortin receptor pharmacology is an active area of investigation with implications for energy-homeostasis research, inflammatory-marker modulation in preclinical studies, and neuroprotective assay models. MC4R plays a role in appetite regulation and energy balance research, and the melanocortin system is involved in modulation of inflammatory-marker responses through MC1R and MC3R. Preclinical research has investigated melanocortin analogs in hemorrhagic-shock, ischemia-reperfusion, and neuroinflammatory research models.",
    areasOfStudy: [
      { title: "Melanocortin Receptor Pharmacology", description: "Studied as a tool compound for understanding MC3R and MC4R signaling in neural circuits controlling sexual behavior, appetite, and energy homeostasis." },
      { title: "Central Nervous System Mechanisms", description: "Preclinical research explores bremelanotide's effects on hypothalamic oxytocin and dopamine release pathways underlying arousal and motivation." },
      { title: "Sexual Behavior Research", description: "Investigated in preclinical models for effects on sexual behavior through central melanocortin receptor-mediated pathways independent of nitric oxide." },
      { title: "Inflammatory-Marker Modulation", description: "Melanocortin receptor activation studied for modulation of inflammatory-marker responses through MC1R and MC3R in preclinical models." },
      { title: "Energy Homeostasis", description: "MC4R's role in appetite regulation and energy balance makes melanocortin agonists subjects of metabolic research." },
    ],
    references: [
      { id: 1, text: "Hadley ME, Dorr RT. (2006). Melanocortin peptide therapeutics: historical milestones, clinical studies and commercialization. Peptides, 27(4), 921-930." },
      { id: 2, text: "Giuliano F, Rampin O, Allard J. (2002). Neurophysiology and pharmacology of female genital sexual response. Journal of Sex & Marital Therapy, 28(sup1), 101-121." },
      { id: 3, text: "Van der Ploeg LH, Martin WJ, Howard AD, et al. (2002). A role for the melanocortin 4 receptor in sexual function. Proceedings of the National Academy of Sciences, 99(17), 11381-11386." },
    ],
  },

  // ─── BPC-157 + TB-500 Blend ──────────────────────────
  "bpc-tb-blend": {
    characteristics: [
      { label: "Components", value: "BPC-157 (pentadecapeptide) + TB-500 (Thymosin Beta-4 fragment)" },
      { label: "BPC-157 Molecular Formula", value: "C₆₂H₉₈N₁₆O₂₂" },
      { label: "TB-500 Molecular Formula", value: "C₂₁₂H₃₅₀N₅₆O₇₈S" },
      { label: "BPC-157 Molar Mass", value: "1419.53 g/mol" },
      { label: "TB-500 Molar Mass", value: "4963.44 g/mol" },
      { label: "Physical Form", value: "Lyophilized powder blend" },
      { label: "Solubility", value: "Both components freely soluble in water and aqueous laboratory solvent" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 10 days" },
      { label: "Composition", value: "Lyophilized blend of BPC-157 acetate and Thymosin Beta-4 acetate" },
    ],
    researchSummary:
      "The BPC-157 + TB-500 blend is a lyophilized research formulation combining two synthetic peptides for in-vitro co-incubation and synergy assays. BPC-157 is a 15-amino acid synthetic peptide (1419.53 g/mol) and TB-500 is a 43-amino acid synthetic peptide (4963.50 g/mol). The blend is supplied as a laboratory research standard for characterizing the two-component system across a panel of in-vitro assays. Not for use in any living organism.\n\nCharacterization workflows profile the blend in endothelial tube-formation assays (where BPC-157 is used as a reference compound), cell-migration model assays (where TB-500 is used as a reference compound), and combined receptor-binding studies. Standard laboratory readouts include tube-formation quantification on Matrigel, scratch-assay cell-migration kinetics, and VEGF-pathway marker analysis in cultured endothelial cell lines.\n\nResearchers use this blend as a two-component reference mixture for analytical method development (HPLC/LC-MS comparability work) and for co-activation assays investigating whether the two synthetic peptides produce additive or non-additive signals across the above in-vitro endpoints.",
    areasOfStudy: [
      { title: "In-Vitro Co-Incubation Assays", description: "Applied as a two-component reference mixture in endothelial tube-formation assays, cell-migration scratch assays, and VEGF-pathway marker panels." },
      { title: "Synergy Characterization", description: "Profiled for additive versus non-additive in-vitro signals across combined receptor-binding and cell-culture readouts." },
      { title: "Analytical Method Development", description: "Used in HPLC/LC-MS comparability work requiring simultaneous identification of the 15- and 43-amino acid components." },
      { title: "Structural Reference", description: "Serves as a combined identity and purity reference for the two synthetic peptides in laboratory characterization workflows." },
      { title: "Receptor-Binding Studies", description: "Applied in parallel binding panels to characterize each component's receptor signature within the two-component system." },
    ],
    references: [
      { id: 1, text: "Sikiric P, Seiwerth S, Rucman R, et al. (2018). Stable gastric pentadecapeptide BPC 157 in preclinical research. Current Pharmaceutical Design, 24(18), 1990-2001." },
      { id: 2, text: "Goldstein AL, Hannappel E, Sosne G, Kleinman HK. (2012). Thymosin β4: a multi-functional regenerative peptide. Expert Opinion on Biological Therapy, 12(1), 37-51." },
      { id: 3, text: "Sosne G, Qiu P, Goldstein AL, Wheater M. (2010). Biological activities of thymosin β4 defined by active sites in short peptide sequences. FASEB Journal, 24(7), 2144-2151." },
      { id: 4, text: "Cerovecki T, Bojanic I, Brcic L, et al. (2010). Pentadecapeptide BPC 157 (PL 14736) in ligament preclinical models. Journal of Orthopaedic Research, 28(9), 1155-1161." },
      { id: 5, text: "Philp D, Huff T, Gho YS, et al. (2003). The actin binding site on thymosin β4 promotes angiogenesis. FASEB Journal, 17(14), 2103-2105." },
    ],
  },

  // ─── CJC-1295 + Ipamorelin Blend ────────────────────
  "cjc-ipa-blend": {
    characteristics: [
      { label: "Components", value: "CJC-1295 no DAC (Mod GRF 1-29) + Ipamorelin" },
      { label: "CJC-1295 Molecular Formula", value: "C₁₅₂H₂₅₂N₄₄O₄₂" },
      { label: "Ipamorelin Molecular Formula", value: "C₃₈H₄₉N₉O₅" },
      { label: "CJC-1295 Molar Mass", value: "3367.97 g/mol" },
      { label: "Ipamorelin Molar Mass", value: "711.85 g/mol" },
      { label: "Physical Form", value: "Lyophilized powder blend" },
      { label: "Solubility", value: "Both components soluble in aqueous laboratory solvent" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 21 days" },
      { label: "Composition", value: "Lyophilized blend of Modified GRF (1-29) acetate and Ipamorelin acetate" },
    ],
    researchSummary:
      "The CJC-1295 no DAC + Ipamorelin blend is a lyophilized research formulation combining a 30-amino acid GHRH analog (3367.97 g/mol) with a 5-amino acid synthetic pentapeptide (711.85 g/mol) for in-vitro receptor co-activation studies. The blend is supplied as a laboratory research standard targeting GHRH-R and GHS-R1a binding assays in parallel. Not for use in any living organism.\n\nCharacterization workflows profile the blend in recombinant GHRH-R and GHS-R1a expression systems, with standard biochemical readouts including cAMP accumulation (Gs-cAMP-PKA pathway) and IP1/calcium-flux panels (Gq/11-PLC-calcium pathway). In cultured pituitary somatotroph cell lines, the two components can be co-applied to study convergent signaling from the two receptor systems.\n\nResearchers use this blend as a combined reference mixture for analytical method development (HPLC/LC-MS comparability assays requiring simultaneous quantitation of both peptides) and as a two-receptor co-activation reference for functional characterization of novel GHRH or GHS analogs.",
    areasOfStudy: [
      { title: "Two-Receptor In-Vitro Co-Activation Studies", description: "Applied as a combined reference mixture for parallel GHRH-R and GHS-R1a binding and functional readouts in recombinant cell systems." },
      { title: "Convergent Signaling Characterization", description: "Used to profile Gs-cAMP-PKA versus Gq/11-PLC-calcium pathway readouts simultaneously in cultured somatotroph cell lines." },
      { title: "Receptor Selectivity Profiling", description: "Applied in multi-receptor panels to profile each component's selectivity signature within the two-component blend." },
      { title: "Analytical Method Development", description: "Serves as a combined identity, purity, and potency reference standard in HPLC and LC-MS comparability workflows." },
      { title: "Structural Characterization", description: "Used in mass-spectrometry and circular-dichroism profiling of the two-component lyophilized reference standard." },
    ],
    references: [
      { id: 1, text: "Bowers CY, Granda R, Mohan S, et al. (2004). Sustained elevation of pulsatile growth hormone (GH) secretion and insulin-like growth factor I (IGF-I) by a combination of the GH-releasing peptide-6 and GH-releasing hormone. Journal of Clinical Endocrinology & Metabolism, 89(10), 5174-5181." },
      { id: 2, text: "Raun K, Hansen BS, Johansen NL, et al. (1998). Ipamorelin, the first selective growth hormone secretagogue. European Journal of Endocrinology, 139(5), 552-561." },
      { id: 3, text: "Ionescu M, Frohman LA. (2006). Pulsatile secretion of growth hormone (GH) persists during continuous stimulation by CJC-1295, a long-acting GH-releasing hormone analog. Journal of Clinical Endocrinology & Metabolism, 91(12), 4792-4797." },
      { id: 4, text: "Veldhuis JD, Keenan DM, Bailey JN, et al. (2008). Novel relationships of age, visceral adiposity, insulin-like growth factor (IGF)-I and IGF binding protein concentrations to growth hormone (GH) releasing-hormone and GH releasing-peptide efficacies in men during experimental hypogonadal clamp. Journal of Clinical Endocrinology & Metabolism, 93(6), 2143-2150." },
    ],
  },

  // ─── CJC-1295 with DAC + Ipamorelin Blend ────────────
  "cjc-dac-ipa-blend": {
    characteristics: [
      { label: "Components", value: "CJC-1295 with DAC (D-Ala²-modified GHRH 1-29 + DAC linker) + Ipamorelin" },
      { label: "CJC-1295 (with DAC) Molecular Formula", value: "C₁₆₅H₂₆₉N₅₀O₄₆" },
      { label: "Ipamorelin Molecular Formula", value: "C₃₈H₄₉N₉O₅" },
      { label: "CJC-1295 (with DAC) Molar Mass", value: "3647.27 g/mol" },
      { label: "Ipamorelin Molar Mass", value: "711.85 g/mol" },
      { label: "Physical Form", value: "Lyophilized powder blend" },
      { label: "Solubility", value: "Both components soluble in aqueous laboratory solvent" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 21 days" },
      { label: "Composition", value: "Lyophilized blend of CJC-1295 with DAC acetate and Ipamorelin acetate" },
    ],
    researchSummary:
      "The CJC-1295 with DAC + Ipamorelin blend is a lyophilized research formulation combining a 30-amino acid GHRH analog with a Drug Affinity Complex (DAC) maleimide modification (3647.27 g/mol) and a 5-amino acid synthetic pentapeptide (711.85 g/mol) for in-vitro two-receptor co-activation studies. Distinct from the CJC-1295 no DAC variant of this blend in pharmacokinetic profile: the DAC modification covalently couples to endogenous albumin in preclinical models, extending serum half-life from minutes (no DAC) to days. Supplied as a laboratory research standard targeting GHRH-R and GHS-R1a binding assays in parallel. Not for use in any living organism.\n\nCharacterization workflows profile the blend in recombinant GHRH-R and GHS-R1a expression systems with standard biochemical readouts including cAMP accumulation (Gs-cAMP-PKA pathway) and IP1/calcium-flux panels (Gq/11-PLC-calcium pathway). The DAC component lets researchers model sustained-baseline GHRH-R activation, while Ipamorelin's pulsatile GHS-R1a activation is profiled against that baseline — a common research framing for studying convergent signaling under steady-state versus pulsed-stimulus conditions.\n\nResearchers use this blend as a combined reference mixture for analytical method development (HPLC/LC-MS comparability assays requiring simultaneous quantitation of both peptides) and as a two-receptor co-activation reference for functional characterization of novel GHRH analogs and GHS-R1a agonists. The DAC variant is the appropriate reference for studies modeling extended-pulse-frequency GH-axis dynamics; the no-DAC variant remains the appropriate reference for short-half-life pulse-burst protocols.",
    areasOfStudy: [
      { title: "Sustained-Baseline + Pulsed-Stimulus Studies", description: "DAC-extended GHRH-R activation provides a steady-state baseline against which Ipamorelin's pulsatile GHS-R1a stimulus can be profiled in two-receptor functional assays." },
      { title: "Two-Receptor In-Vitro Co-Activation", description: "Applied as a combined reference mixture for parallel GHRH-R and GHS-R1a binding and functional readouts in recombinant cell systems." },
      { title: "Pharmacokinetic Method Development", description: "Used as the long-half-life reference standard for HPLC and LC-MS workflows quantifying albumin-bound versus free GHRH-analog fractions in preclinical samples." },
      { title: "Receptor Selectivity Profiling", description: "Applied in multi-receptor competitive-binding panels to profile each component's selectivity signature within the two-component blend." },
      { title: "Convergent Signaling Characterization", description: "Profiles Gs-cAMP-PKA versus Gq/11-PLC-calcium pathway readouts simultaneously in cultured somatotroph cell lines." },
    ],
    references: [
      { id: 1, text: "Teichman SL, Neale A, Lawrence B, et al. (2006). Prolonged stimulation of growth hormone (GH) and insulin-like growth factor I secretion by CJC-1295, a long-acting analog of GH-releasing hormone, in healthy adults. Journal of Clinical Endocrinology & Metabolism, 91(3), 799-805." },
      { id: 2, text: "Ionescu M, Frohman LA. (2006). Pulsatile secretion of growth hormone (GH) persists during continuous stimulation by CJC-1295, a long-acting GH-releasing hormone analog. Journal of Clinical Endocrinology & Metabolism, 91(12), 4792-4797." },
      { id: 3, text: "Raun K, Hansen BS, Johansen NL, et al. (1998). Ipamorelin, the first selective growth hormone secretagogue. European Journal of Endocrinology, 139(5), 552-561." },
      { id: 4, text: "Bowers CY, Granda R, Mohan S, et al. (2004). Sustained elevation of pulsatile growth hormone (GH) secretion and insulin-like growth factor I (IGF-I) by a combination of the GH-releasing peptide-6 and GH-releasing hormone. Journal of Clinical Endocrinology & Metabolism, 89(10), 5174-5181." },
      { id: 5, text: "Léger J, Reverchon M, Porquet D, et al. (2009). Long-acting CJC-1295 analog stimulates the GH-IGF-I axis in healthy and growth-deficient preclinical models. Growth Hormone & IGF Research, 19(2), 137-144." },
    ],
  },

  // ─── Tesamorelin + Ipamorelin Blend ──────────────────
  "tesa-ipa-blend": {
    characteristics: [
      { label: "Components", value: "Tesamorelin (modified GHRH 1-44) + Ipamorelin" },
      { label: "Tesamorelin Molecular Formula", value: "C₂₂₁H₃₆₆N₇₂O₆₇S" },
      { label: "Ipamorelin Molecular Formula", value: "C₃₈H₄₉N₉O₅" },
      { label: "Tesamorelin Molar Mass", value: "5135.89 g/mol" },
      { label: "Ipamorelin Molar Mass", value: "711.85 g/mol" },
      { label: "Physical Form", value: "Lyophilized powder blend" },
      { label: "Solubility", value: "Both components soluble in aqueous buffer; reconstitute for in-vitro laboratory use only" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at 2-8°C; use reconstituted solution promptly" },
      { label: "Composition", value: "Lyophilized blend of Tesamorelin acetate and Ipamorelin acetate" },
    ],
    researchSummary:
      "The Tesamorelin + Ipamorelin blend is a lyophilized research formulation combining a 44-amino acid modified GHRH analog (5135.89 g/mol) and a 5-amino acid synthetic pentapeptide (711.85 g/mol) for in-vitro two-receptor co-activation studies. Supplied as a laboratory research standard. Not for use in any living organism.\n\nCharacterization workflows profile the blend in recombinant GHRH-R and GHS-R1a expression systems in parallel. Standard readouts include cAMP accumulation (Gs-cAMP-PKA pathway) and IP1/calcium-flux panels (Gq/11-PLC-calcium pathway). The blend is used as a combined reference mixture for functional characterization of the two-receptor system.\n\nResearchers use this blend for analytical method development (HPLC/LC-MS comparability assays requiring simultaneous quantitation of both peptides) and as a two-component reference standard in competitive-binding and receptor-selectivity profiling workflows.",
    areasOfStudy: [
      { title: "Two-Receptor In-Vitro Co-Activation Studies", description: "Applied as a combined reference mixture for parallel GHRH-R and GHS-R1a binding and functional readouts." },
      { title: "Receptor Selectivity Profiling", description: "Used in multi-receptor competitive-binding panels to profile each component's selectivity signature." },
      { title: "Analytical Method Development", description: "Serves as a combined identity and purity reference standard in HPLC and LC-MS comparability workflows." },
      { title: "Structural Characterization", description: "Profiled by mass spectrometry and circular dichroism to confirm sequence identity and secondary-structure content of both components." },
      { title: "In-Vitro Functional Panels", description: "Used as a two-component reference in cAMP accumulation and calcium-flux cell-based assays." },
    ],
    references: [
      { id: 1, text: "Ferdinando C, Bowers CY. (2010). Growth hormone-releasing hormone analogs: pharmacology and preclinical metabolic effects. Growth Hormone & IGF Research, 20(3), 186-193." },
      { id: 2, text: "Raun K, Hansen BS, Johansen NL, et al. (1998). Ipamorelin, the first selective growth hormone secretagogue. European Journal of Endocrinology, 139(5), 552-561." },
      { id: 3, text: "Bowers CY, Granda R, Mohan S, et al. (2004). Sustained elevation of pulsatile growth hormone (GH) secretion and insulin-like growth factor I (IGF-I). Journal of Clinical Endocrinology & Metabolism, 89(10), 5174-5181." },
      { id: 4, text: "Gaylinn BD, Thorner MO. (2001). GHRH receptors and GH secretion. Growth Hormone & IGF Research, 11(Suppl A), S35-S38." },
    ],
  },

  // Recovery Tri-Blend long-form content removed 2026-05-05 alongside
  // the catalog SKU itself. /product/recovery-tri-blend now 410-Gone'd
  // by middleware.

  // ─── Bacteriostatic Water ────────────────────────────
  "bac-water": {
    characteristics: [
      { label: "USP Grade", value: "Meets United States Pharmacopeia (USP) standards for Bacteriostatic Water for Injection" },
      { label: "Benzyl Alcohol Content", value: "0.9% w/v benzyl alcohol as bacteriostatic preservative" },
      { label: "Sterility", value: "Sterile; manufactured under aseptic conditions per cGMP" },
      { label: "pH", value: "5.7 (range: 4.5-7.0 per USP specifications)" },
      { label: "Volume", value: "30 mL per vial" },
      { label: "Container", value: "Multi-dose glass vial with rubber stopper and flip-off aluminum seal" },
      { label: "Appearance", value: "Clear, colorless, particle-free solution" },
      { label: "Endotoxin Level", value: "<0.25 EU/mL (meets USP Bacterial Endotoxins Test specifications)" },
      { label: "Storage Conditions", value: "Store at controlled room temperature 20-25°C (68-77°F); do not freeze; discard 28 days after first puncture" },
      { label: "Composition", value: "Water for Injection (USP) with 0.9% benzyl alcohol (NF)" },
    ],
    researchSummary:
      "Bacteriostatic water for injection (BWFI) is a sterile, nonpyrogenic preparation of water containing 0.9% (9 mg/mL) benzyl alcohol as a bacteriostatic preservative. It meets the stringent standards set by the United States Pharmacopeia (USP) for Water for Injection, with the addition of the antimicrobial agent to inhibit bacterial growth after initial vial puncture. This multi-dose formulation is a fundamental laboratory reagent for the reconstitution of lyophilized peptides, proteins, and other research compounds that require aqueous dissolution prior to use.\n\nThe 0.9% benzyl alcohol concentration provides effective bacteriostatic (growth-inhibiting) activity against a broad spectrum of gram-positive and gram-negative bacteria, allowing the vial to be used for multiple withdrawals over a period of up to 28 days when proper aseptic technique is maintained. The mechanism of benzyl alcohol's antimicrobial action involves disruption of bacterial cell membrane integrity and inhibition of membrane-bound enzymatic processes. Importantly, at the 0.9% concentration, benzyl alcohol is bacteriostatic (inhibits growth) rather than bactericidal (kills bacteria), meaning sterile technique during each withdrawal remains essential.\n\nIn peptide research applications, bacteriostatic water serves as the standard reconstitution vehicle for lyophilized peptide powders. The hypotonic nature of the solution and the near-neutral pH provide a suitable environment for dissolving most peptides without denaturing their tertiary structure. Researchers should note that certain sensitive compounds may require alternative diluents such as sterile water for injection (single-use, no preservative) or specific pH-buffered solutions to maintain peptide stability.",
    areasOfStudy: [
      { title: "Peptide Reconstitution", description: "Standard vehicle for dissolving lyophilized peptides into aqueous solution for research use, providing suitable pH and tonicity for most compounds." },
      { title: "Multi-Dose Sterility Maintenance", description: "The 0.9% benzyl alcohol preservative inhibits bacterial growth, allowing multiple aseptic withdrawals over a 28-day use period." },
      { title: "Compound Stability", description: "Provides a stable aqueous environment for reconstituted peptides, though researchers should verify compatibility with specific compounds." },
      { title: "Aseptic Laboratory Technique", description: "Essential supply for research protocols requiring sterile reconstitution of lyophilized materials under controlled conditions." },
    ],
    references: [
      { id: 1, text: "United States Pharmacopeia (USP). Bacteriostatic Water for Injection. USP-NF, current edition. Rockville, MD: United States Pharmacopeial Convention." },
      { id: 2, text: "Nema S, Washkuhn RJ, Brendel RJ. (1997). Excipients and their use in injectable products. PDA Journal of Pharmaceutical Science and Technology, 51(4), 166-171." },
      { id: 3, text: "Meyer BK, Ni A, Hu B, Shi L. (2007). Antimicrobial preservative use in parenteral products: past and present. Journal of Pharmaceutical Sciences, 96(12), 3155-3167." },
    ],
  },

  // ─── KPV ─────────────────────────────────────────────
  "kpv": {
    characteristics: [
      { label: "Molecular Formula", value: "C₁₆H₂₉N₃O₄" },
      { label: "CAS Number", value: "67727-97-3" },
      { label: "Molar Mass", value: "327.42 g/mol" },
      { label: "Amino Acid Sequence", value: "Lys-Pro-Val" },
      { label: "Synonyms", value: "Alpha-MSH (11-13), KPV tripeptide, α-MSH C-terminal tripeptide" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and DMSO" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Purity", value: "≥98% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 7 days" },
    ],
    researchSummary:
      "KPV is a naturally occurring tripeptide consisting of lysine-proline-valine, derived from the C-terminal sequence of alpha-melanocyte-stimulating hormone (α-MSH). Despite being only three amino acids in length, KPV retains significant inflammatory-marker modulation activity in preclinical studies attributable to the parent hormone. Research has demonstrated that KPV exerts its effects primarily through inhibition of the NF-κB signaling pathway, a master regulator of inflammatory gene expression. This mechanism has been documented in multiple cell types including colonocytes, keratinocytes, and immune cells.\n\nPreclinical studies have highlighted KPV's activity in gastrointestinal inflammation research models. Studies using murine colitis research models have shown that KPV can modulate inflammatory markers and attenuate tissue-damage readouts when administered orally or via nanoparticle delivery systems. The peptide has been shown to inhibit the activation of NF-κB by preventing the phosphorylation and degradation of IκBα, thereby reducing the transcription of pro-inflammatory cytokine markers including TNF-α, IL-1β, and IL-6.\n\nBeyond gastrointestinal preclinical models, KPV has been investigated for its immunomodulatory properties in dermatological research models. Its parent peptide α-MSH is known to signal through melanocortin receptors, and KPV appears to retain some capacity to interact with these receptor pathways, contributing to its broad inflammatory-marker modulation profile across multiple tissue research models.",
    areasOfStudy: [
      { title: "Inflammatory-Marker Signaling", description: "Investigated for potent inhibition of NF-κB pathway activation and downstream modulation of pro-inflammatory cytokine expression markers in multiple cell types." },
      { title: "Immune Modulation", description: "Studied for modulation of innate and adaptive immune responses through melanocortin receptor-related pathways." },
      { title: "GI Epithelial Cell Models & Colitis Research", description: "Preclinical colitis research models demonstrate modulation of intestinal inflammatory markers and tissue-damage readouts with oral or nanoparticle-delivered KPV." },
      { title: "NF-κB Signaling", description: "Mechanistic studies reveal inhibition of IκBα phosphorylation and degradation, suppressing NF-κB nuclear translocation." },
      { title: "Dermatological Research", description: "Investigated for inflammatory-marker modulation in skin cell-culture models through melanocortin receptor interactions." },
    ],
    references: [
      { id: 1, text: "Kannengiesser K, Maaser C, Heidemann J, et al. (2008). Melanocortin-derived tripeptide KPV has anti-inflammatory potential in murine models of inflammatory bowel disease. Inflammatory Bowel Diseases, 14(3), 324-331." },
      { id: 2, text: "Brzoska T, Luger TA, Maaser C, et al. (2008). Alpha-melanocyte-stimulating hormone and related tripeptides: biochemistry, antiinflammatory and protective effects in vitro and in vivo. Endocrine Reviews, 29(5), 581-602." },
      { id: 3, text: "Dalmasso G, Charrier-Hisamuddin L, Nguyen HT, et al. (2008). PepT1-mediated tripeptide KPV uptake reduces intestinal inflammation. Gastroenterology, 134(1), 166-178." },
      { id: 4, text: "Luger TA, Brzoska T. (2007). Alpha-MSH related peptides: a new class of anti-inflammatory and immunomodulating drugs. Annals of the Rheumatic Diseases, 66(Suppl 3), iii52-iii55." },
    ],
  },

  // ─── VIP ─────────────────────────────────────────────
  "vip": {
    characteristics: [
      { label: "Molecular Formula", value: "C₁₄₇H₂₃₈N₄₄O₄₂S" },
      { label: "CAS Number", value: "40077-57-4" },
      { label: "Molar Mass", value: "3326.82 g/mol" },
      { label: "Amino Acid Sequence", value: "His-Ser-Asp-Ala-Val-Phe-Thr-Asp-Asn-Tyr-Thr-Arg-Leu-Arg-Lys-Gln-Met-Ala-Val-Lys-Lys-Tyr-Leu-Asn-Ser-Ile-Leu-Asn" },
      { label: "Synonyms", value: "Vasoactive Intestinal Peptide, VIP-28, Aviptadil" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and dilute acetic acid" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Purity", value: "≥97% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; protect from light; reconstituted solution stable at 2-8°C for up to 7 days" },
    ],
    researchSummary:
      "Vasoactive Intestinal Peptide (VIP) is a 28-amino acid neuropeptide originally isolated from porcine duodenum by Said and Mutt in 1970. It belongs to the glucagon-secretin superfamily and signals primarily through two G-protein coupled receptors, VPAC1 and VPAC2, which are widely distributed throughout the central and peripheral nervous systems, immune tissues, and the gastrointestinal tract. VIP functions as a neurotransmitter, neuromodulator, and immunoregulatory factor with diverse physiological roles including vasodilation, smooth muscle relaxation, and circadian-rhythm regulation.\n\nIn immunological research, VIP has been extensively studied for its inflammatory-marker modulation and immunomodulatory profile in preclinical studies. It has been shown to inhibit the production of pro-inflammatory cytokine markers (TNF-α, IL-6, IL-12) by macrophages and dendritic cells while promoting the generation of regulatory T cells in research models. VIP also modulates Th1/Th2 balance by shifting immune responses toward a Th2 phenotype in preclinical systems. These properties have generated research interest in autoimmune and inflammatory research models.\n\nVIP's neuroprotective assay model activity has been investigated in models of neurodegeneration, stroke, and traumatic brain injury research models. The peptide promotes neuronal survival in preclinical systems through VPAC receptor-mediated activation of cAMP/PKA and PI3K/Akt signaling pathways. In the gastrointestinal system, VIP regulates motility, secretion, and blood-flow markers in research models, and has been studied in gastrointestinal preclinical models of inflammatory bowel disease and functional gastrointestinal disorders.",
    areasOfStudy: [
      { title: "Vasodilation & Cardiovascular Function", description: "Potent vasodilator acting through VPAC receptors on vascular smooth muscle, with research applications in pulmonary hypertension models." },
      { title: "Neuroprotective Assay Models", description: "Investigated for promotion of neuronal survival in preclinical systems via cAMP/PKA and PI3K/Akt signaling in models of neurodegeneration and ischemic injury." },
      { title: "Immune Regulation", description: "Studied for suppression of pro-inflammatory cytokines and promotion of regulatory T-cell differentiation in autoimmune research models." },
      { title: "Gastrointestinal Function", description: "Regulates GI motility, secretion, and mucosal blood flow; investigated in inflammatory bowel disease models." },
      { title: "Circadian Rhythm Research", description: "Key signaling peptide in the suprachiasmatic nucleus involved in synchronization of circadian clock neurons." },
    ],
    references: [
      { id: 1, text: "Said SI, Mutt V. (1970). Polypeptide with broad biological activity: isolation from small intestine. Science, 169(3951), 1217-1218." },
      { id: 2, text: "Delgado M, Pozo D, Ganea D. (2004). The significance of vasoactive intestinal peptide in immunomodulation. Pharmacological Reviews, 56(2), 249-290." },
      { id: 3, text: "Gonzalez-Rey E, Fernandez-Martin A, Chorny A, Delgado M. (2006). Vasoactive intestinal peptide induces CD4+,CD25+ T regulatory cells with therapeutic effect in collagen-induced arthritis. Arthritis & Rheumatism, 54(3), 864-876." },
      { id: 4, text: "Brenneman DE. (2007). Neuroprotection: a comparative view of vasoactive intestinal peptide and pituitary adenylate cyclase-activating polypeptide. Peptides, 28(9), 1720-1726." },
      { id: 5, text: "Abad C, Martinez C, Juarranz MG, et al. (2003). Therapeutic effects of vasoactive intestinal peptide in the trinitrobenzene sulfonic acid mice model of Crohn's disease. Gastroenterology, 124(4), 961-971." },
    ],
  },

  // ─── Thymalin ────────────────────────────────────────
  "thymalin": {
    characteristics: [
      { label: "Molecular Formula", value: "Polypeptide complex (heterogeneous mixture)" },
      { label: "CAS Number", value: "63958-90-7" },
      { label: "Molar Mass", value: "~3108.50 g/mol" },
      { label: "Amino Acid Sequence", value: "32-amino acid thymic polypeptide" },
      { label: "Synonyms", value: "Thymalin, Thymus extract peptide, Thymic factor" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and physiological saline" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Purity", value: "≥95% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 7 days" },
    ],
    researchSummary:
      "Thymalin is a polypeptide complex originally isolated from the thymus gland, developed by Khavinson and colleagues at the Saint Petersburg Institute of Bioregulation and Gerontology. It belongs to a class of bioregulatory peptides that have been studied extensively in Russian biogerontology research for their effects on immune system restoration and aging. Thymalin is composed of a mixture of short peptides derived from thymic tissue and has been investigated for its ability to restore thymic function and modulate immune competence in aging and immunodeficiency models.\n\nResearch has demonstrated that Thymalin influences T-cell maturation and differentiation markers in preclinical cell-culture systems. Studies in aged animal research models have shown shifts in thymic-architecture readouts and immune-cell research markers, including CD4/CD8 ratio profiles and natural-killer-cell activity panels. The peptide has also been investigated for its effects on neuroendocrine regulation, with studies suggesting modulation of melatonin production and circadian cortisol patterns.\n\nLong-term observational studies conducted by Khavinson and colleagues have examined Thymalin's effects in elderly cohorts, reporting improvements in immune markers, cardiovascular parameters, and mortality indices over follow-up periods of up to 12 years. These studies, while primarily conducted within Russian research frameworks, have contributed to the growing field of bioregulatory peptide research in gerontology.",
    areasOfStudy: [
      { title: "Immune Regulation", description: "Investigated for restoration of thymic function and normalization of T-cell subpopulations in aging and immunodeficiency models." },
      { title: "T-Cell Maturation", description: "Promotes differentiation and functional development of T-lymphocytes through thymic microenvironment support." },
      { title: "Neuroendocrine Function", description: "Studied for modulation of melatonin secretion and cortisol circadian patterns, suggesting thymic-pineal axis interactions." },
      { title: "Aging Research", description: "Preclinical studies in aged animal models have examined effects on immune markers, cardiovascular parameters, and longevity indices." },
    ],
    references: [
      { id: 1, text: "Khavinson VK. (2002). Peptides and aging. Neuroendocrinology Letters, 23(Suppl 3), 11-144." },
      { id: 2, text: "Khavinson VK. (2002). Peptides and Ageing. Neuroendocrinology Letters, 23(Suppl 3), 11-144." },
      { id: 3, text: "Kuznik BI, Pateyuk AV, Baranchugova LM, Rusaeva NS. (2013). Thymalin and its role in immunomodulation. Advances in Gerontology, 3(4), 301-305." },
      { id: 4, text: "Khavinson VK, Kuznik BI, Ryzhak GA. (2014). Peptide bioregulators: a new class of geroprotectors. Message 1: results of experimental studies. Advances in Gerontology, 4(4), 225-233." },
    ],
  },

  // ─── Thymosin Alpha-1 ───────────────────────────────
  "thymosin-alpha-1": {
    characteristics: [
      { label: "Molecular Formula", value: "C₁₂₉H₂₁₅N₃₃O₅₅" },
      { label: "CAS Number", value: "62304-98-7" },
      { label: "Molar Mass", value: "3108.27 g/mol" },
      { label: "Amino Acid Sequence", value: "Ac-Ser-Asp-Ala-Ala-Val-Asp-Thr-Ser-Ser-Glu-Ile-Thr-Thr-Lys-Asp-Leu-Lys-Glu-Lys-Lys-Glu-Val-Val-Glu-Glu-Ala-Glu-Asn" },
      { label: "Synonyms", value: "Thymosin α1, Tα1, Thymalfasin, Zadaxin" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and physiological saline" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Purity", value: "≥98% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 10 days" },
    ],
    researchSummary:
      "Thymosin Alpha-1 (Tα1) is a 28-amino acid peptide originally isolated from thymic tissue by Goldstein and colleagues in the 1970s. It is an N-terminally acetylated, naturally occurring thymic peptide that plays a central role in immune-system maturation and regulation in research models. Tα1 has been characterized under the trade name Zadaxin as an immunomodulatory research reference compound, with historical investigation in chronic hepatitis B research models and as an adjunct in cancer immunotherapy research.\n\nThe immunomodulatory mechanism of Tα1 involves activation of Toll-like receptors (TLR2 and TLR9) on dendritic cells, leading to enhanced antigen presentation, T-cell priming, and maturation of functional T-helper and cytotoxic T-cell populations in preclinical systems. Research has demonstrated that Tα1 promotes the differentiation of CD4+ and CD8+ T-cells, enhances natural killer cell cytotoxicity markers, and increases the production of interferon-alpha and interferon-gamma in cell-culture models. The peptide also modulates inflammatory-marker responses by balancing pro- and anti-inflammatory cytokine markers in preclinical studies.\n\nExtensive preclinical research has examined Tα1 in the context of viral-infection research models, including hepatitis B, hepatitis C, and HIV preclinical models. Studies have also investigated its use as an immune adjuvant in combination with cancer-vaccine and chemotherapy research protocols in preclinical settings. More recent research has explored its role in immune-reconstitution markers following hematopoietic stem-cell transplantation models and in modulating immune responses in immunocompromised research models.",
    areasOfStudy: [
      { title: "Immune Modulation", description: "Activates dendritic cells via TLR2/TLR9 signaling, enhancing antigen presentation and T-cell priming for robust adaptive immune responses." },
      { title: "T-Cell Activation", description: "Promotes differentiation and functional maturation of CD4+ and CD8+ T-lymphocytes and enhances natural killer cell cytotoxicity." },
      { title: "Viral Research", description: "Extensively studied in hepatitis B/C models with clinical approval in multiple countries for chronic hepatitis B treatment." },
      { title: "Dendritic Cell Function", description: "Enhances dendritic cell maturation and antigen-presenting capacity through Toll-like receptor activation pathways." },
      { title: "Cancer Immunotherapy Adjunct", description: "Investigated as an immune adjuvant in combination with vaccines and chemotherapy to enhance anti-tumor immune responses." },
    ],
    references: [
      { id: 1, text: "Goldstein AL, Goldstein AL. (2009). From lab to bedside: emerging clinical applications of thymosin α1. Expert Opinion on Biological Therapy, 9(5), 593-608." },
      { id: 2, text: "Romani L, Bistoni F, Montagnoli C, et al. (2007). Thymosin α1: an endogenous regulator of inflammation, immunity, and tolerance. Annals of the New York Academy of Sciences, 1112, 326-338." },
      { id: 3, text: "Garaci E, Pica F, Rasi G, Favalli C. (2000). Thymosin α1 in the treatment of cancer: from basic research to clinical application. International Journal of Immunopharmacology, 22(12), 1067-1076." },
      { id: 4, text: "Tuthill C, Rios I, McBeath R. (2010). Thymalfasin: clinical experience and future directions. Annals of the New York Academy of Sciences, 1194, 130-135." },
      { id: 5, text: "Matteucci C, Grelli S, De Smaele E, et al. (2017). Thymosin alpha 1 and HIV-1: recent advances and future perspectives. Future Microbiology, 12(2), 141-155." },
    ],
  },

  // ─── DSIP ────────────────────────────────────────────
  "dsip": {
    characteristics: [
      { label: "Molecular Formula", value: "C₃₅H₄₈N₁₀O₁₅" },
      { label: "CAS Number", value: "62568-57-4" },
      { label: "Molar Mass", value: "848.82 g/mol" },
      { label: "Amino Acid Sequence", value: "Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu" },
      { label: "Synonyms", value: "Delta Sleep-Inducing Peptide, DSIP, Emideltide" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and dilute acetic acid" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Purity", value: "≥98% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 7 days" },
    ],
    researchSummary:
      "Delta Sleep-Inducing Peptide (DSIP) is a naturally occurring nonapeptide first isolated from the cerebral venous blood of rabbits during electrically induced sleep by Schoenenberger and Monnier in 1977. The peptide consists of nine amino acids (Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu) and has been identified in various brain regions as well as peripheral tissues. DSIP is notable for its amphiphilic properties, which allow it to cross the blood-brain barrier, and for its remarkably diverse range of reported biological activities extending well beyond sleep modulation.\n\nResearch into DSIP's effects on slow-wave EEG markers has produced mixed but intriguing results. Some studies have demonstrated increases in delta (slow-wave) sleep in animal research models and research systems, while others have reported more nuanced effects on sleep-wake cycling and circadian phase adjustment in preclinical models. Beyond sleep, DSIP has been investigated for its role in stress-response modulation, with studies showing attenuation of stress-induced metabolic and endocrine markers in preclinical models. The peptide appears to modulate hypothalamic-pituitary-adrenal (HPA) axis activity and has been reported to normalize cortisol and ACTH markers under stress conditions in research models.\n\nAdditional research has explored DSIP's effects on pain-perception research readouts, with some studies suggesting analgesic-assay activity mediated through opioid receptor interactions. The peptide has also been investigated for its antioxidant-assay activity and its modulation of free-radical metabolism markers, which has generated interest in neuroprotective assay model research.",
    areasOfStudy: [
      { title: "Sleep Regulation", description: "Originally isolated as a sleep-promoting factor; investigated for modulation of delta-wave (slow-wave) EEG markers in preclinical models." },
      { title: "Circadian Rhythm Modulation", description: "Studied for effects on circadian phase adjustment and normalization of disrupted sleep-wake cycles." },
      { title: "Stress Response", description: "Research demonstrates attenuation of stress-induced metabolic and endocrine disturbances through HPA axis modulation." },
      { title: "Neuroendocrine Regulation", description: "Investigated for normalization of cortisol, ACTH, and other neuroendocrine markers under physiological and pathological stress conditions." },
    ],
    references: [
      { id: 1, text: "Schoenenberger GA, Monnier M. (1977). Characterization of a delta-electroencephalogram (sleep)-inducing peptide. Proceedings of the National Academy of Sciences, 74(3), 1282-1286." },
      { id: 2, text: "Graf MV, Kastin AJ. (1984). Delta-sleep-inducing peptide (DSIP): a review. Neuroscience & Biobehavioral Reviews, 8(1), 83-93." },
      { id: 3, text: "Prudchenko IA, Stashevskaya LV, Mikhaleva II, Ivanov VT. (1994). Delta sleep-inducing peptide: structural analogues and immunoreactive analogues. Bioorganic Chemistry, 20(10-11), 1046-1058." },
      { id: 4, text: "Kovalzon VM, Strekalova TV. (2006). Delta sleep-inducing peptide (DSIP): a still unresolved riddle. Journal of Neurochemistry, 97(2), 303-309." },
    ],
  },

  // ─── Selank ──────────────────────────────────────────
  "selank": {
    characteristics: [
      { label: "Molecular Formula", value: "C₃₃H₅₇N₁₁O₉" },
      { label: "CAS Number", value: "129954-34-3" },
      { label: "Molar Mass", value: "751.87 g/mol" },
      { label: "Amino Acid Sequence", value: "Thr-Lys-Pro-Arg-Pro-Gly-Pro" },
      { label: "Synonyms", value: "Selank, TP-7, Selanc" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and physiological saline" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Purity", value: "≥98% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 10 days" },
    ],
    researchSummary:
      "Selank is a synthetic heptapeptide developed at the Institute of Molecular Genetics of the Russian Academy of Sciences. It is a structural analog of tuftsin (Thr-Lys-Pro-Arg), a naturally occurring immunostimulatory tetrapeptide, with an added Pro-Gly-Pro sequence that enhances metabolic stability and extends the peptide's biological half-life. Selank has been the subject of extensive preclinical research for its effects on anxiety-behavior research models, cognitive-function research markers, and immune-modulation markers.\n\nThe anxiolytic-assay mechanism of Selank is believed to involve modulation of GABAergic neurotransmission and influence on brain-derived neurotrophic factor (BDNF) expression. Research has demonstrated that Selank increases BDNF mRNA expression in the hippocampus and affects the balance of enkephalin and monoamine neurotransmitter systems. Unlike classical benzodiazepine anxiolytics, Selank does not appear to produce sedation, amnesia, or dependence in preclinical models, suggesting a distinct pharmacological profile.\n\nBeyond its neurotropic effects, Selank retains immunomodulatory properties derived from its tuftsin backbone. Studies have shown that it can enhance the functional activity of phagocytes, modulate cytokine-marker expression, and influence the innate-immune response in preclinical systems. This dual action on both the nervous and immune systems has generated research interest in preclinical models where neuroinflammation markers and immune dysregulation intersect.",
    areasOfStudy: [
      { title: "Anxiolytic Research", description: "Investigated as a non-sedating anxiolytic with a mechanism distinct from benzodiazepines, lacking sedation, amnesia, and dependence in preclinical models." },
      { title: "Nootropic & Cognitive Enhancement", description: "Studied for effects on learning, memory consolidation, and attention through modulation of monoamine and enkephalin systems." },
      { title: "Immunomodulatory Activity", description: "Retains tuftsin-derived immunostimulatory properties including enhancement of phagocyte activity and cytokine modulation." },
      { title: "GABAergic Neurotransmission", description: "Research indicates modulation of GABA receptor signaling contributing to anxiolytic effects without typical benzodiazepine side effects." },
      { title: "BDNF Expression", description: "Demonstrated upregulation of brain-derived neurotrophic factor mRNA in hippocampal regions relevant to mood and cognition." },
    ],
    references: [
      { id: 1, text: "Kozlovskii II, Danchev ND, Seredenin SB. (2003). Psychopharmacological profile of selank and its analogs. Bulletin of Experimental Biology and Medicine, 136(1), 53-55." },
      { id: 2, text: "Seredenin SB, Kozlovskaya MM, Blednov YA, et al. (1998). Anxiolytic action of the synthetic peptide selank. Bulletin of Experimental Biology and Medicine, 125(5), 456-459." },
      { id: 3, text: "Zozulya AA, Gabaeva MV, Sokolov OY, et al. (2001). Personality, coping style, and humoral immune response following selank administration. Regulatory Peptides, 101(1-3), 125-131." },
      { id: 4, text: "Kozlovskii II, Danchev ND. (2003). The optimizing action of the synthetic peptide selank on a conditioned active avoidance reflex in rats. Neuroscience and Behavioral Physiology, 33(7), 639-643." },
    ],
  },

  // ─── Semax ───────────────────────────────────────────
  "semax": {
    characteristics: [
      { label: "Molecular Formula", value: "C₃₇H₅₁N₉O₁₀S" },
      { label: "CAS Number", value: "80714-61-0" },
      { label: "Molar Mass", value: "813.93 g/mol" },
      { label: "Amino Acid Sequence", value: "Met-Glu-His-Phe-Pro-Gly-Pro" },
      { label: "Synonyms", value: "Semax, ACTH (4-10) analog, Heptapeptide Semax" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and physiological saline" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Purity", value: "≥98% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; protect from light; reconstituted solution stable at 2-8°C for up to 7 days" },
    ],
    researchSummary:
      "Semax is a synthetic heptapeptide analog of the ACTH (4-10) fragment (Met-Glu-His-Phe-Pro-Gly-Pro), developed at the Institute of Molecular Genetics of the Russian Academy of Sciences. Unlike the parent ACTH molecule, Semax lacks hormonal (steroidogenic) activity while retaining and enhancing the neurotropic effects associated with the ACTH (4-10) sequence in preclinical models. The addition of the Pro-Gly-Pro C-terminal tripeptide confers resistance to enzymatic degradation and extends the peptide's biological activity in research models.\n\nPreclinical research has characterized Semax's activity in cognitive-research preclinical models in animals, including learning, memory, and attention research markers. A key mechanism involves the upregulation of brain-derived neurotrophic factor (BDNF) and nerve growth factor (NGF) expression in preclinical brain tissue, particularly in the hippocampus and prefrontal cortex. Studies have also shown that Semax modulates dopaminergic, serotonergic, and cholinergic neurotransmitter systems in preclinical systems.\n\nSignificant research has investigated Semax in neuroprotective assay models of ischemic stroke. Studies have demonstrated infarct-volume parameter modulation, improvements in neurological research readouts, and modulation of gene-expression patterns related to inflammatory and apoptotic markers following cerebral ischemia in research models. The peptide's ability to cross the blood-brain barrier via intranasal administration has facilitated preclinical research applications.",
    areasOfStudy: [
      { title: "Neuroprotective Assay Models", description: "Demonstrated infarct-volume parameter modulation and neurological readouts in ischemic stroke research models through anti-apoptotic and inflammatory-marker modulation mechanisms." },
      { title: "Cognitive Enhancement", description: "Investigated for improvements in learning, memory consolidation, and attention through modulation of multiple neurotransmitter systems." },
      { title: "BDNF Expression", description: "Research shows upregulation of brain-derived neurotrophic factor and nerve growth factor in hippocampal and cortical regions." },
      { title: "Stroke Research Models", description: "Extensively studied in cerebral ischemia research models with reported neuroprotective assay model activity and modulation of post-ischemic gene expression." },
      { title: "Neurotransmitter Modulation", description: "Influences dopaminergic, serotonergic, and cholinergic pathways without the steroidogenic activity of the parent ACTH molecule." },
    ],
    references: [
      { id: 1, text: "Ashmarin IP, Nezavibatko VN, Levitskaya NG, et al. (1997). Design and investigation of an ACTH 4-10 analogue lacking D-amino acids and possessing nootropic properties. Neuroscience Research Communications, 21(2), 105-112." },
      { id: 2, text: "Dolotov OV, Karpenko EA, Inozemtseva LS, et al. (2006). Semax, an analog of ACTH(4-10) with cognitive effects, regulates BDNF and trkB expression in the rat hippocampus. Brain Research, 1117(1), 54-60." },
      { id: 3, text: "Gusev EI, Skvortsova VI, Dambinova SA, et al. (1997). Neuroprotective effects of semax in acute cerebral ischaemia. Zhurnal Nevrologii i Psikhiatrii Imeni S.S. Korsakova, 97(6), 26-34." },
      { id: 4, text: "Filippenkov IB, Stavchansky VV, Denisova AE, et al. (2020). Novel insights into the protective properties of ACTH(4-7)PGP (Semax) peptide at the transcriptome level following cerebral ischaemia-reperfusion in rats. Genes, 11(6), 681." },
    ],
  },

  // ─── Oxytocin ────────────────────────────────────────
  "oxytocin": {
    characteristics: [
      { label: "Molecular Formula", value: "C₄₃H₆₆N₁₂O₁₂S₂" },
      { label: "CAS Number", value: "50-56-6" },
      { label: "Molar Mass", value: "1007.19 g/mol" },
      { label: "Amino Acid Sequence", value: "Cys-Tyr-Ile-Gln-Asn-Cys-Pro-Leu-Gly-NH₂ (disulfide bond Cys1-Cys6)" },
      { label: "Synonyms", value: "Oxytocin, Pitocin, OXT, Syntocinon" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and dilute acetic acid" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Purity", value: "≥98% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 7 days" },
    ],
    researchSummary:
      "Oxytocin is a 9-amino acid cyclic neuropeptide supplied as a lyophilized reference standard for in-vitro receptor-binding assays, structural studies, and analytical method validation. The disulfide-bridged nonapeptide (Cys-Tyr-Ile-Gln-Asn-Cys-Pro-Leu-Gly-NH₂) was the first peptide hormone chemically synthesized (du Vigneaud, 1953) and is a foundational reference compound in peptide chemistry. Not for use in any living organism.\n\nLaboratory workflows profile oxytocin in oxytocin-receptor (OXTR) binding assays on recombinant OXTR expression systems, with standard readouts including competitive radio-ligand binding, IP1 accumulation, and calcium-flux panels. The compound is routinely used as an identity and purity reference in HPLC and LC-MS method development.\n\nResearchers apply oxytocin as an analytical reference standard for structural characterization (NMR, mass spectrometry, circular dichroism of the disulfide bridge), for receptor-selectivity profiling against vasopressin V1a/V1b/V2 receptor panels, and as a historical synthesis reference in peptide-chemistry teaching and method-validation laboratories.",
    areasOfStudy: [
      { title: "In-Vitro Receptor-Binding Assays", description: "Used as a reference OXTR ligand in competitive binding and functional (IP1, calcium-flux) assays on recombinant receptor systems." },
      { title: "Structural Studies", description: "Characterized by NMR, mass spectrometry, and circular dichroism to profile the disulfide bridge and cyclic secondary structure." },
      { title: "Analytical Method Validation", description: "Serves as an identity and purity reference standard in HPLC and LC-MS method development and validation workflows." },
      { title: "Receptor Selectivity Profiling", description: "Applied in multi-receptor panels to profile OXTR selectivity against vasopressin V1a/V1b/V2 receptor families." },
      { title: "Peptide-Chemistry Reference", description: "Historical synthesis reference standard used in peptide-chemistry method development and teaching laboratories." },
    ],
    references: [
      { id: 1, text: "Lee HJ, Macbeth AH, Pagani JH, Young WS 3rd. (2009). Oxytocin: the great facilitator of life. Progress in Neurobiology, 88(2), 127-151." },
      { id: 2, text: "Gimpl G, Fahrenholz F. (2001). The oxytocin receptor system: structure, function, and regulation. Physiological Reviews, 81(2), 629-683." },
      { id: 3, text: "Meyer-Lindenberg A, Domes G, Kirsch P, Heinrichs M. (2011). Oxytocin and vasopressin in the human brain: social neuropeptides for translational medicine. Nature Reviews Neuroscience, 12(9), 524-538." },
      { id: 4, text: "Guastella AJ, Einfeld SL, Gray KM, et al. (2010). Intranasal oxytocin improves emotion recognition for youth with autism spectrum disorders. Biological Psychiatry, 67(7), 692-694." },
      { id: 5, text: "Du Vigneaud V, Ressler C, Trippett S. (1953). The sequence of amino acids in oxytocin, with a proposal for the structure of oxytocin. Journal of Biological Chemistry, 205(2), 949-957." },
    ],
  },

  // ─── MOTS-c ──────────────────────────────────────────
  "mots-c": {
    characteristics: [
      { label: "Molecular Formula", value: "C₁₀₁H₁₅₂N₂₈O₂₂S₂" },
      { label: "CAS Number", value: "1627580-64-6" },
      { label: "Molar Mass", value: "2174.60 g/mol" },
      { label: "Amino Acid Sequence", value: "Met-Arg-Trp-Gln-Glu-Met-Gly-Tyr-Ile-Phe-Tyr-Pro-Arg-Lys-Leu-Arg (16 amino acids)" },
      { label: "Synonyms", value: "MOTS-c, Mitochondrial ORF of the 12S rRNA type-c" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and DMSO" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Purity", value: "≥98% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 7 days" },
    ],
    researchSummary:
      "MOTS-c (Mitochondrial Open Reading Frame of the 12S rRNA type-c) is a 16-amino acid peptide encoded by the mitochondrial genome, discovered by Lee and colleagues at the University of Southern California in 2015. It was the first mitochondrial-derived peptide shown to have systemic metabolic effects, representing a paradigm shift in understanding mitochondrial signaling. MOTS-c is encoded within the 12S rRNA gene of mitochondrial DNA and is one of several mitochondrial-derived peptides (MDPs) that function as retrograde signals from mitochondria to the nucleus and other cellular compartments.\n\nThe primary in-vitro effects of MOTS-c involve activation of the AMPK (5' adenosine monophosphate-activated protein kinase) signaling pathway, a master regulator of cellular energy homeostasis. Research has characterized MOTS-c for glucose-uptake and fatty-acid-oxidation assay markers in rodent cell-culture models of metabolic-parameter research. The peptide has been described as an \"exercise mimetic\" due to its ability to activate metabolic pathways that are typically stimulated by physical exercise, including AMPK-dependent and folate-methionine cycle pathways.\n\nMore recent research has revealed that MOTS-c translocates to the nucleus under conditions of metabolic stress, where it regulates gene expression through interaction with antioxidant response elements (AREs). Studies have also identified correlations between circulating MOTS-c levels and physical fitness, aging, and metabolic disease states, suggesting a role as a mitochondrial-encoded hormone (mitokine) that communicates cellular metabolic status to systemic physiology.",
    areasOfStudy: [
      { title: "Mitochondrial Function", description: "First mitochondrial-derived peptide shown to have systemic effects; represents retrograde mitochondrial-to-nuclear signaling." },
      { title: "Metabolic Regulation", description: "Characterized in preclinical cell-culture models for glucose-uptake and fatty-acid-oxidation assay markers through AMPK pathway activation." },
      { title: "Exercise Mimetic Research", description: "Activates metabolic pathways typically stimulated by physical exercise, including AMPK-dependent energy homeostasis mechanisms." },
      { title: "AMPK Signaling", description: "Central mechanism involves activation of 5' AMP-activated protein kinase, a master regulator of cellular energy balance." },
      { title: "Aging & Mitokine Biology", description: "Circulating levels correlate with age and metabolic health, suggesting a role as a mitochondrial-encoded hormonal signal." },
    ],
    references: [
      { id: 1, text: "Lee C, Zeng J, Drew BG, et al. (2015). The mitochondrial-derived peptide MOTS-c promotes metabolic homeostasis and reduces obesity and insulin resistance. Cell Metabolism, 21(3), 443-454." },
      { id: 2, text: "Kim SJ, Xiao J, Wan J, et al. (2017). Mitochondrial-derived peptides as novel regulators of metabolism. Journal of Physiology, 595(21), 6613-6621." },
      { id: 3, text: "Reynolds JC, Lai RW, Woodhead JST, et al. (2021). MOTS-c is an exercise-induced mitochondrial-encoded regulator of age-dependent physical decline and muscle homeostasis. Nature Communications, 12(1), 470." },
      { id: 4, text: "Kim KH, Son JM, Benayoun BA, Lee C. (2018). The mitochondrial-encoded peptide MOTS-c translocates to the nucleus to regulate nuclear gene expression in response to metabolic stress. Cell Metabolism, 28(3), 516-524." },
    ],
  },

  // ─── PTD-DBM ─────────────────────────────────────────
  "ptd-dbm": {
    characteristics: [
      { label: "Molecular Formula", value: "C₁₂₄H₂₂₅N₆₁O₂₈S₂" },
      { label: "CAS Number", value: "1609454-11-6" },
      { label: "Molar Mass", value: "3082.62 g/mol" },
      { label: "Amino Acid Sequence", value: "Cell-penetrating peptide conjugated to Dishevelled-binding motif" },
      { label: "Synonyms", value: "PTD-DBM, Protein Transduction Domain-Dishevelled Binding Motif peptide" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and DMSO" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Purity", value: "≥95% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 7 days" },
    ],
    researchSummary:
      "PTD-DBM is a cell-penetrating peptide construct designed to activate the Wnt/beta-catenin signaling pathway by disrupting the interaction between CXXC5 and Dishevelled (Dvl) proteins. The peptide consists of a protein transduction domain (PTD) fused to a Dishevelled-binding motif (DBM) derived from the CXXC5 protein. CXXC5 normally functions as a negative feedback regulator of the Wnt pathway by binding to Dvl and preventing downstream beta-catenin signaling. PTD-DBM competitively inhibits this interaction, thereby releasing the brake on Wnt signaling in preclinical systems.\n\nResearch published by Kim and colleagues at Yonsei University demonstrated PTD-DBM activity in hair-follicle neogenesis research models in mice. Topical application of PTD-DBM in research models activated Wnt/beta-catenin signaling in hair-follicle dermal papilla cells, leading to new hair-follicle formation markers and increased hair-growth readouts. The peptide was shown to stimulate the proliferation and migration of dermal papilla cells in cell-culture models and to promote the transition of hair follicles from the telogen (resting) phase to the anagen (growth) phase in research models.\n\nThe Wnt/beta-catenin pathway plays critical roles in hair-follicle development, stem-cell maintenance, and in-vitro wound-assay research. PTD-DBM's mechanism of activating this pathway through disruption of the CXXC5-Dvl protein-protein interaction represents a targeted approach to pathway modulation. Additional research has explored the peptide's activity in bone-formation and in-vitro wound-assay research models where Wnt signaling is involved in tissue-regeneration research models.",
    areasOfStudy: [
      { title: "Wnt/Beta-Catenin Pathway", description: "Activates canonical Wnt signaling by competitively disrupting the CXXC5-Dishevelled protein interaction that normally suppresses beta-catenin signaling." },
      { title: "Hair Follicle Neogenesis", description: "Preclinical studies demonstrate promotion of new hair follicle formation and acceleration of anagen phase entry in mouse models." },
      { title: "Dermal Papilla Cell Biology", description: "Stimulates proliferation and migration of dermal papilla cells, key inductive mesenchymal cells in hair follicle development." },
      { title: "Cell Penetration Technology", description: "Utilizes protein transduction domain technology to deliver the functional DBM peptide across cell membranes without traditional transfection methods." },
    ],
    references: [
      { id: 1, text: "Kim HY, Yoon JY, Yun JH, et al. (2017). CXXC5 is a negative-feedback regulator of the Wnt/beta-catenin pathway involved in osteoblast differentiation. Cell Death & Differentiation, 22(6), 912-920." },
      { id: 2, text: "Lee SH, Seo SH, Lee DH, et al. (2017). Targeting the Wnt/beta-catenin pathway with PTD-DBM promotes hair growth. Scientific Reports, 7(1), 12421." },
      { id: 3, text: "Andersson ER, Sandberg R, Lendahl U. (2011). Notch signaling: simplicity in design, versatility in function. Development, 138(17), 3593-3612." },
      { id: 4, text: "Choi S, Yoon JY, Kim HY, et al. (2017). A peptide that disrupts CXXC5-Dvl interaction activates Wnt signaling and promotes bone formation. Journal of Bone and Mineral Research, 32(Suppl 1), S235." },
    ],
  },

  // ─── FOXO4-DRI ───────────────────────────────────────
  "foxo4-dri": {
    characteristics: [
      { label: "Molecular Formula", value: "C₂₂₈H₃₈₈N₈₆O₆₄" },
      { label: "Molar Mass", value: "5358.00 g/mol" },
      { label: "Amino Acid Sequence", value: "D-retro-inverso peptide derived from FOXO4-p53 interaction domain" },
      { label: "Synonyms", value: "FOXO4-DRI, FOXO4 D-Retro-Inverso peptide, ES2" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in DMSO; partially soluble in water at low concentrations" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Composition", value: "D-amino acid retro-inverso peptide targeting FOXO4-p53 interaction" },
      { label: "Purity", value: "≥95% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 5 days" },
    ],
    researchSummary:
      "FOXO4-DRI is a D-retro-inverso peptide designed to selectively induce apoptosis in senescent cells by disrupting the interaction between the FOXO4 transcription factor and the p53 tumor suppressor protein. Developed by Baar and colleagues at Erasmus University Medical Center, the peptide was reported in a 2017 Cell publication as a targeted senolytic agent capable of eliminating senescent cells while sparing healthy, non-senescent cells. The D-retro-inverso design uses D-amino acids in a reversed sequence to maintain side-chain topology while conferring resistance to proteolytic degradation.\n\nIn senescent cells, FOXO4 binds to and sequesters p53 in the nucleus, preventing p53 from executing its apoptotic program. This FOXO4-p53 interaction is critical for the survival of senescent cells but is not required in healthy cells. FOXO4-DRI competitively disrupts this interaction by binding to p53, thereby releasing it to trigger apoptosis specifically in senescent cells. This mechanism provides selectivity that distinguishes FOXO4-DRI from non-selective cytotoxic agents.\n\nPreclinical studies in naturally aged and chemotherapy-treated mice demonstrated that FOXO4-DRI treatment reduced markers of cellular senescence, restored fitness and fur density, and improved renal function. The study showed that targeted clearance of senescent cells could counteract multiple aspects of age-related deterioration. This work has contributed significantly to the growing field of senolytic research, which aims to develop interventions that selectively eliminate senescent cells to ameliorate age-related pathology.",
    areasOfStudy: [
      { title: "Cellular Senescence", description: "Designed to selectively target and eliminate senescent cells by disrupting the FOXO4-p53 survival mechanism unique to the senescent state." },
      { title: "Aging Research", description: "Preclinical studies in aged mice demonstrated restoration of fitness, fur density, and organ function following senescent cell clearance." },
      { title: "p53 Pathway", description: "Mechanism involves competitive disruption of FOXO4-p53 nuclear interaction, releasing p53 to execute apoptosis selectively in senescent cells." },
      { title: "Senolytic Research", description: "Represents a targeted peptide-based approach to senolysis, distinct from small-molecule senolytics like dasatinib and quercetin." },
      { title: "D-Retro-Inverso Peptide Design", description: "Utilizes D-amino acids in reversed sequence to maintain biological activity while resisting proteolytic degradation in vivo." },
    ],
    references: [
      { id: 1, text: "Baar MP, Brandt RMC, Putavet DA, et al. (2017). Targeted apoptosis of senescent cells restores tissue homeostasis in response to chemotoxicity and aging. Cell, 169(1), 132-147." },
      { id: 2, text: "de Keizer PLJ. (2017). The fountain of youth by targeting senescent cells? Trends in Molecular Medicine, 23(1), 6-17." },
      { id: 3, text: "Baker DJ, Childs BG, Durik M, et al. (2016). Naturally occurring p16Ink4a-positive cells shorten healthy lifespan. Nature, 530(7589), 184-189." },
      { id: 4, text: "Zhu Y, Tchkonia T, Pirtskhalava T, et al. (2015). The Achilles' heel of senescent cells: from transcriptome to senolytic drugs. Aging Cell, 14(4), 644-658." },
    ],
  },

  // ─── Cagrilintide ────────────────────────────────────
  "cagrilintide": {
    characteristics: [
      { label: "Molecular Formula", value: "C₁₉₄H₃₁₂N₅₄O₅₉S₂" },
      { label: "CAS Number", value: "1415456-99-3" },
      { label: "Molar Mass", value: "4409.00 g/mol" },
      { label: "Amino Acid Sequence", value: "Long-acting acylated amylin analog (37 amino acids with C18 fatty diacid modification)" },
      { label: "Synonyms", value: "Cagrilintide, AM833, NN9838" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water at slightly acidic pH" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Purity", value: "≥97% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 7 days" },
    ],
    researchSummary:
      "Cagrilintide is a long-acting, acylated analog of human amylin (islet amyloid polypeptide, IAPP) developed by Novo Nordisk for metabolic research applications. Native amylin is a 37-amino acid peptide co-secreted with insulin from pancreatic beta cells that acts as a satiety signal, slows gastric emptying, and suppresses postprandial glucagon secretion. Cagrilintide incorporates amino acid substitutions and a C18 fatty diacid side chain that extends its pharmacokinetic half-life in preclinical models, overcoming the rapid degradation that limits the preclinical utility of native amylin.\n\nPreclinical research studies have characterized that cagrilintide produces dose-dependent body-composition parameter shifts in preclinical metabolic-parameter studies in rodent models. The peptide exerts its effects through activation of amylin receptors (AMY1, AMY2, AMY3), which are heterodimers of the calcitonin receptor with receptor activity-modifying proteins (RAMPs). Activation of these receptors in the area postrema and nucleus tractus solitarius of the brainstem reduces food-intake markers through central satiety signaling in preclinical models. Cagrilintide has also been investigated in combination with semaglutide (a GLP-1 receptor agonist) under the combination name CagriSema, which has shown additive body-composition parameter effects in research models.\n\nPreclinical research has characterized cagrilintide's pharmacological profile across multiple amylin and calcitonin receptor subtypes. The molecule demonstrates potent agonism at amylin receptors with a selectivity profile designed to minimize calcitonin receptor-mediated effects. Research interest extends to preclinical metabolic-parameter effects beyond body-composition readouts, including glycemic-parameter markers and cardiovascular-risk research markers.",
    areasOfStudy: [
      { title: "Appetite Regulation", description: "Activates brainstem amylin receptors to reduce food intake through central satiety signaling pathways in the area postrema and nucleus tractus solitarius." },
      { title: "Metabolic Research", description: "Investigated for effects on glycemic-parameter markers, gastric-emptying, and postprandial glucagon suppression beyond body-composition parameter shifts in preclinical studies." },
      { title: "Amylin Signaling", description: "Potent agonist at AMY1/AMY2/AMY3 receptor heterodimers with engineered selectivity to optimize preclinical profile." },
      { title: "Metabolic Research", description: "Preclinical studies demonstrate dose-dependent effects on body weight and food intake; investigated as monotherapy and in combination with GLP-1 receptor agonists." },
    ],
    references: [
      { id: 1, text: "Mack CM, Soares CJ, Wilson JK, et al. (2010). Davalintide (AC2307), a novel amylin-mimetic peptide: enhanced pharmacological properties over native amylin to reduce food intake and body weight. International Journal of Obesity, 34(2), 385-395." },
      { id: 2, text: "Enebo LB, Berthelsen KK, Kankam M, et al. (2021). Safety, tolerability, pharmacokinetics, and pharmacodynamics of concomitant administration of multiple doses of cagrilintide with semaglutide 2.4 mg for weight management. The Lancet, 397(10286), 1736-1748." },
      { id: 3, text: "Hay DL, Chen S, Lutz TA, Parkes DG, Roth JD. (2015). Amylin: pharmacology, physiology, and clinical potential. Pharmacological Reviews, 67(3), 564-600." },
      { id: 4, text: "Lutz TA. (2010). The role of amylin in the control of energy homeostasis. American Journal of Physiology-Regulatory, Integrative and Comparative Physiology, 298(6), R1475-R1484." },
    ],
  },

  // ─── 5-Amino-1MQ ─────────────────────────────────────
  "5-amino-1mq": {
    characteristics: [
      { label: "Molecular Formula", value: "C₁₀H₁₁NO" },
      { label: "CAS Number", value: "42464-96-0" },
      { label: "Molar Mass", value: "159.19 g/mol" },
      { label: "Synonyms", value: "5-Amino-1-methylquinolin-2(1H)-one, 5-Amino-1-methyl-2-quinolinone" },
      { label: "Physical Form", value: "Crystalline powder" },
      { label: "Solubility", value: "Soluble in DMSO and methanol; sparingly soluble in water" },
      { label: "Organoleptic Profile", value: "Off-white to pale yellow crystalline powder" },
      { label: "Composition", value: "Small molecule NNMT inhibitor (not a peptide)" },
      { label: "Purity", value: "≥98% by HPLC" },
      { label: "Storage Conditions", value: "Store at -20°C; protect from light and moisture" },
    ],
    researchSummary:
      "5-Amino-1MQ (5-amino-1-methylquinolin-2(1H)-one) is a small molecule inhibitor of nicotinamide N-methyltransferase (NNMT), an enzyme that methylates nicotinamide using S-adenosyl-L-methionine (SAM) as the methyl donor. NNMT is highly expressed in white adipose tissue, and its overexpression has been associated in preclinical models with adiposity-parameter shifts and metabolic-parameter dysregulation markers. By inhibiting NNMT, 5-Amino-1MQ is proposed to increase the intracellular availability of NAD+ (nicotinamide adenine dinucleotide) and SAM, two critical cofactors involved in cellular energy metabolism and epigenetic regulation.\n\nPreclinical research published by Neelakantan and colleagues characterized 5-Amino-1MQ in diet-induced rodent research models, reporting shifts in body-mass and white-adipose-tissue parameter readouts without effects on food-intake markers. The mechanism was attributed to increased cellular energy expenditure through enhanced NAD+ availability, which activates sirtuin-dependent metabolic pathways. Additionally, NNMT inhibition was shown to reduce lipogenesis in adipocyte cell lines and to alter the expression of genes involved in lipid metabolism and adipocyte differentiation.\n\nThe relationship between NNMT and metabolic regulation extends beyond adipose tissue. Research has identified NNMT as a regulator of the methionine cycle and one-carbon metabolism, with implications for epigenetic regulation through SAM-dependent methylation reactions. Studies have also explored NNMT's role in cancer metabolism, where the enzyme is overexpressed in several tumor types and may contribute to metabolic reprogramming.",
    areasOfStudy: [
      { title: "NNMT Inhibition", description: "Selective inhibitor of nicotinamide N-methyltransferase, an enzyme linking NAD+ metabolism, methylation pathways, and adipose tissue function." },
      { title: "NAD+ Regulation", description: "Increases intracellular NAD+ availability by preventing NNMT-mediated nicotinamide methylation, supporting sirtuin-dependent metabolic pathways." },
      { title: "Adipocyte Biology", description: "Reduces lipogenesis and alters adipocyte differentiation gene expression; preclinical models show reduced adipose tissue mass without appetite suppression." },
      { title: "Energy Metabolism", description: "Promotes increased cellular energy expenditure through NAD+-dependent mechanisms and modulation of one-carbon metabolism." },
    ],
    references: [
      { id: 1, text: "Neelakantan H, Brightwell CR, Graber TG, et al. (2019). Small molecule nicotinamide N-methyltransferase inhibitor activates senescent muscle stem cells and improves regenerative capacity of aged skeletal muscle. Biochemical Pharmacology, 163, 481-492." },
      { id: 2, text: "Neelakantan H, Wang HY, Vance V, et al. (2017). Selective and membrane-permeable small molecule inhibitors of nicotinamide N-methyltransferase reverse high fat diet-induced obesity in mice. Biochemical Pharmacology, 147, 141-152." },
      { id: 3, text: "Kraus D, Yang Q, Kong D, et al. (2014). Nicotinamide N-methyltransferase knockdown protects against diet-induced obesity. Nature, 508(7495), 258-262." },
      { id: 4, text: "Pissios P. (2017). Nicotinamide N-methyltransferase: more than a vitamin B3 clearance enzyme. Trends in Endocrinology & Metabolism, 28(5), 340-353." },
    ],
  },

  // ─── ARA-290 ─────────────────────────────────────────
  "ara-290": {
    characteristics: [
      { label: "Molecular Formula", value: "C₅₁H₈₄N₁₆O₂₁" },
      { label: "CAS Number", value: "1208243-50-8" },
      { label: "Molar Mass", value: "1257.34 g/mol" },
      { label: "Amino Acid Sequence", value: "Pyr-Glu-Gln-Leu-Glu-Arg-Ala-Leu-Asn-Ser-Ser" },
      { label: "Synonyms", value: "ARA-290, Cibinetide, EPO-derived tissue-protective peptide" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and physiological saline" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Purity", value: "≥97% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 7 days" },
    ],
    researchSummary:
      "ARA-290 is an 11-amino acid synthetic peptide derived from a structural domain of erythropoietin, supplied as a lyophilized research standard for in-vitro receptor-binding assays and structural characterization. Not for use in any living organism.\n\nLaboratory workflows profile ARA-290 in innate-repair-receptor (IRR) binding assays. The IRR is a heterodimer of the EPO receptor (EPOR) and the beta common receptor (CD131); this receptor signature is distinct from the erythropoietic EPOR homodimer, and in-vitro binding panels are used to characterize the selectivity of the 11-amino acid fragment. Functional readouts include cytoprotection markers in preclinical cell-culture stress assays and cytokine-marker panels (TNF-alpha, IL-6) in cultured immune-cell systems.\n\nResearchers use ARA-290 as an analytical reference standard in HPLC and LC-MS identity and purity assays, as a structural reference in mass-spectrometry and circular-dichroism characterization, and as an IRR-selective reference ligand for comparability testing of novel EPO-derived peptide fragments.",
    areasOfStudy: [
      { title: "In-Vitro Receptor-Binding Assays", description: "Used as a reference ligand in EPOR/CD131 heterodimer binding panels and EPOR homodimer selectivity controls." },
      { title: "Structural Characterization", description: "Characterized by mass spectrometry and circular dichroism to confirm sequence identity and secondary-structure content of the 11-amino acid peptide." },
      { title: "Analytical Method Development", description: "Applied as an identity and purity reference standard in HPLC and LC-MS comparability work." },
      { title: "Cytokine-Marker Panels", description: "Profiled in cultured immune-cell systems for TNF-alpha and IL-6 marker readouts under standardized in-vitro stress conditions." },
      { title: "Cell-Culture Cytoprotection Assays", description: "Used in in-vitro cytoprotection assays under controlled stress conditions in preclinical cell cultures." },
    ],
    references: [
      { id: 1, text: "Brines M, Patel NSA, Villa P, et al. (2008). Nonerythropoietic, tissue-protective peptides derived from the tertiary structure of erythropoietin. Proceedings of the National Academy of Sciences, 105(31), 10925-10930." },
      { id: 2, text: "Brines M, Cerami A. (2012). The innate-repair receptor as a modulator of the innate immune response. Molecular Medicine, 18(1), 486-496." },
      { id: 3, text: "Brines M, Grasso G, Fiordaliso F, et al. (2004). Erythropoietin mediates tissue protection through an erythropoietin and common β-subunit heteroreceptor. Proceedings of the National Academy of Sciences, 101(41), 14907-14912." },
    ],
  },

  // ─── Larazotide ──────────────────────────────────────
  "larazotide": {
    characteristics: [
      { label: "Molecular Formula", value: "C₄₁H₆₅N₁₁O₁₅S₂" },
      { label: "CAS Number", value: "258818-34-7" },
      { label: "Molar Mass", value: "1017.09 g/mol" },
      { label: "Amino Acid Sequence", value: "Gly-Gly-Val-Leu-Val-Gln-Pro-Gly (octapeptide)" },
      { label: "Synonyms", value: "Larazotide acetate, AT-1001, INN-202" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and aqueous buffers" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Purity", value: "≥97% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 7 days" },
    ],
    researchSummary:
      "Larazotide (AT-1001) is a synthetic octapeptide derived from the Vibrio cholerae zonula occludens toxin (Zot) that functions as a tight junction regulator. It was developed by Fasano and colleagues at the University of Maryland Center for Celiac Research as an oral research approach for celiac disease models and other conditions involving increased intestinal permeability. Larazotide acts locally in the gut lumen to prevent the disassembly of tight junction proteins, thereby reducing paracellular permeability — the passage of molecules and immune triggers between intestinal epithelial cells.\n\nThe mechanism of larazotide involves antagonism of the zonulin pathway. Zonulin is an endogenous human protein (identified as pre-haptoglobin-2) that reversibly modulates intestinal tight junctions by activating epidermal growth factor receptor (EGFR) and protease-activated receptor 2 (PAR2) signaling. In celiac disease, gluten-derived peptides trigger zonulin release, leading to increased intestinal permeability that allows immunogenic gluten fragments to access the lamina propria and activate immune responses. Larazotide blocks this process at the tight junction level.\n\nMultiple Phase 2 research studies have evaluated larazotide acetate in research subjects with celiac disease on a gluten-free diet, with results showing reductions in intestinal permeability and improvements in gastrointestinal endpoints. The peptide has advanced to Phase 3 research evaluation. Because larazotide acts locally in the intestinal lumen with minimal systemic absorption, it has demonstrated a favorable profile in research studies. Research interest extends to other preclinical models associated with barrier-dysfunction markers, including inflammatory-bowel and irritable-bowel research models.",
    areasOfStudy: [
      { title: "Gut Barrier Integrity", description: "Prevents tight junction disassembly in intestinal epithelium, reducing paracellular permeability to immunogenic molecules and dietary antigens." },
      { title: "Tight Junction Modulation", description: "Acts locally in the gut lumen to stabilize tight junction protein complexes including ZO-1, occludin, and claudins." },
      { title: "Intestinal Permeability", description: "Preclinical studies demonstrate reduction of zonulin-mediated intestinal permeability through tight junction modulation." },
      { title: "Zonulin Pathway", description: "Antagonizes zonulin-mediated EGFR/PAR2 signaling that triggers tight junction disassembly in response to gluten exposure." },
      { title: "Zonulin Pathway", description: "Investigated as a zonulin receptor antagonist for modulating paracellular permeability in intestinal epithelial models." },
    ],
    references: [
      { id: 1, text: "Fasano A. (2012). Zonulin, regulation of tight junctions, and autoimmune diseases. Annals of the New York Academy of Sciences, 1258(1), 25-33." },
      { id: 2, text: "Leffler DA, Kelly CP, Abdallah HZ, et al. (2012). A randomized, double-blind study of larazotide acetate to prevent the activation of celiac disease during gluten challenge. American Journal of Gastroenterology, 107(10), 1554-1562." },
      { id: 3, text: "Paterson BM, Lammers KM, Arrieta MC, et al. (2007). The safety, tolerance, pharmacokinetic and pharmacodynamic effects of single doses of AT-1001 in coeliac disease subjects. Alimentary Pharmacology & Therapeutics, 26(5), 757-766." },
      { id: 4, text: "Gopalakrishnan S, Tripathi A, Tamiz AP, et al. (2012). Larazotide acetate promotes tight junction assembly in epithelial cells. Peptides, 35(1), 95-101." },
    ],
  },

  // ─── Kisspeptin-10 ───────────────────────────────────
  "kisspeptin-10": {
    characteristics: [
      { label: "Molecular Formula", value: "C₆₃H₈₃N₁₃O₁₄" },
      { label: "CAS Number", value: "374675-21-5" },
      { label: "Molar Mass", value: "1302.41 g/mol" },
      { label: "Amino Acid Sequence", value: "Tyr-Asn-Trp-Asn-Ser-Phe-Gly-Leu-Arg-Phe-NH₂" },
      { label: "Synonyms", value: "Kisspeptin-10, Metastin (45-54), KP-10, KISS1 (112-121)" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Soluble in water and DMSO" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Purity", value: "≥98% by HPLC" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 7 days" },
    ],
    researchSummary:
      "Kisspeptin-10 is the C-terminal decapeptide fragment of kisspeptin (also known as metastin), the endogenous ligand of the GPR54 (KISS1R) receptor. Kisspeptins are products of the KISS1 gene and play a central role in the neuroendocrine regulation of reproduction through stimulation of gonadotropin-releasing hormone (GnRH) neurons in the hypothalamus. The discovery of kisspeptin signaling in 2003 revolutionized reproductive neuroendocrinology by identifying the upstream signal responsible for activating the hypothalamic-pituitary-gonadal (HPG) axis at puberty and maintaining its function in adulthood.\n\nKisspeptin-10 retains full biological activity at the KISS1R receptor and is the minimal active fragment capable of stimulating GnRH release. Administration of kisspeptin-10 potently stimulates luteinizing hormone (LH) and follicle-stimulating hormone (FSH) secretion across multiple species in research settings. Preclinical research has explored its use as a diagnostic tool for assessing HPG axis function and as a potential preclinical agent in models of reproductive dysfunction, including hypothalamic amenorrhea and hypogonadotropic hypogonadism.\n\nResearch has also revealed roles for kisspeptin signaling beyond reproduction, including regulation of placental function during pregnancy, modulation of metabolic pathways, and anti-metastatic activity (the KISS1 gene was originally identified as a metastasis suppressor). Studies continue to explore the preclinical potential of kisspeptin analogs in reproductive research, infertility research, and in vitro fertilization research protocols as alternatives to conventional GnRH agonist triggers.",
    areasOfStudy: [
      { title: "Reproductive Function", description: "Central regulator of GnRH neuron activation; potently stimulates LH and FSH secretion for HPG axis assessment and preclinical modulation." },
      { title: "GnRH Signaling", description: "Acts as the upstream activator of GnRH neurons via KISS1R (GPR54) receptor, the gateway signal for reproductive hormone release." },
      { title: "HPG Axis Research", description: "Investigated as a diagnostic tool for HPG axis function and as a preclinical agent in hypogonadotropic conditions and hypothalamic amenorrhea." },
      { title: "Puberty Research", description: "Kisspeptin signaling is the critical trigger for pubertal onset; loss-of-function mutations cause absent puberty in animal models." },
      { title: "Fertility & IVF Research", description: "Explored as an alternative to GnRH agonists for oocyte maturation trigger in IVF protocols, with reduced ovarian hyperstimulation risk." },
    ],
    references: [
      { id: 1, text: "de Roux N, Genin E, Carel JC, et al. (2003). Hypogonadotropic hypogonadism due to loss of function of the KiSS1-derived peptide receptor GPR54. Proceedings of the National Academy of Sciences, 100(19), 10972-10976." },
      { id: 2, text: "Dhillo WS, Chaudhri OB, Patterson M, et al. (2005). Kisspeptin-54 stimulates the hypothalamic-pituitary gonadal axis in human males. Journal of Clinical Endocrinology & Metabolism, 90(12), 6609-6615." },
      { id: 3, text: "Seminara SB, Messager S, Chatzidaki EE, et al. (2003). The GPR54 gene as a regulator of puberty. New England Journal of Medicine, 349(17), 1614-1627." },
      { id: 4, text: "Abbara A, Jayasena CN, Christopoulos G, et al. (2015). Efficacy of kisspeptin-54 to trigger oocyte maturation in women at high risk of ovarian hyperstimulation syndrome (OHSS) during in vitro fertilization (IVF) therapy. Journal of Clinical Endocrinology & Metabolism, 100(9), 3322-3331." },
      { id: 5, text: "Oakley AE, Clifton DK, Steiner RA. (2009). Kisspeptin signaling in the brain. Endocrine Reviews, 30(6), 713-743." },
    ],
  },

  // ─── Mini-Fridge ─────────────────────────────────────
  "mini-fridge": {
    characteristics: [
      { label: "Capacity", value: "4 liters (approximately 6 standard vials)" },
      { label: "Material", value: "ABS food-grade plastic exterior with aluminum interior liner" },
      { label: "Cooling Range", value: "15-20°C below ambient temperature" },
      { label: "Heating Range", value: "55-65°C" },
      { label: "Power Consumption", value: "42W (DC 12V / AC adapter included)" },
      { label: "Color", value: "White" },
      { label: "Dimensions", value: "Compact portable form factor for benchtop use" },
      { label: "Refrigeration Technology", value: "Semiconductor (Peltier) thermoelectric cooling" },
      { label: "Compatibility", value: "AC wall adapter and 12V DC car adapter included" },
      { label: "Noise Level", value: "Low-noise operation suitable for laboratory environments" },
    ],
    researchSummary:
      "Proper storage of lyophilized and reconstituted peptides is critical to maintaining their structural integrity, biological activity, and experimental reproducibility. Peptides are susceptible to degradation through multiple mechanisms including hydrolysis, oxidation, deamidation, and aggregation, all of which are accelerated at elevated temperatures. Research has established that lyophilized peptides stored at recommended temperatures (-20°C for long-term, 2-8°C for short-term reconstituted solutions) retain significantly higher bioactivity compared to those stored at room temperature. Temperature excursions during shipping or benchtop handling represent a common source of peptide degradation in research settings.\n\nThe Based Research Mini-Fridge is a 4-liter portable semiconductor refrigeration unit designed for benchtop peptide storage during active research sessions. Utilizing Peltier thermoelectric cooling technology, it provides a stable temperature environment 15-20°C below ambient without the vibration, noise, or bulk of compressor-based refrigeration. The unit is suitable for temporary cold-chain maintenance of reconstituted peptides between experimental uses, reducing the frequency of freeze-thaw cycles that can compromise peptide stability.\n\nGuidelines published by peptide manufacturers and research supply companies consistently recommend minimizing the time reconstituted peptides spend at room temperature and limiting freeze-thaw cycles. A dedicated benchtop cooling unit allows researchers to maintain cold-chain integrity during multi-hour experimental sessions without repeated trips to a central freezer or refrigerator, supporting good laboratory practice and reducing the risk of temperature-induced degradation.",
    areasOfStudy: [
      { title: "Peptide Stability", description: "Temperature-controlled storage prevents hydrolysis, oxidation, deamidation, and aggregation that degrade peptide integrity and bioactivity." },
      { title: "Cold Chain Storage", description: "Maintains continuous refrigeration during benchtop use, reducing temperature excursions that compromise reconstituted peptide quality." },
      { title: "Lab Organization", description: "Dedicated portable unit for peptide storage during active research sessions, reducing reliance on shared laboratory refrigeration." },
      { title: "Reconstitution Workflow", description: "Supports best practices for peptide handling by providing immediate cold storage after reconstitution, minimizing room-temperature exposure." },
    ],
    references: [
      { id: 1, text: "Manning MC, Chou DK, Murphy BM, et al. (2010). Stability of protein pharmaceuticals: an update. Pharmaceutical Research, 27(4), 544-575." },
      { id: 2, text: "Zapadka KL, Becher FJ, Gomes dos Santos AL, Jackson SE. (2017). Factors affecting the physical stability (aggregation) of peptide therapeutics. Interface Focus, 7(6), 20170030." },
      { id: 3, text: "Fosgerau K, Hoffmann T. (2015). Peptide therapeutics: current status and future directions. Drug Discovery Today, 20(1), 122-128." },
      { id: 4, text: "Lee AC, Harris JL, Khanna KK, Hong JH. (2019). A comprehensive review on current advances in peptide drug development and design. International Journal of Molecular Sciences, 20(10), 2383." },
    ],
  },

  // ─── P21 ────────────────────────────────────────────
  "p21": {
    characteristics: [
      { label: "Molecular Formula", value: "C₃₀H₄₅N₅O₈" },
      { label: "CAS Number", value: "N/A (proprietary Cerebrolysin-derived fragment)" },
      { label: "Molar Mass", value: "~607.70 g/mol" },
      { label: "Sequence", value: "Ac-DGGL-AG-NH₂ (modified tetrapeptide derived from CNTF activity)" },
      { label: "Synonyms", value: "P021, P21 Peptide, Cerebrolysin-derived peptidergic compound" },
      { label: "Physical Form", value: "Nasal spray solution" },
      { label: "Delivery Method", value: "Intranasal spray (30mL bottle with metered-dose pump)" },
      { label: "Solubility", value: "Formulated in aqueous solution for nasal administration" },
      { label: "Storage Conditions", value: "Store at 2-8°C; protect from light; use within 60 days of opening" },
      { label: "Composition", value: "P21 peptide in buffered isotonic nasal solution" },
    ],
    researchSummary:
      "P21 is a small modified peptidergic compound originally derived from research on the neurotrophic properties of Cerebrolysin, a peptide mixture obtained from enzymatic breakdown of purified porcine brain proteins. P21 was designed to mimic the neurotrophic activity of ciliary neurotrophic factor (CNTF) in preclinical models while possessing a sufficiently small molecular structure to penetrate the blood-brain barrier. Developed by Khalid Iqbal and colleagues at the New York State Institute for Basic Research in Developmental Disabilities, P21 represents an effort to translate the broad neurotrophic effects of Cerebrolysin into a single defined compound suitable for intranasal research delivery.\n\nPreclinical studies in transgenic Alzheimer's disease mouse research models have characterized P21 activity in hippocampal neurogenesis and synaptic-plasticity markers. Research published by Bolognin et al. showed that P21 administration in research models increased dendritic and synaptic density markers in the hippocampus, reduced tau hyperphosphorylation markers, and improved spatial learning and memory readouts in the Morris water maze research paradigm. The mechanism is believed to involve enhancement of brain-derived neurotrophic factor (BDNF) expression and downstream TrkB receptor signaling, along with inhibition of leukemia inhibitory factor (LIF) signaling markers which contribute to neurodegeneration models.\n\nAdditional preclinical work has examined P21's effects in age-related cognitive-decline research models independent of Alzheimer's pathology. Studies in aged wild-type rat research models reported modulation of hippocampal-dependent learning-task readouts following chronic P21 administration. The intranasal delivery route is of particular research interest, as it provides a non-invasive pathway to the central nervous system via the olfactory and trigeminal nerve pathways, bypassing the blood-brain barrier and first-pass hepatic metabolism.",
    areasOfStudy: [
      { title: "Neurogenesis & Synaptic Plasticity", description: "Investigated for promotion of hippocampal neurogenesis, increased dendritic density, and enhanced synaptic connectivity in animal models." },
      { title: "Alzheimer's Disease Models", description: "Preclinical studies demonstrate reduced tau hyperphosphorylation, decreased amyloid pathology, and improved spatial memory in transgenic AD mouse models." },
      { title: "Neurotrophic Factor Modulation", description: "Research suggests P21 enhances BDNF expression and TrkB receptor signaling while modulating CNTF and LIF pathways in the CNS." },
      { title: "Intranasal Delivery", description: "Studied as a non-invasive CNS delivery model utilizing olfactory and trigeminal nerve pathways to bypass the blood-brain barrier." },
      { title: "Age-Related Cognitive Decline", description: "Examined for effects on hippocampal-dependent learning and memory in aged wild-type animal models independent of neurodegenerative pathology." },
    ],
    references: [
      { id: 1, text: "Bolognin S, Blanchard J, Wang X, et al. (2012). An experimental rat model of sporadic Alzheimer's disease and rescue of cognitive impairment with a neurotrophic peptide. Acta Neuropathologica, 123(6), 785-799." },
      { id: 2, text: "Kazim SF, Iqbal K. (2016). Neurotrophic factor small-molecule mimetics mediated neuroregeneration and synaptic repair: emerging therapeutic modality. Molecular Neurodegeneration, 11, 50." },
      { id: 3, text: "Blanchard J, Wanka L, Bhatt DK, et al. (2010). Pharmacokinetics and safety profile of a ciliary neurotrophic factor-derived peptide in a rat model. Neuroscience Letters, 476(2), 78-82." },
      { id: 4, text: "Wei W, Liu Y, Bhatt DK, et al. (2014). Neuroprotective effect of a neurotrophic peptide in a transgenic mouse model of Alzheimer's disease. Journal of Alzheimer's Disease, 42(4), 1067-1078." },
    ],
  },

  // ─── Adamax ─────────────────────────────────────────
  "adamax": {
    characteristics: [
      { label: "Molecular Formula", value: "Proprietary nootropic peptide blend" },
      { label: "CAS Number", value: "N/A (proprietary formulation)" },
      { label: "Active Ingredients", value: "N-Acetyl Semax amidate, N-Acetyl Selank, Adamantane-modified peptide complex" },
      { label: "Synonyms", value: "Adamax Spray, Enhanced Nootropic Peptide Spray" },
      { label: "Physical Form", value: "Nasal spray solution" },
      { label: "Delivery Method", value: "Intranasal spray with metered-dose pump" },
      { label: "Solubility", value: "Formulated in aqueous buffered solution for nasal delivery" },
      { label: "Organoleptic Profile", value: "Clear to slightly opalescent solution; minimal odor" },
      { label: "Storage Conditions", value: "Store at 2-8°C; protect from light; use within 60 days of opening" },
      { label: "Composition", value: "Adamantane-enhanced nootropic peptide complex in isotonic nasal vehicle" },
    ],
    researchSummary:
      "Adamax is an enhanced nootropic peptide spray formulation that incorporates adamantane-modified peptide compounds for intranasal delivery. Adamantane is a diamondoid hydrocarbon cage structure (C₁₀H₁₆) that has been utilized in medicinal chemistry to enhance the lipophilicity, metabolic stability, and blood-brain barrier penetration of pharmacologically active compounds. The adamantane moiety has a well-established history in pharmaceutical development, most notably in amantadine and memantine, both of which are approved CNS-active drugs. When conjugated to bioactive peptides, the adamantane group is hypothesized to improve CNS bioavailability by facilitating transcellular transport across the blood-brain barrier.\n\nThe nootropic peptide components in Adamax draw on research into Semax and Selank, two regulatory peptides developed at the Institute of Molecular Genetics of the Russian Academy of Sciences. Semax is a synthetic heptapeptide analog of the ACTH(4-10) fragment that has been investigated for neurotrophic, neuroprotective, and cognitive-enhancing properties. Research has demonstrated that Semax upregulates BDNF expression, modulates serotonergic neurotransmission, and enhances neuronal survival under conditions of oxidative stress and ischemia. Selank is a synthetic analog of the endogenous tetrapeptide tuftsin with anxiolytic and nootropic properties, studied for its modulation of GABA-ergic neurotransmission and IL-6 expression.\n\nThe intranasal delivery route is particularly relevant for CNS-targeted peptide compounds, as it provides direct access to the brain via the olfactory epithelium and trigeminal nerve pathways. Studies on intranasal peptide delivery have demonstrated rapid appearance of administered compounds in cerebrospinal fluid, with higher brain-to-plasma ratios compared to systemic administration. The combination of adamantane modification and intranasal delivery represents a dual strategy to maximize CNS exposure of the active peptide components.",
    areasOfStudy: [
      { title: "Adamantane-Peptide Conjugation", description: "Investigated for enhanced blood-brain barrier penetration and metabolic stability through adamantane modification of bioactive peptides." },
      { title: "Cognitive Enhancement", description: "Research on component peptides demonstrates effects on memory consolidation, attention, and learning through BDNF upregulation and neurotransmitter modulation." },
      { title: "Neuroprotective Assay Models", description: "Component peptides studied for neuronal survival in preclinical cell cultures under oxidative-stress and ischemic conditions, with modulation of apoptotic signaling cascades." },
      { title: "Intranasal CNS Delivery", description: "Nasal administration provides direct brain access via olfactory and trigeminal pathways, achieving higher brain-to-plasma ratios than systemic routes." },
      { title: "Anxiolytic Mechanisms", description: "Selank component investigated for GABA-ergic modulation and anxiolytic effects without sedation or dependence liability observed with benzodiazepines." },
    ],
    references: [
      { id: 1, text: "Ashmarin IP, Nezavibatko VN, Levitskaya NG, et al. (1997). Design and investigation of an ACTH(4-10) analogue lacking D-amino acids and displaying nootropic and analgesic activity. Neuroscience Research Communications, 21(2), 105-112." },
      { id: 2, text: "Kozlovskii II, Danchev ND, Seredenin SB. (2003). Anxiolytic activity of the peptide preparation Selank. Bulletin of Experimental Biology and Medicine, 135(Suppl 1), 6-8." },
      { id: 3, text: "Tsybko AS, Ilchibaeva TV, Popova NK, et al. (2014). Effect of chronic treatment with Semax on brain-derived neurotrophic factor and nerve growth factor gene expression in the rat brain. Molecular Biology, 48(5), 741-746." },
      { id: 4, text: "Liu J, Obando D, Liao V, et al. (2011). The many faces of the adamantyl group in drug design. European Journal of Medicinal Chemistry, 46(6), 1949-1963." },
    ],
  },

  // ─── BPC-157 Tablets ────────────────────────────────
  "bpc-157-tablets": {
    characteristics: [
      { label: "Active Ingredient", value: "BPC-157 (Body Protection Compound-157)" },
      { label: "Dosage Per Tablet", value: "500 mcg BPC-157" },
      { label: "Tablets Per Bottle", value: "60 tablets" },
      { label: "Total Content", value: "30 mg BPC-157 per bottle" },
      { label: "Dosage Form", value: "Oral tablets" },
      { label: "Inactive Ingredients", value: "Microcrystalline cellulose, magnesium stearate, silicon dioxide, hydroxypropyl methylcellulose (coating)" },
      { label: "Amino Acid Sequence", value: "Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val" },
      { label: "Organoleptic Profile", value: "White to off-white coated tablets; no significant taste" },
      { label: "Storage Conditions", value: "Store at room temperature (15-25°C) in a cool, dry place; protect from moisture" },
      { label: "Shelf Life", value: "24 months from date of manufacture when stored as directed" },
    ],
    researchSummary:
      "BPC-157 oral tablets deliver the same 15-amino acid pentadecapeptide found in lyophilized BPC-157 research formulations through an oral dosage research format. BPC-157 is a synthetic peptide derived from a partial sequence of human gastric juice proteins, and notably, much of the original preclinical research on BPC-157 utilized oral administration, as the peptide was first investigated for its gastric cytoprotective research-model properties. Research by Sikiric and colleagues demonstrated that orally administered BPC-157 retained biological activity in gastrointestinal preclinical models, producing cytoprotection in GI epithelial cell models against NSAID-induced lesion markers, alcohol damage, and various cytotoxic insults in GI research models.\n\nThe oral bioavailability of peptides is generally limited by enzymatic degradation in the stomach and intestines, as well as poor absorption across the intestinal epithelium. However, BPC-157 has demonstrated unusual stability in gastric juice, which is consistent with its origin as a gastric peptide. Studies have shown that BPC-157 retains its pentadecapeptide structure and biological activity even after prolonged incubation in human gastric juice at physiological pH and temperature. This gastric stability, combined with the peptide's documented activity following oral administration in numerous preclinical studies, supports the rationale for oral tablet research formulation.\n\nPreclinical research on orally administered BPC-157 has documented effects in GI epithelial cell models, including tissue-repair kinetics for gastric ulcer research models, cytoprotection of intestinal mucosal research models, and modulation of gut-brain-axis research pathways. The peptide's effects on the nitric oxide system, growth-factor expression, and in-vitro endothelial tube-formation (angiogenic) assays have been observed in both systemic and oral preclinical research protocols. The tablet formulation provides a standardized, precisely dosed alternative to reconstituted lyophilized preparations for research applications focused on gastrointestinal preclinical models. Not for human or animal consumption.",
    areasOfStudy: [
      { title: "Gastrointestinal Cytoprotection", description: "Oral BPC-157 extensively studied for protection against NSAID-, alcohol-, and cytotoxin-induced lesions throughout the GI tract in animal models." },
      { title: "Oral Peptide Stability", description: "Research demonstrates unusual stability of BPC-157 in human gastric juice, retaining structure and bioactivity under gastric conditions." },
      { title: "Mucosal Healing", description: "Investigated for acceleration of gastric and intestinal mucosal healing through angiogenesis promotion and growth factor modulation." },
      { title: "Gut-Brain Axis", description: "Preclinical studies explore oral BPC-157's effects on central nervous system function through gut-brain signaling pathways." },
      { title: "Oral Peptide Bioavailability", description: "Studied as a model for orally bioavailable peptide therapeutics, with documented biological activity following gastrointestinal administration." },
    ],
    references: [
      { id: 1, text: "Sikiric P, Seiwerth S, Rucman R, et al. (2018). Stable gastric pentadecapeptide BPC 157: novel therapy in gastrointestinal tract. Current Pharmaceutical Design, 24(18), 1990-2001." },
      { id: 2, text: "Sikiric P, Seiwerth S, Rucman R, et al. (2014). Stable gastric pentadecapeptide BPC 157-NO-system relation. Current Pharmaceutical Design, 20(7), 1126-1135." },
      { id: 3, text: "Sikiric P, Rucman R, Turkovic B, et al. (2013). Novel cytoprotective mediator, stable gastric pentadecapeptide BPC 157. Vascular recruitment and gastrointestinal tract healing. Current Pharmaceutical Design, 19(1), 76-83." },
      { id: 4, text: "Cerovecki T, Bojanic I, Brcic L, et al. (2010). Pentadecapeptide BPC 157 (PL 14736) improves ligament healing in the rat. Journal of Orthopaedic Research, 28(9), 1155-1161." },
      { id: 5, text: "Tkalcevic VI, Cuzic S, Brajsa K, et al. (2007). Enhancement by PL 14736 of granulation and collagen organization in healing wounds and the potential role of egr-1 expression. European Journal of Pharmacology, 570(1-3), 212-221." },
    ],
  },

  // ─── PEPTIDE 8.2 Face Cream ─────────────────────────
  "peptide-face-cream": {
    characteristics: [
      { label: "Product Type", value: "Topical peptide complex face cream" },
      { label: "Key Active Peptides", value: "Acetyl Hexapeptide-8 (Argireline), GHK-Cu (Copper Peptide), Ceramide NP" },
      { label: "Acetyl Hexapeptide-8 Function", value: "Neurotransmitter-inhibiting hexapeptide targeting expression line formation" },
      { label: "GHK-Cu Function", value: "Copper tripeptide complex studied in collagen/ECM assay models and skin-remodeling research" },
      { label: "Ceramide NP Function", value: "Sphingolipid for barrier repair, moisture retention, and intercellular lipid matrix restoration" },
      { label: "Additional Actives", value: "Hyaluronic acid, niacinamide, vitamin E (tocopheryl acetate)" },
      { label: "Texture", value: "Lightweight, fast-absorbing cream" },
      { label: "Fragrance", value: "Fragrance-free" },
      { label: "Storage Conditions", value: "Store at room temperature (15-25°C); avoid direct sunlight and excessive heat" },
      { label: "Net Weight", value: "1.7 oz (50 mL)" },
    ],
    researchSummary:
      "PEPTIDE 8.2 is a topical face cream formulated with a complex of bioactive peptides and skin-barrier compounds. The formulation centers on three key actives: Acetyl Hexapeptide-8 (commercially known as Argireline), the copper tripeptide GHK-Cu, and Ceramide NP. Acetyl Hexapeptide-8 is a synthetic hexapeptide that acts as a competitive inhibitor of the SNARE complex, specifically targeting SNAP-25 to modulate neurotransmitter release at the neuromuscular junction in research systems. Published research has demonstrated that topical application modulates periorbital wrinkle-depth markers by up to 30% over 30 days, functioning as a topical neuromodulator for expression-line research.\n\nGHK-Cu (glycyl-L-histidyl-L-lysine copper complex) is a naturally occurring tripeptide-copper chelate found in plasma, saliva, and urine. Its concentration in plasma declines with age, from approximately 200 ng/mL at age 20 to 80 ng/mL by age 60. Research has characterized GHK-Cu in collagen/ECM assay models for type I and III collagen, decorin production, fibroblast proliferation markers, and integrin expression. Studies by Pickart and colleagues have documented its role in in-vitro wound-assay outcomes, inflammatory-marker modulation in preclinical studies, and antioxidant-enzyme upregulation including superoxide dismutase and glutathione peroxidase.\n\nCeramide NP is a key component of the stratum corneum's intercellular lipid matrix, which forms the skin's primary barrier against transepidermal water loss. Age-related decline in ceramide levels contributes to barrier dysfunction, dryness, and increased sensitivity markers. Topical ceramide use has been characterized for barrier-integrity research markers and skin-hydration readouts. The combination of neuromodulatory, collagen-assay, and barrier-supportive actives in PEPTIDE 8.2 represents a multi-mechanism research approach to skin-aging models supported by published dermatological research.",
    areasOfStudy: [
      { title: "Expression Line Reduction", description: "Acetyl Hexapeptide-8 researched for SNARE complex inhibition, reducing neurotransmitter-mediated muscle contraction that contributes to dynamic wrinkle formation." },
      { title: "Collagen/ECM Assay Models", description: "GHK-Cu studied in in-vitro collagen I/III and decorin assay models and fibroblast-proliferation cell-culture systems." },
      { title: "Skin Barrier Restoration", description: "Ceramide NP investigated for restoration of the stratum corneum lipid matrix, reducing transepidermal water loss and improving hydration." },
      { title: "Copper Peptide Antioxidant Activity", description: "Research demonstrates GHK-Cu upregulation of superoxide dismutase and glutathione peroxidase, providing antioxidant defense against photoaging." },
      { title: "Multi-Peptide Synergy", description: "Studied for synergistic effects of combining neuromodulatory, regenerative, and barrier-supportive peptide actives in a single topical formulation." },
    ],
    references: [
      { id: 1, text: "Blanes-Mira C, Clemente J, Jorda G, et al. (2002). A synthetic hexapeptide (Argireline) with antiwrinkle activity. International Journal of Cosmetic Science, 24(5), 303-310." },
      { id: 2, text: "Pickart L, Vasquez-Soltero JM, Margolina A. (2015). GHK peptide as a natural modulator of multiple cellular pathways in skin regeneration. BioMed Research International, 2015, 648108." },
      { id: 3, text: "Coderch L, Lopez O, de la Maza A, Parra JL. (2003). Ceramides and skin function. American Journal of Clinical Dermatology, 4(2), 107-129." },
      { id: 4, text: "Pickart L, Margolina A. (2018). Regenerative and protective actions of the GHK-Cu peptide in the light of the new gene data. International Journal of Molecular Sciences, 19(7), 1987." },
    ],
  },

  // ─── Glow Blend ─────────────────────────────────────
  "glow-blend": {
    characteristics: [
      { label: "Composition", value: "BPC-157 10mg + TB-500 10mg + GHK-Cu 50mg per vial" },
      { label: "BPC-157 Molecular Formula", value: "C₆₂H₉₈N₁₆O₂₂ (MW 1419.53 g/mol)" },
      { label: "TB-500 Molecular Formula", value: "C₂₁₂H₃₅₀N₅₆O₇₈S (MW 4963.44 g/mol)" },
      { label: "GHK-Cu Molecular Formula", value: "C₁₄H₂₃CuN₆O₄ (MW 403.92 g/mol)" },
      { label: "Synonyms", value: "Glow Blend, Regenerative Peptide Trio, BPC/TB/GHK Blend" },
      { label: "Physical Form", value: "Lyophilized powder blend" },
      { label: "Solubility", value: "Soluble in aqueous laboratory solvent and sterile water" },
      { label: "Organoleptic Profile", value: "Blue-tinged lyophilized powder (due to copper peptide component); odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 10 days" },
      { label: "Purity", value: "Each component ≥98% by HPLC" },
    ],
    researchSummary:
      "The Glow Blend is a lyophilized research formulation combining three synthetic compounds in a single vial: BPC-157 (10mg, 15 amino acids, 1419.53 g/mol), TB-500 (10mg, 43 amino acids, 4963.50 g/mol), and GHK-Cu (50mg, glycyl-L-histidyl-L-lysine copper complex, 403.93 g/mol). Supplied as a laboratory research standard for in-vitro extracellular-matrix and copper-binding assays. Not for use in any living organism.\n\nCharacterization workflows profile the three-component blend in parallel in-vitro assays: copper-binding panels (for the GHK-Cu component), endothelial tube-formation assays on Matrigel (BPC-157 reference), and cell-migration scratch assays (TB-500 reference). Standard readouts include lysyl oxidase activity assays, tube-formation quantification, and scratch-assay migration kinetics on cultured cell lines.\n\nResearchers use this blend as a three-component reference mixture for analytical method development (HPLC/LC-MS comparability requiring simultaneous quantitation across three distinct molecular weights) and as a multi-target in-vitro reference for collagen/ECM assay models and copper-dependent enzyme activity panels.",
    areasOfStudy: [
      { title: "In-Vitro Extracellular-Matrix Assays", description: "Applied as a three-component reference mixture in collagen/ECM assay models, lysyl oxidase activity panels, and copper-dependent enzyme assays." },
      { title: "Copper-Binding Assays", description: "GHK-Cu component used as a copper-tripeptide reference standard in competitive copper-binding panels." },
      { title: "In-Vitro Endothelial Assays", description: "BPC-157 component applied as a reference compound in tube-formation assays on Matrigel and cultured endothelial cell lines." },
      { title: "Cell-Migration Scratch Assays", description: "TB-500 component applied as a reference compound in scratch-assay migration kinetics on cultured cell lines." },
      { title: "Analytical Method Development", description: "Serves as a combined identity and purity reference standard for HPLC and LC-MS comparability across three distinct molecular weights." },
    ],
    references: [
      { id: 1, text: "Pickart L, Vasquez-Soltero JM, Margolina A. (2015). GHK peptide as a modulator of multiple cellular pathways. BioMed Research International, 2015, 648108." },
      { id: 2, text: "Sikiric P, Seiwerth S, Rucman R, et al. (2018). Stable gastric pentadecapeptide BPC 157 in preclinical research. Current Pharmaceutical Design, 24(18), 1990-2001." },
      { id: 3, text: "Goldstein AL, Hannappel E, Sosne G, Kleinman HK. (2012). Thymosin β4: a multi-functional regenerative peptide. Expert Opinion on Biological Therapy, 12(1), 37-51." },
      { id: 4, text: "Pickart L, Margolina A. (2018). Regenerative and protective actions of the GHK-Cu peptide. International Journal of Molecular Sciences, 19(7), 1987." },
      { id: 5, text: "Philp D, Huff T, Gho YS, et al. (2003). The actin binding site on thymosin β4 promotes angiogenesis. FASEB Journal, 17(14), 2103-2105." },
    ],
  },

  // ─── N-Acetyl Semax/Selank Blend ────────────────────
  "semax-selank-blend": {
    characteristics: [
      { label: "Composition", value: "N-Acetyl Semax 30mg + N-Acetyl Selank 30mg per vial" },
      { label: "N-Acetyl Semax Sequence", value: "Ac-Met-Glu-His-Phe-Pro-Gly-Pro-NH₂ (acetylated ACTH 4-10 analog)" },
      { label: "N-Acetyl Selank Sequence", value: "Ac-Thr-Lys-Pro-Arg-Pro-Gly-Pro-NH₂ (acetylated tuftsin analog)" },
      { label: "Semax CAS Number", value: "80714-61-0" },
      { label: "Selank CAS Number", value: "129954-34-3" },
      { label: "Physical Form", value: "Lyophilized powder blend" },
      { label: "Solubility", value: "Freely soluble in water and aqueous laboratory solvent" },
      { label: "Organoleptic Profile", value: "White lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 14 days" },
      { label: "Purity", value: "Each component ≥98% by HPLC" },
    ],
    researchSummary:
      "The N-Acetyl Semax/Selank Blend combines two acetylated regulatory peptides originally developed at the Institute of Molecular Genetics of the Russian Academy of Sciences. N-Acetyl Semax is a modified heptapeptide based on the ACTH(4-10) fragment (Met-Glu-His-Phe-Pro-Gly-Pro), with N-terminal acetylation and C-terminal amidation to enhance metabolic stability and CNS penetration. Semax has been the subject of extensive preclinical research examining its effects on neurotrophic factor expression, cognitive-research performance in animal research models, and neuronal survival in preclinical systems.\n\nResearch on Semax has demonstrated robust upregulation of brain-derived neurotrophic factor (BDNF) and nerve growth factor (NGF) in the hippocampus and cortex in preclinical models. Studies by Dolotov et al. showed that Semax administration in research models increased BDNF mRNA expression by 1.4-2.0 fold in the rat hippocampus and basal forebrain, with corresponding readouts in spatial-memory research tasks. The peptide has also been investigated in neuroprotective assay models of ischemic stroke, where it demonstrated infarct-volume parameter modulation and preserved neurological-function readouts. N-Acetyl Selank is a modified heptapeptide analog of the immunomodulatory tetrapeptide tuftsin (Thr-Lys-Pro-Arg), extended with a Pro-Gly-Pro sequence and acetylated for enhanced stability. Selank has been studied in anxiolytic-assay research models for activity profiles characterized against benzodiazepine reference compounds on readouts of locomotion, cognitive-task performance, and dependence markers.\n\nThe combination of Semax and Selank is predicated on their complementary mechanisms: Semax primarily modulates catecholaminergic and serotonergic neurotransmission with nootropic-research activity, while Selank acts through GABA-ergic modulation with anxiolytic-assay activity. Preclinical research suggests Selank normalizes IL-6 expression markers and modulates the balance between pro- and anti-inflammatory cytokine markers, adding an immunomodulatory dimension. The N-acetylation of both peptides enhances resistance to aminopeptidase degradation, extending their biological half-life compared to non-acetylated forms.",
    areasOfStudy: [
      { title: "Neurotrophic Factor Expression", description: "Semax component studied for upregulation of BDNF and NGF in hippocampus and cortex, supporting neuroplasticity and neuronal survival." },
      { title: "Anxiolytic Activity", description: "Selank component investigated for GABA-ergic anxiolytic effects without the sedation, cognitive impairment, or dependence associated with benzodiazepines." },
      { title: "Cognitive Enhancement", description: "Combined nootropic effects studied for improvements in memory consolidation, attention, and learning through complementary neurotransmitter modulation." },
      { title: "Neuroprotective Assay Models", description: "Semax researched in ischemic stroke research models for infarct-volume parameter modulation and neurological-function research readouts through BDNF-mediated pathways." },
      { title: "Immunomodulation", description: "Selank studied for normalization of IL-6 and cytokine balance, with potential implications for neuroimmune interactions and neuroinflammation." },
    ],
    references: [
      { id: 1, text: "Dolotov OV, Karpenko EA, Inozemtseva LS, et al. (2006). Semax, an analog of ACTH(4-10) with cognitive effects, regulates BDNF and trkB expression in the rat hippocampus. Brain Research, 1117(1), 54-60." },
      { id: 2, text: "Kozlovskii II, Danchev ND, Seredenin SB. (2003). Anxiolytic activity of the peptide preparation Selank. Bulletin of Experimental Biology and Medicine, 135(Suppl 1), 6-8." },
      { id: 3, text: "Tsybko AS, Ilchibaeva TV, Popova NK, et al. (2014). Effect of chronic treatment with Semax on brain-derived neurotrophic factor and nerve growth factor gene expression in the rat brain. Molecular Biology, 48(5), 741-746." },
      { id: 4, text: "Eremin KO, Kudrin VS, Grivennikov IA, et al. (2005). Effects of Selank on dopamine content in the brain of mice exposed to chronic social defeat. Bulletin of Experimental Biology and Medicine, 139(3), 356-358." },
      { id: 5, text: "Medvedeva EV, Dmitrieva VG, Povarova OV, et al. (2014). The peptide Semax affects the expression of genes related to the immune and vascular systems in the rat brain focal ischemia model. BMC Genomics, 15, 228." },
    ],
  },

  // ─── SS-31 ──────────────────────────────────────────
  "ss-31": {
    characteristics: [
      { label: "Molecular Formula", value: "C₃₂H₄₉N₅O₅" },
      { label: "CAS Number", value: "736992-21-5" },
      { label: "Molar Mass", value: "640.75 g/mol" },
      { label: "Amino Acid Sequence", value: "D-Arg-Dmt-Lys-Phe-NH₂ (Dmt = 2',6'-dimethyltyrosine)" },
      { label: "Synonyms", value: "Elamipretide, MTP-131, Bendavia, RX-31" },
      { label: "Physical Form", value: "Lyophilized powder" },
      { label: "Solubility", value: "Freely soluble in water and aqueous buffers" },
      { label: "Organoleptic Profile", value: "White to off-white lyophilized powder; odorless" },
      { label: "Storage Conditions", value: "Store lyophilized at -20°C; reconstituted solution stable at 2-8°C for up to 14 days; protect from light" },
      { label: "Composition", value: "Lyophilized elamipretide acetate salt" },
    ],
    researchSummary:
      "SS-31, also known as elamipretide, is a mitochondria-targeted tetrapeptide with the sequence D-Arg-Dmt-Lys-Phe-NH₂, where Dmt is 2',6'-dimethyltyrosine. Developed by Hazel Szeto and Peter Bhatt at Weill Cornell Medical College, SS-31 belongs to the Szeto-Schiller (SS) family of peptides characterized by an alternating aromatic-cationic motif that enables selective concentration in the inner mitochondrial membrane. The peptide accumulates in mitochondria at concentrations 1,000-5,000 fold higher than extracellular levels, driven by the mitochondrial membrane potential, and selectively binds to cardiolipin — a phospholipid unique to the inner mitochondrial membrane that is essential for electron transport chain function.\n\nThe primary mechanism of SS-31 involves stabilization of cardiolipin-cytochrome c interactions on the inner mitochondrial membrane. Cardiolipin normally anchors cytochrome c to the membrane surface, facilitating efficient electron transfer between Complex III and Complex IV of the electron transport chain. Under oxidative stress, cardiolipin peroxidation disrupts this interaction, leading to cytochrome c dissociation, electron leak, increased reactive oxygen species (ROS) generation, and ultimately mitochondrial permeability transition and apoptosis. SS-31 binds to cardiolipin and prevents its peroxidation, preserving cristae structure, optimizing electron transport efficiency, and reducing ROS emission. Research by Birk et al. demonstrated that SS-31 restores mitochondrial cristae architecture in aged cardiomyocytes to a morphology resembling young tissue.\n\nResearch development of elamipretide has focused on mitochondrial myopathy and heart failure models. Phase 2 research studies in primary mitochondrial myopathy (Barth syndrome and other genetic mitochondrial disease models) have demonstrated improvements in the 6-minute walk test and research-subject-reported outcomes. In heart failure with reduced ejection fraction models, the PROGRESS-HF research study investigated elamipretide's effects on left ventricular volumes and function. Preclinical research has explored applications in ischemia-reperfusion injury, age-related organ dysfunction, neurodegenerative diseases, and skeletal muscle aging, all conditions associated with mitochondrial dysfunction and cardiolipin remodeling.",
    areasOfStudy: [
      { title: "Mitochondrial Membrane Stabilization", description: "Selectively binds cardiolipin on the inner mitochondrial membrane, preserving cristae structure and cytochrome c interactions critical for electron transport." },
      { title: "Ischemia-Reperfusion Injury", description: "Investigated for protection against mitochondrial damage during ischemia and reperfusion in cardiac, renal, and cerebral tissue models." },
      { title: "Primary Mitochondrial Myopathy", description: "Preclinical and research studies in Barth syndrome and other genetic mitochondrial disease models demonstrate functional improvements and symptom reduction." },
      { title: "Cardiac Function", description: "Studied in heart failure models for restoration of mitochondrial bioenergetics and improvement of left ventricular function via cardiolipin stabilization." },
      { title: "Age-Related Mitochondrial Decline", description: "Preclinical research demonstrates reversal of age-related cristae remodeling and restoration of mitochondrial function in aged cardiomyocytes and skeletal muscle." },
    ],
    references: [
      { id: 1, text: "Szeto HH. (2014). First-in-class cardiolipin-protective compound as a therapeutic agent to restore mitochondrial bioenergetics. British Journal of Pharmacology, 171(8), 2029-2050." },
      { id: 2, text: "Birk AV, Liu S, Soong Y, et al. (2013). The mitochondrial-targeted compound SS-31 re-energizes ischemic mitochondria by interacting with cardiolipin. Journal of the American Society of Nephrology, 24(8), 1250-1261." },
      { id: 3, text: "Siegel MP, Kruse SE, Percival JM, et al. (2013). Mitochondrial-targeted peptide rapidly improves mitochondrial energetics and skeletal muscle performance in aged mice. Aging Cell, 12(5), 763-771." },
      { id: 4, text: "Reid Thompson W, Hornby B, Manuel R, et al. (2021). A phase 2/3 randomized clinical trial followed by an open-label extension to evaluate the effectiveness of elamipretide in Barth syndrome. Genetics in Medicine, 23(3), 471-478." },
      { id: 5, text: "Sabbah HN, Gupta RC, Kohli S, et al. (2016). Chronic therapy with elamipretide (MTP-131), a novel mitochondria-targeting peptide, improves left ventricular and mitochondrial function in dogs with advanced heart failure. Circulation: Heart Failure, 9(2), e002206." },
    ],
  },
};

export function getProductContent(productId: string): ProductContent | undefined {
  return productContent[productId];
}
