/**
 * Admin COA management API.
 *
 *   GET  /api/admin/coas              List all COAs (optionally filter by product_slug)
 *   POST /api/admin/coas              Upload a new COA (multipart/form-data)
 *
 * Upload flow:
 *   1. POST multipart/form-data with:
 *        file (PDF, ≤10MB)
 *        product_slug (catalog slug)
 *        variant_sku (optional)
 *        batch_number (lot identifier)
 *        test_date (optional, YYYY-MM-DD)
 *        purity_percent (optional, e.g. "99.21")
 *        lab_name (optional)
 *        notes (optional)
 *   2. Server validates the slug against the catalog, reads the file into
 *      a Buffer, and inserts a row.
 *   3. If a prior COA exists for the same (product_slug, batch_number),
 *      the old row gets is_active=false (supersede pattern). Two distinct
 *      batches stay independently visible.
 *   4. Returns the new row metadata (NOT the file binary).
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { coas, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getProductBySlug } from "@/lib/products";
import { and, eq, desc, sql } from "drizzle-orm";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(["application/pdf"]);

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const includeInactive = searchParams.get("include_inactive") === "1";

  // Select WITHOUT file_data — file binaries are heavy; admin list view
  // never needs them inline. The detail/download route streams them on demand.
  const conditions = [];
  if (slug) conditions.push(eq(coas.productSlug, slug));
  if (!includeInactive) conditions.push(eq(coas.isActive, true));

  const rows = await db
    .select({
      id: coas.id,
      productSlug: coas.productSlug,
      variantSku: coas.variantSku,
      batchNumber: coas.batchNumber,
      fileName: coas.fileName,
      fileSize: coas.fileSize,
      mimeType: coas.mimeType,
      testDate: coas.testDate,
      purityPercent: coas.purityPercent,
      labName: coas.labName,
      notes: coas.notes,
      isActive: coas.isActive,
      uploadedAt: coas.uploadedAt,
      uploadedBy: coas.uploadedBy,
      uploaderEmail: users.email,
      uploaderFirstName: users.firstName,
    })
    .from(coas)
    .leftJoin(users, eq(users.id, coas.uploadedBy))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(coas.uploadedAt))
    .limit(500);

  return NextResponse.json({ coas: rows });
}

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)` }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: `Unsupported mime type: ${file.type}. PDFs only.` }, { status: 415 });
  }

  const productSlug = String(form.get("product_slug") || "").trim();
  if (!productSlug) {
    return NextResponse.json({ error: "product_slug is required" }, { status: 400 });
  }
  const product = getProductBySlug(productSlug);
  if (!product) {
    return NextResponse.json({ error: `Unknown product_slug: ${productSlug}` }, { status: 400 });
  }

  const variantSku = String(form.get("variant_sku") || "").trim() || null;
  if (variantSku && !product.variants.some((v) => v.sku === variantSku)) {
    return NextResponse.json({ error: `Unknown variant_sku ${variantSku} for product ${productSlug}` }, { status: 400 });
  }

  const batchNumber = String(form.get("batch_number") || "").trim();
  if (!batchNumber) {
    return NextResponse.json({ error: "batch_number is required" }, { status: 400 });
  }

  const testDateRaw = String(form.get("test_date") || "").trim();
  const testDate = testDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(testDateRaw) ? testDateRaw : null;

  const purityRaw = String(form.get("purity_percent") || "").trim();
  let purityPercent: string | null = null;
  if (purityRaw) {
    const n = Number(purityRaw);
    if (Number.isFinite(n) && n >= 0 && n <= 100) purityPercent = n.toFixed(2);
  }

  const labName = String(form.get("lab_name") || "").trim() || null;
  const notes = String(form.get("notes") || "").trim() || null;

  const buffer = Buffer.from(await file.arrayBuffer());

  // Supersede: any prior is_active=true row for the SAME (slug, batch) gets
  // flipped to inactive. Different batches coexist; same batch always wins
  // most-recent. Variant-specificity doesn't enter the supersede key — a
  // re-upload for the same batch fully replaces, even if the variant
  // scoping changed.
  await db
    .update(coas)
    .set({ isActive: false })
    .where(
      and(
        eq(coas.productSlug, productSlug),
        eq(coas.batchNumber, batchNumber),
        eq(coas.isActive, true),
      ),
    );

  const [inserted] = await db
    .insert(coas)
    .values({
      productSlug,
      variantSku,
      batchNumber,
      fileData: buffer,
      fileName: file.name,
      fileSize: buffer.length,
      mimeType: file.type,
      testDate,
      purityPercent,
      labName,
      notes,
      uploadedBy: admin.id,
    })
    .returning({
      id: coas.id,
      productSlug: coas.productSlug,
      variantSku: coas.variantSku,
      batchNumber: coas.batchNumber,
      fileName: coas.fileName,
      fileSize: coas.fileSize,
      isActive: coas.isActive,
      uploadedAt: coas.uploadedAt,
    });

  return NextResponse.json({ coa: inserted }, { status: 201 });
}
