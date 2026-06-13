# Compliance Gating Schematic

**The single most important architecture decision for getting a peptide / RUO storefront approved by a card processor.**

This doc exists because the requirement is counterintuitive and easy to get backwards. Getting it wrong either (a) gets you declined by the processor, or (b) gets you flagged for missing compliance screening. Getting it right satisfies both at once.

---

## The core confusion (read this first)

The word "gate" gets used for two completely different things. They are NOT the same, and conflating them is the #1 mistake:

| | **Eligibility gate** | **Account/login gate** |
|---|---|---|
| What it is | Age + researcher interstitial ("I am 21+ and a qualified researcher → Enter") + RUO attestation checkbox | Hard signup wall — you can't see *any* product without an account |
| What it does | **Screens the buyer.** Products stay visible. | **Hides the catalog** from everyone, including reviewers. |
| Who wants it | Card processors, card networks, MCC 5169 pre-vet | Nobody. It's a self-inflicted over-correction. |

**Processors want the eligibility gate. They do NOT want the catalog hidden behind a login.**

## Why the two requirements aren't actually in conflict

Merchants hear two things and think they contradict:

1. "High-risk processors require a gated/screened process." ✅ True — they want **age verification + RUO attestation + account-to-purchase**.
2. "Every processor's reviewer must be able to see all your products." ✅ Also true — their rule is the site must be **fully functional and publicly accessible**.

These only conflict if you implement requirement #1 as a **login wall on the catalog**. They stop conflicting the moment you realize requirement #1 is about **screening the buyer and labeling the product**, not hiding the catalog.

The resolution: **gate the PURCHASE, not the BROWSE.**

## How card processors actually review a site

Assume all three layers, because elevated-risk MCCs (5169 chemicals, etc.) get all three:

1. **Automated crawler** — fetches the URL, parses mostly **raw HTML + meta tags**. Does NOT reliably execute your JavaScript. → Compliance signals must be in **server-rendered HTML**, not client-only modals.
2. **Headless render** — risk systems *can* run JS, but don't rely on it. SSR is the safe bet.
3. **Human reviewer** — for high-risk MCCs, a person opens the site in a browser and clicks around. They will NOT create an account. **If the catalog is behind a login, they see nothing and the application stalls or declines** ("we could not access your website").

Net: the catalog must be publicly browsable (for the human), and the compliance signals must be in SSR HTML (for the bot).

---

## The canonical configuration

| Surface | State | Why |
|---|---|---|
| Homepage `/` | **Public** | First thing the crawler + reviewer hit |
| `/catalog`, `/shop` | **Public** | Reviewer must see what you sell |
| `/product/*` | **Public** | Product detail + RUO labeling + COA panel must be visible |
| `/coa` | **Public** | Lab-results page is a core trust + compliance signal |
| `/research/*` | **Public** | Editorial / educational pages reinforce RUO positioning |
| `/about`, `/faq`, `/contact`, `/membership`, `/wholesale` | **Public** | Business legitimacy signals |
| `/cart` | **Public** | Viewing a cart is browse, not purchase |
| `/legal/*` | **Public** | Terms/privacy/RUO required reachable by every processor |
| **Age-gate modal** | **Layered on all public pages** | Client-side 21+ / researcher interstitial. Screens the buyer without hiding products. |
| `/checkout/*` | **Gated** (login required) | You must have an account to BUY |
| `/account/*` | **Gated** | Personal data |
| `/affiliate/*` | **Gated** | Partner dashboards |
| `/track` | **Gated** (optional) | Order data; not a browse surface |
| `/admin/*` | **Self-gated** | Own auth + role check |

**Browse freely (screened by the age modal). Make an account to purchase.** That is the entire model.

## The six MCC 5169 compliance signals (must be in SSR HTML)

