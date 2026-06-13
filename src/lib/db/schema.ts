import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uuid,
  varchar,
  index,
  uniqueIndex,
  numeric,
  customType,
  date,
} from "drizzle-orm/pg-core";

// Postgres bytea — Drizzle doesn't ship a first-class bytea type so we
// declare a custom one. JS shape is Buffer in/out. Used for COA PDFs.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() { return "bytea"; },
});

// ── USERS ───────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Email nullable — phone-only "guest" accounts have no email until they provide one
  email: varchar("email", { length: 255 }).unique(),
  // Email-based accounts have a password hash; phone-only accounts use an unusable placeholder
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  // Phone stored in E.164 format (e.g., +14691234567). Unique when set.
  phone: varchar("phone", { length: 20 }).unique(),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  role: varchar("role", { length: 20 }).notNull().default("customer"), // "customer" | "admin"
  emailVerified: boolean("email_verified").notNull().default(false),
  referredBy: uuid("referred_by"), // FK to affiliates.id — set once at account creation, never changes
  // Signup geo attribution — captured from Vercel edge headers on account creation
  signupIp: varchar("signup_ip", { length: 45 }), // IPv4 (15) or IPv6 (45)
  signupCountry: varchar("signup_country", { length: 2 }), // ISO 3166-1 alpha-2
  signupRegion: varchar("signup_region", { length: 10 }), // State/region code e.g. "CA"
  signupCity: varchar("signup_city", { length: 100 }),
  // Last time the 60-day win-back nudge was sent to this user. Nullable
  // (NULL = never been emailed). Cron updates on send, then enforces a
  // 90-day TTL before re-firing so a long-dormant customer never gets
  // a second nudge inside the same season.
  lastWinbackEmailAt: timestamp("last_winback_email_at"),
  // Per-user cost-plus pricing override. When set, this customer's effective
  // price per variant is computed server-side as variant.costCents +
  // cost_plus_margin_cents (a flat markup above our supplier cost). Used for
  // insider / family / partner customers who get near-cost pricing without
  // exposing supplier costs publicly. NULL = no override (retail applies).
  // The cart auto-applies the difference as a discount line; the server
  // recomputes at order-creation time so client tampering can't widen it.
  costPlusMarginCents: integer("cost_plus_margin_cents"),
  // Researcher self-classification, saved to the profile so the customer
  // only declares it ONCE (2026-05-21). Set the first time they pick a
  // type at checkout; pre-filled on every subsequent checkout. Mirrors
  // the orders.researcher_type enum ("academic", "biotech_rd", "cro",
  // "private_lab", "clinical_research", "other").
  researcherType: varchar("researcher_type", { length: 40 }),
  // When the customer first affirmed research-use-only. Presence of a
  // timestamp = they've acknowledged; the checkout pre-checks the box on
  // return rather than forcing a fresh affirmation every order.
  researchUseAcknowledgedAt: timestamp("research_use_acknowledged_at"),
  // Optional business identifiers captured at account creation (2026-05-21).
  // companyName: plain text. ein: ENCRYPTED at rest via src/lib/crypto.ts
  // (same posture as wholesale_accounts.ein). Both nullable / optional.
  companyName: varchar("company_name", { length: 255 }),
  ein: varchar("ein", { length: 500 }),
  // Institutional buyer verification (2026-05-26). Null = not yet verified.
  // An admin sets this after manually reviewing the buyer's institution
  // (company name / EIN / department) — typically triggered on first order.
  // It's a review flag, not a hard checkout gate.
  institutionVerifiedAt: timestamp("institution_verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_phone_idx").on(table.phone),
  index("users_signup_country_idx").on(table.signupCountry),
]);

