import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { sendShippedSMSForOrder } from "@/lib/fulfillment";
import { recordShipStationPoll } from "@/lib/shipstation-telemetry";

// ShipStation Custom Store Endpoint
// ShipStation calls this with:
//   GET ?action=export&start_date=MM/DD/YYYY+HH:MM&end_date=MM/DD/YYYY+HH:MM&page=1
//   POST ?action=shipnotify (when order ships)
//
// Authentication: Basic Auth with SS_STORE_USERNAME / SS_STORE_PASSWORD

const SS_STORE_USERNAME = process.env.SS_STORE_USERNAME || "based-research";
const SS_STORE_PASSWORD = process.env.SS_STORE_PASSWORD || "";
const ORDERS_PER_PAGE = 50;

function verifyBasicAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(authHeader.slice(6), "base64").toString();
  const [user, pass] = decoded.split(":");
  return user === SS_STORE_USERNAME && pass === SS_STORE_PASSWORD;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatSSDate(date: Date): string {
  // ShipStation Custom Store XML expects MM/DD/YYYY HH:MM (no seconds).
  // Prior version emitted ISO-ish "YYYY-MM-DD HH:MM:SS" which tripped
  // ShipStation's "DateTime pattern constraint failed" validator and
  // blocked every order from reaching the fulfillment team — flagged by
  // Omar at fulfillment on 2026-04-19. Dates stay in UTC to match the
  // rest of our stored timestamps.
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
}

// ── GET: Export orders for ShipStation to pull ──
export async function GET(request: Request) {
  if (!verifyBasicAuth(request)) {
    return new NextResponse("Unauthorized", { status: 401, headers: { "WWW-Authenticate": "Basic" } });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action !== "export") {
    return new NextResponse("<Orders pages=\"0\"></Orders>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const startDateStr = searchParams.get("start_date");
  const endDateStr = searchParams.get("end_date");
  const page = parseInt(searchParams.get("page") || "1");

  // Parse ShipStation's date format: MM/DD/YYYY HH:MM
  const startDate = startDateStr ? new Date(startDateStr.replace("+", " ")) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const endDate = endDateStr ? new Date(endDateStr.replace("+", " ")) : new Date();

  try {
    // Fetch confirmed orders modified within the date range
    // Only push orders that have been paid (status confirmed or processing)
    const allOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          gte(orders.updatedAt, startDate),
          lte(orders.updatedAt, endDate)
        )
      )
      .orderBy(desc(orders.createdAt));

    // Filter to only orders that should go to ShipStation
    const shippableOrders = allOrders.filter((o) =>
      ["confirmed", "processing"].includes(o.status) &&
      ["completed", "pending"].includes(o.paymentStatus || "")
    );

    const totalPages = Math.ceil(shippableOrders.length / ORDERS_PER_PAGE);
    const pageOrders = shippableOrders.slice((page - 1) * ORDERS_PER_PAGE, page * ORDERS_PER_PAGE);

    // Fetch items for all orders on this page
    const orderIds = pageOrders.map((o) => o.id);
    let allItems: (typeof orderItems.$inferSelect)[] = [];
    if (orderIds.length > 0) {
      const { inArray } = await import("drizzle-orm");
      allItems = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
    }

    const itemsByOrderId = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const existing = itemsByOrderId.get(item.orderId) || [];
      existing.push(item);
      itemsByOrderId.set(item.orderId, existing);
    }

    // Build XML
    let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
    xml += `<Orders pages="${totalPages || 1}">\n`;

    for (const order of pageOrders) {
      const shipping = order.shippingAddress as {
        firstName: string; lastName: string;
        address1: string; address2?: string;
        city: string; state: string; zip: string; country: string;
      } | null;

      const items = itemsByOrderId.get(order.id) || [];

      xml += `  <Order>\n`;
      xml += `    <OrderID>${escapeXml(order.id)}</OrderID>\n`;
      xml += `    <OrderNumber>${escapeXml(order.orderNumber)}</OrderNumber>\n`;
      xml += `    <OrderDate>${formatSSDate(order.createdAt)}</OrderDate>\n`;
      xml += `    <LastModified>${formatSSDate(order.updatedAt)}</LastModified>\n`;
      xml += `    <OrderStatus>paid</OrderStatus>\n`;
      xml += `    <ShippingMethod>UPS 2nd Day Air</ShippingMethod>\n`;
      xml += `    <PaymentMethod>${escapeXml(order.paymentGateway || "other")}</PaymentMethod>\n`;
      xml += `    <CurrencyCode>USD</CurrencyCode>\n`;
      xml += `    <OrderTotal>${(order.total / 100).toFixed(2)}</OrderTotal>\n`;
      xml += `    <TaxAmount>0.00</TaxAmount>\n`;
      xml += `    <ShippingAmount>${(order.shippingCost / 100).toFixed(2)}</ShippingAmount>\n`;
      xml += `    <CustomerNotes></CustomerNotes>\n`;
      xml += `    <InternalNotes>${escapeXml(order.notes || "")}</InternalNotes>\n`;
      xml += `    <Gift>false</Gift>\n`;

      // Customer
      xml += `    <Customer>\n`;
      xml += `      <CustomerCode>${escapeXml(order.email)}</CustomerCode>\n`;
      xml += `      <BillTo>\n`;
      xml += `        <Name>${escapeXml(shipping ? `${shipping.firstName} ${shipping.lastName}` : "")}</Name>\n`;
      xml += `        <Phone></Phone>\n`;
      xml += `        <Email>${escapeXml(order.email)}</Email>\n`;
      xml += `      </BillTo>\n`;
      xml += `      <ShipTo>\n`;
      xml += `        <Name>${escapeXml(shipping ? `${shipping.firstName} ${shipping.lastName}` : "")}</Name>\n`;
      xml += `        <Address1>${escapeXml(shipping?.address1 || "")}</Address1>\n`;
      xml += `        <Address2>${escapeXml(shipping?.address2 || "")}</Address2>\n`;
      xml += `        <City>${escapeXml(shipping?.city || "")}</City>\n`;
      xml += `        <State>${escapeXml(shipping?.state || "")}</State>\n`;
      xml += `        <PostalCode>${escapeXml(shipping?.zip || "")}</PostalCode>\n`;
      xml += `        <Country>${escapeXml(shipping?.country || "US")}</Country>\n`;
      xml += `        <Phone></Phone>\n`;
      xml += `      </ShipTo>\n`;
      xml += `    </Customer>\n`;

      // Items
      xml += `    <Items>\n`;
      for (const item of items) {
        xml += `      <Item>\n`;
        xml += `        <SKU>${escapeXml(item.variantSku)}</SKU>\n`;
        xml += `        <Name>${escapeXml(item.productName)} (${escapeXml(item.variantSize)})</Name>\n`;
        xml += `        <Quantity>${item.quantity}</Quantity>\n`;
        xml += `        <UnitPrice>${(item.unitPrice / 100).toFixed(2)}</UnitPrice>\n`;
        xml += `      </Item>\n`;
      }
      xml += `    </Items>\n`;

      xml += `  </Order>\n`;
    }

    xml += `</Orders>`;

    // Record poll activity for the admin telemetry pulse — fire-and-forget,
    // never blocks the response.
    recordShipStationPoll(pageOrders.length).catch((err) =>
      console.warn("[ShipStation Export] poll telemetry failed", err),
    );

    return new NextResponse(xml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[ShipStation Export]", error);
    return new NextResponse("<Orders pages=\"0\"></Orders>", {
      headers: { "Content-Type": "text/xml" },
    });
  }
}

