import type { Metadata } from "next";
import { Suspense } from "react";
import CartContent from "@/components/CartContent";

export const metadata: Metadata = {
  title: "Order Cart | Based Research",
  description: "Review your order and proceed to checkout. For qualified labs and institutional research buyers.",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <Suspense>
      <CartContent />
    </Suspense>
  );
}
