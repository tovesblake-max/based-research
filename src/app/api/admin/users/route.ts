import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, orders, orderItems, abandonedCarts, cartEvents } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { desc, count, ilike, or, and, inArray, eq, isNotNull } from "drizzle-orm";

/**
 * Per-user first-touch acquisition.
 *
 * Pulled from each user's EARLIEST completed order. Reflects how that
 * customer first came to us in the window that actually mattered (the
 * one that converted). Matches the rollup logic in
 * /api/admin/acquisition so the per-customer view sums to the same
 * totals.
 *
 * Leads (users with no completed order yet) have null acquisition —
 * we don't capture UTMs on signup or cart_events, only on order
 * submission. See followups in CLAUDE.md.
 */
interface UserAcquisition {
  source: string | null;        // utm_source
  medium: string | null;        // utm_medium
  campaign: string | null;      // utm_campaign
  content: string | null;       // utm_content (ad creative id)
  referrerDomain: string | null;
  landingPath: string | null;
  firstOrderAt: string;         // ISO date of the order this was captured on
}

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    // Phone search: strip non-digits from the input so "(405) 880-1465"
    // matches stored "+14058801465" just as well as a raw paste.
    const phoneDigits = search ? search.replace(/\D/g, "") : "";
    const where = search
      ? or(
          ilike(users.email, `%${search}%`),
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.phone, `%${search}%`),
          ...(phoneDigits.length >= 4
            ? [ilike(users.phone, `%${phoneDigits}%`)]
            : []),
        )
      : undefined;

    const [allUsers, [totalResult]] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          phone: users.phone,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          signupIp: users.signupIp,
          signupCountry: users.signupCountry,
          signupRegion: users.signupRegion,
          signupCity: users.signupCity,
          createdAt: users.createdAt,
          // Business identifiers captured at signup. EIN is encrypted at
          // rest — we never return it from a list endpoint, just a presence
          // flag (see hasEin below). Company name + business type are safe
          // to surface for admin support.
          companyName: users.companyName,
          businessType: users.researcherType,
          ein: users.ein,
        })
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(users).where(where),
    ]);

    // ── Per-user product interest ──
    // For each user on this page, collect the set of product slugs they've
    // either (a) purchased — via order_items joined to orders.user_id — or
    // (b) added to cart before abandoning — via abandoned_carts.items jsonb.
    // The two sets merge + dedupe in JS; rows are tiny (slug + name).
    const userIds = allUsers.map((u) => u.id);
    let interestsByUser = new Map<
      string,
      Array<{ slug: string; name: string; purchased: boolean }>
    >();

    if (userIds.length > 0) {
      // Purchased products — one row per (user, slug), with the product
      // display name. Distinct is handled in JS dedupe below.
      //
      // CRITICAL: filter on `payment_status = 'completed'`. Without this
      // gate, ANY order with a userId — including pending orders that
      // were minted when the customer clicked "Continue to Secure
      // Payment" but never actually paid — would tag the user as a
      // buyer. Hosted-checkout flows in particular can produce orphan
      // pending orders, and those customers were incorrectly showing
      // the green "✓ Buyer" pill in
      // the admin Customers list. Now: only customers whose payment
      // actually settled are counted as having "purchased" anything.
      const purchased = await db
        .select({
          userId: orders.userId,
          slug: orderItems.slug,
          name: orderItems.productName,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            isNotNull(orders.userId),
            inArray(orders.userId, userIds),
            eq(orders.paymentStatus, "completed"),
          ),
        );

      // Abandoned-cart items — items is a jsonb array of {slug, productName, ...}.
      // We fetch the whole array per user and flatten in JS since the shape
      // is small (<20 items) and SQL-level jsonb unrolling with Drizzle is
      // fiddly.
      const carts = await db
        .select({
          userId: abandonedCarts.userId,
          items: abandonedCarts.items,
        })
        .from(abandonedCarts)
        .where(
          and(
            isNotNull(abandonedCarts.userId),
            inArray(abandonedCarts.userId, userIds),
          ),
        );

      // Raw add-to-cart events — highest-volume source, dedupe via the
      // merge below. Every add click writes one row, so a user who
      // added BPC-157 four times shows up four times here but collapses
      // to a single pill.
      const cartClicks = await db
        .select({
          userId: cartEvents.userId,
          slug: cartEvents.slug,
          name: cartEvents.productName,
        })
        .from(cartEvents)
        .where(inArray(cartEvents.userId, userIds));

      // Merge into a Map<userId, Map<slug, {name, purchased}>>. We key by
      // slug so dedupe is deterministic and purchase flag wins over
      // browse-only when both apply.
      const merged = new Map<string, Map<string, { name: string; purchased: boolean }>>();
      for (const row of purchased) {
        if (!row.userId) continue;
        const bucket = merged.get(row.userId) ?? new Map();
        bucket.set(row.slug, { name: row.name, purchased: true });
        merged.set(row.userId, bucket);
      }
      for (const cart of carts) {
        if (!cart.userId) continue;
        const bucket = merged.get(cart.userId) ?? new Map();
        const items = Array.isArray(cart.items) ? cart.items : [];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const i = item as Record<string, unknown>;
          const slug = typeof i.slug === "string" ? i.slug : null;
          const name = typeof i.productName === "string" ? i.productName : slug;
          if (!slug || !name) continue;
          // Don't overwrite a purchased flag with a browse-only one.
          const existing = bucket.get(slug);
          bucket.set(slug, {
            name,
            purchased: existing?.purchased === true,
          });
        }
        merged.set(cart.userId, bucket);
      }
      // Every add-click that's not already a purchase/cart entry lands
      // here. Same rule: don't downgrade a purchased=true to false.
      for (const click of cartClicks) {
        if (!click.userId) continue;
        const bucket = merged.get(click.userId) ?? new Map();
        const existing = bucket.get(click.slug);
        bucket.set(click.slug, {
          name: click.name,
          purchased: existing?.purchased === true,
        });
        merged.set(click.userId, bucket);
      }

      interestsByUser = new Map(
        [...merged.entries()].map(([uid, slugMap]) => [
          uid,
          [...slugMap.entries()]
            .map(([slug, v]) => ({ slug, name: v.name, purchased: v.purchased }))
            // Purchased first, then alphabetical by name, so the pill row
            // leads with "paid for this" before "looked at this".
            .sort((a, b) => {
              if (a.purchased !== b.purchased) return a.purchased ? -1 : 1;
              return a.name.localeCompare(b.name);
            }),
        ]),
      );
    }

    // ── First-touch acquisition per user ──
    // For each user on this page, find their EARLIEST completed order's
    // UTM/referrer/landing data. Done via Drizzle's query builder +
    // JS-side dedupe instead of raw `DISTINCT ON ... ANY(uuid[])` because
    // the `@vercel/postgres` array binding for uuid[] doesn't survive
    // Drizzle's sql template safely.
    //
    // Leads (no completed orders) won't appear in this map. The UI
    // renders "—" for them.
    const acquisitionByUser = new Map<string, UserAcquisition>();
    if (userIds.length > 0) {
      const acqRows = await db
        .select({
          userId: orders.userId,
          utmSource: orders.utmSource,
          utmMedium: orders.utmMedium,
          utmCampaign: orders.utmCampaign,
          utmContent: orders.utmContent,
          referrerDomain: orders.referrerDomain,
          landingPath: orders.landingPath,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            isNotNull(orders.userId),
            inArray(orders.userId, userIds),
            eq(orders.paymentStatus, "completed"),
          ),
        )
        .orderBy(orders.userId, orders.createdAt);

      // Dedupe: keep the EARLIEST order per user. Iterate in order
      // (already sorted by created_at ASC inside each user_id group) and
      // first-wins via map.set on a key that's not yet present.
      for (const row of acqRows) {
        if (!row.userId || acquisitionByUser.has(row.userId)) continue;
        acquisitionByUser.set(row.userId, {
          source: row.utmSource || null,
          medium: row.utmMedium || null,
          campaign: row.utmCampaign || null,
          content: row.utmContent || null,
          referrerDomain: row.referrerDomain || null,
          landingPath: row.landingPath || null,
          firstOrderAt: row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : String(row.createdAt ?? ""),
        });
      }
    }

    const enrichedUsers = allUsers.map((u) => {
      const { ein, ...rest } = u;
      return {
        ...rest,
        interests: interestsByUser.get(u.id) ?? [],
        acquisition: acquisitionByUser.get(u.id) ?? null,
        // Presence flag only — never return the encrypted EIN from a list
        // endpoint. (A future single-user detail view can decrypt on demand
        // behind an explicit admin action + audit log.)
        hasEin: !!ein,
      };
    });

    return NextResponse.json({
      users: enrichedUsers,
      page,
      limit,
      total: totalResult.total,
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