// ── POST: ShipStation sends shipnotify when order ships ──
export async function POST(request: Request) {
  if (!verifyBasicAuth(request)) {
    return new NextResponse("Unauthorized", { status: 401, headers: { "WWW-Authenticate": "Basic" } });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action !== "shipnotify") {
    return new NextResponse("OK", { status: 200 });
  }

  try {
    // ShipStation sends XML body with tracking info
    const body = await request.text();

    // Parse tracking info from XML
    const orderNumber = body.match(/<OrderNumber>(.*?)<\/OrderNumber>/)?.[1] || "";
    const trackingNumber = body.match(/<TrackingNumber>(.*?)<\/TrackingNumber>/)?.[1] || "";
    const carrier = body.match(/<Carrier>(.*?)<\/Carrier>/)?.[1] || "";
    const service = body.match(/<Service>(.*?)<\/Service>/)?.[1] || "";

    if (!orderNumber || !trackingNumber) {
      return new NextResponse("OK", { status: 200 });
    }

    // Build tracking URL
    let trackingUrl = "";
    const carrierLower = carrier.toLowerCase();
    if (carrierLower.includes("fedex")) {
      trackingUrl = `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    } else if (carrierLower.includes("ups")) {
      trackingUrl = `https://www.ups.com/track?tracknum=${trackingNumber}`;
    } else if (carrierLower.includes("usps")) {
      trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    }

    // Update order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) {
      console.warn(`[ShipStation ShipNotify] Order ${orderNumber} not found`);
      return new NextResponse("OK", { status: 200 });
    }

    await db
      .update(orders)
      .set({
        status: "shipped",
        trackingNumber,
        trackingUrl: trackingUrl || null,
        trackingCarrier: carrier || service || "other",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // SMS notification via Twilio — fire-and-forget.
    sendShippedSMSForOrder(order.id).catch((err) =>
      console.warn(`[ShipStation Custom Store] SMS failed for ${orderNumber}:`, err),
    );

    // Send shipping confirmation email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://basedresearch.com";
    const shipping = order.shippingAddress as { firstName?: string } | null;

    await sendEmail({
      to: order.email,
      subject: `Your order ${orderNumber} has shipped! — Based Research`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
          <h1 style="font-size:22px;color:#1a1a19;margin-bottom:16px;">Based Research</h1>
          <h2 style="font-size:18px;color:#1a1a19;">Your Order Has Shipped!</h2>
          <p style="font-size:15px;color:#737373;line-height:1.6;">
            Hi ${shipping?.firstName || "there"}, your order <strong style="color:#1a1a19;">${orderNumber}</strong> is on its way!
          </p>
          <div style="background:#f5f5f0;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="font-size:14px;color:#1a1a19;margin:0 0 4px;"><strong>Tracking:</strong> ${trackingNumber}</p>
            <p style="font-size:14px;color:#1a1a19;margin:0;"><strong>Carrier:</strong> ${carrier || "UPS"}</p>
            ${trackingUrl ? `<p style="margin:8px 0 0;"><a href="${trackingUrl}" style="color:#1E3A5F;font-weight:600;">Track Your Package →</a></p>` : ""}
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${siteUrl}/account/orders" style="display:inline-block;background:#1E3A5F;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">View Order</a>
          </div>
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0;"/>
          <p style="font-size:11px;color:#999;text-align:center;">Based Research</p>
        </div>
      `,
    }).catch((err) => console.error(`[ShipNotify] Email failed for ${orderNumber}:`, err));

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[ShipStation ShipNotify]", error);
    return new NextResponse("OK", { status: 200 });
  }
}
