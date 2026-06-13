# Based Research — Current Status

Single-page handoff. Keep this updated after major changes.

---

## Live right now

**Site:** https://basedresearch.com (Vercel Pro, Next.js 16 App Router)
**Blog:** https://blog.basedresearch.com (Astro, separate Vercel project)

### Stack
- **Auth:** email/password + Twilio phone OTP (mandatory on all signups, bot-killer)
- **Payments:** No processor wired. Checkout creates an `unpaid` order; wire your processor in `src/app/api/checkout/route.ts` and confirm payment via a webhook under `/api/webhooks/`.
- **Shipping:** UPS 2nd Day Air via ShipStation Custom Store + Ship24 tracking
- **DB:** Neon Postgres via Drizzle
- **Email:** Mailtrap (transactional + abandoned-cart)
- **Tracking:** Meta + TikTok + Reddit server-side CAPI + GTM (slot ready) + GA4 + Google Ads conversion
- **Edge proxy:** First-party GTM loader at `/_t/gtm.js` (ad-blocker bypass)
- **Catalog:** 41 live products + 3 upsell-only accessories (hidden from crawl)
- **Fraud:** Scoring at checkout, hard-block ≥ 85
- **Defense:** Middleware bot gate (16 known scrapers blocked), Cloudflare Turnstile on signup + phone auth, 21+ age gate, 410 for legacy retatrutide URL

### Compliance
- Restricted-compound masking: Retatrutide fully renamed to `glp3-rta`; Semaglutide/Tirzepatide/Cagrilintide have masked image filenames and robots.txt disallows
- All claim-language scrubbed from category names, product copy, and product-content.ts bullet titles
- Zero reviews / ratings / testimonials anywhere on the site
- All legal pages live: Terms, Privacy, Refund, Shipping, Research Use Only
- RUO framing enforced on every surface (advertorials, product pages, blog)

### Advertorials (ad-ready landing pages)
- `/research/ghk-cu` — PADS lead, copper-decomplexation angle
- `/research/bpc-157` — Discovery-story lead, Zagreb 1993 + salt-form angle
- Both follow Brandon Ham's advertorial playbook (lead variance, disqualify alternatives, crossroads close, future pacing, FAQ)
- Zero em dashes, simplified language for smart-but-non-scientist readers

---

## What's blocking revenue (user actions needed)

| Blocker | Owner | ETA |
|---|---|---|
| Payment processor selection + wiring (see `src/app/api/checkout/route.ts` PAYMENT INTEGRATION POINT) | Owner | Pending |
| Google Search Console domain verification | User: https://search.google.com/search-console | 5 min |
| Google Merchant Center setup + feed submission | User: https://merchants.google.com (feed URL `https://basedresearch.com/api/gmc/feed.xml`) | 15 min |
| Google Ads account + conversion actions | User: https://ads.google.com | 10 min |
| GTM container creation, paste `NEXT_PUBLIC_GTM_ID` into Vercel | User | 10 min |
| Twilio trial → production upgrade | User | 5 min |
| Cloudflare Turnstile real keys (currently test keys) | User: https://dash.cloudflare.com → Turnstile | 5 min |

Checklist with exact clicks: `docs/google-ads-setup.md`

---

## Env vars (Vercel production)

**Set:**
- DATABASE_URL, JWT_SECRET
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID
- MAILTRAP_API_KEY
- KIE_API_KEY (for image generation scripts)
- NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY (currently test keys)

**Pending (waiting on user):**
- Payment processor env vars (set once you wire a processor)
- NEXT_PUBLIC_GTM_ID
- NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
- Google Ads Conversion ID + Label (goes into GTM, not env)

---

## Useful scripts

```bash
# Regenerate one product image
npx tsx scripts/gen-vials-with-logo-ref.ts <slug>

# Regenerate all 45 product images
CONCURRENCY=8 npx tsx scripts/gen-vials-with-logo-ref.ts

# Build/open product-image review UI
npx tsx scripts/build-review.ts && open scripts/review-built.html

# Push DB schema changes
npx dotenv-cli -e .env.local -- npx drizzle-kit push

# Run migration scripts
npx dotenv-cli -e .env.local -- npx tsx scripts/<migration-file>.ts

# Deploy
cd ~/Documents/based-research && npx vercel --prod
```

---

## Crons (Vercel)

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/subscriptions` | `0 10 * * *` | Subscription renewal cron (no-op until recurring billing is wired) |
| `/api/cron/subscription-reminders` | `0 9 * * *` | Upcoming-charge reminders |
| `/api/cron/tracking-status` | `0 8,12,16,20 * * *` | Ship24 milestone polling |
| `/api/cron/abandoned-carts` | `15 * * * *` | Hourly abandoned-cart email dispatch |

---

## Most recent work (this session)

- **Advertorials built:** GHK-Cu, BPC-157 (Brandon Ham playbook, no em dashes, lay-reader language, RUO-compliant)
- **Reviews stripped:** `getProductRating` deleted, all Star icons removed, JSON-LD aggregateRating stripped
- **Phone verification mandatory:** rewrote sign-up API + 2-step signup form wizard with Turnstile
- **Upsell accessories hidden:** bac water, syringe kit, alcohol swabs get `upsellOnly: true` flag, excluded from catalog/sitemap/GMC/product-page static generation
- **Abandoned-cart system:** `abandoned_carts` table, snapshot API, 3-email cron, `/cart?restore=<token>` recovery
- **Post-purchase upsell flow:** 3-step funnel on checkout callback (hero SKU → reconstitution kit → Subscribe & Save)
- **Fraud scoring:** `src/lib/fraud-score.ts`, disposable-email detection, velocity checks, geo-mismatch, hard-block ≥ 85
- **Vercel Analytics + Speed Insights:** wired in root layout
- **Server-side GTM proxy:** `/_t/gtm.js`, `/_t/g/collect`, `/_t/ns.html` edge routes
- **Footer:**  + phone + contact block (GMC requirement)

---

## Paper trail

Longer context in:
- `docs/google-ads-setup.md` — Google stack setup walkthrough
- `src/lib/product-blog-links.ts` — product → blog cross-link map
- Blog: `/path/to/blog/` (separate repo)

Everything else is searchable in git history.
