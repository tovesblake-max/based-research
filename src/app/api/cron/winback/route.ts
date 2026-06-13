/**
 * Daily 60-day win-back cron.
 *
 * For each user whose most-recent paid order shipped between 55 and 75
 * days ago AND who has not received a win-back email in the past 90
 * days, send the reorder nudge and update users.last_winback_email_at.
 *
 * The 55-75 day window is intentional: customers who order on a
 * 30-day cadence (subscription / heavy researchers) re-purchase before
 * day 55 and never enter the eligibility window. Customers on a
 * 90-day+ cadence are caught by the upper bound. The middle segment
 * is the population that has gone quiet but is statistically still
 * within range of returning.
 *
 * Runs once per day at 13:00 UTC. Auth: same Bearer-CRON_SECRET pattern
 * as every other cron in this project.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, users } from "@/lib/db/schema";
import { sendWinBackEmail } from "@/lib/email";
import { eq, and, gte, lte, isNull, or, sql, desc } from "drizzle-orm";

// Eligibility window in days since last order.
const WINDOW_LOWER_DAYS = 55;
const WINDOW_UPPER_DAYS = 75;
// Re-fire suppression: do not send another win-back to the same user
// within this many days of the previous one.
const RESEND_SUPPRESSION_DAYS = 90;
// Per-cron-run cap so a long-quiet catalog cannot mass-fire on a
// single day. If we land in a state where 200 users are eligible, we
// process 50/day across 4 days rather than one batch.
const MAX_SENDS_PER_RUN = 50;

export async function GET(request: Request) {
  // Fail closed on missing CRON_SECRET. Vercel's scheduler attaches the
  // header automatically; manual hits without it 401.
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const lowerBound = new Date(now - WINDOW_UPPER_DAYS * 24 * 60 * 60 * 1000); // older edge
  const upperBound = new Date(now - WINDOW_LOWER_DAYS * 24 * 60 * 60 * 1000); // newer edge
  const suppressionThreshold = new Date(now - RESEND_SUPPRESSION_DAYS * 24 * 60 * 60 * 1000);

  // Pull candidates in a single query. We want users whose MOST RECENT
  // paid order falls inside the eligibility window. Done via a window
  // function so we can apply the date filter on max(created_at) rather
  // than picking up users who happen to have ANY order in the window.
  const candidates = await db.execute(sql`
    WITH last_paid AS (
      SELECT
        user_id,
        MAX(created_at) AS last_order_at
      FROM orders
      WHERE payment_status = 'completed'
        AND user_id IS NOT NULL
      GROUP BY user_id
    )
    SELECT
      u.id AS user_id,
      u.email,
      u.first_name,
      u.last_winback_email_at,
      lp.last_order_at
    FROM last_paid lp
    JOIN users u ON u.id = lp.user_id
    WHERE lp.last_order_at >= ${lowerBound}
      AND lp.last_order_at <= ${upperBound}
      AND u.email IS NOT NULL
      AND (u.last_winback_email_at IS NULL OR u.last_winback_email_at < ${suppressionThreshold})
    ORDER BY lp.last_order_at ASC
    LIMIT ${MAX_SENDS_PER_RUN}
  `);

  const rows = candidates.rows as Array<{
    user_id: string;
    email: string;
    first_name: string | null;
    last_winback_email_at: string | null;
    last_order_at: string;
  }>;

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      // Pull the items from the user's most recent paid order so the
      // email can show what they actually bought (and pre-load the
      // reorder cart with the same SKUs).
      const lastOrders = await db
        .select({ id: orders.id, createdAt: orders.createdAt })
        .from(orders)
        .where(
          and(
            eq(orders.userId, row.user_id),
            eq(orders.paymentStatus, "completed"),
          ),
        )
        .orderBy(desc(orders.createdAt))
        .limit(1);
      const lastOrder = lastOrders[0];
      if (!lastOrder) continue;

      const items = await db
        .select({
          productName: orderItems.productName,
          variantSize: orderItems.variantSize,
          variantSku: orderItems.variantSku,
          quantity: orderItems.quantity,
          slug: orderItems.slug,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, lastOrder.id));
      // Deduplicate by SKU in case the order had the same variant twice
      // for any reason. Keep the largest quantity entry.
      const dedup = new Map<string, typeof items[number]>();
      for (const it of items) {
        const existing = dedup.get(it.variantSku);
        if (!existing || existing.quantity < it.quantity) {
          dedup.set(it.variantSku, it);
        }
      }
      const lineItems = [...dedup.values()];
      if (lineItems.length === 0) continue;

      const lastOrderShipped = new Date(lastOrder.createdAt);
      const daysSince = Math.floor(
        (now - lastOrderShipped.getTime()) / (24 * 60 * 60 * 1000),
      );

      await sendWinBackEmail({
        email: row.email,
        firstName: row.first_name,
        lastOrderShippedAt: lastOrderShipped,
        daysSinceLastOrder: daysSince,
        lastOrderItems: lineItems,
      });

      // Stamp the suppression timestamp BEFORE counting success so a
      // duplicate execution on partial failure cannot re-send.
      await db
        .update(users)
        .set({ lastWinbackEmailAt: new Date() })
        .where(eq(users.id, row.user_id));

      sent++;
    } catch (err) {
      console.error(
        `[winback] failed for user ${row.user_id}:`,
        (err as Error).message,
      );
      failed++;
    }
  }

  return NextResponse.json({
    eligible: rows.length,
    sent,
    failed,
    windowDays: { lower: WINDOW_LOWER_DAYS, upper: WINDOW_UPPER_DAYS },
    suppressionDays: RESEND_SUPPRESSION_DAYS,
  });
}
