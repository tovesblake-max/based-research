/**
 * First-party GTM <noscript> iframe proxy — `/_t/ns.html?id=GTM-XXXXXXX`
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^GTM-[A-Z0-9]{6,12}$/i.test(id)) {
    return new NextResponse("Invalid GTM ID", { status: 400 });
  }

  try {
    const upstream = await fetch(`https://www.googletagmanager.com/ns.html?id=${id}`, {
      headers: { "User-Agent": request.headers.get("user-agent") || "" },
    });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch {
    return new NextResponse("", { status: 200, headers: { "Content-Type": "text/html" } });
  }
}
