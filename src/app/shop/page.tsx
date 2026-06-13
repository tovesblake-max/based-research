import { redirect } from "next/navigation";

// /shop was the SMS-first landing page from 2026-04 through 2026-05-04.
// Funnel data showed it converted at ~3% on text engagement vs near-100%
// for traffic that bypassed the page and went straight to product/cart.
// Texters and buyers turned out to be different psychographics — the
// text-first CTA was filtering decisive buyers out of the funnel.
//
// Redirecting /shop -> /catalog server-side so existing ad creative +
// bookmarks don't need to change. The old marketing component + the
// prefilled-SMS logic is in git history if we ever want to revive a
// text-first variant for a different audience (e.g. cold-warm retargeting).
export default function ShopRedirectPage() {
  redirect("/catalog");
}
