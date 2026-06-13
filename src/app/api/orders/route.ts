import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const user = await requireAuth();

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt));

    if (userOrders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    // Single query for all items across all orders
    const orderIds = userOrders.map((o) => o.id);
    const allItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    // Group items by orderId
    const itemsByOrder = new Map<string, (typeof allItems)[number][]>();
    for (const item of allItems) {
      const existing = itemsByOrder.get(item.orderId) || [];
      existing.push(item);
      itemsByOrder.set(item.orderId, existing);
    }

    const ordersWithItems = userOrders.map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id) || [],
    }));

    return NextResponse.json({ orders: ordersWithItems });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
