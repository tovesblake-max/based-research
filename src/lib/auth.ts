import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  return new TextEncoder().encode(secret || "based-research-dev-secret-local-only");
}

export const COOKIE_NAME = "br-session";
const TOKEN_EXPIRY = "7d";

// ── PASSWORD ────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT ─────────────────────────────────────────────────────
// phoneVerified is stamped into the token at issuance so the edge
// middleware can gate every page without a DB round-trip. Old tokens
// minted before this field existed will decode without it, which the
// middleware treats as unverified (forcing the user back through the
// phone-OTP flow on next page load).
export async function createToken(
  userId: string,
  role: string,
  phoneVerified: boolean,
): Promise<string> {
  return new SignJWT({ userId, role, phoneVerified })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(getJwtSecret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as { userId: string; role: string; phoneVerified?: boolean };
  } catch {
    return null;
  }
}

// ── SESSION ─────────────────────────────────────────────────
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  // Allow plaintext cookies only during local dev (`npm run dev`). In
  // every other context — production, Vercel preview, staging, CI — the
  // cookie must be Secure so it's never transmitted over HTTP. Previously
  // this was gated on NODE_ENV === "production", which meant any non-prod
  // NODE_ENV (e.g. staging builds) leaked session cookies.
  const isLocalDev =
    process.env.NODE_ENV !== "production" && !process.env.VERCEL;
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: !isLocalDev,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

// ── CURRENT USER ────────────────────────────────────────────
export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      // Per-user cost-plus pricing override. Returned so the cart UI can
      // surface the insider discount as an auto-applied line without an
      // extra round-trip. The server still authoritatively recomputes at
      // order-mint, so a client mutating this value has no effect on
      // what they actually get charged.
      costPlusMarginCents: users.costPlusMarginCents,
      // Saved researcher self-classification — lets checkout pre-fill so
      // the customer only declares it once.
      researcherType: users.researcherType,
      researchUseAcknowledgedAt: users.researchUseAcknowledgedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  return user || null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}
