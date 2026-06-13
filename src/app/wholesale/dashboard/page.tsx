"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/Button";
import { Loader2, Building2, CheckCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";

interface WholesaleAccount {
  id: string; companyName: string; status: string; tier: number;
  discountPercent: number; creditTerms: string; outstandingBalance: number;
  createdAt: string; approvedAt: string | null;
}

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export default function WholesaleDashboardPage() {
  const router = useRouter();
  const [account, setAccount] = useState<WholesaleAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wholesale/account")
      .then((r) => r.json())
      .then((data) => {
        if (!data.account) { router.push("/wholesale/apply"); return; }
        setAccount(data.account);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-muted" /></div>;
  }

  if (!account) return null;

  const isPending = account.status === "pending";
  const isApproved = account.status === "approved";
  const isRejected = account.status === "rejected";

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Building2 className="w-6 h-6 text-primary" strokeWidth={1.5} aria-hidden="true" />
        <h1 className="font-serif text-2xl text-foreground">Wholesale Account</h1>
      </div>

      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <Clock className="w-8 h-8 text-amber-500 mx-auto mb-3" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="text-lg font-medium text-foreground mb-2">Application Under Review</h2>
          <p className="text-sm text-muted mb-1">Your wholesale application for <strong>{account.companyName}</strong> is being reviewed.</p>
          <p className="text-xs text-muted">Submitted {new Date(account.createdAt).toLocaleDateString()}. We typically respond within 24 hours.</p>
        </div>
      )}

      {isRejected && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="text-lg font-medium text-foreground mb-2">Application Not Approved</h2>
          <p className="text-sm text-muted">Please contact support@basedresearch.com for more information.</p>
        </div>
      )}

      {isApproved && (
        <>
          {/* Account overview */}
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-success" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-sm font-medium text-success">Approved</span>
              <span className="text-[10px] font-medium uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">Tier {account.tier}</span>
            </div>
            <h2 className="text-lg font-medium text-foreground">{account.companyName}</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
              <div>
                <p className="text-xs text-muted">Discount</p>
                <p className="text-xl font-medium text-foreground">{account.discountPercent}%</p>
              </div>
              <div>
                <p className="text-xs text-muted">Payment Terms</p>
                <p className="text-xl font-medium text-foreground capitalize">{account.creditTerms.replace("net", "Net ")}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Outstanding</p>
                <p className="text-xl font-medium text-foreground">{fmt(account.outstandingBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Member Since</p>
                <p className="text-xl font-medium text-foreground">{new Date(account.approvedAt || account.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/catalog">
              <Button variant="primary" size="md">
                Browse Products <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="md">Contact Support</Button>
            </Link>
          </div>

          <p className="text-xs text-muted mt-6">
            Your {account.discountPercent}% wholesale discount is automatically applied at checkout when you&apos;re logged in.
          </p>
        </>
      )}
    </div>
  );
}
