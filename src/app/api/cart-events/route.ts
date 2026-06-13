/**
 * Log a single add-to-cart event.
 *
 * Called fire-and-forget from CartProvider.addItem on every add click.
 * We only persist events tied to an authenticated session — anonymous
 * adds fall through as a no-op because we don't have a stable client
 * ID pipeline to stitch them back to a future account.
 *
 * Volume: one row per click, can get chatty on power users. Indexed
 * on (user_id, created_at) so the admin read path stays O(log n).
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cartEvents } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  slug: z.string().min(1).max(100),
  productName: z.string().min(1).max(200),
  variantSku: z.string().min(1).max(100),
  priceCents: z.number().int().min(0).max(10_000_000),
  quantity: z.number().int().min(1).max(100),
});

export async function POST(request: Request) {
  // Per-IP rate limit — 300 adds/min per IP is way above any real user
  // behaviour but clamps scripted flooding of the events table.
  const ip = getClientIp(request);
  if (!(await rateLimit(`cart-events:${ip}`, 300, 60 * 1000))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) {
    // Silently succeed for anonymous visitors — we don't persist them
    // but we also don't want to surface noise in the client.
    return NextResponse.json({ ok: true, logged: false });
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  try {
    await db.insert(cartEvents).values({
      userId: user.id,
      slug: parsed.data.slug,
      productName: parsed.data.productName,
      variantSku: parsed.data.variantSku,
      priceCents: parsed.data.priceCents,
      quantity: parsed.data.quantity,
    });
    return NextResponse.json({ ok: true, logged: true });
  } catch (err) {
    console.warn("[cart-events] insert failed", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
