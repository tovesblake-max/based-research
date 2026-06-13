/**
 * Public COA listing API. Called by product detail pages to render the
 * "Lab Results" panel dynamically.
 *
 *   GET /api/coas                          → all active COAs (lab landing page)
 *   GET /api/coas?slug=ghk-cu              → active COAs for one product
 *   GET /api/coas?slug=ghk-cu&sku=GHK-50   → variant-specific or product-wide
 *                                            (variant-specific rows match the sku;
 *                                             product-wide rows where variant_sku
 *                                             IS NULL also match — they cover any variant)
 *
 * Returns metadata only (file binary served separately via /api/coas/[id]/file).
 * Always filters is_active=true so superseded uploads stay hidden.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { coas } from "@/lib/db/schema";
import { and, eq, desc, or, isNull } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const sku = searchParams.get("sku");

  const conditions = [eq(coas.isActive, true)];
  if (slug) {
    conditions.push(eq(coas.productSlug, slug));
    if (sku) {
      conditions.push(or(eq(coas.variantSku, sku), isNull(coas.variantSku))!);
    }
  }

  const rows = await db
    .select({
      id: coas.id,
      productSlug: coas.productSlug,
      variantSku: coas.variantSku,
      batchNumber: coas.batchNumber,
      fileName: coas.fileName,
      fileSize: coas.fileSize,
      testDate: coas.testDate,
      purityPercent: coas.purityPercent,
      labName: coas.labName,
      uploadedAt: coas.uploadedAt,
    })
    .from(coas)
    .where(and(...conditions))
    .orderBy(desc(coas.testDate), desc(coas.uploadedAt))
    .limit(200);

  return NextResponse.json({ coas: rows });
}
