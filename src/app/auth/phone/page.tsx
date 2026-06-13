import type { Metadata } from "next";
import { Suspense } from "react";
import PhoneAuthForm from "@/components/PhoneAuthForm";

export const metadata: Metadata = {
  title: "Sign in with Phone | Based Research",
  description: "Sign in to Based Research with your phone number.",
  robots: { index: false, follow: true },
};

export default function PhoneAuthPage() {
  return (
    <Suspense>
      <PhoneAuthForm />
    </Suspense>
  );
}
