# Analytics

The Analytics tab inside the admin dashboard (`/admin` → Analytics). Single file: `src/components/admin/AnalyticsTab.tsx`. Five independent reporting modules in one scrollable page with an anchor-link sub-nav. Each section fetches its own data — no cross-section blocking.

For the dashboard surface as a whole see [admin-dashboard.md](admin-dashboard.md).

---

## 1. Layout

Top of the tab renders a header + 5-pill anchor sub-nav. Each pill jumps to the relevant section anchor:

| Anchor       | Section                |
|--------------|------------------------|
| `#customers` | Top Customers          |
| `#cohorts`   | Cohort Retention       |
| `#acquisition` | Acquisition Sources  |
| `#geo`       | Geographic             |
| `#behavior`  | Buyer Behavior         |

Each section has its own loading state, error state, window selector (where applicable), and feeds from its own API route. No shared state.

Shared atoms used throughout:

| Helper / Component | Purpose                                            |
|--------------------|----------------------------------------------------|
| `fmt(cents)`       | Currency formatter ($ no decimals).                |
| `fmtPct(n, digits)`| Percent formatter.                                 |
| `relativeDays(d)`  | "today" / "1d ago" / "3mo ago" / "1y ago".         |
| `<SectionHeader>`  | Icon + title + subtitle + right-side controls.     |
| `<SectionLoader>`  | Spinner row inside a section.                      |
| `<ErrorRow>`       | Inline error banner.                               |

All auth gating is at the API layer — every route below calls `requireAdmin()` server-side.

---

## 2. Top Customers

Anchor: `#customers`. Section component: `TopCustomersSection`. API: `GET /api/admin/customers?limit=N`.

### What it shows

Customers ranked by lifetime revenue. Window selector: top 25 / 50 / 100. Columns:

| Field              | Source field         | Notes                                                  |
|--------------------|----------------------|--------------------------------------------------------|
| Email              | `email`              |                                                        |
| Name               | `firstName/lastName` |                                                        |
| Phone              | `phone`              |                                                        |
| Signup             | `signupAt`           | rendered as "Mar 12, 2026".                            |
| First order        | `firstOrderAt`       |                                                        |
| Last order         | `lastOrderAt` + `daysSinceLastOrder` | "12d ago" suffix.                       |
| Lifetime revenue   | `lifetimeRevenue`    | sorted descending, sums all paid orders.               |
| Order count        | `orderCount`         |                                                        |
| AOV                | `aov`                | `lifetimeRevenue / orderCount`.                        |
| Refunded total     | `refundedTotal`      | shown only when > 0; flags potential chargeback risk.  |

### Use cases

- **VIP outreach** — top 25 → personalized thank-you / referral pitch.
- **Win-back triage** — VIPs with `daysSinceLastOrder > 90` are the cohort the winback cron most wants to land.
- **Refund-rate spotting** — buyers with elevated `refundedTotal` get flagged for manual review before fulfilling future orders.

---

## 3. Cohort Retention

Anchor: `#cohorts`. Section component: `CohortRetentionSection`. API: `GET /api/admin/cohorts?months=N`.

### What it shows

Monthly signup cohorts with conversion + repeat-purchase rates at 30 / 60 / 90 / 180-day windows. Window selector: last 6 / 12 / 24 months. Columns:

| Field             | Notes                                                                  |
|-------------------|------------------------------------------------------------------------|
| Cohort            | `YYYY-MM` signup month.                                                |
| Signups           | `cohortSize` — total accounts created that month.                      |
| Buyers            | how many of them placed at least one paid order.                       |
| Conv %            | `buyers / cohortSize`. Highlighted green ≥ 20%.                        |
| +30d repeat       | % of buyers who placed a 2nd+ order within 30 days of their first.     |
| +60d              | same, 60-day window. **The peptide-research repeat signal**.           |
| +90d              | 90-day window.                                                         |
| +180d             | 180-day window.                                                        |
| LTV / signup      | `revenueLifetime / cohortSize` — every signup, including non-buyers.   |
| Revenue (cohort)  | total lifetime revenue from all members of this cohort.                |

