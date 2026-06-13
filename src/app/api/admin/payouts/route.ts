import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payouts, commissions, affiliates } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { and, eq, desc, inArray, sql } from "drizzle-orm";

// GET — list all payouts. Auth catch is narrow so DB errors below
// don't get masked as "Forbidden".
export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    const m = (err as Error).message;
    return NextResponse.json(
      { error: m === "Unauthorized" ? "Please sign in" : "Forbidden" },
      { status: m === "Unauthorized" ? 401 : 403 },
    );
  }
  try {
    const allPayouts = await db
      .select()
      .from(payouts)
      .orderBy(desc(payouts.createdAt))
      .limit(50);
    return NextResponse.json({ payouts: allPayouts });
  } catch (err) {
    console.error("[Admin Payouts] list", err);
    return NextResponse.json({ error: "Failed to load payouts" }, { status: 500 });
  }
}

// POST — create a new payout (select commissions, mark as paid).
//
// Race-safe pattern: instead of (read commissions → validate → insert
// payout → mark commissions paid) which lets two concurrent POSTs both
// pass validation and double-pay, we ATOMICALLY claim the commissions
// in a single UPDATE that filters on `status='pending'`. Only the rows
// that actually flipped from pending → claimed are consumed; everything
// else either stays untouched (if already paid by a prior call) or is
// caught by the affiliate-mismatch check.
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    const m = (err as Error).message;
    return NextResponse.json(
      { error: m === "Unauthorized" ? "Please sign in" : "Forbidden" },
      { status: m === "Unauthorized" ? 401 : 403 },
    );
  }

  try {
    const { affiliateId, commissionIds, transactionReference } = await request.json();

    if (!affiliateId || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return NextResponse.json(
        { error: "affiliateId and commissionIds[] required" },
        { status: 400 },
      );
    }

    const [affiliate] = await db
      .select({ payoutMethod: affiliates.payoutMethod })
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    // Atomic claim. Returns ONLY the rows that successfully transitioned
    // from `pending` → `claimed` AND belong to this affiliate. A second
    // concurrent POST with overlapping IDs claims zero rows (or only
    // unclaimed leftovers) and exits cleanly without double-paying.
    const now = new Date();
    const claimed = await db
      .update(commissions)
      .set({ status: "paid", paidAt: now })
      .where(
        and(
          inArray(commissions.id, commissionIds),
          eq(commissions.affiliateId, affiliateId),
          eq(commissions.status, "pending"),
        ),
      )
      .returning({ id: commissions.id, amount: commissions.commissionAmount });

    if (claimed.length === 0) {
      return NextResponse.json(
        {
          error:
            "None of the selected commissions are eligible — they may already be paid, belong to a different affiliate, or have been claimed by a concurrent payout.",
        },
        { status: 409 },
      );
    }

    // If a subset of the requested IDs were skipped (already paid /
    // wrong affiliate), tell the caller so they know the payout amount
    // doesn't match what they expected.
    const skipped = commissionIds.filter(
      (id: string) => !claimed.find((c) => c.id === id),
    );

    const totalAmount = claimed.reduce((sum, c) => sum + c.amount, 0);
    const isCompleted = !!transactionReference;

    const [payout] = await db
      .insert(payouts)
      .values({
        affiliateId,
        amount: totalAmount,
        method: affiliate.payoutMethod,
        commissionIds: claimed.map((c) => c.id),
        transactionReference: transactionReference || null,
        status: isCompleted ? "completed" : "pending",
        completedAt: isCompleted ? new Date() : null,
      })
      .returning();

    await db
      .update(affiliates)
      .set({
        totalPaid: sql`${affiliates.totalPaid} + ${totalAmount}`,
        updatedAt: now,
      })
      .where(eq(affiliates.id, affiliateId));

    return NextResponse.json(
      {
        payout,
        claimed: claimed.length,
        skipped,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Admin Payouts] create", error);
    return NextResponse.json({ error: "Failed to create payout" }, { status: 500 });
  }
}

// PATCH — mark a pending payout as completed (add transaction reference)
export async function PATCH(request: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    const m = (err as Error).message;
    return NextResponse.json(
      { error: m === "Unauthorized" ? "Please sign in" : "Forbidden" },
      { status: m === "Unauthorized" ? 401 : 403 },
    );
  }

  try {
    const { payoutId, transactionReference } = await request.json();

    if (!payoutId || !transactionReference) {
      return NextResponse.json(
        { error: "payoutId and transactionReference required" },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(payouts)
      .set({
        transactionReference,
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(payouts.id, payoutId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    }

    return NextResponse.json({ payout: updated });
  } catch (err) {
    console.error("[Admin Payouts] update", err);
    return NextResponse.json({ error: "Failed to update payout" }, { status: 500 });
  }
}
