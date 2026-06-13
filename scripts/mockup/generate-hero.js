#!/usr/bin/env node

/**
 * Based Research — Hero Lineup Shot & Bundle Generator
 *
 * Composites labeled vials into a fan-formation hero image using
 * "darken" blend mode — white backgrounds become invisible while
 * vial content layers cleanly without transparency artifacts.
 *
 * Usage: node generate-hero.js
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const PRODUCTS_DIR = path.join(__dirname, "../../public/images/products");
const SITE_DIR = path.join(__dirname, "../../public/images/site");

fs.mkdirSync(SITE_DIR, { recursive: true });

// ── HERO LINEUP ─────────────────────────────────────────────
// Fan formation: center largest (closest), tapering to sides (further away).
// Darken blend = white pixels can't darken anything, so white backgrounds vanish.
const heroVials = [
  // Left to right: outer → inner → center → inner → outer
  { slug: "bpc-157",     x: 0,    y: 80,  size: 210 },
  { slug: "ipamorelin",  x: 80,   y: 50,  size: 245 },
  { slug: "tb-500",      x: 185,  y: 18,  size: 295 },
  { slug: "tirzepatide", x: 300,  y: 0,   size: 350 },
  { slug: "semaglutide", x: 430,  y: 18,  size: 295 },
  { slug: "cjc-1295",    x: 560,  y: 50,  size: 245 },
  { slug: "ghk-cu",      x: 670,  y: 80,  size: 210 },
];

function main() {
  console.log("Generating hero lineup shot...\n");

  // ── Hero lineup ──
  let cmd = `magick -size 950x420 xc:white`;

  for (const vial of heroVials) {
    const vialPath = path.join(PRODUCTS_DIR, `${vial.slug}.png`);
    if (!fs.existsSync(vialPath)) {
      console.error(`  Missing: ${vialPath}`);
      continue;
    }
    cmd += ` \\( "${vialPath}" -resize ${vial.size}x${vial.size} \\)`;
    cmd += ` -geometry +${vial.x}+${vial.y} -compose darken -composite`;
  }

  const heroPath = path.join(SITE_DIR, "hero-vials.png");
  cmd += ` -trim +repage -bordercolor white -border 20x15`;
  cmd += ` "${heroPath}"`;

  try {
    execSync(cmd, { stdio: "pipe", shell: "/bin/bash" });
    console.log(`Hero lineup saved: ${heroPath}`);
  } catch (err) {
    console.error(`Error: ${err.stderr?.toString() || err.message}`);
  }

  // ── Bundle shots ──
  generateBundle(
    "bpc-157", "tb-500",
    path.join(SITE_DIR, "bundle-bpc-tb.png"),
    "BPC-157 + TB-500 Bundle"
  );

  generateBundle(
    "cjc-1295", "ipamorelin",
    path.join(SITE_DIR, "bundle-cjc-ipam.png"),
    "CJC-1295 + Ipamorelin Bundle"
  );
}

function generateBundle(slug1, slug2, outputPath, label) {
  console.log(`Generating bundle: ${label}...`);

  const vial1 = path.join(PRODUCTS_DIR, `${slug1}.png`);
  const vial2 = path.join(PRODUCTS_DIR, `${slug2}.png`);

  if (!fs.existsSync(vial1) || !fs.existsSync(vial2)) {
    console.error("  Missing vial images for bundle");
    return;
  }

  // Side-by-side with darken blend for clean overlap
  const cmd = `magick -size 700x420 xc:white ` +
    `\\( "${vial1}" -resize 350x350 \\) -geometry +10+35 -compose darken -composite ` +
    `\\( "${vial2}" -resize 350x350 \\) -geometry +320+35 -compose darken -composite ` +
    `-trim +repage -bordercolor white -border 15x10 ` +
    `"${outputPath}"`;

  try {
    execSync(cmd, { stdio: "pipe", shell: "/bin/bash" });
    console.log(`  Saved: ${outputPath}`);
  } catch (err) {
    console.error(`  Error: ${err.stderr?.toString() || err.message}`);
  }
}

main();
