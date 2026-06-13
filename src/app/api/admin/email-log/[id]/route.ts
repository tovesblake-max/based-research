/**
 * Single email-log row, including the full HTML + text bodies. Pulled
 * separately from the list endpoint so the table view stays cheap
 * (each row's HTML can be tens of KB; we don't ship those over the
 * wire until admin opens the row).
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailLog } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id || id.length !== 36) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(emailLog)
    .where(eq(emailLog.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    log: {
      ...row,
      sentAt: row.sentAt instanceof Date ? row.sentAt.toISOString() : row.sentAt,
    },
  });
}
