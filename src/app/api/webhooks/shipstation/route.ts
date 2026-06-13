import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getResource } from "@/lib/shipstation";
import { sendEmail } from "@/lib/email";
import { eq } from "drizzle-orm";

// ShipStation SHIP_NOTIFY webhook
// ShipStation sends: { resource_url, resource_type }
// We fetch the resource_url to get shipment details including tracking
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resource_url, resource_type } = body;

    if (!resource_url) {
      return NextResponse.json({ ok: true });
    }

    // Verify resource_url points to ShipStation's domain (prevent SSRF)
    try {
      const url = new URL(resource_url);
      if (!url.hostname.endsWith("ssapi.shipstation.com") && !url.hostname.endsWith("shipstation.com")) {
        console.warn(`[ShipStation Webhook] Rejected non-ShipStation resource URL: ${url.hostname}`);
        return NextResponse.json({ ok: true });
      }
    } catch {
      return NextResponse.json({ ok: true });
    }

    // Fetch the actual shipment data from ShipStation
    const shipmentData = await getResource(resource_url);

    // ShipStation returns an object with shipments array
    const shipments = shipmentData.shipments || [shipmentData];

    for (const shipment of shipments) {
      const orderNumber = shipment.orderNumber;
      const trackingNumber = shipment.trackingNumber;
      const carrierCode = shipment.carrierCode;
      const shipDate = shipment.shipDate;

      if (!orderNumber || !trackingNumber) continue;

      // Build tracking URL based on carrier
      let trackingUrl = "";
      if (carrierCode === "fedex" || carrierCode === "fedex_ground") {
        trackingUrl = `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
      } else if (carrierCode === "ups") {
        trackingUrl = `https://www.ups.com/track?tracknum=${trackingNumber}`;
      } else if (carrierCode === "usps") {
        trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
      } else if (carrierCode === "dhl_express") {
        trackingUrl = `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
      }

      // Find our order by orderNumber
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1);

      if (!order) {
        console.warn(`[ShipStation Webhook] Order ${orderNumber} not found in our DB`);
        continue;
      }

      // Update order with tracking info
      await db
        .update(orders)
        .set({
          status: "shipped",
          trackingNumber,
          trackingUrl: trackingUrl || null,
          trackingCarrier: carrierCode || "other",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      // Send shipping confirmation email
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://basedresearch.com";
      const shipping = order.shippingAddress as { firstName?: string } | null;
      const firstName = shipping?.firstName || "there";

      await sendEmail({
        to: order.email,
        subject: `Your order ${orderNumber} has shipped! — Based Research`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
            <h1 style="font-size:22px;color:#1a1a19;margin-bottom:16px;">Based Research</h1>
            <h2 style="font-size:18px;color:#1a1a19;">Your Order Has Shipped!</h2>
            <p style="font-size:15px;color:#737373;line-height:1.6;">
              Hi ${firstName}, great news — your order <strong style="color:#1a1a19;">${orderNumber}</strong> is on its way!
            </p>
            <div style="background:#f5f5f0;border-radius:8px;padding:16px;margin:20px 0;">
              <p style="font-size:14px;color:#1a1a19;margin:0 0 4px;"><strong>Tracking Number:</strong> ${trackingNumber}</p>
              <p style="font-size:14px;color:#1a1a19;margin:0 0 4px;"><strong>Carrier:</strong> ${(carrierCode || "").toUpperCase()}</p>
              ${trackingUrl ? `<p style="margin:8px 0 0;"><a href="${trackingUrl}" style="color:#1E3A5F;font-weight:600;text-decoration:none;">Track Your Package →</a></p>` : ""}
            </div>
            <p style="font-size:14px;color:#737373;">Shipped from cold storage via UPS for maximum peptide integrity.</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${siteUrl}/account/orders" style="display:inline-block;background:#1E3A5F;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">View Order</a>
            </div>
            <hr style="border:none;border-top:1px solid #eee;margin:32px 0;"/>
            <p style="font-size:11px;color:#999;text-align:center;">Based Research · Research-Grade Peptides</p>
          </div>
        `,
      }).catch((err) => console.error(`[ShipStation Webhook] Email failed for ${orderNumber}:`, err));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ShipStation Webhook]", error);
    // Always return 200 to ShipStation so they don't retry endlessly
    return NextResponse.json({ ok: true });
  }
}
