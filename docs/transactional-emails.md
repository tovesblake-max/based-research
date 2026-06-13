# Transactional Emails & Automated Sequences

Authoritative reference for every automated message Based Research
sends to customers, prospects, partners, and the admin team. If you
add, remove, or rename an email, update this file in the same commit.

Last updated: 2026-05-05.

## Senders + infrastructure

| Channel | Provider | Helper module | Notes |
|---|---|---|---|
| Email | Mailtrap (transactional API) | `src/lib/email.ts` | All custom-templated HTML emails go through `sendEmail()`. |
| SMS | Twilio (Programmable Messaging + Verify) | `src/lib/twilio.ts` | Phone-OTP uses Twilio Verify (managed code lifecycle). All other SMS uses our 10DLC sender via `sendSMS()`. |
| Admin SMS | Same Twilio sender | `src/lib/admin-notify.ts` | Reads `ADMIN_NOTIFY_PHONE` env var. Silent no-op when unset. |

All cron jobs authenticate with `Bearer ${CRON_SECRET}` and fail closed
when the secret is unset, so the email-sending endpoints can never be
triggered externally to spam customers.

## Cron schedule (vercel.json)

| Path | Cron expression | Frequency | Sends emails? |
|---|---|---|---|
| `/api/cron/abandoned-carts` | `15 * * * *` | hourly at :15 | yes (cart-recovery 1/2/3) |
| `/api/cron/subscriptions` | `0 10 * * *` | daily 10:00 UTC | yes (charge confirmation, dunning) |
| `/api/cron/subscription-reminders` | `0 9 * * *` | daily 09:00 UTC | yes (pre-charge heads-up) |
| `/api/cron/tracking-status` | `0 8,12,16,20 * * *` | every 4 hours | yes (delivered email, exception alert) |
| `/api/cron/eod-sales-report` | `0 4 * * *` | daily 04:00 UTC | admin SMS only |
| `/api/cron/winback` | `0 13 * * *` | daily 13:00 UTC | yes (60-day win-back nudge) |

---

## Customer-facing email

### 1. Order confirmation

| Field | Value |
|---|---|
| Function | `sendOrderConfirmationEmail()` in `src/lib/email.ts` |
| Trigger | Payment confirmed by your processor |
| Callsites | Call this from your payment webhook under `/api/webhooks/` once the provider confirms payment and you flip the order to `paid`. The template ships without a processor, so no callsite is wired yet. |
| Subject | `Order {orderNumber} confirmed, Based Research` |
| Body | Itemized line items, subtotal / shipping / discount / total breakdown, statement-descriptor disclaimer, tracking-soon copy, account link |
| Idempotency | None at the email layer; relies on the upstream payment webhook being deduped before this is called |

### 2. Password reset

| Field | Value |
|---|---|
| Function | `sendPasswordResetEmail()` |
| Trigger | User requests password reset |
| Subject | `Reset Your Password, Based Research` |
| Body | Reset link with a 1-hour-expiry token |

### 3. Order shipped

| Field | Value |
|---|---|
| Sender | Inline in `/api/webhooks/shipstation/route.ts` |
| Trigger | ShipStation fires `SHIP_NOTIFY` webhook OR admin manually adds tracking via `PATCH /api/admin/orders` |
| Subject | `Your order {orderNumber} has shipped, Based Research` |
| Body | Tracking number, carrier, click-to-track button |
| Paired SMS | Yes, see #10 |

### 4. Order delivered

| Field | Value |
|---|---|
| Sender | Inline in `/api/cron/tracking-status/route.ts` |
| Trigger | Tracking poll detects `milestone === "delivered"` and order status flips to `delivered` |
| Subject | `Your order {orderNumber} has been delivered, Based Research` |
| Body | Delivery confirmation, link to order, ask for review (future), reorder CTA (future) |

### 5. Abandoned cart sequence (3 emails)

| Field | Value |
|---|---|
| Function | `sendAbandonedCartEmail()` |
| Trigger | Cart abandoned, captured in `abandoned_carts` table |
| Cron | `/api/cron/abandoned-carts` (hourly) |
| Idempotency | Stage advances on the cart row itself (0 → 1 → 2 → 3) so each stage fires once per cart |

Cadence and content:

| Stage | Delay since last touch | Subject | Lever |
|---|---|---|---|
| 1 | ≥ 1 hour after capture | `You left something in your cart` | Soft reminder, no urgency |
| 2 | ≥ 24 hours after stage 1 | `Save ${achSavings} on your cart with ACH checkout` | 5% ACH discount as concrete savings hook |
| 3 | ≥ 48 hours after stage 2 | `Your X% recovery code, expires soon` (when minted) or `Last chance, your cart expires soon` | Scarcity + auto-applying recovery coupon |

