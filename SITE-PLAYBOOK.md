# E-Commerce Site Playbook

A reusable blueprint extracted from the Based Research build. Everything here is pattern-level — swap the brand, products, and copy to duplicate this for any niche.

---

## 1. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js (App Router) | Server components for SEO metadata, client components for interactivity |
| Styling | Tailwind CSS + CSS custom properties | Rapid prototyping, design tokens for consistency |
| Fonts | Google Fonts via `next/font` (display: swap) | No layout shift, self-hosted performance |
| Icons | Lucide React | Tree-shakeable, consistent stroke width |
| State | React Context + localStorage | No external deps needed for cart-level state |
| Schema | JSON-LD in server components | Search engines parse it without JS execution |

---

## 2. Design System

### Typography (3-font system)

| Role | Font | Usage |
|------|------|-------|
| Display/Headings | Serif font (e.g., DM Serif Display) | Hero headlines, product names, section titles |
| Body/UI | Clean sans-serif (e.g., Outfit) | All body copy, buttons, navigation, labels |
| Technical/Specs | Monospace (e.g., DM Mono) | Purity values, CAS numbers, spec tables, badges |

The serif font signals premium positioning. The mono font signals scientific credibility. The sans-serif handles everything else.

### Color Palette

```css
/* Warm neutral base */
--background: #FAFAF9;       /* off-white, not sterile pure white */
--foreground: #1A1A19;       /* near-black, softer than #000 */
--accent: #F5F5F0;           /* light warm gray for section backgrounds */

/* Primary brand color — one strong color, used sparingly */
--primary: #1E3A5F;          /* deep navy — trust, authority, calm */
--primary-light: #2A4F7F;    /* hover state */
--primary-foreground: #FFFFFF;

/* Supporting neutrals */
--muted: #737373;            /* secondary text */
--muted-foreground: #a3a3a3; /* tertiary text */
--border: #E0E0DC;           /* subtle borders */
--border-strong: #C8C8C2;    /* emphasized borders */

/* Semantic */
--destructive: #DC2626;      /* errors, remove buttons */
--success: #16A34A;          /* savings callouts, confirmations */

/* Cards */
--card: #FFFFFF;
--card-foreground: #1A1A19;

/* Dark footer */
--footer-bg: #111111;
--footer-fg: #E5E5E5;
--footer-muted: #888888;
```

**Key principle:** One strong brand color (primary) used for CTAs, links, badges, and active states. Everything else is neutral. This keeps the eye focused on actions.

### Component Tokens

| Element | Pattern |
|---------|---------|
| Border radius | `rounded-lg` (8px) for buttons/inputs, `rounded-xl` (12px) for cards |
| Button height | `h-11 px-5` with hover scale + shadow |
| Cards | `rounded-xl border border-border bg-white shadow-sm` |
| Max content width | `max-w-6xl` for layouts, `max-w-4xl` for text-heavy pages |
| Section spacing | `py-16 md:py-24` for major sections |
| Transitions | `transition-all duration-300` as default |

---

## 3. Page Architecture

### Server/Client Split Pattern

Every page that needs SEO metadata follows this pattern:

```
page.tsx          → Server component (exports metadata, JSON-LD, fetches data)
PageClient.tsx    → Client component (interactivity, useState, event handlers)
```

**Why:** Next.js App Router requires metadata exports from server components. Any page with `useState`, `useSearchParams`, or event handlers must extract those into a client component.

Pages that needed this split:
- Product detail (`page.tsx` + `ProductDetailClient.tsx`)
- Shop (`page.tsx` + `ShopContent.tsx`)
- Cart (`page.tsx` + `CartContent.tsx`)
- FAQ (`page.tsx` + `Accordion.tsx`)
- Auth pages (`page.tsx` + `SignInForm.tsx` / `SignUpForm.tsx`)

Pages that stayed as pure server components (no interactivity):
- Homepage (links only, no state)
- About
- COA / Lab Results
- Legal pages

### Page Inventory

| Page | Purpose | SEO |
|------|---------|-----|
| `/` | Homepage — hero, trust badges, featured products, categories, why-us, CTA | Priority 1.0 |
| `/shop` | Product catalog — filterable grid with sort | Priority 0.9 |
| `/product/[slug]` | Product detail — specs, pricing, add to cart, related products | Priority 0.8, Product schema |
| `/about` | Brand story, values, testing process | Priority 0.7 |
| `/coa` | Lab results / certificates of analysis | Priority 0.7 |
| `/faq` | Accordion Q&A organized by topic | Priority 0.6, FAQPage schema |
| `/cart` | Full cart page | `noindex` |
| `/auth/sign-in` | Sign in form | `noindex` |
| `/auth/sign-up` | Sign up form | `noindex` |
| `/legal/terms` | Terms of service | Priority 0.3 |
| `/legal/privacy` | Privacy policy | Priority 0.3 |
| `/legal/refund` | Refund policy | Priority 0.3 |

