/**
 * Admin endpoint: list contact submissions (support chat + COA
 * requests + any future inbound forms that POST to /api/contact).
 *
 * The same `contact_submissions` table backs all three sources; we
 * disambiguate in the UI on `subject`.
 *
 * Filters:
 *   ?status=new|read|replied|archived  → status filter
 *   ?subject=COA Request               → exact-match subject filter
 *   ?search=<term>                     → ILIKE on name/email/message
 *   ?page=1                            → pagination, 30 per page
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contactSubmissions } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { desc, count, ilike, or, eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const subject = searchParams.get("subject");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = 30;
    const offset = (page - 1) * limit;

    const filters = [];
    if (status) filters.push(eq(contactSubmissions.status, status));
    if (subject) filters.push(eq(contactSubmissions.subject, subject));
    if (search) {
      filters.push(
        or(
          ilike(contactSubmissions.name, `%${search}%`),
          ilike(contactSubmissions.email, `%${search}%`),
          ilike(contactSubmissions.message, `%${search}%`),
        )!,
      );
    }
    const where = filters.length > 0 ? and(...filters) : undefined;

    const [rows, [totalRow]] = await Promise.all([
      db
        .select()
        .from(contactSubmissions)
        .where(where)
        .orderBy(desc(contactSubmissions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(contactSubmissions).where(where),
    ]);

    return NextResponse.json({
      messages: rows,
      page,
      limit,
      total: totalRow.total,
    });
  } catch (err) {
    console.error("[admin contact list]", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