Sequence stops at stage 3 or when the cart converts (stage 99).

### 6. Subscription pre-charge reminder

| Field | Value |
|---|---|
| Sender | Inline in `/api/cron/subscription-reminders/route.ts` |
| Trigger | Active subscriptions with `nextChargeDate` 3 to 4 days from now |
| Subject | `Your subscription order ships {chargeDate}` |
| Body | Heads-up the bank will be debited, what is in the order, link to pause / skip |

### 7. Subscription charge confirmation

| Field | Value |
|---|---|
| Function | `sendChargeConfirmation()` in `/api/cron/subscriptions/route.ts` |
| Trigger | Subscription charge succeeds |
| Subject | `Subscription order {orderNumber} confirmed, Based Research` |
| Body | Order number, total charged, ships within 24 hours via UPS cold storage |

### 8. Subscription dunning sequence (3 emails)

| Field | Value |
|---|---|
| Function | `sendDunningEmail()` in `/api/cron/subscriptions/route.ts` |
| Trigger | Subscription charge failure |

| Stage | Subject | Trigger condition |
|---|---|---|
| `failed` | `Action needed: Your subscription payment failed` | First charge failure |
| `retry` | `We'll retry your subscription payment soon` | Sent before each retry attempt |
| `paused` | `Your subscription has been paused` | After multiple failed retries the subscription is force-paused |

### 9. Refund confirmation (NEW, 2026-05-05)

| Field | Value |
|---|---|
| Function | `sendRefundConfirmationEmail()` in `src/lib/email.ts` |
| Trigger | Admin issues a refund (full or partial). The template ships without a processor, so wire this to the refund handler you add when you integrate your processor. |
| Subject | `Refund processed for order {orderNumber}` |
| Body | Refund amount, original total, refunded line items (if partial), expected statement-appearance window (varies by payment method and processor), link to the order detail page |
| Tone | Scientific, factual; no apology unless the refund was admin-discretion goodwill |

### 10. 60-day win-back nudge (NEW, 2026-05-05)

| Field | Value |
|---|---|
| Function | `sendWinBackEmail()` in `src/lib/email.ts` |
| Trigger | Daily cron finds customers whose last paid order shipped 55 to 75 days ago AND who have not received a win-back email in the past 90 days |
| Cron | `/api/cron/winback` (daily 13:00 UTC) |
| Subject | `Your peptides are nearing the reorder window, Based Research` |
| Body | References the actual SKU(s) ordered, the supplier-recommended reconstituted-vial use-window (typically 21 to 28 days at 2 to 8 °C), and an aggregate cost-per-mg comparison if a bigger size is available. One-click reorder of last cart |
| Idempotency | `users.last_winback_email_at` column updated on send to prevent re-firing |
| Stops | When the user places another order (gets reset by the next 60-day window), or after one send per 90-day TTL |

---

## Customer-facing SMS

### 11. Phone verification code

| Field | Value |
|---|---|
| Function | `sendVerificationCode()` in `src/lib/twilio.ts` |
| Provider | Twilio Verify (managed code lifecycle, expiration, retries) |
| Trigger | Phone-OTP attempt at signup, signin, or checkout |
| Body | Twilio's templated code message (we do not author the body) |

### 12. Order shipped SMS

