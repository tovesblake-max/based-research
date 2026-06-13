#!/usr/bin/env node

/**
 * Based Research — Product Mockup Generator
 *
 * Takes a blank vial template image and composites branded labels onto it
 * using node-canvas for label rendering and ImageMagick for perspective
 * distortion + compositing.
 *
 * Usage: node generate-mockups.js
 */

const { createCanvas, registerFont } = require("canvas");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ── CONFIG ──────────────────────────────────────────────────
const BASE_VIAL = path.join(__dirname, "blank-vial-v1.png");
const OUTPUT_DIR = path.join(__dirname, "../../public/images/products");
const TEMP_DIR = path.join(__dirname, "temp");
const VIAL_SIZE = 1024; // base image is 1024x1024

// Label placement on the vial (measured from blank-vial-v1.png)
// The white label area sits roughly:
//   x: 350 to 680 (width ~330px)
//   y: 310 to 700 (height ~390px)
const LABEL = {
  x: 348,
  y: 305,
  width: 335,
  height: 400,
};

// Brand colors
const NAVY = "#1E3A5F";
const WHITE = "#FFFFFF";
const LIGHT_GRAY = "#F0F0F0";
const MUTED = "#8899AA";

// ── PRODUCTS ────────────────────────────────────────────────
const products = [
  // Tissue Repair
  { slug: "bpc-157", name: "BPC-157", dose: "5 mg" },
  { slug: "tb-500", name: "TB-500", dose: "5 mg" },
  { slug: "pentadecarginine", name: "Pentadecarginine", dose: "5 mg" },
  // Weight Management
  { slug: "semaglutide", name: "Semaglutide", dose: "5 mg" },
  { slug: "tirzepatide", name: "Tirzepatide", dose: "10 mg" },
  { slug: "retatrutide", name: "Retatrutide", dose: "10 mg" },
  { slug: "aod-9604", name: "AOD-9604", dose: "5 mg" },
  // Endocrinology
  { slug: "cjc-1295", name: "CJC-1295", dose: "5 mg" },
  { slug: "ipamorelin", name: "Ipamorelin", dose: "5 mg" },
  { slug: "tesamorelin", name: "Tesamorelin", dose: "5 mg" },
  { slug: "sermorelin", name: "Sermorelin", dose: "5 mg" },
  // Anti-Aging / Longevity
  { slug: "ghk-cu", name: "GHK-Cu", dose: "50 mg" },
  { slug: "epithalon", name: "Epithalon", dose: "10 mg" },
  { slug: "nad-plus", name: "NAD+", dose: "500 mg" },
  // Reproductive
  { slug: "pt-141", name: "PT-141", dose: "10 mg" },
  // Blends
  { slug: "bpc-157-tb-500-blend", name: "BPC-157 +\nTB-500", dose: "10 mg", sub: "Blend" },
  { slug: "cjc-1295-ipamorelin-blend", name: "CJC-1295 +\nIpamorelin", dose: "10 mg", sub: "Blend" },
  { slug: "tesamorelin-ipamorelin-blend", name: "Tesamorelin +\nIpamorelin", dose: "8 mg", sub: "Blend" },
  { slug: "recovery-tri-blend", name: "Recovery\nTri-Blend", dose: "15 mg", sub: "Blend" },
  // Anti-inflammatory
  { slug: "kpv", name: "KPV", dose: "5 mg" },
  { slug: "vip", name: "VIP", dose: "5 mg" },
  // Immunomodulator
  { slug: "thymalin", name: "Thymalin", dose: "10 mg" },
  { slug: "thymosin-alpha-1", name: "Thymosin\nAlpha-1", dose: "5 mg" },
  // Sleep
  { slug: "dsip", name: "DSIP", dose: "5 mg" },
  // Nootropic
  { slug: "selank", name: "Selank", dose: "5 mg" },
  { slug: "semax", name: "Semax", dose: "5 mg" },
  // Reproductive
  { slug: "oxytocin", name: "Oxytocin", dose: "5 mg" },
  // Energy
  { slug: "mots-c", name: "MOTS-c", dose: "5 mg" },
  // Bone
  { slug: "ptd-dbm", name: "PTD-DBM", dose: "10 mg" },
  // Longevity
  { slug: "foxo4-dri", name: "FOXO4-DRI", dose: "10 mg" },
  // Weight Management
  { slug: "cagrilintide", name: "Cagrilintide", dose: "10 mg" },
  { slug: "5-amino-1mq", name: "5-Amino-1MQ", dose: "50 mg" },
  // Cardiovascular
  { slug: "ara-290", name: "ARA-290", dose: "5 mg" },
  // Anti-inflammatory
  { slug: "larazotide", name: "Larazotide", dose: "5 mg" },
  // Reproductive
  { slug: "kisspeptin-10", name: "Kisspeptin-10", dose: "5 mg" },
  // Weight Management
  { slug: "gip-glp-1", name: "GIP/GLP-1", dose: "10 mg" },
  // Anti-aging
  { slug: "glow-blend", name: "Glow Blend", dose: "10 mg", sub: "Blend" },
  // Nootropic
  { slug: "semax-selank-blend", name: "Semax +\nSelank", dose: "5 mg", sub: "Blend" },
  // Energy
  { slug: "ss-31", name: "SS-31", dose: "5 mg" },
];

