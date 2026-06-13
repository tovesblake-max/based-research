/**
 * Image compliance pass:
 *   1. Strip EXIF metadata from every product image
 *   2. Rename 4 restricted-product images to masked filenames so the URL
 *      no longer exposes the restricted compound name.
 *   3. Delete the now-orphaned original filenames.
 *
 * Rename map (URL exposure → masked):
 *   semaglutide.webp  → glp1-smg.webp
 *   tirzepatide.webp  → glp1-gip-tzp.webp
 *   retatrutide.webp  → glp3-rta.webp
 *   cagrilintide.webp → amy-cgr.webp
 *
 * Idempotent — safe to re-run.
 *
 * Run: npx tsx scripts/strip-rename-images.ts
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public/images/products");

const MASK_MAP: Record<string, string> = {
  "semaglutide.webp": "glp1-smg.webp",
  "tirzepatide.webp": "glp1-gip-tzp.webp",
  "retatrutide.webp": "glp3-rta.webp",
  "cagrilintide.webp": "amy-cgr.webp",
};

async function stripAll() {
  const files = await fs.readdir(DIR);
  const webps = files.filter((f) => f.endsWith(".webp"));

  console.log(`Stripping EXIF from ${webps.length} images...`);

  let stripped = 0;
  for (const file of webps) {
    const src = path.join(DIR, file);
    const buf = await fs.readFile(src);
    // Re-encode without metadata. sharp drops EXIF by default when you don't call withMetadata().
    const out = await sharp(buf).webp({ quality: 90 }).toBuffer();
    await fs.writeFile(src, out);
    stripped++;
  }
  console.log(`  ✓ Stripped ${stripped} images\n`);
}

async function renameMasked() {
  console.log("Renaming restricted-product images to masked names...");
  for (const [oldName, newName] of Object.entries(MASK_MAP)) {
    const oldPath = path.join(DIR, oldName);
    const newPath = path.join(DIR, newName);

    const oldExists = await fs
      .access(oldPath)
      .then(() => true)
      .catch(() => false);
    const newExists = await fs
      .access(newPath)
      .then(() => true)
      .catch(() => false);

    if (!oldExists && newExists) {
      console.log(`  • ${oldName} already renamed → ${newName} (skip)`);
      continue;
    }
    if (!oldExists && !newExists) {
      console.log(`  ⚠️  ${oldName} not found and no masked equivalent — skip`);
      continue;
    }

    if (newExists) {
      // masked file already exists; just delete the old one
      await fs.unlink(oldPath);
      console.log(`  ✓ removed orphaned ${oldName} (masked version already present)`);
      continue;
    }

    await fs.rename(oldPath, newPath);
    console.log(`  ✓ ${oldName} → ${newName}`);
  }
}

async function main() {
  await stripAll();
  await renameMasked();
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