Each repeat-rate cell is heat-mapped:

- ≥ 30% → solid green tint
- 20–30% → soft green tint
- 10–20% → amber tint
- < 10% → no fill

### Use cases

- **The 60–90d repeat-rate trend is the key product-market-fit signal** for the peptide niche — researchers exhaust a 5mg vial in ~6–8 weeks, so retention shows up in this window before anywhere else.
- Compare cohorts month-over-month to spot whether new campaigns / landing pages bring lower-quality buyers (high conv %, low repeat %).
- `LTV / signup` is the right number to plug into ad spend ceilings — it accounts for the dead-weight of signups that never bought.

---

## 4. Acquisition Sources

Anchor: `#acquisition`. Section component: `AcquisitionSection`. API: `GET /api/admin/acquisition?days=N&groupBy=source|campaign`.

### What it shows

First-touch attribution. Captured at first tagged page-load (90-day localStorage TTL via `src/lib/acquisition.ts`), persisted at order time via `extractAcquisition()` in each checkout route. Three tables in one section:

### a. Sources table

Top, full-width. Controls:

- Window: 7 / 30 / 90 / 180 days.
- Group-by: `source` (e.g. `meta`, `google`, `tiktok`) or `source / medium / campaign` (one row per UTM triple).

Columns: source (+ medium + campaign if grouped that way), orders, distinct buyers, AOV, revenue, % of total revenue. Bottom row shows total revenue across all attributed orders.

### b. Top referrer domains

Left card. Pulled from `Referer` header on first touch (falls back to "direct"). Shows top 10–20 referrer hosts by orders + revenue + buyers + AOV.

### c. Top landing pages (orders only)

Right card. Which URL the customer first landed on (path only, query stripped). Useful for spotting which blog posts / product pages convert.

### Caveats

- UTM capture started **2026-05-05**. Orders before that date show as `untagged` source.
- Direct traffic without any UTM / referrer buckets to `(direct)`.
- The 90-day localStorage TTL means a visitor who first touched > 90 days ago and converts now will look untagged. Trade-off for not over-claiming attribution on stale touches.

---

## 5. Geographic

Anchor: `#geo`. Section component: `GeoSection`. API: `GET /api/admin/geo?days=N`.

### What it shows

Revenue rollup by US state (shipping address). Window selector: 30 / 90 / 180 / 365 days. Header bar shows total states, total orders, total unique buyers, total revenue across the window.

Columns:

| Field           | Notes                                                       |
|-----------------|-------------------------------------------------------------|
| State           | 2-letter USPS code (`shippingAddress.state`).               |
| Orders          | paid orders to this state in the window.                    |
| Buyers          | distinct customers (deduped by user/email).                 |
| AOV             | per state.                                                  |
| Refunds         | refunded total in dollars; red text when > 0.               |
| Net revenue     | `revenue - refunds`. Bold.                                  |
| Share           | inline horizontal bar showing % of total revenue, + % text. |

### Use cases

- **Geo bid modifiers** in Meta + Google Ads — overweight states with disproportionate revenue share.
- **Regional fulfillment planning** — if 60% of revenue is in 5 states, a regional 3PL warehouse swap saves shipping cost + time.
- **Compliance** — surface unexpected revenue from states with peptide-related regulatory friction.

---

## 6. Buyer Behavior

Anchor: `#behavior`. Section component: `BuyerBehaviorSection`. API: `GET /api/admin/checkout-analytics`.

### Data source

Server route runs **PostHog HogQL queries** filtered to sessions that ended in a `Purchase` event (buyer-only). PostHog is the source of truth for behavior data; orders DB is source of truth for revenue. This section is the only one that doesn't read directly from Postgres.

Window: last 60 days for coupon behavior + payment-method picks; all-time for buyer-journey + landings.

### Top-line tiles

Four metric tiles across the top:

| Tile                                | Source                                           |
|-------------------------------------|--------------------------------------------------|
| Avg time to purchase                | mean of `minutes_to_purchase` across buyer sessions. |
| Avg pageviews before purchase       | mean of `pageviews_before_purchase`. Lower = more decisive buyers. |
| Coupon attempt → apply              | `applied / attempted` coupon-form interactions.  |
| Coupon → purchase                   | `purchases / applied`. Cuts to closing rate among coupon-engaged sessions. |

