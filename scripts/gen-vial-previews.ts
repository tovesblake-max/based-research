/**
 * Generate 3 candidate peptide vial product images via Kie.ai GPT-image.
 * Saves to public/images/products/previews/ for user review.
 *
 * Run: npx tsx scripts/gen-vial-previews.ts
 */
import fs from "fs/promises";
import path from "path";

const KIE_KEY = process.env.KIE_API_KEY;
const BASE = "https://api.kie.ai/api/v1/gpt4o-image";

// ── Shared label design (identical across all 3 variants) ─────────────
const LABEL_SPEC = `
The vial has a minimalist pristine white wraparound paper label covering the middle section.
Label typography (exact):
- "BASED RESEARCH" in small refined serif caps at the top, deep navy blue ink (#1E3A5F), generous letter-spacing
- A thin horizontal line divider in pale gray beneath the brand name
- Product name "BPC-157" centered in the middle in a bold modern serif, same navy ink
- "5 mg" directly beneath in thin sans-serif caps, muted gray ink
- One small emerald green circular accent dot (#2D8A6E) at the very top center of the label
- Lot number "LOT 2026-041" and batch code in tiny monospace sans-serif along the bottom edge
The label print quality is crisp and high-end, no misspellings, no garbled letters, clean typography.
`.trim();

const VIAL_SPEC = `
A single premium pharmaceutical glass vial. Clear borosilicate glass, 10mL capacity, approximately 22mm diameter,
with a matte charcoal-gray aluminum flip-off cap and metallic crimp seal. A white rubber stopper is visible
through the transparent glass. Inside, fine bright-white lyophilized peptide powder fills the bottom third
of the vial evenly. The glass is crystal clear, no smudges, no condensation.
`.trim();

const SHARED_QUALITY = `
Ultra-realistic commercial product photography. Tack-sharp focus on the vial. Shot with a Hasselblad H6D-100c,
100mm macro lens, f/11, ISO 64. Award-winning e-commerce product shot aesthetic. Magazine-quality lighting.
8K resolution. No people. No text other than the label. No additional props.
`.trim();

// ── 3 variant styles ───────────────────────────────────────────────────
const variants = [
  {
    id: "classic-white",
    label: "Classic White — pure e-commerce standard",
    style: `
Pure white seamless paper background with the faintest gradient falloff toward the bottom.
Three-point studio lighting: soft key light from upper-left 45 degrees, gentle fill from the right,
subtle rim light catching the curve of the glass. The vial stands upright, three-quarter front angle view,
centered composition. A soft, almost imperceptible round shadow pools beneath the vial on the white surface.
Clean, minimalist, luxurious.
`.trim(),
  },
  {
    id: "soft-gradient",
    label: "Soft Gradient — premium editorial",
    style: `
Seamless background with a subtle gradient from pure white at top to the palest cool blue-gray at bottom.
A single large softbox positioned high-left casts smooth diffused light with a single gentle falloff shadow
extending diagonally from the vial to the lower-right. The vial stands upright, slight three-quarter angle,
positioned slightly off-center to the left (rule of thirds). The glass catches a soft specular highlight
running down its curve. Polished, premium, pharmaceutical-grade feel.
`.trim(),
  },
  {
    id: "marble-surface",
    label: "Marble Surface — sophisticated lab setting",
    style: `
The vial stands on a polished Carrara white marble surface with very subtle natural gray veining.
The background behind is clean soft white, slightly out of focus, giving a shallow depth-of-field effect.
Overhead diffused natural-looking studio lighting from above-center. A crisp but soft shadow pools directly
beneath the vial on the marble. A very faint reflection of the vial appears on the polished marble surface.
Three-quarter front view, slightly from above. Feels like a high-end lab or apothecary.
`.trim(),
  },
];

function buildPrompt(variant: typeof variants[number]): string {
  return [
    VIAL_SPEC,
    "",
    LABEL_SPEC,
    "",
    "STYLING:",
    variant.style,
    "",
    SHARED_QUALITY,
  ].join("\n");
}

// ── API helpers ────────────────────────────────────────────────────────
async function submitJob(prompt: string): Promise<string> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KIE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, size: "1:1" }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(`Submit failed: ${JSON.stringify(data)}`);
  return data.data.taskId;
}

interface PollResult {
  status: string;
  progress: string;
  urls?: string[];
  error?: string;
}

async function pollJob(taskId: string): Promise<PollResult> {
  const res = await fetch(`${BASE}/record-info?taskId=${taskId}`, {
    headers: { "Authorization": `Bearer ${KIE_KEY}` },
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(`Poll failed: ${JSON.stringify(data)}`);
  const d = data.data;
  return {
    status: d.status,
    progress: d.progress,
    urls: d.response?.resultUrls,
    error: d.errorMessage,
  };
}

async function waitForJob(taskId: string, label: string, maxWaitMs = 300_000): Promise<string[]> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const result = await pollJob(taskId);
    const pct = Math.round(parseFloat(result.progress || "0") * 100);
    process.stdout.write(`\r  [${label}] ${result.status} ${pct}%        `);
    if (result.status === "SUCCESS" && result.urls?.length) {
      console.log("");
      return result.urls;
    }
    if (result.status === "FAILED" || result.error) {
      throw new Error(`Job failed: ${result.error || "unknown"}`);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error("Timeout");
}

async function downloadImage(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  const outDir = path.join(process.cwd(), "public", "images", "products", "previews");
  await fs.mkdir(outDir, { recursive: true });

  console.log(`Generating ${variants.length} peptide vial variants...\n`);

  // Submit all in parallel
  const submissions = await Promise.all(
    variants.map(async (v) => {
      const prompt = buildPrompt(v);
      console.log(`[${v.id}] submitting "${v.label}"`);
      const taskId = await submitJob(prompt);
      console.log(`  → taskId: ${taskId}`);
      return { variant: v, taskId };
    })
  );

  console.log("\nAll submitted. Polling for results...\n");

  // Poll all in parallel
  const results = await Promise.all(
    submissions.map(async ({ variant, taskId }) => {
      try {
        const urls = await waitForJob(taskId, variant.id);
        const url = urls[0];
        const destName = `vial-${variant.id}.png`;
        const destPath = path.join(outDir, destName);
        await downloadImage(url, destPath);
        return { variant, ok: true, path: destPath, url };
      } catch (err) {
        return {
          variant,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );

  console.log("\n─────────────────────────────────────────────────────");
  console.log("RESULTS:");
  console.log("─────────────────────────────────────────────────────");
  for (const r of results) {
    if (r.ok && "path" in r) {
      console.log(`✓ ${r.variant.label}`);
      console.log(`  Local: ${r.path}`);
      console.log(`  URL:   ${r.url}\n`);
    } else if (!r.ok && "error" in r) {
      console.log(`✗ ${r.variant.label}`);
      console.log(`  Error: ${r.error}\n`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
