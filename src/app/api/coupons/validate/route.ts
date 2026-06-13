import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupons";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

// POST /api/coupons/validate
// Body: { code: string, items: [{ slug, price, quantity }, ...] }
// Returns: { valid: true, discountCents, couponId, code, description } | { valid: false, error }
//
// Public endpoint (cart page uses it before login). If the user is signed
// in we factor per-user caps in; otherwise those checks are skipped and
// enforced again at order creation.

const bodySchema = z.object({
  code: z.string().min(1).max(50),
  items: z
    .array(
      z.object({
        slug: z.string(),
        price: z.number().int().min(0),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const user = await getCurrentUser();
    const result = await validateCoupon(
      parsed.data.code,
      parsed.data.items,
      user?.id,
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Coupons Validate]", err);
    return NextResponse.json(
      { valid: false, error: "Could not validate code. Try again." },
      { status: 500 },
    );
  }
}