// ── AFFILIATES ─────────────────────────────────────────────
export const affiliates = pgTable("affiliates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  affiliateCode: varchar("affiliate_code", { length: 30 }).notNull().unique(),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.1000"), // 10%
  totalEarned: integer("total_earned").notNull().default(0), // cents
  totalPaid: integer("total_paid").notNull().default(0), // cents
  payoutMethod: varchar("payout_method", { length: 20 }).notNull().default("crypto"), // "crypto" | "ach"
  // Bank details for ACH payouts are encrypted at rest (AES-256-GCM, same
  // helper as subscription ACH creds). walletAddress + accountName stay in
  // the clear since they're not secret identifiers. last4 / masked versions
  // are stored for display without needing to decrypt on every read.
  payoutDetails: jsonb("payout_details").$type<{
    walletAddress?: string;
    accountName?: string;
    routingNumberEncrypted?: string;
    accountNumberEncrypted?: string;
    accountNumberLast4?: string;
    accountNumberMasked?: string;
  }>(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // "active" | "inactive" | "suspended"
  // Free-text application context the applicant submits — audience,
  // platforms, why-they're-a-good-fit. Lets admin vet before activating
  // (filters out coupon-hunters who'd otherwise apply just to use their
  // own code as a 10% discount). Nullable so existing affiliates from
  // before this column landed continue to work.
  applicationNotes: text("application_notes"),
  // Per-affiliate coupon-discount override. When NULL, the affiliate
  // code applied as a coupon at checkout discounts the cart by the
  // global default (AFFILIATE_COUPON_DISCOUNT_PERCENT in coupons.ts).
  // Set to e.g. 15 to give this specific partner a 15% checkout
  // discount on their referrals (independent of their commission rate
  // — those are different ledgers). Used to bespoke high-value
  // partners without changing the global default.
  couponDiscountPercent: integer("coupon_discount_percent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("affiliates_user_idx").on(table.userId),
  index("affiliates_code_idx").on(table.affiliateCode),
]);

// ── COMMISSIONS ────────────────────────────────────────────
export const commissions = pgTable("commissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  affiliateId: uuid("affiliate_id").notNull().references(() => affiliates.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  orderTotal: integer("order_total").notNull(), // cents
  commissionAmount: integer("commission_amount").notNull(), // cents
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending" | "approved" | "paid"
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("commissions_affiliate_idx").on(table.affiliateId),
  // Unique on orderId — one commission per order. Backs the
  // onConflictDoNothing dedup in createCommissionIfReferred so a
  // double-fire can't double-pay an affiliate.
  uniqueIndex("commissions_order_idx").on(table.orderId),
  index("commissions_status_idx").on(table.status),
]);

// ── PAYOUTS ────────────────────────────────────────────────
export const payouts = pgTable("payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  affiliateId: uuid("affiliate_id").notNull().references(() => affiliates.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // cents
  method: varchar("method", { length: 20 }).notNull(), // "crypto" | "ach"
  transactionReference: varchar("transaction_reference", { length: 255 }), // tx hash or ACH ref
  commissionIds: jsonb("commission_ids").$type<string[]>().notNull(), // array of commission UUIDs
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending" | "completed" | "failed"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("payouts_affiliate_idx").on(table.affiliateId),
]);

// ── SHARED CARTS ───────────────────────────────────────────
// Admin-built pre-filled carts that get a short shareable slug. Sent
// to a customer via DM / SMS / email; clicking the resulting link
// (`/cart?share=<slug>`) hydrates the cart with the curated items.
// Useful for high-AOV custom orders that started as a conversation
// rather than an organic cart-build.
export const sharedCarts = pgTable("shared_carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  // 6-8 char base36 readable suffix — short enough for SMS, no easy
  // collisions in practice. Generated client-side at create time and
  // collision-checked via the unique constraint below.
  slug: varchar("slug", { length: 20 }).notNull().unique(),
  items: jsonb("items").$type<Array<{
    slug: string;
    variantSku: string;
    quantity: number;
  }>>().notNull(),
  notes: text("notes"), // internal admin label, never shown to customer
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  redeemCount: integer("redeem_count").notNull().default(0),
  firstRedeemedAt: timestamp("first_redeemed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("shared_carts_slug_idx").on(table.slug),
  index("shared_carts_created_idx").on(table.createdAt),
]);

