/**
 * Regenerate the glp3-rta vial image with the masked label text.
 * (Old image had "Retatrutide" on the label — this generates one with "GLP-3 RTA 10mg".)
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const KIE_KEY = process.env.KIE_API_KEY;
const BASE = "https://api.kie.ai/api/v1/gpt4o-image";
const LOGO_URL = "https://basedresearch.com/logo-ref.png";
const OUT = path.join(process.cwd(), "public/images/products/glp3-rta.webp");

const prompt = `
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
lighting and curvature.

Below the logo, in clean white printing:
  - A thin white horizontal divider line
  - "GLP-3 RTA" in elegant italic serif
  - "Concentration: 10mg" in thin sans-serif below
  - "LOT 2026-041 · BATCH STLW-041" in tiny text at the bottom edge

The label must NOT contain the word "Retatrutide" anywhere. Only the abbreviated
product code "GLP-3 RTA" and "10mg" dose.

BACKGROUND: Pure white seamless studio background. Soft three-point studio lighting
from upper-left. Subtle shadow pooling directly beneath the vial. Upright,
three-quarter front angle, centered with generous white space around.

STYLE: Ultra-realistic commercial e-commerce product photography. Hasselblad H6D-100c,
100mm macro, f/11. Magazine-quality lighting, 8K resolution, tack sharp.
`.trim();

async function main() {
  console.log("Submitting GLP-3 RTA vial...");
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${KIE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, size: "1:1", filesUrl: [LOGO_URL] }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(JSON.stringify(data));
  const taskId = data.data.taskId;
  console.log(`  taskId: ${taskId}`);

  let imgUrl: string | undefined;
  const start = Date.now();
  while (Date.now() - start < 300_000) {
    const pRes = await fetch(`${BASE}/record-info?taskId=${taskId}`, {
      headers: { "Authorization": `Bearer ${KIE_KEY}` },
    });
    const d = (await pRes.json()).data;
    process.stdout.write(`\r  ${d.status} ${Math.round(parseFloat(d.progress || "0") * 100)}%     `);
    if (d.status === "SUCCESS" && d.response?.resultUrls?.length) { imgUrl = d.response.resultUrls[0]; break; }
    if (d.status === "FAILED") throw new Error(d.errorMessage || "failed");
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (!imgUrl) throw new Error("timeout");
  console.log("");

  const png = await (await fetch(imgUrl)).arrayBuffer();
  const webp = await sharp(Buffer.from(png)).resize(800, 800, { fit: "cover" }).webp({ quality: 90 }).toBuffer();
  await fs.writeFile(OUT, webp);
  console.log(`✓ Wrote ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
