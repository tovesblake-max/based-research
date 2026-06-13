import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, subscriptionItems, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

// GET /api/admin/subscriptions?status=active|paused|payment_failed|cancelled|all
// Returns all subscriptions with the owner's email + their items rolled up.
// Used by the admin Subscriptions tab for ops review.
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    const whereClause =
      status === "all" ? undefined : eq(subscriptions.status, status);

    const subs = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        frequency: subscriptions.frequency,
        loyaltyTier: subscriptions.loyaltyTier,
        discountPercent: subscriptions.discountPercent,
        successfulCharges: subscriptions.successfulCharges,
        nextChargeDate: subscriptions.nextChargeDate,
        lastChargedAt: subscriptions.lastChargedAt,
        pausedUntil: subscriptions.pausedUntil,
        pauseReason: subscriptions.pauseReason,
        retryCount: subscriptions.retryCount,
        createdAt: subscriptions.createdAt,
        userId: subscriptions.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(subscriptions)
      .leftJoin(users, eq(users.id, subscriptions.userId))
      .where(whereClause)
      .orderBy(desc(subscriptions.createdAt))
      .limit(200);

    if (subs.length === 0) {
      return NextResponse.json({ subscriptions: [] });
    }

    const subIds = subs.map((s) => s.id);
    const items = await db
      .select()
      .from(subscriptionItems)
      .where(inArray(subscriptionItems.subscriptionId, subIds));

    const itemsBySubId = new Map<string, typeof items>();
    for (const item of items) {
      const existing = itemsBySubId.get(item.subscriptionId) || [];
      existing.push(item);
      itemsBySubId.set(item.subscriptionId, existing);
    }

    const result = subs.map((s) => {
      const subItems = itemsBySubId.get(s.id) || [];
      const itemValue = subItems.reduce(
        (sum, i) => sum + i.basePrice * i.quantity,
        0,
      );
      const discount = Math.round(itemValue * (s.discountPercent / 100));
      const netPerCycle = itemValue - discount;
      return {
        ...s,
        nextChargeDate: s.nextChargeDate?.toISOString() ?? null,
        lastChargedAt: s.lastChargedAt?.toISOString() ?? null,
        pausedUntil: s.pausedUntil?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        items: subItems.map((i) => ({
          slug: i.slug,
          productName: i.productName,
          variantSize: i.variantSize,
          basePrice: i.basePrice,
          quantity: i.quantity,
        })),
        netPerCycle,
      };
    });

    return NextResponse.json({ subscriptions: result });
  } catch (error) {
    console.error("[Admin Subs GET]", error);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

// PATCH /api/admin/subscriptions
// Body: { subscriptionId, action: "pause" | "resume" | "cancel" }
// Lets admin intervene on a customer's subscription without impersonating.
export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { subscriptionId, action } = body as {
      subscriptionId?: string;
      action?: string;
    };

    if (!subscriptionId || !action) {
      return NextResponse.json(
        { error: "subscriptionId and action required" },
        { status: 400 },
      );
    }

    const now = new Date();
    const updates: Partial<typeof subscriptions.$inferInsert> = { updatedAt: now };

    if (action === "pause") {
      updates.status = "paused";
      updates.pauseReason = "user"; // admin-triggered pauses act like user pauses
      updates.pausedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (action === "resume") {
      updates.status = "active";
      updates.pauseReason = null;
      updates.pausedUntil = null;
      updates.retryCount = 0;
      updates.nextChargeDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (action === "cancel") {
      updates.status = "cancelled";
      updates.processingAt = null;
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const [updated] = await db
      .update(subscriptions)
      .set(updates)
      .where(eq(subscriptions.id, subscriptionId))
      .returning({ id: subscriptions.id });

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Admin Subs PATCH]", error);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
