import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { addressSchema } from "@/lib/validation";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const user = await requireAuth();
    const result = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, user.id))
      .orderBy(addresses.createdAt);

    return NextResponse.json({ addresses: result });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = addressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // If setting as default, unset others and insert in a transaction
    if (parsed.data.isDefault) {
      const [address] = await db.transaction(async (tx) => {
        await tx
          .update(addresses)
          .set({ isDefault: false })
          .where(eq(addresses.userId, user.id));
        return tx
          .insert(addresses)
          .values({ ...parsed.data, userId: user.id })
          .returning();
      });
      return NextResponse.json({ address }, { status: 201 });
    }

    const [address] = await db
      .insert(addresses)
      .values({ ...parsed.data, userId: user.id })
      .returning();

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create address" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Address ID required" }, { status: 400 });
    }

    await db
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));

    return NextResponse.json({ message: "Address deleted" });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 });
  }
}
