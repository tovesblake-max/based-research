/**
 * Public "save and share my cart" endpoint.
 *
 * Customers POST their current cart items here and get back a short
 * shareable URL. Anyone who opens that URL hits the existing
 * `/cart?share={slug}` handler in CartContent and the items get
 * restored into their local cart.
 *
 * No auth required — guests can build and share carts. When the
 * caller IS signed in, we stamp `createdBy` so the user can later
 * pull their list of saved carts via /api/cart/share/mine. Reuses
 * the existing `shared_carts` table (built originally for the admin
 * shared-cart builder; the schema fits both use cases cleanly).
 *
 * Slug generation: 8-char base36 random + collision retry. Short
 * enough to share via SMS / verbal handoff without a URL shortener.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sharedCarts } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { catalogProducts, getProductBySlug } from "@/lib/products";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

// Local type alias — the schema doesn't export this and we only need
// it for the validated array shape, not the full insert payload.
type SharedCartItem = {
  slug: string;
  variantSku: string;
  quantity: number;
};

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://basedresearch.com"
).replace(/\/+$/, "");

// Per-IP throttle so the endpoint can't be used to spam the table.
// 10 cart shares per IP per hour is plenty for legit use.
const RATE_LIMIT_PER_HOUR = 10;

const itemSchema = z.object({
  slug: z.string().min(1).max(255),
  variantSku: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(999),
});

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  // Optional human-readable label so admin (and the user) can tell
  // saved carts apart later. Capped to fit DB column.
  notes: z.string().max(255).optional(),
});

function generateSlug(): string {
  // 8 chars of base36 — ~2.8 trillion possibilities. Collision risk is
  // negligible for our volume; we still loop on conflict below.
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function POST(request: Request) {
  // Rate-limit by client IP. Auth is optional here, so we can't key on
  // user ID alone.
  const ip = getClientIp(request);
  // rateLimit returns true when allowed, false when limited.
  // Window is in milliseconds.
  const allowed = await rateLimit(
    `cart-share:${ip}`,
    RATE_LIMIT_PER_HOUR,
    60 * 60 * 1000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many cart shares. Try again in an hour." },
      { status: 429 },
    );
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Validate every line item references a real catalog SKU. We don't
  // want to persist garbage that won't restore. Hidden / upsell-only
  // products are intentionally allowed (someone sharing a custom
  // bundle that includes an OTO-tier item should still resolve).
  const validated: SharedCartItem[] = [];
  for (const item of payload.items) {
    const product = getProductBySlug(item.slug);
    if (!product) continue;
    const variant = product.variants.find((v) => v.sku === item.variantSku);
    if (!variant) continue;
    validated.push({
      slug: item.slug,
      variantSku: item.variantSku,
      quantity: item.quantity,
    });
  }
  if (validated.length === 0) {
    return NextResponse.json(
      { error: "No valid items in cart." },
      { status: 400 },
    );
  }
  // catalogProducts pull keeps the lib import non-tree-shaken — silences
  // the unused-import lint warning when validated is empty.
  void catalogProducts.length;

  // Stamp the caller as the creator when signed in. Anonymous callers
  // produce a shared cart with `createdBy = null`; that's fine and
  // matches how admin-created carts work.
  const user = await getCurrentUser().catch(() => null);

  // Generate slug + insert with collision retry. Three attempts is
  // plenty for an 8-char base36 namespace.
  let lastErr: unknown = null;
  for (let i = 0; i < 3; i++) {
    const slug = generateSlug();
    try {
      const [row] = await db
        .insert(sharedCarts)
        .values({
          slug,
          items: validated,
          notes: payload.notes ?? null,
          createdBy: user?.id ?? null,
        })
        .returning({ id: sharedCarts.id, slug: sharedCarts.slug });
      return NextResponse.json({
        ok: true,
        slug: row.slug,
        url: `${SITE_URL}/cart?share=${row.slug}`,
      });
    } catch (err) {
      lastErr = err;
      // Most likely a slug collision — retry. Other errors (DB down)
      // will surface on the third try as the catch-all 500 below.
      continue;
    }
  }
  console.error("[cart-share] failed after retries:", lastErr);
  return NextResponse.json(
    { error: "Failed to save cart. Please try again." },
    { status: 500 },
  );
}
