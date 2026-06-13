/**
 * Generate peptide vials with the REAL Based Research logo composited onto them.
 *
 * Pipeline per product:
 *   1. Generate a vial with a BLANK matte-black label (no logo/text — just black)
 *      via Kie.ai GPT-image. Blank label = AI can't mess up typography.
 *   2. Composite the real logo PNG onto the label (upper section)
 *   3. Render product name + dose as actual TEXT via sharp's SVG compositing
 *   4. Save as WebP to public/images/products/{slug}.webp
 *
 * Run: npx tsx scripts/gen-vials-composite.ts [slug]
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { products } from "../src/lib/products";

const KIE_KEY = process.env.KIE_API_KEY;
const BASE = "https://api.kie.ai/api/v1/gpt4o-image";
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "5");

const OUT_DIR = path.join(process.cwd(), "public/images/products");
const LOGO_PATH = path.join(process.cwd(), "public/images/site/logo-mark-clean.png");

// ── Prompt: blank label so AI can't mess up typography ────────────────
function buildPrompt(): string {
  return `
A single premium pharmaceutical glass vial. Small 5mL capacity, roughly 22mm diameter.
Cap: vivid translucent cobalt-blue plastic flip-off top with a metallic silver aluminum
crimp seal visible beneath. Glass body: crystal-clear borosilicate, perfectly clean.
Inside: fine bright-white lyophilized peptide powder fills the bottom third evenly.

LABEL: A COMPLETELY BLANK MATTE BLACK wraparound paper label covers the middle section
of the vial. The label is pure solid matte black with absolutely NO text, NO logos,
NO graphics, NO writing of any kind. Just a clean blank matte-black rectangle wrapped
around the glass. This is critical — the label must be ENTIRELY BLANK.

BACKGROUND: PURE WHITE SEAMLESS background. Completely clean bright white, no texture,
no gradient, no shadow on the backdrop. Soft three-point studio lighting: key from
upper-left 45°, gentle fill from right, subtle rim light catching the blue cap and
glass edge. Very soft, almost invisible round shadow pools directly beneath the vial.
Three-quarter front angle, vial upright and perfectly vertical, centered with empty
white space around it.

STYLE: Ultra-realistic commercial product photography. Tack-sharp focus on the vial.
Hasselblad H6D-100c, 100mm macro lens, f/11, ISO 64. Award-winning e-commerce product
shot aesthetic. Magazine-quality lighting. 8K resolution. No people, no props.

Again: THE LABEL IS BLANK MATTE BLACK WITH NO TEXT OR LOGOS.
`.trim();
}

// ── Kie.ai API ────────────────────────────────────────────────────────
async function submitJob(prompt: string): Promise<string> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${KIE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, size: "1:1" }),
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
    const data = await res.json();
    const d = data.data;
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

// ── Label compositing ─────────────────────────────────────────────────
/**
 * Detect the matte-black label region in the vial image.
 * Scans each row for a continuous horizontal run of near-black pixels.
 * Returns { top, bottom, left, right } of the label bounding box.
 */
async function detectLabelBox(img: Buffer): Promise<{ top: number; bottom: number; left: number; right: number; width: number; height: number }> {
  const { data, info } = await sharp(img).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // For each row, count runs of near-black pixels wider than 30% of image width
  const blackRows: number[] = [];
  const minRunWidth = Math.floor(width * 0.18);

  for (let y = 0; y < height; y++) {
    let runStart = -1;
    let longestRun = { start: 0, end: 0 };
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const isDark = r < 60 && g < 60 && b < 65;
      if (isDark) {
        if (runStart === -1) runStart = x;
      } else {
        if (runStart !== -1) {
          const runLen = x - runStart;
          if (runLen > longestRun.end - longestRun.start) longestRun = { start: runStart, end: x };
          runStart = -1;
        }
      }
    }
    if (runStart !== -1) {
      const runLen = width - runStart;
      if (runLen > longestRun.end - longestRun.start) longestRun = { start: runStart, end: width };
    }
    if (longestRun.end - longestRun.start > minRunWidth) {
      blackRows.push(y);
    }
  }

  if (blackRows.length === 0) throw new Error("Could not detect black label");

  // Label bounds: first/last dark rows
  const top = blackRows[0];
  const bottom = blackRows[blackRows.length - 1];

  // For horizontal bounds, look at the middle dark row
  const midY = Math.floor((top + bottom) / 2);
  let left = width, right = 0;
  for (let x = 0; x < width; x++) {
    const idx = (midY * width + x) * channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    if (r < 60 && g < 60 && b < 65) {
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }

  return { top, bottom, left, right, width: right - left, height: bottom - top };
}

/**
 * Escape text for safe SVG inclusion.
 */
function svgEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Build an SVG overlay for the label: logo at top + product text below.
 * Returns a PNG buffer sized to match the label region.
 */
