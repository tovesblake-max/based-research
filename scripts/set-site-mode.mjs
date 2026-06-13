#!/usr/bin/env node
/**
 * Flip the storefront between its two modes and redeploy.
 *
 *   node scripts/set-site-mode.mjs institutional
 *   node scripts/set-site-mode.mjs open
 *
 * "institutional" (default): account-required checkout, GIP3 gated,
 *   institutional copy/eligibility, DTC cues suppressed.
 * "open": guest checkout, all products visible, conventional copy + cues.
 *
 * BOTH modes keep the compliance invariants (RUO labeling, 21+ age gate,
 * research-use certification at checkout) — see src/lib/site-mode.ts.
 *
 * Mechanism: sets NEXT_PUBLIC_SITE_MODE in Vercel production + redeploys.
 * The value is build-time inlined, so the redeploy is what makes it live.
 */
import { execSync } from "node:child_process";

const MODES = ["institutional", "open"];
const mode = (process.argv[2] || "").trim().toLowerCase();

if (!MODES.includes(mode)) {
  console.error(`Usage: node scripts/set-site-mode.mjs <${MODES.join("|")}>`);
  process.exit(1);
}

const run = (cmd) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

console.log(`Switching site mode → "${mode}"`);

// Remove the existing var (CLI's `env add` errors if it already exists).
try {
  run(`npx vercel env rm NEXT_PUBLIC_SITE_MODE production --yes`);
} catch {
  console.log("(NEXT_PUBLIC_SITE_MODE was not set yet — continuing)");
}

run(`printf "${mode}" | npx vercel env add NEXT_PUBLIC_SITE_MODE production`);
run(`npx vercel deploy --prod --yes`);

console.log(`\n✓ Site mode is now "${mode}" and deployed to production.`);
console.log(
  mode === "open"
    ? "  Guest checkout ON · all products visible · conventional copy. RUO + age gate + research-use cert still enforced."
    : "  Account-required checkout · GIP3 gated · institutional copy. Full compliance posture.",
);
