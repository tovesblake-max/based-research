/**
 * Public file-stream endpoint for a single COA.
 *
 *   GET /api/coas/[id]/file        → streams the PDF binary
 *
 * Used by the product page download links + the public /coa landing. No
 * auth required; COAs are intentionally public proof-of-purity documents.
 * Inactive (superseded) rows still serve to preserve old links shared
 * with customers, since those customers may still want to verify the
 * batch on the vial they're holding.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { coas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [row] = await db
    .select({
      fileData: coas.fileData,
      fileName: coas.fileName,
      fileSize: coas.fileSize,
      mimeType: coas.mimeType,
      productSlug: coas.productSlug,
      batchNumber: coas.batchNumber,
    })
    .from(coas)
    .where(eq(coas.id, id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Friendly download filename: COA_{slug}_{batch}.pdf so customers saving
  // multiple COAs get sensible names in their downloads folder.
  const downloadName = `COA_${row.productSlug}_${row.batchNumber}.pdf`.replace(/[^A-Za-z0-9._-]/g, "_");

  return new NextResponse(new Uint8Array(row.fileData), {
    status: 200,
    headers: {
      "Content-Type": row.mimeType || "application/pdf",
      "Content-Length": String(row.fileSize),
      // inline so the browser previews the PDF; filename hint is still honored
      // on right-click → save.
      "Content-Disposition": `inline; filename="${downloadName}"`,
      // Cache aggressively. The COA at a given UUID never changes (we
      // supersede by inserting NEW rows, not by mutating). 1 year + immutable.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
