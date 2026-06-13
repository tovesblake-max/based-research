import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { subscribeWebhook, listWebhooks } from "@/lib/shipstation";
import { pushOrderToShipStation } from "@/lib/fulfillment";

// GET — list registered webhooks
export async function GET() {
  try {
    await requireAdmin();
    const webhooks = await listWebhooks();
    return NextResponse.json({ webhooks });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

// POST — register SHIP_NOTIFY webhook or manually push an order
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();

    if (body.action === "register_webhook") {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://basedresearch.com";
      const result = await subscribeWebhook(`${siteUrl}/api/webhooks/shipstation`, "SHIP_NOTIFY");
      return NextResponse.json({ message: "Webhook registered", result });
    }

    if (body.action === "push_order" && body.orderId) {
      const result = await pushOrderToShipStation(body.orderId);
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Admin ShipStation]", error);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
