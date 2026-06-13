/**
 * Test cylindrical warp + lighting match on the existing Semaglutide generation.
 *
 * Pipeline:
 *   1. Take the raw AI-generated blank-label vial
 *   2. Detect the label region + sample the lighting gradient across it
 *   3. Build the overlay (logo + text)
 *   4. Apply cylindrical warp — horizontal compression at edges
 *   5. Apply lighting multiply — darken edges where vial curves away from light
 *   6. Composite with "multiply" blend mode so shadows show through
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const OUT_DIR = path.join(process.cwd(), "public/images/products");
const LOGO_PATH = path.join(process.cwd(), "public/images/site/logo-mark-clean.png");
const RAW_PATH = path.join(OUT_DIR, "_debug/semaglutide-raw.png");
const TEST_OUT = path.join(OUT_DIR, "_debug/semaglutide-warped.png");

/**
 * Detect the matte-black label region. Returns full bounding box + per-row
 * left/right edges so we know the curvature profile.
 */
async function detectLabel(img: Buffer) {
  const { data, info } = await sharp(img).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // For each row, find the leftmost and rightmost dark pixel in the longest run
  const rowBounds: Array<{ y: number; left: number; right: number } | null> = [];

  for (let y = 0; y < height; y++) {
    let bestRun = { start: -1, end: -1 };
    let runStart = -1;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (r < 60 && g < 60 && b < 65) {
        if (runStart === -1) runStart = x;
      } else {
        if (runStart !== -1 && x - runStart > bestRun.end - bestRun.start) {
          bestRun = { start: runStart, end: x };
        }
        runStart = -1;
      }
    }
    if (runStart !== -1 && width - runStart > bestRun.end - bestRun.start) {
      bestRun = { start: runStart, end: width };
    }

    if (bestRun.end - bestRun.start > width * 0.18) {
      rowBounds.push({ y, left: bestRun.start, right: bestRun.end });
    } else {
      rowBounds.push(null);
    }
  }

  // Find the continuous label-row region (largest run of non-null)
  let bestStart = -1, bestEnd = -1, curStart = -1;
  for (let i = 0; i < rowBounds.length; i++) {
    if (rowBounds[i]) {
      if (curStart === -1) curStart = i;
      if (i - curStart > bestEnd - bestStart) { bestStart = curStart; bestEnd = i; }
    } else {
      curStart = -1;
    }
  }

  const topY = bestStart;
  const bottomY = bestEnd;
  const midY = Math.floor((topY + bottomY) / 2);
  const midRow = rowBounds[midY]!;
  const labelWidth = midRow.right - midRow.left;
  const labelHeight = bottomY - topY;

  // Sample the lighting gradient across the label horizontally at midY
  const lightingProfile: number[] = []; // 0..255 per column
  for (let x = midRow.left; x < midRow.right; x++) {
    // Sample a few rows above the label (where glass reflects light) to gauge lighting
    let sum = 0, count = 0;
    const sampleY = Math.max(0, topY - 10);
    for (let dy = -3; dy <= 3; dy++) {
      const y = sampleY + dy;
      if (y < 0 || y >= height) continue;
      const idx = (y * width + x) * channels;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      sum += lum;
      count++;
    }
    lightingProfile.push(count ? sum / count : 128);
  }

  return {
    topY, bottomY,
    left: midRow.left, right: midRow.right,
    width: labelWidth, height: labelHeight,
    lightingProfile,
    rowBounds: rowBounds.slice(topY, bottomY + 1), // per-row left/right for warping
  };
}

/**
 * Build the flat overlay (logo + text on transparent bg) at the target size.
 */
