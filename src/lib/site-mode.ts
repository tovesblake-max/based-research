/**
 * Site mode — the storefront's posture. Flipped via the
 * NEXT_PUBLIC_SITE_MODE env var + a redeploy (see scripts/set-site-mode.mjs
 * and docs/site-mode-switch.md). Build-time inlined.
 *
 *   "institutional" (default)
 *     - Checkout requires a signed-in account (no guest checkout).
 *     - Restricted SKUs (GIP3) are blurred behind account creation.
 *     - Copy leads with "qualified labs & institutional buyers",
 *       eligibility, and procurement cues; DTC cues are suppressed.
 *
 *   "open"
 *     - Guest checkout allowed (no account required to buy).
 *     - All catalog products visible (no GIP3 blur).
 *     - Conventional e-commerce copy + standard cart cues.
 *
 * COMPLIANCE INVARIANTS — present in BOTH modes, never toggled off:
 *   - "For laboratory research use only. Not for human or veterinary use.
 *     Not for diagnostic or therapeutic use." labeling sitewide.
 *   - 21+ age gate.
 *   - Research-use certification at checkout.
 * These keep the store inside the research-use-only posture most payment
 * processors require for this category (research purpose specified +
 * preventive measures present). "Open" only removes friction, never the
 * research-use posture.
 */

const VALID_MODES = ["institutional", "open"] as const;
type SiteMode = (typeof VALID_MODES)[number];

const RAW = (process.env.NEXT_PUBLIC_SITE_MODE ?? "institutional").trim().toLowerCase();

if (!VALID_MODES.includes(RAW as SiteMode)) {
  throw new Error(
    `[site-mode] NEXT_PUBLIC_SITE_MODE has invalid value "${RAW}". ` +
      `Must be one of: ${VALID_MODES.join(", ")}.`,
  );
}

export const SITE_MODE: SiteMode = RAW as SiteMode;
export const IS_OPEN_MODE = SITE_MODE === "open";
export const IS_INSTITUTIONAL_MODE = SITE_MODE === "institutional";
