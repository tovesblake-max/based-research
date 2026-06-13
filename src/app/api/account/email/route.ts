import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address.").max(255),
  firstName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().max(100).optional().nullable(),
  marketingOptIn: z.boolean().optional().default(false),
});

/**
 * Attach an email to the currently-signed-in account.
 *
 * Used to promote a phone-only "guest" account to a "full" account. Also works
 * for existing full accounts that want to change their email, though in practice
 * the main caller is checkout for guest users.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = emailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, firstName, lastName } = parsed.data;
    const normalized = email.toLowerCase().trim();

    // Check email isn't already used by a DIFFERENT user
    const [clash] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, normalized), ne(users.id, user.id)))
      .limit(1);

    if (clash) {
      return NextResponse.json(
        {
          error:
            "That email is already associated with another account. Sign in with that account instead.",
        },
        { status: 409 }
      );
    }

    await db
      .update(users)
      .set({
        email: normalized,
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      message: "Email added to your account.",
      email: normalized,
    });
  } catch (error) {
    console.error("Add email error:", error);
    return NextResponse.json(
      { error: "Could not save your email. Please try again." },
      { status: 500 }
    );
  }
}
