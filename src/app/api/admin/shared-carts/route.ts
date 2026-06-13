import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sharedCarts } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { catalogProducts, getProductBySlug } from "@/lib/products";
import { desc } from "drizzle-orm";
import { z } from "zod";

// 6-char base32 slug — readable (no I/O/0/1), short enough for SMS,
// 30^6 = 729M values. Collision risk per insert is negligible at our
// volume; the unique constraint on `slug` backstops it.
const SLUG_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
function generateSlug(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
  }
  return s;
}

const createSchema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        variantSku: z.string().min(1),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(50),
  notes: z.string().max(500).optional(),
});

// GET — list recent shared carts (admin only)
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(sharedCarts)
    .orderBy(desc(sharedCarts.createdAt))
    .limit(50);

  return NextResponse.json({ sharedCarts: rows });
}

// POST — create a shared cart, return the slug + full URL
export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  // Validate every item against the live catalog. Reject SKUs that
  // don't resolve so we never mint a share that loads broken items
  // into the customer's cart.
  for (const item of parsed.data.items) {
    const product = getProductBySlug(item.slug);
    if (!product) {
      return NextResponse.json(
        { error: `Unknown product slug: ${item.slug}` },
        { status: 400 },
      );
    }
    const variant = product.variants.find((v) => v.sku === item.variantSku);
    if (!variant) {
      return NextResponse.json(
        { error: `Unknown variant ${item.variantSku} for ${item.slug}` },
        { status: 400 },
      );
    }
  }

  // Three retry attempts on slug collision before giving up. Realistic
  // ceiling — at 30^6 keyspace and small volume the first attempt
  // basically always succeeds.
  let inserted = null;
  for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
    const slug = generateSlug();
    try {
      const [row] = await db
        .insert(sharedCarts)
        .values({
          slug,
          items: parsed.data.items,
          notes: parsed.data.notes ?? null,
          createdBy: admin.id,
        })
        .returning();
      inserted = row;
    } catch (err) {
      // Unique-constraint collision → retry with a new slug
      if (attempt === 2) throw err;
    }
  }

  if (!inserted) {
    return NextResponse.json({ error: "Slug allocation failed" }, { status: 500 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://basedresearch.com").replace(/\/+$/, "");
  return NextResponse.json({
    sharedCart: inserted,
    url: `${siteUrl}/cart?share=${inserted.slug}`,
  }, { status: 201 });
}

// Helper for the admin UI — return the catalog as a flattened SKU list
// so the picker doesn't have to traverse nested variants client-side.
// Exposed via a separate /catalog-skus endpoint to keep this route
// focused on shared-cart CRUD. (See /api/admin/shared-carts/catalog.)
export const _CATALOG_FOR_PICKER = catalogProducts;
