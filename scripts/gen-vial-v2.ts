/**
 * V2: peptide vial matching the real Based Research reference —
 * matte black label, white ink typography, blue flip-off cap, water-droplet logo.
 */
import fs from "fs/promises";
import path from "path";

const KIE_KEY = process.env.KIE_API_KEY;
const BASE = "https://api.kie.ai/api/v1/gpt4o-image";

// ── Shared vial + label spec (all variants identical) ─────────────────
const VIAL_SPEC = `
A single premium pharmaceutical glass vial, approximately 5mL capacity, 22mm tall.
The cap is a vivid translucent cobalt-blue plastic flip-off top with a metallic silver
aluminum crimp seal visible beneath. The glass body is crystal-clear borosilicate,
no smudges. Inside, fine bright-white lyophilized peptide powder fills the bottom
third of the vial evenly.
`.trim();

const LABEL_SPEC = `
A MATTE BLACK wraparound paper label covers the middle section of the vial. The label
is pure matte black with crisp, crisp bright white ink printing. Every detail must
be razor sharp and legible.

LABEL DESIGN (top to bottom, centered):

1. At the top center, a stylized TEARDROP / WATER-DROP SHAPE outlined in metallic
   white ink, about 24mm tall. Inside the droplet is a MOLECULAR DIAGRAM: five small
   solid white circles (atoms) connected by thin white lines, arranged in an elegant
   S-curve / sigmoid shape (mimicking a peptide chain or the letter S).

2. Directly beneath the droplet logo: the word "BASED" in large BOLD CONDENSED
   SANS-SERIF CAPS in bright crisp bright white ink, spanning most of the label width.

3. Immediately below in smaller size: "RESEARCH" in thin light sans-serif caps with
   wide letter-spacing, in white ink.

4. A thin horizontal white ink line divider below that.

5. Product name "Semaglutide" in an elegant italic modern serif script, crisp white
   foil, larger than the RESEARCH text.

6. Beneath the product name: "Concentration: 5 mg" in a clean white or white
   sans-serif, smaller and thinner.

7. Along the bottom edge: tiny monospace text "LOT 2026-041  •  BATCH STLW-5M-041"
   in muted white/gray, very small but legible.

Label has a premium apothecary / pharmaceutical luxury feel. NO misspellings.
Typography must be crisp and perfectly kerned.
`.trim();

const SHARED_QUALITY = `
Ultra-realistic commercial product photography. Tack-sharp focus on the vial.
Hasselblad H6D-100c, 100mm macro lens, f/11, ISO 64. Award-winning e-commerce
product shot aesthetic. Magazine-quality lighting. 8K resolution. Three-quarter
front angle view, vial upright and perfectly vertical. No people. No additional
props beyond what's specified below. Label text must be perfectly legible.
`.trim();

// ── 3 background variants ──────────────────────────────────────────────
const variants = [
  {
    id: "seamless-white",
    label: "Seamless White — clean e-commerce standard",
    style: `
Pure white seamless paper background with the faintest gradient falloff toward the
bottom. Soft three-point studio lighting: key light from upper-left at 45°, gentle
fill from the right, subtle rim light catching the blue cap and the curve of the glass.
A soft, almost imperceptible round shadow pools beneath the vial. The crisp white
white printing on the matte black label is crisp and legible. Clean, minimalist, premium.
    `.trim(),
  },
  {
    id: "brushed-steel",
    label: "Brushed Steel — lab/industrial (matches reference)",
    style: `
The vial stands on a polished brushed stainless-steel surface with very fine linear
grain visible, slightly reflective. The background is a soft dark-gray blurred
pharmaceutical lab environment with hints of warm white and cool blue-white ambient
light. A single soft overhead key light catches the blue cap and the white ink of the
label. A clean soft shadow pools beneath the vial on the
steel. A subtle reflection of the vial appears on the brushed metal. Industrial,
premium, pharmaceutical-grade feel, matches a research lab aesthetic.
    `.trim(),
  },
  {
    id: "dark-moody",
    label: "Dark Moody — editorial apothecary",
    style: `
Deep charcoal-black seamless background with a subtle radial vignette that falls off
to near-black at the edges. Single dramatic side-light from the upper-left casting a
soft diagonal shadow across a polished dark surface. The white ink on the matte black
label reads as clean bright white against the dark surround. The blue cap pops as a single cool
accent. Editorial, luxurious, high-end apothecary feel. Dramatic but clean.
    `.trim(),
  },
];

function buildPrompt(v: typeof variants[number]): string {
  return [VIAL_SPEC, "", LABEL_SPEC, "", "STYLING:", v.style, "", SHARED_QUALITY].join("\n");
}

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

interface PollResult { status: string; progress: string; urls?: string[]; error?: string }
async function pollJob(taskId: string): Promise<PollResult> {
  const res = await fetch(`${BASE}/record-info?taskId=${taskId}`, {
    headers: { "Authorization": `Bearer ${KIE_KEY}` },
  });
  const data = await res.json();
  const d = data.data;
  return { status: d.status, progress: d.progress, urls: d.response?.resultUrls, error: d.errorMessage };
}

async function waitForJob(taskId: string, label: string, maxWaitMs = 300_000): Promise<string[]> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const r = await pollJob(taskId);
    const pct = Math.round(parseFloat(r.progress || "0") * 100);
    process.stdout.write(`\r  [${label}] ${r.status} ${pct}%        `);
    if (r.status === "SUCCESS" && r.urls?.length) { console.log(""); return r.urls; }
    if (r.status === "FAILED" || r.error) throw new Error(`Job failed: ${r.error || "unknown"}`);
    await new Promise((res) => setTimeout(res, 4000));
  }
  throw new Error("Timeout");
}

async function downloadImage(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const outDir = path.join(process.cwd(), "public", "images", "products", "previews");
  await fs.mkdir(outDir, { recursive: true });
  console.log(`Generating ${variants.length} v2 vials (matte black, white ink, blue cap)...\n`);

  const submissions = await Promise.all(
    variants.map(async (v) => {
      console.log(`[${v.id}] submitting "${v.label}"`);
      const taskId = await submitJob(buildPrompt(v));
      console.log(`  → taskId: ${taskId}`);
      return { variant: v, taskId };
    })
  );

  console.log("\nAll submitted. Polling...\n");
  const results = await Promise.all(
    submissions.map(async ({ variant, taskId }) => {
      try {
        const urls = await waitForJob(taskId, variant.id);
        const destPath = path.join(outDir, `vial-v3-${variant.id}.png`);
        await downloadImage(urls[0], destPath);
        return { variant, ok: true as const, path: destPath, url: urls[0] };
      } catch (err) {
        return { variant, ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    })
  );

  console.log("\n─── RESULTS ───");
  for (const r of results) {
    if (r.ok) {
      console.log(`✓ ${r.variant.label}`);
      console.log(`  ${r.path}\n`);
    } else {
      console.log(`✗ ${r.variant.label}`);
      console.log(`  ${r.error}\n`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
