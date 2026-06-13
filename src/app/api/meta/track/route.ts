/**
 * Generic Meta CAPI trigger endpoint for mid-funnel events.
 *
 * Client components fire the browser pixel AND POST here with the same
 * `eventId`. Meta dedupes within a 48h window so whichever hit arrives
 * first wins attribution — that's how we stay accurate despite
 * ad-blockers killing the browser pixel for ~25% of users.
 *
 * Events allowed: ViewContent, AddToCart, InitiateCheckout. Purchase is
 * best fired server-side from your payment processor's webhook so it has
 * full order context and never depends on the client.
 *
 * Security:
 *   - Per-IP rate limit — stops random abuse
 *   - Event-name allowlist — no arbitrary event injection
 *   - No PII from request body — we pull user context from the session
 *   - Size-capped contents/content_ids arrays
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendCAPIEvent } from "@/lib/meta-capi";

const bodySchema = z.object({
  eventName: z.enum(["ViewContent", "AddToCart", "InitiateCheckout"]),
  eventId: z.string().min(4).max(100),
  eventSourceUrl: z.string().url().optional(),
  customData: z
    .object({
      currency: z.literal("USD").optional(),
      value: z.number().nonnegative().max(1_000_000).optional(),
      contentIds: z.array(z.string().max(100)).max(50).optional(),
      contentType: z.enum(["product", "product_group"]).optional(),
      contents: z
        .array(
          z.object({
            id: z.string().max(100),
            quantity: z.number().int().min(1).max(1000),
            item_price: z.number().nonnegative().max(1_000_000).optional(),
          }),
        )
        .max(50)
        .optional(),
      numItems: z.number().int().min(0).max(1000).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!(await rateLimit(`meta-track:${ip}`, 120, 60 * 1000))) {
    // 120/min per IP is generous for real UX (a user browsing 30 products
    // in a minute wouldn't hit it) but clamps automated abuse.
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const body = parsed.data;

  // Pull authenticated user context for higher match quality. Anonymous
  // visitors still get IP + UA, which is enough for Meta to tie to their
  // cookie graph on a best-effort basis.
  const user = await getCurrentUser();

  sendCAPIEvent({
    eventName: body.eventName,
    eventId: body.eventId,
    eventSourceUrl: body.eventSourceUrl,
    userData: {
      email: user?.email ?? null,
      phone: user?.phone ?? null,
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
      externalId: user?.id ?? null,
      clientIp: ip,
      clientUserAgent: request.headers.get("user-agent"),
    },
    customData: body.customData,
  }).catch((err) =>
    console.warn("[meta-track] sendCAPIEvent failed", {
      eventName: body.eventName,
      eventId: body.eventId,
      err: String(err),
    }),
  );

  // Fire-and-forget from the client's perspective. We don't block on the
  // CAPI response; 202 communicates "accepted, not yet confirmed".
  return NextResponse.json({ ok: true }, { status: 202 });
}
