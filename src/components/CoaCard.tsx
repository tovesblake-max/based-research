"use client";

import { FileCheck, ExternalLink, Download, ShieldCheck } from "lucide-react";
import type { Product } from "@/lib/products";

/**
 * COA card for product detail pages. Renders metadata in a tasteful
 * one-row grid, with two actions:
 *
 *   - View → opens the PDF in a new tab. Native browser PDF viewer
 *            handles it. Works on iOS Safari, Android Chrome, every
 *            desktop browser. No iframe / modal / object embed games.
 *   - Download → direct download via the `download` attribute.
 *
 * We previously embedded the PDF in a modal iframe; iOS Safari refuses
 * to render PDFs in iframes (silent blank), and the modal added zero
 * value over a new-tab open since the browser's own PDF viewer is
 * already the best tool for the job. New-tab open is universal.
 */
export default function CoaCard({ product, coa }: {
  product: Product;
  coa: NonNullable<Product["coa"]>;
}) {
  const testDateLabel = new Date(coa.testDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <section aria-labelledby="coa-heading" className="my-12">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Header strip */}
        <div className="px-6 py-4 bg-gradient-to-r from-success/5 via-transparent to-transparent border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success flex-shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="coa-heading" className="font-serif text-xl text-foreground leading-tight">
                Certificate of Analysis
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Independent third-party verification — {coa.lab}
                {coa.accreditation && ` · ${coa.accreditation}`}
              </p>
            </div>
          </div>
          <FileCheck className="w-6 h-6 text-success/60 hidden sm:block" aria-hidden="true" />
        </div>

        {/* Metadata grid */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <CoaField label="Purity" value={coa.purity} highlight />
          <CoaField label="Method" value={coa.method} />
          <CoaField label="Lot" value={coa.lot} mono />
          <CoaField label="Test Date" value={testDateLabel} />
          {coa.quantity && (
            <CoaField label="Measured Fill" value={coa.quantity} />
          )}
          {coa.laboratoryId && (
            <CoaField label="Report ID" value={coa.laboratoryId} mono />
          )}
        </div>

        {/* Actions — both are <a> tags so the browser handles the PDF
            natively. No iframe, no modal. */}
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2.5">
          <a
            href={coa.pdfPath}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            View Full COA
          </a>
          <a
            href={coa.pdfPath}
            download={`${product.slug}-coa-${coa.lot}.pdf`}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm font-medium hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Download PDF
          </a>
        </div>

        {/* Research-use disclaimer footer */}
        <div className="px-6 py-3 border-t border-border bg-accent/30">
          <p className="text-[11px] text-muted leading-relaxed">
            For laboratory research use only. Not for human or veterinary use. Not for diagnostic or therapeutic use.
          </p>
        </div>
      </div>
    </section>
  );
}

function CoaField({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
        {label}
      </p>
      <p
        className={`text-sm leading-tight ${mono ? "font-mono" : ""} ${
          highlight ? "text-success font-semibold text-base" : "text-foreground font-medium"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
