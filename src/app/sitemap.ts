import type { MetadataRoute } from "next";
import { catalogProducts } from "@/lib/products";

const BASE_URL = "https://basedresearch.com";

/**
 * Product slugs excluded from the sitemap. These are available to real customers
 * inside the store but should not be indexed or crawled by search engines.
 * (Aligned with the restricted-compound masking strategy.)
 */
const EXCLUDED_SLUGS = new Set<string>([
  "glp3-rta",      // restricted compound
  "semaglutide",   // restricted compound
  "tirzepatide",   // restricted compound
  "cagrilintide",  // restricted compound
]);

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    // The catalog (full grid + filters) lives at /catalog. /shop is now
    // an SMS-discount landing page (noindex) so it stays out of the
    // sitemap; if Google has /shop already indexed it'll discover the
    // noindex meta and drop it.
    { url: `${BASE_URL}/catalog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    // /membership intentionally omitted — that route is now a 308
    // permanent redirect to /auth/sign-up. We don't want Google
    // indexing the redirect; we want it indexing the destination.
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/coa`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/research/ghk-cu`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/research/bpc-157`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/research/tesamorelin`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/legal/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/legal/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/legal/shipping`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/legal/refund`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/legal/research-use-only`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const productPages: MetadataRoute.Sitemap = catalogProducts
    .filter((p) => !EXCLUDED_SLUGS.has(p.slug))
    .map((product) => ({
      url: `${BASE_URL}/product/${product.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  return [...staticPages, ...productPages];
}
