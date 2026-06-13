import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/tracking";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const allowedEvents = [
  "PageView",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "CompleteRegistration",
  "Contact",
  "Lead",
];

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!(await rateLimit(`track:${ip}`, 60, 60 * 1000))) {
    return NextResponse.json({ ok: true }); // silently drop, don't error
  }

  try {
    const body = await request.json();
    const { event, eventId, url, email, productId, productName, value, quantity, category } = body;

    if (!event || !allowedEvents.includes(event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") || undefined;

    // Fire and forget — don't make the client wait
    trackEvent({
      event,
      eventId,
      url: url || request.headers.get("referer") || "",
      ip,
      userAgent,
      email,
      productId,
      productName,
      value,
      currency: "USD",
      quantity,
      category,
    }).catch((err) => console.error("[track]", err));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // never error to client
  }
}
