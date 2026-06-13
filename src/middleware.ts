import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { IS_OPEN_MODE } from "@/lib/site-mode";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  return new TextEncoder().encode(secret || "based-research-dev-secret-local-only");
}

// Auth pages — logged-in users get bounced away from these.
const authPaths = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/phone",
  "/auth/forgot-password",
  "/auth/reset-password",
];

/**
 * URLs that have been permanently removed. Returning 410 Gone (instead of the
 * default 404) tells Google to drop the URL from its index faster.
 */
const goneUrls = new Set<string>([
  "/product/retatrutide",
  "/product/semaglutide",
  "/product/tirzepatide",
  "/product/hgh-fragment-176-191",
  "/product/igf1-lr3",
  "/product/recovery-tri-blend",
  // 2026-05-21: research-only compliance posture — consumption-infrastructure
  // SKUs removed entirely. BAC water stays addressable for historical orders
  // (handled below as a public exception, not 410).
  "/product/syringe-kit",
  "/product/alcohol-swabs",
  // 2026-05-21 compliance hardening: human-consumption-format products
  // (nasal sprays, oral tablets) removed — they contradict research-use-only.
  "/product/p21-peptide-spray",
  "/product/adamax-spray",
  "/product/bpc-157-tablets",
]);

const BLOCKED_UA_PATTERNS = [
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /seznambot/i,
  /yandexbot/i,
  /baiduspider/i,
  /blexbot/i,
  /dataforseobot/i,
  /barkrowler/i,
  /serpstatbot/i,
  /masscan/i,
  /zgrab/i,
  /python-requests/i,
  /curl\/[0-7]/i,
];

const SENSITIVE_PATHS = ["/checkout", "/account", "/auth", "/api/auth", "/api/checkout"];