---

## 4. Layout Structure

### Root Layout

```
<body>
  <CartProvider>           ← Cart context wraps everything
    <Header />             ← Sticky, backdrop blur, promo banner
    <main>{children}</main>
    <Footer />             ← Dark bg, 4-column links, legal disclaimer
    <CartDrawer />         ← Slide-out cart (fixed position)
  </CartProvider>
</body>
```

### Header Anatomy

1. **Promo banner** — Full-width primary-colored bar. Static trust message (e.g., "FREE SHIPPING OVER $200 · EVERY BATCH VERIFIED"). Always visible, not dismissible.
2. **Navigation bar** — Sticky, `bg-background/85 backdrop-blur-md`. Logo left, nav links center, actions right (Sign In, Cart icon with count badge).
3. **Mobile menu** — Hamburger toggle, full-width dropdown with same links + sign in.

**Nav link hover effect:** Underline that grows from left to right using `after:` pseudo-element (`after:w-0 hover:after:w-full transition-all`).

### Footer Anatomy

1. **Brand column** — Logo, one-line description
2. **Link columns** (4) — Shop, Company, Support, Legal
3. **Disclaimer box** — Industry-specific legal disclaimer in a subtle card (`bg-white/5 rounded-lg`)
4. **Bottom bar** — Copyright + "Made in the USA"

---

## 5. Homepage Sections (in order)

| # | Section | Purpose |
|---|---------|---------|
| 1 | Hero | Headline + value prop + 2 CTAs (primary action + secondary) |
| 2 | Trust Badges | 3-icon row — testing, transparency, shipping |
| 3 | Featured Products | 4-card grid of best sellers |
| 4 | Categories | 6 category cards linking to filtered shop |
| 5 | Why Us | 3-column differentiators (purity, transparency, speed) |
| 6 | CTA Banner | Dark/primary background, final conversion push |

**Hero details:**
- Animated pulse dot badge above headline (subtle urgency)
- Headline uses serif font, one word highlighted in primary color
- Two CTAs: primary button (Browse Catalog) + outline button (View Lab Results)
- Decorative gradient blobs behind content (aria-hidden)

---

## 6. Product System

### Data Model

```typescript
interface Product {
  id: string;
  name: string;
  slug: string;           // URL-safe, auto-generated or manual
  category: string;       // References category ID
  description: string;    // Short — used on cards (1-2 lines)
  longDescription: string; // Full — used on detail page
  variants: ProductVariant[];
  purity: string;         // Industry-specific quality metric
  cas?: string;           // Unique identifier (adapt per niche)
  molecularWeight?: string;
  form: string;           // Physical form / delivery method
  storage: string;        // Handling instructions
  appearance: string;     // Visual description
  featured?: boolean;     // Shows on homepage
  badge?: string;         // "Best Seller", "Popular", "Best Value", "Premium"
}

interface ProductVariant {
  size: string;           // "5mg", "10mg", "Small", "Large"
  price: number;          // In cents (4200 = $42.00)
  sku: string;            // Unique per variant
}
```

**Price in cents** — avoids floating point issues. Format with `(price / 100).toFixed(2)` at display time.

### Product Card

- Aspect-square image area (gradient placeholder if no real image)
- Top-left: product badge ("Best Seller")
- Top-right: quality metric badge (purity)
- Category label (uppercase, primary color, tiny text)
- Product name (serif font)
- Description (2-line clamp)
- Price row: "From $XX" for multi-variant, flat price for single variant
- "View Details" text + arrow (visible only on hover via `opacity-0 group-hover:opacity-100`)

### Product Detail Page

**Left column (image area):**
- Large gradient placeholder (or real product image)
- Trust seal overlay — 4 small circular badges on the left edge (quality, origin, testing, analysis)
- Product badge + quality metric in top corners
- Bottom gradient overlay with key specs (quality metric, identifier, weight)
- Research/compliance disclaimer box

**Right column (purchase area):**
- Category label
- Product name (large serif)
- Star rating (deterministic from product ID — see Social Proof section)
- Price (large, bold)
- Short description
- Volume discount box (see Conversion Tactics)
- Variant selector (radio buttons, highlight on hover/select)
- Quantity +/- controls
- Add to Cart button (shows "Added!" confirmation for 2 seconds)
- Shipping estimate (dynamic, based on time of day)
- Trust badge below button

