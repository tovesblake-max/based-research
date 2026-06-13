# Brand Launch Playbook

> A step-by-step replication guide for the Based Research-style DTC research-compound e-commerce site. Follow this to ship a launch-ready site for **any** new brand without rediscovering the decisions each time.

**Source of truth:** `~/Documents/based-research` — the reference implementation. Every section below cites the file(s) to copy from. Read `ARCHITECTURE.md` alongside this if you want the *why* behind the *how*.

**Target output of following this playbook:**
A production site with a complete checkout that prices the cart, applies coupons, runs fraud scoring, and writes an `unpaid` order (you wire your own payment processor at a marked integration point), a subscription data model with daily cron and dunning, phone-verified signup, fraud scoring, abandoned-cart recovery, post-purchase upsell funnel, affiliate program, wholesale B2B, auto-fulfillment to ShipStation, server-side CAPI tracking, advertorial landing pages, admin dashboard, and all the legal/compliance scaffolding required for a regulated-compound research brand.

**Assumed time to replicate from scratch:** 4–6 agent-days if starting from `create-next-app`. 1 day if cloning the reference repo and rebranding.

---

## 0. Required Brand Inputs

Before starting, collect these from the operator:

| Input | Example | Notes |
|---|---|---|
| Brand name | `Based Research` | Full display name |
| Short name / domain slug | `acme` / `acme` | Used in SKUs, env vars, file prefixes |
| Primary domain | `basedresearch.com` | Must be DNS-able; apex preferred |
| Blog subdomain | `blog.basedresearch.com` | Separate Astro project |
| Tagline | `Research-grade peptides…` | 1 line |
| Hero headline | `Sequence to signal…` | H1 on homepage |
| Mailing address | `Based Research ` | **Must be real** for GMC compliance |
| Support phone | `(888) 300-0190` | Must be real |
| Support email | `support@basedresearch.com` | On domain |
| Product list | 40+ SKUs with variants | See Section 5 |
| Brand colors | primary / accent / destructive | Hex values |
| Logo files | dark bg, light bg, favicon, OG | PNG/WebP |
| Compliance persona | "Research-use-only" vs consumer | Drives all copy — see Section 19 |
| Payment processor | Your choice (none ships wired) | Section 6 |
| Shipping rule | Free at $200, $14.99 below | Configurable |

---

## 1. Stack

**Fixed choices** — do not deviate without reason:

- **Framework:** Next.js 16 App Router, Node runtime
- **Language:** TypeScript strict mode
- **UI:** React 19, Tailwind CSS, lucide-react icons
- **DB:** Neon Postgres (pooled) via Drizzle ORM
- **Auth:** Custom JWT (jose) + bcryptjs + Twilio Verify
- **Email:** Mailtrap API (transactional + marketing)
- **SMS/OTP:** Twilio Verify Service
- **Bot defense:** Cloudflare Turnstile
- **Payments:** none ships wired. Checkout writes an `unpaid` order; you wire your own processor at the integration point (Section 6)
- **Fulfillment:** ShipStation Custom Store + Ship24 tracking
- **Hosting:** Vercel Pro
- **Blog:** Astro (separate repo, separate Vercel project)

**Rationale in `ARCHITECTURE.md`.** Changing any of these requires updating this playbook.

---

## 2. Repo Initialization

```bash
mkdir <brand> && cd <brand>
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-turbopack
```

**Immediate post-init tasks:**

1. Replace generated `README.md` with the brand-specific one (Section 23).
2. Add `AGENTS.md` with the Next.js agent-rules block (copy verbatim from reference).
3. Add `CLAUDE.md` importing `AGENTS.md` + autoskills block.
4. `.gitignore`: ensure `.env*` and `.env*.local` are blocked. Verify with `git ls-files | grep env`.
5. Install core deps:
   ```bash
   npm i drizzle-orm @neondatabase/serverless pg bcryptjs jose zod
   npm i -D drizzle-kit @types/bcryptjs @types/pg dotenv-cli tsx
   npm i lucide-react @vercel/analytics @vercel/speed-insights
   ```
6. Init Drizzle: create `drizzle.config.ts`, `src/lib/db/schema.ts`, `src/lib/db/index.ts` — schema pattern from Section 4.

---

## 3. Infrastructure Setup

### 3a. Vercel project

```bash
npx vercel link
```

Pick the team, name the project `<brand>-prod`. Set the production branch to `main`.

### 3b. Neon Postgres

