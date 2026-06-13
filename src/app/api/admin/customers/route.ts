/**
 * Top customers by lifetime spend.
 *
 * Returns the top N customers ranked by sum(orders.total) across paid
 * orders (payment_status='completed'). For each, also: order count,
 * AOV, first-order date, last-order date, days-since-last-order, and
 * total refunded. Used by the Analytics tab to surface VIPs and
 * cold-but-valuable customers worth re-engaging.
 *
 * Distinct from /api/admin/users (the user-list table for support):
 * this endpoint is REVENUE-ranked and excludes anyone who hasn't
 * actually paid yet. It's a sales-ops view, not a CRM view.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, sql, and, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "25", 10)));

  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      signupAt: users.createdAt,
      // Revenue + count are guarded by payment_status filter inline so
      // unpaid/refunded orders don't pollute the LTV number.
      lifetimeRevenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus} = 'completed'), 0)`,
      orderCount: sql<number>`count(${orders.id}) filter (where ${orders.paymentStatus} = 'completed')`,
      refundedTotal: sql<number>`coalesce(sum(${orders.refundedAmountCents}) filter (where ${orders.paymentStatus} = 'completed'), 0)`,
      firstOrderAt: sql<string | null>`min(${orders.createdAt}) filter (where ${orders.paymentStatus} = 'completed')`,
      lastOrderAt: sql<string | null>`max(${orders.createdAt}) filter (where ${orders.paymentStatus} = 'completed')`,
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .groupBy(users.id, users.email, users.firstName, users.lastName, users.phone, users.createdAt)
    // Drop users with no completed orders (lifetime = 0). HAVING-equivalent
    // via a wrapping subquery would be cleaner, but Drizzle's groupBy +
    // having interaction with this many filtered aggregates is fiddly;
    // filtering in JS post-fetch is fine for the small N we render.
    .orderBy(desc(sql`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus} = 'completed'), 0)`))
    .limit(limit * 3); // overfetch to drop zero-spend rows below

  const buyers = rows
    .filter((r) => Number(r.lifetimeRevenue) > 0)
    .slice(0, limit)
    .map((r) => {
      const lifetime = Number(r.lifetimeRevenue);
      const count = Number(r.orderCount);
      const refunded = Number(r.refundedTotal);
      const aov = count > 0 ? Math.round(lifetime / count) : 0;
      const lastOrderMs = r.lastOrderAt ? new Date(r.lastOrderAt).getTime() : null;
      const daysSinceLast = lastOrderMs
        ? Math.floor((Date.now() - lastOrderMs) / (24 * 60 * 60 * 1000))
        : null;
      return {
        userId: r.userId,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        phone: r.phone,
        signupAt: r.signupAt,
        firstOrderAt: r.firstOrderAt,
        lastOrderAt: r.lastOrderAt,
        daysSinceLastOrder: daysSinceLast,
        lifetimeRevenue: lifetime,
        orderCount: count,
        aov,
        refundedTotal: refunded,
      };
    });

  return NextResponse.json({ limit, buyers });
}
