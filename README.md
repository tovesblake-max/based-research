# Based Research — Architecture & Decision Record

> A DTC e-commerce platform for research-use-only peptides. Built to be replicable across brands (see `docs/BRAND-LAUNCH-PLAYBOOK.md` for the how-to). This README covers the *why* — every major decision, the constraint that drove it, and the tradeoff accepted.

Production: [basedresearch.com](https://basedresearch.com) · Blog: [blog.basedresearch.com](https://blog.basedresearch.com)

---

## Table of contents

1. [What this is](#what-this-is)
2. [Design principles](#design-principles)
3. [Stack decisions](#stack-decisions)
4. [Database: Neon + Drizzle](#database-neon--drizzle)
5. [Auth: custom JWT, not Clerk/Auth.js](#auth-custom-jwt-not-clerkauthjs)
6. [Payments: wire your own processor](#payments-wire-your-own-processor)
7. [Subscription engine: why in-house](#subscription-engine-why-in-house)
8. [Fraud scoring: why in-process](#fraud-scoring-why-in-process)
9. [Compliance: the RUO doctrine](#compliance-the-ruo-doctrine)
10. [Restricted-compound masking](#restricted-compound-masking)
11. [Content: advertorials over blog-SEO](#content-advertorials-over-blog-seo)
12. [Deploy: Vercel CLI, not GitHub Actions](#deploy-vercel-cli-not-github-actions)
13. [Product catalog as a TypeScript file](#product-catalog-as-a-typescript-file)
14. [Separate blog project (Astro)](#separate-blog-project-astro)
15. [Fulfillment: ShipStation + Ship24](#fulfillment-shipstation--ship24)
16. [Tracking: client pixels + server CAPI + GTM proxy](#tracking-client-pixels--server-capi--gtm-proxy)
17. [Known-weak spots](#known-weak-spots)
18. [What this is NOT](#what-this-is-not)

---

## What this is

A Next.js 16 App Router monolith on Vercel serving:
- A retail e-commerce catalog for 40+ research peptide SKUs
- A subscription data model with daily cron, dunning, and loyalty tiers (recurring billing is left for you to wire to your processor)
- Checkout that prices the cart, applies coupons, runs fraud scoring, and writes an `unpaid` order. No processor ships wired. There is a marked PAYMENT INTEGRATION POINT in `src/app/api/checkout/route.ts` where you add your own
- Phone-verified signup, abandoned cart recovery, post-purchase upsells
- Affiliate + wholesale programs
- Auto-fulfillment to ShipStation with Ship24 tracking
- Advertorial landing pages for paid traffic
- Admin dashboard
- Server-side CAPI tracking (Meta, TikTok, Reddit) + GTM with ad-blocker bypass
- Full compliance scaffolding for a regulated-compound brand

**This is a blank-slate template.** It ships without a payment processor wired so you can drop in your own. `docs/BRAND-LAUNCH-PLAYBOOK.md` tells you what to copy verbatim vs what to rewrite per brand.

---

## Design principles

### 1. Boil the ocean

From `CLAUDE.md`:

> The marginal cost of completeness is near zero with AI. Do the whole thing. Do it right. Do it with tests. Do it with documentation. Do it so well that the operator is genuinely impressed, not politely satisfied.

Translation: the site ships with abandoned cart recovery + affiliate program + wholesale + post-purchase upsells + server-side CAPI + fraud scoring + ShipStation automation on day one. Not because a launch needs all of them, but because spending a week building them once beats retrofitting them onto five brands later.

### 2. Keep brand-specific code narrow

`src/lib/products.ts`, brand imagery, legal addresses, and copy are the only things that change across brands. Everything else — auth, payments, cron, fraud, tracking, admin — is infrastructure. Cloning for a new brand means swapping the narrow slice, not forking the whole stack.

### 3. Never trust the client

Every price is recomputed server-side from `productId + variantSku`. Every admin action is gated by `requireAdmin()` at the route level, not just UI. JWT is HTTP-only, SameSite. ACH credentials are AES-256-GCM encrypted at rest. Fraud scoring runs before any payment charge. "Don't trust the client" isn't a principle we talk about — it's a principle the entire code layout assumes.

### 4. Compliance as the default

Every new surface inherits the RUO (Research Use Only) framing. No review/testimonial component exists anywhere, so there's nothing to accidentally render. Restricted-compound slugs are masked in files, URLs, and copy. The 21+ age gate is on every page. Claim-language linting is implicit — every copy change gets a human compliance read before merge.

---

## Stack decisions

### Next.js 16 App Router

**Why:** Vercel-native. RSC + client boundaries let us keep the cart drawer + checkout client-heavy without bloating product pages. App Router's file-based routing maps 1:1 to the site IA. Route handlers give us typed API routes without a separate backend.

**Alternatives rejected:**
- **Remix** — smaller community, Vercel-agnostic (we're Vercel-native for reasons below).
- **Astro + serverless API** — better for blog (we did use it for the blog), but checkout + auth + admin are too interactive for Astro's islands model.
- **SvelteKit** — smaller hiring pool for contractors we might bring in.

**Accepted tradeoff:** Next 16 is fresh. Some libraries haven't caught up. We accept the bleeding-edge cost for PPR + Cache Components + Server Actions maturity.

### TypeScript strict

Paid for itself the first time Drizzle caught an integer-vs-string cents mismatch at compile time. The entire money path (cart item to order item to the charge your processor runs) is type-checked end to end.

### Tailwind

Zero runtime CSS. Copy-pastable to Claude. Single source of brand theming in `tailwind.config` + `@theme` directives. Rejected CSS-in-JS for runtime cost; rejected vanilla CSS for coordination cost across contractors.

### Vercel Pro

Edge middleware, cron jobs, Analytics, Speed Insights, instant rollback. The cron scheduler alone would cost a week of DevOps setup to replicate (subscriptions, abandoned carts, settlement, tracking, subscription reminders). Vercel's serverless model has a real weakness — stateful things like rate limits don't share memory across instances — which we know about and work around.

---

## Database: Neon + Drizzle

### Neon

Postgres with serverless connection pooling and branching. Decisive for us:

1. **Connection pooling** — Vercel serverless fans out to hundreds of cold lambdas under load. Neon's pgbouncer-layer pooling means we don't exhaust connections during traffic spikes.
2. **Branching** — we branch the DB per feature, not just the code.
3. **Point-in-time recovery** — 7 days on the free tier, 30 days on scale. Real ACH mistakes can be unwound.

Rejected Vercel Postgres (which is Neon white-labeled) because we want direct Neon console access for branching + SQL editor.

### Drizzle

**Why not Prisma:**
- No runtime schema generation → smaller bundle, faster cold starts
- SQL-first mental model (Prisma's `where: { AND: [...] }` abstractions obscure what's running)
- Incremental migrations via `drizzle-kit push` during dev, generated SQL for prod

**Why not raw pg:**
- Type safety for schema and query result shapes
- Composability of query fragments

### Money in cents

Every monetary value is `integer` cents. Never `numeric`, never `float`. `$3.00` is `300`. This is the standard for money handling and sidesteps all floating-point drift in discount math.

### Encrypted-at-rest ACH credentials

`achRoutingEncrypted` and `achAccountEncrypted` columns store hex-encoded `iv:authTag:ciphertext` triples. The `ENCRYPTION_KEY` env var is the symmetric AES-256-GCM key. Rotation requires a one-time migration script; we haven't written one because we haven't rotated yet. When we do, we'll add a `v1:` / `v2:` prefix to the ciphertext format.

---

## Auth: custom JWT, not Clerk/Auth.js

**Why we didn't use Clerk/Auth.js/NextAuth:**

1. **Phone-first signup flow.** Twilio Verify OTP is mandatory on every signup as a bot killer. None of the auth providers have a clean way to require phone verification before issuing a session, without bolting on a post-signup modal hack.
2. **"Guest" accounts.** We create phone-only users during checkout so order tracking works without a full signup. Auth providers assume email-primary.
3. **Phone number as login.** Users sign in with phone + OTP or email + password — interchangeably, on the same user. Most providers force one identity model.
4. **Custom admin role propagation.** We enforce admin in `middleware.ts` by reading the role out of the JWT, without an extra RPC call per request.
5. **Cost.** Clerk at Based Research's growth scale runs $500+/month. Custom auth is maybe 300 lines of code.

**What we got wrong (fixes documented in audit):**
- JWT has no `jti`, no revocation list. Password reset doesn't invalidate the old session. A stolen cookie is good for 7 days.
- Password reset tokens aren't hashed in DB.
- `createToken` has no sliding expiry.

These are on the fix list but the custom-auth upside (phone-first, guest accounts, zero per-seat cost) is worth it.

---

## Payments: wire your own processor

This template ships **without a payment processor**. Checkout authenticates, prices the cart, applies coupons, runs fraud scoring and duplicate detection, then writes an order row as `pending` / `unpaid`. It does not charge money.

### The integration point

`src/app/api/checkout/route.ts` has a clearly marked **PAYMENT INTEGRATION POINT**. That is where a new owner wires their own processor:

1. Create a charge or checkout session with your processor.
2. Confirm payment via a webhook under `/api/webhooks/`.
3. Flip the order to `paid`.
4. Run fulfillment.

### The order data model is processor-agnostic

The `orders` table carries two generic columns you populate from whatever processor you choose:

- `paymentGateway`: the provider name (a free-form string).
- `paymentReference`: the provider's charge or transaction id.

Nothing in the schema assumes a specific vendor, card vs bank transfer, or a particular fee model. Pick the processor that fits your economics and risk posture and map its identifiers onto those two columns.

### Picking a processor for this vertical

Research peptides are a high-risk vertical. Most general-purpose processors decline or quickly offboard "research peptide" merchants under their prohibited-products policies, so plan on a high-risk-tolerant processor and a research-use-only compliance posture (age gate, RUO labeling, gated checkout). The compliance scaffolding in this repo (see [Compliance: the RUO doctrine](#compliance-the-ruo-doctrine)) is built to support that posture regardless of which processor you wire.

### Refund idempotency

When you wire refunds, make them idempotent. Two rapid admin clicks should not issue two refunds. The recommended pattern is an atomic `UPDATE ... WHERE paymentStatus != 'refunded' RETURNING` guard before calling your provider's refund API.

---

## Subscription engine: why in-house

External billing tools (recurring-billing SaaS) are excellent. This template keeps subscriptions in-house because:

1. **The payment rail is yours to choose.** Recurring billing is left unwired so you can plug in whatever processor you select, rather than being locked to one vendor's billing product.
2. **Loyalty tiers with progressive discount** (bronze, silver, gold, platinum based on successful charges) don't fit any external tool's model.
3. **Dunning stays brand-aligned.** The "your payment failed" email is a retention moment, and you control the copy rather than shipping a third party's branded receipt.
4. **The fraud scoring is internal.** Subscription charges flow through the same fraud pipeline as one-time orders.

The engine lives in `src/app/api/cron/subscriptions/route.ts`. The subscription data model is complete (plans, frequency, loyalty tiers, dunning state), but the renewal cron is a **no-op until you wire recurring billing** to your processor. The charge step is the same PAYMENT INTEGRATION POINT pattern as one-time checkout: call your provider, confirm via webhook, advance the subscription.

---

## Fraud scoring: why in-process

Sift, Signifyd, Kount all work. But:

1. **Latency.** The fraud score runs inline on every checkout submit. Adding a 200ms external call to every checkout request means 200ms of extra checkout latency. In-process is < 10ms.
2. **Signals we control.** `User velocity > 5 orders in 24h` is easier to answer from our own DB than to model in a third-party's rule engine.
3. **Cost.** Third parties charge per-decision ($0.05–$0.30). At 10k checkouts/month that's $500–$3000/month for something five signals + a threshold accomplish.
4. **We'll outgrow this.** When monthly GMV hits $500K+, Sift or Signifyd's marginal lift pays for itself. The in-process version is the right choice for $0–$500K MRR and for the early brand-launch phase.

**Known weakness:** the score is entirely fail-open. If `scoreOrder()` throws an exception (DB hiccup), the caller catches and passes. Audit fix: treat score-unavailable as a 503 retry, not an approval.

---

## Compliance: the RUO doctrine

Selling research-use peptides to individuals is legal in the US **if**:

1. Products are marketed as "for research use only, not for human consumption"
2. No medical/therapeutic claims are made
3. No dosing protocols for humans are provided
4. Customers acknowledge research-use (we do this via a research-use certification checkbox at checkout and a 21+ age gate)

Crossing any of those lines moves the business into FDA-regulated territory (drug claims) or DEA-regulated territory (restricted analogs). We stay well clear.

### How we enforce it

- **Zero review/testimonial/rating UI anywhere.** Every React component that could render a star or a quote was audited and removed.
- **JSON-LD has no `aggregateRating`.** Product schema is info-only.
- **Claim-language scrubbing.** Every copy change gets a read for "treats/cures/prevents/heals" verbs applied to conditions.
- **Advertorial hedging.** Every claim in `/research/*` pages is framed as "research has investigated" / "preclinical studies suggest" / "animal models indicate."
- **Checkout gating.** Checkout includes an RUO acknowledgement (the research-use certification checkbox) before an order can be placed.
- **Age gate.** 21+ gate on first visit (audit fix: server-enforced cookie is pending).

### What triggered this framing

Ad platforms are unforgiving in this vertical. A single "boosts your testosterone" anywhere on the site can get you suspended on multiple ad platforms for a year or more, and a careless claim raises the same flags with payment processors and their underwriters. RUO framing is not optional.

---

## Restricted-compound masking

GLP-1 class compounds (semaglutide, tirzepatide, retatrutide, cagrilintide) are specifically restricted by every major ad platform. Even research-framed listings get ads rejected. Approach:

1. **Masked slugs.** `/product/glp3-rta` instead of `/product/retatrutide`. `/product/glp1-smg` instead of `/product/semaglutide`. The product still exists; the URL is just opaque to crawlers.
2. **Masked filenames.** `glp3-rta.webp`, not `retatrutide.webp`.
3. **Feed exclusion.** `EXCLUDED_SLUGS` in `src/app/api/gmc/feed.xml/route.ts` keeps them out of Google Shopping.
4. **Sitemap exclusion.** Same list gates `src/app/sitemap.ts`.
5. **Robots.txt disallow.** `GPTBot`, `ClaudeBot`, `PerplexityBot` specifically disallowed from the masked URLs.
6. **410 for legacy URLs.** `/product/retatrutide` returns `410 Gone` via `middleware.ts` to de-index faster than a 404.

**Audit finding (to fix):** `Hero.tsx` still has the word "Semaglutide" in homepage lede copy and hero image alt text. `llms.txt` still lists semaglutide/tirzepatide/cagrilintide by name. These need to be stripped before GMC re-review.

---

## Content: advertorials over blog-SEO

Most DTC brands rank their blog on informational long-tail queries (`"what is BPC-157"`, `"tb-500 vs bpc-157"`). We don't — for two reasons:

1. **Informational content competes with ad traffic.** If we rank organically on a BPC-157 query, Meta's "low-quality landing page" scoring punishes our paid ads sending traffic to the same URL. Separating organic and paid into two subdomains (`blog.` for organic, apex for paid) avoids the cannibalization.
2. **Blog ≠ landing page.** A blog article optimized for "what is BPC-157" is structured for reader curiosity. A landing page optimized for `"bpc-157 for sale"` ads is structured for conversion. We built both and keep them in their lanes.

### The advertorial format

`/research/<compound>` pages follow Brandon Ham's proven-in-supplements playbook:

1. Editorial header (date, byline, "Research Brief" chip) — looks like journalism, not marketing
2. PADS lead (Problem → Agitate → Dream → Solution)
3. Disqualify alternatives — builds authority by conceding what doesn't work
4. Mechanism — lay-reader explanation, not protein chemistry
5. Proof stack — real citations, real PubMed IDs
6. Crossroads close — soft CTA "here are your options"
7. Future pacing — paint the post-research outcome
8. FAQ — 6–8 real objections
9. CTA to the product page

**Hard rule: zero em dashes.** AI tell #1. Also: no bold claims, no recommended protocols for humans, lay language only.

### The blog

Separate Astro project at `blog.basedresearch.com`. 20+ long-form research articles. Exists for:
- Long-term organic authority
- LLM-cited content (ChatGPT, Perplexity, Claude) for GEO
- Product-page internal links via `src/lib/product-blog-links.ts`

Kept separate to protect apex-domain ad quality scoring.

---

## Deploy: Vercel CLI, not GitHub Actions

Per operator memory (`~/.claude/projects/.../memory/feedback_no_github.md`):

> Deploy via Vercel CLI only, skip GitHub pushes.

**Rationale:**
- Instant deploys with no CI wait (`vercel --prod` takes 60s end to end)
- No GitHub Actions minutes to burn or configure
- Vercel's instant rollback (click a previous deployment → "Promote to Production") is the undo button
- Git is still used for history — commits happen, pushes happen when we want to sync the GitHub mirror for code review

**Known weakness:** no PR-gated typecheck or lint. A local `tsc` error can ship if the dev forgets. Fix is in the audit backlog: add GitHub Actions for `tsc --noEmit` + `eslint` on PR, but keep `vercel --prod` as the deploy trigger.

---

## Product catalog as a TypeScript file

`src/lib/products.ts` is a 900-line hardcoded array of product objects. This is unusual for an e-commerce site. Rationale:

1. **SEO bulletproof.** Static generation means every product page ships as pre-rendered HTML. No DB call at request time. No runtime CMS.
2. **Git-tracked content.** Every price change, copy edit, image swap is a commit. Full audit trail.
3. **Deployments are cheap.** `vercel --prod` takes a minute. Changing a price is the same "edit file + deploy" loop as changing a button color.
4. **Zero CMS fees.** No Contentful, no Sanity, no Strapi. No auth headaches, no content modeling overhead.
5. **Types flow through.** The `Product` interface enforces shape across every consumer (shop, cart, feed, schema, admin).

**When we'll outgrow this:**
- More than 1 admin editing simultaneously → merge conflicts
- More than 100 products → file size gets unwieldy
- Need for A/B pricing or time-based promos → static array can't do this
- Inventory becomes real (right now everything is "in stock") → DB becomes mandatory

Pattern when we move: migrate to Drizzle-backed catalog with ISR revalidation every N minutes. Products.ts becomes a seed file. Catalog editing moves into the admin dashboard.

---

## Separate blog project (Astro)

`blog.basedresearch.com` runs a separate Astro codebase at `/path/to/blog`. Why not Next.js MDX on a subpath?

1. **Editorial cadence ≠ commerce cadence.** We edit the blog daily during content pushes and the main site weekly. Separate Vercel projects mean blog deploys don't block commerce deploys.
2. **Bundle size.** Astro's islands architecture ships ~0 JS on article pages. Next.js would hydrate the shared layout even on a pure-content article.
3. **Astro's MDX DX is better.** Content collections, frontmatter schemas, RSS generation all come out of the box.
4. **Subdomain separation.** Keeps apex clean for commerce metrics.

---

## Fulfillment: ShipStation + Ship24

### ShipStation

Industry default for DTC. Handles label generation, carrier selection, batch shipping workflows. We use **both** their pull model (Custom Store endpoint) and push model (REST API):

- **Pull:** ShipStation polls `/api/shipstation/orders` on a schedule. This is the reliable, "fire and forget" path.
- **Push:** We call `createOrder()` after payment to queue the order immediately.

Belt and suspenders — if push fails silently, pull still pulls the order on its next poll. Known audit issue: two pushes for the same order can race on `shipstationOrderId = null`. Fix is pending.

### Ship24

Multi-carrier tracking aggregator. We push every tracking number to Ship24; their webhook milestones get polled by our cron 4× daily. Cleaner than UPS/FedEx/USPS API fragmentation.

---

## Tracking: client pixels + server CAPI + GTM proxy

Three layers deep, which is excessive — but each layer exists because the ones above it get blocked.

### Layer 1: Client pixels

Meta Pixel, TikTok Pixel, Reddit Pixel, GA4, Google Ads. Fire on page load, add-to-cart, begin-checkout, purchase. ~30% of users have an ad blocker; those never fire.

### Layer 2: Server CAPI

Meta CAPI, TikTok Events API, Reddit CAPI. Server-to-server, from our API routes. Fires even when the client pixel is blocked. Hashed email/phone/IP for Enhanced Matching — recovers attribution from the 30% the client misses.

### Layer 3: First-party GTM proxy

`/_t/gtm.js`, `/_t/g/collect`, `/_t/ns.html` edge routes proxy Google's CDN through our own domain. Ad blockers that blocklist `googletagmanager.com` don't blocklist `basedresearch.com/_t/gtm.js` — so GTM fires for another ~15% of users who block the script but not our domain.

At full stack deployment we expect ~95% event capture. Without all three, a DTC site is flying blind on paid ad attribution.

### Server-side GTM (future)

`NEXT_PUBLIC_GTM_SERVER_URL` hook exists for Stape or Cloudflare Zaraz. We'll flip this on when ad spend passes $500/day and attribution accuracy matters more than the $15/mo infra cost.

---

## Known weak spots

Full list in `docs/BRAND-LAUNCH-PLAYBOOK.md` §27. The ones that matter most:

1. **Webhook verification.** When you wire a processor, any webhook you add under `/api/webhooks/` must verify the provider's signature before treating a caller as authoritative. Never flip an order to `paid` on an unverified request.
2. **Rate limit is in-memory** — resets per serverless instance. Bypassable with parallelism. Needs Upstash Redis or Vercel KV.
3. **JWT not invalidated on password change** — stolen cookies live 7 days. Needs `passwordChangedAt` + JWT `iat` check.
4. **Age gate is client-only** — bypassable. Needs server cookie + middleware check.
5. **"Semaglutide" leak in hero copy + llms.txt** — compliance risk. Needs one-line strip.
6. **Subscription cron doesn't clear `processingAt` on success** — observability bug.
7. **Charge idempotency** — when you wire payments, send an idempotency key so two concurrent submits cannot produce two charges.

Each is known, scoped, and tracked. None block bringing the storefront up. All matter before scaling ad spend.

---

## What this is NOT

To set expectations:

- **Not a template.** Replicating for a new brand is a deliberate 1-day exercise, not a `create-brand` CLI.
- **Not multi-tenant.** One Vercel project, one DB, one brand. Second brand = second project.
- **Not internationalized.** US-only. USD only. States/ZIPs hardcoded.
- **Not mobile app-backed.** Pure web. No React Native companion.
- **Not headless.** Next.js renders the catalog directly. No decoupled frontend.
- **Not subscription-only.** One-time orders are a first-class path; subscriptions are an upgrade.

---

## Further reading

- **`docs/BRAND-LAUNCH-PLAYBOOK.md`** — step-by-step replication for new brands
- **`docs/google-ads-setup.md`** — Search Console, Merchant Center, Google Ads, GTM setup walkthrough
- **`STATUS.md`** — live snapshot of what's deployed vs what's blocked
- **`SITE-PLAYBOOK.md`** — pattern-level design decisions
- **`AGENTS.md`** — agent-handoff rules for Claude/Codex working on the codebase
- **`CLAUDE.md`** — skills manifest (autoskills)

---

## Getting started (local dev)

```bash
git clone https://github.com/<your-org>/based-research.git
cd based-research
npm install
cp .env.example .env.local  # fill in values from Vercel
npx drizzle-kit push        # sync schema to your local/branch DB
npm run dev                 # localhost:3000
```

Deploy:
```bash
npx vercel --prod
```

---

*Architecture document. Last updated: 2026-04-18. For the step-by-step how-to, see `docs/BRAND-LAUNCH-PLAYBOOK.md`.*