| Field | Value |
|---|---|
| Function | `sendOrderShippedSMS()` in `src/lib/twilio.ts` (called via `sendShippedSMSForOrder()` in `src/lib/fulfillment.ts`) |
| Trigger | Same paths as the shipped email (#3); ShipStation webhook + admin manual update |
| Body | `Based Research, {firstName}: your order {orderNumber} shipped via UPS. Tracking: {number}. Track here: {url}` |
| Idempotency | `orders.shippingSmsSentAt` column |
| Gates | Only fires if the user has a registered + verified phone (guests get email only) |

---

## Admin-facing notifications

### 13. Sale alert SMS

| Field | Value |
|---|---|
| Function | `notifyAdminOfSale()` in `src/lib/admin-notify.ts` |
| Trigger | Every paid order, regardless of which processor confirmed it (plus manual orders) |
| Sent to | `ADMIN_NOTIFY_PHONE` env var |
| Body | Order #, total, profit + margin, line items (first 3 then ellipsis), gateway, customer email, link to admin order page |

### 14. End-of-day sales report SMS

| Field | Value |
|---|---|
| Cron | `/api/cron/eod-sales-report` (daily 04:00 UTC, ≈ 11pm CT prior day) |
| Sent to | `ADMIN_NOTIFY_PHONE` |
| Body shape (≤ 320 chars) | `📊 EOD · {date}\n${rev} rev / ${profit} profit ({margin}%)\n{n} orders · top: {sku} ({units}u, ${rev})\n{n} abandoned (${recovery_$} recovery $)\nbasedresearch.com/admin` |

### 15. Tracking exception alert email

| Field | Value |
|---|---|
| Sender | Inline in `/api/cron/tracking-status/route.ts` |
| Trigger | Tracking poll detects `milestone === "exception"` (lost / damaged / return-to-sender) |
| Sent to | Admin email (`ADMIN_NOTIFY_EMAIL` env var) |
| Body | Order number, tracking number, last carrier event text, customer info; flag for outreach |

---

## Partner-facing email (affiliate program)

### 16. Affiliate application approval (NEW, 2026-05-05)

| Field | Value |
|---|---|
| Function | `sendAffiliateApprovalEmail()` in `src/lib/email.ts` |
| Trigger | Admin flips `affiliates.status` from `inactive` to `active` via `PATCH /api/admin/affiliates` |
| Subject | `Your Based Research partner application has been approved` |
| Body | Approved. Affiliate code, dashboard link, attribution model summary (lifetime, no cookie window), payout cadence, content guardrails (RUO framing required in any promotional copy) |
| Tone | Scientific, factual, business-formal |

### 17. Affiliate application decline (NEW, 2026-05-05)

| Field | Value |
|---|---|
| Function | `sendAffiliateRejectionEmail()` in `src/lib/email.ts` |
| Trigger | Admin flips `affiliates.status` to `suspended` via `PATCH /api/admin/affiliates` (only for previously-`inactive` rows that have not yet sent any clicks; treats it as "not approved" rather than "suspended for cause") |
| Subject | `Update on your Based Research partner application` |
| Body | Polite decline; reason category (audience fit, content overlap, application capacity); invitation to reapply if circumstances change |
| Tone | Respectful, non-personal, leaves the door open |

---

## Gaps and follow-ups

The following are not yet implemented but would be worth building when
business activity supports them. Listed in priority order for 2026:

1. **Welcome email** on user signup. Currently the user gets nothing
   between account creation and their first order.
2. **First-purchase email** — separate warmer touch beyond the
   standard order confirmation, sent only on a customer's first paid
   order.
3. **Subscription-pause reactivation email** at 7 / 14 / 30 days after
   force-pause, asking the customer to update payment.
4. **Review-request email** N days post-delivery to drive social proof.
5. **Chargeback alert SMS** to admin when your payment processor
   notifies you of a dispute.
6. **Order-refund email to customer**: covered by #9 above as of
   2026-05-05.
7. **60-day win-back email**: covered by #10 above as of 2026-05-05.
8. **Affiliate payout-sent email** when admin completes a payout.

## Voice + content guardrails

All customer-facing copy follows the same voice:

- **Scientific, calm, factual.** No hype words, no marketing exclamations.
  Reference compounds by name + lot when possible. Cite measurement
  units (mg, mL, °C) accurately.
- **No em dashes.** Use commas, periods, semicolons, or "to" instead.
  Real users do not type em dashes on phone keyboards; their absence
  is a deliverability and authenticity signal.
- **No curly quotes.** Phone keyboards default to straight (`'` and `"`).
- **Research-Use-Only framing** in any product reference. Never make
  human-dosing or medical claims in writing.
- **Statement-descriptor disclaimer** on every order confirmation
  ("may show as INV on your statement"), required for chargeback
  defense.
- **Reply-to** is `support@basedresearch.com` for every customer
  email. Admin-only emails reply to the same address by default; the
  admin checks it.

## How to add a new transactional email

1. Add the helper to `src/lib/email.ts` (or `src/lib/twilio.ts` for SMS).
2. Wire the trigger callsite (route handler, cron, webhook, etc.) and
   make sure it is idempotent: check a `*_sent_at` column before
   sending and update it on success.
3. If the trigger is a cron, register it in `vercel.json` and add an
   entry to the table in this file.
4. Add a row to the appropriate section above (Customer-facing email,
   SMS, Admin, or Partner) with: function name, trigger, subject,
   body summary, idempotency key.
5. Confirm voice + guardrails (no em dashes, scientific tone, RUO
   framing).