1. Create a new project at [console.neon.tech](https://console.neon.tech).
2. Grab all Postgres connection strings from **Connection Details**.
3. Vercel env (paste each into production scope):
   - `DATABASE_URL` — pooled URL
   - `DATABASE_URL_UNPOOLED` — direct URL
   - `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_URL_NO_SSL`, `POSTGRES_PRISMA_URL`, `POSTGRES_DATABASE`, `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
   - `PGDATABASE`, `PGHOST`, `PGHOST_UNPOOLED`, `PGUSER`, `PGPASSWORD`, `NEON_PROJECT_ID`
4. `npx drizzle-kit push` to materialize schema.

### 3c. Domain

1. Add `<brand>.com` to Vercel (Project → Settings → Domains).
2. Update the registrar's nameservers to Vercel's, **or** create the CNAME/A records Vercel provides.
3. Wait for SSL provisioning (usually < 5 min).

### 3d. Core secrets

Generate and set in Vercel production:

```bash
# 32-byte hex for AES-256-GCM
openssl rand -hex 32       # → ENCRYPTION_KEY
openssl rand -base64 32    # → JWT_SECRET
openssl rand -base64 32    # → CRON_SECRET
```

---

## 4. Database Schema

Copy `src/lib/db/schema.ts` verbatim from reference. Tables:

| Table | Purpose |
|---|---|
| `users` | email+password OR phone-only ("guest") accounts, role column |
| `addresses` | saved shipping addresses per user |
| `orders` | line items roll up in `order_items`; supports card + ACH + wholesale |
| `order_items` | per-SKU rows for each order |
| `subscriptions` | ACH recurring — frequency (days), discount tier, encrypted bank creds |
| `subscription_items` | price-locked line items per subscription |
| `subscription_events` | audit trail: created, charged, retry_scheduled, paused, cancelled, tier_upgraded |
| `affiliates` | one per referring user, with affiliate code + commission rate |
| `commissions` | per-order commission records, pending → approved → paid |
| `payouts` | batches of commissions paid to one affiliate |
| `wholesale_accounts` | B2B applications, tier/discount/credit terms |
| `password_reset_tokens` | single-use, expiring |
| `abandoned_carts` | snapshots at begin_checkout, 3-stage drip |
| `contact_submissions` | form inbox |

**Drizzle patterns used:**
- `uuid().defaultRandom().primaryKey()` for all IDs
- Monetary values in **cents** as `integer`, never `numeric` (avoids float drift)
- Sensitive fields (`achRoutingEncrypted`, `achAccountEncrypted`) stored as `varchar(500)` containing hex-encoded `iv:authTag:ciphertext`
- Every high-cardinality column gets an index; composite indexes for common multi-field filters (see `ARCHITECTURE.md` §DB)

**Migrations:** `npx drizzle-kit push` for schema changes. For data migrations, write a script in `scripts/migrate-<description>.ts` and run with `npx dotenv-cli -e .env.local -- npx tsx scripts/<file>.ts`.

---

## 5. Product Catalog

### Structure

`src/lib/products.ts` — single file, TypeScript const array. Each product:

```ts
{
  id: string;               // stable, used in cart
  name: string;             // display name
  slug: string;             // URL path; never change once indexed
  category: string;         // joins to categories.ts
  description: string;      // 1-line summary (card + feed)
  longDescription: string;  // RUO-compliant paragraph (product page + schema)
  variants: { size: string; price: number /* cents */; sku: string }[];
  purity: string;
  cas?: string; molecularWeight?: string; sequence?: string;
  form: string; storage: string; appearance: string;
  featured?: boolean;       // shows on homepage
  badge?: string;           // "Best Seller", "New Arrival"
  tags?: string[];          // filters
  upsellOnly?: boolean;     // hides from catalog/feed; reachable by slug only
  noShipping?: boolean;     // skips $14.99 surcharge + ShipStation push
}
```

### Categories

`src/lib/categories.ts` + `src/lib/category-content.ts`. Keep category count 5–9; each category has its own rollup page with 300+ words of framing copy.

### Images

- **Generation:** scripts in `scripts/gen-*.ts` hit the KIE API with a composite-logo reference image. See `scripts/gen-vials-with-logo-ref.ts` for the canonical pattern.
- **Format:** WebP only, 1:1 aspect ratio, 1200×1200 preferred, 300KB budget.
- **Review UI:** `scripts/build-review.ts` → `scripts/review-built.html` — side-by-side approve/reject grid.
- **Storage:** `public/images/products/<slug>.webp`. Masked filenames for restricted compounds (never the compound's real name in the filename).

### Compliance masking

For any restricted compound:
1. Use a masked slug (e.g., `glp3-rta` instead of `retatrutide`).
2. Use a masked image filename (`glp3-rta.webp`).
3. Exclude from `EXCLUDED_SLUGS` set in `src/app/api/gmc/feed.xml/route.ts`.
4. `Disallow: /product/<masked-slug>` in `src/app/robots.ts`.
5. If the old URL was indexed, add to `goneUrls` in `src/middleware.ts` for a 410.

### Cart-only upsells

Accessories (bac water, syringes, alcohol swabs) should be `upsellOnly: true` so:
- They don't appear in shop/category browsing
- They're excluded from sitemap and GMC feed
- `/product/<slug>` returns 404
- BUT they're still addable via `CartUpsells` and `PostPurchaseUpsell` components

---

## 6. Payments: wire your own processor

This template ships **without a payment processor**. The whole checkout pipeline up to the charge is built and working: it authenticates, prices the cart, applies coupons, runs fraud scoring and duplicate detection, then writes an order row as `pending` / `unpaid`. It does not move money. You add a processor at one marked spot.

### 6a. The integration point

`src/app/api/checkout/route.ts` contains a clearly marked **PAYMENT INTEGRATION POINT**. Wire your processor there:

1. Create a charge or checkout session with your processor.
2. Confirm payment via a webhook under `src/app/api/webhooks/`.
3. Flip the order to `paid` (set `paymentStatus`).
4. Run fulfillment (push to ShipStation, send the order-confirmation email).

The `orders` table is processor-agnostic. Populate two generic columns from whatever provider you choose:

- `paymentGateway`: the provider name (free-form string).
- `paymentReference`: the provider's charge or transaction id.

Nothing in the schema assumes a specific vendor, card vs bank transfer, or a fee model.

### 6b. Webhook security

Any webhook you add under `/api/webhooks/` must verify the provider's signature before it is trusted. Never flip an order to `paid` on an unverified request. Verify the signature header against your provider's signing secret, then update the order. Make the handler idempotent (the provider may deliver the same event more than once) by keying on `paymentReference` or the provider's event id.

### 6c. Picking a processor for this vertical

Research peptides are a high-risk vertical. Most general-purpose processors decline or quickly offboard "research peptide" merchants under their prohibited-products policies, so plan on a high-risk-tolerant processor and keep a research-use-only compliance posture (age gate, RUO labeling, gated checkout). The compliance scaffolding in this repo (Sections 18 and 19) supports that posture regardless of which processor you wire. Confirm with any candidate processor, in writing, that they accept this MCC and product category before you build against their API.

### 6d. Subscriptions and recurring billing

The subscription data model is complete (plans, frequency, loyalty tiers, dunning state), and the daily cron is scheduled in `vercel.json`:

```json
{ "path": "/api/cron/subscriptions", "schedule": "0 10 * * *" }
```

The renewal cron in `src/app/api/cron/subscriptions/route.ts` is a **no-op until you wire recurring billing** to your processor. When you do, the charge step is the same integration pattern as one-time checkout: call your provider, confirm via webhook, advance the subscription. The surrounding machinery already works:

- Idempotency: `lastChargeEpoch` (YYYY-MM-DD UTC) skips a sub already charged today; a `processingAt` lock (5-min stale threshold) prevents concurrent cron instances from double-processing; the `nextChargeDate <= now` filter selects only due subs; BATCH_SIZE=20 per invocation.
- Retry + dunning: MAX_RETRIES=3, RETRY_INTERVAL_DAYS=3, email sequence `failed` → `retry` → `paused`.
- Loyalty tiers: bronze → silver (after 4 charges) → gold (8) → platinum (14). Discount: 10% / 12% / 15% / 18%.

---

## 7. Authentication & Signup

### 7a. Required flows

- Email + password signup with **mandatory phone OTP** (Twilio Verify)
- Phone-only "guest" signup (order tracking, no password)
- Email signin + password reset
- Phone signin via OTP
- Admin bootstrap: first admin manually promoted via SQL (`UPDATE users SET role='admin' WHERE email='…'`)

### 7b. Files to copy

- `src/lib/auth.ts` — JWT create/verify, bcrypt helpers, `requireAuth()`, `requireAdmin()`
- `src/middleware.ts` — gates `/admin/*`, redirects `/account/*` if not logged in, bot UA filtering, 410 for legacy URLs
- `src/components/AuthProvider.tsx` — React context
- `src/components/SignInForm.tsx`, `SignUpForm.tsx` (2-step wizard with Turnstile), `PhoneAuthForm.tsx`, `Turnstile.tsx`
- `src/app/api/auth/sign-in/route.ts`, `sign-up/route.ts`, `phone/route.ts`, `forgot-password/route.ts`, `reset-password/route.ts`, `sign-out/route.ts`, `me/route.ts`

### 7c. Twilio setup

1. Create Twilio account → upgrade from trial (removes "must verify recipient" restriction).
2. **Messaging → Verify** → create a Verify Service. Copy the SID.
3. Vercel env: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`.

### 7d. Turnstile setup

1. Cloudflare → Turnstile → Add site. Widget mode: **Managed**. Hostnames: apex + blog subdomain.
2. Vercel env: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.

**Do NOT leave test keys (`1x00000000000000000000AA`) in production** — they always pass and make the bot gate useless.

---

## 8. Fraud Scoring

`src/lib/fraud-score.ts`. Score 0–100. Hard-block at `>= 85`.

Signals:
- Disposable email domain (35 pts)
- Suspicious email pattern (10 pts)
- User velocity (>5 orders / 24h) (30 pts)
- Geo mismatch (shipping state vs IP country) (25 pts)
- Fresh account (< 1h old at checkout) (15 pts)

**Must-have hardening from the audit:**
- `scoreOrder()` is wrapped in `.catch(() => null)` in checkout routes. **Change to fail-closed** — treat score exceptions as a 503 retry, never a free pass.
- Add device fingerprint + shipping-address reuse signals if moving to serious scale.

---

## 9. Subscription Engine

Beyond the daily charge cron, the user-facing surface:

- `/account/subscriptions` — list + manage
- `src/app/api/subscriptions/route.ts` — GET (list user's), POST (create)
- `src/app/api/subscriptions/[id]/route.ts` — PATCH with actions: pause / resume / cancel / update_frequency / skip / update_payment

**Customer-facing frequencies:** 30 / 60 / 90 days. 10% base discount, laddered to 18% by loyalty tier.

**Internal test frequency:** `frequency=1` is allowed in the schema enum so a low-price test SKU can drive a daily renewal while you verify recurring billing after wiring your processor (Section 25).

**Critical bug to fix from audit:** `src/app/api/cron/subscriptions/route.ts:389-399` — success path doesn't null out `processingAt`. Add `processingAt: null` to that update.

---

## 10. Post-Purchase Upsell Funnel

`src/components/PostPurchaseUpsell.tsx` + `src/app/checkout/callback/CallbackClient.tsx`.

3-step flow after successful checkout:
1. **Step 1:** Hero SKU upsell (one-click add, 10% off)
2. **Step 2:** Reconstitution kit (bac water + syringes + swabs bundle)
3. **Step 3:** Subscribe & Save on original SKU (converts one-timers to recurring)

Each step has a skip button. Completion redirects to `/account/orders`.

GTM events fired per step: `upsell_view`, `upsell_accept`, `upsell_skip`.

---

## 11. Abandoned Cart Recovery

### Trigger

`/api/abandoned-cart/snapshot` is called from `CheckoutClient.tsx` when the user hits `begin_checkout` but doesn't complete.

### Data model

`abandoned_carts` table — items JSON blob, `stage` (0→3), `recoveryToken` for restore links.

### Drip sequence

`src/app/api/cron/abandoned-carts/route.ts` runs hourly (`15 * * * *`). Selects stage-N carts older than threshold, sends email N+1, advances stage.

| Stage | Delay | Subject |
|---|---|---|
| 0 → 1 | 1 hour | "Forgot something?" |
| 1 → 2 | 24 hours | "Your cart is waiting (10% off)" |
| 2 → 3 | 72 hours | "Last chance — your cart expires soon" |
| 99 | converted | No more emails |

### Restore flow

Email link → `/cart?restore=<token>` → `CartProvider` loads the snapshot.

**Bug to fix (audit):** cron SELECT-then-UPDATE is racy. Use `UPDATE WHERE stage = N RETURNING` atomic pattern.

---

## 12. Affiliate Program

### Surface

- `/affiliate` — public info page
- `/affiliate/signup` — form (custom affiliate code, payout method, bank/crypto details)
- `/affiliate/dashboard` — referral stats + unpaid commissions
- Admin tab: approve/suspend, adjust commission rate, issue payouts

### Backend

- `src/lib/affiliate.ts` — `createCommissionIfReferred(userId, orderId, total)`
- Cookie `sw-ref` set by `src/components/ReferralCapture.tsx` on landing with `?ref=<code>`
- User's `referredBy` locked at signup; commissions attach to any future order

### Files

- `src/app/api/affiliate/route.ts` — signup
- `src/app/api/admin/affiliates/route.ts` — list/update
- `src/app/api/admin/payouts/route.ts` — batch payout creation

**Audit fix:** `payoutDetails` (routing/account for ACH payouts) is currently stored as plaintext JSON. Encrypt with the same `src/lib/crypto.ts` helpers before writing.

---

## 13. Wholesale / B2B

Separate flow from retail — approval-gated, net terms, tiered pricing.

### Application

`/wholesale` → form with: company name, website, EIN (encrypted), institution type (university / lab / hospital / biotech / distributor), estimated monthly volume, use case.

### Admin approval

`/admin` → Wholesale tab. Approve/reject/suspend, set tier (1–4) with 20–25% discount, set credit terms (prepaid / net15 / net30 / net60) and credit limit.

### Ordering

Approved accounts get:
- Tier discount applied automatically
- PO number field on checkout
- Net-terms invoicing (if granted) — order processes without payment, invoice emailed

Files: `src/app/wholesale/`, `src/app/api/wholesale/`, `src/app/api/admin/wholesale/`.

---

## 14. Fulfillment

### ShipStation Custom Store (pull pattern)

1. ShipStation → Account Settings → Selling Channels → Store Setup → **Custom Store**.
2. URL: `https://<brand>.com/api/shipstation/orders`
3. Username: `SS_STORE_USERNAME` (set to any value, e.g., `<brand>-shipstation`)
4. Password: `SS_STORE_PASSWORD` (random 32-char string)
5. Set both in Vercel.

Endpoint serves orders in ShipStation's XML format filtered to `paymentStatus IN ('completed','pending')` within a date range.

### ShipStation Direct API (push pattern)

Also copy orders directly via REST. Requires:
- `SHIPSTATION_API_KEY`, `SHIPSTATION_API_SECRET` from ShipStation → Settings → API.

Files:
- `src/lib/shipstation.ts` — `createOrder()`
- `src/lib/fulfillment.ts` — `pushOrderToShipStation(orderId)` (idempotent, skips noShipping orders)
- Called from: your payment webhook under `/api/webhooks/` after you flip the order to `paid`, and the admin manual-order button

**Audit fix:** `pushOrderToShipStation` has a race — two callers can both see `shipstationOrderId = null`. Add atomic `UPDATE ... WHERE shipstationOrderId IS NULL RETURNING` guard.

### Ship24 tracking

`/api/cron/tracking-status` runs 4× daily (`0 8,12,16,20 * * *`). Polls Ship24 for each shipped order's milestone (pending / in_transit / out_for_delivery / delivered / exception). Auto-transitions order status to `delivered` on final event.

Env: `SHIP24_API_KEY`.

---

## 15. Email System

### Provider

Mailtrap — **Email Sending** product (not Testing). Configure the sending domain and DNS records (SPF, DKIM, DMARC).

Env: `MAILTRAP_API_KEY`.

### Files

- `src/lib/email.ts` — base `sendEmail({ to, subject, html })` + specific helpers (welcome, order confirmation, shipped, delivered, abandoned cart, password reset, subscription dunning, subscription charged, subscription paused, affiliate approved)
- `emails/` — reference HTML snippets (not a template engine, just content blocks)

### Pattern

Every email goes through a shared shell (brand header, "For Research Use Only" footer, unsubscribe link). Define `baseEmailShell(content)` in a single file to prevent style drift.

**Audit fix:** Several email sends are fire-and-forget without logging. At minimum `.catch((err) => console.error(...))` for each.

---

## 16. Bot Defense

Layered, cheapest-first:

1. **Middleware UA filter** (`src/middleware.ts:34-51`) — blocks known scrapers (semrush, ahrefs, mj12, data-for-seo, etc.) by user-agent regex. Drops requests at the edge before any route handler runs.
2. **Turnstile** on signup + phone auth (mandatory). Blocks 99%+ of signup bots.
3. **Rate limiting** (`src/lib/rate-limit.ts`) — in-memory per-lambda Map. **This is a known weakness** — see `ARCHITECTURE.md` and the audit. Move to Upstash Redis / Vercel KV before scaling to >50 req/s.
4. **Fraud scoring at checkout** — catches what got past 1–3.

### Restricted-compound robots.txt

`src/app/robots.ts` — block `/product/<restricted-slug>` for all bots. Also block `GPTBot`, `ClaudeBot`, `PerplexityBot` from restricted slugs specifically.

---

## 17. Tracking / CAPI / GTM

### Pixels (client-side)

- Meta: `NEXT_PUBLIC_META_PIXEL_ID`
- TikTok: `NEXT_PUBLIC_TIKTOK_PIXEL_ID`
- Reddit: `NEXT_PUBLIC_REDDIT_PIXEL_ID`
- GTM: `NEXT_PUBLIC_GTM_ID`
- Google Site Verification: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`

Wired in `src/components/TrackingProvider.tsx` + `GoogleTagManager.tsx`.

### Server-side CAPI

- Meta CAPI: `META_CAPI_TOKEN` — token from Events Manager → Settings → Conversions API
- TikTok Events API: `TIKTOK_CAPI_TOKEN`
- Reddit CAPI: `REDDIT_CAPI_TOKEN`

Fired from `src/lib/tracking.ts` — server-side events include hashed email/phone/IP for Enhanced Matching.

### First-party GTM proxy

`/_t/gtm.js`, `/_t/g/collect`, `/_t/ns.html` — edge routes that proxy to Google's CDN via your own domain, bypassing ad-blockers that blocklist `googletagmanager.com`.

Optional: set `NEXT_PUBLIC_GTM_SERVER_URL` to Stape/Cloudflare Zaraz for full server-side tagging (>$500/day spend only).

### Google Merchant Center feed

`src/app/api/gmc/feed.xml/route.ts` serves a GMC-compliant product feed. Submit `https://<brand>.com/api/gmc/feed.xml` in GMC → Feeds → Scheduled fetch (daily).

Full Google setup walkthrough in `docs/google-ads-setup.md`.

---

## 18. SEO Infrastructure

- `src/app/sitemap.ts` — includes all indexable pages, excludes upsellOnly + restricted
- `src/app/robots.ts` — allow/disallow rules + sitemap link
- `public/llms.txt` — LLM crawler-targeted content summary (keep restricted compounds OUT)
- `public/robots.txt` fallback if needed
- Product schema + BreadcrumbList JSON-LD on every `/product/<slug>`
- OG image generator: `/og-default.webp` (1200×630) + per-page overrides
- Every page has `generateMetadata` with title + description + canonical

**Audit fixes:**
1. Homepage, shop, legal/* pages need explicit `alternates.canonical`
2. `/shop?category=...` variants need canonical collapsing
3. Convert hero PNG to WebP for LCP

---

## 19. Compliance & RUO Framing

### The rule

This entire vertical operates under a **Research Use Only** doctrine. Every public surface must avoid:
- Medical claims ("treats", "cures", "prevents", "heals")
- Therapeutic language ("therapy", "treatment", "medicine")
- Dosage instructions for humans
- Consumer purchase framing

### The enforcement

1. **Copy audit on every page** — homepage, product pages, category rollups, advertorials, cart, checkout, emails.
2. **RUO chip** — visible on every product page (`ProductDetailClient.tsx`), cart drawer, checkout. Add an acknowledgement checkbox on ACH authorization.
3. **21+ Age gate** — `src/components/AgeGate.tsx` client + **server-enforced cookie** (fix from audit — currently client-only, trivially bypassed).
4. **Legal pages** — `/legal/terms`, `/legal/privacy`, `/legal/refund`, `/legal/shipping`, `/legal/research-use-only`. All linked from footer.
5. **Zero reviews / testimonials / ratings** anywhere. No `aggregateRating` in JSON-LD. No star icons. No user-generated content.

### Restricted compounds

See Section 5 masking rules. For GLP-1 class specifically (semaglutide, tirzepatide, retatrutide, cagrilintide):
- Use masked slugs (`glp1-smg`, `glp1-gip-tzp`, `glp3-rta`, `amy-cgr`)
- Use masked image filenames
- Exclude from sitemap + GMC feed
- Disallow in robots.txt
- Strip the real compound name from homepage hero, llms.txt, OG alt text

**The "Semaglutide" leak in Hero.tsx was the #1 compliance finding in the audit.** Do not reintroduce in any new brand.

---

## 20. Content: Advertorials (Brandon Ham Playbook)

### Structure

Every advertorial at `/research/<compound>`:

1. **Editorial header** — date, author byline, "Research Brief" label
2. **PADS lead** — Problem, Agitate, Dream, Solution — 3–4 paragraphs
3. **Disqualify alternatives** — "why not X, Y, or Z?" — builds authority
4. **Mechanism** — scientific explainer in lay language, 2–3 paragraphs
5. **Proof stack** — citations (real papers, properly attributed)
6. **Crossroads close** — "here are your options" soft CTA
7. **Future pacing** — paint the post-compound research outcome
8. **FAQ** — 6–8 common questions
9. **CTA** — link to product page

### Hard rules

- **Zero em dashes** (`—`). AI tell. Use periods, commas, or parentheses.
- **Lay-reader language.** Assume smart-but-not-scientist audience.
- **Never recommend a protocol** for humans. Always "research has investigated…" / "preclinical studies suggest…"
- **No bold claims.** Hedged language throughout.
- **Cite real papers** with proper author/year. PubMed IDs where possible.

### Files

`src/app/research/<compound>/page.tsx` — one file per compound. Reference: `ghk-cu/page.tsx` and `bpc-157/page.tsx`.

### Targeting

Advertorials are ad-landing pages, not SEO pages. They rank thinly on purpose (low Googleability to preserve Meta ad accounts); paid traffic is the point.

---

## 21. Admin Dashboard

`/admin` — gated by `role='admin'` in middleware + each API route.

Tabs:
1. **Overview** — 30d / 7d revenue, AOV, order counts, flagged orders (fraud score ≥ 60)
2. **Orders** — filter/search, expand for detail, manual status transitions, refund actions
3. **Customers** — search, signup geo (flag + IP on hover)
4. **Wholesale** — pending apps, tier/credit management
5. **Affiliates** — list, rate adjustment, payout issuance

Files: `src/app/admin/AdminDashboard.tsx` + `src/app/api/admin/*`.

**First admin bootstrap:**
```sql
UPDATE users SET role='admin' WHERE email='<operator-email>';
```

---

## 22. Legal Pages

Non-negotiable — every brand needs all five:

| Page | Path | Contents |
|---|---|---|
| Terms of Service | `/legal/terms` | User agreement, account termination, RUO doctrine, IP, liability cap |
| Privacy Policy | `/legal/privacy` | Data collected, cookies, CAPI, retention, user rights, contact |
| Refund Policy | `/legal/refund` | 14-day window, restocking fee if applicable, process |
| Shipping Policy | `/legal/shipping` | Carriers, cold-chain, delivery windows, lost package claims |
| Research Use Only | `/legal/research-use-only` | The full RUO statement — users certify they are research professionals |

All five linked from footer. Also linked from checkout (above the ACH authorization).

---

## 23. Deploy & Environment

### Deploy

```bash
cd <brand>
npx vercel --prod
```

**Rationale for CLI-over-CI:** The operator's memory explicitly specifies CLI deploys, skipping GitHub. Git commits happen but GitHub is not wired to auto-deploy. CI/CD can be added later for lint/typecheck gate without changing the deploy path.

### Environment variable list

Required in Vercel production (alphabetized):

```
ADMIN_ALERT_EMAIL           — where admin alert emails go
CRON_SECRET                 — Bearer token for /api/cron/* auth
DATABASE_URL                — Neon pooled
DATABASE_URL_UNPOOLED       — Neon direct
ENCRYPTION_KEY              — AES-256-GCM hex (32 bytes)
JWT_SECRET                  — session signing
KIE_API_KEY                 — image generation (scripts only)
MAILTRAP_API_KEY            — email sending
META_CAPI_TOKEN             — Meta CAPI
META_PIXEL_ID               — also set as NEXT_PUBLIC_META_PIXEL_ID
NEON_PROJECT_ID             — Neon
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
NEXT_PUBLIC_GTM_ID          — GTM container
NEXT_PUBLIC_GTM_SERVER_URL  — optional, for SGTM
NEXT_PUBLIC_META_PIXEL_ID
NEXT_PUBLIC_REDDIT_PIXEL_ID
NEXT_PUBLIC_SITE_URL        — e.g., https://<brand>.com
NEXT_PUBLIC_TIKTOK_PIXEL_ID
NEXT_PUBLIC_TURNSTILE_SITE_KEY
POSTGRES_*                  — Neon (8 vars, copy verbatim)
PG*                         — Neon (5 vars, copy verbatim)
REDDIT_CAPI_TOKEN
REDDIT_PIXEL_ID
SHIP24_API_KEY              — tracking
SHIPSTATION_API_KEY         — ShipStation REST API
SHIPSTATION_API_SECRET      — ShipStation REST API
SS_STORE_USERNAME           — ShipStation Custom Store basic auth
SS_STORE_PASSWORD           — ShipStation Custom Store basic auth
TIKTOK_CAPI_TOKEN
TIKTOK_PIXEL_ID
TURNSTILE_SECRET_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID
```

**Payment processor env vars:** none ship with this template. When you wire a processor (Section 6), add its API keys, secrets, and webhook signing secret here and to `.env.example`.

Keep `.env.example` up to date with all of these. Never check secret values into git.

---

## 24. Launch Checklist

### Pre-launch (1–2 days before)

- [ ] All products in catalog with images + copy
- [ ] All 5 legal pages published
- [ ] Footer has brand address + phone + all legal links
- [ ] RUO chip on product pages, cart, checkout
- [ ] Age gate visible on first visit (server cookie set after click)
- [ ] Restricted compounds fully masked (filenames, slugs, copy, llms.txt)
- [ ] Production Turnstile keys in prod env (not test keys)
- [ ] Payment processor wired at the integration point (Section 6), webhook verified, creds + signing secret in prod env
- [ ] Mailtrap on **Sending** plan, domain DNS configured (SPF/DKIM/DMARC)
- [ ] Twilio **upgraded from trial**
- [ ] Phone OTP end-to-end tested
- [ ] First admin user promoted via SQL
- [ ] ShipStation Custom Store URL + creds wired
- [ ] Ship24 API key set + tested on a fake shipped order
- [ ] GSC verified (NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION set)
- [ ] GMC account created + feed submitted
- [ ] GTM container created + GA4 tag wired + Google Ads conversion tags created
- [ ] Meta / TikTok / Reddit pixels + CAPI tokens live
- [ ] Vercel Analytics + Speed Insights visible in dashboard

### Day-of

- [ ] Deploy to prod: `npx vercel --prod`
- [ ] Smoke-test: homepage, shop, one product page, cart, one checkout, signup
- [ ] Place a low-price test order through your wired processor: verify the provider's charge succeeds, the webhook flips the order to `paid`, the order row is written, and the confirmation email sends
- [ ] Meta pixel firing verified via Test Events
- [ ] GTM preview mode shows purchase event firing
- [ ] Cron heartbeats configured (cronitor.io / healthchecks.io) for all 5 crons

### Week 1

- [ ] Monitor fraud scores in admin → adjust thresholds if >10% false positives
- [ ] Monitor subscription cron — no "CRITICAL" events in `subscription_events`
- [ ] Monitor GMC feed — resolve any disapprovals (usually restricted-compound names slipping through)
- [ ] Start Campaign 1 (branded search, $20/day) per `docs/google-ads-setup.md`

---

## 25. Post-Launch Verification

### Payment rail health

Once you have wired a processor, verify weekly that:
- Recent paid orders carry a `paymentReference` (the provider's charge/txn id) and a `paymentGateway` value
- Active subscriptions have `nextChargeDate` in the future
- No `payment_failed` subs without dunning emails in `subscription_events`

### Fulfillment health

```sql
SELECT status, payment_status, COUNT(*)
FROM orders
WHERE created_at > now() - interval '7 days'
GROUP BY 1, 2;
```

Expect `confirmed|completed` (paid) and `confirmed|pending` → eventually `shipped|completed` transitions. Anything stuck in `confirmed|pending` > 5 days = payment not confirmed (webhook never flipped the order to `paid`) or the fulfillment cron is broken.

### Fraud precision

```sql
SELECT fraud_score, COUNT(*), SUM(total)
FROM orders
WHERE fraud_score IS NOT NULL AND created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 1;
```

If >5% of orders score ≥ 85, threshold is too low. If chargebacks come from orders scoring < 30, add signals.

### Abandoned cart recovery

Expected conversion: 10–15% of stage-0 carts convert by stage-3.

```sql
SELECT stage, COUNT(*) FROM abandoned_carts
WHERE created_at > now() - interval '30 days' GROUP BY 1;
```

---

## 26. Known Gotchas & Audit Fixes

Compiled from the April 18 2026 security/correctness/architecture review. These are TODOs any replication should address:

### Critical (fix before production traffic)

1. **Payment webhook verification** — when you wire a processor, the webhook you add under `/api/webhooks/` must verify the provider's signature before it marks any order paid. Without it, anyone can forge a "paid" callback. Verify the signature header against the provider's signing secret, and key on `paymentReference` (or the provider's event id) so a replayed event is idempotent.
2. **ShipStation webhook forgery** — `/api/webhooks/shipstation` has no signature. Add ShipStation's HMAC header check.
3. **Charge idempotency** — when you wire payments, send an idempotency key to your processor and guard the checkout route so two concurrent submits cannot produce two charges. Add an `idempotency_keys` table keyed on `(userId, clientIdempotencyKey)`.
4. **In-memory rate limit** — `src/lib/rate-limit.ts` resets per lambda. Move to Upstash/KV.
5. **JWT not invalidated on password change** — add `passwordChangedAt` to `users`, compare to JWT `iat` in `verifyToken`.
6. **Fraud score fail-open** — `scoreOrder().catch(() => null)` passes the hard-block. Fail closed.
7. **Cron secret fail-open** — if `CRON_SECRET` unset, crons are world-callable. Require it.
8. **Subscription success path doesn't release lock** — `processingAt` left non-null forever after successful charge.
9. **Charge succeeds + DB write fails = customer billed, no order** — when you wire payments, handle the case where the provider confirms a charge but the order insert fails. Add a retry/reconciliation path and alert to `ADMIN_ALERT_EMAIL`.
10. **Server-enforced age gate missing** — currently localStorage only. Add cookie + middleware check.
11. **Semaglutide/Tirzepatide leak** — Hero.tsx / llms.txt / OG alt text still expose the restricted names. Strip + mask slugs.

### High

- Password reset token: add single-use atomic guard + hash the token in DB.
- ShipStation push: atomic `WHERE shipstationOrderId IS NULL` guard to prevent double-ship.
- Admin refund: check `paymentStatus != 'refunded'` before calling gateway.
- Order state: enforce a transition matrix (no `shipped → pending`).
- Settlement cron: also filter `status IN ('confirmed','processing')` to skip cancelled.

### Medium

- Consolidate `generateOrderNumber()`, `maskAccount()`, `getSiteUrl()` into `src/lib/order-utils.ts` (currently duplicated 3× each).
- Add composite DB indexes: `subscriptions(status, nextChargeDate)`, `abandoned_carts(stage, updatedAt)`, `orders(status, trackingMilestone)`.
- Encrypt `affiliates.payoutDetails.routingNumber/accountNumber`.
- Shared error-response helper instead of 32 copies of the try/catch boilerplate.

### Low

- Add `ENCRYPTION_KEY` version prefix for rotation.
- Add `crypto.timingSafeEqual` on all secret comparisons.
- Convert hero PNG → WebP for LCP.
- Test coverage: start with `cron/subscriptions.test.ts`, `fraud-score.test.ts`, `crypto.test.ts`, `discounts.test.ts`. Add tests for your payment integration once it is wired (charge success, charge failure, webhook signature verification, idempotency).

---

## 27. Reference Files (copy verbatim)

These can be copied unchanged between brands — they're infrastructure, not brand-specific:

- `src/lib/auth.ts`
- `src/lib/crypto.ts`
- `src/lib/fraud-score.ts`
- `src/lib/rate-limit.ts`
- `src/lib/turnstile.ts`
- `src/lib/twilio.ts`
- `src/lib/shipstation.ts`
- `src/lib/tracking-status.ts`
- `src/lib/fulfillment.ts`
- `src/lib/affiliate.ts`
- `src/lib/discounts.ts`
- `src/lib/email.ts` (update brand header in baseEmailShell)
- `src/lib/gtm-datalayer.ts`
- `src/lib/db/schema.ts` + `src/lib/db/index.ts`
- `src/middleware.ts` (update `goneUrls` for brand-specific legacy URLs)
- All `src/app/api/**/*` routes
- All `src/components/*` except `Hero.tsx`, `Footer.tsx`, `Header.tsx` (brand-specific)

**Brand-specific files that must be rewritten:**

- `src/lib/products.ts` — the catalog
- `src/lib/product-content.ts` — per-SKU long copy
- `src/lib/categories.ts` + `src/lib/category-content.ts`
- `src/components/Hero.tsx` — headline, hero image
- `src/components/Footer.tsx` — brand address, legal links
- `src/components/Header.tsx` — logo, nav labels
- `src/app/page.tsx` — homepage
- `src/app/about/page.tsx`, `src/app/faq/page.tsx`, `src/app/coa/page.tsx`, `src/app/membership/page.tsx`
- `src/app/legal/*` — all 5 pages
- `src/app/research/*` — advertorials per compound
- `public/` — all images, logos, favicons, llms.txt, og-default.webp

---

## 28. Separate Blog Project

Every brand ships a second Astro project for the blog at `blog.<brand>.com`. Reference: `/path/to/blog`.

**Why separate:**
- Editorial pace vs commerce pace
- Bundle size — blog loads 20+ MDX articles, commerce doesn't need them
- Allows independent deploys
- Astro's static output is cheaper to serve than Next's SSR

**Setup:**
```bash
npm create astro@latest <brand>-blog -- --template minimal
```

Then add `astro.config.mjs` with `site`, MDX integration, content collections at `src/content/articles/*.mdx`, RSS + sitemap, and a product-page crosslink config (`src/lib/product-blog-links.ts` in the main repo maps product slugs → blog article slugs for the `RelatedResearch` component).

Deploy to a separate Vercel project, alias to the subdomain.

---

## 29. Memory Artifacts

The operator's preferences that apply to every brand launch:

1. **Deploy via Vercel CLI only**, skip GitHub auto-deploy (per `~/.claude/projects/.../memory/feedback_no_github.md`).
2. **Ship the complete thing.** Per `CLAUDE.md` soul: tests + docs + fixes + compliance. Not a plan to build, the finished product.

---

*Last updated: 2026-04-18. Sourced from the Based Research reference implementation. For the why behind the how, read `ARCHITECTURE.md`.*
