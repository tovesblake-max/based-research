# Google Ads / Merchant Center / Tag Manager — Setup Checklist

All the infrastructure code is already deployed. You just need to create the Google accounts, grab the IDs, and paste them into Vercel env vars. ~25 minutes total.

---

## Step 1 — Google Search Console (5 min)

Verifies you own basedresearch.com. Required by GMC.

1. Go to https://search.google.com/search-console
2. Click **Add property** → **URL prefix** → enter `https://basedresearch.com`
3. Pick the **HTML tag** verification method
4. Copy the `content="..."` value (e.g. `aBcDeFgHiJkLmNoP`)
5. Add it to Vercel env vars:
   ```
   vercel env add NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION production
   # paste the value when prompted
   ```
6. Deploy: `npx vercel --prod`
7. Back in GSC, click **Verify**. Should succeed.

---

## Step 2 — Google Merchant Center (15 min)

Where your product feed lives. Required for Shopping ads.

1. Go to https://merchants.google.com and create account
2. Business info:
   - Business name: **Based Research**
   - Country: **United States**
   - Time zone: **America/Chicago**
3. About your business:
   - Phone: `(888) 300-0190` (matches footer)
   - Website: `https://basedresearch.com`
4. **Tools and settings → Business information → Website** → Verify & claim (auto-pulls from Search Console)
5. **Tools and settings → Shipping and returns → Shipping** → Add shipping service:
   - Service name: `UPS 2nd Day Air`
   - Country: US
   - Rate: `$14.99` (set free threshold at `$200` → match our checkout)
6. **Tools and settings → Return policy** → point at `https://basedresearch.com/legal/refund`
7. **Products → Feeds → Add primary feed**:
   - Country: US / English
   - Feed name: `Based Research Main Feed`
   - Method: **Scheduled fetch**
   - Fetch URL: `https://basedresearch.com/api/gmc/feed.xml`
   - Frequency: Daily
   - Time: 03:00 America/Chicago
8. Click **Create feed**, then **Fetch now**
9. Wait 1–4 days for Google to review. It'll email you when approved.

---

## Step 3 — Google Ads (10 min)

Where ads run.

1. Go to https://ads.google.com → Create account → **Switch to expert mode** (skip the guided setup)
2. **Tools → Linked accounts → Google Merchant Center → Link** (auto-finds it if same Google login)
3. **Tools → Conversions → New conversion action → Website**:
   - Category: **Purchase**
   - Name: `Based Research Purchase`
   - Value: **Use different values for each conversion** (tag sends dynamic value)
   - Count: **Every**
   - Conversion window: 30 days
   - Attribution: Data-driven
4. Click **Create and continue** → **Use Google Tag Manager**
5. Copy the **Conversion ID** (like `AW-1234567890`) and **Conversion Label** (like `AbCdEfGhIjKlMnOp`)
6. Save these — you'll paste them into GTM in Step 4.

Repeat the conversion action setup for:
- `Based Research Begin Checkout` (category: Begin Checkout)
- `Based Research Add To Cart` (category: Add to Cart)

---

## Step 4 — Google Tag Manager (10 min)

Where tags are configured. The site already pushes events; GTM is the routing layer.

1. Go to https://tagmanager.google.com → Create container → Web → `basedresearch.com`
2. Copy the **container ID** (`GTM-XXXXXXX`)
3. Add to Vercel:
   ```
   vercel env add NEXT_PUBLIC_GTM_ID production
   # paste GTM-XXXXXXX
   ```
4. Deploy: `npx vercel --prod`
5. Open GTM container. **Add tags** (one by one):

