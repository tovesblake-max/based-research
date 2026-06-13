import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!(await rateLimit(`forgot-pw:${ip}`, 5, 15 * 60 * 1000))) {
    // Always return success to prevent email enumeration
    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  }

  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
    }

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    // Always return same response whether user exists or not (prevent enumeration)
    if (!user) {
      return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // Send email — user was looked up by email so it must be non-null,
    // but use the submitted (validated) email for type safety
    if (!user.email) {
      // Defensive guard (shouldn't happen — looked up by email)
      return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
    }
    await sendPasswordResetEmail(user.email, token);

    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    console.error("[Forgot Password]", error);
    // Still return success to prevent enumeration
    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  }
}
