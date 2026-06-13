import type { Metadata } from "next";
import QuickOrderClient from "./QuickOrderClient";

export const metadata: Metadata = {
  title: "Quick Order | Based Research",
  // No-index — this is an internal admin surface, never meant to be
  // indexed or shared with the public.
  robots: { index: false, follow: false },
  // No max-width meta — the page is mobile-first so the default
  // viewport is correct.
};

export default function QuickOrderPage() {
  return <QuickOrderClient />;
}
