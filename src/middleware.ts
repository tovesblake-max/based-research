import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { GATE_COOKIE, readGateCookie, nextGateStage } from "@/lib/gate";

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
  "/product/syringe-kit",
  "/product/alcohol-swabs",
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

const SENSITIVE_PATHS = ["/checkout", "/account", "/auth", "/api/auth", "/api/checkout", "/gate", "/api/gate"];

function isBlockedUserAgent(ua: string): boolean {
  if (!ua) return true;
  return BLOCKED_UA_PATTERNS.some((p) => p.test(ua));
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * Site-wide HARD GATE.
 *
 * Compliance posture: NOTHING on the storefront renders until a visitor has
 * cleared all three sequential gates and holds a phone-verified session:
 *   Stage A  /gate/research-use  — research-use-only attestation
 *   Stage B  /gate/contact       — name + email + phone
 *   Stage C  /gate/verify        — phone + SMS 2FA + researcher type
 *
 * `isPublicBypass` is the ONLY set of paths that render without a verified
 * session — the gate funnel itself, the auth pages (so returning accounts
 * can sign in), legal pages, static assets, and crawler/system files. The
 * catalog, marketing, account, and checkout surfaces are all walled off.
 *
 * Unverified visitors are redirected to whichever gate stage they still owe
 * (see nextGateStage); `?redirect=` preserves where they were headed so they
 * land there once the session is minted.
 */
function isPublicBypass(pathname: string): boolean {
  // Static / framework assets
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon-180.png" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/opengraph-image") ||
    pathname.startsWith("/images/")
  ) return true;

  // The 3-stage gate funnel itself (each stage page self-enforces sequence).
  if (pathname === "/gate" || pathname.startsWith("/gate/")) return true;

  // Auth pages — returning accounts sign in here (sign-in / phone /
  // forgot / reset). New visitors are pushed through /gate/* instead.
  if (pathname.startsWith("/auth/")) return true;

  // Legal pages must always be reachable (terms / privacy / RUO / etc.).
  if (pathname.startsWith("/legal/")) return true;

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
  // paths blocked too. Runs before auth so we don't burn JWT cycles on junk.
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

  // API routes handle their own auth (requireAuth / requireAdmin) and MUST
  // return JSON, never an HTML redirect. The gate + auth APIs live under
  // /api and are reachable here; everything else self-gates server-side.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ── Parse session ──
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
  // Legacy tokens minted before the phoneVerified claim existed decode
  // without it; treat absent as verified (they reached a session through
  // phone verification). Only an explicit `false` is gated.
  const isPhoneVerified = payload ? payload.phoneVerified !== false : false;
  const hasVerifiedSession = !!payload && isPhoneVerified;

  // ── Admin gate ── (defense-in-depth; the admin layout re-checks server-side)
  if (isAdminPath(pathname)) {
    if (!payload || payload.role !== "admin") {
      const url = new URL("/auth/sign-in", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Public bypass paths ──
  if (isPublicBypass(pathname)) {
    // A fully-verified visitor has no reason to sit on the gate funnel or
    // the auth pages — send them into the store.
    if (
      hasVerifiedSession &&
      (pathname === "/gate" ||
        pathname.startsWith("/gate/") ||
        authPaths.some((p) => pathname.startsWith(p)))
    ) {
      return NextResponse.redirect(new URL("/shop", request.url));
    }
    return NextResponse.next();
  }

  // ── Hard gate ──
  // Everything else requires a phone-verified session. Returning,
  // fully-verified users pass straight through.
  if (hasVerifiedSession) {
    return NextResponse.next();
  }

  // Not (yet) verified → push into the funnel at the stage they still owe.
  const gateState = await readGateCookie(request.cookies.get(GATE_COOKIE)?.value);
  const stage = nextGateStage(gateState);
  const url = new URL(stage, request.url);
  url.searchParams.set("redirect", pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
