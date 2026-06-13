/**
 * Generate product images for the two new accessories (syringes + swabs).
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const KIE_KEY = process.env.KIE_API_KEY;
const BASE = "https://api.kie.ai/api/v1/gpt4o-image";
const OUT_DIR = path.join(process.cwd(), "public/images/products");

const jobs = [
  {
    slug: "syringe-kit",
    prompt: `Create a photorealistic commercial product photo of a pack of sterile insulin
syringes. A fan-layout of 10 individually foil-pouched 1mL insulin syringes arranged
slightly overlapping, plus one syringe in front of the pack with its blue protective
cap visible and clear mL graduations on the barrel. Clean white seamless background.
Soft three-point studio lighting from upper-left. Subtle shadow beneath.
Ultra-realistic commercial e-commerce product photography, 8K resolution. No text,
no labels on the pouches — just the sterile pharmaceutical-grade appearance of
foil-packaged syringes.`.trim(),
  },
  {
    slug: "alcohol-swabs",
    prompt: `Create a photorealistic commercial product photo of a box of 100 individually-
wrapped sterile alcohol prep pads. A clean matte black cardboard box (closed) labeled
simply "BASED RESEARCH" in white caps at the top, with several individual foil-
pouched square alcohol prep pads fanned in front of the box. Each foil pouch is
silver/metallic with "70% ISOPROPYL ALCOHOL" printed in small white sans-serif.
Pure white seamless background. Soft three-point studio lighting from upper-left.
Subtle shadow beneath. Ultra-realistic commercial e-commerce product photography,
8K resolution.`.trim(),
  },
];

async function submit(prompt: string): Promise<string> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${KIE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, size: "1:1" }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(JSON.stringify(data));
  return data.data.taskId;
}

async function waitFor(taskId: string): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < 300_000) {
    const r = await fetch(`${BASE}/record-info?taskId=${taskId}`, {
      headers: { "Authorization": `Bearer ${KIE_KEY}` },
    });
    const d = (await r.json()).data;
    if (d.status === "SUCCESS" && d.response?.resultUrls?.length) return d.response.resultUrls[0];
    if (d.status === "FAILED") throw new Error(d.errorMessage || "failed");
    await new Promise((res) => setTimeout(res, 5000));
  }
  throw new Error("timeout");
}

async function runJob(j: typeof jobs[number]) {
  console.log(`[${j.slug}] submitting...`);
  const taskId = await submit(j.prompt);
  const url = await waitFor(taskId);
  const png = await (await fetch(url)).arrayBuffer();
  const webp = await sharp(Buffer.from(png))
    .resize(800, 800, { fit: "cover" })
    .webp({ quality: 90 })
    .toBuffer();
  await fs.writeFile(path.join(OUT_DIR, `${j.slug}.webp`), webp);
  console.log(`[${j.slug}] ✓`);
}

async function main() {
  await Promise.allSettled(jobs.map(runJob));
}

main().catch((e) => { console.error(e); process.exit(1); });
