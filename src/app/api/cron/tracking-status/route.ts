import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { trackPackage } from "@/lib/tracking-status";
import { sendEmail } from "@/lib/email";
import { eq, and, isNotNull, or } from "drizzle-orm";
import { sql } from "drizzle-orm";

const BATCH_SIZE = 30;

// Cron: poll tracking status for all shipped orders that haven't been delivered yet
export async function GET(request: Request) {
  // Fail closed on missing CRON_SECRET.
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find orders that are shipped, have tracking numbers, and aren't delivered yet
    const shippedOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        email: orders.email,
        trackingNumber: orders.trackingNumber,
        trackingMilestone: orders.trackingMilestone,
        shippingAddress: orders.shippingAddress,
        status: orders.status,
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, "shipped"),
          isNotNull(orders.trackingNumber),
          or(
            sql`${orders.trackingMilestone} IS NULL`,
            sql`${orders.trackingMilestone} NOT IN ('delivered', 'exception')`
          )
        )
      )
      .limit(BATCH_SIZE);

    const results = [];

    for (const order of shippedOrders) {
      if (!order.trackingNumber) continue;

      try {
        const tracking = await trackPackage(order.trackingNumber);
        if (!tracking) {
          results.push({ order: order.orderNumber, status: "no_data" });
          continue;
        }

        const updates: Record<string, unknown> = {
          trackingMilestone: tracking.milestone,
          trackingLastEvent: tracking.lastEvent,
          trackingLastChecked: now,
          updatedAt: now,
        };

        // Auto-update to delivered
        if (tracking.milestone === "delivered" && order.status !== "delivered") {
          updates.status = "delivered";
          updates.deliveredAt = now;

          // Send delivery confirmation email
          const shipping = order.shippingAddress as { firstName?: string } | null;
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://basedresearch.com";

          await sendEmail({
            to: order.email,
            subject: `Your order ${order.orderNumber} has been delivered! — Based Research`,
            meta: { template: "order_delivered", orderId: order.id },
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
                <h1 style="font-size:22px;color:#1a1a19;margin-bottom:16px;">Based Research</h1>
                <h2 style="font-size:18px;color:#1a1a19;">Your Order Has Been Delivered!</h2>
                <p style="font-size:15px;color:#737373;line-height:1.6;">
                  Hi ${shipping?.firstName || "there"}, your order <strong style="color:#1a1a19;">${order.orderNumber}</strong> has been delivered.
                </p>
                <p style="font-size:14px;color:#737373;">
                  If you have any questions about your order, our team is here to help.
                </p>
                <div style="text-align:center;margin:24px 0;">
                  <a href="${siteUrl}/account/orders" style="display:inline-block;background:#1E3A5F;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">View Order</a>
                </div>
                <hr style="border:none;border-top:1px solid #eee;margin:32px 0;"/>
                <p style="font-size:11px;color:#999;text-align:center;">Based Research</p>
              </div>
            `,
          }).catch((err) => console.error(`[Tracking] Delivery email failed for ${order.orderNumber}:`, err));
        }

        // Alert admin on exceptions
        if (tracking.milestone === "exception") {
          const adminEmail = process.env.ADMIN_ALERT_EMAIL || "support@basedresearch.com";
          await sendEmail({
            to: adminEmail,
            subject: `⚠️ Shipping Exception: ${order.orderNumber}`,
            meta: { template: "admin_shipping_exception", orderId: order.id },
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
                <h2 style="font-size:18px;color:#DC2626;">Shipping Exception Alert</h2>
                <p><strong>Order:</strong> ${order.orderNumber}</p>
                <p><strong>Tracking:</strong> ${order.trackingNumber}</p>
                <p><strong>Status:</strong> ${tracking.lastEvent}</p>
                <p><strong>Location:</strong> ${tracking.events[0]?.location || "Unknown"}</p>
                <p>This package may need attention.</p>
              </div>
            `,
          }).catch((err) => console.warn("[cron tracking-status]", err));
        }

        await db.update(orders).set(updates).where(eq(orders.id, order.id));
        results.push({ order: order.orderNumber, milestone: tracking.milestone });
      } catch (err) {
        console.error(`[Tracking] Error checking ${order.orderNumber}:`, err);
        results.push({ order: order.orderNumber, status: "error" });
      }
    }

    // Heartbeat — ping dead-man's-switch so we learn if tracking stops.
    if (process.env.HEARTBEAT_URL_TRACKING_STATUS) {
      fetch(process.env.HEARTBEAT_URL_TRACKING_STATUS).catch((err) => console.warn("[cron tracking-status]", err));
    }

    return NextResponse.json({ checked: shippedOrders.length, results });
  } catch (error) {
    console.error("[Tracking Cron]", error);
    return NextResponse.json({ error: "Tracking check failed" }, { status: 500 });
  }
}
