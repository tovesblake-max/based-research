import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, orders, orderItems, subscriptions, subscriptionItems } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { count, gte, sql, desc, eq, and, lte, lt, inArray } from "drizzle-orm";
import { getShipStationPollHealth } from "@/lib/shipstation-telemetry";
import { computeOrderProfit, getVariantCostCents } from "@/lib/profit";

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    // Month-to-date — first millisecond of the current calendar month in
    // the server's local time. Distinct from the rolling 30d window
    // already in use (30d looks back exactly 720h regardless of month
    // boundary; MTD resets at midnight on the 1st).
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // Prior-month-to-same-day-of-month — used for MTD pacing comparison.
    // E.g. on April 12 we want sum from March 1 to March 12, NOT all of
    // March, so the customer can tell whether April is pacing ahead of
    // or behind March at the same point in the month.
    const priorMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const priorMonthThroughToday = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
    );
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // ── Core order aggregates (single query) ──────────────
    //
    // Revenue / order-count filters: `payment_status = 'completed'`.
    // This drops:
    //   - pending / unpaid orders (created but never paid)
    //   - failed payments (declines, gateway errors)
    //   - cancelled orders (admin-cancelled)
    //   - refunded orders (full refunds — net them out of revenue)
    //
    // Partial refunds keep status `confirmed`/`completed` and currently
    // show full amount here. Acceptable approximation; revisit when the
    // partial-refund volume justifies a refunds-aggregated subtraction.
    const [orderStats] = await db
      .select({
        totalOrders: count(),
        recentOrders: sql<number>`count(*) filter (where ${orders.createdAt} >= ${sevenDaysAgo})`,
        revenue30d: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.createdAt} >= ${thirtyDaysAgo} and ${orders.paymentStatus} = 'completed'), 0)`,
        revenue7d: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.createdAt} >= ${sevenDaysAgo} and ${orders.paymentStatus} = 'completed'), 0)`,
        revenueToday: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.createdAt} >= ${todayStart} and ${orders.paymentStatus} = 'completed'), 0)`,
        revenueYesterday: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.createdAt} >= ${yesterdayStart} and ${orders.createdAt} < ${todayStart} and ${orders.paymentStatus} = 'completed'), 0)`,
        // Month-to-date revenue + order count (paid orders only)
        revenueMtd: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.createdAt} >= ${monthStart} and ${orders.paymentStatus} = 'completed'), 0)`,
        ordersMtd: sql<number>`count(*) filter (where ${orders.createdAt} >= ${monthStart} and ${orders.paymentStatus} = 'completed')`,
        // Prior-month-to-same-point-in-time — for MTD pacing delta
        revenuePriorMtd: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.createdAt} >= ${priorMonthStart} and ${orders.createdAt} < ${priorMonthThroughToday} and ${orders.paymentStatus} = 'completed'), 0)`,
        // Abandoned-cart recovery value — sum of order totals for
        // status='pending'/payment_status='unpaid' carts. Aged-out
        // pending orders surface as "abandoned" via getDisplayStatus
        // client-side; this just totals the dollar value sitting on
        // the table waiting for payment-recovery follow-up.
        recoveryValue: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} = 'pending' and (${orders.paymentStatus} = 'unpaid' or ${orders.paymentStatus} is null)), 0)`,
        recoveryCount: sql<number>`count(*) filter (where ${orders.status} = 'pending' and (${orders.paymentStatus} = 'unpaid' or ${orders.paymentStatus} is null))`,
        ordersToday: sql<number>`count(*) filter (where ${orders.createdAt} >= ${todayStart} and ${orders.paymentStatus} = 'completed')`,
        ordersYesterday: sql<number>`count(*) filter (where ${orders.createdAt} >= ${yesterdayStart} and ${orders.createdAt} < ${todayStart} and ${orders.paymentStatus} = 'completed')`,
        aov30d: sql<number>`coalesce(avg(${orders.total}) filter (where ${orders.createdAt} >= ${thirtyDaysAgo} and ${orders.paymentStatus} = 'completed'), 0)`,
        pendingOrders: sql<number>`count(*) filter (where ${orders.status} = 'pending')`,
        processingOrders: sql<number>`count(*) filter (where ${orders.status} = 'processing')`,
        shippedOrders: sql<number>`count(*) filter (where ${orders.status} = 'shipped')`,
        flaggedOrders: sql<number>`count(*) filter (where ${orders.fraudScore} >= 60 and ${orders.status} != 'cancelled')`,
        // Needs-attention: unfulfilled orders older than 3 days (still pending/confirmed/processing)
        stuckOrders: sql<number>`count(*) filter (where ${orders.createdAt} < ${threeDaysAgo} and ${orders.status} in ('pending','confirmed','processing'))`,
        // Paid orders (last 30 days, completed payments only)
        paidCount30d: sql<number>`count(*) filter (where ${orders.createdAt} >= ${thirtyDaysAgo} and ${orders.paymentStatus} = 'completed')`,
        paidRevenue30d: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.createdAt} >= ${thirtyDaysAgo} and ${orders.paymentStatus} = 'completed'), 0)`,
      })
      .from(orders);

    // ── User aggregates ──────────────────────────────────
    const [userStats] = await db
      .select({
        totalUsers: count(),
        newToday: sql<number>`count(*) filter (where ${users.createdAt} >= ${todayStart})`,
        new7d: sql<number>`count(*) filter (where ${users.createdAt} >= ${sevenDaysAgo})`,
      })
      .from(users);

    // ── Subscription aggregates ──────────────────────────
    // MRR is computed as Σ(basePrice * quantity) across all active subs,
    // normalised to a 30-day cycle. Items locked at subscription creation
    // so no need to traverse the catalog.
    const subAgg = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        frequency: subscriptions.frequency,
        discountPercent: subscriptions.discountPercent,
        nextChargeDate: subscriptions.nextChargeDate,
        itemValue: sql<number>`coalesce((select sum(${subscriptionItems.basePrice} * ${subscriptionItems.quantity}) from ${subscriptionItems} where ${subscriptionItems.subscriptionId} = ${subscriptions.id}), 0)`,
      })
      .from(subscriptions);

    let activeCount = 0;
    let pausedCount = 0;
    let paymentFailedCount = 0;
    let cancelledCount = 0;
    let mrrCents = 0;
    let dueThisWeek = 0;

    for (const s of subAgg) {
      if (s.status === "active") activeCount++;
      else if (s.status === "paused") pausedCount++;
      else if (s.status === "payment_failed") paymentFailedCount++;
      else if (s.status === "cancelled") cancelledCount++;

      if (s.status === "active") {
        const itemValue = Number(s.itemValue);
        const discount = Math.round(itemValue * (s.discountPercent / 100));
        const netPerCycle = itemValue - discount;
        const cyclesPer30 = 30 / (s.frequency || 30);
        mrrCents += Math.round(netPerCycle * cyclesPer30);
        if (s.nextChargeDate && s.nextChargeDate <= sevenDaysFromNow) {
          dueThisWeek++;
        }
      }
    }

    // ── Time-series: revenue by day (last 30 days) ───────
    const revenueByDay = await db
      .select({
        day: sql<string>`to_char(${orders.createdAt}::date, 'YYYY-MM-DD')`,
        revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} != 'cancelled'), 0)`,
        orderCount: sql<number>`count(*) filter (where ${orders.status} != 'cancelled')`,
      })
      .from(orders)
      .where(gte(orders.createdAt, thirtyDaysAgo))
      .groupBy(sql`${orders.createdAt}::date`)
      .orderBy(sql`${orders.createdAt}::date asc`);

    // ── Top 10 products by revenue (30d) ─────────────────
    // Pull raw line items so we can compute COGS/profit per product
    // group in JS (cost data lives in src/lib/products.ts, not the DB).
    const topProductRows = await db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        variantSku: orderItems.variantSku,
        quantity: orderItems.quantity,
        lineTotal: orderItems.lineTotal,
      })
      .from(orderItems)
      .innerJoin(orders, sql`${orders.id} = ${orderItems.orderId}`)
      .where(
        sql`${orders.createdAt} >= ${thirtyDaysAgo} and ${orders.status} != 'cancelled'`
      );

    const topMap = new Map<
      string,
      { productId: string; productName: string; unitsSold: number; revenue: number; cogs: number; hasMissingCost: boolean }
    >();
    for (const r of topProductRows) {
      const key = `${r.productId}::${r.productName}`;
      const bucket = topMap.get(key) || {
        productId: r.productId,
        productName: r.productName,
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
        hasMissingCost: false,
      };
      bucket.unitsSold += r.quantity;
      bucket.revenue += r.lineTotal;
      const unitCost = getVariantCostCents(r.variantSku);
      if (unitCost == null) {
        bucket.hasMissingCost = true;
      } else {
        bucket.cogs += unitCost * r.quantity;
      }
      topMap.set(key, bucket);
    }
    const topProducts = Array.from(topMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // ── Signup geo (all-time top 15 states/countries) ────
    const signupGeo = await db
      .select({
        country: users.signupCountry,
        region: users.signupRegion,
        signups: count(),
      })
      .from(users)
      .where(sql`${users.signupCountry} is not null`)
      .groupBy(users.signupCountry, users.signupRegion)
      .orderBy(desc(count()))
      .limit(15);

    // ── Recent activity (last 15 orders, any status) ─────
    // Recent orders for the Overview widget. Filtered to ONLY orders that
    // actually went through (payment_status = 'completed') — the widget
    // is supposed to be a "here's what's selling" pulse, not a noise
    // dump of every abandoned auto-fire mint. Pending/failed/cancelled
    // rows still surface in the dedicated HV Follow-up + Orders tabs
    // where filtering by status is the explicit point.
    const recentOrdersList = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        email: orders.email,
        // Phone surfaced on the overview's recent-orders widget so
        // admin can tap-to-text a paid customer for a thank-you or
        // upsell follow-up without first jumping to the Orders tab.
        customerPhone: orders.customerPhone,
        total: orders.total,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentGateway: orders.paymentGateway,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.paymentStatus, "completed"))
      .orderBy(desc(orders.createdAt))
      .limit(15);

    // ── ShipStation poll telemetry ─────────────────────────────
    // Read the Redis-backed pulse for the custom-store integration so
    // admin can see whether ShipStation has actually been polling.
    const shipStationPoll = await getShipStationPollHealth();

    // ── Profit aggregates ──────────────────────────────────────
    // Sum profit across completed-payment orders, computed PER ORDER
    // (so each order's discount nets against its own line-total sum)
    // and then totaled. Doing this naively at the items level would
    // ignore order-level discounts and produce a profit > revenue,
    // which is exactly the bug we hit on day 1 with an affiliate's
    // BioCode-tier order ($606 retail subtotal, -$351 discount, $255
    // total — using lineTotals for revenue inflated profit).
    const paidOrdersToday = await db
      .select({ id: orders.id, discount: orders.discount })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, todayStart),
          eq(orders.paymentStatus, "completed"),
        ),
      );
    const paidOrders30d = await db
      .select({ id: orders.id, discount: orders.discount })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, thirtyDaysAgo),
          eq(orders.paymentStatus, "completed"),
        ),
      );
    const paidOrdersMtd = await db
      .select({ id: orders.id, discount: orders.discount })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, monthStart),
          eq(orders.paymentStatus, "completed"),
        ),
      );
    const paidOrdersYesterday = await db
      .select({ id: orders.id, discount: orders.discount })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, yesterdayStart),
          lt(orders.createdAt, todayStart),
          eq(orders.paymentStatus, "completed"),
        ),
      );
    // Prior month, same point in time — for MTD profit comparison.
    const paidOrdersPriorMtd = await db
      .select({ id: orders.id, discount: orders.discount })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, priorMonthStart),
          lt(orders.createdAt, priorMonthThroughToday),
          eq(orders.paymentStatus, "completed"),
        ),
      );

    async function aggregateProfit(
      ordersList: { id: string; discount: number | null }[],
    ) {
      if (ordersList.length === 0) {
        return { revenueCents: 0, cogsCents: 0, profitCents: 0, hasMissingCost: false };
      }
      const items = await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, ordersList.map((o) => o.id)));
      const itemsByOrderId = new Map<string, typeof items>();
      for (const it of items) {
        const arr = itemsByOrderId.get(it.orderId) || [];
        arr.push(it);
        itemsByOrderId.set(it.orderId, arr);
      }
      let revenue = 0,
        cogs = 0,
        profit = 0,
        missing = false;
      for (const o of ordersList) {
        const orderItemsForId = itemsByOrderId.get(o.id) || [];
        const p = computeOrderProfit(
          orderItemsForId.map((i) => ({
            variantSku: i.variantSku,
            quantity: i.quantity,
            lineTotal: i.lineTotal,
          })),
          { discountCents: o.discount ?? 0 },
        );
        revenue += p.revenueCents;
        cogs += p.cogsCents;
        profit += p.profitCents;
        if (p.hasMissingCost) missing = true;
      }
      return { revenueCents: revenue, cogsCents: cogs, profitCents: profit, hasMissingCost: missing };
    }

    const profitToday = await aggregateProfit(paidOrdersToday);
    const profitYesterday = await aggregateProfit(paidOrdersYesterday);
    const profit30d = await aggregateProfit(paidOrders30d);
    const profitMtd = await aggregateProfit(paidOrdersMtd);
    const profitPriorMtd = await aggregateProfit(paidOrdersPriorMtd);

    return NextResponse.json({
      shipStationPoll,
      stats: {
        // Counter cards
        totalUsers: userStats.totalUsers,
        newUsersToday: Number(userStats.newToday),
        newUsers7d: Number(userStats.new7d),
        totalOrders: orderStats.totalOrders,
        recentOrders: Number(orderStats.recentOrders),
        revenue30d: Number(orderStats.revenue30d),
        revenue7d: Number(orderStats.revenue7d),
        revenueToday: Number(orderStats.revenueToday),
        revenueYesterday: Number(orderStats.revenueYesterday),
        ordersToday: Number(orderStats.ordersToday),
        ordersYesterday: Number(orderStats.ordersYesterday),
        aov30d: Math.round(Number(orderStats.aov30d)),
        // Pipeline
        pendingOrders: Number(orderStats.pendingOrders),
        processingOrders: Number(orderStats.processingOrders),
        shippedOrders: Number(orderStats.shippedOrders),
        // Attention
        flaggedOrders: Number(orderStats.flaggedOrders),
        stuckOrders: Number(orderStats.stuckOrders),
        // Paid orders (30d)
        paidCount30d: Number(orderStats.paidCount30d),
        paidRevenue30d: Number(orderStats.paidRevenue30d),
        // Subscriptions
        subsActive: activeCount,
        subsPaused: pausedCount,
        subsPaymentFailed: paymentFailedCount,
        subsCancelled: cancelledCount,
        subsMrrCents: mrrCents,
        subsDueThisWeek: dueThisWeek,
        // Profit (paid orders only — gross margin on goods sold,
        // post-discount revenue minus per-SKU COGS. Doesn't subtract
        // shipping cost or card processing fees.)
        profitTodayCents: profitToday.profitCents,
        cogsTodayCents: profitToday.cogsCents,
        revenueTodayPaidCents: profitToday.revenueCents,
        profitTodayHasMissingCost: profitToday.hasMissingCost,
        profit30dCents: profit30d.profitCents,
        cogs30dCents: profit30d.cogsCents,
        revenue30dPaidCents: profit30d.revenueCents,
        profit30dHasMissingCost: profit30d.hasMissingCost,
        // Month-to-date — calendar month, paid orders only
        revenueMtdCents: Number(orderStats.revenueMtd),
        ordersMtd: Number(orderStats.ordersMtd),
        profitMtdCents: profitMtd.profitCents,
        cogsMtdCents: profitMtd.cogsCents,
        revenueMtdPaidCents: profitMtd.revenueCents,
        profitMtdHasMissingCost: profitMtd.hasMissingCost,
        // Yesterday — for Today's Profit delta
        profitYesterdayCents: profitYesterday.profitCents,
        // Prior month to same point in time — for MTD pacing delta
        revenuePriorMtdCents: Number(orderStats.revenuePriorMtd),
        profitPriorMtdCents: profitPriorMtd.profitCents,
        // Abandoned-cart recovery candidates — total dollar value
        // sitting in pending/unpaid orders waiting for follow-up
        recoveryValueCents: Number(orderStats.recoveryValue),
        recoveryCount: Number(orderStats.recoveryCount),
      },
      revenueByDay: revenueByDay.map((r) => ({
        day: r.day,
        revenue: Number(r.revenue),
        orderCount: Number(r.orderCount),
      })),
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        unitsSold: Number(p.unitsSold),
        revenue: Number(p.revenue),
        cogs: Number(p.cogs),
        profit: Number(p.revenue - p.cogs),
        marginPct: p.revenue > 0 ? Math.round(((p.revenue - p.cogs) / p.revenue) * 100) : null,
        hasMissingCost: p.hasMissingCost,
      })),
      signupGeo: signupGeo.map((g) => ({
        country: g.country,
        region: g.region,
        signups: Number(g.signups),
      })),
      recentOrders: recentOrdersList.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        email: o.email,
        customerPhone: o.customerPhone,
        total: o.total,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentGateway: o.paymentGateway,
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