### Hour-of-day histogram

24-bar chart of purchase events bucketed by UTC hour. Used to time email sends + paid-media pacing. The caption notes "subtract 5h (CDT) or 6h (CST) for Central."

### Side-by-side tables

| Table                          | Columns           | What it tells you                       |
|--------------------------------|-------------------|-----------------------------------------|
| Top landing pages for buyers   | Path / Buyers     | Which entry pages drive paid customers (vs all traffic). |
| Product pages buyers visit     | Path / Visits     | Engagement with PDPs by people who eventually bought. |
| Payment methods picked         | Method / Picks    | Distribution of payment methods among purchasers (populated once you wire a processor that offers more than one method). |
| Device split (buyers)          | Device / Buyers   | Mobile vs desktop vs tablet share of purchases. |

### Caveats

- PostHog HogQL has a few-second freshness lag (event ingestion → queryable).
- Anonymous sessions only — buyer-event matching is by `distinct_id`, so the same user across devices may show as 2 sessions unless they signed in.
- Coupon-attempt event needs the coupon UI to fire `coupon_applied` / `coupon_attempted` PostHog events on input. Make sure new checkout surfaces emit these — see `posthog-events.md`.

---

## 7. Endpoint reference

All endpoints below are admin-only (`requireAdmin()`).

| Endpoint                                 | Returns                                                                        |
|------------------------------------------|--------------------------------------------------------------------------------|
| `GET /api/admin/customers?limit=N`       | `{ buyers: BuyerRow[] }` — feeds Top Customers + the Customers tab.            |
| `GET /api/admin/cohorts?months=N`        | `{ cohorts: CohortRow[] }` — feeds Cohort Retention.                           |
| `GET /api/admin/acquisition?days=N&groupBy=...` | `{ sources, referrers, landings }` — feeds Acquisition Sources.         |
| `GET /api/admin/geo?days=N`              | `{ rows: GeoRow[], totals }` — feeds Geographic.                               |
| `GET /api/admin/checkout-analytics`      | PostHog HogQL payload — feeds Buyer Behavior tiles + tables.                   |

---

## 8. Adding a new section

Each section is a self-contained component that:

1. Has its own `useState` for data, loading, error.
2. Fetches its own data in `useEffect`.
3. Renders a `<SectionHeader>` + section body.
4. Has an `id` attribute on its outermost `<section>` for the anchor sub-nav.

Steps to add one:

1. Build the data route under `src/app/api/admin/<name>/route.ts`. Use `requireAdmin()`.
2. Build the section component (inside `AnalyticsTab.tsx` or a new file).
3. Add `{ id: "<id>", label: "<Label>", icon: <LucideIcon> }` to the `SECTIONS` array near the top of `AnalyticsTab.tsx`.
4. Render `<NewSection />` inside the `<AnalyticsTab>` JSX.

The anchor nav generates automatically from `SECTIONS`.

---

## 9. Known gaps / TODOs

- **No date-range delta highlights.** Each section's window selector shows current values only; no comparison-window deltas (e.g. "30d this vs 30d prior"). The `_unused` export at the bottom of the file reserves `ArrowDownRight` + `ArrowUpRight` for when this lands.
- **No CSV export.** Operators occasionally want to slice the data in Excel. None of the sections export today — `xlsx` skill could generate per-section spreadsheets if the need recurs.
- **Cohort window cap.** UI maxes at 24 months. For longer-horizon LTV analysis, raise it server-side first (`/api/admin/cohorts` caps too).
- **Behavior section depends on PostHog event hygiene.** New checkout surfaces must emit `coupon_attempted`, `coupon_applied`, `Purchase`, `$pageview` consistently for the tiles to be accurate. See `posthog-events.md` for the canonical event catalog.
- **Geographic is US-only.** International orders show up under whatever 2-letter state code their billing carries, which can be junk. Add an explicit country dimension before turning on international shipping.