// ── AFFILIATE CLICKS ───────────────────────────────────────
// Lightweight click ledger captured by the ReferralCapture component on
// any landing where `?ref=CODE` is present. Used to surface clicks +
// click-to-signup conversion in the affiliate and admin dashboards. Bot
// fingerprints are filtered upstream by middleware.ts before they ever
// hit the capture endpoint, but we still hash the IP per-day to dedupe
// reload spam without storing raw PII.
export const affiliateClicks = pgTable("affiliate_clicks", {
  id: uuid("id").defaultRandom().primaryKey(),
  affiliateId: uuid("affiliate_id").notNull().references(() => affiliates.id, { onDelete: "cascade" }),
  // Landing path (e.g. "/", "/product/glp3-rta") — useful to see what an
  // affiliate's traffic actually lands on without storing the raw query
  // string (which could contain UTM PII or third-party tracking IDs).
  landingPath: varchar("landing_path", { length: 500 }),
  // Country from Vercel edge headers (ISO 3166-1 alpha-2). Null when not
  // resolved (local dev, edge cache miss, etc.). Lets us segment EPC by
  // geography for affiliates with international audiences.
  country: varchar("country", { length: 2 }),
  // SHA-256 of (ipBucket + affiliateCode + YYYY-MM-DD). Per-day dedupe
  // unique constraint below collapses repeat clicks from the same
  // visitor on the same day into a single row.
  dedupeHash: varchar("dedupe_hash", { length: 64 }).notNull(),
  referer: varchar("referer", { length: 500 }), // truncated; first 500 chars only
  userAgent: varchar("user_agent", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("affiliate_clicks_affiliate_idx").on(table.affiliateId),
  index("affiliate_clicks_created_idx").on(table.createdAt),
  uniqueIndex("affiliate_clicks_dedupe_idx").on(table.dedupeHash),
]);

// ── ADDRESSES ───────────────────────────────────────────────
export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 50 }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  address1: varchar("address_1", { length: 255 }).notNull(),
  address2: varchar("address_2", { length: 255 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zip: varchar("zip", { length: 20 }).notNull(),
  country: varchar("country", { length: 2 }).notNull().default("US"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("addresses_user_idx").on(table.userId),
]);

// ── ORDERS ──────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: varchar("order_number", { length: 20 }).notNull().unique(),
  // Auto-incrementing customer-facing sequence (1, 2, 3, …) for a short,
  // recognizable invoice reference ("INV-25") alongside the long base-36
  // orderNumber. DB-level: NOT NULL with `DEFAULT nextval('orders_invoice_seq')`.
  // Drizzle types it as nullable because the TS layer never sets it on
  // insert (Postgres fills via the sequence), but reads always return a
  // number for any persisted row.
  invoiceSeq: integer("invoice_seq"),
  // Customer phone for guest/express orders, or copied from the linked
  // user record on signed-in orders. Populated at order-creation time
  // so admin can SMS abandoned-cart leads without parsing the notes
  // field. Backfill 2026-05-03 covered all existing orders.
  customerPhone: varchar("customer_phone", { length: 30 }),
  // Cumulative cents already refunded on this order. Supports partial
  // refunds: the refund endpoint validates `refunded + new <= total`
  // before issuing, then increments by the new amount on success. A
  // double-click / retry can't push past `total` because the check is
  // done inside an atomic claim of paymentStatus='refunding'.
  refundedAmountCents: integer("refunded_amount_cents").notNull().default(0),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  email: varchar("email", { length: 255 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  subtotal: integer("subtotal").notNull(),
  shippingCost: integer("shipping_cost").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  // Credit-card processing surcharge, cents. Non-zero only on card
  // orders; ACH orders leave this at 0. Kept as its own column so we
  // can report surcharge revenue separately from the underlying order
  // total at tax time.
  cardSurcharge: integer("card_surcharge").notNull().default(0),
  total: integer("total").notNull(),
  shippingAddress: jsonb("shipping_address").$type<{
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  }>(),
  paymentStatus: varchar("payment_status", { length: 30 }).default("unpaid"),
  // ── Payment integration point ──────────────────────────────
  // This template ships WITHOUT a payment processor wired (see
  // src/app/api/checkout/route.ts). When you integrate one, record the
  // provider name here (e.g. "braintree", "adyen", "authorize_net") and store
  // the provider's charge/transaction id in paymentReference so refunds,
  // reconciliation, and status polling have a stable lookup key.
  paymentGateway: varchar("payment_gateway", { length: 40 }),
  paymentReference: varchar("payment_reference", { length: 255 }),
  // Per-order researcher attestation captured at checkout.
  // researcherType is a self-classified label ("academic", "biotech_rd",
  // "cro", "private_lab", "clinical_research", "other"). Stored verbatim
  // — the UI controls the picker so the set is constrained at write time,
  // not at the column level (gives us flexibility to add labels later
  // without a migration). NULL on historical orders.
  researcherType: varchar("researcher_type", { length: 40 }),
  // Customer's explicit affirmation that products are for laboratory
  // research use only and will not be used for human or animal
  // consumption. Required to be true at checkout for any new order
  // (server-enforced). NULL on historical orders.
  researchUseAcknowledged: boolean("research_use_acknowledged"),
  // Coupon applied at order-creation time. Persisted on the order row so
  // the async webhook path (3DS/HPP confirmation) can record the
  // redemption when payment finalizes — the coupon context is otherwise
  // lost between checkout submit and webhook receipt. couponId FK uses
  // ON DELETE SET NULL so deleting a stale promo never cascades into
  // historical orders.
  couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
  couponCode: varchar("coupon_code", { length: 50 }),
  // Affiliate attribution at order-time. Populated when the customer
  // entered an active affiliate code as their coupon. Wins over the
  // signup-time `users.referredBy` lookup for THIS order only — original
  // referrer keeps lifetime credit on future orders. SET NULL on delete
  // so removing an affiliate doesn't cascade into historical orders.
  referralAffiliateId: uuid("referral_affiliate_id"),
  // Subscription / Wholesale links
  subscriptionId: uuid("subscription_id"), // FK to subscriptions — set on auto-ship orders
  wholesaleAccountId: uuid("wholesale_account_id"), // FK to wholesaleAccounts
  poNumber: varchar("po_number", { length: 100 }), // PO number for wholesale orders
  // ShipStation
  shipstationOrderId: integer("shipstation_order_id"), // ShipStation's internal order ID
  shipstationOrderKey: varchar("shipstation_order_key", { length: 50 }), // our orderNumber used as key
  shipstationPushedAt: timestamp("shipstation_pushed_at"), // when order was pushed to ShipStation
  // Shipping
  trackingNumber: varchar("tracking_number", { length: 100 }),
  trackingUrl: varchar("tracking_url", { length: 500 }),
  trackingCarrier: varchar("tracking_carrier", { length: 100 }),
  trackingSynced: boolean("tracking_synced").default(false),
  trackingMilestone: varchar("tracking_milestone", { length: 30 }), // Ship24 milestone: pending, in_transit, out_for_delivery, delivered, exception
  trackingLastEvent: text("tracking_last_event"), // raw status text
  trackingLastChecked: timestamp("tracking_last_checked"),
  deliveredAt: timestamp("delivered_at"),
  notes: text("notes"),
  // Fraud scoring — populated at checkout time
  fraudScore: integer("fraud_score"), // 0-100, null if unscored
  fraudSignals: text("fraud_signals").array(), // array of triggered signal codes
  // Bump offer analytics — bumpShown = true if the checkout page rendered a
  // bump offer for this user. Accept is derived from whether the bump SKU
  // appears in order_items. Together they give us take rate + revenue lift.
  bumpShown: boolean("bump_shown").notNull().default(false),
  // ── Acquisition attribution ─────────────────────────────────
  // Captured at order-creation time from the URL params on whatever page
  // the user landed on, then persisted in localStorage and replayed at
  // checkout. Together they let the admin tie each order back to its
  // acquisition source (Meta / Google / affiliate / direct / referrer
  // domain) so true ROAS becomes computable per channel. NULL on orders
  // booked before this column existed (back-2026-05-05 backfill is a TBD).
  utmSource: varchar("utm_source", { length: 100 }),    // e.g. "meta" / "google" / "newsletter"
  utmMedium: varchar("utm_medium", { length: 100 }),    // e.g. "cpc" / "organic" / "email" / "affiliate"
  utmCampaign: varchar("utm_campaign", { length: 200 }),// e.g. "spring-2026-reta" / ad set name
  utmContent: varchar("utm_content", { length: 200 }),  // e.g. ad creative variant id
  utmTerm: varchar("utm_term", { length: 200 }),        // e.g. keyword (legacy Google)
  // First page the user landed on within the session that produced this
  // order. Distinct from utm_*: works for traffic without UTMs (organic,
  // direct, social-without-tagging). Stored as path only (no query/host).
  landingPath: varchar("landing_path", { length: 255 }),
  // Document.referrer host at session start. Lets us split direct vs
  // social-share vs Google-organic vs link-from-blog without UTMs.
  referrerDomain: varchar("referrer_domain", { length: 255 }),
  // Shipping notification — set when we successfully dispatch the
  // "your order shipped" SMS. Prevents duplicates on ShipStation webhook
  // replays and admin manual tracking-entry re-saves.
  shippingSmsSentAt: timestamp("shipping_sms_sent_at"),
  shippingSmsSid: varchar("shipping_sms_sid", { length: 100 }),
  // Duplicate-order detection. When the same customer places two paid
  // orders within DUP_WINDOW_MIN minutes with identical line-item
  // contents, we tag the SECOND order with the FIRST order's id here.
  // Surfaces as a "Possible duplicate" priority flag in the admin
  // Orders tab so operator can reach out and confirm intent before
  // cold-chain shipping both. The customer also gets an automated
  // confirmation SMS at flag time (see customer_phone column above).
  dupOfOrderId: uuid("dup_of_order_id"),
  // Idempotency: when we successfully dispatch the "did you mean to
  // place 2 orders?" SMS, stamp this so a webhook replay or manual
  // re-trigger does not double-text the customer.
  dupConfirmationSmsSentAt: timestamp("dup_confirmation_sms_sent_at"),
  // Admin thank-you outreach. When admin clicks the "Send thank-you
  // SMS" button on a paid order, the click-to-text opens iMessage
  // pre-populated. Stamping this on success-pop is best-effort — we
  // can't tell whether the operator actually sent the message after
  // the iMessage app opened, but stamping the click lets the UI mark
  // the order "thanked" so admin doesn't double-text. Cleared
  // explicitly via the button if admin wants to re-send.
  thankYouSmsSentAt: timestamp("thank_you_sms_sent_at"),
  // Abandoned-order recovery SMS. The /api/cron/abandoned-order-sms cron
  // scans unpaid orders 10-60 minutes old with a phone on file and fires
  // a single recovery SMS. Stamping prevents double-sends on cron replay
  // and lets the admin UI surface whether the customer has already been
  // automatically nudged. Manual operator follow-up (the Text button on
  // the order row) is intentionally a separate column so admin still
  // has a clean "did I personally reach out?" signal.
  recoverySmsSentAt: timestamp("recovery_sms_sent_at"),
  // High-Value Follow-up admin action. Stamped at click-time when the
  // operator pressed the "Send" button on the HV Follow-up tab — the row
  // then drops off the queue so the same cart isn't re-surfaced. Best-
  // effort: we can't confirm the operator actually pressed send in the
  // Messages app after iMessage opened, but stamping prevents duplicate
  // surfacing. Re-arm by clearing this column from the row (POST to
  // /api/admin/hv-followup with { clear: true }).
  adminFollowupSentAt: timestamp("admin_followup_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("orders_user_idx").on(table.userId),
  index("orders_status_idx").on(table.status),
  index("orders_number_idx").on(table.orderNumber),
]);

// ── ORDER ITEMS ─────────────────────────────────────────────
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 100 }).notNull(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  variantSku: varchar("variant_sku", { length: 100 }).notNull(),
  variantSize: varchar("variant_size", { length: 50 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  lineTotal: integer("line_total").notNull(),
}, (table) => [
  index("order_items_order_idx").on(table.orderId),
]);

// ── SUBSCRIPTIONS ──────────────────────────────────────────
// Recurring-order scaffolding. This template ships WITHOUT a billing
// processor wired, so the renewal cron (/api/cron/subscriptions) creates
// the next order in an `unpaid` state and leaves the actual charge to
// whatever processor you integrate. Store the provider's customer/payment
// token in `billingReference` when you wire recurring billing.
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active | paused | payment_failed | cancelled
  pauseReason: varchar("pause_reason", { length: 20 }), // user | dunning
  frequency: integer("frequency").notNull().default(30),
  loyaltyTier: varchar("loyalty_tier", { length: 20 }).notNull().default("bronze"),
  discountPercent: integer("discount_percent").notNull().default(10),
  discountOverride: boolean("discount_override").default(false), // admin set custom rate
  successfulCharges: integer("successful_charges").notNull().default(0),
  shippingAddressId: uuid("shipping_address_id").references(() => addresses.id, { onDelete: "set null" }),
  // Opaque billing token from your payment processor (e.g. a saved
  // customer/payment-method id). NULL until you wire recurring billing.
  billingReference: varchar("billing_reference", { length: 255 }),
  // Scheduling
  nextChargeDate: timestamp("next_charge_date").notNull(),
  lastChargedAt: timestamp("last_charged_at"),
  pausedUntil: timestamp("paused_until"),
  // Idempotency
  lastChargeEpoch: varchar("last_charge_epoch", { length: 30 }),
  processingAt: timestamp("processing_at"),
  // Dunning
  retryCount: integer("retry_count").notNull().default(0),
  lastRetryAt: timestamp("last_retry_at"),
  // Cancellation
  cancelReason: varchar("cancel_reason", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("subscriptions_user_idx").on(table.userId),
  index("subscriptions_status_idx").on(table.status),
  index("subscriptions_next_charge_idx").on(table.nextChargeDate),
]);

