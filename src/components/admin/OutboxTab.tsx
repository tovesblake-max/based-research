"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Search, Inbox, AlertCircle, RefreshCw,
  CheckCircle, XCircle, X, Mail, Code, FileText, ExternalLink,
} from "lucide-react";

/**
 * Admin Outbox — every email send (success + failure) is logged in
 * email_log and rendered here. Three things this view answers in one
 * place:
 *
 *   1. Did the message actually leave our server?
 *      (status badge + Mailtrap message_id)
 *   2. What did the recipient actually see?
 *      (full HTML preview in an iframe + plain-text fallback)
 *   3. Why did it fail?
 *      (provider response + error message captured at send time)
 *
 * Filters: text search on recipient/subject, template dropdown,
 * sent/failed status, lookback window.
 */

interface EmailRow {
  id: string;
  toEmail: string;
  subject: string;
  template: string | null;
  status: "sent" | "failed";
  provider: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  relatedOrderId: string | null;
  relatedUserId: string | null;
  sentAt: string;
}

interface ListResponse {
  days: number;
  limit: number;
  offset: number;
  rows: EmailRow[];
  totals: { total: number; sent: number; failed: number };
  templates: Array<{ template: string; count: number }>;
}

interface DetailResponse {
  log: EmailRow & {
    htmlBody: string | null;
    textBody: string | null;
    providerResponse: string | null;
  };
}

const PAGE_SIZE = 50;
const RANGE_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
];

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 60 * 60_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 24 * 60 * 60_000) return `${Math.floor(ms / (60 * 60_000))}h ago`;
  return `${Math.floor(ms / (24 * 60 * 60_000))}d ago`;
}

