/**
 * Every-5-min cron: SMS-recover abandoned express checkouts.
 *
 * Triage:
 *   - Find orders with payment_status='unpaid' AND status='pending' AND
 *     created_at between 10 and 60 minutes ago AND customer_phone NOT NULL
 *     AND recovery_sms_sent_at IS NULL.
 *   - For each, normalize phone to E.164 and fire a single Twilio SMS.
 *   - Stamp recovery_sms_sent_at on success so the cron never re-fires.
 *
 * Why the 10-minute floor: gives the customer a real chance to complete
 * payment naturally. A processor's success webhook usually arrives within
 * a minute or two of capture, so anything still 'unpaid' after 10 min is
 * a genuine abandon, not a slow webhook.
 *
 * Why the 60-minute ceiling: past an hour the customer is gone — a "still
 * shopping?" SMS reads as creepy at that point. The /api/cron/cleanup-stale-orders
 * cron (every 6 hours) will mark the row as cancelled.
 *
 * Why a single SMS (not 3 like email): SMS is a more intrusive channel.
 * One nudge respects the customer's attention. Email recovery (with a
 * 3-stage sequence) handles the longer tail via the abandoned-carts cron.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, emailLog, users } from "@/lib/db/schema";
import {
  and,
  eq,
  isNull,
  gte,
  lte,
  isNotNull,
  inArray,
  notInArray,
  ne,
  or,
  not,
  ilike,
  sql,
} from "drizzle-orm";
import { sendSMS, normalizePhone } from "@/lib/twilio";

// Same internal-account exclusions used by /api/admin/hv-followup. We don't
// want the cron to fire recovery SMS to internal test accounts either.
// Configure via the EXCLUDED_INTERNAL_EMAILS env var (comma-separated).
const EXCLUDED_EMAILS_LOWER = (process.env.EXCLUDED_INTERNAL_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const EXCLUDED_EMAIL_PATTERNS = [
  "%@basedresearch.com",
  "%@example.com",
  "smoketest%",
  "%+test@%",
  "%test+%",
];

/**
 * Inline SMS-audit logger. The existing logEmailAttempt() in lib/email.ts
 * is private to that module AND hardcodes provider="mailtrap"; rather than
 * export + parameterize it (and risk regressing the email path), we write
 * directly to email_log here with provider="twilio". The Outbox UI already
 * shows whatever provider is on a row, so SMS sends slot in cleanly.
 */
async function logSmsAttempt(params: {
  toEmail: string;
  subject: string;
  template: string;
  status: "sent" | "failed";
  providerMessageId?: string | null;
  providerResponse?: string | null;
  errorMessage?: string | null;
  textBody: string;
  relatedOrderId: string;
}): Promise<void> {
  try {
    await db.insert(emailLog).values({
      toEmail: params.toEmail.toLowerCase(),
      subject: params.subject.slice(0, 500),
      template: params.template,
      status: params.status,
      provider: "twilio",
      providerMessageId: params.providerMessageId ?? null,
      providerResponse: params.providerResponse ?? null,
      errorMessage: params.errorMessage ?? null,
      htmlBody: null,
      textBody: params.textBody.slice(0, 4000),
      relatedOrderId: params.relatedOrderId,
    });
  } catch (err) {
    console.error("[abandoned-order-sms log] insert failed:", err);
  }
}