// ── SUBSCRIPTION EVENTS (audit trail) ──────────────────────
export const subscriptionEvents = pgTable("subscription_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  subscriptionId: uuid("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  event: varchar("event", { length: 50 }).notNull(),
  details: jsonb("details").$type<Record<string, unknown>>(),
  orderId: uuid("order_id"),
  paymentReference: varchar("payment_reference", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("sub_events_subscription_idx").on(table.subscriptionId),
]);

// ── SUBSCRIPTION ITEMS ─────────────────────────────────────
export const subscriptionItems = pgTable("subscription_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  subscriptionId: uuid("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 100 }).notNull(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  variantSku: varchar("variant_sku", { length: 100 }).notNull(),
  variantSize: varchar("variant_size", { length: 50 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  basePrice: integer("base_price").notNull(), // cents — locked at subscription creation
  quantity: integer("quantity").notNull(),
}, (table) => [
  index("sub_items_subscription_idx").on(table.subscriptionId),
]);

// ── WHOLESALE ACCOUNTS ─────────────────────────────────────
export const wholesaleAccounts = pgTable("wholesale_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  website: varchar("website", { length: 255 }),
  ein: varchar("ein", { length: 100 }), // encrypted at rest
  institutionType: varchar("institution_type", { length: 50 }).notNull(), // university | research_lab | hospital | biotech | distributor | other
  estimatedMonthlyVolume: varchar("estimated_monthly_volume", { length: 50 }),
  useCase: text("use_case"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected | suspended
  tier: integer("tier").notNull().default(1), // 1-4
  discountPercent: integer("discount_percent").notNull().default(20),
  creditTerms: varchar("credit_terms", { length: 20 }).notNull().default("prepaid"), // prepaid | net15 | net30 | net60
  creditLimit: integer("credit_limit").default(0), // cents
  outstandingBalance: integer("outstanding_balance").notNull().default(0), // cents
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("wholesale_user_idx").on(table.userId),
  index("wholesale_status_idx").on(table.status),
]);

// ── PASSWORD RESET TOKENS ──────────────────────────────────
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 100 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("reset_tokens_token_idx").on(table.token),
  index("reset_tokens_user_idx").on(table.userId),
]);

