/**
 * Regenerate CJC-1295 and SS-31 vials on-brand (matte black label, white logo,
 * blue flip-off cap, pure white backdrop), saving to the correct filenames
 * per our slug-override mapping.
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const KIE_KEY = process.env.KIE_API_KEY;
const BASE = "https://api.kie.ai/api/v1/gpt4o-image";
const LOGO_URL = "https://basedresearch.com/logo-ref.png";
const OUT_DIR = path.join(process.cwd(), "public/images/products");

const jobs = [
  {
    slug: "cjc-1295",
    productName: "CJC-1295",
    dose: "5mg",
  },
  {
    slug: "ss-31",
    productName: "SS-31 (Elamipretide)",
    dose: "5mg",
  },
];

function buildPrompt(productName: string, dose: string): string {
  return `
Create a photorealistic product photo of a premium pharmaceutical glass vial.

VIAL: 5mL capacity, crystal-clear borosilicate glass. Vivid cobalt-blue translucent
plastic flip-off cap with metallic silver aluminum crimp seal beneath. Fine bright-white
lyophilized peptide powder fills the bottom third of the vial evenly.

LABEL: Matte black wraparound paper label covering the middle section. The label must
prominently display the EXACT LOGO from the reference image I've provided — reproduce
it faithfully: the stylized teardrop/waterdrop containing a symmetrical S-shaped
molecule of circles connected by lines, with "BASED" in bold caps and "RESEARCH"
in thin letter-spaced caps below, all in clean white ink on the matte black label.
The logo must look naturally wrapped around the cylindrical glass with realistic
lighting and curvature — brighter where light hits, gently darker at the edges where
the cylinder curves away.

Below the logo, in clean white printing:
  - A thin white horizontal divider line
  - "${productName}" in elegant italic serif
  - "Concentration: ${dose}" in thin sans-serif below
  - "LOT 2026-041 · BATCH STLW-041" in tiny text at the bottom edge

BACKGROUND: Pure white seamless studio background, completely clean. Soft three-point
studio lighting with gentle key from upper-left. Subtle shadow pooling directly
beneath the vial. Upright, three-quarter front angle, centered with generous white
space around.

STYLE: Ultra-realistic commercial e-commerce product photography. Hasselblad H6D-100c,
100mm macro, f/11. Magazine-quality lighting, 8K resolution, tack sharp.
`.trim();
}

async function submit(prompt: string): Promise<string> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${KIE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, size: "1:1", filesUrl: [LOGO_URL] }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(JSON.stringify(data));
  return data.data.taskId;
}

async function waitFor(taskId: string): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < 300_000) {
    const res = await fetch(`${BASE}/record-info?taskId=${taskId}`, {
      headers: { "Authorization": `Bearer ${KIE_KEY}` },
    });
    const d = (await res.json()).data;
    if (d.status === "SUCCESS" && d.response?.resultUrls?.length) return d.response.resultUrls[0];
    if (d.status === "FAILED") throw new Error(d.errorMessage || "failed");
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("timeout");
}

async function runJob(job: typeof jobs[number]) {
  console.log(`[${job.slug}] submitting...`);
  const taskId = await submit(buildPrompt(job.productName, job.dose));
  const url = await waitFor(taskId);
  const png = await (await fetch(url)).arrayBuffer();
  const webp = await sharp(Buffer.from(png)).resize(800, 800, { fit: "cover" }).webp({ quality: 90 }).toBuffer();
  const dest = path.join(OUT_DIR, `${job.slug}.webp`);
  await fs.writeFile(dest, webp);
  console.log(`[${job.slug}] ✓ wrote ${dest}`);
}

async function main() {
  // Run both in parallel
  const results = await Promise.allSettled(jobs.map(runJob));
  for (const r of results) {
    if (r.status === "rejected") console.error("Failed:", r.reason);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
