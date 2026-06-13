/**
 * Maps product slugs to their image file paths.
 * Most slugs match filenames directly; this map handles exceptions.
 *
 * The restricted-compound overrides (glp1-smg, glp1-gip-tzp, amy-cgr) exist
 * so that image URLs don't expose those compound names to page crawlers.
 * Even though our CMS still uses the real slug internally, the image URL
 * the browser requests is the masked one.
 */
const slugOverrides: Record<string, string> = {
  // Restricted-compound name masking
  semaglutide: "glp1-smg",
  tirzepatide: "glp1-gip-tzp",
  cagrilintide: "amy-cgr",
  // (glp3-rta is fully masked at the product-definition level;
  //  its slug and image filename already match, so no override needed here)

  // Non-restricted legacy filename differences
  "cjc-1295-no-dac": "cjc-1295",
  "portable-peptide-storage-fridge": "storage-fridge",
  "p21-peptide-spray": "p21-spray",
  "ss-31-elamipretide": "ss-31",
  // New CJC-with-DAC + Ipa blend (added 2026-05-06) reuses the
  // existing CJC-Ipa blend image until a custom render lands. Both
  // are visually similar (same brand vial, same blend convention),
  // and the new blend differentiates from the no-DAC version in
  // text/composition rather than packaging.
  "cjc-1295-with-dac-ipamorelin-blend": "cjc-1295-ipamorelin-blend",
  // Cache-busted: v3 of the Glow Blend vial — the operator-supplied render
  // with a proper fine-crystalline cyan powder. Bump the suffix when
  // we re-render the image so CDNs + browsers force a fresh fetch.
  "glow-blend": "glow-blend-v3",
};

export function getProductImagePath(slug: string): string {
  const filename = slugOverrides[slug] ?? slug;
  return `/images/products/${filename}.webp`;
}