// ── ABANDONED CARTS ────────────────────────────────────────
// Snapshots of carts taken when a user reaches begin_checkout. Cron job
// scans for un-converted carts of increasing age and sends recovery emails.
export const abandonedCarts = pgTable("abandoned_carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Either userId or emailLower (or both) identifies the customer
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  emailLower: varchar("email_lower", { length: 255 }).notNull(),
  // Cart contents (array of { productId, productName, variantSku, variantSize, price, quantity, slug })
  items: jsonb("items").$type<Array<{
    productId: string;
    productName: string;
    variantSku: string;
    variantSize: string;
    price: number;
    quantity: number;
    slug: string;
  }>>().notNull(),
  subtotal: integer("subtotal").notNull(), // cents
  // Lifecycle: 0=just captured, 1=sent email1, 2=sent email2, 3=sent email3, 99=converted
  stage: integer("stage").notNull().default(0),
  // URL token for "restore cart" recovery links in emails
  recoveryToken: varchar("recovery_token", { length: 64 }).notNull().unique(),
  convertedAt: timestamp("converted_at"),
  lastEmailAt: timestamp("last_email_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("abandoned_carts_email_idx").on(table.emailLower),
  index("abandoned_carts_stage_idx").on(table.stage),
  index("abandoned_carts_updated_idx").on(table.updatedAt),
]);

