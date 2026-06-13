/**
 * Hourly cron: scans abandoned_carts and sends recovery emails.
 *
 * Email cadence:
 *   Stage 0 → 1: at least 1 hour since capture, no conversion → Email 1 ("you left these behind")
 *   Stage 1 → 2: at least 24 hours since Email 1 → Email 2 ("still thinking?")
 *   Stage 2 → 3: at least 48 hours since Email 2 → Email 3 ("last chance + social proof")
 *
 * Carts at stage 3 are not re-emailed. Carts marked converted (stage 99) are
 * not emailed.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { abandonedCarts } from "@/lib/db/schema";
import { and, eq, lt, or, isNull } from "drizzle-orm";
import { sendAbandonedCartEmail } from "@/lib/email";
import { generateRecoveryCoupon } from "@/lib/coupons";

export async function GET(request: Request) {
  // Vercel cron adds this auth header when invoking. Fail closed — if
  // CRON_SECRET is unset we refuse to run so the endpoint cannot be used
  // to trigger mass-email sends externally.
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now - 48 * 60 * 60 * 1000);

  let sent1 = 0, sent2 = 0, sent3 = 0, errors = 0;

  // ── Stage 0 → 1 ────────────────────────────────────────
  const stage0 = await db
    .select()
    .from(abandonedCarts)
    .where(
      and(
        eq(abandonedCarts.stage, 0),
        lt(abandonedCarts.updatedAt, oneHourAgo)
      )
    )
    .limit(50);

  for (const c of stage0) {
    try {
      await sendAbandonedCartEmail({
        email: c.emailLower,
        stage: 1,
        items: c.items,
        subtotal: c.subtotal,
        recoveryToken: c.recoveryToken,
      });
      await db
        .update(abandonedCarts)
        .set({ stage: 1, lastEmailAt: new Date(), updatedAt: new Date() })
        .where(eq(abandonedCarts.id, c.id));
      sent1++;
    } catch (err) {
      errors++;
      console.error("[abandoned-cart email 1]", err);
    }
  }

  // ── Stage 1 → 2 ────────────────────────────────────────
  const stage1 = await db
    .select()
    .from(abandonedCarts)
    .where(
      and(
        eq(abandonedCarts.stage, 1),
        or(isNull(abandonedCarts.lastEmailAt), lt(abandonedCarts.lastEmailAt, oneDayAgo))
      )
    )
    .limit(50);

  for (const c of stage1) {
    try {
      await sendAbandonedCartEmail({
        email: c.emailLower,
        stage: 2,
        items: c.items,
        subtotal: c.subtotal,
        recoveryToken: c.recoveryToken,
      });
      await db
        .update(abandonedCarts)
        .set({ stage: 2, lastEmailAt: new Date(), updatedAt: new Date() })
        .where(eq(abandonedCarts.id, c.id));
      sent2++;
    } catch (err) {
      errors++;
      console.error("[abandoned-cart email 2]", err);
    }
  }

  // ── Stage 2 → 3 ────────────────────────────────────────
  const stage2 = await db
    .select()
    .from(abandonedCarts)
    .where(
      and(
        eq(abandonedCarts.stage, 2),
        or(isNull(abandonedCarts.lastEmailAt), lt(abandonedCarts.lastEmailAt, twoDaysAgo))
      )
    )
    .limit(50);

  for (const c of stage2) {
    try {
      // Stage 3 = last-chance email. Mint a one-time 5% recovery code
      // first so the email + cart link both carry it. If coupon
      // generation fails (DB hiccup etc.) we still send the email —
      // the customer just doesn't get the incentive that round.
      const recoveryCoupon = await generateRecoveryCoupon({
        recoveryToken: c.recoveryToken,
        discountPercent: 5,
        validDays: 7,
      });

      await sendAbandonedCartEmail({
        email: c.emailLower,
        stage: 3,
        items: c.items,
        subtotal: c.subtotal,
        recoveryToken: c.recoveryToken,
        recoveryCoupon,
      });
      await db
        .update(abandonedCarts)
        .set({ stage: 3, lastEmailAt: new Date(), updatedAt: new Date() })
        .where(eq(abandonedCarts.id, c.id));
      sent3++;
    } catch (err) {
      errors++;
      console.error("[abandoned-cart email 3]", err);
    }
  }

  // Heartbeat — ping a dead-man's-switch so we learn if this cron stops
  // firing. Fire-and-forget; failures never block cron success.
  if (process.env.HEARTBEAT_URL_ABANDONED_CARTS) {
    fetch(process.env.HEARTBEAT_URL_ABANDONED_CARTS).catch((err) => console.warn("[cron abandoned-carts heartbeat]", err));
  }

  return NextResponse.json({
    ok: true,
    sent: { stage1: sent1, stage2: sent2, stage3: sent3 },
    errors,
  });
}
