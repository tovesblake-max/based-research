# International Readiness — Infrastructure Plan

**Status: planning doc. Nothing in here ships until the operator greenlights a phase.**

The site is US-only today. This plan describes the infrastructure work needed to make turning international on a config flip rather than a rebuild. It's broken into four phases — each phase can be greenlit independently, and Phase 1 has zero customer-visible impact.

---

## Architectural foundation: per-continent suppliers

**Decision:** different supplier per continent. Based Research is the brand; suppliers are regional fulfillment partners. The customer never knows which supplier shipped their order — they see Based Research branding, Based Research CoAs, Based Research support. The supplier is an implementation detail.

This is the right model for peptides. Three reasons:

1. **No cross-border shipping = no customs problem.** A supplier in Frankfurt ships to a customer in Berlin. No HS codes, no duty, no seizure risk, no border declaration. The single biggest legal/operational risk of international peptide commerce evaporates.
2. **Faster delivery, lower shipping cost.** Domestic ground shipping in each continent beats DHL Express domestically in both speed and price.
3. **Per-jurisdiction compliance handled by the supplier.** Each supplier already operates legally in their region. We don't need to register for VAT, become an importer of record, or manage TGA/MHRA filings — the supplier already has those structures.

What this means for the architecture:

- **Suppliers are a first-class entity.** Schema needs a `suppliers` table from day one.
- **Per-supplier SKU/cost mapping.** Our `glp3-rta` slug maps to one SKU at the US supplier ($30 cost) and a different SKU at the EU supplier (probably different cost in EUR). Both produce the same end-product to the customer.
- **Order routing happens at checkout.** The shipping country determines the supplier; the supplier determines the available SKUs, the cost basis, and the fulfillment integration.
- **Inventory + COAs are per-supplier.** A retatrutide vial from the US supplier has a different lot, a different lab report, a different test date than one from the EU supplier. Both need to display correctly per-region.
- **Pricing strategy decision deferred** — the catalog price the customer sees can either be one global USD ladder (supplier costs absorbed into a unified margin) OR per-region pricing (US sees $100, EU sees €100, AU sees AUD 150). Both are mechanically supportable; pick later based on competitive dynamics in each market.

This decision shapes Phase 1 schema and every phase after it. The plan below assumes the continental-supplier model is the target.

---

## Where we are today

| Layer | State |
|---|---|
| **Geo-block** | None — international visitors browse freely |
| **Currency** | USD-only, hardcoded throughout |
| **Address form** | `country: "US"` hardcoded in 7 places in [CheckoutClient.tsx](../src/app/checkout/CheckoutClient.tsx); state is a US-only dropdown |
| **Checkout API** | Schema accepts `country` but defaults to `"US"` and UI never sends another value |
| **Phone auth** | Already international-capable (country code selector works globally) |
| **Schema** | `users.signupCountry`, `users.signupRegion`, `addresses.country` all exist as ISO-2 fields. Foundation is there |
| **Fraud scoring** | Penalizes IP/shipping country mismatch — would fight us on flip-switch unless updated |
| **Shipping** | UPS 2nd Day Air via ShipStation; carrier choice hardcoded in fulfillment |
| **Tax** | None — `orders.discount` exists but no `tax_amount` or `duty_amount` columns |
| **Stated policy** | FAQ + shipping policy explicitly say US-only |
| **Compliance** | RUO framing on every surface; no per-country legal gating |

**Key insight:** ~70% of the database schema is already country-flexible. The lock-in is mostly in checkout UI and fulfillment plumbing.

---

## Phase 1 — Zero-risk groundwork (do now)

These changes pose **zero risk to current US-only operation** but make every later phase faster. They centralize the assumptions so we can flip them in one place later.

### 1.1 — Single source of truth for allowed countries

Create `src/lib/regions.ts`:

```ts
export const SHIPPING_ALLOWED_COUNTRIES = ["US"] as const;
export const BILLING_ALLOWED_COUNTRIES = ["US"] as const;
export const PRESENTATION_CURRENCY = "USD";
export const SUPPORTED_CURRENCIES = ["USD"] as const;
```

Replace the 7 hardcoded `"US"` strings in [CheckoutClient.tsx](../src/app/checkout/CheckoutClient.tsx) with reads from this constant. Same for the 3 checkout API schemas. Behavior is identical today; flipping the array later expands the surface area.

### 1.2 — Schema additions (nullable, defaulted)

#### Suppliers as first-class entities

New `suppliers` table:

```ts
export const suppliers = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Internal identifier — "us-primary", "eu-primary", "au-primary" etc.
  // Stable across catalog edits; never shown to customers.
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  // Continent / region this supplier services. Single value for now;
  // graduate to many-to-many if a supplier ever services multiple
  // disjoint regions.
  region: varchar("region", { length: 30 }).notNull(), // "north_america" | "europe" | "oceania" | "asia"
  // ISO-2 countries this supplier ships to. Source-of-truth for order
  // routing — checkout reads this list, not the SHIPPING_ALLOWED_COUNTRIES
  // const, once suppliers exist.
  shipsToCountries: jsonb("ships_to_countries").$type<string[]>().notNull(),
  // ISO-2 country the supplier ships FROM (matters for the rare case
  // where customs is needed within a continent — UK→EU post-Brexit, etc).
  shipsFromCountry: varchar("ships_from_country", { length: 2 }).notNull(),
  // Charge currency for this supplier's region. Customer-facing presentation
  // currency may differ; this is the supplier-cost currency.
  costCurrency: varchar("cost_currency", { length: 3 }).notNull(),
  // Operational status. "active" routes orders here; "paused" stops new
  // orders but lets existing ones finish; "archived" is historical only.
  status: varchar("status", { length: 20 }).notNull().default("active"),
  // Fulfillment integration mode — how we hand orders off.
  fulfillmentMode: varchar("fulfillment_mode", { length: 30 }).notNull(),
    // "shipstation_store" | "email" | "api_webhook" | "edi"
  fulfillmentConfig: jsonb("fulfillment_config"), // mode-specific creds/settings
  // Operational contact for ops issues — separate from any external SLA doc.
  opsEmail: varchar("ops_email", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

#### Per-supplier variant pricing/SKU map

Today `costCents` lives on each variant in [products.ts](../src/lib/products.ts). With multiple suppliers, cost differs by supplier. Move cost to a per-supplier-per-variant pivot:

```ts
export const supplierVariants = pgTable("supplier_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  // Our internal variant SKU (e.g. "RTA-10"). Joins to the catalog SKU
  // referenced everywhere else. The supplier's own SKU may differ.
  variantSku: varchar("variant_sku", { length: 100 }).notNull(),
  // The supplier's identifier for THIS variant — what we send them when
  // placing the order. Could be a SKU, a model number, a name string.
  supplierSku: varchar("supplier_sku", { length: 100 }).notNull(),
  // Cost per unit in the supplier's `costCurrency`, integer minor-units
  // (cents/pence). Per-supplier so margin math is region-correct.
  costMinorUnits: integer("cost_minor_units").notNull(),
  // Lead time in business days from order to handoff to carrier.
  leadTimeDays: integer("lead_time_days").notNull().default(1),
  // Stock signal. Three-state: in_stock / low / out_of_stock. Drives
  // catalog availability per region without requiring real-time API.
  stockStatus: varchar("stock_status", { length: 20 }).notNull().default("in_stock"),
  // Per-region COA pointer. Each supplier's batch has its own lab report.
  coaPath: varchar("coa_path", { length: 255 }),
  coaLot: varchar("coa_lot", { length: 50 }),
  coaTestDate: timestamp("coa_test_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("supplier_variants_idx").on(t.supplierId, t.variantSku),
]);
```

The TypeScript catalog stays as the source of truth for *product metadata* (descriptions, sequences, mol weights, etc.) since those don't change per supplier. Cost, availability, and CoA become DB-owned.

Bootstrapping: insert a single `us-primary` supplier row, migrate every variant's existing `costCents` into a `supplier_variants` row pointing at it. The catalog `costCents` field becomes deprecated but stays for backward compatibility during the migration.

#### Per-order supplier attribution

Add to `orders`:

- `supplierId` uuid — which supplier fulfilled this order. Set at checkout based on shipping country.
- `currency` varchar(3) NOT NULL DEFAULT 'USD' — display/charge currency for this order.
- `taxAmount` integer NOT NULL DEFAULT 0 (cents) — VAT/GST collected if any.
- `dutyAmount` integer NOT NULL DEFAULT 0 (cents) — customs duty if cross-border shipping inside a continent (rare, e.g. UK→EU).
- `fxRate` numeric(10,6) — captured rate when charge currency ≠ supplier-cost currency, for margin reporting.

#### Per-product overrides (TS-only)

Add to product variants in [products.ts](../src/lib/products.ts):

- `restrictedCountries?: string[]` — countries where this compound is illegal/seized regardless of which supplier services them (e.g. retatrutide in AU even if AU supplier exists). Catalog filters this out at render time.
- `customsDescription?: string` — generic non-claim description for the rare cross-border case (UK→EU, US territories).

`hsCode` and `countryOfOrigin` move from per-variant to per-supplier-variant since they vary by where the supplier ships from.

### 1.3 — Centralized geo-IP helper

Create `src/lib/geo.ts`:

```ts
export function getRequestCountry(request: Request): string | null {
  return request.headers.get("x-vercel-ip-country")?.toUpperCase() ?? null;
}
```

Replace the inline `request.headers.get("x-vercel-ip-country")` calls in [fraud-score.ts](../src/lib/fraud-score.ts) and the 3 checkout routes. Single chokepoint for future logic (whitelist/blocklist, region routing).

### 1.4 — Currency-aware money formatter

Centralize `formatPrice` / `formatPriceShort` to take a currency arg:

```ts
formatPrice(cents: number, currency = "USD")
```

Today every call site passes USD. When we expand, swapping the currency at the page-level (via a context provider) flips the entire site without touching component code.

### 1.5 — hreflang signal to Google

Add `<link rel="alternate" hreflang="en-US">` and `<link rel="alternate" hreflang="x-default">` to `src/app/layout.tsx`. Tells Google we currently target US English. When we add other regions, we just add more alternates instead of confusing Google with a sudden region pivot.

### 1.6 — Refactor fulfillment.ts for supplier-aware routing

[fulfillment.ts](../src/lib/fulfillment.ts) currently pushes every order to a single ShipStation Custom Store with UPS 2nd Day Air. Refactor to look up the order's `supplierId`, load that supplier's `fulfillmentMode` + `fulfillmentConfig`, and dispatch:

```ts
async function pushOrderToFulfillment(orderId: string) {
  const order = await loadOrderWithSupplier(orderId);
  switch (order.supplier.fulfillmentMode) {
    case "shipstation_store": return pushToShipStation(order, order.supplier.fulfillmentConfig);
    case "email":            return emailSupplierOrder(order, order.supplier.fulfillmentConfig);
    case "api_webhook":      return postToSupplierWebhook(order, order.supplier.fulfillmentConfig);
    case "edi":              return generateEdiPayload(order, order.supplier.fulfillmentConfig);
  }
}
```

Today the only supplier (`us-primary`) uses `shipstation_store` mode pointing at the existing Custom Store. Behavior is identical. Future suppliers (EU, AU) plug in as additional `suppliers` rows with their own fulfillment configs.

### 1.7 — Bootstrap the existing US supplier

Insert one `suppliers` row representing the current operation:

```ts
{
  slug: "us-primary",
  name: "Based Research (US)",
  region: "north_america",
  shipsToCountries: ["US"],
  shipsFromCountry: "US",
  costCurrency: "USD",
  fulfillmentMode: "shipstation_store",
  fulfillmentConfig: { /* current ShipStation creds */ },
  opsEmail: "ops@basedresearch.com",
}
```

Migrate every variant's current `costCents` from [products.ts](../src/lib/products.ts) into a `supplier_variants` row pointing at this supplier. Run as a one-shot script (`scripts/bootstrap-supplier.ts`). After this, the cost data lookup path is the same shape it'll need for international.

**Phase 1 total scope:** ~1-2 days of focused work (longer than original estimate because of the supplier migration). No customer-visible changes. Type-checked, deployed, done. Site is materially more flippable afterward AND the supplier abstraction is live and tested under domestic-only traffic.

---

## Phase 2 — UI/UX scaffolding (build, don't enable)

Build the user-facing pieces but keep them gated behind `SHIPPING_ALLOWED_COUNTRIES`. UX is in production but only US is reachable.

### 2.0 — Order routing layer

The architectural keystone. New `src/lib/order-routing.ts`:

```ts
export interface RoutingResult {
  supplier: Supplier;
  unavailableItems: Array<{ slug: string; reason: string }>;
  resolvedItems: Array<ResolvedCartItem & {
    supplierSku: string;
    costMinorUnits: number;
    leadTimeDays: number;
  }>;
}