// ── COUPONS ────────────────────────────────────────────────
// Merchant-issued discount codes. `appliesTo` is nullable — null means
// sitewide; when populated it's a list of product slugs the cart must
// contain at least one of for the code to apply. Discount types:
//   - "fixed_amount"  → subtract discountCents from subtotal (capped at subtotal)
//   - "percentage"    → subtract discountPercent of the matching-items subtotal
// Per-use + per-user + total redemption limits are all optional; leaving
// them null = unlimited.
export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // stored uppercase
  description: varchar("description", { length: 255 }),
  discountType: varchar("discount_type", { length: 20 }).notNull(), // "fixed_amount" | "percentage" | "free_shipping"
  discountCents: integer("discount_cents"), // used when type = fixed_amount
  discountPercent: integer("discount_percent"), // used when type = percentage
  // When true, the coupon discount equals the cart's shipping cost
  // (computed at validation time via computeShippingCents). Lets a
  // single coupon zero out shipping regardless of which side of the
  // $200 free-shipping threshold the cart sits on. The discountType
  // string convention "free_shipping" is the canonical marker; this
  // boolean column was added so existing UNION queries on discount_type
  // didn't need a new enum value coordination across consumers.
  freeShipping: boolean("free_shipping").notNull().default(false),
  appliesTo: jsonb("applies_to").$type<string[] | null>(), // array of product slugs, null = sitewide
  minSubtotalCents: integer("min_subtotal_cents"), // null = no minimum
  maxRedemptions: integer("max_redemptions"), // null = unlimited total
  maxPerUser: integer("max_per_user"), // null = unlimited per user
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").notNull().default(true),
  timesRedeemed: integer("times_redeemed").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("coupons_code_idx").on(table.code),
  index("coupons_active_idx").on(table.isActive),
]);

