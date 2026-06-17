import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gateLeads } from "@/lib/db/schema";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { GATE_COOKIE, signGateCookie, readGateCookie, gateCookieOptions } from "@/lib/gate";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

/**
 * Gate Stage A — research-use-only attestation.
 *
 * Records the attestation (timestamp + IP + UA + country) in gate_leads
 * for a durable compliance audit trail, then issues/updates the signed
 * `br-gate` cookie with `ruoAt` so the visitor may advance to Stage B.
 *
 * No account exists yet — this is the anonymous front door of the funnel.
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    if (!(await rateLimit(`gate-attest:${ip}`, 20, 15 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again in a few minutes." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || body.acknowledged !== true) {
      return NextResponse.json(
        { error: "You must affirm the research-use-only terms to continue." },
        { status: 400 },
      );
    }

    const now = new Date();
    const userAgent = request.headers.get("user-agent")?.slice(0, 1000) || null;
    const country = request.headers.get("x-vercel-ip-country") || null;

    // If the visitor already has a gate row (re-attesting), reuse it;
    // otherwise mint a fresh lead.
    const existing = await readGateCookie((await cookies()).get(GATE_COOKIE)?.value);

    let sid: string;
    if (existing?.sid) {
      await db
        .update(gateLeads)
        .set({ ruoAttestedAt: now, ip: ip === "unknown" ? null : ip, userAgent, country, updatedAt: now })
        .where(eq(gateLeads.id, existing.sid));
      sid = existing.sid;
    } else {
      const [row] = await db
        .insert(gateLeads)
        .values({ ruoAttestedAt: now, ip: ip === "unknown" ? null : ip, userAgent, country })
        .returning({ id: gateLeads.id });
      sid = row.id;
    }

    const token = await signGateCookie({
      sid,
      ruoAt: now.toISOString(),
      contactAt: existing?.contactAt,
    });

    const res = NextResponse.json({ ok: true, next: existing?.contactAt ? "/gate/verify" : "/gate/contact" });
    res.cookies.set(GATE_COOKIE, token, gateCookieOptions());
    return res;
  } catch (error) {
    console.error("[Gate Attest]", error);
    return NextResponse.json({ error: "Could not record attestation. Please try again." }, { status: 500 });
  }
}
