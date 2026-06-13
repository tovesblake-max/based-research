import type { Metadata } from "next";
import CallbackClient from "./CallbackClient";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Order Status | Based Research",
  robots: { index: false, follow: false },
};

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackClient />
    </Suspense>
  );
}
