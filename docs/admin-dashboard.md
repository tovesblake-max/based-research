# Admin Dashboard

The operator-facing surface at `/admin`. Single Next.js page (`src/app/admin/page.tsx`) that mounts a 4,000-line client component (`src/app/admin/AdminDashboard.tsx`) with tabbed navigation. Auth gated by `requireAdmin()` server-side on every `/api/admin/*` route.

---

## 1. Routing + auth

- **Page**: `src/app/admin/page.tsx` — server component, sets `robots: noindex/nofollow`, renders `<AdminDashboard />`.
- **Layout**: `src/app/admin/layout.tsx` — pass-through.
- **Client root**: `src/app/admin/AdminDashboard.tsx` — owns tab state, top bar, sidebar.
- **Auth**:
  - Client side, `useAuth()` for header email + sign-out.
  - Server side, **every `/api/admin/*` route calls `requireAdmin()` from `src/lib/auth.ts`**. Non-admin sessions get 401. The dashboard UI doesn't gate render — if you can reach the page, fetches return 401 and the UI shows empty state. Production access is via the platform admin token.

---

## 2. Tab structure

Two nav groups in the left sidebar.

### Primary nav

| Tab           | Component                             | Purpose                                              |
|---------------|---------------------------------------|------------------------------------------------------|
| Overview      | inline `OverviewTab` (AdminDashboard) | KPI hero cards, today/yesterday/MTD, live shipments. |
| Orders        | inline (AdminDashboard)               | Full orders table, filters, detail panel, refunds.   |
| Cash Flow     | `components/admin/CashFlowTab.tsx`    | Daily revenue / profit / COGS rollups with chart.    |
| Analytics     | `components/admin/AnalyticsTab.tsx`   | LTV, cohorts, attribution, geography, behavior. See [analytics.md](analytics.md). |
| Subscriptions | inline                                | Active subscriptions, dunning, cancellations.        |
| Customers     | inline                                | Users list with search + outreach actions.           |
| Messages      | inline                                | Inbound contact-form / support messages.             |
| Outbox        | `components/admin/OutboxTab.tsx`      | Outbound transactional email log + resend.           |

### Secondary nav (bottom of sidebar)

| Tab        | Purpose                                              |
|------------|------------------------------------------------------|
| Wholesale  | Wholesale-account approvals, tier, credit terms.     |
| Affiliates | Affiliate list, payouts, commission edits.           |
| Settings   | Site-level toggles (feature flags, etc.).            |

Tab state lives in `const [tab, setTab] = useState<Tab>("overview")`. Tab type is:

```ts
type Tab = "overview" | "orders" | "users" | "messages" | "subscriptions"
         | "cashFlow" | "analytics" | "outbox" | "wholesale" | "affiliates"
         | "settings";
```

---

## 3. Overview tab

The default landing surface. Composed of cards driven by `GET /api/admin/stats` (single query that aggregates everything).

### Hero row 1 — Today

| Card               | Source field                        |
|--------------------|-------------------------------------|
| Today's Revenue    | `stats.revenueToday`                |
| Today's Profit     | `stats.profitTodayCents` + margin from `revenueTodayPaidCents`, `cogsTodayCents` |
| Needs Attention    | `stats.flaggedOrders + stuckOrders + subsPaymentFailed` |

Deltas (▲ / ▼ %) compare today vs `revenueYesterday` / `profitYesterday`.

### Hero row 2 — Yesterday

Closed-day absolute revenue + profit, no delta. Mirrors today so the operator doesn't have to back the numbers out from a percentage.

### Hero row 3 — Month-to-date

Same definitions, windowed from midnight on the 1st of the current calendar month. Delta compares to the same point-in-month of the prior month (e.g. May 12 vs Apr 1–12, not full April).

### Secondary cards

| Card                       | Source                                  | Notes |
|----------------------------|-----------------------------------------|-------|
| 30-day revenue + AOV       | `revenue30d`, `aov30d`                  | AOV delta vs `aovPrior30d`. |
| 7-day revenue              | `revenue7d`                             |       |
| Total orders / users       | `totalOrders`, `totalUsers`, `newUsers7d` |     |
| ACH mix (last 30d)         | `achCount30d / (achCount30d + cardCount30d)` | Renders as % of paid orders that went ACH. |
| Pending / processing orders | `pendingOrders`, `processingOrders`    | Click → jumps to Orders tab. |
| Refund rate                | derived from `refundedCount30d / paidCount30d` | |

### Live widgets

