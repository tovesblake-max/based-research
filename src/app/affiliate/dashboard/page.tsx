"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy, CheckCircle, DollarSign, Users, Clock, MousePointerClick, TrendingUp } from "lucide-react";
import DeepLinkGenerator from "@/components/affiliate/DeepLinkGenerator";

interface Affiliate {
  id: string;
  affiliateCode: string;
  commissionRate: string;
  totalEarned: number;
  totalPaid: number;
  payoutMethod: string;
  status: string;
}

interface Commission {
  id: string;
  orderId: string;
  orderTotal: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
}

interface Payout {
  id: string;
  amount: number;
  method: string;
  transactionReference: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/affiliate")
      .then((r) => r.json())
      .then((data) => {
        if (!data.affiliate) { router.push("/affiliate/signup"); return; }
        setAffiliate(data.affiliate);
        setReferralCount(data.referralCount || 0);
        setClickCount(data.clickCount || 0);
        setCommissions(data.commissions || []);
        setPayouts(data.payouts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const copyLink = () => {
    if (!affiliate) return;
    navigator.clipboard.writeText(`https://basedresearch.com?ref=${affiliate.affiliateCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-4 h-4 animate-spin text-muted" strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  if (!affiliate) return null;

  const pendingBalance = affiliate.totalEarned - affiliate.totalPaid;
  const rate = (parseFloat(affiliate.commissionRate) * 100).toFixed(0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10" style={{ fontSize: "14px" }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-medium text-foreground tracking-tight">Affiliate Dashboard</h1>
        <p className="text-muted mt-1">Track referrals, commissions, and payouts.</p>
      </div>

      {/* Referral Link Card */}
      <div className="bg-card rounded-lg border border-border p-4 mb-5">
        <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-2">Your Referral Link</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 font-mono text-[13px] bg-accent/60 px-3 py-2 rounded-md text-foreground truncate">
            basedresearch.com?ref={affiliate.affiliateCode}
          </div>
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-[13px] font-medium rounded-md hover:bg-primary-light transition-colors cursor-pointer"
          >
            {copied ? (
              <><CheckCircle className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" /> Copied</>
            ) : (
              <><Copy className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" /> Copy</>
            )}
          </button>
        </div>
        <div className="flex items-center gap-3 mt-2 text-[12px] text-muted">
          <span>Code: <span className="font-mono text-foreground">{affiliate.affiliateCode}</span></span>
          <span className="text-border">|</span>
          <span>Commission: <span className="text-foreground">{rate}%</span></span>
          <span className="text-border">|</span>
          <span>Payout: <span className="text-foreground capitalize">{affiliate.payoutMethod}</span></span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total Earned", value: fmt(affiliate.totalEarned), icon: DollarSign, color: "text-success" },
          { label: "Pending", value: fmt(pendingBalance), icon: Clock, color: "text-primary" },
          { label: "Paid Out", value: fmt(affiliate.totalPaid), icon: CheckCircle, color: "text-muted" },
          { label: "Clicks", value: String(clickCount), icon: MousePointerClick, color: "text-primary" },
          { label: "Signups", value: String(referralCount), icon: Users, color: "text-secondary" },
          {
            label: "Click → Signup",
            value: clickCount > 0 ? `${Math.round((referralCount / clickCount) * 100)}%` : "—",
            icon: TrendingUp,
            color: "text-success",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-lg border border-border p-3.5">
            <stat.icon className={`w-4 h-4 ${stat.color} mb-1.5`} strokeWidth={1.5} aria-hidden="true" />
            <p className="text-[20px] font-medium text-foreground leading-tight">{stat.value}</p>
            <p className="text-[12px] text-muted mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Deep-link generator */}
      <DeepLinkGenerator affiliateCode={affiliate.affiliateCode} />

      {/* Commissions */}
      <div className="bg-card rounded-lg border border-border overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-medium text-foreground">Commissions</h2>
          <span className="text-[12px] text-muted">{commissions.length} total</span>
        </div>
        {commissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[12px] text-muted border-b border-border bg-accent/30">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Order Total</th>
                  <th className="px-4 py-2.5 font-medium">Commission</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-2.5 text-muted">{fmtDate(c.createdAt)}</td>
                    <td className="px-4 py-2.5 text-foreground">{fmt(c.orderTotal)}</td>
                    <td className="px-4 py-2.5 text-success">{fmt(c.commissionAmount)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded ${
                        c.status === "paid" ? "bg-success/10 text-success" :
                        c.status === "approved" ? "bg-primary/10 text-primary" :
                        "bg-amber-500/10 text-amber-600"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-muted">
            No commissions yet. Share your referral link to start earning.
          </div>
        )}
      </div>

      {/* Payouts */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-medium text-foreground">Payouts</h2>
          <span className="text-[12px] text-muted">{payouts.length} total</span>
        </div>
        {payouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[12px] text-muted border-b border-border bg-accent/30">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Amount</th>
                  <th className="px-4 py-2.5 font-medium">Method</th>
                  <th className="px-4 py-2.5 font-medium">Reference</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-2.5 text-muted">{fmtDate(p.createdAt)}</td>
                    <td className="px-4 py-2.5 text-foreground">{fmt(p.amount)}</td>
                    <td className="px-4 py-2.5 text-muted uppercase text-[12px]">{p.method}</td>
                    <td className="px-4 py-2.5 text-muted font-mono text-[12px] truncate max-w-[180px]">{p.transactionReference || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded ${
                        p.status === "completed" ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-muted">
            No payouts yet. Commissions are settled manually.
          </div>
        )}
      </div>
    </div>
  );
}
