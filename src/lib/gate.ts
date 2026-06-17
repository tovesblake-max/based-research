import { SignJWT, jwtVerify } from "jose";

/**
 * Access-gate state — the signed cookie that tracks a visitor's progress
 * through the 3-stage compliance funnel that walls off the storefront.
 *
 * Stages (flow order, lightest → heaviest):
 *   A  /gate/research-use  → research-use-only attestation   (sets ruoAt)
 *   B  /gate/contact       → name + email + phone            (sets contactAt)
 *   C  /gate/verify        → phone + SMS 2FA + researcher type → mints the
 *                            verified `br-session`, which then supersedes
 *                            this cookie entirely.
 *
 * The cookie is a signed JWT (HS256, same secret as the session) so the
 * edge middleware can read it without a DB round-trip and it can't be
 * forged client-side. `sid` references the gate_leads audit row.
 *
 * This module is intentionally dependency-light (jose only, no next/headers
 * or node APIs) so it is safe to import from edge middleware.
 */

export const GATE_COOKIE = "br-gate";
const GATE_EXPIRY = "30d";

export interface GateState {
  sid: string; // gate_leads.id
  ruoAt?: string; // ISO timestamp — research-use-only attested
  contactAt?: string; // ISO timestamp — contact details captured
}

function gateSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  // Mirrors src/lib/auth.ts: never throw at build time; fall back to a
  // dev-only secret locally. In production JWT_SECRET must be set.
  return new TextEncoder().encode(s || "based-research-dev-secret-local-only");
}

export async function signGateCookie(state: GateState): Promise<string> {
  return new SignJWT({ sid: state.sid, ruoAt: state.ruoAt, contactAt: state.contactAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(GATE_EXPIRY)
    .sign(gateSecret());
}

export async function readGateCookie(token: string | undefined | null): Promise<GateState | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, gateSecret());
    if (typeof payload.sid !== "string") return null;
    return {
      sid: payload.sid,
      ruoAt: typeof payload.ruoAt === "string" ? payload.ruoAt : undefined,
      contactAt: typeof payload.contactAt === "string" ? payload.contactAt : undefined,
    };
  } catch {
    return null;
  }
}

export type GateStagePath = "/gate/research-use" | "/gate/contact" | "/gate/verify";

/**
 * Given the current gate state, the next stage the visitor must complete.
 * Used by middleware (to redirect un-gated visitors) and by each gate page
 * (to bounce a visitor who jumped ahead back to the right step).
 */
export function nextGateStage(state: GateState | null): GateStagePath {
  if (!state || !state.ruoAt) return "/gate/research-use";
  if (!state.contactAt) return "/gate/contact";
  return "/gate/verify";
}

/** True once both pre-account stages (A + B) are cleared. */
export function preAccountGatesCleared(state: GateState | null): boolean {
  return !!state?.ruoAt && !!state?.contactAt;
}

// Shared cookie attributes for the gate cookie. `secure` off only for
// local `npm run dev` (no VERCEL env), matching the session cookie policy.
export function gateCookieOptions() {
  const isLocalDev = process.env.NODE_ENV !== "production" && !process.env.VERCEL;
  return {
    httpOnly: true,
    secure: !isLocalDev,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  };
}

/**
 * Self-classified researcher type captured at Stage C. Mirrors the
 * orders.researcher_type / users.researcher_type values. The picker
 * constrains the set client-side; the server revalidates against this list.
 */
export const RESEARCHER_TYPES = [
  { value: "academic", label: "Academic / university laboratory" },
  { value: "biotech_rd", label: "Biotech / pharma R&D" },
  { value: "cro", label: "Contract research organization (CRO)" },
  { value: "private_lab", label: "Private / independent research lab" },
  { value: "clinical_research", label: "Clinical research" },
  { value: "other", label: "Other qualified research use" },
] as const;

export const RESEARCHER_TYPE_VALUES = RESEARCHER_TYPES.map((r) => r.value) as readonly string[];

export function isValidResearcherType(v: unknown): v is string {
  return typeof v === "string" && RESEARCHER_TYPE_VALUES.includes(v);
}