async function buildLabelOverlay(labelWidth: number, labelHeight: number, productName: string, dose: string): Promise<Buffer> {
  // Design:
  //   Top 55% of label → logo image (teardrop + S + BASED RESEARCH text)
  //   Below logo: thin divider line
  //   Product name (serif italic, white)
  //   "Concentration: {dose}" below (sans-serif, white)
  //   Tiny LOT text at the bottom

  // Logo image height takes roughly 60% of the label
  const logoTargetHeight = Math.floor(labelHeight * 0.58);
  const logoTargetWidth = Math.floor(logoTargetHeight * 0.9); // logo is roughly square

  // Resize logo
  const logoBuf = await sharp(LOGO_PATH)
    .resize(logoTargetWidth, logoTargetHeight, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Build SVG with text elements
  const productFontSize = Math.floor(labelHeight * 0.085);
  const doseFontSize = Math.floor(labelHeight * 0.055);
  const lotFontSize = Math.floor(labelHeight * 0.035);

  const dividerY = Math.floor(labelHeight * 0.6);
  const productY = Math.floor(labelHeight * 0.76);
  const doseY = Math.floor(labelHeight * 0.87);
  const lotY = labelHeight - Math.floor(labelHeight * 0.04);

  const dividerMargin = Math.floor(labelWidth * 0.22);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${labelWidth}" height="${labelHeight}" viewBox="0 0 ${labelWidth} ${labelHeight}">
  <line x1="${dividerMargin}" y1="${dividerY}" x2="${labelWidth - dividerMargin}" y2="${dividerY}" stroke="white" stroke-width="1.2" opacity="0.8" />
  <text x="${labelWidth / 2}" y="${productY}" text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="${productFontSize}"
    fill="white" font-weight="400">${svgEscape(productName)}</text>
  <text x="${labelWidth / 2}" y="${doseY}" text-anchor="middle"
    font-family="Helvetica, Arial, sans-serif" font-size="${doseFontSize}"
    fill="white" font-weight="300">Concentration: ${svgEscape(dose)}</text>
  <text x="${labelWidth / 2}" y="${lotY}" text-anchor="middle"
    font-family="Helvetica, Arial, sans-serif" font-size="${lotFontSize}"
    fill="#cccccc" font-weight="300" letter-spacing="0.5">LOT 2026-041 • BATCH STLW-041</text>
</svg>
`.trim();

  // Composite logo + svg onto transparent canvas sized to the label
  const canvas = sharp({
    create: {
      width: labelWidth,
      height: labelHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const logoX = Math.floor((labelWidth - logoTargetWidth) / 2);
  const logoY = Math.floor(labelHeight * 0.02);

  return canvas
    .composite([
      { input: logoBuf, left: logoX, top: logoY },
      { input: Buffer.from(svg), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

/**
 * Main per-product pipeline: generate blank-label vial, composite logo+text.
 */
async function processProduct(slug: string, name: string, dose: string): Promise<{ slug: string; ok: boolean; error?: string }> {
  try {
    // 1. Generate blank-label vial
    const taskId = await submitJob(buildPrompt());
    const url = await waitForJob(taskId);
    const rawPng = await downloadPng(url);

    // DEBUG: save the raw AI output so we can inspect it
    await fs.writeFile(path.join(OUT_DIR, "_debug", `${slug}-raw.png`), rawPng).catch(() => {});

    // 2. Detect label region
    const box = await detectLabelBox(rawPng);

    // 3. Build label overlay with real logo + text
    const overlay = await buildLabelOverlay(box.width, box.height, name, dose);

    // 4. Composite onto vial
    const composed = await sharp(rawPng)
      .composite([{ input: overlay, left: box.left, top: box.top }])
      .webp({ quality: 90 })
      .toBuffer();

    // 5. Resize to 800×800 standard
    const final = await sharp(composed)
      .resize(800, 800, { fit: "cover" })
      .webp({ quality: 90 })
      .toBuffer();

    await fs.writeFile(path.join(OUT_DIR, `${slug}.webp`), final);
    return { slug, ok: true };
  } catch (err) {
    return { slug, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: limit }, run));
  return results;
}

async function main() {
  const arg = process.argv[2];
  const jobs = products
    .filter((p) => !arg || p.slug === arg)
    .map((p) => ({ slug: p.slug, name: p.name, dose: p.variants[0]?.size || "" }));

  if (jobs.length === 0) {
    console.error(`No products match "${arg}".`);
    process.exit(1);
  }

  console.log(`\nGenerating ${jobs.length} vial${jobs.length === 1 ? "" : "s"} with real logo compositing (concurrency: ${CONCURRENCY})\n`);

  let done = 0;
  const results = await runWithConcurrency(jobs, CONCURRENCY, async (j) => {
    const r = await processProduct(j.slug, j.name, j.dose);
    done++;
    const mark = r.ok ? "✓" : "✗";
    console.log(`  [${done}/${jobs.length}] ${mark} ${j.slug}${r.ok ? "" : ` — ${r.error}`}`);
    return r;
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n─── DONE ─── success: ${results.length - failed.length}, failed: ${failed.length}`);
  if (failed.length) {
    console.log("\nRe-run failed:");
    for (const f of failed) console.log(`  npx tsx scripts/gen-vials-composite.ts ${f.slug}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
