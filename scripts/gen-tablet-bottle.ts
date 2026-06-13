/**
 * Regenerate BPC-157 Tablets as a supplement bottle (not a vial).
 * Uses the real logo as a reference image via Kie.ai filesUrl.
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const KIE_KEY = process.env.KIE_API_KEY;
const BASE = "https://api.kie.ai/api/v1/gpt4o-image";
const LOGO_URL = "https://basedresearch.com/logo-ref.png";
const OUT = path.join(process.cwd(), "public/images/products/bpc-157-tablets.webp");

const prompt = `
Create a photorealistic product photo of a premium pharmaceutical-grade amber glass
supplement / pill bottle — NOT a small injection vial.

BOTTLE: A standard 60-tablet amber brown glass supplement bottle, approximately
100mm tall and 55mm wide, with a clean white plastic child-resistant screw-on cap.
The amber glass has a rich warm brown color and is slightly translucent — you can
faintly see the white round tablets inside through the glass.

LABEL: A matte black wraparound paper label covers about 70% of the bottle's middle
section. The label must prominently display the EXACT LOGO from the reference image
I've provided — reproduce it faithfully: the stylized teardrop/waterdrop containing
a symmetrical S-shaped molecule of circles connected by lines, with "BASED" in
bold caps and "RESEARCH" in thin letter-spaced caps below, all in clean white ink on
the matte black label. The logo must appear naturally wrapped around the cylindrical
bottle with realistic lighting and curvature — brighter where light hits, gently
darker where the cylinder curves away.

Below the logo, in clean white printing:
  - A thin white horizontal divider line
  - "BPC-157 Tablets" in elegant italic serif
  - "500mcg × 60 tablets" in thin sans-serif below
  - "LOT 2026-041 · BATCH STLW-041" in tiny text along the bottom edge of the label

BACKGROUND: Pure white seamless studio background, completely clean. Soft three-point
studio lighting with a gentle key from upper-left. Subtle, almost invisible shadow
pooling directly beneath the bottle. Bottle upright, three-quarter front angle,
centered with generous white space around it.

STYLE: Ultra-realistic commercial e-commerce product photography. Hasselblad H6D-100c,
100mm macro, f/11. Magazine-quality lighting, 8K resolution, tack sharp. No people,
no props, no additional text beyond what's specified. This is a supplement bottle
with pills inside — NOT a glass injection vial.
`.trim();

async function main() {
  console.log("Submitting tablet-bottle generation...");
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
