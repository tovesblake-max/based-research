import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wholesaleAccounts, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, desc, sql } from "drizzle-orm";

// GET — list all wholesale accounts
export async function GET() {
  try {
    await requireAdmin();

    const accounts = await db
      .select({
        id: wholesaleAccounts.id,
        userId: wholesaleAccounts.userId,
        companyName: wholesaleAccounts.companyName,
        website: wholesaleAccounts.website,
        institutionType: wholesaleAccounts.institutionType,
        estimatedMonthlyVolume: wholesaleAccounts.estimatedMonthlyVolume,
        status: wholesaleAccounts.status,
        tier: wholesaleAccounts.tier,
        discountPercent: wholesaleAccounts.discountPercent,
        creditTerms: wholesaleAccounts.creditTerms,
        outstandingBalance: wholesaleAccounts.outstandingBalance,
        createdAt: wholesaleAccounts.createdAt,
        userEmail: users.email,
        userName: sql<string>`coalesce(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      })
      .from(wholesaleAccounts)
      .innerJoin(users, eq(wholesaleAccounts.userId, users.id))
      .orderBy(desc(wholesaleAccounts.createdAt));

    return NextResponse.json({ accounts });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

// PATCH — approve/reject/update a wholesale account. Numeric fields
// are validated server-side: previously any client value (including
// NaN from `parseInt("")` in the admin UI) flowed straight to the DB.
const ALLOWED_WHOLESALE_STATUSES = new Set(["pending", "approved", "rejected", "suspended"]);
const ALLOWED_CREDIT_TERMS = new Set(["prepaid", "net15", "net30", "net60"]);

export async function PATCH(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    const m = (err as Error).message;
    return NextResponse.json(
      { error: m === "Unauthorized" ? "Please sign in" : "Forbidden" },
      { status: m === "Unauthorized" ? 401 : 403 },
    );
  }

  try {
    const { accountId, status, tier, discountPercent, creditTerms, creditLimit, notes } = await request.json();

    if (!accountId || typeof accountId !== "string") {
      return NextResponse.json({ error: "accountId required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (status !== undefined) {
      if (typeof status !== "string" || !ALLOWED_WHOLESALE_STATUSES.has(status)) {
        return NextResponse.json(
          { error: `status must be one of: ${[...ALLOWED_WHOLESALE_STATUSES].join(", ")}` },
          { status: 400 },
        );
      }
      updates.status = status;
    }

    if (tier !== undefined) {
      const t = Number(tier);
      if (!Number.isInteger(t) || t < 1 || t > 4) {
        return NextResponse.json({ error: "tier must be an integer 1-4" }, { status: 400 });
      }
      updates.tier = t;
    }

    if (discountPercent !== undefined) {
      const d = Number(discountPercent);
      if (!Number.isFinite(d) || d < 0 || d > 100) {
        return NextResponse.json({ error: "discountPercent must be 0-100" }, { status: 400 });
      }
      updates.discountPercent = Math.round(d);
    }

    if (creditTerms !== undefined) {
      if (typeof creditTerms !== "string" || !ALLOWED_CREDIT_TERMS.has(creditTerms)) {
        return NextResponse.json(
          { error: `creditTerms must be one of: ${[...ALLOWED_CREDIT_TERMS].join(", ")}` },
          { status: 400 },
        );
      }
      updates.creditTerms = creditTerms;
    }

    if (creditLimit !== undefined) {
      const c = Number(creditLimit);
      if (!Number.isFinite(c) || c < 0) {
        return NextResponse.json({ error: "creditLimit must be a non-negative number (cents)" }, { status: 400 });
      }
      updates.creditLimit = Math.round(c);
    }

    if (notes !== undefined) {
      if (typeof notes !== "string") {
        return NextResponse.json({ error: "notes must be a string" }, { status: 400 });
      }
      updates.notes = notes.slice(0, 2000);
    }

    if (status === "approved") {
      updates.approvedBy = admin.id;
      updates.approvedAt = new Date();
    }

    const [updated] = await db
      .update(wholesaleAccounts)
      .set(updates)
      .where(eq(wholesaleAccounts.id, accountId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ account: updated });
  } catch (err) {
    console.error("[Admin Wholesale] update", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
