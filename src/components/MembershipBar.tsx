"use client";

import Link from "next/link";
import Button from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";
import { FileCheck, ShieldCheck, FileText, ArrowRight } from "lucide-react";
import { IS_OPEN_MODE } from "@/lib/site-mode";

export default function MembershipBar() {
  const { user } = useAuth();

  // Open mode is conventional DTC with guest checkout — no
  // institutional-eligibility prompt needed.
  if (IS_OPEN_MODE) return null;

  // Hide once signed in — the eligibility / verification prompt is for
  // prospective institutional buyers who haven't started an account yet.
  if (user) return null;

  return (
    <section className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-6 flex-wrap justify-center md:justify-start">
            {[
              { icon: <ShieldCheck className="w-4 h-4" aria-hidden="true" />, label: "For qualified labs & institutional buyers" },
              { icon: <FileCheck className="w-4 h-4" aria-hidden="true" />, label: "Batch documentation & COA on request" },
              { icon: <FileText className="w-4 h-4" aria-hidden="true" />, label: "Purchase order support" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-muted">
                <span className="text-secondary">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <Link href="/institutional-use" className="flex-shrink-0">
            <Button variant="primary" size="sm">
              Buyer Eligibility <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
