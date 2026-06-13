/**
 * Capture an abandoned-cart snapshot when a signed-in customer reaches
 * begin_checkout. Upserts one row per user (latest cart wins).
 *
 * The cron at /api/cron/abandoned-carts scans these and sends recovery emails.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { abandonedCarts } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

// Hard validation on every field. Prior version trusted the client shape
// completely — a malicious or buggy client could stash 20 rows of
// 1-million-unit-price garbage keyed to someone else's email. With the
// upstream auth gate this was never remote-exploitable, but validating
// here keeps junk out of the recovery-email funnel.
const itemSchema = z.object({
  productId: z.string().min(1).max(100),
  productName: z.string().min(1).max(200),
  variantSku: z.string().min(1).max(100),
  variantSize: z.string().min(1).max(50),
  // Cents. Cap at $100,000 per unit to catch runaway values.
  price: z.number().int().min(0).max(10_000_000),
  quantity: z.number().int().min(1).max(100),
  slug: z.string().min(1).max(200),
});

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(20),
});

export async function POST(request: Request) {
  // Per-IP rate limit. The route is cheap but there's no reason the same
  // session should be posting snapshots more than a few times a minute.
  const ip = getClientIp(request);
  if (!(await rateLimit(`abandoned-cart:${ip}`, 30, 60 * 1000))) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }

  try {
    const user = await getCurrentUser();
    if (!user || !user.email) {
      // No email means no way to reach out — no-op
      return NextResponse.json({ ok: true, reason: "no-email" });
    }

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: true, reason: "invalid-body" });
    }

    const items = parsed.data.items;
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const emailLower = user.email.toLowerCase();

    // Upsert — one active abandoned cart row per user
    const [existing] = await db
      .select({ id: abandonedCarts.id, recoveryToken: abandonedCarts.recoveryToken })
      .from(abandonedCarts)
      .where(eq(abandonedCarts.userId, user.id))
      .limit(1);

    if (existing) {
      // Reset the stage + update items. Keep the recovery token so old email
      // links still work.
      await db
        .update(abandonedCarts)
        .set({
          emailLower,
          items,
          subtotal,
          stage: 0,
          convertedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(abandonedCarts.id, existing.id));
    } else {
      await db.insert(abandonedCarts).values({
        userId: user.id,
        emailLower,
        items,
        subtotal,
        stage: 0,
        recoveryToken: crypto.randomBytes(32).toString("hex"),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[abandoned-cart snapshot]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
