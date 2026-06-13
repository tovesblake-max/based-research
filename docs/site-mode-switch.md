# Site Mode Switch — Runbook

**Last updated: 2026-05-27**

The storefront has two modes. Flipping between them is one env-var change + redeploy. No code changes. Source of truth: `src/lib/site-mode.ts` (env var `NEXT_PUBLIC_SITE_MODE`).

## The two modes

| | `institutional` (default) | `open` |
| --- | --- | --- |
| Checkout | Account + sign-in required | Guest checkout (no account) |
| Restricted SKUs (GIP3) | Blurred behind account | Visible |
| Homepage / catalog copy | "Qualified labs & institutional buyers", eligibility | Conventional e-commerce |
| Cart cues | "Add to Order", promo badges suppressed | "Quick Add", badges shown |
| Membership/eligibility bar | Shown (institutional prompt) | Hidden |

## Compliance invariants — present in BOTH modes, never toggled off

These keep the store inside a research-use-only compliance posture (research purpose specified + preventive measures present), which most high-risk-tolerant processors require for this vertical. `open` removes friction, never these:

- "For laboratory research use only. Not for human or veterinary use. Not for diagnostic or therapeutic use." labeling sitewide (product pages, COA, order email, Terms).
- 21+ age gate.
- Research-use certification checkbox at checkout.

If anyone asks to strip these in `open` mode, the answer is no. It flips the business into a prohibited category for most processors (unspecified purpose = assumed human consumption).

## The switch

```bash
cd ~/Documents/based-research

# Open / conventional DTC:
node scripts/set-site-mode.mjs open

# Institutional / gated (default):
node scripts/set-site-mode.mjs institutional
```

The script removes + re-adds `NEXT_PUBLIC_SITE_MODE` in Vercel production and runs `vercel deploy --prod`. ~90 seconds. The value is build-time inlined, so the redeploy is what makes it live.

## What flips it in code

- `src/lib/site-mode.ts` — `SITE_MODE`, `IS_OPEN_MODE`, `IS_INSTITUTIONAL_MODE`.
- `src/middleware.ts` — open mode allows guest `/checkout`.
- `src/components/ShopContent.tsx` — GIP3 gating + catalog subhead.
- `src/components/ProductCard.tsx` — badge visibility + "Quick Add" vs "Add to Order".
- `src/components/Hero.tsx` — eyebrow + trust banner.
- `src/components/MembershipBar.tsx` — hidden in open mode.

## Smoke test after a flip

- `open`: visit `/checkout` logged out → should NOT redirect to sign-up (guest checkout). GIP3 card visible on `/catalog`.
- `institutional`: visit `/checkout` logged out → redirects to sign-up. GIP3 card blurred with "Create an account" overlay.
- Both: product page shows the RUO line; checkout shows the research-use certification checkbox.
