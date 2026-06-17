import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { GATE_COOKIE, readGateCookie } from "@/lib/gate";
import { gateLeads } from "@/lib/db/schema";
import VerifyGate from "./VerifyGate";

export const metadata: Metadata = {
  title: "Verify Your Phone | Based Research",
  robots: { index: false, follow: false },
};

export default async function VerifyGatePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const state = await readGateCookie((await cookies()).get(GATE_COOKIE)?.value);
  const { redirect: redirectTo } = await searchParams;
  const qs = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : "";

  // Enforce sequence: both pre-account stages must be cleared.
  if (!state?.ruoAt) redirect(`/gate/research-use${qs}`);
  if (!state?.contactAt) redirect(`/gate/contact${qs}`);

  // Pre-fill the phone captured in Stage B so the visitor doesn't re-type it.
  // db is imported lazily (and the lookup is best-effort) so a DB hiccup
  // never turns the gate into a 500 — the visitor can still re-enter it.
  let initialPhone = "";
  if (state?.sid) {
    try {
      const { db } = await import("@/lib/db");
      const [lead] = await db
        .select({ phone: gateLeads.phone })
        .from(gateLeads)
        .where(eq(gateLeads.id, state.sid))
        .limit(1);
      if (lead?.phone) initialPhone = lead.phone;
    } catch (err) {
      console.warn("[gate/verify] phone pre-fill skipped", err);
    }
  }

  return <VerifyGate initialPhone={initialPhone} redirect={redirectTo} />;
}
