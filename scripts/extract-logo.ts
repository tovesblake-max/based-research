/**
 * Extract a clean transparent logo mark from the reference PNG.
 * The source logo is on a dark square background — we'll:
 *   1. Crop to just the logo mark (teardrop + S + ripples + text)
 *   2. Make the dark background transparent (treat near-black as alpha=0)
 *   3. Save as logo-mark-transparent.png
 *
 * Actually — simpler approach: keep the dark label-matching background since
 * the vial label IS matte black. We just need the logo rendered at the right size.
 * We'll crop the source (which is already on dark bg) and use it as-is.
 *
 * Run: npx tsx scripts/extract-logo.ts
 */
import sharp from "sharp";
import path from "path";

async function main() {
  const src = path.join(process.cwd(), "public/images/site/logo-mark.png");
  const outFull = path.join(process.cwd(), "public/images/site/logo-mark-clean.png");
  const outMark = path.join(process.cwd(), "public/images/site/logo-mark-only.png");

  const meta = await sharp(src).metadata();
  console.log(`Source: ${meta.width}x${meta.height}`);

  // Save a cleaned version with transparency (dark background → alpha 0).
  // This uses sharp's flatten/composite tricks. We extract the logo by:
  // reading pixel data, making near-black (value < 30) transparent.
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Replace near-black pixels with transparent
  const channels = info.channels;
  const newData = Buffer.from(data);
  for (let i = 0; i < newData.length; i += channels) {
    const r = newData[i];
    const g = newData[i + 1];
    const b = newData[i + 2];
    // If pixel is very dark (background), make it transparent
    if (r < 40 && g < 40 && b < 50) {
      newData[i + 3] = 0;
    }
  }

  await sharp(newData, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toFile(outFull);
  console.log(`Wrote transparent full logo → ${outFull}`);

  // Also extract just the mark (upper portion — teardrop + S, no text).
  // Assume the top ~60% of the image is the mark, bottom ~40% is the text.
  const h = info.height;
  const markHeight = Math.floor(h * 0.62);
  await sharp(newData, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .extract({ left: 0, top: 0, width: info.width, height: markHeight })
    .png()
    .toFile(outMark);
  console.log(`Wrote transparent mark-only → ${outMark}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