export default function OutboxTab() {
  const [days, setDays] = useState(30);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [template, setTemplate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "sent" | "failed">("");
  const [page, setPage] = useState(0);

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state for full-detail view
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse["log"] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Debounce the search input so we don't hammer the API on every key.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Reset to page 0 whenever filters change so the new result set
  // starts at the top.
  useEffect(() => {
    setPage(0);
  }, [debouncedQ, template, statusFilter, days]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      days: String(days),
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (debouncedQ) params.set("q", debouncedQ);
    if (template) params.set("template", template);
    if (statusFilter) params.set("status", statusFilter);

    fetch(`/api/admin/email-log?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) {
          setError(j.error);
          return;
        }
        setData(j);
      })
      .catch((err) => setError((err as Error).message || "Load failed"))
      .finally(() => setLoading(false));
  }, [debouncedQ, template, statusFilter, days, page]);

  const refresh = () => {
    // Trigger the effect by bumping a state. Easiest: re-set days to itself.
    setDays((d) => d);
    setPage(0);
  };

  // Fetch detail when openId changes
  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    fetch(`/api/admin/email-log/${openId}`)
      .then((r) => r.json())
      .then((j: DetailResponse | { error: string }) => {
        if ("error" in j) {
          setError(j.error);
          return;
        }
        setDetail(j.log);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setDetailLoading(false));
  }, [openId]);

  // Close modal on Esc + lock body scroll while open
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [openId]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.totals.total / PAGE_SIZE));
  }, [data]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif text-foreground inline-flex items-center gap-2">
            <Inbox className="w-5 h-5 text-muted" />
            Outbox
          </h1>
          <p className="text-sm text-muted mt-1">
            Every email the system has sent. Click any row to see the actual rendered HTML and the provider response.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                days === opt.days
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-border-strong"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={refresh}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-card text-foreground hover:border-border-strong transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* Headline tiles */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <Tile label={`Sends (${days}d)`} value={data.totals.total.toLocaleString()} />
          <Tile label="Delivered" value={data.totals.sent.toLocaleString()} tone="positive" />
          <Tile
            label="Failed"
            value={data.totals.failed.toLocaleString()}
            tone={data.totals.failed > 0 ? "negative" : "neutral"}
          />
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search recipient or subject..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-4 h-9 rounded-lg border border-border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="h-9 px-2 rounded-lg border border-border text-sm bg-background"
        >
          <option value="">All templates</option>
          {data?.templates.map((t) => (
            <option key={t.template} value={t.template === "(untagged)" ? "" : t.template}>
              {t.template} ({t.count})
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | "sent" | "failed")}
          className="h-9 px-2 rounded-lg border border-border text-sm bg-background"
        >
          <option value="">Sent + Failed</option>
          <option value="sent">Sent only</option>
          <option value="failed">Failed only</option>
        </select>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading && !data ? (
          <div className="flex items-center justify-center py-16 text-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading outbox...
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="text-center py-16 text-muted text-sm">
            No emails in this window. {(debouncedQ || template || statusFilter) && "Try widening the filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent/40 text-xs text-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Sent</th>
                  <th className="text-left px-3 py-3 font-medium">Recipient</th>
                  <th className="text-left px-3 py-3 font-medium">Subject</th>
                  <th className="text-left px-3 py-3 font-medium">Template</th>
                  <th className="text-left px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setOpenId(r.id)}
                    className="hover:bg-accent/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">
                      <div className="text-xs text-foreground">{relTime(r.sentAt)}</div>
                      <div className="text-[10px] text-muted">{fmtDateTime(r.sentAt)}</div>
                    </td>
                    <td className="px-3 py-2.5 text-foreground truncate max-w-[200px]" title={r.toEmail}>
                      {r.toEmail}
                    </td>
                    <td className="px-3 py-2.5 text-foreground truncate max-w-[300px]" title={r.subject}>
                      {r.subject}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.template ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-accent text-foreground text-[11px] font-mono">
                          {r.template}
                        </span>
                      ) : (
                        <span className="text-muted text-[11px]">(untagged)</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-success/10 text-success text-[11px] font-medium">
                          <CheckCircle className="w-3 h-3" /> Sent
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[11px] font-medium"
                          title={r.errorMessage || ""}
                        >
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totals.total > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-border bg-accent/20 flex items-center justify-between text-xs text-muted">
            <span>
              Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, data.totals.total)} of {data.totals.total.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 py-1 rounded border border-border bg-card hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Prev
              </button>
              <span className="tabular-nums">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 rounded border border-border bg-card hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {openId && (
        <DetailModal
          loading={detailLoading}
          detail={detail}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function Tile({
  label, value, tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const valueClass =
    tone === "positive" ? "text-success"
    : tone === "negative" ? "text-destructive"
    : "text-foreground";
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1.5 ${valueClass}`}>{value}</p>
    </div>
  );
}

function DetailModal({
  loading, detail, onClose,
}: {
  loading: boolean;
  detail: DetailResponse["log"] | null;
  onClose: () => void;
}) {
  const [view, setView] = useState<"html" | "text" | "raw">("html");

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-card rounded-2xl border border-border overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="w-4 h-4 text-muted flex-shrink-0" />
            <h2 className="text-sm font-semibold text-foreground truncate">
              {detail?.subject || "Email detail"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted hover:text-foreground cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {loading || !detail ? (
          <div className="flex items-center justify-center py-16 text-muted">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading message...
          </div>
        ) : (
          <>
            {/* Metadata strip */}
            <div className="px-5 py-3 border-b border-border bg-accent/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Meta label="To" value={detail.toEmail} mono />
              <Meta label="Sent" value={fmtDateTime(detail.sentAt)} />
              <Meta label="Template" value={detail.template || "(untagged)"} mono />
              <Meta
                label="Status"
                value={detail.status}
                tone={detail.status === "sent" ? "positive" : "negative"}
              />
              {detail.providerMessageId && (
                <Meta label="Mailtrap ID" value={detail.providerMessageId} mono colSpan />
              )}
              {detail.errorMessage && (
                <Meta label="Error" value={detail.errorMessage} tone="negative" colSpan />
              )}
              {detail.relatedOrderId && (
                <Meta
                  label="Order"
                  value={detail.relatedOrderId.slice(0, 8) + "..."}
                  mono
                />
              )}
            </div>

            {/* View tabs */}
            <div className="px-5 py-2 border-b border-border bg-card flex items-center gap-1">
              <ViewTab
                active={view === "html"}
                onClick={() => setView("html")}
                icon={<FileText className="w-3.5 h-3.5" />}
                label="HTML preview"
              />
              <ViewTab
                active={view === "text"}
                onClick={() => setView("text")}
                icon={<FileText className="w-3.5 h-3.5" />}
                label="Plain text"
              />
              <ViewTab
                active={view === "raw"}
                onClick={() => setView("raw")}
                icon={<Code className="w-3.5 h-3.5" />}
                label="Raw HTML"
              />
            </div>

            {/* Body */}
            <div className="bg-background">
              {view === "html" && (
                <iframe
                  // sandbox: no scripts, no top-nav. Just for visual preview.
                  // srcDoc lets us avoid any cross-origin shenanigans.
                  srcDoc={detail.htmlBody || "<p style='font-family:sans-serif;color:#999;padding:20px'>(no html body)</p>"}
                  sandbox=""
                  title="Email HTML preview"
                  className="w-full h-[60vh] bg-white border-0"
                />
              )}
              {view === "text" && (
                <pre className="p-5 whitespace-pre-wrap font-sans text-sm text-foreground bg-background min-h-[40vh] max-h-[60vh] overflow-auto">
                  {detail.textBody || "(no plain-text body)"}
                </pre>
              )}
              {view === "raw" && (
                <pre className="p-5 whitespace-pre-wrap text-xs font-mono text-foreground bg-background min-h-[40vh] max-h-[60vh] overflow-auto">
                  {detail.htmlBody || "(no html body)"}
                </pre>
              )}
            </div>

            {/* Footer */}
            <footer className="px-5 py-3 border-t border-border bg-accent/20 flex items-center justify-between text-xs text-muted gap-2">
              <span>
                Provider: <span className="font-mono">{detail.provider}</span>
              </span>
              {detail.relatedOrderId && (
                <a
                  href="#orders"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                  onClick={(e) => {
                    // We could deep-link to /admin?tab=orders&order=<id>; for now
                    // surface the order ID for copy + manual nav.
                    e.preventDefault();
                    navigator.clipboard?.writeText(detail.relatedOrderId!).catch(() => {});
                  }}
                >
                  Copy order ID <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function Meta({
  label, value, mono, tone, colSpan,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "positive" | "negative";
  colSpan?: boolean;
}) {
  const valueClass =
    tone === "positive" ? "text-success font-medium"
    : tone === "negative" ? "text-destructive font-medium"
    : "text-foreground";
  return (
    <div className={colSpan ? "sm:col-span-4" : ""}>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`text-xs mt-0.5 break-all ${mono ? "font-mono" : ""} ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function ViewTab({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted hover:text-foreground hover:bg-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
