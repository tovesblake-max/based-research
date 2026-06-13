# PostHog Event Catalog

Every custom event this codebase emits to PostHog, where it fires, and what properties it carries. Keep this file updated when you add or rename events — it's the reference when wiring funnels + cohorts in the PostHog UI.

## Identity

Users are identified by their `users.id` UUID (the `distinctId`). Server-side and client-side events share the same distinctId so client autocapture + server business events appear on the same person profile.

The client-side `IdentifyOnLogin` hook in `src/components/PostHogProvider.tsx` runs `posthog.identify()` whenever the auth state changes. Profile properties: `email`, `firstName`, `role`.

## Autocaptured (client-side, no code required)

- `$pageview` — every client-side navigation
- `$pageleave` — captured on page unload with time-on-page
- `$autocapture` — clicks, form submits, input changes, on all non-admin routes

Admin routes (`/admin/*`) are opted out of autocapture and session recording.

## Business events (manual)

### Commerce

This template ships without a payment processor. `order_completed` and `checkout_declined` are emitted from your payment webhook, so they only start firing once you wire a processor in `src/app/api/checkout/route.ts` and confirm payment via a webhook under `/api/webhooks/`. `checkout_fraud_blocked` fires today from the checkout route before any charge is attempted.

| Event | Fires from | Key properties |
|---|---|---|
| `order_completed` | your payment webhook under `api/webhooks/` once the provider confirms payment | `orderNumber`, `totalCents`, `subtotalCents`, `shippingCents`, `discountCents`, `paymentGateway` (provider name), `itemCount`, `itemSlugs[]`, `bumpAccepted`, `savedMethodUsed`, `fraudScore` |
| `checkout_declined` | your payment webhook when the provider rejects the charge | `paymentGateway`, `totalCents`, `stateReason`, `errorType`, `transactionState` |
| `checkout_fraud_blocked` | `api/checkout/route.ts` when `score ≥ 85` | `score`, `signals[]`, `totalCents`, `paymentGateway` |

### Subscriptions

| Event | Fires from | Key properties |
|---|---|---|
| `subscription_started` | `api/subscriptions/route.ts` POST | `subscriptionId`, `frequencyDays`, `itemCount`, `itemSlugs[]`, `initialValueCents` |
| `subscription_charged` | `api/cron/subscriptions/route.ts` success path | `subscriptionId`, `orderNumber`, `totalCents`, `discountCents`, `tier`, `chargeNumber`, `tierUpgrade` (bool), `frequencyDays` |
| `subscription_payment_failed` | `api/cron/subscriptions/route.ts` after MAX_RETRIES | `subscriptionId`, `reason`, `retryCount`, `successfulChargesBeforeFailure` |
| `subscription_paused` | `api/subscriptions/[id]/route.ts` pause action | `subscriptionId`, `pauseDays`, `reason` |
| `subscription_resumed` | `api/subscriptions/[id]/route.ts` resume action | `subscriptionId`, `previousStatus` |
| `subscription_cancelled` | `api/subscriptions/[id]/route.ts` cancel action | `subscriptionId`, `reason`, `previousStatus`, `successfulCharges`, `daysActive` |

### Bump offer (client-side, via `pushCustom` in `gtm-datalayer.ts` — also reaches PostHog via autocapture on the checkbox)

These fire through the GTM dataLayer and are captured by PostHog's autocapture on the bump-offer checkbox click. If you need them as first-class events rather than autocapture, emit explicitly via `posthog.capture()` in `CheckoutClient.tsx`.

## Pre-built funnels to create in PostHog

Point-and-click these in the PostHog UI once events are flowing:

1. **Checkout funnel** — `$pageview` of `/checkout` → `$autocapture` of "Continue to Payment" button → `$autocapture` of "Pay" button → `order_completed`
2. **Payment rail health** — `$pageview` of `/checkout` (with `paymentGateway` property breakdown) → `order_completed` vs `checkout_declined`
3. **Subscription activation** — `order_completed` with `isSubscriptionRenewal=false` → `subscription_charged` (first renewal) — measures first-to-second-charge survival
4. **Dunning recovery** — `subscription_payment_failed` → `subscription_resumed` (within 14 days) — measures how often failed payments convert back to active

## Retention views

- **Subscriber retention** — cohort = `subscription_started`, returning action = `subscription_charged`. Grid shows % of each month's cohort still paying N months later.
- **Buyer retention** — cohort = `order_completed` first-time, returning action = `order_completed` again. Measures repeat-purchase rate.

## Adding a new event

1. Add to `captureEvent({ event: "…", … })` in the appropriate server route (or `posthog.capture` client-side).
2. Update this file with the event name, firing site, and properties.
3. If the event matters for a funnel or cohort, create the view in PostHog so it shows up on the next dashboard review.
