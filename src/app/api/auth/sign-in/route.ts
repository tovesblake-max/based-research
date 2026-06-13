import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword, hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import { signInSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";

// Dummy hash for constant-time comparison when user doesn't exist
const DUMMY_HASH = "$2a$12$000000000000000000000uGBYzIqSVPNaO5FDOhwWE0GxGSrw0C6";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!(await rateLimit(`sign-in:${ip}`, 10, 15 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = signInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Always run bcrypt compare to prevent timing-based email enumeration
    const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
    const valid = await verifyPassword(password, hashToCheck);

    if (!user || !valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createToken(user.id, user.role, user.phoneVerified === true);
    await setSessionCookie(token);

    return NextResponse.json({
      message: "Signed in successfully",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Sign-in error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
