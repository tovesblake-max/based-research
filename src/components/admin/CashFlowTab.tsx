"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, AlertCircle, RefreshCw, Download } from "lucide-react";

/**
 * Cash-flow report — day-by-day breakdown of:
 *   revenue → minus refunds → minus processor fee → cash actually deposited
 *
 * Plus the corresponding profit math (gross + net), where net profit
 * subtracts the processor fee.
 *
 * This template ships without a payment processor, so the fee rate defaults
 * to 0 (set PROCESSING_FEE_RATE in /api/admin/cash-flow once you wire one).
 *
 * Data source: GET /api/admin/cash-flow?days=N. The API enforces 1 ≤ N ≤ 180.
 */

interface DailyRow {
  day: string;
  orders: number;
  revenue: number;
  refunds: number;
  cogs: number;
  hasMissingCost: boolean;
  fee: number;
  cashDeposited: number;
  grossProfit: number;
  netProfit: number;
}

interface Totals {
  orders: number;
  revenue: number;
  refunds: number;
  cogs: number;
  fee: number;
  cashDeposited: number;
  grossProfit: number;
  netProfit: number;
  hasMissingCost: boolean;
}

interface CashFlowResponse {
  days: number;
  constants: {
    processingFeeRate: number;
  };
  rollup: DailyRow[];
  totals: Totals;
}

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
];

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function fmtPct(rate: number): string {
  return `${(rate * 100).toFixed(rate < 0.1 && rate > 0 ? 1 : 0)}%`;
}