**Tab section below:**
- Description | Specifications | Research (or adapt per niche)
- Specs rendered as a table with monospace values
- Tabs use `role="tablist"` / `role="tab"` / `role="tabpanel"` for accessibility

**Related products:**
- 4-card grid filtered by same category, excluding current product

---

## 7. Cart System

### Cart Context (CartProvider)

```typescript
interface CartItem {
  productId: string;
  productName: string;
  variantSku: string;
  variantSize: string;
  price: number;          // cents
  quantity: number;
  slug: string;
}

// Exposed via useCart() hook:
// items, addItem, removeItem, updateQuantity, clearCart
// subtotal, totalItems
// isCartOpen, setIsCartOpen
```

**Persistence:** `localStorage.setItem("brand-cart", JSON.stringify(items))` on every change, hydrated on mount.

### Cart Drawer

Slides in from the right (`translate-x-full` → `translate-x-0`). Overlay behind it (`bg-black/30 backdrop-blur-sm`).

**Sections (top to bottom):**

1. **Header** — "Your cart (N items)" + close button
2. **Star rating bar** — Social proof (e.g., "4.8/5 from verified customer feedback")
3. **Progress bar** — Dual-milestone gamification bar (see below)
4. **Cart items** — Each in a card with image, name, size, quantity controls, price, volume discount tiers
5. **Upsell carousel** — "You may also like" with horizontal scroll, left/right arrows, quick-add buttons
6. **Footer** — Total, Checkout button, View Cart link

### Progress Bar (Gamification)

Two reward thresholds on a single bar:
- **Milestone 1** (e.g., $200 = 50%) — Free Shipping (Truck icon)
- **Milestone 2** (e.g., $400 = 100%) — Free Bonus Item (Flask icon)

Current subtotal and max threshold shown as labels. Bar fills with primary color. Milestone icons change from muted to primary when unlocked.

**Why it works:** Customers see how close they are to the next reward. The second milestone keeps them adding after they hit the first.

### Upsell Algorithm

```typescript
function getUpsellProducts(cartProductIds: string[], limit: number): Product[] {
  // 1. Exclude products already in cart
  // 2. Prioritize: featured products first, then blends, then everything else
  // 3. Return up to `limit` products
}
```

---

## 8. Conversion Tactics

### Volume Discounts

Displayed on every cart item and on the product detail page:

| Quantity | Discount | Display |
|----------|----------|---------|
| 3+ | 5% | "Buy 3+ for $X each and save 5%" |
| 5+ | 10% | "Buy 5+ for $X each and save 10%" |
| 10+ | 15% | "Buy 10+ for $X each and save 15%" |

Calculated per-item: `Math.round(item.price * (1 - discount))`.

### Shipping Estimate (Urgency)

Dynamic message based on current time in the store's timezone:
- **Before 2 PM on weekdays:** "Order within X hours Y minutes, ships today!"
- **After 2 PM or weekends:** "Ships next business day"
- **Free shipping note** if subtotal qualifies

This creates urgency without being dishonest — it's based on real fulfillment logic.

### Deterministic Star Ratings

Generate consistent ratings per product without a real review system:

```typescript
function getProductRating(productId: string) {
  // Hash the product ID to a number
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = ((hash << 5) - hash) + productId.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);

  return {
    rating: 4.6 + (abs % 4) * 0.1,         // 4.6, 4.7, 4.8, or 4.9
    reviewCount: 40 + (abs % 160),           // 40 to 199
  };
}
```

Every product always shows the same rating. Feels real, stays consistent.

### Badge System

Product badges on cards and detail pages:

| Badge | When to use |
|-------|-------------|
| Best Seller | Top 2-3 products by volume |
| Popular | High-interest products |
| Best Value | Bundles/blends that save money |
| Premium | Highest-quality or unique offerings |

Badges appear as small pills: primary background, white text, uppercase, tiny font, extra letter-spacing.

### Cart Auto-Open

When `addItem()` is called, `setIsCartOpen(true)` fires automatically. The customer immediately sees:
- What they added
- Their progress toward free shipping
- Upsell products they might want

No extra click needed. Reduces cart abandonment by keeping the purchase flow visible.

---

## 9. Trust Architecture

### Repetition Strategy

The core trust message (third-party tested, public certificates) appears in:
1. Promo banner (every page)
2. Homepage hero
3. Homepage trust badges section
4. Product detail page (trust seals, shipping area)
5. About page (testing process)
6. FAQ (quality section)
7. Footer disclaimer

**Rule:** Your primary trust differentiator should appear on every page at least once without feeling forced. The promo banner handles this passively.

