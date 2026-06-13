"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SupportBubble from "@/components/SupportBubble";
import ConsentBanner from "@/components/ConsentBanner";
import AgeGate from "@/components/AgeGate";
import ReferralCapture from "@/components/ReferralCapture";

/**
 * Site-wide chrome wrapper. Renders header, footer, and floating
 * widgets (SupportBubble, ConsentBanner, AgeGate, ReferralCapture) for
 * the public storefront — and hides ALL of them
 * on admin surfaces so the admin dashboard fills the viewport without
 * the marketing chrome competing for attention.
 *
 * Admin paths covered:
 *   /admin            — main dashboard
 *   /admin/*          — any nested admin route
 *   /admin-access     — quick-access JWT entry (functionally part of admin)
 *
 * The <main> wrapper still renders in both modes so the children get a
 * scrollable container and the body's flex-column layout doesn't
 * collapse.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin =
    !!pathname && (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/admin-access"));

  if (isAdmin) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <SupportBubble />
      <ConsentBanner />
      <AgeGate />
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
    </>
  );
}
