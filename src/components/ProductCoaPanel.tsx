"use client";

/**
 * Public Lab Results panel rendered on every product detail page.
 *
 * Fetches active COAs for the current product via /api/coas?slug=X.
 * Renders nothing while loading (avoids layout shift; the panel only
 * appears if there's something to show). When at least one COA exists,
 * surfaces it as a stacked card with batch number, lab, purity, test
 * date, and a download link.
 *
 * Hidden entirely when there are zero active COAs for the product —
 * we never want a "no lab results yet" empty state on a customer-facing
 * page, that reads worse than just not mentioning lab results at all.
 */

import { useEffect, useState } from "react";
import { FileCheck, Download, FlaskConical, Loader2, ExternalLink } from "lucide-react";

interface PublicCoa {
  id: string;
  productSlug: string;
  variantSku: string | null;
  batchNumber: string;
  fileName: string;
  fileSize: number;
  testDate: string | null;
  purityPercent: string | null;
  labName: string | null;
  uploadedAt: string;
}

function fmtDate(s: string | null) {
  if (!s) return null;
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProductCoaPanel({ slug }: { slug: string }) {
  const [coas, setCoas] = useState<PublicCoa[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/coas?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setCoas(data?.coas || []);
      })
      .catch(() => { if (!cancelled) setCoas([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return null; // Don't render a loading state on the public page
  if (!coas || coas.length === 0) return null;

  return (
    <section className="mt-10 pt-8 border-t border-border">
      <div className="flex items-center gap-2 mb-1">
        <FlaskConical className="w-4 h-4 text-primary" aria-hidden="true" />
        <h2 className="font-serif text-xl text-foreground">Lab Results</h2>
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full ml-1">
          {coas.length} verified batch{coas.length === 1 ? "" : "es"}
        </span>
      </div>
      <p className="text-sm text-muted mb-5 max-w-2xl">
        Every lot is independently tested. Click any batch below to view the full HPLC chromatogram + signed lab report.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {coas.map((c) => (
          <a
            key={c.id}
            href={`/api/coas/${c.id}/file`}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <FileCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-mono text-xs font-semibold text-foreground">
                  Batch {c.batchNumber}
                </p>
                {c.variantSku && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {c.variantSku}
                  </span>
                )}
                {c.purityPercent && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {c.purityPercent}% pure
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                {c.labName ? `${c.labName}` : "Independent lab"}
                {c.testDate && ` · Tested ${fmtDate(c.testDate)}`}
              </p>
              <p className="text-[11px] text-primary mt-1.5 inline-flex items-center gap-1 group-hover:underline">
                <Download className="w-3 h-3" />
                View full report
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </p>
            </div>
          </a>
        ))}
      </div>
      <p className="text-[11px] text-muted mt-4 leading-relaxed">
        For laboratory research use only. Not for human or veterinary use. Not for diagnostic or therapeutic use.
      </p>
    </section>
  );
}
