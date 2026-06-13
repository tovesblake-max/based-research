/**
 * Build the review page by injecting the current product list into review.html.
 * Writes to scripts/review-built.html — open it directly in your browser.
 *
 * Run: npx tsx scripts/build-review.ts
 */
import fs from "fs/promises";
import path from "path";
import { products } from "../src/lib/products";

async function main() {
  const template = await fs.readFile(path.join(process.cwd(), "scripts/review.html"), "utf8");
  const data = products.map((p) => ({ slug: p.slug, name: p.name }));
  const injected = template.replace("__PRODUCTS__", JSON.stringify(data, null, 2));
  const outPath = path.join(process.cwd(), "scripts/review-built.html");
  await fs.writeFile(outPath, injected);
  console.log(`Wrote ${outPath}`);
  console.log(`\nOpen it with: open scripts/review-built.html`);
}

main().catch((e) => { console.error(e); process.exit(1); });
