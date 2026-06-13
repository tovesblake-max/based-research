"use client";

/**
 * High-Value Follow-up admin tab.
 *
 * Surfaces unpaid abandoned carts ≥ $100 with a phone on file. For each
 * row, the server pre-generates a personalized educational SMS body and
 * we render it editable. One click on "Send Text" opens iMessage on the
 * operator's Mac with the body prefilled and stamps adminFollowupSentAt
 * so the row drops out of the queue.
 *
 * Best-effort send tracking: iMessage doesn't fire a callback when the
 * user actually hits send, so we stamp on click and provide a Re-arm
 * button for the cases where the operator changed their mind.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  MessageSquare,
  RefreshCcw,
  Sparkles,
  ShoppingBag,
  Edit2,
  Check,
  RotateCcw,
  Phone,
} from "lucide-react";

interface HvItem {
  productName: string;
  variantSize: string;
  slug: string;
  quantity: number;
  lineTotalCents: number;
}

interface HvCart {
  orderId: string;
  orderNumber: string;
  email: string;
  customerPhone: string;
  customerPhoneE164: string;
  firstName: string | null;
  totalCents: number;
  subtotalCents: number;
  ageMinutes: number;
  createdAt: string;
  recoverySmsSentAt: string | null;
  paymentStatus: string;
  paymentGateway: string | null;
  items: HvItem[];
  suggestedMessage: string;
  /** Number of OTHER unpaid carts the same email has — surfaced
   *  in the UI as a "+N other ghost mints" pill so admin knows the
   *  customer left duplicate unpaid orders. 0 = clean single. */
  ghostCartCount: number;
}

interface HvResponse {
  carts: HvCart[];
  threshold?: number;
  lookbackDays?: number;
}

