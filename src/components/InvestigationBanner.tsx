"use client";

import Link from "next/link";
import { FlaskConical, ArrowRight } from "lucide-react";

/**
 * Surfaces a banner pointing at the on-site /research/<slug> long-form
 * investigation page when one exists for the current product. Distinct
 * from <RelatedResearch> which links to external blog articles —
 * investigations are first-party, hosted on the same domain, and carry
 * the editorial voice of the Based Research Desk.
 *
 * Keep this list in sync with files under src/app/research/<slug>/page.tsx.
 * Source of truth lives here so the product page can check at render-time
 * without filesystem reads.
 */
const RESEARCH_PAGES: Record<string, { title: string; readTime: string; tag: string }> = {
  "ghk-cu": {
    title: "The quiet problem with most copper peptide samples",
    readTime: "7 min read",
    tag: "Investigation",
  },
  "bpc-157": {
    title: "BPC-157 and the reproducibility gap in vendor-supplied samples",
    readTime: "8 min read",
    tag: "Investigation",
  },
  // tesamorelin investigation link removed 2026-05-21 — the underlying
  // /research/tesamorelin page body carries human-clinical framing
  // (clinical-trial citations, "analog of human growth-hormone-releasing",
  // "clinical and research contexts") that doesn't fit the research-use-only
  // posture. bpc-157 + ghk-cu reference "human" only as molecular origin,
  // so their investigation links stay.
};

export default function InvestigationBanner({ productSlug }: { productSlug: string }) {
  const entry = RESEARCH_PAGES[productSlug];
  if (!entry) return null;

  return (
    <Link
      href={`/research/${productSlug}`}
      className="group block my-6 p-5 rounded-xl border border-border bg-gradient-to-br from-accent/40 to-background hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-[0.2em] text-warm bg-warm/10 px-2 py-0.5 rounded-sm uppercase">
              {entry.tag}
            </span>
            <span className="text-[11px] text-muted">{entry.readTime}</span>
          </div>
          <p className="text-sm md:text-[15px] font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
            {entry.title}
          </p>
          <p className="text-xs text-muted mt-1">
            Based Research Desk · what to verify before ordering
          </p>
        </div>
        <ArrowRight
          className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
