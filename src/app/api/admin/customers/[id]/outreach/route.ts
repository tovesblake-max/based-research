/**
 * Log an admin-initiated outreach touch to a specific customer.
 *
 * POSTed from the admin Customers tab when the operator clicks "Text" on a
 * customer row. The client navigates to the `sms:` URL separately —
 * this endpoint only writes the audit row. Fire-and-forget from the
 * client's perspective; the sms: handoff to Messages.app happens
 * regardless of whether this logging call succeeds.
 *
 * Schema lives in adminOutreach. One row per click.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminOutreach, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { captureEvent } from "@/lib/posthog";

const bodySchema = z.object({
  channel: z.enum(["sms", "email", "call"]),
  templateKey: z.string().max(50).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: customerId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(customerId)) {
    return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  // Resolve the customer — we want to snapshot the phone at click time
  // so later renames/reassignments don't obscure what was sent.
  const [customer] = await db
    .select({ id: users.id, phone: users.phone, email: users.email })
    .from(users)
    .where(eq(users.id, customerId))
    .limit(1);

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const recipient =
    parsed.data.channel === "sms"
      ? customer.phone ?? null
      : parsed.data.channel === "email"
        ? customer.email ?? null
        : null;

  await db.insert(adminOutreach).values({
    adminId: admin.id,
    customerId,
    channel: parsed.data.channel,
    recipient,
    templateKey: parsed.data.templateKey ?? null,
  });

  // PostHog event so outreach activity rolls into the same funnel
  // dashboards as everything else. Non-fatal on failure.
  captureEvent({
    distinctId: admin.id,
    event: "admin_outreach_click",
    properties: {
      channel: parsed.data.channel,
      customerId,
      templateKey: parsed.data.templateKey,
    },
  }).catch((err) => console.warn("[admin-outreach] posthog capture failed", err));

  return NextResponse.json({ ok: true });
}
