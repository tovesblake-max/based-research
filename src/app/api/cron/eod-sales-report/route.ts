import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { eq, and, gte, lt, inArray } from "drizzle-orm";
import { sendSMS } from "@/lib/twilio";
import { computeOrderProfit } from "@/lib/profit";

// End-of-day sales report — texts the admin a summary of today's
// activity at 11 PM CST (= 04:00 UTC of the following day, set in
// vercel.json). Authenticated via CRON_SECRET like every other cron.
//
// Body shape (≤ 320 chars to keep it under 2 SMS segments):
//   📊 EOD · Apr 30
//   $1,234 rev / $789 profit (64%)
//   5 orders · top: BPC-157 (3u, $336)
//   2 abandoned ($890 recovery $)
//   basedresearch.com/admin

const $ = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://basedresearch.com").replace(/\/+$/, "");

function getAdminPhone(): string | null {
  const raw = (process.env.ADMIN_NOTIFY_PHONE || "").trim();
  return /^\+\d{8,15}$/.test(raw) ? raw : null;
}

export async function GET(request: Request) {
  // Fail closed on missing CRON_SECRET — Vercel's scheduler sends the
  // header automatically; manual hits without it 401.
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminPhone = getAdminPhone();
  if (!adminPhone) {
    console.warn("[EOD Report] ADMIN_NOTIFY_PHONE not configured — skipping");
    return NextResponse.json({ skipped: "no_admin_phone" });
  }

  try {
    // Report covers the current calendar day in America/Chicago — the
    // day that's basically over by the time the cron fires (04:00 UTC =
    // 11 PM CDT or 10 PM CST). Window is [todayCstMidnight, now].
    //
    // Cross-DST math: format "now" through the en-US locale formatter
    // with timeZone: America/Chicago, then re-parse to get a Date that
    // represents the same wall-clock time in CST/CDT. Subtract the
    // hours/minutes/seconds to land at midnight CST, then convert back
    // to a real UTC timestamp by computing the offset between the two
    // representations.
    const now = new Date();
    const cstParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const get = (t: string) => Number(cstParts.find((p) => p.type === t)?.value || 0);
    const cstYear = get("year");
    const cstMonth = get("month") - 1;
    const cstDay = get("day");
    // To turn "midnight CST on cstDay" into a UTC timestamp, find the
    // offset between now (UTC) and now-as-seen-in-CST and apply.
    const nowAsCst = new Date(Date.UTC(cstYear, cstMonth, cstDay, get("hour"), get("minute"), get("second")));
    const offsetMs = now.getTime() - nowAsCst.getTime();
    const startUtc = new Date(Date.UTC(cstYear, cstMonth, cstDay, 0, 0, 0) + offsetMs);
    const endUtc = now;

    // Paid orders in window
    const paidOrders = await db
      .select({
        id: orders.id,
        total: orders.total,
        discount: orders.discount,
        paymentGateway: orders.paymentGateway,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, startUtc),
          lt(orders.createdAt, endUtc),
          eq(orders.paymentStatus, "completed"),
        ),
      );

    const orderCount = paidOrders.length;
    const revenue = paidOrders.reduce((s, o) => s + o.total, 0);

    // Profit aggregation per-order so each order's discount nets right.
    let profit = 0;
    let topItemBySku = new Map<string, { name: string; units: number; revenue: number }>();
    if (orderCount > 0) {
      const items = await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, paidOrders.map((o) => o.id)));
      const itemsByOrderId = new Map<string, typeof items>();
      for (const it of items) {
        const arr = itemsByOrderId.get(it.orderId) || [];
        arr.push(it);
        itemsByOrderId.set(it.orderId, arr);
      }
      for (const o of paidOrders) {
        const ordItems = itemsByOrderId.get(o.id) || [];
        const p = computeOrderProfit(
          ordItems.map((i) => ({
            variantSku: i.variantSku,
            quantity: i.quantity,
            lineTotal: i.lineTotal,
          })),
          { discountCents: o.discount ?? 0 },
        );
        profit += p.profitCents;
      }
      // Top-product roll-up (by revenue across the day)
      for (const it of items) {
        const bucket = topItemBySku.get(it.variantSku) || {
          name: it.productName,
          units: 0,
          revenue: 0,
        };
        bucket.units += it.quantity;
        bucket.revenue += it.lineTotal;
        topItemBySku.set(it.variantSku, bucket);
      }
    }
    const top = Array.from(topItemBySku.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 1)[0];

    const marginPct = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

    // Abandoned-cart recovery snapshot — total dollar value sitting in
    // pending/unpaid orders right now (rolling, not yesterday-only).
    const abandoned = await db
      .select({ total: orders.total })
      .from(orders)
      .where(
        and(
          eq(orders.status, "pending"),
          eq(orders.paymentStatus, "unpaid"),
        ),
      );
    const abandonedTotal = abandoned.reduce((s, o) => s + o.total, 0);

    // Date label = the calendar day we're reporting on (today CST).
    const dateLabel = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      month: "short",
      day: "numeric",
    }).format(now);

    let body = `📊 EOD · ${dateLabel}\n`;
    if (orderCount === 0) {
      body += `No paid orders today.\n`;
    } else {
      body += `${$(revenue)} rev / ${$(profit)} profit (${marginPct}%)\n`;
      body += `${orderCount} order${orderCount === 1 ? "" : "s"}`;
      if (top) {
        body += ` · top: ${top[1].name} (${top[1].units}u, ${$(top[1].revenue)})`;
      }
      body += `\n`;
    }
    if (abandoned.length > 0) {
      body += `${abandoned.length} abandoned (${$(abandonedTotal)} recovery $)\n`;
    }
    body += `${SITE_URL}/admin`;

    await sendSMS(adminPhone, body);
    console.log(`[EOD Report] sent — ${dateLabel}: ${orderCount} orders, ${$(revenue)} rev`);

    return NextResponse.json({
      ok: true,
      date: dateLabel,
      orderCount,
      revenueCents: revenue,
      profitCents: profit,
      abandonedCount: abandoned.length,
      abandonedValueCents: abandonedTotal,
    });
  } catch (err) {
    console.error("[EOD Report] failed:", err);
    return NextResponse.json({ error: "EOD report failed" }, { status: 500 });
  }
}
