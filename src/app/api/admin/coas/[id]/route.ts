/**
 * Admin COA per-row management.
 *
 *   PATCH /api/admin/coas/[id]        Update metadata or toggle is_active.
 *                                      Accepts JSON body. Fields: batchNumber,
 *                                      variantSku, testDate, purityPercent,
 *                                      labName, notes, isActive.
 *   DELETE /api/admin/coas/[id]       Hard-delete the row + file binary.
 *                                      Use isActive=false instead for soft-delete.
 *
 * Soft-delete (isActive=false) is the recommended path — it preserves the
 * audit trail of what we shipped to which customer. Hard-delete is only for
 * removing genuinely wrong uploads (e.g. accidentally uploaded internal
 * batch data that shouldn't ever have existed).
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { coas } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const patchSchema = z.object({
  batchNumber: z.string().min(1).max(100).optional(),
  variantSku: z.string().max(100).nullable().optional(),
  testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  purityPercent: z.number().min(0).max(100).nullable().optional(),
  labName: z.string().max(255).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (parsed.data.batchNumber !== undefined) patch.batchNumber = parsed.data.batchNumber;
  if (parsed.data.variantSku !== undefined) patch.variantSku = parsed.data.variantSku;
  if (parsed.data.testDate !== undefined) patch.testDate = parsed.data.testDate;
  if (parsed.data.purityPercent !== undefined) patch.purityPercent = parsed.data.purityPercent === null ? null : parsed.data.purityPercent.toFixed(2);
  if (parsed.data.labName !== undefined) patch.labName = parsed.data.labName;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;
  if (parsed.data.isActive !== undefined) patch.isActive = parsed.data.isActive;

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  const [updated] = await db
    .update(coas)
    .set(patch)
    .where(eq(coas.id, id))
    .returning({
      id: coas.id, productSlug: coas.productSlug, variantSku: coas.variantSku,
      batchNumber: coas.batchNumber, fileName: coas.fileName, fileSize: coas.fileSize,
      testDate: coas.testDate, purityPercent: coas.purityPercent, labName: coas.labName,
      notes: coas.notes, isActive: coas.isActive, uploadedAt: coas.uploadedAt,
    });

  if (!updated) return NextResponse.json({ error: "COA not found" }, { status: 404 });
  return NextResponse.json({ coa: updated });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const result = await db.delete(coas).where(eq(coas.id, id)).returning({ id: coas.id });
  if (result.length === 0) return NextResponse.json({ error: "COA not found" }, { status: 404 });
  return NextResponse.json({ ok: true, deletedId: id });
}
