// ⚠️ DEPRECATED 2026-05-04. Hand-maintained `cogsUSD` map below is stale
// (still references SEMA / TIRZ SKUs we no longer carry, and pre-round-
// number prices). The canonical margin generator now reads costCents
// directly from src/lib/products.ts and emits docs/product-margins.pdf
// + docs/margin-analysis.csv + docs/price-list.csv + docs/product-links.csv
// in one pass.
//
// To regenerate the catalog artifacts, run:
//     python3 scripts/gen_catalog_outputs.py
// (Requires `reportlab` in the local Python env: `pip install reportlab`.)
//
// Kept around in case the historical hand-mapped COGS view is ever
// useful for a one-off comparison; do not rely on its output for live
// decisions.

// Margin analysis — matches wholesale COGS (from the price list PDF) to
// retail prices (from src/lib/products.ts) and produces a per-SKU and
// blended view of gross margin. Output goes to docs/margin-analysis.csv
// so the operator can drop it in a spreadsheet.
//
// COGS mapping is done by hand below; products without a clean match are
// flagged so they can be reviewed rather than silently dropped.

import { products } from "../src/lib/products";

// ── COGS from the supplier price list ────────────────────
// Keys are our retail SKU. Values are wholesale unit cost in USD.
// Items we don't stock are omitted. Blend/combo COGS is additive from the
// supplier's component pricing where shown on the price list.
const cogsUSD: Record<string, number> = {
  // Tissue repair
  "BPC-5": 11,
  "BPC-10": 18,
  "TB5-5": 18,
  "TB5-10": 28,
  "PENT-5": 11, // proxy — supplier list has no explicit pentadecarginine; use BPC-157 5mg analog
  "BPTB-10": 25, // BPC/TB500 blend 5/5 on supplier list
  // GLP-1 / metabolic
  "SEMA-5": 16,
  "SEMA-10": 23,
  "TIRZ-10": 26,
  "TIRZ-30": 55,
  "RTA-10": 30, // retatrutide 10mg
  "AOD-5": 22,
  "CAG-10": 32,
  // GH axis
  "CJC-5": 11,
  "CJC-10": 13, // not used on retail but keep for completeness
  "IPA-5": 12,
  "IPA-10": 22,
  "TESA-5": 15,
  "TESA-10": 29,
  "SERM-5": 16,
  "SERM-10": 28,
  "CJCIPA-10": 21, // CJC/IPA blend 5/5
  "TESIPA-8": 34, // Tes/Ipam blend 5/5 on supplier list (approx for 4/4)
  // Longevity
  "GHK-50": 11,
  "GHK-100": 22,
  "EPIT-10": 8,
  "NAD-500": 26,
  "NAD-750": 39, // interpolated — supplier only has 500mg. Use 1.5× scaling
  "MOTS-5": 10, // interpolated from 10mg = $18
  "MOTS-10": 18,
  "SS31-5": 10, // interpolated from 10mg = $18
  "SS31-10": 18,
  "FOX4-10": 0, // flagged — not on supplier list. Review.
  "5A1M-50": 150, // supplier list is 5mg = $15 so 50mg scales ~10x. Review COGS.
  // Nootropic / CNS
  "SEL-10": 16,
  "SMX-30": 54, // supplier list: Semax 5mg $9 → ~$9/5mg × 6 = $54 for 30mg
  "DSIP-5": 12,
  "ADAMAX-10": 0, // flagged — not on supplier list
  "P21-25": 0, // flagged — not on supplier list
  "ARA-12": 15, // supplier list: ARA-290 10mg $12 → scale up
  "PTD-10": 0, // flagged — not on supplier list
  // Immune / gut
  "KPV-10": 10,
  "TA1-10": 24,
  "THYM-10": 12,
  "VIP-5": 12, // supplier list has VIP10 10mg at $24 → half
  "LAR-10": 0, // flagged — not on supplier list
  // Sexual / neuro
  "PT14-10": 18,
  "KP10-5": 15,
  "KP10-10": 25, // interpolated
  "OXY-5": 12,
  "OXY-10": 20, // interpolated
  // Blends / extras
  "RTRI-15": 30, // BPC5+TB5+GHK(5/50 basis) ≈ $11 + $18 + $1 = $30
  "GLOW-70": 48, // supplier list Glow Blend 10/10/50 = $48
  // Tablets — different format
  "BPC-TAB-60": 45, // engineered COGS guess — supplier list has no tablet form
  // Accessories
  "BAC-30": 3, // supplier list: Bac Water 10ml $10 → 30ml ≈ $3 at scale
  "SYRINGE-10": 3,
  "SWAB-100": 2,
  "FRIDGE-4L": 55, // retail $109, import cost ~$55
  // Test SKU
  "TEST-ACH-3": 0,
};

const usd = (c: number) => `$${c.toFixed(2)}`;

interface Row {
  slug: string;
  name: string;
  size: string;
  sku: string;
  retailUSD: number;
  cogsUSD: number;
  gpUSD: number;
  gpPct: number;
  flag: string;
}

const rows: Row[] = [];
let totalRetail = 0;
let totalCogs = 0;
let matchedSkus = 0;

for (const p of products) {
  for (const v of p.variants) {
    const retailUSD = v.price / 100;
    const cogs = cogsUSD[v.sku];
    if (cogs === undefined) {
      rows.push({
        slug: p.slug,
        name: p.name,
        size: v.size,
        sku: v.sku,
        retailUSD,
        cogsUSD: 0,
        gpUSD: 0,
        gpPct: 0,
        flag: "NO_COGS_MATCH",
      });
      continue;
    }
    if (cogs === 0 && v.sku !== "TEST-ACH-3") {
      rows.push({
        slug: p.slug,
        name: p.name,
        size: v.size,
        sku: v.sku,
        retailUSD,
        cogsUSD: 0,
        gpUSD: retailUSD,
        gpPct: 100,
        flag: "NO_SUPPLIER_COGS",
      });
      continue;
    }
    const gpUSD = retailUSD - cogs;
    const gpPct = retailUSD > 0 ? (gpUSD / retailUSD) * 100 : 0;
    rows.push({
      slug: p.slug,
      name: p.name,
      size: v.size,
      sku: v.sku,
      retailUSD,
      cogsUSD: cogs,
      gpUSD,
      gpPct,
      flag: p.upsellOnly ? "UPSELL_ONLY" : "-",
    });
    if (p.upsellOnly || v.sku === "TEST-ACH-3") continue;
    totalRetail += retailUSD;
    totalCogs += cogs;
    matchedSkus++;
  }
}

// Sort by GP% descending so highest-margin lines float to the top.
rows.sort((a, b) => b.gpPct - a.gpPct);

console.log("slug,name,size,sku,retail_usd,cogs_usd,gp_usd,gp_pct,flag");
for (const r of rows) {
  const cells = [
    r.slug,
    `"${r.name}"`,
    r.size,
    r.sku,
    r.retailUSD.toFixed(2),
    r.cogsUSD.toFixed(2),
    r.gpUSD.toFixed(2),
    r.gpPct.toFixed(1),
    r.flag,
  ];
  console.log(cells.join(","));
}

console.error("\n── PORTFOLIO SUMMARY ──");
console.error(`SKUs matched:        ${matchedSkus}`);
console.error(`Sum of retail:       ${usd(totalRetail)}`);
console.error(`Sum of COGS:         ${usd(totalCogs)}`);
console.error(`Blended gross margin: ${((1 - totalCogs / totalRetail) * 100).toFixed(1)}%`);
console.error(`COGS ratio:          ${((totalCogs / totalRetail) * 100).toFixed(1)}% of retail`);