// ── LABEL RENDERER ──────────────────────────────────────────
function createLabel(product) {
  // Create the flat label at higher resolution for quality
  const scale = 3; // render at 3x for crisp text
  const w = LABEL.width * scale;
  const h = LABEL.height * scale;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  // White background
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, w, h);

  // Navy brand band at top (15% of label height)
  const bandHeight = Math.round(h * 0.13);
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, bandHeight);

  // Brand name in the navy band
  const brandFontSize = Math.round(bandHeight * 0.42);
  ctx.fillStyle = WHITE;
  ctx.font = `600 ${brandFontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "3px";
  ctx.fillText("BASED", w / 2, bandHeight * 0.38);

  // "RESEARCH" smaller text
  const subBrandSize = Math.round(brandFontSize * 0.55);
  ctx.font = `400 ${subBrandSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.fillText("B I O L A B S", w / 2, bandHeight * 0.72);

  // Thin accent line below band
  ctx.fillStyle = NAVY;
  ctx.fillRect(w * 0.15, bandHeight + 4 * scale, w * 0.7, 1.5 * scale);

  // Product name — centered, large serif
  const nameLines = product.name.split("\n");
  const isMultiLine = nameLines.length > 1;
  const isLongName = product.name.replace("\n", "").length > 12;
  const nameFontSize = isLongName
    ? Math.round(h * 0.09)
    : isMultiLine
    ? Math.round(h * 0.10)
    : Math.round(h * 0.13);

  ctx.fillStyle = NAVY;
  ctx.font = `700 ${nameFontSize}px "Times New Roman", Times, Georgia, serif`;
  ctx.textAlign = "center";

  const nameStartY = bandHeight + h * (isMultiLine ? 0.20 : 0.28);
  const lineHeight = nameFontSize * 1.15;

  nameLines.forEach((line, i) => {
    ctx.fillText(line.trim(), w / 2, nameStartY + i * lineHeight);
  });

  // Sub-label ("Blend") if applicable
  if (product.sub) {
    const subFontSize = Math.round(nameFontSize * 0.45);
    ctx.font = `italic 400 ${subFontSize}px "Times New Roman", Times, Georgia, serif`;
    ctx.fillStyle = MUTED;
    const subY = nameStartY + nameLines.length * lineHeight + subFontSize * 0.4;
    ctx.fillText(product.sub, w / 2, subY);
  }

  // Dosage — centered, below product name
  const doseFontSize = Math.round(h * 0.065);
  ctx.font = `500 ${doseFontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.fillStyle = NAVY;
  const doseY = h * 0.68;
  ctx.fillText(product.dose, w / 2, doseY);

  // Thin line above footer
  ctx.fillStyle = LIGHT_GRAY;
  ctx.fillRect(w * 0.1, h * 0.74, w * 0.8, 1 * scale);

  // Footer text
  const footerFontSize = Math.round(h * 0.032);
  ctx.font = `400 ${footerFontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.fillStyle = MUTED;
  ctx.fillText("99% Purity", w / 2, h * 0.80);
  ctx.fillText("Research Use Only", w / 2, h * 0.86);

  return canvas;
}

// ── COMPOSITE PIPELINE ──────────────────────────────────────
function compositeProduct(product) {
  const labelCanvas = createLabel(product);
  const labelPath = path.join(TEMP_DIR, `label-${product.slug}.png`);
  const outputPath = path.join(OUTPUT_DIR, `${product.slug}.png`);

  // Save flat label
  const labelBuffer = labelCanvas.toBuffer("image/png");
  fs.writeFileSync(labelPath, labelBuffer);

  // Use ImageMagick to:
  // 1. Resize label to fit the vial's label area
  // 2. Apply subtle barrel/perspective distortion to simulate curvature
  // 3. Composite onto the base vial image
  try {
    // Step 1: Resize the flat label to the exact label area dimensions
    const resizedLabel = path.join(TEMP_DIR, `label-resized-${product.slug}.png`);
    execSync(
      `magick "${labelPath}" -resize ${LABEL.width}x${LABEL.height}! "${resizedLabel}"`,
      { stdio: "pipe" }
    );

    // Step 2: Apply slight barrel distortion to simulate cylinder curvature
    // This makes the edges of the label curve slightly inward
    const distortedLabel = path.join(TEMP_DIR, `label-distort-${product.slug}.png`);
    execSync(
      `magick "${resizedLabel}" -virtual-pixel transparent -distort Barrel "0.0 0.0 -0.02 1.02" "${distortedLabel}"`,
      { stdio: "pipe" }
    );

    // Step 3: Make the label slightly transparent/blend with the vial surface
    // Add subtle glass reflection effect
    const blendedLabel = path.join(TEMP_DIR, `label-blend-${product.slug}.png`);
    execSync(
      `magick "${distortedLabel}" -alpha set -channel A -evaluate multiply 0.92 +channel "${blendedLabel}"`,
      { stdio: "pipe" }
    );

    // Step 4: Composite onto the base vial
    execSync(
      `magick "${BASE_VIAL}" "${blendedLabel}" -geometry +${LABEL.x}+${LABEL.y} -compose over -composite "${outputPath}"`,
      { stdio: "pipe" }
    );

    return true;
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    return false;
  }
}

// ── MAIN ────────────────────────────────────────────────────
function main() {
  // Ensure directories exist
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`\nBased Research — Mockup Generator`);
  console.log(`Base vial: ${BASE_VIAL}`);
  console.log(`Products: ${products.length}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  let succeeded = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    process.stdout.write(`[${i + 1}/${products.length}] ${product.name.replace("\n", " ")}...`);

    if (compositeProduct(product)) {
      console.log(" OK");
      succeeded++;
    } else {
      console.log(" FAILED");
    }
  }

  console.log(`\nDone: ${succeeded}/${products.length} succeeded`);

  // Clean up temp files
  try {
    fs.rmSync(TEMP_DIR, { recursive: true });
    console.log("Temp files cleaned up.");
  } catch {}
}

main();
