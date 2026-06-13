import type { NextConfig } from "next";

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
// PostHog's asset host — different from the ingest host. Serves the
// recorder bundle + feature-flag config JS.
const POSTHOG_ASSETS_HOST = POSTHOG_HOST.replace("i.posthog.com", "us-assets.i.posthog.com");

const nextConfig: NextConfig = {
  // First-party reverse proxy for PostHog. Browser calls /ingest/* which
  // we rewrite server-side to PostHog's real hosts. Defeats ad blockers
  // that blocklist posthog.com and keeps all telemetry first-party for
  // privacy + reliability. Mirrors the pattern used at /_t/gtm.js for GTM.
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${POSTHOG_ASSETS_HOST}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${POSTHOG_HOST}/:path*`,
      },
      {
        source: "/ingest/decide",
        destination: `${POSTHOG_HOST}/decide`,
      },
    ];
  },
  // Disable trailing slash normalisation for the ingest prefix so PostHog
  // assets resolve correctly.
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // SAMEORIGIN (not DENY) so we can embed our own assets — like
          // COA PDFs in the product page preview iframe — while still
          // blocking attackers from clickjacking our pages from theirs.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // No payment processor is wired in this template. When you
              // integrate one, add its script/frame/connect hosts here so
              // its embedded form / hosted checkout isn't blocked by the CSP.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://analytics.tiktok.com https://www.redditstatic.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.vercel.app https://*.basedresearch.com https://api.ship24.com https://send.api.mailtrap.io https://graph.facebook.com https://business-api.tiktok.com https://ads-api.reddit.com https://challenges.cloudflare.com",
              "frame-src 'self' https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      // CORS: restrict API routes to same origin only (except webhooks)
      {
        source: "/api/:path((?!webhooks|shipstation).*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://basedresearch.com" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
