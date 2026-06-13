/**
 * First-party GTM loader — `/_t/gtm.js?id=GTM-XXXXXXX`
 *
 * Proxies the Google Tag Manager container script through our own domain so
 * that ad blockers (which block googletagmanager.com) don't drop it. Runs at
 * the Vercel edge for low latency.
 *
 * GoogleTagManager.tsx is configured to use this endpoint automatically when
 * NEXT_PUBLIC_GTM_SERVER_URL is set (or a relative path is used).
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^GTM-[A-Z0-9]{6,12}$/i.test(id)) {
    return new NextResponse("Invalid GTM ID", { status: 400 });
  }

  try {
    const upstream = await fetch(`https://www.googletagmanager.com/gtm.js?id=${id}`, {
      headers: {
        "User-Agent": request.headers.get("user-agent") || "",
        "Accept": "*/*",
      },
      // Next.js edge caches via its own layer; Vercel's CDN honors the
      // Cache-Control response header we set below.
      next: { revalidate: 3600 },
    });

    if (!upstream.ok) {
      return new NextResponse("Upstream error", { status: upstream.status });
    }

    const body = await upstream.text();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "X-Proxy": "based-research-tag",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 502 });
  }
}