export async function routeOrder(
  shippingCountry: string,
  cartItems: CartItem[],
): Promise<RoutingResult>;
```

Logic:

1. Find the active supplier whose `shipsToCountries` includes `shippingCountry`. Error cleanly if none found ("we don't ship to your country yet").
2. For each cart item, look up `supplier_variants` for that supplier + variant SKU. If missing or `out_of_stock`, return as `unavailableItems` with a reason.
3. Return the matched supplier + per-item supplier SKU + cost data so the checkout API can:
   - Persist `orders.supplierId`
   - Compute per-supplier margin (revenue in charge currency, cost in supplier currency)
   - Hand off to that supplier's fulfillment integration

This function is called from the checkout route ([api/checkout](../src/app/api/checkout/route.ts)) right after the existing `resolveCartItemPrices` call.

Today this returns the US supplier for every order (the only one). When EU/AU suppliers come online, the function picks the right one with no other code changes.

### 2.0.5 — Catalog availability per region

The product list page becomes country-aware. Logic:

1. Detect the user's country from `x-vercel-ip-country` (server-side) or a country selector (if user has changed it).
2. Look up the supplier serving that country.
3. Filter the catalog to variants that have an active `supplier_variants` row at that supplier with `stockStatus !== 'out_of_stock'`.
4. Surface the supplier-specific COA path on the product detail page (so EU customers see EU lab reports, not US ones).

Today every visitor sees the US supplier's catalog because that's the only one.

### 2.1 — Country selector in checkout

Replace the hardcoded country in the address form with a `<select>` populated from `SHIPPING_ALLOWED_COUNTRIES`. Today the selector renders one option (US); when we add countries to the array, the selector grows.

State/region field becomes dynamic:
- US → existing 50-state dropdown
- Other countries → free-text region input with country-specific length validation
- Use a small lookup table (`src/lib/regions.ts` extended with subdivisions per country)

Postal code validation similarly becomes country-aware (US ZIP regex → country-specific regex via lookup).

### 2.2 — Currency display switcher

Add a currency badge/selector in the header (defaults to USD; only USD enabled). Charge currency stays USD until Phase 3, but display can swap to GBP/EUR/CAD/AUD using daily-cached FX rates from a free source (e.g. ECB reference rates).

Two display modes worth designing now:
- **Display-only conversion:** "£78.85 (charged $100.00 USD)" — clearest, lowest legal risk
- **True multi-currency charging:** charge GBP, settle USD via gateway. Defer to Phase 3.

### 2.3 — Shipping zones data model

Extend `regions.ts`:

```ts
export const SHIPPING_ZONES: Record<string, ShippingZone> = {
  domestic: { countries: ["US"], freeOver: 20000, flat: 1499 },
  // canada: { countries: ["CA"], freeOver: 30000, flat: 2999 },
  // eu_friendly: { countries: ["GB","IE","FR","DE",...], freeOver: 50000, flat: 4999 },
  // au_nz: { countries: ["AU","NZ"], freeOver: 40000, flat: 3999 },
};
```

Today only `domestic` exists. Future zones get added without touching shipping calc logic.

### 2.4 — Customs declaration generator

Pure function: order + items → customs form payload. Not yet wired into ShipStation but exercisable in unit tests.

```ts
generateCustomsDeclaration(order, items): {
  totalValue: number; currency: string; lineItems: Array<{
    description: string; hsCode: string; quantity: number; unitValue: number;
    countryOfOrigin: string;
  }>;
}
```

This is the artifact ShipStation (or any international carrier) needs. Building it now lets us validate per-SKU HS codes and customs descriptions are accurate before customers depend on them.

### 2.5 — Per-product country eligibility

Server-side helper:

```ts
function isProductSellable(product: Product, country: string): boolean {
  if (product.restrictedCountries?.includes(country)) return false;
  return SHIPPING_ALLOWED_COUNTRIES.includes(country);
}
```

Catalog filters products by this when an international country is selected. Today no product is restricted; the function is a no-op for US.

### 2.6 — GDPR-compliant cookie consent

Even before we sell to EU customers, **EU traffic is already on the site** (we don't geo-block). Tracking pixels (Meta CAPI, TikTok, Reddit, GA4, PostHog) on EU IPs without consent is a GDPR violation. Add a consent banner with:

- Geo-detect EU/UK via `x-vercel-ip-country`
- Block tracking-pixel firing until consent for those IPs
- Store consent state in cookie + localStorage

This one is **arguably "do now"** — current setup has compliance exposure even with no international sales.

---

## Phase 3 — Operational integration (per-supplier, closer to launch)

In the continental-supplier model, most of the historical "international shipping" complexity disappears — each supplier ships domestically inside their own continent. Phase 3 work is mostly **integrating each new supplier's fulfillment + payment flow** rather than building cross-border carrier logic.

### 3.1 — Per-supplier fulfillment integration

Each new supplier requires its own fulfillment integration mode (the `fulfillmentMode` on the supplier row). Three patterns we'll likely encounter:

- **`shipstation_store`** — supplier has their own ShipStation account; we add their store as a separate Custom Store with their carrier set up. Best when supplier is a 3PL.
- **`api_webhook`** — supplier has their own order-management API. We POST orders to them. Best when supplier is a peptide manufacturer with software.
- **`email`** — supplier accepts orders via email/CSV daily. Lowest-tech but workable for low-volume launch. Cron emits a daily batch to `opsEmail`.
- **`edi`** — never first; only if a supplier requires it.

Each supplier gets onboarded by:
1. Creating their `suppliers` row.
2. Bulk-importing their `supplier_variants` (their SKU map, costs, lead times).
3. Configuring the `fulfillmentConfig` JSON for whichever mode they use.
4. Running an end-to-end test order to a friend in their region.

### 3.1b — Domestic carriers per continent (handled by suppliers)

Each supplier picks their own domestic carrier (Royal Mail/Evri in UK, DPD/Hermes in EU, Australia Post in AU/NZ). We don't pick carriers globally — the supplier does, and ShipStation just routes through whatever they're configured for. This is operationally simpler than running our own multi-carrier negotiation.

### 3.2 — Tax/VAT calculation

Three options ranked by complexity:

1. **Display "tax/duties due at delivery"** — simplest. Customer pays customs themselves on receipt. Bad UX but legal.
2. **DDU (Delivered Duties Unpaid)** — same as #1 but explicit at checkout
3. **DDP (Delivered Duties Paid) with tax calc** — collect VAT/GST at checkout, remit to authorities. Use a tax-calculation service such as TaxJar or Avalara. Best UX, requires registration.

For peptides specifically, **DDU is what most international peptide vendors do** — customers expect to handle their own customs. Recommend starting there; upgrade to DDP if customs friction kills conversion.

### 3.3 — International payment rail

Card decline rates for international customers on US gateways are ~30-50%. Two options:

1. **Crypto checkout (USDC/USDT)** — solves the problem entirely. No FX, no decline, no merchant-of-record geography. Already have crypto schema fields for affiliate payouts; can extend for inbound.
2. **A processor with international acquiring** — works for most countries and handles 3DS, but adds a second payment integration to maintain. Heavier lift.

Recommend crypto-first for international. Lighter ops, better economics.

### 3.4 — Fraud rule updates

Current geo-mismatch rule penalizes ANY non-matching IP/shipping pair. When we open international:

- IP-country in `SHIPPING_ALLOWED_COUNTRIES` AND shipping-country matches IP → safe
- IP-country differs from shipping-country BUT both in allowed list → low signal (VPN users, expats)
- IP-country differs AND shipping-country is high-fraud market (think CN, NG, RU) → high signal
- VPN detection becomes more important; add a third-party VPN check (IPQualityScore, MaxMind)

### 3.5 — International returns / refunds

Don't accept returns from abroad — too operationally complex. Update terms: international orders final-sale, refund only if seizure or non-delivery beyond X days. Most peptide vendors do this.

### 3.6 — Customer support

Update support routing for international hours (currently we list a US phone number). Either:
- Add a "we're a US company; expect US-business-hours response" disclosure
- Use a help-desk tool (HelpScout, Intercom) with timezone-aware routing
- Outsource off-hours coverage

---

## Phase 4 — Legal / compliance (parallel work, requires lawyers)

This is **not engineering work** — it's stuff the operator's lawyers and accountants need to handle in parallel. Listed for completeness so we know what blocks Phase 3 from going live.

The continental-supplier model **substantially reduces** our direct compliance burden. The supplier in each region operates legally there and is the importer/seller of record for their jurisdiction. Based Research is the brand and the customer-facing storefront; the supplier is the regulated commercial entity.

That said, supplier diligence becomes a critical pre-flip-switch step in its own right.

### 4.1 — Supplier vetting (replaces direct legal review)

For each new supplier we sign, we need:
- Documentation that they are legally permitted to sell + ship the products in their jurisdiction
- Their CoA / lab partner credentials (must meet the same A2LA-equivalent bar as our US lab)
- Tax registration in their own jurisdiction (we don't register; they do)
- Liability + indemnification language in the supplier agreement (their failure shouldn't leak into our exposure)
- Audit rights — random test purchases, periodic CoA verification

Per-product within their region, we still want them to confirm:
- Which catalog SKUs they can fulfill
- Which (if any) are restricted in any country they ship to (populates `restrictedCountries`)

### 4.2 — Tax obligations on Based Research itself

In the continental-supplier model, sales tax / VAT / GST is collected and remitted by the supplier (they're the seller of record in their region). Based Research's tax obligations become:

- **Income tax** on Based Research's revenue / margin in the US (already handled).
- **Possibly** marketplace-facilitator obligations if Based Research takes payment AND remits to suppliers — depends on how the financial flow is structured (commission model vs. resale model). Lawyer territory.
- **Transfer pricing** considerations if margin is being shifted across jurisdictions (more relevant at scale).

Two clean structural options the lawyers should evaluate:
1. **Based Research = customer-facing brand only.** Each supplier owns the sale. Based Research receives a brand-licensing or platform fee. Cleanest tax structure; least direct exposure.
2. **Based Research = global storefront, suppliers = wholesalers.** Based Research buys from the supplier at cost, sells to the customer at retail in the supplier's region. Based Research becomes the merchant of record everywhere. Higher tax/registration burden but tighter brand control.

Pick before signing the second supplier — the wrong choice is expensive to unwind.

### 4.3 — Privacy compliance

- **GDPR (EU/UK):** Need lawful basis for processing, data subject rights API endpoints, data processing agreements with all sub-processors (Vercel, Neon, Twilio, Mailtrap, ShipStation, etc.), breach notification process.
- **PIPEDA (Canada):** Lighter than GDPR but distinct.
- **Australia Privacy Act:** Mostly aligns with GDPR principles.

Realistically we need a privacy lawyer to audit and produce the new policy text. Cookie consent (Phase 2.6) is the engineering side.

### 4.4 — Updated terms of service

International customers in different jurisdictions. Add:
- Final-sale clause for international
- Customer responsibility for customs/duties (if DDU)
- Governing law / dispute resolution by country
- RUO labeling acknowledgment per jurisdiction

---

## Anti-patterns — things to actively avoid

1. **Don't translate the website until you have validated demand.** Translation is expensive to maintain. Ship English-only first.
2. **Don't accept non-USD as charge currency early.** FX exposure on small volume isn't worth it. Display conversion is fine; charge USD.
3. **Don't try to ship "everywhere."** Pick a 5-10 country whitelist. Customs/legal review only for those countries. Add more later.
4. **Don't bundle international launch with new product launches.** Too many variables to debug at once.
5. **Don't ship internationally yourself if the volume is < 50 orders/month.** Use a forwarder-friendly stance: customer pays a US-based reshipper. Cleanest legal posture.
6. **Don't undervalue customs declarations.** That's customs fraud and can void merchant-of-record protection.
7. **Don't disable the geo-mismatch fraud rule globally** when going international. Update the rule to be country-list-aware (Phase 3.4).

---

## The "flip-switch" checklist

When we're actually ready to turn international on, this is the order:

1. ☐ All Phase 1 changes deployed and stable for 4+ weeks
2. ☐ All Phase 2 UI built, gated behind feature flag, QA'd internally
3. ☐ Phase 3.1 carrier integration tested end-to-end with internal shipments to friends abroad
4. ☐ Phase 3.3 payment rail (crypto recommended) live and tested
5. ☐ Phase 4.1 lawyer signoff on country whitelist + restricted product list
6. ☐ Phase 4.3 privacy policy updated; cookie consent banner live
7. ☐ Phase 4.4 terms of service updated
8. ☐ Customer support trained on international queries
9. ☐ Update FAQ + shipping policy pages to reflect new countries
10. ☐ Add `["US","CA"]` (or whatever the launch list is) to `SHIPPING_ALLOWED_COUNTRIES`
11. ☐ Soft-launch with 1 country, measure for 30 days, expand from there

---

## What I recommend doing now

**Phase 1 in full, plus Phase 2.6 (cookie consent).**

Phase 1 is now ~1-2 days of work because of the supplier-bootstrap step, but it's still zero customer impact. The big win is that after Phase 1 ships, **the supplier abstraction is live in production under domestic-only traffic** — meaning every single new supplier we sign is a config addition, not a code change. The `us-primary` supplier is exercising the entire `routeOrder → supplier_variants → fulfillment` pipeline we'll need internationally; bugs surface on familiar US traffic instead of on launch day.

Cookie consent for EU/UK traffic addresses an existing compliance exposure that we're already running — we have EU visitors, we fire tracking pixels on them, and we don't have valid consent. That's a legal issue today, not a future-international issue.

The structural decision in **4.2** (Based Research-as-platform vs Based Research-as-merchant) should be made before signing the second supplier. Worth a call with the lawyer in parallel with Phase 1 engineering work — they're independent.

Everything else (Phases 2.0-2.5, 3, 4.1) waits until the operator signals he's ready to start moving toward launch in a specific region.
