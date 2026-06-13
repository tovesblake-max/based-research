"use client";

import { useState } from "react";
import { Loader2, FileCheck, CheckCircle, AlertCircle } from "lucide-react";
import Button from "@/components/Button";

const PRODUCT_OPTIONS = [
  "Any product (general inquiry)",
  "BPC-157",
  "TB-500",
  "GHK-Cu",
  "GIP3 (Retatrutide)",
  "Cagrilintide",
  "Ipamorelin",
  "CJC-1295 (no DAC)",
  "Tesamorelin",
  "Sermorelin",
  "NAD+",
  "Epithalon",
  "MOTS-c",
  "SS-31 (Elamipretide)",
  "PT-141",
  "Selank",
  "Semax",
  "DSIP",
  "Thymosin Alpha-1",
  "Thymalin",
  "KPV",
  "VIP",
  "ARA-290",
  "Oxytocin",
  "Kisspeptin-10",
  "Other",
];

/**
 * COA request opt-in form for the /coa page. Routes through the same
 * /api/contact pipeline as the support bubble — the row lands in
 * `contact_submissions` with `subject: "COA Request"` so admin sees it
 * in the Messages tab. Lot number lives in `orderNumber` (the column
 * is varchar(50), handles our lot format fine).
 *
 * Tracking: fires a `coa_request` PostHog event via the standard
 * /api/contact route's success path.
 */
export default function CoaRequestForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    product: PRODUCT_OPTIONS[0],
    lotNumber: "",
    notes: "",
    optIn: true,
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setForm({ ...form, [target.name]: target.checked });
      return;
    }
    setForm({ ...form, [target.name]: target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setLoading(true);

    // Body of the contact submission — admin sees the full request in
    // one prose blob for easy triage.
    const messageLines = [
      `Product: ${form.product}`,
      `Lot number: ${form.lotNumber.trim() || "(any recent lot)"}`,
      "",
      `Notes:`,
      form.notes.trim() || "(none provided)",
      "",
      `Marketing opt-in: ${form.optIn ? "yes" : "no"}`,
    ];

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: "COA Request",
          orderNumber: form.lotNumber.trim() || undefined,
          message: messageLines.join("\n"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send your request.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 max-w-2xl mx-auto text-center">
        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-success" aria-hidden="true" />
        </div>
        <h3 className="font-serif text-2xl text-foreground mb-2">
          Request received
        </h3>
        <p className="text-sm text-muted leading-relaxed mb-6 max-w-md mx-auto">
          We&apos;ll send the COA PDF to{" "}
          <span className="font-medium text-foreground">{form.email}</span>{" "}
          within one business day. If we have questions about which lot
          you need, we&apos;ll reach out first.
        </p>
        <button
          type="button"
          onClick={() => {
            setForm({
              name: "",
              email: "",
              product: PRODUCT_OPTIONS[0],
              lotNumber: "",
              notes: "",
              optIn: true,
            });
            setSubmitted(false);
          }}
          className="text-sm text-primary hover:underline cursor-pointer"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <FileCheck className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-serif text-2xl text-foreground">Request a COA</h3>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            Need the Certificate of Analysis for a specific batch? Tell us
            which product (and lot, if you have it) and we&apos;ll send the
            full PDF to your inbox.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="coa-name" className="block text-sm font-medium text-foreground mb-1.5">
              Your name <span className="text-destructive">*</span>
            </label>
            <input
              id="coa-name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="coa-email" className="block text-sm font-medium text-foreground mb-1.5">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              id="coa-email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="coa-product" className="block text-sm font-medium text-foreground mb-1.5">
              Product
            </label>
            <select
              id="coa-product"
              name="product"
              value={form.product}
              onChange={handleChange}
              className="w-full h-11 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {PRODUCT_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="coa-lot" className="block text-sm font-medium text-foreground mb-1.5">
              Lot number <span className="text-muted text-xs font-normal">(optional)</span>
            </label>
            <input
              id="coa-lot"
              name="lotNumber"
              type="text"
              value={form.lotNumber}
              onChange={handleChange}
              placeholder="e.g. SW-BPC-240301"
              className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label htmlFor="coa-notes" className="block text-sm font-medium text-foreground mb-1.5">
            Anything else? <span className="text-muted text-xs font-normal">(optional)</span>
          </label>
          <textarea
            id="coa-notes"
            name="notes"
            rows={3}
            value={form.notes}
            onChange={handleChange}
            placeholder="Specific potency thresholds, multiple lots, prior order reference, etc."
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer pt-1">
          <input
            type="checkbox"
            name="optIn"
            checked={form.optIn}
            onChange={handleChange}
            className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
          />
          <span className="text-xs text-muted leading-relaxed">
            Send me COA updates and new-batch notifications for the products
            I&apos;ve requested. We won&apos;t share your email — unsubscribe
            anytime.
          </span>
        </label>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              Sending request…
            </>
          ) : (
            "Request COA"
          )}
        </Button>

        <p className="text-[11px] text-muted text-center">
          Replies typically arrive within 4 business hours, max 1 business day.
        </p>
      </form>
    </div>
  );
}
