/**
 * Admin "Send thank-you SMS" stamp endpoint.
 *
 * Called by the admin Orders tab when the operator clicks the
 * "Send thank-you" button. The actual SMS authoring happens in
 * iMessage (the button opens an `sms:` URL with a pre-populated body
 * — see OrdersTab UI). This endpoint just records that the operator
 * INITIATED the outreach so the UI can render "Thanked Xm ago" and
 * avoid double-sending.
 *
 * Body shape:
 *   { orderId: string }
 *
 * Response:
 *   { ok: true, thankYouSmsSentAt: ISO string }
 *
 * Re-stamping via this endpoint overwrites the previous timestamp,
 * which is the desired behavior — admin sometimes needs to follow up
 * a second time and wants the most-recent contact recorded.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let orderId: string;
  try {
    const body = await request.json();
    orderId = String(body?.orderId || "");
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    return NextResponse.json({ error: "invalid orderId" }, { status: 400 });
  }

  const now = new Date();
  const [updated] = await db
    .update(orders)
    .set({ thankYouSmsSentAt: now, updatedAt: now })
    .where(eq(orders.id, orderId))
    .returning({
      id: orders.id,
      thankYouSmsSentAt: orders.thankYouSmsSentAt,
    });

  if (!updated) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    thankYouSmsSentAt:
      updated.thankYouSmsSentAt instanceof Date
        ? updated.thankYouSmsSentAt.toISOString()
        : updated.thankYouSmsSentAt,
  });
}
