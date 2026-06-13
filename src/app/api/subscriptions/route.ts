import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, subscriptionItems } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc, inArray } from "drizzle-orm";

// GET — list the signed-in user's subscriptions with their items.
export async function GET() {
  try {
    const user = await requireAuth();

    const subs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .orderBy(desc(subscriptions.createdAt));

    if (subs.length === 0) {
      return NextResponse.json({ subscriptions: [] });
    }

    // Fetch items ONLY for this user's subscriptions (not all items in the table)
    const subIds = subs.map((s) => s.id);
    const items = await db
      .select()
      .from(subscriptionItems)
      .where(inArray(subscriptionItems.subscriptionId, subIds));

    const itemsBySubId = new Map<string, (typeof items)[number][]>();
    for (const item of items) {
      const existing = itemsBySubId.get(item.subscriptionId) || [];
      existing.push(item);
      itemsBySubId.set(item.subscriptionId, existing);
    }

    const result = subs.map((sub) => ({
      ...sub,
      items: itemsBySubId.get(sub.id) || [],
    }));

    return NextResponse.json({ subscriptions: result });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// POST — create a new subscription.
//
// Disabled in this template: creating a subscription requires a payment
// processor to store a recurring billing token. Wire your processor here
// (and in /api/cron/subscriptions) to enable recurring billing, then write
// the subscription + items and stamp subscriptions.billingReference.
export async function POST() {
  return NextResponse.json(
    {
      error: "Recurring billing is not configured. Wire a payment processor to enable subscriptions.",
      code: "NO_PAYMENT_PROCESSOR",
    },
    { status: 501 },
  );
}