// Audit trail — one row per successful coupon redemption. Links to the
// user + order so per-user caps can be enforced and admin can see exactly
// which orders a code has been used on.
export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  couponId: uuid("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  discountAppliedCents: integer("discount_applied_cents").notNull(),
  code: varchar("code", { length: 50 }).notNull(), // snapshot of the code at redemption time
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("coupon_redemptions_coupon_idx").on(table.couponId),
  index("coupon_redemptions_user_idx").on(table.userId),
  index("coupon_redemptions_order_idx").on(table.orderId),
]);

// ── SITE SETTINGS ──────────────────────────────────────────
// Key/value configuration store — feature flags, admin-editable copy, etc.
// Read path is cached per request via React.cache so toggling a flag takes
// effect on the next request without requiring a redeploy.
export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: uuid("updated_by"), // FK to users.id of the admin who toggled it
});

// ── CONTACT SUBMISSIONS ────────────────────────────────────
export const contactSubmissions = pgTable("contact_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  orderNumber: varchar("order_number", { length: 50 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── CART EVENTS ─────────────────────────────────────────────
// Every server-confirmed add-to-cart click, one row per click. Used
// alongside orders + abandoned_carts to build the per-customer
// "interested in" list shown to admins. Anonymous adds (no session
// cookie) are dropped at the endpoint — we only track authenticated
// users because tying anonymous events back to later-created accounts
// requires a separate stable-client-id pipeline we haven't built yet.
//
// High-write table: indexed on (userId, createdAt) for the admin-table
// read path, and the userId FK cascades on user delete.
export const cartEvents = pgTable("cart_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 100 }).notNull(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  variantSku: varchar("variant_sku", { length: 100 }).notNull(),
  priceCents: integer("price_cents").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("cart_events_user_created_idx").on(table.userId, table.createdAt),
  index("cart_events_slug_idx").on(table.slug),
]);

// ── ADMIN OUTREACH LOG ─────────────────────────────────────
// One row per admin-initiated touch (currently SMS; email/call channels
// can be added later by extending the `channel` enum). Used to surface
// "last contacted" timestamps on the customer table and to build a
// follow-up timeline per customer.
export const adminOutreach = pgTable("admin_outreach", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id").notNull().references(() => users.id, { onDelete: "set null" }),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 20 }).notNull(), // "sms" | "email" | "call"
  // Captured recipient + template at click time. Lets us reconstruct
  // what was sent even if the customer's phone changes later.
  recipient: varchar("recipient", { length: 50 }),
  templateKey: varchar("template_key", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("admin_outreach_customer_idx").on(table.customerId),
  index("admin_outreach_admin_idx").on(table.adminId),
]);

