/**
 * Admin Outbox — paginated read of every email send.
 *
 * Query params:
 *   - limit    (default 50, max 500)
 *   - offset   (default 0)
 *   - q        (substring search against to_email + subject)
 *   - template (exact match against email_log.template)
 *   - status   ("sent" | "failed")
 *   - days     (default 30, max 365 — windowed against sent_at)
 *
 * Returns rows newest-first plus a totals block (sent/failed counts in
 * window) so the UI can show headline metrics without a second query.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailLog } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "50", 10)));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));
  const q = (searchParams.get("q") || "").trim();
  const template = (searchParams.get("template") || "").trim();
  const statusFilter = (searchParams.get("status") || "").trim();
  const days = Math.max(1, Math.min(365, parseInt(searchParams.get("days") || "30", 10)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Build the where clause progressively. Drizzle's `and()` accepts
  // `undefined` entries (filters them out) so optional filters compose
  // cleanly without nested ternaries.
  const conditions = [gte(emailLog.sentAt, since)];
  if (q) {
    const pattern = `%${q.toLowerCase()}%`;
    conditions.push(
      or(ilike(emailLog.toEmail, pattern), ilike(emailLog.subject, pattern))!,
    );
  }
  if (template) conditions.push(eq(emailLog.template, template));
  if (statusFilter === "sent" || statusFilter === "failed") {
    conditions.push(eq(emailLog.status, statusFilter));
  }
  const whereExpr = and(...conditions);

  // Page rows + totals + distinct templates in window — three queries
  // in parallel since they share the same time bound. Distinct
  // templates power the filter dropdown in the UI.
  const [rows, totalsRows, templatesRows] = await Promise.all([
    db
      .select({
        id: emailLog.id,
        toEmail: emailLog.toEmail,
        subject: emailLog.subject,
        template: emailLog.template,
        status: emailLog.status,
        provider: emailLog.provider,
        providerMessageId: emailLog.providerMessageId,
        errorMessage: emailLog.errorMessage,
        relatedOrderId: emailLog.relatedOrderId,
        relatedUserId: emailLog.relatedUserId,
        sentAt: emailLog.sentAt,
      })
      .from(emailLog)
      .where(whereExpr)
      .orderBy(desc(emailLog.sentAt))
      .limit(limit)
      .offset(offset),
    db
      .select({
        total: sql<number>`count(*)`,
        sent: sql<number>`count(*) filter (where ${emailLog.status} = 'sent')`,
        failed: sql<number>`count(*) filter (where ${emailLog.status} = 'failed')`,
      })
      .from(emailLog)
      .where(whereExpr),
    db
      .select({
        template: emailLog.template,
        count: sql<number>`count(*)`,
      })
      .from(emailLog)
      .where(gte(emailLog.sentAt, since))
      .groupBy(emailLog.template),
  ]);

  const totals = totalsRows[0] || { total: 0, sent: 0, failed: 0 };

  return NextResponse.json({
    days,
    limit,
    offset,
    rows: rows.map((r) => ({
      ...r,
      sentAt: r.sentAt instanceof Date ? r.sentAt.toISOString() : r.sentAt,
    })),
    totals: {
      total: Number(totals.total),
      sent: Number(totals.sent),
      failed: Number(totals.failed),
    },
    templates: templatesRows
      .map((t) => ({ template: t.template ?? "(untagged)", count: Number(t.count) }))
      .sort((a, b) => b.count - a.count),
  });
}
