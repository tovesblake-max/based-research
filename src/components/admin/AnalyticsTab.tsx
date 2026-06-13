"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Users, MapPin, Link2, Target, AlertCircle, TrendingUp,
  Mail, Phone, ArrowDownRight, ArrowUpRight,
} from "lucide-react";

/**
 * Analytics tab — five independent reporting modules in one tab:
 *
 *   1. Top Customers (lifetime spend)
 *   2. Cohort Retention (signup-month repeat rates)
 *   3. Acquisition Sources (utm + referrer + landing rollups)
 *   4. Geographic (revenue by US state)
 *   5. Buyer Behavior (PostHog HogQL: landings, coupons, hour-of-day,
 *      device split, time-to-purchase)
 *
 * Each module fetches its own data and renders independently — no
 * cross-section blocking. The page uses anchor-link sub-nav so the
 * admin can jump straight to a section.
 */

// ── tiny shared helpers ──────────────────────────────────────────
function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}
function relativeDays(days: number | null): string {
  if (days == null) return "—";
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const SECTIONS = [
  { id: "customers", label: "Top Customers", icon: Users },
  { id: "cohorts", label: "Cohort Retention", icon: TrendingUp },
  { id: "acquisition", label: "Acquisition Sources", icon: Target },
  { id: "geo", label: "Geographic", icon: MapPin },
  { id: "behavior", label: "Buyer Behavior", icon: Link2 },
];

export default function AnalyticsTab() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-serif text-foreground">Analytics</h1>
        <p className="text-sm text-muted mt-1">
          Customer LTV, retention cohorts, acquisition attribution, geographic
          mix, and buyer-journey behavior — one tab, five reports.
        </p>
        {/* Section nav — sticky-ish anchor jumps */}
        <nav className="mt-4 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-card text-foreground hover:border-border-strong transition-colors"
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      <TopCustomersSection />
      <CohortRetentionSection />
      <AcquisitionSection />
      <GeoSection />
      <BuyerBehaviorSection />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 1. Top Customers
// ─────────────────────────────────────────────────────────────────
interface BuyerRow {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  signupAt: string | null;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  daysSinceLastOrder: number | null;
  lifetimeRevenue: number;
  orderCount: number;
  aov: number;
  refundedTotal: number;
}

function TopCustomersSection() {
  const [limit, setLimit] = useState(25);
  const [data, setData] = useState<BuyerRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/customers?limit=${limit}`)
      .then((r) => r.json())
      .then((j) => setData(j.buyers || []))
      .catch((e) => setError(e.message || "Load failed"))
      .finally(() => setLoading(false));
  }, [limit]);

  return (
    <section id="customers" className="scroll-mt-24">
      <SectionHeader
        icon={Users}
        title="Top customers by lifetime spend"
        sub="Sorted by lifetime revenue. Use to spot VIPs, plan win-back outreach for cold-but-valuable buyers."
      >
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="text-xs h-8 px-2 rounded border border-border bg-card"
        >
          <option value={10}>Top 10</option>
          <option value={25}>Top 25</option>
          <option value={50}>Top 50</option>
          <option value={100}>Top 100</option>
        </select>
      </SectionHeader>

      {error && <ErrorRow msg={error} />}
      {loading && !data && <SectionLoader />}

      {data && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent/40 text-xs text-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-3 py-3 font-medium">Customer</th>
                  <th className="text-left px-3 py-3 font-medium">Contact</th>
                  <th className="text-right px-3 py-3 font-medium">Lifetime $</th>
                  <th className="text-right px-3 py-3 font-medium">Orders</th>
                  <th className="text-right px-3 py-3 font-medium">AOV</th>
                  <th className="text-right px-3 py-3 font-medium">Last order</th>
                  <th className="text-right px-3 py-3 font-medium">Refunded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((b, i) => {
                  const name =
                    [b.firstName, b.lastName].filter(Boolean).join(" ") ||
                    b.email ||
                    "(no name)";
                  const cold = b.daysSinceLastOrder != null && b.daysSinceLastOrder > 60;
                  return (
                    <tr key={b.userId} className="hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-2.5 text-muted font-mono text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground">{name}</div>
                        {b.signupAt && (
                          <div className="text-[10px] text-muted">
                            joined {new Date(b.signupAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          {b.email && (
                            <a
                              href={`mailto:${b.email}`}
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <Mail className="w-3 h-3" /> {b.email}
                            </a>
                          )}
                          {b.phone && (
                            <a
                              href={`sms:${b.phone}`}
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" /> {b.phone}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums font-semibold text-foreground">
                        {fmt(b.lifetimeRevenue)}
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-foreground">
                        {b.orderCount}
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-muted">
                        {fmt(b.aov)}
                      </td>
                      <td className={`text-right px-3 py-2.5 tabular-nums text-xs ${cold ? "text-amber-600" : "text-muted"}`}>
                        {relativeDays(b.daysSinceLastOrder)}
                        {cold && <span className="ml-1" title="Cold customer (>60d) — outreach candidate">❄</span>}
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-xs">
                        {b.refundedTotal > 0 ? <span className="text-destructive">{fmt(b.refundedTotal)}</span> : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted text-sm">
                      No paying customers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// 2. Cohort Retention
// ─────────────────────────────────────────────────────────────────
interface CohortRow {
  cohort: string;
  cohortSize: number;
  buyers: number;
  conversionPct: number;
  buyersWithRepeat30d: number;
  buyersWithRepeat60d: number;
  buyersWithRepeat90d: number;
  buyersWithRepeat180d: number;
  revenueLifetime: number;
  ordersLifetime: number;
  aovLifetime: number;
  revenuePerSignup: number;
}

function CohortRetentionSection() {
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<CohortRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/cohorts?months=${months}`)
      .then((r) => r.json())
      .then((j) => setData(j.cohorts || []))
      .catch((e) => setError(e.message || "Load failed"))
      .finally(() => setLoading(false));
  }, [months]);

  return (
    <section id="cohorts" className="scroll-mt-24">
      <SectionHeader
        icon={TrendingUp}
        title="Signup-month cohort retention"
        sub="What % of users who signed up in each month went on to buy, and what % bought a second time within 30/60/90/180 days. The 60-90d window is the meaningful repeat-purchase signal for peptides."
      >
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="text-xs h-8 px-2 rounded border border-border bg-card"
        >
          <option value={6}>6 months</option>
          <option value={12}>12 months</option>
          <option value={24}>24 months</option>
        </select>
      </SectionHeader>

      {error && <ErrorRow msg={error} />}
      {loading && !data && <SectionLoader />}

      {data && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent/40 text-xs text-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Cohort</th>
                  <th className="text-right px-3 py-3 font-medium">Signups</th>
                  <th className="text-right px-3 py-3 font-medium">Buyers</th>
                  <th className="text-right px-3 py-3 font-medium">Conv %</th>
                  <th className="text-right px-3 py-3 font-medium" title="Buyers who placed a 2nd+ order within 30 days of their first">+30d repeat</th>
                  <th className="text-right px-3 py-3 font-medium">+60d</th>
                  <th className="text-right px-3 py-3 font-medium">+90d</th>
                  <th className="text-right px-3 py-3 font-medium">+180d</th>
                  <th className="text-right px-3 py-3 font-medium">LTV / signup</th>
                  <th className="text-right px-3 py-3 font-medium">Revenue (cohort)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((c) => {
                  const r30Pct = c.buyers > 0 ? (c.buyersWithRepeat30d / c.buyers) * 100 : 0;
                  const r60Pct = c.buyers > 0 ? (c.buyersWithRepeat60d / c.buyers) * 100 : 0;
                  const r90Pct = c.buyers > 0 ? (c.buyersWithRepeat90d / c.buyers) * 100 : 0;
                  const r180Pct = c.buyers > 0 ? (c.buyersWithRepeat180d / c.buyers) * 100 : 0;
                  return (
                    <tr key={c.cohort} className="hover:bg-accent/20">
                      <td className="px-4 py-2.5 font-mono text-xs text-foreground">{c.cohort}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums">{c.cohortSize}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums">{c.buyers}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums">
                        <span className={c.conversionPct >= 20 ? "text-success font-medium" : "text-foreground"}>
                          {fmtPct(c.conversionPct, 1)}
                        </span>
                      </td>
                      <CohortPctCell pct={r30Pct} count={c.buyersWithRepeat30d} />
                      <CohortPctCell pct={r60Pct} count={c.buyersWithRepeat60d} />
                      <CohortPctCell pct={r90Pct} count={c.buyersWithRepeat90d} />
                      <CohortPctCell pct={r180Pct} count={c.buyersWithRepeat180d} />
                      <td className="text-right px-3 py-2.5 tabular-nums text-foreground">{fmt(c.revenuePerSignup)}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-foreground font-medium">{fmt(c.revenueLifetime)}</td>
                    </tr>
                  );
                })}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted text-sm">
                      No cohort data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function CohortPctCell({ pct, count }: { pct: number; count: number }) {
  // Visual heatmap: lighter green for higher repeat rates.
  const bg =
    pct >= 30 ? "bg-success/20"
    : pct >= 20 ? "bg-success/10"
    : pct >= 10 ? "bg-amber-50"
    : pct > 0 ? "bg-card" : "bg-card";
  return (
    <td className={`text-right px-3 py-2.5 tabular-nums ${bg}`}>
      <span className="text-foreground font-medium">{fmtPct(pct, 0)}</span>
      <span className="text-[10px] text-muted ml-1">({count})</span>
    </td>
  );
}

// ─────────────────────────────────────────────────────────────────
// 3. Acquisition Sources
// ─────────────────────────────────────────────────────────────────
interface AcqSource { source: string; medium: string | null; campaign: string | null; orders: number; revenue: number; aov: number; distinctBuyers: number; }
interface Referrer { referrer: string; orders: number; revenue: number; distinctBuyers: number; aov: number; }
interface Landing { path: string; orders: number; revenue: number; distinctBuyers: number; aov: number; }

function AcquisitionSection() {
  const [days, setDays] = useState(30);
  const [groupBy, setGroupBy] = useState<"source" | "campaign">("source");
  const [data, setData] = useState<{ sources: AcqSource[]; referrers: Referrer[]; landings: Landing[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/acquisition?days=${days}&groupBy=${groupBy}`)
      .then((r) => r.json())
      .then((j) => setData({ sources: j.sources || [], referrers: j.referrers || [], landings: j.landings || [] }))
      .catch((e) => setError(e.message || "Load failed"))
      .finally(() => setLoading(false));
  }, [days, groupBy]);

  const totalRev = useMemo(
    () => (data?.sources || []).reduce((sum, s) => sum + s.revenue, 0),
    [data],
  );

  return (
    <section id="acquisition" className="scroll-mt-24">
      <SectionHeader
        icon={Target}
        title="Acquisition source attribution"
        sub="First-touch attribution via UTM params, referrer domain, and landing page. Captured at first tagged page-load (90d localStorage TTL), persisted at order time. Untagged direct traffic buckets to its own row."
      >
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="text-xs h-8 px-2 rounded border border-border bg-card">
          <option value={7}>7d</option>
          <option value={30}>30d</option>
          <option value={90}>90d</option>
          <option value={180}>180d</option>
        </select>
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as "source" | "campaign")} className="text-xs h-8 px-2 rounded border border-border bg-card">
          <option value="source">Group: source</option>
          <option value="campaign">Group: source / medium / campaign</option>
        </select>
      </SectionHeader>

      {error && <ErrorRow msg={error} />}
      {loading && !data && <SectionLoader />}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sources */}
          <div className="lg:col-span-3 bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-accent/30">
              <h3 className="text-sm font-semibold text-foreground">Sources {groupBy === "campaign" && "/ Medium / Campaign"}</h3>
              <span className="text-xs text-muted">Total {fmt(totalRev)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Source</th>
                    {groupBy === "campaign" && <>
                      <th className="text-left px-3 py-2.5 font-medium">Medium</th>
                      <th className="text-left px-3 py-2.5 font-medium">Campaign</th>
                    </>}
                    <th className="text-right px-3 py-2.5 font-medium">Orders</th>
                    <th className="text-right px-3 py-2.5 font-medium">Buyers</th>
                    <th className="text-right px-3 py-2.5 font-medium">AOV</th>
                    <th className="text-right px-3 py-2.5 font-medium">Revenue</th>
                    <th className="text-right px-3 py-2.5 font-medium">% of total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.sources.map((s, i) => {
                    const pct = totalRev > 0 ? (s.revenue / totalRev) * 100 : 0;
                    return (
                      <tr key={`${s.source}-${s.medium}-${s.campaign}-${i}`} className="hover:bg-accent/20">
                        <td className="px-4 py-2 font-medium text-foreground">{s.source}</td>
                        {groupBy === "campaign" && <>
                          <td className="px-3 py-2 text-muted">{s.medium || "—"}</td>
                          <td className="px-3 py-2 text-muted truncate max-w-[200px]" title={s.campaign || ""}>{s.campaign || "—"}</td>
                        </>}
                        <td className="text-right px-3 py-2 tabular-nums">{s.orders}</td>
                        <td className="text-right px-3 py-2 tabular-nums text-muted">{s.distinctBuyers}</td>
                        <td className="text-right px-3 py-2 tabular-nums text-muted">{fmt(s.aov)}</td>
                        <td className="text-right px-3 py-2 tabular-nums font-semibold text-foreground">{fmt(s.revenue)}</td>
                        <td className="text-right px-3 py-2 tabular-nums text-xs text-muted">{fmtPct(pct, 1)}</td>
                      </tr>
                    );
                  })}
                  {data.sources.length === 0 && (
                    <tr><td colSpan={groupBy === "campaign" ? 7 : 5} className="text-center py-6 text-muted text-sm">No tagged orders in this window. UTM capture started 2026-05-05 — older orders show as &quot;untagged&quot;.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Referrers */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-accent/30">
              <h3 className="text-sm font-semibold text-foreground">Top referrer domains</h3>
            </div>
            <div className="overflow-y-auto max-h-80">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {data.referrers.map((r) => (
                    <tr key={r.referrer} className="hover:bg-accent/20">
                      <td className="px-4 py-2 text-foreground truncate max-w-[200px]" title={r.referrer}>{r.referrer}</td>
                      <td className="text-right px-3 py-2 tabular-nums text-xs">
                        <div className="font-medium text-foreground">{fmt(r.revenue)}</div>
                        <div className="text-[10px] text-muted">{r.orders} orders · {r.distinctBuyers} buyers</div>
                      </td>
                    </tr>
                  ))}
                  {data.referrers.length === 0 && <tr><td className="px-4 py-4 text-center text-muted text-sm">No referrer data.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Landings */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-accent/30">
              <h3 className="text-sm font-semibold text-foreground">Top landing pages (orders only)</h3>
            </div>
            <div className="overflow-y-auto max-h-80">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Path</th>
                    <th className="text-right px-3 py-2 font-medium">Orders</th>
                    <th className="text-right px-3 py-2 font-medium">Buyers</th>
                    <th className="text-right px-3 py-2 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.landings.map((l) => (
                    <tr key={l.path} className="hover:bg-accent/20">
                      <td className="px-4 py-2 font-mono text-xs text-foreground truncate max-w-[260px]" title={l.path}>{l.path}</td>
                      <td className="text-right px-3 py-2 tabular-nums">{l.orders}</td>
                      <td className="text-right px-3 py-2 tabular-nums text-muted">{l.distinctBuyers}</td>
                      <td className="text-right px-3 py-2 tabular-nums font-semibold">{fmt(l.revenue)}</td>
                    </tr>
                  ))}
                  {data.landings.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-muted text-sm">No landing data yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// 4. Geographic
// ─────────────────────────────────────────────────────────────────
interface GeoRow { state: string; orders: number; revenue: number; refunds: number; netRevenue: number; distinctBuyers: number; aov: number; }

function GeoSection() {
  const [days, setDays] = useState(90);
  const [data, setData] = useState<{ rows: GeoRow[]; totals: { revenue: number; orders: number; distinctBuyers: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/geo?days=${days}`)
      .then((r) => r.json())
      .then((j) => setData({ rows: j.rows || [], totals: j.totals || { revenue: 0, orders: 0, distinctBuyers: 0 } }))
      .catch((e) => setError(e.message || "Load failed"))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <section id="geo" className="scroll-mt-24">
      <SectionHeader
        icon={MapPin}
        title="Revenue by US state"
        sub="Where the money is coming from. Useful for setting Meta / Google geo bid modifiers and planning eventual regional fulfillment."
      >
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="text-xs h-8 px-2 rounded border border-border bg-card">
          <option value={30}>30d</option>
          <option value={90}>90d</option>
          <option value={180}>180d</option>
          <option value={365}>365d</option>
        </select>
      </SectionHeader>

      {error && <ErrorRow msg={error} />}
      {loading && !data && <SectionLoader />}

      {data && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-accent/30 flex items-center justify-between">
            <span className="text-xs text-muted">{data.rows.length} states · {data.totals.orders} orders · {data.totals.distinctBuyers} unique buyers</span>
            <span className="text-xs text-muted">Total {fmt(data.totals.revenue)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">State</th>
                  <th className="text-right px-3 py-2.5 font-medium">Orders</th>
                  <th className="text-right px-3 py-2.5 font-medium">Buyers</th>
                  <th className="text-right px-3 py-2.5 font-medium">AOV</th>
                  <th className="text-right px-3 py-2.5 font-medium">Refunds</th>
                  <th className="text-right px-3 py-2.5 font-medium">Net revenue</th>
                  <th className="text-left px-3 py-2.5 font-medium w-1/3">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((r) => {
                  const pct = data.totals.revenue > 0 ? (r.revenue / data.totals.revenue) * 100 : 0;
                  return (
                    <tr key={r.state} className="hover:bg-accent/20">
                      <td className="px-4 py-2 font-medium text-foreground">{r.state}</td>
                      <td className="text-right px-3 py-2 tabular-nums">{r.orders}</td>
                      <td className="text-right px-3 py-2 tabular-nums text-muted">{r.distinctBuyers}</td>
                      <td className="text-right px-3 py-2 tabular-nums text-muted">{fmt(r.aov)}</td>
                      <td className="text-right px-3 py-2 tabular-nums text-xs">
                        {r.refunds > 0 ? <span className="text-destructive">{fmt(r.refunds)}</span> : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-right px-3 py-2 tabular-nums font-semibold text-foreground">{fmt(r.netRevenue)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-accent rounded-full overflow-hidden max-w-[120px]">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-muted tabular-nums w-10 text-right">{fmtPct(pct, 1)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {data.rows.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-muted text-sm">No orders with valid state in this window.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// 5. Buyer Behavior (PostHog-backed)
// ─────────────────────────────────────────────────────────────────
interface HogResult { results?: unknown[][]; columns?: string[]; }
interface BehaviorPayload {
  buyerJourneys?: HogResult | null;
  topLandingsForBuyers?: HogResult | null;
  productPagesByBuyers?: HogResult | null;
  couponBehavior?: HogResult | null;
  paymentMethodPicks?: HogResult | null;
  purchaseHourUTC?: HogResult | null;
  deviceSplit?: HogResult | null;
  purchasesByDay?: HogResult | null;
  sessionsBeforePurchase?: HogResult | null;
}

function BuyerBehaviorSection() {
  const [data, setData] = useState<BehaviorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/checkout-analytics`)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message || "Load failed"))
      .finally(() => setLoading(false));
  }, []);

  // Helper: pull a number from the first row, nth column.
  const pickNum = (h: HogResult | null | undefined, col: number, row = 0): number =>
    Number(h?.results?.[row]?.[col] ?? 0);

  // Coupon funnel (1 row: attempts, applied, purchases)
  const attempts = pickNum(data?.couponBehavior, 0);
  const applied = pickNum(data?.couponBehavior, 1);
  const purchases = pickNum(data?.couponBehavior, 2);
  const couponApplyRate = attempts > 0 ? (applied / attempts) * 100 : 0;
  const couponBuyerRate = applied > 0 ? (purchases / applied) * 100 : 0;

  // Buyer journey aggregates: avg minutes to purchase + avg pageviews
  // Each row: [distinct_id, first_at, purchase_at, minutes_to_purchase, pageviews_before_purchase]
  const journeys = data?.buyerJourneys?.results || [];
  const avgMinutes = journeys.length > 0
    ? journeys.reduce((s, r) => s + Number(r[3] ?? 0), 0) / journeys.length
    : 0;
  const avgPageviews = journeys.length > 0
    ? journeys.reduce((s, r) => s + Number(r[4] ?? 0), 0) / journeys.length
    : 0;

  // Hour-of-day distribution
  const hours = (data?.purchaseHourUTC?.results || []) as Array<[number, number]>;
  const maxHourCount = hours.length > 0 ? Math.max(...hours.map((h) => Number(h[1]))) : 1;

  return (
    <section id="behavior" className="scroll-mt-24">
      <SectionHeader
        icon={Link2}
        title="Buyer behavior"
        sub="What converting customers actually did. Pulled from PostHog HogQL — buyer-only filter (sessions that ended in a Purchase event)."
      />

      {error && <ErrorRow msg={error} />}
      {loading && !data && <SectionLoader />}

      {data && (
        <div className="space-y-4">
          {/* Top metric strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <BehaviorTile label="Avg time to purchase" value={`${avgMinutes.toFixed(0)} min`} sub={`${journeys.length} buyer sessions`} />
            <BehaviorTile label="Avg pageviews before purchase" value={avgPageviews.toFixed(1)} sub="lower = decisive buyers" />
            <BehaviorTile label="Coupon attempt → apply" value={fmtPct(couponApplyRate, 0)} sub={`${applied} applied of ${attempts} attempts`} />
            <BehaviorTile label="Coupon → purchase" value={fmtPct(couponBuyerRate, 0)} sub={`${purchases} purchases this window`} />
          </div>

          {/* Hour of day chart */}
          {hours.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Purchases by hour of day (UTC)</h3>
              <div className="flex items-end gap-1 h-24">
                {Array.from({ length: 24 }).map((_, h) => {
                  const row = hours.find((r) => Number(r[0]) === h);
                  const count = row ? Number(row[1]) : 0;
                  const height = (count / maxHourCount) * 100;
                  return (
                    <div key={h} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/60 rounded-t hover:bg-primary transition-colors"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${h}:00 UTC — ${count} purchases`}
                      />
                      <span className="text-[9px] text-muted font-mono">{h}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted mt-2">UTC time. Subtract 5h (CDT) or 6h (CST) for Central. Use to time email sends + ad-budget pacing.</p>
            </div>
          )}

          {/* Two-column grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BehaviorTable
              title="Top landing pages for buyers"
              rows={(data.topLandingsForBuyers?.results || []) as Array<[string, number]>}
              columns={["Path", "Buyers"]}
            />
            <BehaviorTable
              title="Product pages buyers visit"
              rows={(data.productPagesByBuyers?.results || []).map((r) => [r[0], r[1]]) as Array<[string, number]>}
              columns={["Path", "Visits"]}
            />
            <BehaviorTable
              title="Payment methods picked"
              rows={(data.paymentMethodPicks?.results || []) as Array<[string, number]>}
              columns={["Method", "Picks"]}
            />
            <BehaviorTable
              title="Device split (buyers)"
              rows={(data.deviceSplit?.results || []) as Array<[string, number]>}
              columns={["Device", "Buyers"]}
            />
          </div>

          <p className="text-xs text-muted">
            Source: PostHog HogQL queries via{" "}
            <code className="font-mono">/api/admin/checkout-analytics</code>.
            Window: last 60 days for coupon behavior + payment picks; all-time for the journey + landings analysis.
          </p>
        </div>
      )}
    </section>
  );
}

function BehaviorTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-1.5 text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted mt-1">{sub}</p>}
    </div>
  );
}

function BehaviorTable({ title, rows, columns }: { title: string; rows: Array<[unknown, unknown]>; columns: [string, string] }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-accent/30">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="overflow-y-auto max-h-72">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="text-left px-4 py-2 font-medium">{columns[0]}</th>
              <th className="text-right px-3 py-2 font-medium">{columns[1]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-accent/20">
                <td className="px-4 py-1.5 text-foreground truncate max-w-[260px]" title={String(r[0])}>{String(r[0] ?? "—")}</td>
                <td className="text-right px-3 py-1.5 tabular-nums font-medium">{Number(r[1] ?? 0).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={2} className="text-center py-6 text-muted text-xs">No data yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Shared atoms ─────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub, children }: { icon: React.ComponentType<{ className?: string }>; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
      <div>
        <h2 className="text-lg font-serif text-foreground inline-flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted" />
          {title}
        </h2>
        {sub && <p className="text-xs text-muted mt-0.5 max-w-3xl">{sub}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-10 text-muted text-sm">
      <Loader2 className="w-4 h-4 animate-spin mr-2" />
      Loading…
    </div>
  );
}

function ErrorRow({ msg }: { msg: string }) {
  return (
    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
      <AlertCircle className="w-4 h-4" /> {msg}
    </div>
  );
}

// Unused right now but exported in case the section header wants to
// surface a delta later.
export const _unused = { ArrowDownRight, ArrowUpRight };
