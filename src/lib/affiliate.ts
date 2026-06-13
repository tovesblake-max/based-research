import { db } from "./db";
import { users, affiliates, commissions } from "./db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Creates a commission record when an order is attributable to an
 * affiliate. Attribution resolves in priority order:
 *
 *   1. `orderLevelAffiliateId` (passed by the caller from
 *      `orders.referralAffiliateId`) — set when the buyer used the
 *      affiliate's code as a coupon at checkout. Wins for THIS order
 *      only; lifetime credit on future orders still flows through (2).
 *   2. `users.referredBy` — set once at signup from the captured
 *      `?ref=CODE` localStorage value. Fires on every future order from
 *      the user, including subscription renewals.
 *
 * Call this after any successful order payment. Always non-throwing —
 * commission failures should never block order completion.
 */
export async function createCommissionIfReferred(
  userId: string | null,
  orderId: string,
  orderTotal: number,
  orderLevelAffiliateId?: string | null,
) {
  try {
    // Resolve affiliateId — order-level wins, fall back to user-level.
    let affiliateId: string | null = orderLevelAffiliateId ?? null;

    if (!affiliateId && userId) {
      const [user] = await db
        .select({ referredBy: users.referredBy })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      affiliateId = user?.referredBy ?? null;
    }

    if (!affiliateId) return null;

    // Get the affiliate and their commission rate
    const [affiliate] = await db
      .select({
        id: affiliates.id,
        commissionRate: affiliates.commissionRate,
        status: affiliates.status,
      })
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId))
      .limit(1);

    if (!affiliate || affiliate.status !== "active") return null;

    const rate = parseFloat(affiliate.commissionRate);
    const commissionAmount = Math.round(orderTotal * rate);

    if (commissionAmount <= 0) return null;

    // Create commission record. Idempotent on orderId: a unique index on
    // commissions.order_id + onConflictDoNothing means a second fire for the
    // same order (concurrent webhook + reconcile, or a manual replay) inserts
    // NOTHING. .returning() then yields no row, so we skip the totalEarned
    // bump — preventing the affiliate from being double-paid. (Burned: the
    // bare insert + unconditional totalEarned bump double-counted on retry.)
    const [commission] = await db
      .insert(commissions)
      .values({
        affiliateId: affiliate.id,
        orderId,
        orderTotal,
        commissionAmount,
        status: "pending",
      })
      .onConflictDoNothing({ target: commissions.orderId })
      .returning();

    // No row inserted → this order already had a commission. Do NOT bump
    // totalEarned again.
    if (!commission) return null;

    // Update affiliate's total earned — only on a genuine new commission.
    await db
      .update(affiliates)
      .set({
        totalEarned: sql`${affiliates.totalEarned} + ${commissionAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, affiliate.id));

    return commission;
  } catch (error) {
    console.error("[Affiliate] Commission creation error:", error);
    return null;
  }
}