- **`<LiveTrafficWidget>`** (`components/admin/LiveTrafficWidget.tsx`) — polls `/api/admin/live-traffic` every ~10s, shows last-N PostHog sessions, current page, country, referrer.
- **`<BumpStatsCard>`** (`components/admin/BumpStatsCard.tsx`) — `/api/admin/bump-stats`, today's bump-offer take-rate.
- **In-flight shipments** — pulled in the same `fetchStats()` payload; shows tracking numbers awaiting delivery.

### Revenue chart

`revenueByDay` array (last 30 days). Renders as a sparkline + bar chart row by row.

### Top products + recent orders

Two side-by-side tables:
- Top products by 30-day revenue (`/api/admin/stats` includes this in `topProducts`).
- Most recent 10 orders (`recentOrders`); click expands and jumps to the Orders tab with that order pre-expanded.

### Manual order

`<CreateManualOrderModal>` (`components/admin/CreateManualOrderModal.tsx`) — admin can phone-order a customer through the same checkout charge path you wire to your processor. Lets an operator key in an order on the customer's behalf without leaving admin.

---

## 4. Orders tab

Full orders table with column-level filters, search, and an expandable detail panel.

### List view

- `GET /api/admin/orders?…` — supports filters: status, paymentStatus, gateway, date range, search by order number / email.
- Columns: order #, customer, total, gateway, payment status, order status, created, refund button, expand toggle.
- Search box scopes to order number, customer email, tracking number.

### Detail panel (expanded order)

Pulls full order rows (with line items) via the same endpoint. Surfaces:

