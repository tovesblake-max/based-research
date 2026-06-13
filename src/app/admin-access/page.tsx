import type { Metadata } from "next";
import QuickAccessForm from "./QuickAccessForm";

// Lives at /admin-access (NOT /admin/quick) so middleware.ts's
// /admin protection doesn't bounce unauthenticated visitors back to
// /auth/sign-in before they can enter the code. Noindex/nofollow so it
// doesn't surface in search; never linked from anywhere on the site.
export const metadata: Metadata = {
  title: "Quick Access",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminAccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-accent/30 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-border p-6 shadow-sm">
        <h1 className="font-serif text-xl text-foreground mb-1">Quick Access</h1>
        <p className="text-sm text-muted mb-5">
          Enter your access code to sign in.
        </p>
        <QuickAccessForm />
      </div>
    </div>
  );
}