function isBlockedUserAgent(ua: string): boolean {
  if (!ua) return true;
  return BLOCKED_UA_PATTERNS.some((p) => p.test(ua));
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * Site-wide gate (2026-05-21).
 *
 * Required compliance posture: NO customer-facing page renders product
 * information until the visitor has signed in AND verified a phone number.
 * The only public surfaces are the auth flow itself and the bits we need
 * for crawlers / legal / billing / webhooks to function.
 *
 * `isPublicPath` decides what bypasses the gate. Everything else gets
 * redirected:
 *   - no session         → /auth/sign-up  (start the flow)
 *   - session but no
 *     phoneVerified flag → /auth/phone     (finish the flow)
 *
 * Allowed without auth: auth pages, auth API, legal pages, third-party
 * webhooks (ShipStation / cron / your future payment processor),
 * static assets, robots/sitemap/og-image, and the admin gate (which
 * enforces its own auth + role check downstream).
 *
 * Note on /api/track + /api/meta/track + /api/geo: these fire from the
 * auth pages themselves (Pixel, GA, geo headers) and must not be gated
 * or the unauthenticated landing surfaces lose telemetry.
 */
function isPublicPath(pathname: string): boolean {
  // Static / framework assets
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/opengraph-image") ||
    pathname.startsWith("/images/")
  ) return true;

  // Auth pages (sign-in, sign-up, phone, forgot/reset)
  if (pathname.startsWith("/auth/")) return true;

  // Auth API
  if (pathname.startsWith("/api/auth/")) return true;

  // Telemetry that fires on unauthenticated pages (sign-up tracking, etc.)
  if (
    pathname === "/api/track" ||
    pathname === "/api/meta/track" ||
    pathname.startsWith("/api/meta/") ||
    pathname === "/api/geo" ||
    pathname.startsWith("/api/cart-events/") ||
    pathname === "/api/cart-events"
  ) return true;

  // Third-party / system webhooks (ShipStation, cron, admin-triggered
  // jobs, and any payment-processor webhook you add under /api/webhooks/).
  if (
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/shipstation/") ||
    pathname.startsWith("/api/cron/")
  ) return true;

  // Public catalog feed for Google Merchant / Meta Commerce importers
  if (pathname === "/api/gmc/feed.xml" || pathname.startsWith("/api/gmc/")) return true;

  // Legal pages (terms, privacy) must always be reachable per card-network
  // compliance + browser AutoFill TOS-link patterns.
  if (pathname.startsWith("/legal/")) return true;

  // ── Public storefront — browse + marketing surfaces (2026-05-21 rev2) ──
  //
  // These MUST be publicly reachable. Payment processors and MCC 5169
  // pre-vet reviewers require a fully functional, publicly ACCESSIBLE
  // website to verify what's being sold before they approve an account.
  // A catalog hidden behind a login wall reads as "cannot verify business"
  // and stalls/declines the application.
  //
  // Compliance is preserved WITHOUT hiding the catalog:
  //   - Age-gate modal (21+ / qualified researcher) layers on top of these
  //     pages client-side (see AgeGate.tsx).
  //   - RUO + not-for-consumption labeling is rendered on these pages.
  //   - RUO attestation checkbox is enforced at signup + checkout.
  //   - Purchase + account surfaces stay gated below (you browse freely,
  //     but you must create an account + verify a phone to BUY).
  //
  // This is the canonical "public browse, gated checkout" posture that
  // compliant peptide / RUO merchants use to pass card-processor review.
  // See docs/compliance-gating.md for the full schematic.
  if (
    pathname === "/" ||
    pathname === "/catalog" ||
    pathname === "/shop" ||
    pathname.startsWith("/product/") ||
    pathname === "/coa" ||
    pathname.startsWith("/coa/") ||   // static Certificate-of-Analysis PDFs in /public/coa/ — must be publicly downloadable for pre-vet review
    pathname === "/about" ||
    pathname === "/faq" ||
    pathname === "/contact" ||
    pathname === "/institutional-use" ||   // buyer-eligibility page — must be public so prospective institutional buyers can read it before signing up
    pathname === "/membership" ||
    pathname === "/cart" ||
    pathname.startsWith("/research/") ||
    pathname.startsWith("/wholesale")
  ) return true;

  // Admin surfaces handle their own auth + role gating. /admin-access is the
  // public quick-access entry point that lets an existing admin re-establish
  // a session without going through the customer-facing auth pages.
  if (pathname === "/admin-access" || isAdminPath(pathname)) return true;

  // /checkout/callback is the order-status / confirmation page and the
  // natural redirect target after a payment processor's hosted flow — must
  // be reachable even if the session cookie was lost during a third-party
  // redirect round-trip.
  if (pathname === "/checkout/callback" || pathname.startsWith("/checkout/callback/")) return true;

  // Everything else is gated.
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 410 Gone for permanently-removed product URLs — de-indexes faster than 404.
  if (goneUrls.has(pathname)) {
    return new NextResponse("Gone", {
      status: 410,
      headers: { "x-robots-tag": "noindex", "cache-control": "no-store" },
    });
  }

  // Bot gate — known scrapers blocked outright; no-UA requests to sensitive
  // paths blocked too. Runs before the auth check so we don't burn JWT
  // verification cycles on garbage traffic.
  const ua = request.headers.get("user-agent") || "";
  if (isBlockedUserAgent(ua)) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: { "cache-control": "no-store" },
    });
  }
  if (SENSITIVE_PATHS.some((p) => pathname.startsWith(p)) && !ua) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: { "cache-control": "no-store" },
    });
  }

  const token = request.cookies.get("br-session")?.value;

  let payload: { userId: string; role: string; phoneVerified?: boolean } | null = null;

  if (token) {
    try {
      const result = await jwtVerify(token, getJwtSecret());
      payload = result.payload as { userId: string; role: string; phoneVerified?: boolean };
    } catch {
      // Invalid token — treat as logged-out.
    }
  }

  // Verified = token explicitly says so OR is a LEGACY token minted before
  // the phoneVerified claim existed (field undefined). Every account in the
  // DB reached its token through phone verification (both signup paths set
  // phoneVerified=true; there was no path to a session without it), so an
  // absent claim is provably a verified user. Only an EXPLICIT `false`
  // (a fresh token for a genuinely unverified account) gets gated. Without
  // this, the deploy that introduced the claim bounces every pre-existing
  // logged-in session to /auth/phone — which looked like the site breaking.
  const isPhoneVerified = payload ? payload.phoneVerified !== false : false;

  // API routes handle their own auth (requireAuth / requireAdmin) and MUST
  // return JSON, never an HTML redirect. Redirecting an /api/ request to
  // /auth/sign-up is what produced the "Unexpected token '<', <!DOCTYPE"
  // JSON-parse errors across the admin dashboard (every /api/admin/* fetch
  // was being bounced to the HTML sign-up page). Skip the page-level gate
  // for all /api/ — the specific public-API exceptions in isPublicPath are
  // now redundant but harmless. (The bot gate above still applies.)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ── Admin gate ──
  // /admin and /admin/* require a valid admin-role session. The server-side
  // admin layout (src/app/admin/layout.tsx) enforces this too — this edge
  // check is defense-in-depth and means a non-admin never even loads the
  // dashboard bundle. role is a signed JWT claim, so it can't be forged.
  if (isAdminPath(pathname)) {
    if (!payload || payload.role !== "admin") {
      const url = new URL("/auth/sign-in", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Auth-page handling ──
  // Logged-in + verified users on auth pages get bounced to /shop.
  // Logged-in but explicitly-unverified users are kept on /auth/phone.
  if (authPaths.some((p) => pathname.startsWith(p)) && payload) {
    if (isPhoneVerified) {
      return NextResponse.redirect(new URL("/shop", request.url));
    }
    if (!pathname.startsWith("/auth/phone")) {
      return NextResponse.redirect(new URL("/auth/phone", request.url));
    }
  }

  // Skip the site-wide gate for public paths.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ── Open-mode guest checkout ──
  // In "open" site mode, checkout does not require an account — a guest
  // can go cart → checkout → pay. (Institutional mode keeps checkout
  // behind sign-in below.) /cart is already public in both modes.
  // The 21+ age gate and research-use certification still apply at
  // checkout in open mode — those are compliance, not friction.
  if (IS_OPEN_MODE && (pathname === "/checkout" || pathname.startsWith("/checkout/"))) {
    return NextResponse.next();
  }

  // ── Site-wide gate ──
  // No session → start the sign-up flow. (The apex "/" and all browse
  // surfaces are now public via isPublicPath, so this only fires for
  // purchase/account surfaces: /checkout, /account, /affiliate, /track.)
  if (!payload) {
    const url = new URL("/auth/sign-up", request.url);
    url.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Session present but EXPLICITLY unverified → finish the flow. Legacy
  // tokens (claim absent) are treated as verified per isPhoneVerified above,
  // so existing logged-in users are never bounced by this deploy.
  if (!isPhoneVerified) {
    const url = new URL("/auth/phone", request.url);
    url.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // All checks passed — render the page.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
