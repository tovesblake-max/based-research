/**
 * Batch-generate all 45 peptide vial product images via Kie.ai GPT-image.
 * Style: matte black label, white typography, blue flip-off cap, PURE WHITE backdrop.
 * Converts PNG → WebP and writes to public/images/products/{slug}.webp.
 *
 * Usage:
 *   npx tsx scripts/gen-all-vials.ts          # all 45
 *   npx tsx scripts/gen-all-vials.ts bpc-157  # one specific product
 *   CONCURRENCY=6 npx tsx scripts/gen-all-vials.ts
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { products } from "../src/lib/products";

const KIE_KEY = process.env.KIE_API_KEY;
const BASE = "https://api.kie.ai/api/v1/gpt4o-image";
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "5");
const OUT_DIR = path.join(process.cwd(), "public", "images", "products");
const BACKUP_DIR = path.join(OUT_DIR, "_old-backup");

// ── Prompt construction per product ────────────────────────────────────
function buildPrompt(productName: string, dose: string): string {
  return `
VIAL: A single premium pharmaceutical glass vial, approximately 5mL capacity. The cap is a vivid translucent cobalt-blue plastic flip-off top with a metallic silver aluminum crimp seal beneath. Crystal-clear borosilicate glass body. Inside, fine bright-white lyophilized peptide powder fills the bottom third of the vial evenly.

LABEL: A MATTE BLACK wraparound paper label covers the middle section of the vial. The label is pure matte black with crisp bright white ink printing. Every detail is razor sharp and legible.

LABEL DESIGN (top to bottom, centered):
1. At the top center, a stylized TEARDROP / WATER-DROP SHAPE outlined in white, about 24mm tall. Inside the droplet: a MOLECULAR DIAGRAM of five small solid white circles (atoms) connected by thin white lines, arranged in an elegant S-curve / sigmoid shape (like a peptide chain or the letter S).
2. Below the droplet logo: "BASED" in large BOLD CONDENSED SANS-SERIF CAPS in crisp bright white.
3. Immediately below in smaller size: "RESEARCH" in thin light sans-serif caps with wide letter-spacing, white.
4. Thin horizontal white line divider.
5. Product name "${productName}" in an elegant italic modern serif, crisp bright white, larger than RESEARCH text.
6. Beneath the product name: "Concentration: ${dose}" in a clean sans-serif, smaller and thinner, crisp bright white.
7. Along the bottom edge: tiny "LOT 2026-041  •  BATCH STLW-041" in white, very small but legible.

NO gold, NO bronze, NO yellow. Label uses ONLY matte black background with pure bright white ink. NO misspellings. Typography crisp and perfectly kerned.

BACKGROUND: PURE WHITE SEAMLESS background. Completely clean bright white with no texture, no gradient, no shadow on the backdrop. Three-point studio lighting: soft key light from upper-left 45°, gentle fill from right, subtle rim light on the blue cap and glass edge. A soft, very subtle, almost invisible round shadow pools directly beneath the vial. Three-quarter front angle, vial upright and perfectly vertical, centered in the frame. Some empty white space around the vial.

STYLE: Ultra-realistic commercial product photography. Tack-sharp focus. Hasselblad H6D-100c, 100mm macro, f/11, ISO 64. Award-winning e-commerce product shot. Magazine-quality lighting. 8K resolution. No people, no props, clean minimalist composition. Label text must be perfectly legible.
`.trim();
}

// ── API helpers ────────────────────────────────────────────────────────
async function submitJob(prompt: string): Promise<string> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${KIE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, size: "1:1" }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(`Submit failed: ${JSON.stringify(data)}`);
  return data.data.taskId;
}

async function pollJob(taskId: string) {
  const res = await fetch(`${BASE}/record-info?taskId=${taskId}`, {
    headers: { "Authorization": `Bearer ${KIE_KEY}` },
  });
  const data = await res.json();
  const d = data.data;
  return { status: d.status as string, progress: d.progress as string, urls: d.response?.resultUrls as string[] | undefined, error: d.errorMessage as string | null };
}

async function waitForJob(taskId: string, maxWaitMs = 300_000): Promise<string[]> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const r = await pollJob(taskId);
    if (r.status === "SUCCESS" && r.urls?.length) return r.urls;
    if (r.status === "FAILED" || r.error) throw new Error(r.error || "failed");
    await new Promise((res) => setTimeout(res, 5000));
  }
  throw new Error("timeout");
}

async function downloadPng(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Per-product pipeline ───────────────────────────────────────────────
interface ProductJob { slug: string; name: string; dose: string }

async function processProduct(p: ProductJob): Promise<{ slug: string; ok: boolean; error?: string }> {
  try {
    const prompt = buildPrompt(p.name, p.dose);
    const taskId = await submitJob(prompt);
    const urls = await waitForJob(taskId);
    const png = await downloadPng(urls[0]);

    // Convert PNG → WebP (quality 90, resize to 800×800 for consistency)
    const webp = await sharp(png)
      .resize(800, 800, { fit: "cover" })
      .webp({ quality: 90 })
      .toBuffer();

    const dest = path.join(OUT_DIR, `${p.slug}.webp`);
    await fs.writeFile(dest, webp);
    return { slug: p.slug, ok: true };
  } catch (err) {
    return { slug: p.slug, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Simple parallel runner ─────────────────────────────────────────────
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

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv[2];
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  // Backup existing images on first run
  const existing = await fs.readdir(OUT_DIR);
  for (const f of existing) {
    if (f.endsWith(".webp") && !f.startsWith("_")) {
      const backupPath = path.join(BACKUP_DIR, f);
      try {
        await fs.access(backupPath);
      } catch {
        await fs.copyFile(path.join(OUT_DIR, f), backupPath);
      }
    }
  }
  console.log(`→ Backed up existing images to ${path.relative(process.cwd(), BACKUP_DIR)}/`);

  // Build job list
  const jobs: ProductJob[] = products
    .filter((p) => !arg || p.slug === arg)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      // First variant size (e.g., "5mg") — this is what appears on the label
      dose: p.variants[0]?.size || "",
    }));

  if (jobs.length === 0) {
    console.error(`No products matched "${arg}".`);
    process.exit(1);
  }

  console.log(`\nGenerating ${jobs.length} vial image${jobs.length === 1 ? "" : "s"} (concurrency: ${CONCURRENCY})...\n`);

  let done = 0;
  const results = await runWithConcurrency(jobs, CONCURRENCY, async (j) => {
    const r = await processProduct(j);
    done++;
    const mark = r.ok ? "✓" : "✗";
    const suffix = r.ok ? "" : ` — ${r.error}`;
    console.log(`  [${done}/${jobs.length}] ${mark} ${j.slug}${suffix}`);
    return r;
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n─── DONE ───`);
  console.log(`  Success: ${results.length - failed.length}`);
  console.log(`  Failed:  ${failed.length}`);
  if (failed.length > 0) {
    console.log(`\nRe-run failed ones individually with:`);
    for (const f of failed) console.log(`  npx tsx scripts/gen-all-vials.ts ${f.slug}`);
  }
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
