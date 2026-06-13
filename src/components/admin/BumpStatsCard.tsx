"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";

interface BumpStats {
  days: number;
  shown: number;
  accepted: number;
  takeRate: number;
  revenueCents: number;
}

/**
 * Bump-offer take-rate widget. Compact form for the Overview tab. Pulls
 * /api/admin/bump-stats with a configurable window (default 30d).
 *
 * The same endpoint historically powered a much larger widget on the
 * Settings tab; that's been trimmed back to just the on/off toggle and
 * this card now owns the stats display on Overview where it's actually
 * useful (next to the other revenue-pulse metrics).
 */
export default function BumpStatsCard() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<BumpStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/bump-stats?days=${days}`)
      .then((r) => r.json())
      .then((b) => { if (typeof b.shown === "number") setStats(b); })
      .catch((err) => console.error("[BumpStatsCard]", err))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="bg-white rounded-xl border border-border p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Bump take rate
        </h2>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10))}
          className="text-[11px] border border-border rounded px-1.5 py-0.5 bg-white cursor-pointer"
        >
          <option value={7}>7d</option>
          <option value={30}>30d</option>
          <option value={90}>90d</option>
        </select>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-6 text-muted">
          <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
          <span className="text-xs">Loading…</span>
        </div>
      ) : !stats || stats.shown === 0 ? (
        <p className="text-xs text-muted py-2">No bump impressions in this window.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Cell label="Take rate" value={`${(stats.takeRate * 100).toFixed(1)}%`} accent />
          <Cell label="Revenue lift" value={`$${(stats.revenueCents / 100).toFixed(0)}`} />
          <Cell label="Shown" value={stats.shown.toLocaleString()} small />
          <Cell label="Accepted" value={stats.accepted.toLocaleString()} small />
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
      <p className={`${small ? "text-sm" : "text-xl"} font-bold tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
