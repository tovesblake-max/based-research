import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

// Called by the /checkout/callback page to read an order's status.
//
// Source of truth is our own orders row. Once you wire a payment
// processor, its webhook updates this row to paymentStatus "completed"
// (and runs fulfillment); this endpoint just reports the current state
// so the callback page can render the right confirmation UI.
//
// Scope:
//   - Logged-in orders (userId set) — require the caller to be that same
//     user; protects against order-number enumeration.
//   - Guest orders (userId null) — orderNumber alone is the scope. Order
//     numbers are high-entropy so brute-force enumeration is impractical.

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const { orderNumber } = await request.json();

    if (!orderNumber) {
      return NextResponse.json({ error: "orderNumber required" }, { status: 400 });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Logged-in order — only the owning user can read it.
    if (order.userId && (!user || user.id !== order.userId)) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    async function loadItems() {
      const rows = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      return rows.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        variantSku: r.variantSku,
        variantSize: r.variantSize,
        price: r.unitPrice,
        quantity: r.quantity,
        slug: r.slug || r.variantSku,
      }));
    }

    if (order.paymentStatus === "completed") {
      return NextResponse.json({
        status: "completed",
        orderNumber,
        order: {
          subtotal: order.subtotal,
          shipping: order.shippingCost,
          discount: order.discount,
          total: order.total,
          email: order.email,
        },
        items: await loadItems(),
      });
    }

    if (order.paymentStatus === "failed") {
      return NextResponse.json({ status: "failed", msg: "Payment was not completed" });
    }

    // Order created but not yet paid — this is the default state for a
    // template with no payment processor wired. Return the order details
    // so the callback page can render a "payment not configured" notice.
    return NextResponse.json({
      status: "pending",
      orderNumber,
      msg: "Order created. No payment processor is configured.",
      order: {
        subtotal: order.subtotal,
        shipping: order.shippingCost,
        discount: order.discount,
        total: order.total,
        email: order.email,
      },
      items: await loadItems(),
    });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Checkout Result]", error);
    return NextResponse.json({ error: "Failed to read order" }, { status: 500 });
  }
}