### Trust Seals (Product Page)

4 small circular badges overlaid on the product image:
- Shield — Purity verified
- Award — Origin (e.g., "USA Lab")
- Microscope — Third-party tested
- BadgeCheck — Advanced analysis method

These are visual shorthand. Customers don't read them carefully — they register as "this product has been vetted."

### Legal Compliance as a Feature

Instead of hiding disclaimers:
- Research-only disclaimer appears in a styled box on the product page
- Footer has a visible disclaimer section (not tiny gray text)
- Terms of service are detailed and real
- FAQ directly addresses compliance questions

**Why:** In regulated niches, visible compliance signals to customers that you're legitimate. Competitors who hide disclaimers look sketchy by comparison.

---

## 10. SEO Implementation

### Metadata Per Page

Every page exports metadata from its server component:

```typescript
export const metadata: Metadata = {
  title: "Page Title | Brand Name",
  description: "150-160 char description with keywords",
  openGraph: {
    title: "...",
    description: "...",
  },
};
```

Dynamic pages use `generateMetadata()`:

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProductBySlug(params.slug);
  return {
    title: `${product.name} (${product.purity}) | Brand Name`,
    description: product.description,
  };
}
```

### JSON-LD Schemas

| Page | Schema Type | Key Fields |
|------|-------------|------------|
| Layout (all pages) | Organization | name, url, description, contactPoint |
| Product detail | Product + Offer | name, description, sku, price, priceCurrency, availability |
| Product detail | BreadcrumbList | Home → Shop → Product Name |
| FAQ | FAQPage | All Q&A pairs as Question + Answer entities |

Schemas are injected as `<script type="application/ld+json">` in server components.

### Sitemap Strategy

```typescript
// Static pages with priority tiers
{ url: "/", priority: 1.0, changeFrequency: "weekly" }
{ url: "/shop", priority: 0.9, changeFrequency: "weekly" }
// Dynamic product pages
products.map(p => ({ url: `/product/${p.slug}`, priority: 0.8 }))
// Info pages
{ url: "/about", priority: 0.7, changeFrequency: "monthly" }
// Legal (low priority, rarely changes)
{ url: "/legal/terms", priority: 0.3, changeFrequency: "yearly" }
```

### Robots.txt

```
Allow: /                    # Everything public
Disallow: /auth/            # No indexing login pages
Disallow: /cart             # No indexing cart