// ── TYPE EXPORTS ────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type NewContactSubmission = typeof contactSubmissions.$inferInsert;
export type Affiliate = typeof affiliates.$inferSelect;
export type NewAffiliate = typeof affiliates.$inferInsert;
export type Commission = typeof commissions.$inferSelect;
export type NewCommission = typeof commissions.$inferInsert;
export type Payout = typeof payouts.$inferSelect;
export type NewPayout = typeof payouts.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionItem = typeof subscriptionItems.$inferSelect;
export type NewSubscriptionItem = typeof subscriptionItems.$inferInsert;
export type WholesaleAccount = typeof wholesaleAccounts.$inferSelect;
export type NewWholesaleAccount = typeof wholesaleAccounts.$inferInsert;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type NewCouponRedemption = typeof couponRedemptions.$inferInsert;

// ── EMAIL LOG (admin outbox) ──────────────────────────────
// Every email send (success OR failure) lands here. Powers the admin
// Outbox tab so deliverability can be verified per-message and stale
// templates / typos / blocked recipients surface as a row in the log
// rather than a silent failure in Vercel's text logs.
//
// We store the FULL html + text body per send. At Based Research's volume
// (thousands of sends/month, tens of KB each) this is well under the
// row-size budget and lets admin click any message to see exactly
// what was rendered, including the unique parts (order numbers, codes,
// recovery tokens). If volume ever grows past 100K+ rows we can move
// the body fields to S3 and keep just the metadata here.
export const emailLog = pgTable("email_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Recipient as captured at send time (mailtrap target). Lower-cased
  // for searchability — admin types fragments and we LIKE-match.
  toEmail: varchar("to_email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  // Logical template tag, e.g. "order_confirmation",
  // "abandoned_cart_stage_1", "refund_confirmation",
  // "affiliate_approval", "password_reset", "winback_60d",
  // "subscription_charge_confirmation", "subscription_dunning_failed".
  // Nullable so legacy / ad-hoc sends still log without forcing a tag.
  template: varchar("template", { length: 100 }),
  // "sent" | "failed". On failure, errorMessage is populated.
  status: varchar("status", { length: 20 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull().default("mailtrap"),
  // Provider's message ID returned on success (Mailtrap returns
  // `message_ids: [string]`). Useful for cross-referencing in the
  // Mailtrap dashboard or replaying complaints from the recipient.
  providerMessageId: varchar("provider_message_id", { length: 200 }),
  // Raw provider response body, truncated. On success this is small
  // (the JSON envelope); on failure this is the actual error text we
  // can show in the Outbox row.
  providerResponse: text("provider_response"),
  errorMessage: text("error_message"),
  htmlBody: text("html_body"),
  textBody: text("text_body"),
  // Optional FK columns for cross-linking. Nullable so non-order /
  // non-user emails (e.g. tracking-exception alerts to admin) still
  // log without forcing fake IDs.
  relatedOrderId: uuid("related_order_id"),
  relatedUserId: uuid("related_user_id"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
}, (table) => [
  index("email_log_to_idx").on(table.toEmail),
  index("email_log_template_idx").on(table.template),
  index("email_log_sent_at_idx").on(table.sentAt),
  index("email_log_status_idx").on(table.status),
]);

export type EmailLog = typeof emailLog.$inferSelect;
export type NewEmailLog = typeof emailLog.$inferInsert;

// ── COAs ────────────────────────────────────────────────────
// Certificate of Analysis storage. One row per uploaded PDF. The binary
// itself lives in file_data as bytea; everything else is indexable metadata.
// product_slug is the binding key for product page lookups; variant_sku is
// optional (NULL = covers all variants of the product). is_active is the
// supersede flag — uploading a newer COA for the same product+batch flips
// the old one to is_active=false so public queries only return current
// docs. See drizzle/0006_coas.sql for the full schema rationale.
export const coas = pgTable("coas", {
  id: uuid("id").defaultRandom().primaryKey(),
  productSlug: varchar("product_slug", { length: 255 }).notNull(),
  variantSku: varchar("variant_sku", { length: 100 }),
  batchNumber: varchar("batch_number", { length: 100 }).notNull(),
  fileData: bytea("file_data").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull().default("application/pdf"),
  testDate: date("test_date"),
  purityPercent: numeric("purity_percent", { precision: 5, scale: 2 }),
  labName: varchar("lab_name", { length: 255 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
}, (table) => [
  index("coas_slug_active_idx").on(table.productSlug, table.isActive),
  index("coas_uploaded_at_idx").on(table.uploadedAt),
  index("coas_batch_idx").on(table.batchNumber),
]);

export type Coa = typeof coas.$inferSelect;
export type NewCoa = typeof coas.$inferInsert;

