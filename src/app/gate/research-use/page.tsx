import type { Metadata } from "next";
import ResearchUseGate from "./ResearchUseGate";

export const metadata: Metadata = {
  title: "Research Use Confirmation | Based Research",
  robots: { index: false, follow: false },
};

export default async function ResearchUseGatePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return <ResearchUseGate redirect={redirect} />;
}
