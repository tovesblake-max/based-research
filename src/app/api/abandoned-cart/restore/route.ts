/**
 * Restore an abandoned cart from a recovery-email link.
 * The email links to /cart?restore=TOKEN — the cart page calls this endpoint
 * to fetch the original items, which it then merges back into localStorage.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { abandonedCarts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || token.length !== 64) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const [cart] = await db
    .select()
    .from(abandonedCarts)
    .where(eq(abandonedCarts.recoveryToken, token))
    .limit(1);

  if (!cart) {
    return NextResponse.json({ error: "Cart not found" }, { status: 404 });
  }

  return NextResponse.json({
    items: cart.items,
    subtotal: cart.subtotal,
  });
}
