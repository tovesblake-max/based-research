import { NextResponse } from "next/server";

/**
 * Subscription renewal cron — no-op in this template.
 *
 * The subscription data model exists (see schema.ts) and customers can
 * pause / cancel / reschedule existing subscriptions, but there is no
 * payment processor wired to charge renewals. To enable recurring billing,
 * wire your processor here: load due subscriptions, charge them via the
 * provider's stored billing token (subscriptions.billingReference), create
 * the renewal order, and run fulfillment.
 *
 * This route is intentionally NOT scheduled in vercel.json. It returns a
 * no-op so a manual invocation can never charge anyone.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, disabled: "no_payment_processor", charged: 0 });
}
