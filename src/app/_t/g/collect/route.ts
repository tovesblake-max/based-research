/**
 * First-party GA4 Measurement Protocol proxy — `/_t/g/collect`
 *
 * Receives hits that GTM would normally send to www.google-analytics.com/g/collect
 * and forwards them with the original client IP + user agent. Returns the same
 * response so GTM is none the wiser.
 *
 * Bypasses ad blockers and enables first-party cookies.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const UPSTREAM = "https://www.google-analytics.com/g/collect";

async function proxy(request: NextRequest): Promise<NextResponse> {
  const search = request.nextUrl.searchParams.toString();
  const url = search ? `${UPSTREAM}?${search}` : UPSTREAM;

  // Preserve the client IP for proper geo / user_agent enrichment
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "";
  const ua = request.headers.get("user-agent") || "";

  try {
    const body = request.method === "GET" ? undefined : await request.arrayBuffer();

    const upstream = await fetch(url, {
      method: request.method,
      headers: {
        "User-Agent": ua,
        "Content-Type": request.headers.get("content-type") || "text/plain",
        "X-Forwarded-For": ip,
      },
      body,
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "text/plain",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    // Fail open — never block the page on analytics errors
    return new NextResponse(null, { status: 204 });
  }
}

export const GET = proxy;
export const POST = proxy;