A pre-vet scanner looks for these as plain crawlable text. Put them in **server-rendered** markup (footer is ideal — it's on every page; plus product pages; plus a compliance band on the landing surface). Do NOT bury them in client-only modals.

1. **Age gate / 21+** — "You must be 21 years or older," "age verification required," "age-gated."
2. **Not for human consumption** — "not for human consumption," "not for human or animal consumption."
3. **Certificate of Analysis** — "Certificate of Analysis (CoA)," "batch-linked certificates of analysis." Plus a real, reachable sample CoA URL.
4. **Analytical-grade biochemical reference standards** — the literal phrase. Positions you as a reference-standard supplier, not a consumer wellness shop.
5. **Academic / biotech / contract research / laboratory buyers** — name the buyer types. Establishes B2B research-supply intent.
6. **Research Use Only (RUO)** — "For Research Use Only," "in-vitro research only," "not a drug/food/supplement/device," "not evaluated by the FDA."

## Implementation in this template

### 1. Middleware: public-browse / gated-purchase split

In `src/middleware.ts`, the `isPublicPath()` function decides what bypasses any site gate. The browse surfaces are listed as public; checkout/account stay gated. If you run a site-wide login gate, the public list is what a crawler/reviewer can reach.

```ts
// Public storefront — browse + marketing surfaces.
// Processors require a publicly accessible site. Screen buyers with the
// age-gate modal + RUO attestation at checkout, NOT by hiding the catalog.
if (
  pathname === "/" ||
  pathname === "/catalog" ||
  pathname === "/shop" ||
  pathname.startsWith("/product/") ||
  pathname === "/coa" ||
  pathname === "/about" ||
  pathname === "/faq" ||
  pathname === "/contact" ||
  pathname === "/membership" ||
  pathname === "/cart" ||
  pathname.startsWith("/research/") ||
  pathname.startsWith("/wholesale")
) return true;
// /checkout/*, /account/*, /affiliate/* fall through to the gate below.
```

**Do NOT redirect the apex `/` for crawlers.** If you must gate something at the root, use `NextResponse.rewrite` (HTTP 200, content served) rather than `NextResponse.redirect` (307) — many scanners don't follow redirects and score a bare 307 as "no content." Best practice: keep `/` genuinely public.

### 2. Age-gate modal

`src/components/AgeGate.tsx` renders a 21+ / qualified-researcher interstitial on top of the public site, persisted via localStorage. It screens the buyer without hiding the catalog. Keep it.

### 3. SSR compliance signals

Three places, all server-rendered:
- **Footer** (`src/components/Footer.tsx`) — RUO + not-for-consumption disclaimer on every page. Keep it a server component (no `"use client"`), and make sure whatever wraps it doesn't suppress SSR.
- **Product pages** — RUO labeling + COA panel per product.
- **Landing surface** — if you run a signup gate, put a full signal band on the public landing page (see the `sign-up` page compliance band pattern). If you don't gate, the footer + product pages cover it.

### 4. RUO attestation at signup + checkout

A required checkbox: "I confirm these products are for laboratory research use only and will not be used for human or animal consumption." Enforce server-side too.

### 5. Pre-vet deliverables (assets the merchant provides)

- **Sample CoA URL** — at least one COA must be uploaded (Admin → Lab COAs). The public file URL (`/api/coas/<id>/file`) becomes the sample link. An empty COA system = an unanswerable pre-vet field.
- **Shipping label example URL** — a redacted example shipping label hosted at a stable URL (e.g. `/compliance/sample-shipping-label.png`).

---

## Replicating for a new brand

When standing up a new brand on this template:

1. Keep the `isPublicPath` browse/purchase split as-is. Only add brand-specific public routes if you create new marketing pages.
2. Keep the age-gate modal. Swap the brand name in its copy.
3. Keep the footer RUO disclaimer (server-rendered). Swap legal entity + jurisdiction.
4. Ensure all six compliance signals appear in SSR HTML on the homepage + product pages. Verify with:
   ```bash
   curl -s https://NEWBRAND.com/ | grep -ioE "21 years|not for human consumption|certificate of analysis|analytical-grade biochemical reference standards|contract research|research use only"
   ```
   All six categories should return matches.
5. Upload at least one sample COA before submitting for pre-vet.
6. Host a redacted sample shipping label.
7. Submit the **publicly browsable** site URL to the processor. Do not submit a login-walled URL.

## The one-sentence rule

**Public catalog + age-gate modal + RUO labeling + gated checkout** — that is the posture that passes both the high-risk pre-vet (screening + labeling) and a processor's human review (publicly accessible products). Anything that hides the catalog behind a login fails the second one.
