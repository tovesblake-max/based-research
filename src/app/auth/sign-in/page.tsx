import type { Metadata } from "next";
import { Suspense } from "react";
import SignInForm from "@/components/SignInForm";

export const metadata: Metadata = {
  title: "Sign In | Based Research",
  description: "Sign in to your Based Research account to access your research catalog and order history.",
  robots: { index: false, follow: true },
};

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
