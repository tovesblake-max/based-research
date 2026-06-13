import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { trackPackage } from "@/lib/tracking-status";
import { eq } from "drizzle-orm";

// Public tracking endpoint — anyone with an order number can check status
export async function GET(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  try {
    const { orderNumber } = await params;

    const [order] = await db
      .select({
        orderNumber: orders.orderNumber,
        trackingNumber: orders.trackingNumber,
        trackingCarrier: orders.trackingCarrier,
        trackingMilestone: orders.trackingMilestone,
        trackingLastEvent: orders.trackingLastEvent,
        status: orders.status,
        deliveredAt: orders.deliveredAt,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If we have a tracking number and Ship24 is configured, try to get live events
    let events: unknown[] = [];
    if (order.trackingNumber && process.env.SHIP24_API_KEY) {
      try {
        const tracking = await trackPackage(order.trackingNumber);
        if (tracking) {
          events = tracking.events;
          // Update milestone if changed
          if (tracking.milestone !== order.trackingMilestone) {
            order.trackingMilestone = tracking.milestone;
            order.trackingLastEvent = tracking.lastEvent;
          }
        }
      } catch {
        // Live tracking failed — fall back to stored data
      }
    }

    return NextResponse.json({
      ...order,
      events,
    });
  } catch (error) {
    console.error("[Track API]", error);
    return NextResponse.json({ error: "Failed to load tracking" }, { status: 500 });
  }
}
