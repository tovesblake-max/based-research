import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, readGateCookie } from "@/lib/gate";
import ContactGate from "./ContactGate";

export const metadata: Metadata = {
  title: "Your Details | Based Research",
  robots: { index: false, follow: false },
};

export default async function ContactGatePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  // Enforce sequence: Stage A (RUO) must be cleared before contact capture.
  const state = await readGateCookie((await cookies()).get(GATE_COOKIE)?.value);
  const { redirect: redirectTo } = await searchParams;
  const qs = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : "";
  if (!state?.ruoAt) {
    redirect(`/gate/research-use${qs}`);
  }

  return <ContactGate redirect={redirectTo} />;
}
