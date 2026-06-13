"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { Loader2, Package, Clock, Pause, Play, X, SkipForward, AlertCircle, CheckCircle } from "lucide-react";

interface SubItem { id: string; productName: string; variantSize: string; quantity: number; basePrice: number; }
interface Sub {
  id: string; status: string; frequency: number; loyaltyTier: string;
  discountPercent: number; achMaskedAccount: string | null; achAccountType: string;
  nextChargeDate: string; lastChargedAt: string | null; pausedUntil: string | null;
  createdAt: string; items: SubItem[];
}

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

const tierColors: Record<string, string> = {
  bronze: "bg-amber-500/10 text-amber-700",
  silver: "bg-gray-200 text-gray-700",
  gold: "bg-yellow-400/20 text-yellow-700",
  platinum: "bg-purple-500/10 text-purple-700",
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const fetchSubs = () => {
    fetch("/api/subscriptions").then((r) => r.json()).then((data) => {
      setSubs(data.subscriptions || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchSubs(); }, []);

  const doAction = async (id: string, action: string, extra?: Record<string, unknown>) => {
    setActionLoading(id);
    setMessage("");
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      setMessage(data.message || data.error || "Done");
      fetchSubs();
    } catch { setMessage("Something went wrong"); }
    finally { setActionLoading(null); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-muted" /></div>;
  }

  return (
    <div>
      <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">Subscriptions</h1>
      <p className="text-muted text-sm mb-8">Manage your auto-ship subscriptions.</p>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-success/10 text-success text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {message}
        </div>
      )}

      {subs.length > 0 ? (
        <div className="space-y-4">
          {subs.map((sub) => (
            <div key={sub.id} className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Header */}
              <div className="p-5 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                      sub.status === "active" ? "bg-success/10 text-success" :
                      sub.status === "paused" ? "bg-amber-500/10 text-amber-600" :
                      sub.status === "payment_failed" ? "bg-destructive/10 text-destructive" :
                      "bg-muted/10 text-muted"
                    }`}>{sub.status === "payment_failed" ? "Payment Failed" : sub.status}</span>
                    <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${tierColors[sub.loyaltyTier] || ""}`}>
                      {sub.loyaltyTier}
                    </span>
                  </div>
                  <p className="text-sm text-foreground font-medium">
                    {sub.items.map((i) => `${i.productName} (${i.variantSize})`).join(", ")}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Every {sub.frequency} days · {sub.discountPercent}% off · ACH ****{sub.achMaskedAccount?.slice(-4) || ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {fmt(sub.items.reduce((s, i) => s + Math.round(i.basePrice * (1 - sub.discountPercent / 100)) * i.quantity, 0))}
                  </p>
                  <p className="text-[11px] text-muted">per shipment</p>
                </div>
              </div>

              {/* Schedule info */}
              <div className="px-5 py-3 bg-accent/30 border-t border-border flex items-center justify-between text-xs text-muted">
                <span>
                  {sub.status === "active" && <>Next charge: <span className="text-foreground font-medium">{fmtDate(sub.nextChargeDate)}</span></>}
                  {sub.status === "paused" && sub.pausedUntil && <>Paused until: <span className="text-foreground font-medium">{fmtDate(sub.pausedUntil)}</span></>}
                  {sub.status === "payment_failed" && <span className="text-destructive">Payment failed — please update your bank details</span>}
                  {sub.status === "cancelled" && <>Cancelled</>}
                </span>
                <span>Since {fmtDate(sub.createdAt)}</span>
              </div>

              {/* Actions */}
              {sub.status !== "cancelled" && (
                <div className="px-5 py-3 border-t border-border flex items-center gap-2 flex-wrap">
                  {sub.status === "active" && (
                    <>
                      <button
                        onClick={() => doAction(sub.id, "skip")}
                        disabled={actionLoading === sub.id}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer disabled:opacity-50"
                      >
                        <SkipForward className="w-3 h-3" /> Skip Next
                      </button>
                      <button
                        onClick={() => doAction(sub.id, "pause", { pauseDays: 30 })}
                        disabled={actionLoading === sub.id}
                        className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        <Pause className="w-3 h-3" /> Pause 30 Days
                      </button>
                    </>
                  )}
                  {sub.status === "paused" && (
                    <button
                      onClick={() => doAction(sub.id, "resume")}
                      disabled={actionLoading === sub.id}
                      className="inline-flex items-center gap-1 text-xs text-success hover:underline cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3 h-3" /> Resume
                    </button>
                  )}
                  {sub.status === "payment_failed" && (
                    <>
                      <button
                        onClick={() => {
                          const routing = prompt("Enter new routing number (9 digits):");
                          if (!routing || routing.length !== 9) return;
                          const account = prompt("Enter new account number:");
                          if (!account || account.length < 4) return;
                          const type = prompt("Account type (C for Checking, S for Savings):", "C");
                          if (type !== "C" && type !== "S") return;
                          doAction(sub.id, "update_payment", { routingNumber: routing, accountNumber: account, accountType: type });
                        }}
                        disabled={actionLoading === sub.id}
                        className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline cursor-pointer disabled:opacity-50"
                      >
                        Update Payment & Resume
                      </button>
                      <button
                        onClick={() => doAction(sub.id, "resume")}
                        disabled={actionLoading === sub.id}
                        className="inline-flex items-center gap-1 text-xs text-success hover:underline cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" /> Retry With Current
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      const reason = prompt("We're sorry to see you go. Can you tell us why?");
                      if (reason !== null) doAction(sub.id, "cancel", { cancelReason: reason });
                    }}
                    disabled={actionLoading === sub.id}
                    className="inline-flex items-center gap-1 text-xs text-destructive hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                  {actionLoading === sub.id && <Loader2 className="w-3 h-3 animate-spin text-muted" />}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted" />
          </div>
          <h3 className="font-semibold text-foreground text-lg mb-2">No subscriptions yet</h3>
          <p className="text-muted text-sm mb-6">Subscribe to your favorite peptides and save 10% on every order.</p>
          <Link href="/catalog">
            <Button variant="primary" size="md">Browse Products</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