function fmtDate(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function CashFlowTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<CashFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (windowDays: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cash-flow?days=${windowDays}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as CashFlowResponse;
      setData(json);
    } catch (err) {
      setError((err as Error).message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(days);
  }, [days]);

  const sortedRollup = useMemo(() => {
    if (!data) return [];
    // Most recent day on top — reads like a journal entry.
    return [...data.rollup].sort((a, b) => b.day.localeCompare(a.day));
  }, [data]);

  const downloadCsv = () => {
    if (!data) return;
    const header = [
      "day", "orders", "revenue_usd", "refunds_usd", "cogs_usd",
      "fee_usd", "cash_deposited_usd", "gross_profit_usd", "net_profit_usd",
    ];
    const lines = [header.join(",")];
    for (const r of sortedRollup) {
      lines.push([
        r.day, r.orders,
        (r.revenue / 100).toFixed(2),
        (r.refunds / 100).toFixed(2),
        (r.cogs / 100).toFixed(2),
        (r.fee / 100).toFixed(2),
        (r.cashDeposited / 100).toFixed(2),
        (r.grossProfit / 100).toFixed(2),
        (r.netProfit / 100).toFixed(2),
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-flow-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const feeRate = data?.constants.processingFeeRate ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Cash Flow</h1>
          <p className="text-sm text-muted mt-1">
            Day-by-day revenue → fees → cash to bank.
          </p>
          {data && feeRate === 0 && (
            <p className="mt-2 text-[11px] text-muted">
              Processor fee rate is 0% — no payment processor is wired. Set{" "}
              <code className="font-mono text-foreground">PROCESSING_FEE_RATE</code> in{" "}
              <code className="font-mono text-foreground">/api/admin/cash-flow</code> once you integrate one.
            </p>
          )}
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
            onClick={() => fetchData(days)}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-card text-foreground hover:border-border-strong transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={downloadCsv}
            disabled={loading || !data}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-card text-foreground hover:border-border-strong transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </header>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading cash-flow data…
        </div>
      )}

      {data && (
        <>
          {/* Headline summary cards — at-a-glance period totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label={`Revenue (${days}d)`}
              value={fmt(data.totals.revenue)}
              subtext={`${data.totals.orders} paid orders`}
            />
            <SummaryCard
              label="Processor fee"
              value={fmt(data.totals.fee)}
              subtext={`${fmtPct(feeRate)} of revenue`}
              tone="negative"
            />
            <SummaryCard
              label="Cash deposited"
              value={fmt(data.totals.cashDeposited)}
              subtext="Revenue − refunds − fee"
              tone="positive"
            />
            <SummaryCard
              label="Net profit"
              value={fmt(data.totals.netProfit)}
              subtext="Gross − processor fee"
              tone="positive"
            />
            <SummaryCard
              label="Gross profit"
              value={fmt(data.totals.grossProfit)}
              subtext="Revenue − refunds − COGS"
            />
            <SummaryCard
              label="Refunds"
              value={fmt(data.totals.refunds)}
              subtext="Issued in this window"
              tone={data.totals.refunds > 0 ? "negative" : "neutral"}
            />
            <SummaryCard
              label="COGS"
              value={fmt(data.totals.cogs)}
              subtext={data.totals.hasMissingCost ? "⚠ some lines missing cost" : "All lines costed"}
            />
          </div>

          <CashFlowChart rollup={[...sortedRollup].reverse()} />

          {/* Day-by-day table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-accent/40 text-xs text-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Day</th>
                    <th className="text-right px-3 py-3 font-medium">Orders</th>
                    <th className="text-right px-3 py-3 font-medium">Revenue</th>
                    <th className="text-right px-3 py-3 font-medium">Refunds</th>
                    <th className="text-right px-3 py-3 font-medium">COGS</th>
                    <th className="text-right px-3 py-3 font-medium" title="Estimated processor fee">
                      Fee
                    </th>
                    <th className="text-right px-3 py-3 font-medium border-l border-border bg-accent/30">
                      Cash to bank
                    </th>
                    <th className="text-right px-3 py-3 font-medium">Net profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedRollup.map((r) => (
                    <tr key={r.day} className="hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">
                        {fmtDate(r.day)}
                        <span className="block text-[10px] text-muted font-mono">{r.day}</span>
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-foreground">{r.orders}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-foreground">{fmt(r.revenue)}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-foreground">
                        {r.refunds > 0 ? <span className="text-destructive">−{fmt(r.refunds)}</span> : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-foreground">
                        {fmt(r.cogs)}
                        {r.hasMissingCost && (
                          <span className="ml-1 text-[10px] text-amber-600" title="Some lines missing cost data">
                            ⚠
                          </span>
                        )}
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-destructive">
                        {r.fee > 0 ? `−${fmt(r.fee)}` : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-foreground font-semibold border-l border-border bg-accent/10">
                        {fmt(r.cashDeposited)}
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums">
                        <span className={r.netProfit >= 0 ? "text-success font-medium" : "text-destructive"}>
                          {r.netProfit >= 0 ? "" : "−"}
                          {fmt(Math.abs(r.netProfit))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {sortedRollup.length > 0 && (
                  <tfoot className="bg-accent/40 text-foreground font-semibold">
                    <tr>
                      <td className="px-4 py-3">Total ({days}d)</td>
                      <td className="text-right px-3 py-3 tabular-nums">{data.totals.orders}</td>
                      <td className="text-right px-3 py-3 tabular-nums">{fmt(data.totals.revenue)}</td>
                      <td className="text-right px-3 py-3 tabular-nums text-destructive">
                        {data.totals.refunds > 0 ? `−${fmt(data.totals.refunds)}` : "—"}
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums">{fmt(data.totals.cogs)}</td>
                      <td className="text-right px-3 py-3 tabular-nums text-destructive">
                        {data.totals.fee > 0 ? `−${fmt(data.totals.fee)}` : "—"}
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums border-l border-border bg-accent/20">
                        {fmt(data.totals.cashDeposited)}
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums">
                        <span className={data.totals.netProfit >= 0 ? "text-success" : "text-destructive"}>
                          {data.totals.netProfit >= 0 ? "" : "−"}
                          {fmt(Math.abs(data.totals.netProfit))}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {sortedRollup.length === 0 && !loading && (
              <div className="text-center py-12 text-muted text-sm">
                No paid orders in this window.
              </div>
            )}
          </div>

          {/* Footnotes */}
          <div className="text-xs text-muted leading-relaxed bg-accent/30 rounded-lg p-4 border border-border space-y-1.5">
            <p>
              <strong className="text-foreground">Method.</strong>{" "}
              Days are bucketed in America/Chicago. Only orders with{" "}
              <code className="font-mono text-foreground">payment_status = &apos;completed&apos;</code> are counted.
              Refunds are subtracted from the original booking day, not the refund day.
            </p>
            <p>
              <strong className="text-foreground">Processor fee.</strong>{" "}
              Estimated as {fmtPct(feeRate)} of revenue. No payment processor is wired in this template, so the
              rate defaults to 0 — set it to your processor&apos;s effective rate to see true cash + net profit.
            </p>
            {data.totals.hasMissingCost && (
              <p className="text-amber-600">
                <strong>⚠ Some line items lack a cost on file</strong> — COGS / profit numbers for those
                days are understated. Check{" "}
                <code className="font-mono">products.ts</code> for variants without{" "}
                <code className="font-mono">costCents</code> set.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subtext,
  tone = "neutral",
}: {
  label: string;
  value: string;
  subtext?: string;
  tone?: "positive" | "negative" | "warning" | "neutral";
}) {
  const valueClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : tone === "warning"
          ? "text-amber-600"
          : "text-foreground";

  const Icon = tone === "positive" ? TrendingUp : tone === "negative" ? TrendingDown : null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`text-xl font-bold tabular-nums mt-1.5 flex items-center gap-1.5 ${valueClass}`}>
        {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
        {value}
      </p>
      {subtext && <p className="text-[11px] text-muted mt-1 leading-tight">{subtext}</p>}
    </div>
  );
}

/**
 * Hand-rolled SVG stacked-bar chart for the day-by-day cash composition.
 * Each bar = one day, segments stacked bottom-up:
 *   [ cash (green) | fee (slate) | refunds (red) ]  with a COGS overlay tick.
 * Total bar height = revenue (gross).
 */
function CashFlowChart({ rollup }: { rollup: DailyRow[] }) {
  if (rollup.length === 0) return null;

  const W = 1000;
  const H = 240;
  const PAD_L = 50;
  const PAD_R = 16;
  const PAD_T = 12;
  const PAD_B = 30;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const maxRevenue = Math.max(1, ...rollup.map((r) => Math.max(r.revenue, r.cogs)));
  const barCount = rollup.length;
  const barGap = 4;
  const barWidth = Math.max(4, (innerW - barGap * (barCount - 1)) / barCount);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(maxRevenue * p));

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Daily revenue composition</h3>
          <p className="text-[11px] text-muted">Each bar stacks revenue → fee → refunds, leaving the green &quot;cash to bank&quot; segment on top.</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <LegendDot color="bg-emerald-500" label="Cash" />
          <LegendDot color="bg-slate-500" label="Fee" />
          <LegendDot color="bg-red-500" label="Refunds" />
          <LegendDot color="bg-gray-300" label="COGS overlay" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Y-axis grid + labels */}
          {ticks.map((t) => {
            const y = PAD_T + innerH - (t / maxRevenue) * innerH;
            return (
              <g key={t}>
                <line
                  x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
                  stroke="rgb(229 231 235)" strokeWidth={1} strokeDasharray="2 3"
                />
                <text
                  x={PAD_L - 6} y={y + 3}
                  fontSize={9} fill="rgb(115 115 115)" textAnchor="end" fontFamily="ui-monospace, monospace"
                >
                  {t === 0 ? "$0" : `$${(t / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {rollup.map((r, i) => {
            const x = PAD_L + i * (barWidth + barGap);
            const cashH = (Math.max(0, r.cashDeposited) / maxRevenue) * innerH;
            const feeH = (r.fee / maxRevenue) * innerH;
            const refundH = (r.refunds / maxRevenue) * innerH;
            const cogsH = (r.cogs / maxRevenue) * innerH;
            const baseY = PAD_T + innerH;
            const cashY = baseY - cashH;
            const feeY = cashY - feeH;
            const refundY = feeY - refundH;
            const cogsY = baseY - cogsH;

            const dayLabel = (() => {
              const [y, m, d] = r.day.split("-");
              return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            })();

            return (
              <g key={r.day}>
                <title>
                  {`${r.day} — ${r.orders} orders\n` +
                    `Revenue: $${(r.revenue / 100).toFixed(2)}\n` +
                    `Refunds: $${(r.refunds / 100).toFixed(2)}\n` +
                    `Fee: $${(r.fee / 100).toFixed(2)}\n` +
                    `Cash: $${(r.cashDeposited / 100).toFixed(2)}\n` +
                    `COGS: $${(r.cogs / 100).toFixed(2)}\n` +
                    `Net profit: $${(r.netProfit / 100).toFixed(2)}`}
                </title>
                {cashH > 0 && <rect x={x} y={cashY} width={barWidth} height={cashH} fill="rgb(16 185 129)" />}
                {feeH > 0 && <rect x={x} y={feeY} width={barWidth} height={feeH} fill="rgb(100 116 139)" />}
                {refundH > 0 && <rect x={x} y={refundY} width={barWidth} height={refundH} fill="rgb(239 68 68)" />}
                {cogsH > 0 && (
                  <line
                    x1={x - 1} x2={x + barWidth + 1} y1={cogsY} y2={cogsY}
                    stroke="rgb(156 163 175)" strokeWidth={1.5} strokeDasharray="2 1"
                  />
                )}
                {(barCount <= 14 || i % Math.ceil(barCount / 12) === 0) && (
                  <text
                    x={x + barWidth / 2}
                    y={H - PAD_B + 14}
                    fontSize={9}
                    fill="rgb(115 115 115)"
                    textAnchor="middle"
                  >
                    {dayLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted">
      <span className={`w-2.5 h-2.5 rounded-sm ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}
