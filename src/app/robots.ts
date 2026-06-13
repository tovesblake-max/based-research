import type { MetadataRoute } from "next";

/**
 * robots.txt
 *
 * Disallows:
 *   - authenticated / admin / checkout surfaces
 *   - restricted-compound product URLs (including the old retatrutide URL)
 *
 * Restricted products remain available to real customers inside the store
 * after the age gate + account requirement, but they should not be discoverable
 * via Google/Meta crawls.
 */
const RESTRICTED_COMPOUND_URLS = [
  "/product/retatrutide",   // old URL (now 410)
  "/product/glp3-rta",      // masked URL
  "/product/semaglutide",
  "/product/tirzepatide",
  "/product/cagrilintide",
  // Bacteriostatic water — hidden from public catalog 2026-05-21
  // as part of the research-only compliance posture. Slug stays
  // resolvable for historical order links but excluded from crawling.
  "/product/bacteriostatic-water",
  // Syringes + alcohol prep pads were removed entirely from the catalog
  // on 2026-05-21. Kept in this disallow list to give crawlers an
  // explicit signal alongside the 404s the deleted pages now return.
  "/product/syringe-kit",
  "/product/alcohol-swabs",
];

export default function robots(): MetadataRoute.Robots {
  const baseDisallow = [
    "/auth/",
    "/account/",
    "/admin",
    "/admin/",
    "/admin-access",
    "/api/",
    "/checkout",
    "/checkout/",
    "/cart",
    ...RESTRICTED_COMPOUND_URLS,
  ];

  // Endpoints under /api/ that we WANT crawlers to fetch even though
  // /api/ is otherwise disallowed. The Google Shopping / Meta Commerce
  // product feed lives here, and well-behaved catalog crawlers refuse
  // to import from a robots-disallowed URL — which is what was tanking
  // Meta's catalog match rate (the catalog couldn't be re-pulled).
  const apiAllowlist = ["/api/gmc/feed.xml"];

  return {
    rules: [
      {
        userAgent: "*",
        // The order matters — the more specific allow for the feed has
        // to come AFTER the broad allow but the allowlist is rendered
        // separately so most crawlers that honor longest-match
        // semantics (Googlebot, Bingbot, facebookexternalhit) will
        // honor it.
        allow: ["/", ...apiAllowlist],
        disallow: baseDisallow,
      },
      // Meta Commerce / Facebook crawlers — explicit allow so the
      // catalog feed importer can fetch /api/gmc/feed.xml on schedule.
      // Meta uses several user-agents depending on the surface
      // (facebookexternalhit, FacebookBot, Meta-ExternalAgent).
      {
        userAgent: "facebookexternalhit",
        allow: ["/", ...apiAllowlist],
        disallow: RESTRICTED_COMPOUND_URLS,
      },
      {
        userAgent: "Meta-ExternalAgent",
        allow: ["/", ...apiAllowlist],
        disallow: RESTRICTED_COMPOUND_URLS,
      },
      {
        userAgent: "FacebookBot",
        allow: ["/", ...apiAllowlist],
        disallow: RESTRICTED_COMPOUND_URLS,
      },
      // Google Shopping / Merchant Center reads the feed too (same
      // file works for both). Googlebot itself follows the * rule, but
      // the GMC importer specifically uses Googlebot-Image + a feed-
      // specific UA — explicit allow is the safe move.
      {
        userAgent: "Googlebot",
        allow: ["/", ...apiAllowlist],
        disallow: baseDisallow.filter((p) => p !== "/api/"),
      },
      // AI-search crawlers get the same treatment — we want them to index the
      // safe catalog but not surface restricted compounds.
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: RESTRICTED_COMPOUND_URLS,
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: RESTRICTED_COMPOUND_URLS,
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: RESTRICTED_COMPOUND_URLS,
      },
    ],
    sitemap: "https://basedresearch.com/sitemap.xml",
  };
}
