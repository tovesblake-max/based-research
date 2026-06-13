// Regenerate the pricing CSV at docs/price-list.csv from the products.ts
// catalog. Run any time pricing changes:
//   npx tsx scripts/extract-prices.ts > docs/price-list.csv
//
// Output columns: slug, name, category, size, sku, price, tier3, tier5,
// tier10, upsellOnly, noShipping, featured. All prices in dollars with
// two decimal places; volume tiers are the per-unit price at that qty.

import { products } from "../src/lib/products";

const dollars = (c: number) => (c / 100).toFixed(2);

// CSV cell — only quote when the value contains a comma, quote, or newline.
// Doubles internal quotes per RFC 4180.
function csvCell(v: string | number | boolean | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const header = [
  "slug",
  "name",
  "category",
  "size",
  "sku",
  "price_usd",
  "price_tier3_usd",
  "price_tier5_usd",
  "price_tier10_usd",
  "upsellOnly",
  "noShipping",
  "featured",
];

console.log(header.map(csvCell).join(","));

for (const p of products) {
  for (const v of p.variants) {
    const row = [
      p.slug,
      p.name,
      p.category,
      v.size,
      v.sku,
      dollars(v.price),
      dollars(Math.round(v.price * 0.95)),
      dollars(Math.round(v.price * 0.9)),
      dollars(Math.round(v.price * 0.85)),
      p.upsellOnly ? "true" : "false",
      p.noShipping ? "true" : "false",
      p.featured ? "true" : "false",
    ];
    console.log(row.map(csvCell).join(","));
  }
}
