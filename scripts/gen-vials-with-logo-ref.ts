/**
 * Generate all 45 vials passing the REAL logo as a reference image to Kie.
 * Same way Nano Banana Pro works — logo reference + prompt, model handles
 * wrapping/lighting/rendering naturally.
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { products } from "../src/lib/products";

const KIE_KEY = process.env.KIE_API_KEY;
const BASE = "https://api.kie.ai/api/v1/gpt4o-image";
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "5");
const LOGO_URL = "https://basedresearch.com/logo-ref.png";
const OUT_DIR = path.join(process.cwd(), "public/images/products");

function buildPrompt(productName: string, dose: string): string {
  return `
Create a photorealistic product photo of a premium pharmaceutical glass vial.

VIAL: 5mL capacity, crystal-clear borosilicate glass. Vivid cobalt-blue translucent
plastic flip-off cap with metallic silver aluminum crimp seal beneath. Fine bright-white
lyophilized peptide powder fills the bottom third of the vial evenly.

LABEL: A matte black wraparound paper label covers the middle section of the vial.
The label must prominently display the EXACT LOGO from the reference image I've
provided — reproduce that logo faithfully: the stylized teardrop/waterdrop containing
a symmetrical S-shaped molecule of circles connected by lines, with "BASED" in
bold caps and "RESEARCH" in thin letter-spaced caps below, all rendered in clean white
ink on the matte black label. The logo MUST look naturally wrapped around the
cylindrical glass with realistic lighting and curvature — brighter where light hits
the label, gently darker at the edges where the cylinder curves away. This is not
a flat sticker — it's a printed label on curved glass.

Below the logo on the label, add in clean white printing:
  - A thin white horizontal divider line
  - "${productName}" in elegant italic serif
  - "Concentration: ${dose}" in thin sans-serif below
  - "LOT 2026-041 · BATCH STLW-041" in tiny text along the bottom edge

BACKGROUND: Pure white seamless studio background, completely clean. Soft three-point
studio lighting with a gentle key light from upper-left. Subtle, almost invisible
shadow pooling directly beneath the vial. Vial upright, three-quarter front angle,
centered in frame with generous white space around it.

STYLE: Ultra-realistic commercial e-commerce product photography. Hasselblad H6D-100c,
100mm macro, f/11. Magazine-quality lighting, 8K resolution, tack sharp. No people,
no props, no additional text beyond what's specified.
`.trim();
}

async function submitJob(prompt: string): Promise<string> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${KIE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, size: "1:1", filesUrl: [LOGO_URL] }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(`Submit: ${JSON.stringify(data)}`);
  return data.data.taskId;
}

async function waitForJob(taskId: string, maxWaitMs = 300_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${BASE}/record-info?taskId=${taskId}`, {
      headers: { "Authorization": `Bearer ${KIE_KEY}` },
    });
    const d = (await res.json()).data;
    if (d.status === "SUCCESS" && d.response?.resultUrls?.length) return d.response.resultUrls[0];
    if (d.status === "FAILED" || d.errorMessage) throw new Error(d.errorMessage || "failed");
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("timeout");
}

async function downloadPng(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Download ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function processProduct(slug: string, name: string, dose: string) {
  try {
    const taskId = await submitJob(buildPrompt(name, dose));
    const url = await waitForJob(taskId);
    const png = await downloadPng(url);
    const webp = await sharp(png).resize(800, 800, { fit: "cover" }).webp({ quality: 90 }).toBuffer();
    await fs.writeFile(path.join(OUT_DIR, `${slug}.webp`), webp);
    return { slug, ok: true as const };
  } catch (err) {
    return { slug, ok: false as const, error: err instanceof Error ? err.message : String(err) };
  }
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function run() { while (i < items.length) { const idx = i++; results[idx] = await worker(items[idx]); } }
  await Promise.all(Array.from({ length: limit }, run));
  return results;
}

async function main() {
  const arg = process.argv[2];
  const jobs = products
    .filter((p) => !arg || p.slug === arg)
    .map((p) => ({ slug: p.slug, name: p.name, dose: p.variants[0]?.size || "" }));

  if (jobs.length === 0) { console.error(`No product matches "${arg}"`); process.exit(1); }

  console.log(`\nGenerating ${jobs.length} vial${jobs.length === 1 ? "" : "s"} with logo reference (concurrency: ${CONCURRENCY})\n`);

  let done = 0;
  const results = await runWithConcurrency(jobs, CONCURRENCY, async (j) => {
    const r = await processProduct(j.slug, j.name, j.dose);
    done++;
    console.log(`  [${done}/${jobs.length}] ${r.ok ? "✓" : "✗"} ${j.slug}${r.ok ? "" : ` — ${r.error}`}`);
    return r;
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n─── DONE ─── ${results.length - failed.length} ok, ${failed.length} failed`);
  if (failed.length) {
    console.log("\nRe-run:");
    for (const f of failed) console.log(`  npx tsx scripts/gen-vials-with-logo-ref.ts ${f.slug}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