export async function GET(request: Request) {
  // Cron-secret auth — fail closed if unset.
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const tenMinAgo = new Date(now - 10 * 60 * 1000);
  const sixtyMinAgo = new Date(now - 60 * 60 * 1000);

  // Pull eligible candidates. Tight WHERE so this stays cheap as the
  // orders table grows. limit=50 caps the worst-case Twilio bill on a
  // single tick (50 × ~$0.008 = $0.40) and prevents one runaway cron
  // run from exhausting your Twilio balance if something upstream
  // floods unpaid orders.
  const patternConds = EXCLUDED_EMAIL_PATTERNS.map((p) =>
    not(ilike(orders.email, p)),
  );

  const candidates = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      email: orders.email,
      customerPhone: orders.customerPhone,
      total: orders.total,
      shippingAddress: orders.shippingAddress,
    })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.userId))
    .where(
      and(
        eq(orders.paymentStatus, "unpaid"),
        eq(orders.status, "pending"),
        isNotNull(orders.customerPhone),
        isNull(orders.recoverySmsSentAt),
        gte(orders.createdAt, sixtyMinAgo),
        lte(orders.createdAt, tenMinAgo),
        // Exclude admin-role users (NULL JOIN row = guest = passes through).
        or(isNull(users.role), ne(users.role, "admin")),
        // Exclude internal/test literal emails.
        notInArray(sql`lower(${orders.email})`, EXCLUDED_EMAILS_LOWER),
        // Pattern exclusions.
        ...patternConds,
      ),
    )
    .limit(50);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const successIds: string[] = [];

  for (const o of candidates) {
    const rawPhone = o.customerPhone || "";
    const phoneE164 = normalizePhone(rawPhone, "+1");
    if (!phoneE164) {
      skipped++;
      console.warn(`[abandoned-order-sms] ${o.orderNumber} phone "${rawPhone}" failed to normalize`);
      continue;
    }

    const sa = o.shippingAddress as { firstName?: string } | null;
    const firstName = sa?.firstName?.trim();
    const totalUsd = (o.total / 100).toFixed(2);

    // SMS copy. Single segment under 160 chars. Conversational tone.
    // No em-dashes anywhere per the operator's customer-copy style. Sender
    // identity is implicit since the recipient just hit our checkout
    // page minutes ago.
    const body = firstName
      ? `Hey ${firstName}, this is the team at Based Research. Your $${totalUsd} order didn't finish processing. Need a hand? Just reply.`
      : `Hi, this is the team at Based Research. Your $${totalUsd} order didn't finish processing. Need a hand? Just reply.`;

    try {
      const result = await sendSMS(phoneE164, body);
      if (result === null) {
        // Twilio not configured — log and skip without marking sent, so
        // when Twilio comes online the cron picks them back up.
        skipped++;
        console.warn(`[abandoned-order-sms] Twilio not configured, skipping ${o.orderNumber}`);
        continue;
      }
      successIds.push(o.id);
      sent++;

      // Best-effort audit log row — uses the email_log table with
      // provider="twilio" so the admin Outbox can show SMS sends
      // alongside emails. If the log write fails, the SMS still
      // counts as sent (the column stamp is what matters for idempotency).
      logSmsAttempt({
        toEmail: o.email,
        subject: `[SMS] Abandoned-order recovery → ${phoneE164}`,
        template: "abandoned_order_sms",
        status: "sent",
        providerMessageId: result.sid,
        providerResponse: JSON.stringify({ to: phoneE164, sid: result.sid }),
        textBody: body,
        relatedOrderId: o.id,
      }).catch((err) => console.warn(`[abandoned-order-sms] log write failed for ${o.orderNumber}:`, err));
    } catch (err) {
      failed++;
      console.error(`[abandoned-order-sms] ${o.orderNumber} send failed:`, err);
      // On failure, log to email_log so admin can see what went wrong.
      // Do NOT stamp recovery_sms_sent_at — let the next cron tick retry,
      // unless the order ages out (60-min ceiling) in which case it just
      // never gets one. That's the correct behavior for "we missed our window".
      logSmsAttempt({
        toEmail: o.email,
        subject: `[SMS] Abandoned-order recovery FAILED → ${phoneE164}`,
        template: "abandoned_order_sms",
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
        textBody: body,
        relatedOrderId: o.id,
      }).catch(() => {});
    }
  }

  // Stamp all successful sends in one batch — cheaper than per-row UPDATE.
  if (successIds.length > 0) {
    await db
      .update(orders)
      .set({ recoverySmsSentAt: new Date() })
      .where(inArray(orders.id, successIds));
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    sent,
    failed,
    skipped,
  });
}
