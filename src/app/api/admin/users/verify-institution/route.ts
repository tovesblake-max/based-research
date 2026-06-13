import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

/**
 * Admin-only — toggle a buyer's institutional-verification flag.
 *
 * POST { userId: string, verified: boolean }
 *   verified=true  → stamp users.institution_verified_at = now()
 *   verified=false → clear it (back to unverified)
 *
 * This is a manual review action: an admin confirms the buyer is a
 * qualified institution (company name / EIN / department captured at
 * signup) and marks them verified. It is a review flag surfaced on the
 * orders view, not an automated checkout gate.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Admin required" }, { status: 401 });
  }

  let body: { userId?: string; verified?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = (body.userId || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  if (typeof body.verified !== "boolean") {
    return NextResponse.json({ error: "verified (boolean) required" }, { status: 400 });
  }

  const verifiedAt = body.verified ? new Date() : null;

  const [updated] = await db
    .update(users)
    .set({ institutionVerifiedAt: verifiedAt, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id, institutionVerifiedAt: users.institutionVerifiedAt });

  if (!updated) {
    return NextResponse.json({ error: `User ${userId} not found` }, { status: 404 });
  }

  return NextResponse.json({
    userId: updated.id,
    institutionVerifiedAt: updated.institutionVerifiedAt,
  });
}
