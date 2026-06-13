import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { and, eq, gte, sql } from "drizzle-orm";
import { BUMP_OFFER_SKU, BUMP_OFFER_SLUG } from "@/lib/bump-offer";

// GET /api/admin/bump-stats?days=30
// Bump take-rate + revenue, windowed to the last N days.
export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30", 10), 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Count orders where the bump was shown, overall and by result.
    const [shownRow] = await db
      .select({
        shown: sql<number>`COUNT(*)::int`,
      })
      .from(orders)
      .where(and(eq(orders.bumpShown, true), gte(orders.createdAt, since)));

    // Count orders that contain the bump SKU in the last N days — i.e.
    // accepted bump count. We join order_items to match on SKU.
    const [acceptedRow] = await db
      .select({
        accepted: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
        revenue: sql<number>`COALESCE(SUM(${orderItems.lineTotal}), 0)::int`,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          gte(orders.createdAt, since),
          sql`${orderItems.variantSku} = ${BUMP_OFFER_SKU} OR ${orderItems.slug} = ${BUMP_OFFER_SLUG}`,
        ),
      );

    const shown = shownRow?.shown ?? 0;
    const accepted = acceptedRow?.accepted ?? 0;
    const revenueCents = acceptedRow?.revenue ?? 0;
    const takeRate = shown > 0 ? accepted / shown : 0;

    return NextResponse.json({
      days,
      shown,
      accepted,
      takeRate,
      revenueCents,
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
