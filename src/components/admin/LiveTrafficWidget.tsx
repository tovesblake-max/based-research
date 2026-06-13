"use client";

import { useEffect, useState } from "react";
import { Activity, Eye, TrendingUp, AlertTriangle } from "lucide-react";

interface LiveTraffic {
  activeUsers: number;
  pageviews24h: number;
  topPages: Array<{ path: string; views: number }>;
  funnel: {
    views: number;
    adds: number;
    checkouts: number;
    purchases: number;
  };
  ok: boolean;
  fetchedAt: string;
}

const POLL_INTERVAL_MS = 15_000;

function pct(top: number, bottom: number): string {
  if (!bottom) return "–";
  return `${((top / bottom) * 100).toFixed(1)}%`;
}

export default function LiveTrafficWidget() {
  const [data, setData] = useState<LiveTraffic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/live-traffic", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setError("Could not load traffic data");
          return;
        }
        const body = (await res.json()) as LiveTraffic;
        if (cancelled) return;
        setData(body);
        setError(null);
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-success" aria-hidden="true" />
            Live Traffic
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Refreshes every 15s · powered by PostHog
          </p>
        </div>
        {data && !data.ok && (
          <span className="text-[11px] text-warm flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            Stale data
          </span>
        )}
      </div>

      {loading && !data ? (
        <div className="h-36 flex items-center justify-center text-sm text-muted">
          Loading traffic…
        </div>
      ) : error && !data ? (
        <div className="h-36 flex items-center justify-center text-sm text-destructive">
          {error}
        </div>
      ) : data ? (
        <>
          {/* ── Top-line stats ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="flex items-start justify-between p-4 rounded-lg bg-accent/40 border border-border/60">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted mb-1">
                  Active now
                </p>
                <p className="text-3xl font-semibold text-foreground tabular-nums">
                  {data.activeUsers}
                </p>
                <p className="text-[11px] text-muted mt-0.5">last 5 minutes</p>
              </div>
              <div className="relative">
                <span className="block w-2 h-2 rounded-full bg-success" aria-hidden="true" />
                {data.activeUsers > 0 && (
                  <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" aria-hidden="true" />
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-accent/40 border border-border/60">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted mb-1">
                Pageviews
              </p>
              <p className="text-3xl font-semibold text-foreground tabular-nums">
                {data.pageviews24h.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted mt-0.5">last 24 hours</p>
            </div>
          </div>

          {/* ── Top pages right now ── */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
              <Eye className="w-3 h-3" aria-hidden="true" />
              Top pages · last hour
            </h3>
            {data.topPages.length === 0 ? (
              <p className="text-sm text-muted italic">No traffic in the last hour.</p>
            ) : (
              <div className="space-y-1.5">
                {data.topPages.map((p) => {
                  const max = data.topPages[0]?.views || 1;
                  const pct = Math.round((p.views / max) * 100);
                  return (
                    <div key={p.path} className="relative overflow-hidden rounded-md bg-accent/20 border border-border/40">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/10"
                        style={{ width: `${pct}%` }}
                        aria-hidden="true"
                      />
                      <div className="relative flex items-center justify-between px-3 py-1.5 text-sm">
                        <span className="truncate font-mono text-xs text-foreground">
                          {p.path}
                        </span>
                        <span className="tabular-nums text-foreground font-medium ml-2">
                          {p.views}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 24h funnel ── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" aria-hidden="true" />
              Funnel · last 24 hours
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <FunnelStep label="Views" value={data.funnel.views} />
              <FunnelStep
                label="Added"
                value={data.funnel.adds}
                rate={pct(data.funnel.adds, data.funnel.views)}
              />
              <FunnelStep
                label="Checkout"
                value={data.funnel.checkouts}
                rate={pct(data.funnel.checkouts, data.funnel.adds)}
              />
              <FunnelStep
                label="Purchase"
                value={data.funnel.purchases}
                rate={pct(data.funnel.purchases, data.funnel.checkouts)}
              />
            </div>
            <p className="text-[10px] text-muted mt-2">
              Conversion rate (view → purchase):{" "}
              <span className="font-medium text-foreground">
                {pct(data.funnel.purchases, data.funnel.views)}
              </span>
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function FunnelStep({
  label,
  value,
  rate,
}: {
  label: string;
  value: number;
  rate?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-accent/40 border border-border/60 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted mb-1">
        {label}
      </p>
      <p className="text-xl font-semibold text-foreground tabular-nums">
        {value.toLocaleString()}
      </p>
      {rate !== undefined && (
        <p className="text-[10px] text-muted mt-0.5">{rate}</p>
      )}
    </div>
  );
}
