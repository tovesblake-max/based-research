import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wholesaleAccounts } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const applySchema = z.object({
  companyName: z.string().min(1).max(255),
  website: z.string().max(255).optional(),
  ein: z.string().max(100).optional(),
  institutionType: z.enum(["university", "research_lab", "hospital", "biotech", "distributor", "other"]),
  estimatedMonthlyVolume: z.string().max(50).optional(),
  useCase: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = applySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Check if already applied
    const [existing] = await db
      .select({ id: wholesaleAccounts.id })
      .from(wholesaleAccounts)
      .where(eq(wholesaleAccounts.userId, user.id))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "You already have a wholesale application" }, { status: 409 });
    }

    const [account] = await db
      .insert(wholesaleAccounts)
      .values({ userId: user.id, ...parsed.data })
      .returning();

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }
    console.error("[Wholesale Apply]", error);
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }
}
