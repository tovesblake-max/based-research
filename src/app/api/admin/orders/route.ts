import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { orderUpdateSchema } from "@/lib/validation";
import { sendShippedSMSForOrder } from "@/lib/fulfillment";
import { eq, ne, desc, and, or, ilike, inArray } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];
    const conditions = [];
    // Synthetic filters ("paid", "abandoned") are NOT real status values —
    // they map to composite WHERE clauses. Previously they were passed
    // straight through and, not being in validStatuses, were silently
    // ignored, so both filters returned every order (incl. confirmed).
    if (status === "paid") {
      // Actual revenue: payment cleared.
      conditions.push(eq(orders.paymentStatus, "completed"));
    } else if (status === "abandoned") {
      // Started checkout, never paid. Two shapes:
      //   - live unpaid pendings (recoverable), and
      //   - stale carts the cleanup cron auto-closed (status & paymentStatus
      //     both 'cancelled'). Neither is a confirmed order.
      conditions.push(
        or(
          and(eq(orders.status, "pending"), inArray(orders.paymentStatus, ["unpaid", "pending"])),
          and(eq(orders.status, "cancelled"), eq(orders.paymentStatus, "cancelled")),
        )!,
      );
    } else if (status === "failed") {
      // Declined / failed payments (handlePaymentFailed sets status=cancelled,
      // paymentStatus=failed). A failed checkout, not a cancellation.
      conditions.push(and(eq(orders.status, "cancelled"), eq(orders.paymentStatus, "failed"))!);
    } else if (status === "cancelled") {
      // Genuine cancellations only — exclude stale auto-closed carts
      // (paymentStatus='cancelled' → "abandoned") and declined payments
      // (paymentStatus='failed' → "failed"), which have their own filters.
      conditions.push(
        and(
          eq(orders.status, "cancelled"),
          ne(orders.paymentStatus, "cancelled"),
          ne(orders.paymentStatus, "failed"),
        )!,
      );
    } else if (status && status !== "all" && validStatuses.includes(status)) {
      conditions.push(eq(orders.status, status));
    }
    if (search) {
      conditions.push(
        or(
          ilike(orders.orderNumber, `%${search}%`),
          ilike(orders.email, `%${search}%`)
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const allOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        email: orders.email,
        // Phone is captured at order-creation time on every flow (express
        // guest, gated logged-in, manual admin). Surfacing it on the list
        // row lets admin tap-to-text from the orders table without
        // drilling into the detail panel — important for abandoned-cart
        // outreach where time-to-touch matters.
        customerPhone: orders.customerPhone,
        status: orders.status,
        subtotal: orders.subtotal,
        shippingCost: orders.shippingCost,
        discount: orders.discount,
        total: orders.total,
        // Full tracking surface — URL, carrier, milestone, last raw event,
        // last check timestamp, delivery timestamp. All populated by the
        // Ship24 polling cron (api/cron/tracking-status) and/or the
        // ShipStation shipnotify webhook.
        trackingNumber: orders.trackingNumber,
        trackingUrl: orders.trackingUrl,
        trackingCarrier: orders.trackingCarrier,
        trackingSynced: orders.trackingSynced,
        trackingMilestone: orders.trackingMilestone,
        trackingLastEvent: orders.trackingLastEvent,
        trackingLastChecked: orders.trackingLastChecked,
        deliveredAt: orders.deliveredAt,
        // ShipStation handshake — set by pushOrderToShipStation. Admin
        // can tell at a glance whether the warehouse has the order yet.
        shipstationOrderId: orders.shipstationOrderId,
        shipstationOrderKey: orders.shipstationOrderKey,
        shipstationPushedAt: orders.shipstationPushedAt,
        // Payment details
        paymentStatus: orders.paymentStatus,
        paymentGateway: orders.paymentGateway,
        // Provider charge/transaction id, once a payment processor is wired.
        paymentReference: orders.paymentReference,
        // Coupon — populated when the customer applied a code at checkout.
        // Surfaced to the admin so we can see at a glance which orders
        // were promo-driven (e.g. did the abandoner have a coupon they
        // never got to use?).
        couponCode: orders.couponCode,
        // Fraud + misc
        fraudScore: orders.fraudScore,
        fraudSignals: orders.fraudSignals,
        notes: orders.notes,
        subscriptionId: orders.subscriptionId,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        shippingAddress: orders.shippingAddress,
        userId: orders.userId,
        // Buyer's institutional-verification status (null = not verified).
        // Lets the admin flag/clear unverified institutions at the point
        // where orders are reviewed before fulfillment.
        institutionVerifiedAt: users.institutionVerifiedAt,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    // Batch-load items for every order on this page so the UI can render
    // line items without a second round-trip per order.
    const orderIds = allOrders.map((o) => o.id);
    let items: (typeof orderItems.$inferSelect)[] = [];
    if (orderIds.length > 0) {
      items = await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));
    }
    const itemsByOrderId = new Map<string, typeof items>();
    for (const item of items) {
      const arr = itemsByOrderId.get(item.orderId) || [];
      arr.push(item);
      itemsByOrderId.set(item.orderId, arr);
    }

    const withItems = allOrders.map((o) => ({
      ...o,
      items: itemsByOrderId.get(o.id) || [],
    }));

    return NextResponse.json({ orders: withItems, page, limit });
  } catch (error) {
    console.error("Admin orders GET error:", error);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { orderId, ...updateData } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json({ error: "Invalid order ID format" }, { status: 400 });
    }

    const parsed = orderUpdateSchema.safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(orders)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Admin just attached a tracking number manually — fire the SMS too.
    // The helper is idempotent (shippingSmsSentAt guard) so the usual
    // ShipStation-webhook-path SMS won't duplicate if that fires later.
    if (parsed.data.trackingNumber) {
      sendShippedSMSForOrder(updated.id).catch((err) =>
        console.warn(`[Admin PATCH] SMS failed for ${updated.orderNumber}:`, err),
      );
    }

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Admin orders PATCH error:", error);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