function formatPhone(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 60 / 24)}d ago`;
}

export default function HighValueFollowupTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carts, setCarts] = useState<HvCart[]>([]);
  const [threshold, setThreshold] = useState<number>(100);
  const [lookbackDays, setLookbackDays] = useState<number>(7);
  // Local per-row state: edited message body + "sending" spinner + "sent" pulse
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hv-followup", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as HvResponse;
      setCarts(data.carts || []);
      if (typeof data.threshold === "number") setThreshold(data.threshold);
      if (typeof data.lookbackDays === "number") setLookbackDays(data.lookbackDays);
      // Seed drafts with server-suggested message so the user can edit
      // inline. Preserves any in-progress edits when refreshing.
      setDrafts((prev) => {
        const next = { ...prev };
        for (const c of data.carts || []) {
          if (!(c.orderId in next)) next[c.orderId] = c.suggestedMessage;
        }
        return next;
      });
    } catch (err) {
      console.error("[HV Followup] fetch failed", err);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSend = useCallback(
    async (cart: HvCart) => {
      const body = drafts[cart.orderId] ?? cart.suggestedMessage;
      // Open iMessage with the body prefilled. The sms: scheme on macOS
      // pops Messages.app with the recipient + body ready to send. We
      // also use the &body= form which iMessage on Mac supports for
      // pre-filled text.
      const url = `sms:${cart.customerPhoneE164}&body=${encodeURIComponent(body)}`;
      window.location.href = url;

      // Stamp adminFollowupSentAt server-side so the row falls off the queue.
      // Fire-and-forget — if the network blip happens, the row stays in the
      // queue and the operator can re-click.
      setSendingId(cart.orderId);
      try {
        await fetch("/api/admin/hv-followup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: cart.orderId }),
        });
        // Optimistically remove from local list so the UI feels instant
        setCarts((prev) => prev.filter((c) => c.orderId !== cart.orderId));
      } catch (err) {
        console.warn("[HV Followup] stamp failed", err);
      } finally {
        setSendingId(null);
      }
    },
    [drafts],
  );

  const handleReset = useCallback(
    (cart: HvCart) => {
      setDrafts((prev) => ({ ...prev, [cart.orderId]: cart.suggestedMessage }));
    },
    [],
  );

  if (loading && carts.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 flex items-center justify-center text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading high-value carts…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <p className="text-sm text-red-700">Failed to load: {error}</p>
        <button
          onClick={fetchData}
          className="mt-3 text-sm text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
              High-Value Follow-up
            </h2>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Unpaid carts ≥ ${threshold} with a phone on file from the last{" "}
              {lookbackDays} days. Each row has a personalized educational
              message ready to send. Click <strong>Send Text</strong> to open
              iMessage on your Mac with the message prefilled. The row drops
              from the queue after you send.
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground border border-border rounded-lg px-3 py-1.5 disabled:opacity-50"
            title="Refresh queue"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {carts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <Sparkles className="w-8 h-8 text-muted mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Inbox zero.</p>
          <p className="text-xs text-muted mt-1">
            No high-value abandoned carts waiting on a follow-up.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {carts.map((cart) => {
            const isEditing = editingId === cart.orderId;
            const draft = drafts[cart.orderId] ?? cart.suggestedMessage;
            const isSending = sendingId === cart.orderId;
            const charCount = draft.length;
            const segments = Math.ceil(charCount / 160);

            return (
              <div
                key={cart.orderId}
                className="bg-card rounded-xl border border-border p-5"
              >
                {/* Header row: customer, total, age */}
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-semibold text-foreground flex-shrink-0">
                      #{cart.orderNumber}
                    </span>
                    <span className="font-semibold text-foreground">
                      {cart.firstName || "(no name)"}
                    </span>
                    <span className="text-xs text-muted truncate">
                      {cart.email}
                    </span>
                    <a
                      href={`tel:${cart.customerPhoneE164}`}
                      className="inline-flex items-center gap-1 text-xs tabular-nums text-foreground hover:text-primary"
                      title={`Call ${cart.customerPhoneE164}`}
                    >
                      <Phone className="w-3 h-3" />
                      {formatPhone(cart.customerPhone)}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-lg font-semibold text-foreground tabular-nums">
                      ${(cart.totalCents / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted">
                      {formatAge(cart.ageMinutes)}
                    </span>
                    {cart.recoverySmsSentAt && (
                      <span
                        className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"
                        title={`Auto-recovery SMS sent ${new Date(cart.recoverySmsSentAt).toLocaleString()}`}
                      >
                        Auto-SMS sent
                      </span>
                    )}
                    {cart.ghostCartCount > 0 && (
                      <span
                        className="text-[10px] font-semibold text-muted bg-accent border border-border px-2 py-0.5 rounded-full"
                        title={`This customer minted ${cart.ghostCartCount} additional unpaid order(s) — typical when they edit the cart or refresh the iframe. Only the highest-value cart is shown.`}
                      >
                        +{cart.ghostCartCount} ghost
                      </span>
                    )}
                    {cart.paymentStatus === "failed" && (
                      <span
                        className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full"
                        title={`Payment FAILED on ${cart.paymentGateway || 'unknown gateway'} — likely a card decline. Soften the message tone.`}
                      >
                        Card declined
                      </span>
                    )}
                    {cart.paymentStatus === "cancelled" && (
                      <span
                        className="text-[10px] font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full"
                        title={`Auto-cancelled by cleanup cron after sitting unpaid >6h. Customer reached checkout but never completed payment.`}
                      >
                        Auto-cancelled
                      </span>
                    )}
                  </div>
                </div>

                {/* Cart contents */}
                <div className="mb-4 p-3 bg-accent/40 rounded-lg flex items-start gap-2 text-xs">
                  <ShoppingBag className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    {cart.items.map((it, i) => (
                      <div key={i} className="text-foreground/80">
                        {it.quantity}× {it.productName} {it.variantSize}{" "}
                        <span className="text-muted">
                          (${(it.lineTotalCents / 100).toFixed(2)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message draft (editable) */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" />
                      Message
                    </label>
                    <div className="flex items-center gap-2 text-[11px] text-muted tabular-nums">
                      <span>{charCount} chars · {segments} segment{segments === 1 ? "" : "s"}</span>
                      {isEditing ? (
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Done
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingId(cart.orderId)}
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleReset(cart)}
                        className="text-muted hover:text-foreground inline-flex items-center gap-1"
                        title="Reset to suggested"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </button>
                    </div>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={draft}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [cart.orderId]: e.target.value }))
                      }
                      rows={4}
                      className="w-full text-sm text-foreground/90 bg-background border border-border rounded-lg p-3 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  ) : (
                    <p className="text-sm text-foreground/90 bg-background border border-border rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
                      {draft}
                    </p>
                  )}
                </div>

                {/* Send button */}
                <button
                  onClick={() => handleSend(cart)}
                  disabled={isSending}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Opening iMessage…
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" /> Send Text to{" "}
                      {formatPhone(cart.customerPhone)}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
