# Compliance Gating Schematic

This storefront ships with a **three-stage hard gate**: nothing on the site renders until a visitor has cleared all three gates, in order, and holds a phone-verified session. It is the strictest screening posture for a regulated, research-use-only catalog.

This is a deliberate maximum-compliance choice. It trades away public browsability and SEO for an airtight "no one sees product information until they have identified themselves and attested to research use" wall.

---

## The three gates (flow order, lightest → heaviest)

| Stage | Page | What it collects | Cookie advanced |
|---|---|---|---|
| **A** | `/gate/research-use` | 21+ confirmation + Research-Use-Only attestation | `ruoAt` |
| **B** | `/gate/contact` | Name, email, phone | `contactAt` |
| **C** | `/gate/verify` | Phone + SMS one-time code (2FA) + researcher type | mints `br-session` |

A visitor must complete them in sequence. Each stage page re-checks the prior stage server-side and bounces a visitor who jumps ahead back to the step they still owe. Stage C mints a phone-verified session, which from then on supersedes the gate entirely (returning users are never re-gated while their session is valid).

## How it is enforced

- **`src/middleware.ts`** — the hard gate. Every request that is not an explicit bypass (the gate funnel itself, `/auth/*`, `/legal/*`, static assets, crawler/system files, and `/api/*` which self-gates) requires a phone-verified session. Unverified visitors are 307-redirected to whichever gate stage they still owe (`nextGateStage`), with `?redirect=` preserving their intended destination. The admin area keeps its own role gate.
- **`src/lib/gate.ts`** — the edge-safe gate library. The `br-gate` cookie is a signed JWT (`{ sid, ruoAt, contactAt }`, HS256, same secret as the session) so middleware reads it at the edge with no DB round-trip and it cannot be forged. Also defines `RESEARCHER_TYPES`.
- **`gate_leads` table** (`src/lib/db/schema.ts`) — a durable audit + carry-forward record: who attested to RUO and when (IP + user-agent + country at attestation), the contact details captured at Stage B, and a link to the resulting `userId` once Stage C completes.
- **API routes** — `POST /api/gate/attest` (Stage A) and `POST /api/gate/contact` (Stage B) write `gate_leads` and advance the cookie. Stage C reuses the phone OTP routes (`/api/auth/phone/send-code` + `verify-code`); `verify-code` links the gate lead and stamps the new account with the captured name/email, researcher type, and RUO timestamp.

## Server-rendered, not a client modal

The gate pages render **server-side** (no `useSearchParams` in the forms — the redirect target is passed down as a prop), so the wall and its compliance language are present in the raw HTML even with JavaScript disabled. The compliance signals are never hidden behind a client-only modal.

## The MCC 5169 / RUO compliance signals

Keep these present as plain, server-rendered text on the gate and on product pages. A pre-vet scanner looks for them as crawlable text:

1. **Age gate / 21+** — confirmed at Stage A.
2. **Not for human or animal consumption.**
3. **Certificate of Analysis** — batch-linked, with a reachable sample CoA URL.
4. **Analytical-grade biochemical reference standards** — positions the catalog as a reference-standard supplier, not a consumer wellness shop.
5. **Academic / biotech / contract-research / laboratory buyers** — researcher type captured at Stage C.
6. **Research Use Only (RUO)** — "For Research Use Only," "not a drug/food/supplement/device," "not evaluated by the FDA," recorded with a timestamp on attestation.

## Tradeoff to know before wiring payments

A full hard gate means an automated crawler or a human reviewer cannot see the catalog without completing the gate. This template ships with **no payment processor**, so there is nothing to satisfy today. When you integrate a processor that pre-vets your site (many high-risk / MCC 5169 acquirers do), you have two options:

- Provide the reviewer a set of credentials (or a pre-cleared session) so they can pass the gate, **or**
- Temporarily relax the gate for review by adding the public browse paths back into `isPublicBypass` in `src/middleware.ts` (catalog, product, about, FAQ) for the duration of the review, then re-tighten.

Decide this per processor. Do not weaken the gate by default.

## Adjusting the gate

- **Change what each stage collects:** edit the stage form (`src/app/gate/<stage>/*`) and, for server-validated fields, the matching API route.
- **Reorder or add/remove a stage:** update `nextGateStage` in `src/lib/gate.ts` and the per-page sequence guards.
- **Relax to "public browse, gated purchase":** move the catalog/marketing paths into `isPublicBypass` and gate only `/checkout` + `/account`. This is the posture a card processor typically prefers for site review: browse freely (screened by the `AgeGate` modal + RUO labeling), make an account to buy.

## Replicating for a new brand

1. Keep the gate funnel as-is. Swap the brand name + legal entity in the gate copy and footer.
2. Keep the footer RUO disclaimer server-rendered (no `"use client"`).
3. Ensure the RUO + not-for-consumption + CoA signals appear in SSR HTML on the gate and product pages.
4. Upload at least one sample CoA (Admin → Lab COAs) so the public file URL (`/api/coas/<id>/file`) can serve as the pre-vet sample link.
5. Set `JWT_SECRET` (signs both the session and the gate cookie) and the Twilio Verify + Turnstile env vars so Stage C works.

## The one-sentence rule

No product information renders until the visitor has attested to research use, identified themselves, and verified a phone number — in that order, enforced server-side.