### Tag: GA4 Configuration
- Type: **Google Analytics: GA4 Configuration**
- Measurement ID: your `G-XXXXXXXXXX` (create at https://analytics.google.com → Admin → Data Streams → Web)
- Trigger: **All Pages**

### Tag: GA4 — view_item
- Type: **Google Analytics: GA4 Event**
- Configuration tag: (the GA4 Config above)
- Event name: `{{Event}}` (use variable)
- Trigger: **Custom Event → `view_item`**
- Send Ecommerce data: **From Data Layer**

(Repeat for `add_to_cart`, `begin_checkout`, `purchase` — or configure GA4 to auto-collect ecommerce events.)

### Tag: Google Ads Conversion — Purchase
- Type: **Google Ads Conversion Tracking**
- Conversion ID: `AW-1234567890`
- Conversion Label: `AbCdEfGhIjKlMnOp`
- Conversion Value: `{{ecommerce.value}}`
- Order ID: `{{ecommerce.transaction_id}}`
- Currency Code: `USD`
- **Enhanced Conversions**: **Enable**, source: **Data Layer**, variable: `user_data`
- Trigger: **Custom Event → `purchase`**

### Tag: Google Ads Remarketing
- Type: **Google Ads Remarketing**
- Conversion ID: `AW-1234567890` (same as above)
- Dynamic remarketing → ecommerce data → **From Data Layer**
- Trigger: **All Pages**

6. Hit **Submit → Publish**.

---

## Step 5 — Test (5 min)

1. Install the **Google Tag Assistant** Chrome extension
2. Visit basedresearch.com → click into a product → add to cart → checkout
3. Tag Assistant should show: `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase` firing in order
4. Check GA4 → Realtime: events should appear within 30 seconds
5. Check Google Ads → Conversions: status should move from "Recording conversions" to "Recording" within 24 hours of first test conversion

---

## Env vars summary

Drop these into Vercel (`vercel env add ... production`):

| Var | Value | Set by |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | from Step 1 | You |
| `NEXT_PUBLIC_GTM_ID` | `GTM-XXXXXXX` from Step 4 | You |
| `NEXT_PUBLIC_GTM_SERVER_URL` | (optional) first-party proxy URL — see Step 6 | Later |

No secret tokens needed for any of this — all IDs are public and embedded client-side.

---

## Step 6 — Server-side tagging (optional, do later)

Once you're spending >$500/day on Google Ads, set this up to improve attribution accuracy:

**Option A — Cloudflare Zaraz** (if you move DNS to Cloudflare)
- Free up to 100K events/month
- Set up at https://dash.cloudflare.com → Zaraz
- Configure GA4, Google Ads, Meta, TikTok destinations
- First-party subdomain automatic: `ct.basedresearch.com`
- Set `NEXT_PUBLIC_GTM_SERVER_URL=https://ct.basedresearch.com`

**Option B — Stape.io** (no DNS change needed)
- $15/month, fully managed
- Creates a subdomain like `load.basedresearch.com`
- One-click GA4, Google Ads, Meta CAPI integrations
- Set `NEXT_PUBLIC_GTM_SERVER_URL=https://load.basedresearch.com`

Until then, the site uses Google's standard `googletagmanager.com` CDN — ad blockers will block some traffic but enough gets through for early testing.

---

## Campaign Launch Order

After Steps 1-5 are live and GMC feed is approved (typically day 3-4):

**Campaign 1 — Branded Search** ($20/day cap)
- Keyword: `your-brand-name` (exact)
- Ad: send to homepage
- Purpose: defensive — prevents competitors from stealing your brand searches

**Campaign 2 — Shopping Performance Max** ($100/day starting)
- Campaign type: Performance Max
- Goal: Sales
- Feed: your GMC feed
- Asset group: upload 5 product lifestyle images, 5 short headlines, brand logo
- Audience signals: high-intent searches for BPC-157, TB-500, NAD+, GHK-Cu (only the "safe" compounds — never include restricted ones)
- Let it run 14 days minimum before scaling

**Campaign 3 — Pmax per product** (once Campaign 2 is profitable)
- One Pmax campaign per product (BPC-157, TB-500, etc.)
- Filter the feed to a single product ID per campaign
- Tighter audience signals → higher ROAS

Skip all other campaign types until these three are dialed.

---

## Questions you'll probably hit

**Q: GMC says "Disapproved — misrepresentation".**
A: Look at the disapproved items. Usually it's a restricted compound sneaking into the feed. Add its slug to the `EXCLUDED_SLUGS` set in `/src/app/api/gmc/feed.xml/route.ts`.

**Q: Conversion tracking shows 0 conversions after 2 days.**
A: Check Tag Assistant on a test purchase. If `purchase` event fires but Google Ads shows 0, the Conversion ID/Label in GTM is wrong. Double-check against Google Ads → Conversions → your action → Setup.

**Q: GA4 shows traffic but no ecommerce events.**
A: In GA4 → Admin → Data Streams → [your stream] → Enhanced measurement → **turn OFF** "Purchases" (we're sending it manually via dataLayer, don't want duplicates).

**Q: Can I advertise Semaglutide / Tirzepatide / Retatrutide directly?**
A: No. Those products are already masked out of the feed. Create a new product feed variant with the masked names if/when you want to try (matches Caleb's title-masking playbook).
