import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wholesaleAccounts } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await requireAuth();

    const [account] = await db
      .select()
      .from(wholesaleAccounts)
      .where(eq(wholesaleAccounts.userId, user.id))
      .limit(1);

    return NextResponse.json({ account: account || null });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