- Customer + shipping address.
- Line items + computed margin.
- Payment record (`paymentGateway` provider name, `paymentReference` provider charge/txn id).
- ShipStation push state, kept in sync via the `/api/webhooks/shipstation` webhook.
- Refund actions: this template ships without a processor, so refunds are not wired. When you wire your processor, add a refund handler (call your provider's refund API, then mark the order refunded) and surface it here. Make the call idempotent so a double-click cannot issue two refunds.
- Thank-you SMS resend → `POST /api/admin/orders/thank-you-sms`.

### Other actions

- **Manual order** modal (described above) — opens from a toolbar button.

---

## 5. Cash Flow tab

`src/components/admin/CashFlowTab.tsx`. One-tab daily P&L.

- Window selector: 7 / 30 / 90 days.
- Data source: `GET /api/admin/cash-flow?days=N`. Server aggregates per-day revenue, COGS, processing fees, shipping cost, refunds, and computes daily + cumulative profit.
- Daily revenue composition chart — stacked bar per day showing gross revenue → minus COGS → minus processing → net profit.
- Per-day table with: gross revenue, paid orders, COGS, gross margin %, refunds, net.
- Pairs with `/api/admin/payouts` for affiliate / wholesale payout tracking when present.

---

## 6. Analytics tab

`src/components/admin/AnalyticsTab.tsx`. Five reporting modules in one tab — covered in [analytics.md](analytics.md).

---

## 7. Subscriptions tab

`GET /api/admin/subscriptions` — list of active recurring orders.

- Columns: customer, product/cadence, next-billing date, dunning state, total paid.
- Actions: pause, cancel, retry charge. Dunning state is driven by the `subscription-reminders` cron + `subscriptions` cron in `vercel.json`.

---

## 8. Customers tab

`GET /api/admin/customers`. Same endpoint feeds the Analytics tab's "Top Customers" section, but here it's paginated for full-list browsing.

- Search by email / name / phone.
- Click a row → opens an outreach pane (`POST /api/admin/customers/[id]/outreach`) for sending a personalized email or SMS.
- Fields surfaced: lifetime revenue, order count, AOV, days-since-last-order, signup-touch UTM, refunded total.

---

## 9. Messages tab

Inbound contact-form submissions + support inbox.

- `GET /api/admin/contact` — list view.
- `GET /api/admin/contact/[id]` — detail.
- Reply path uses `gmail_send_email` MCP (handled outside the dashboard for now — TODO: in-app reply form).

---

## 10. Outbox tab

`src/components/admin/OutboxTab.tsx`. Outbound transactional email log.

- Lists every email the system sent (order confirmation, abandoned-cart, winback, password-reset, dunning, etc.).
- `GET /api/admin/email-log?…` — filter by status (sent / failed / bounced / queued), template, recipient.
- `GET /api/admin/email-log/[id]` — full envelope + body preview.
- Resend / mark-failed actions for operator triage.

---

## 11. Wholesale tab

- `GET /api/admin/wholesale` — list of wholesale applications.
- Approve / reject / set tier + discount + credit terms.
- Tracks `outstandingBalance` per account for net-terms invoicing.

---

## 12. Affiliates tab

- `GET /api/admin/affiliates` — list with click-conversion %, total earned, pending balance.
- Approve / suspend / edit commission rate.
- "Create affiliate" button — auto-sends password-reset email on user creation (added 2026-05-xx after an affiliate sign-in incident).
- Payout pane reads `/api/admin/payouts` for unpaid commissions.

---

## 13. Settings tab

Site-level toggles. Backed by `GET / POST /api/admin/settings`.

- Quick-access toggles for site-level feature flags (for example, site mode and promo visibility).
- `ADMIN_QUICK_CODE` for cron-secret operations.

---

## 14. Top-bar / sidebar UX

- **Top bar**: brand mark, admin user email, sign-out.
- **Left sidebar** (256px): primary nav up top, secondary nav (wholesale / affiliates / settings) pinned to the bottom with a border separator.
- **Main column**: tab content. Most tabs include a `DataFreshness` indicator that shows "Updated Ns ago" and exposes a manual refresh button — relevant for stats that are user-fetched (no auto-revalidation).

---

## 15. Shared components

| Component                                | Path                                              | Used in            |
|------------------------------------------|---------------------------------------------------|--------------------|
| `LiveTrafficWidget`                      | `components/admin/LiveTrafficWidget.tsx`          | Overview           |
| `CreateManualOrderModal`                 | `components/admin/CreateManualOrderModal.tsx`     | Overview, Orders   |
| `BumpStatsCard`                          | `components/admin/BumpStatsCard.tsx`              | Overview           |
| `CashFlowTab`                            | `components/admin/CashFlowTab.tsx`                | Cash Flow tab      |
| `AnalyticsTab`                           | `components/admin/AnalyticsTab.tsx`               | Analytics tab      |
| `OutboxTab`                              | `components/admin/OutboxTab.tsx`                  | Outbox tab         |
| `HeroCard` (inline)                      | `AdminDashboard.tsx`                              | Overview           |
| `DataFreshness` (inline)                 | `AdminDashboard.tsx`                              | All polling tabs   |

---

## 16. Endpoint map

Quick reference. Every endpoint below is admin-only via `requireAdmin()`.

| Route                                              | Purpose                                              |
|----------------------------------------------------|------------------------------------------------------|
| `GET  /api/admin/stats`                            | Single fat query — feeds the Overview tab.           |
| `GET  /api/admin/orders`                           | Orders list + detail.                                |
| `POST /api/admin/orders/manual`                    | Create a manual / phone order.                       |
| `POST /api/admin/orders/thank-you-sms`             | Resend the post-shipment thank-you SMS.              |
| `GET  /api/admin/cash-flow`                        | Daily P&L for Cash Flow tab.                         |
| `GET  /api/admin/customers`                        | Customers list (paginated) + top-customers feed.     |
| `POST /api/admin/customers/[id]/outreach`          | Send personalized email / SMS.                       |
| `GET  /api/admin/subscriptions`                    | Active subscriptions.                                |
| `GET  /api/admin/contact`                          | Inbound messages list.                               |
| `GET  /api/admin/contact/[id]`                     | Inbound message detail.                              |
| `GET  /api/admin/email-log`                        | Outbox list.                                         |
| `GET  /api/admin/email-log/[id]`                   | Outbox detail.                                       |
| `GET  /api/admin/wholesale`                        | Wholesale accounts.                                  |
| `GET  /api/admin/affiliates`                       | Affiliates + commissions.                            |
| `GET  /api/admin/payouts`                          | Pending commission payouts.                          |
| `GET  /api/admin/bump-stats`                       | Bump offer take-rate.                                |
| `GET  /api/admin/live-traffic`                     | Recent PostHog sessions.                             |
| `GET  /api/admin/checkout-analytics`               | Behavior tile in Analytics tab (HogQL).              |
| `GET  /api/admin/acquisition`                      | Attribution rollups for Analytics tab.               |
| `GET  /api/admin/cohorts`                          | Monthly cohort retention for Analytics tab.          |
| `GET  /api/admin/geo`                              | Revenue by US state for Analytics tab.               |
| `GET  /api/admin/shipstation`                      | ShipStation poll status banner.                      |
| `GET  /api/admin/quick-access`                     | Admin quick-action shortcuts.                        |
| `GET / POST /api/admin/settings`                   | Site-level toggle store.                             |
| `GET  /api/admin/shared-carts`                     | Shared-cart links (operator-built carts).            |
| `GET  /api/admin/users`                            | Raw users table (debug).                             |

---

## 17. Known gaps / TODOs

- The Messages tab doesn't yet have an in-app reply form — replies still happen via the Gmail MCP outside the dashboard.
- No real-time push for new orders. The Overview tab's "Updated Ns ago" + manual refresh is the current pattern. Consider Server-Sent Events for live updates if the operator wants always-on visibility.
- Refunds are not wired. The template ships without a processor, so the detail panel has no refund button yet. Add one when you wire your processor (see Detail panel above).