async function buildFlatOverlay(w: number, h: number, productName: string, dose: string): Promise<Buffer> {
  const logoHeight = Math.floor(h * 0.62);
  const logoWidth = Math.floor(logoHeight * 0.9);
  const logoBuf = await sharp(LOGO_PATH)
    .resize(logoWidth, logoHeight, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const productFontSize = Math.floor(h * 0.085);
  const doseFontSize = Math.floor(h * 0.055);
  const lotFontSize = Math.floor(h * 0.035);

  const dividerY = Math.floor(h * 0.64);
  const productY = Math.floor(h * 0.78);
  const doseY = Math.floor(h * 0.89);
  const lotY = h - Math.floor(h * 0.04);
  const dividerMargin = Math.floor(w * 0.22);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <line x1="${dividerMargin}" y1="${dividerY}" x2="${w - dividerMargin}" y2="${dividerY}" stroke="white" stroke-width="1.2" opacity="0.8"/>
    <text x="${w / 2}" y="${productY}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="${productFontSize}" fill="white">${productName}</text>
    <text x="${w / 2}" y="${doseY}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="${doseFontSize}" fill="white">Concentration: ${dose}</text>
    <text x="${w / 2}" y="${lotY}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="${lotFontSize}" fill="#cccccc" letter-spacing="0.5">LOT 2026-041 • BATCH STLW-041</text>
  </svg>`;

  const logoX = Math.floor((w - logoWidth) / 2);
  const logoY = Math.floor(h * 0.02);

  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: logoBuf, left: logoX, top: logoY },
      { input: Buffer.from(svg), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

/**
 * Apply a cylindrical warp: compress horizontally toward the edges so the
 * flat overlay looks like it's wrapped around a cylinder. Also darken the edges
 * to simulate light falloff around the vial's curvature.
 *
 * Uses raw pixel manipulation: for each destination column x in [0, w],
 * sample the source at x' = center + (x - center) / cos(angle) — but we clamp
 * the effective width so we don't over-sample.
 *
 * Simpler approximation: we use a sine-based squeeze.
 */
async function cylindricalWarp(flat: Buffer, w: number, h: number): Promise<Buffer> {
  const { data: srcData } = await sharp(flat).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = 4;
  const dst = Buffer.alloc(w * h * channels);

  // Cylindrical projection: the visible portion of the cylinder subtends some
  // angle. We assume the label wraps ~140° of the cylinder in the visible view.
  // For each destination x, compute the angle and sample source.
  const maxAngle = (140 * Math.PI) / 180; // total visible angle
  const halfW = w / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Map x to angle: x=0 → -maxAngle/2, x=w → +maxAngle/2
      const normalizedX = (x - halfW) / halfW; // -1..1
      const angle = (normalizedX * maxAngle) / 2;
      // On a flat wrap, the source position would be: sin(angle) * radius
      // Normalized source x (0..1): (sin(angle) / sin(maxAngle/2) + 1) / 2
      const srcNormX = (Math.sin(angle) / Math.sin(maxAngle / 2) + 1) / 2;
      const srcX = Math.round(srcNormX * (w - 1));
      const srcXClamped = Math.max(0, Math.min(w - 1, srcX));

      // Lighting: darker at the edges (cosine of angle)
      const lightFactor = Math.cos(angle) * 0.3 + 0.7; // 0.7 at edges, 1.0 at center

      const srcIdx = (y * w + srcXClamped) * channels;
      const dstIdx = (y * w + x) * channels;

      dst[dstIdx] = Math.round(srcData[srcIdx] * lightFactor);
      dst[dstIdx + 1] = Math.round(srcData[srcIdx + 1] * lightFactor);
      dst[dstIdx + 2] = Math.round(srcData[srcIdx + 2] * lightFactor);
      dst[dstIdx + 3] = srcData[srcIdx + 3];
    }
  }

  return sharp(dst, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function main() {
  const rawPng = await fs.readFile(RAW_PATH);
  const label = await detectLabel(rawPng);
  console.log(`Label: ${label.left},${label.topY} → ${label.right},${label.bottomY} (${label.width}×${label.height})`);
  console.log(`Lighting profile samples: left=${Math.round(label.lightingProfile[0])} mid=${Math.round(label.lightingProfile[Math.floor(label.lightingProfile.length / 2)])} right=${Math.round(label.lightingProfile[label.lightingProfile.length - 1])}`);

  // 1. Build the flat overlay at label size
  const flat = await buildFlatOverlay(label.width, label.height, "Semaglutide", "5mg");

  // 2. Warp it cylindrically + apply lighting falloff
  const warped = await cylindricalWarp(flat, label.width, label.height);

  // 3. Composite onto the vial
  const composed = await sharp(rawPng)
    .composite([{ input: warped, left: label.left, top: label.topY }])
    .png()
    .toBuffer();

  await fs.writeFile(TEST_OUT, composed);
  console.log(`Wrote ${TEST_OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
