// Auto-push confirmed orders to ShipStation for fulfillment + notify the
// customer once a tracking number is attached.
import { db } from "./db";
import { orders, orderItems, users } from "./db/schema";
import { createOrder } from "./shipstation";
import { sendOrderShippedSMS } from "./twilio";
import { captureEvent } from "./posthog";
import { eq } from "drizzle-orm";
import { getProductBySlug } from "./products";

export async function pushOrderToShipStation(orderId: string) {
  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      console.error(`[Fulfillment] Order ${orderId} not found`);
      return null;
    }

    // Don't push if already pushed
    if (order.shipstationOrderId) {
      return { alreadyPushed: true, shipstationOrderId: order.shipstationOrderId };
    }

    // ── Payment-completion guard ──────────────────────────────────
    // Only paid orders go to the warehouse. Defense-in-depth: every
    // caller (your payment webhook, cron jobs, admin manual push) is
    // already supposed to gate, but bugs/race conditions can let an
    // unpaid order slip through. Failing here means the order can be
    // pushed later — once payment_status flips to 'completed' — by
    // re-invoking from cs/notify or the admin button. Refunded /
    // failed / cancelled / pending orders are silently skipped with a
    // structured return value so the caller can log + move on.
    if (order.paymentStatus !== "completed") {
      console.log(
        `[Fulfillment] Skipping ShipStation push for ${order.orderNumber} — payment_status='${order.paymentStatus}', status='${order.status}' (only 'completed' payments ship)`,
      );
      return {
        skipped: "unpaid",
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
      };
    }

    // Get order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    // Orders made up entirely of no-ship SKUs (internal test product, future
    // digital goods) never go to the warehouse.
    if (items.length > 0 && items.every((i) => getProductBySlug(i.slug)?.noShipping === true)) {
      return { skipped: "no_shipping_sku" };
    }

    const shipping = order.shippingAddress as {
      firstName: string;
      lastName: string;
      address1: string;
      address2?: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    } | null;

    if (!shipping) {
      console.error(`[Fulfillment] Order ${orderId} has no shipping address`);
      return null;
    }

    // Push to ShipStation
    const ssOrder = await createOrder({
      orderNumber: order.orderNumber,
      orderDate: order.createdAt.toISOString(),
      customerEmail: order.email,
      customerName: `${shipping.firstName} ${shipping.lastName}`,
      shipTo: {
        name: `${shipping.firstName} ${shipping.lastName}`,
        street1: shipping.address1,
        street2: shipping.address2,
        city: shipping.city,
        state: shipping.state,
        postalCode: shipping.zip,
        country: shipping.country || "US",
      },
      items: items.map((item) => ({
        sku: item.variantSku,
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice / 100, // cents to dollars
      })),
      amountPaid: order.total / 100,
      shippingAmount: order.shippingCost / 100,
      internalNotes: order.paymentGateway === "ach" ? "ACH Payment" : "Card Payment",
    });

    // Save ShipStation order ID back to our DB
    await db
      .update(orders)
      .set({
        shipstationOrderId: ssOrder.orderId,
        shipstationOrderKey: order.orderNumber,
        shipstationPushedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return { success: true, shipstationOrderId: ssOrder.orderId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Fulfillment] Failed to push order ${orderId} to ShipStation:`, error);
    // Surface the error to synchronous callers (admin manual push,
    // reconcile tool) instead of an opaque null. Fire-and-forget callers
    // ignore the return, so this is safe.
    return { error: message };
  }
}

/**
 * Send the customer a transactional SMS that their order has shipped,
 * with the tracking number + carrier link. Safe to call fire-and-forget
 * from any path that sets a tracking number on an order.
 *
 *   - Looks up the user's phone + first name via users table join
 *   - Only sends if phoneVerified === true (implied consent from OTP signup)
 *   - Skips silently if user has no phone (guest checkouts without phone)
 *   - Skips silently if Twilio SMS isn't configured (MessagingServiceSid /
 *     FromNumber env var unset)
 *   - Deduped via orders.shippingSmsSentAt — we never text twice for the
 *     same tracking number
 *
 * Errors are logged but never thrown. SMS is an adjunct to email, not a
 * guarantee, and Twilio outages must not block warehouse operations.
 */
export async function sendShippedSMSForOrder(orderId: string, opts?: { force?: boolean }): Promise<void> {
  try {
    const [row] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        email: orders.email,
        userId: orders.userId,
        trackingNumber: orders.trackingNumber,
        trackingUrl: orders.trackingUrl,
        trackingCarrier: orders.trackingCarrier,
        shippingAddress: orders.shippingAddress,
        shippingSmsSentAt: orders.shippingSmsSentAt,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!row) return;
    if (!row.trackingNumber) return;
    // Idempotency — don't re-text on ShipStation webhook replays or manual
    // tracking updates to the same number. Pass `force: true` from admin
    // "Resend SMS" action if we ever expose that.
    if (row.shippingSmsSentAt && !opts?.force) return;

    // Resolve recipient — prefer the user's registered + verified phone.
    // Guest checkouts without a user row get skipped here.
    if (!row.userId) return;
    const [user] = await db
      .select({
        phone: users.phone,
        phoneVerified: users.phoneVerified,
        firstName: users.firstName,
      })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);

    if (!user || !user.phone || !user.phoneVerified) return;

    const result = await sendOrderShippedSMS({
      toE164: user.phone,
      firstName: user.firstName,
      orderNumber: row.orderNumber,
      trackingNumber: row.trackingNumber,
      carrier: row.trackingCarrier,
      trackingUrl: row.trackingUrl,
    });

    if (result?.sid) {
      await db
        .update(orders)
        .set({ shippingSmsSentAt: new Date(), shippingSmsSid: result.sid })
        .where(eq(orders.id, orderId));

      captureEvent({
        distinctId: row.userId,
        event: "shipping_sms_sent",
        properties: {
          orderNumber: row.orderNumber,
          carrier: row.trackingCarrier,
          smsSid: result.sid,
        },
      }).catch((err) => console.warn("[fulfillment shipstation-push]", err));
    }
  } catch (err) {
    console.warn(`[Fulfillment] SMS notification failed for ${orderId}:`, err);
  }
}