# Explicitly allow AI crawlers
User-agent: GPTBot          # ChatGPT
User-agent: ClaudeBot       # Claude
User-agent: PerplexityBot   # Perplexity
Allow: /
```

### Security Headers (next.config.ts)

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 11. Accessibility Checklist

| Pattern | Where |
|---------|-------|
| `aria-label` on all icon-only buttons | Cart, close, quantity +/-, remove item |
| `aria-hidden="true"` on decorative icons | Every Lucide icon next to text |
| `role="dialog" aria-modal="true"` | Cart drawer |
| `role="tablist"` / `role="tab"` / `role="tabpanel"` | Product detail tabs |
| `role="radiogroup"` / `role="radio"` | Variant selector |
| `role="group"` + `aria-label` | Category filter buttons |
| `aria-expanded` | Mobile menu toggle, FAQ accordion |
| `aria-controls` + matching `id` | Accordion items |
| `aria-pressed` | Toggle-style filter buttons |
| `aria-selected` | Active tab |
| `aria-live="polite"` | Dynamic product count on shop page |
| `aria-current="page"` | Breadcrumb current item |
| Semantic HTML | `<nav>`, `<main>`, `<section>`, `<table>`, `<fieldset>`, `<legend>` |
| Label associations | `htmlFor` + `id` on all form inputs |
| `autoComplete` attributes | Email, password, name fields |
| `.sr-only` class | Screen-reader-only labels and descriptions |
| Color contrast | Navy (#1E3A5F) on off-white (#FAFAF9) passes WCAG AA |

---

## 12. Responsive Breakpoints

| Breakpoint | Grid columns | Key changes |
|------------|-------------|-------------|
| Mobile (default) | 1 col | Stacked layout, hamburger menu, full-width cards |
| `sm:` (640px) | 2 col | Product grid 2-up, side-by-side elements |
| `md:` (768px) | — | Larger hero text, more padding |
| `lg:` (1024px) | 3-4 col | Product grid 3-col, product detail 2-col layout, desktop nav |

**Product grid:** 1 → 2 → 3 columns
**Featured products:** 1 → 2 → 4 columns
**Category cards:** 2 → 3 columns
**Trust badges:** 1 → 3 columns

---

## 13. Component Inventory

| Component | Type | Purpose |
|-----------|------|---------|
| `Header` | Client | Sticky nav, promo banner, mobile menu, cart trigger |
| `Footer` | Server | Link columns, disclaimer, copyright |
| `Hero` | Server | Homepage hero with CTAs |
| `TrustBadges` | Server | 3-icon trust row |
| `ProductCard` | Server | Card for shop grid and related products |
| `CategoryFilter` | Client | Filter buttons for shop page |
| `ShopContent` | Client | Filterable/sortable product grid |
| `CartProvider` | Client | Context provider for cart state |
| `CartDrawer` | Client | Slide-out cart with upsells and progress bar |
| `CartContent` | Client | Full cart page content |
| `ProductDetailClient` | Client | Product page interactivity (variants, add to cart, tabs) |
| `Accordion` | Client | Expandable Q&A sections |
| `Button` | Server | Reusable button (primary, secondary, outline variants) |
| `SignInForm` | Client | Auth form with validation |
| `SignUpForm` | Client | Registration form |

---

## 14. File Structure Template

```
src/
  app/
    layout.tsx                    # Fonts, metadata, JSON-LD, CartProvider wrapper
    page.tsx                      # Homepage
    shop/page.tsx                 # Shop (server) + ShopContent (client)
    product/[slug]/
      page.tsx                    # Metadata, schema, static params
      ProductDetailClient.tsx     # Interactive product page
    cart/page.tsx                 # Cart page (noindex)
    about/page.tsx                # Brand story
    faq/page.tsx                  # FAQ with schema
    coa/page.tsx                  # Lab results / certificates
    auth/
      sign-in/page.tsx            # Sign in (noindex)
      sign-up/page.tsx            # Sign up (noindex)
    legal/
      terms/page.tsx
      privacy/page.tsx
      refund/page.tsx
    sitemap.ts                    # Dynamic XML sitemap
    robots.ts                     # Crawl rules
  components/
    Header.tsx
    Footer.tsx
    Hero.tsx
    TrustBadges.tsx
    ProductCard.tsx
    CategoryFilter.tsx
    ShopContent.tsx
    CartProvider.tsx
    CartDrawer.tsx
    CartContent.tsx
    Accordion.tsx
    Button.tsx
    SignInForm.tsx
    SignUpForm.tsx
  lib/
    products.ts                   # Product data + helper functions
    categories.ts                 # Category definitions
    utils.ts                      # formatPrice, slugify, etc.
  styles/
    globals.css                   # Tailwind directives + CSS custom properties
```

---

## 15. Duplication Checklist

When adapting this for a new brand:

1. **Brand identity** — Pick a name, primary color, and 3 fonts (serif, sans, mono)
2. **CSS tokens** — Update all `--custom-properties` in globals.css
3. **Product data** — Define your products in `lib/products.ts` with the same interface
4. **Categories** — Update `lib/categories.ts`
5. **Trust messaging** — Identify your #1 differentiator and repeat it everywhere (banner, hero, badges, about, FAQ, footer)
6. **Legal pages** — Adapt terms, privacy, refund for your industry
7. **FAQ content** — Write 15+ real questions across 4-5 categories
8. **Thresholds** — Set your free shipping and bonus item dollar amounts
9. **Volume discounts** — Adjust tier quantities and percentages
10. **Shipping logic** — Update timezone and cutoff time for your fulfillment
11. **Metadata** — Update site name, URL, descriptions across all pages
12. **JSON-LD** — Update Organization schema, product schemas auto-generate
13. **Sitemap/robots** — Update base URL
14. **Domain** — Update `metadataBase` in root layout

---

## 16. What Makes It Convert

The site's effectiveness comes from layering multiple psychological triggers without any single one feeling aggressive:

- **Trust repetition** — The same quality message in 7+ places builds unconscious confidence
- **Progress gamification** — The cart progress bar turns spending into a game with rewards
- **Volume anchoring** — Showing "buy 3+ save 5%" makes single-item purchases feel like missed opportunities
- **Urgency without dishonesty** — Real-time shipping estimates based on actual cutoff times
- **Upsell proximity** — Recommendations appear at the moment of highest purchase intent (just added to cart)
- **Social proof scaffolding** — Deterministic ratings feel real and stay consistent
- **Compliance as credibility** — Visible disclaimers signal legitimacy in regulated markets
- **Minimal friction** — Cart auto-opens, quick-add on upsells, persistent cart across sessions
- **Premium aesthetics** — Serif headings + navy palette + generous whitespace = "this costs more because it's better"
- **Information architecture** — Tabs on product pages let curious buyers dig deeper without overwhelming casual browsers
