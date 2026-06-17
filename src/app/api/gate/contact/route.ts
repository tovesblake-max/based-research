import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gateLeads } from "@/lib/db/schema";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { GATE_COOKIE, signGateCookie, readGateCookie, gateCookieOptions } from "@/lib/gate";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * Gate Stage B — contact capture (name + email + phone).
 *
 * Requires Stage A (RUO attestation) to be cleared first. Updates the
 * gate_leads row and advances the `br-gate` cookie with `contactAt`. The
 * captured phone pre-fills Stage C so the visitor doesn't re-type it.
 */

const schema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(30),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!(await rateLimit(`gate-contact:${ip}`, 20, 15 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again in a few minutes." },
        { status: 429 },
      );
    }

    const state = await readGateCookie((await cookies()).get(GATE_COOKIE)?.value);
    if (!state?.sid || !state.ruoAt) {
      // Funnel jumped — send them back to Stage A.
      return NextResponse.json(
        { error: "Please complete the research-use confirmation first.", next: "/gate/research-use" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { firstName, lastName, email, phone } = parsed.data;
    const now = new Date();

    await db
      .update(gateLeads)
      .set({
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        contactAt: now,
        updatedAt: now,
      })
      .where(eq(gateLeads.id, state.sid));

    const token = await signGateCookie({
      sid: state.sid,
      ruoAt: state.ruoAt,
      contactAt: now.toISOString(),
    });

    const res = NextResponse.json({ ok: true, next: "/gate/verify" });
    res.cookies.set(GATE_COOKIE, token, gateCookieOptions());
    return res;
  } catch (error) {
    console.error("[Gate Contact]", error);
    return NextResponse.json({ error: "Could not save your details. Please try again." }, { status: 500 });
  }
}
