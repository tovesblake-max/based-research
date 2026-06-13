"use client";

/**
 * COA management admin tab.
 *
 * Lets the operator:
 *   - Upload a new COA PDF (file + product + batch + optional purity/test-date/lab)
 *   - See every active COA in the system, grouped by product
 *   - Toggle a COA inactive (supersede) or hard-delete it
 *   - Preview / download the PDF in a new tab
 *
 * Uploads go through /api/admin/coas (multipart). The upload supersedes
 * any existing active COA for the same (product, batch) pair — so re-uploading
 * a corrected PDF for "Batch 142" just replaces the old one without
 * cluttering the public list.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { catalogProducts } from "@/lib/products";
import {
  FileCheck, Upload, Search, RefreshCcw, Loader2, ExternalLink,
  Trash2, Eye, EyeOff, AlertCircle, CheckCircle2, FlaskConical,
} from "lucide-react";

interface CoaRow {
  id: string;
  productSlug: string;
  variantSku: string | null;
  batchNumber: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  testDate: string | null;
  purityPercent: string | null;
  labName: string | null;
  notes: string | null;
  isActive: boolean;
  uploadedAt: string;
  uploadedBy?: string | null;
  uploaderEmail?: string | null;
  uploaderFirstName?: string | null;
}

const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};
const fmtDate = (s: string | null) => {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const productLookup = new Map(catalogProducts.map((p) => [p.slug, p]));

export default function CoasTab() {
  const [rows, setRows] = useState<CoaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string>(catalogProducts[0]?.slug ?? "");
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [batchNumber, setBatchNumber] = useState("");
  const [testDate, setTestDate] = useState("");
  const [purity, setPurity] = useState("");
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const selectedProduct = useMemo(() => productLookup.get(selectedSlug), [selectedSlug]);
  const variantOptions = selectedProduct?.variants ?? [];

  const fetchRows = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/coas${showInactive ? "?include_inactive=1" : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.coas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleUpload = useCallback(async () => {
    setUploadMsg(null);
    if (!file) { setUploadMsg({ ok: false, text: "Pick a PDF first." }); return; }
    if (!batchNumber.trim()) { setUploadMsg({ ok: false, text: "Batch number required." }); return; }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("product_slug", selectedSlug);
    if (selectedSku) fd.append("variant_sku", selectedSku);
    fd.append("batch_number", batchNumber.trim());
    if (testDate) fd.append("test_date", testDate);
    if (purity) fd.append("purity_percent", purity);
    if (labName) fd.append("lab_name", labName.trim());
    if (notes) fd.append("notes", notes.trim());

    setUploading(true);
    try {
      const res = await fetch("/api/admin/coas", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadMsg({ ok: false, text: data.error || `HTTP ${res.status}` });
      } else {
        setUploadMsg({ ok: true, text: `Uploaded. Batch ${data.coa.batchNumber} for ${data.coa.productSlug}.` });
        // Reset form (keep product/variant selected so admin can chain uploads)
        setFile(null);
        setBatchNumber("");
        setTestDate("");
        setPurity("");
        setNotes("");
        // Re-fetch list
        await fetchRows();
      }
    } catch (err) {
      setUploadMsg({ ok: false, text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  }, [file, selectedSlug, selectedSku, batchNumber, testDate, purity, labName, notes, fetchRows]);

  const toggleActive = useCallback(async (row: CoaRow) => {
    const next = !row.isActive;
    const res = await fetch(`/api/admin/coas/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    if (res.ok) await fetchRows();
  }, [fetchRows]);

  const hardDelete = useCallback(async (row: CoaRow) => {
    const ok = confirm(`Permanently delete COA for ${row.productSlug} batch ${row.batchNumber}? This cannot be undone.`);
    if (!ok) return;
    const res = await fetch(`/api/admin/coas/${row.id}`, { method: "DELETE" });
    if (res.ok) await fetchRows();
  }, [fetchRows]);

  // Filter rows by search
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.productSlug.includes(q) ||
      r.batchNumber.toLowerCase().includes(q) ||
      (r.labName || "").toLowerCase().includes(q) ||
      (r.variantSku || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Group by product
  const byProduct = useMemo(() => {
    const m = new Map<string, CoaRow[]>();
    for (const r of filtered) {
      const a = m.get(r.productSlug) || [];
      a.push(r);
      m.set(r.productSlug, a);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl text-foreground">Certificates of Analysis</h2>
            <p className="text-xs text-muted">Upload, manage, and supersede batch-linked COAs. Active uploads render automatically on the matching product detail page.</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text" placeholder="Search by product, batch, lab, SKU…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-accent/40 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted flex items-center gap-1.5">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Show superseded
            </label>
            <button onClick={fetchRows} disabled={loading} className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-accent inline-flex items-center gap-1.5 disabled:opacity-50">
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Upload form ── */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" /> Upload a new COA
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Product</label>
            <select value={selectedSlug} onChange={(e) => { setSelectedSlug(e.target.value); setSelectedSku(""); }} className="w-full px-3 py-2 bg-accent/40 border border-border rounded-lg text-sm">
              {catalogProducts.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Variant (optional, covers all if blank)</label>
            <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)} className="w-full px-3 py-2 bg-accent/40 border border-border rounded-lg text-sm">
              <option value="">All variants of this product</option>
              {variantOptions.map((v) => <option key={v.sku} value={v.sku}>{v.size} · {v.sku}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Batch number *</label>
            <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g. SW-2026-042" className="w-full px-3 py-2 bg-accent/40 border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Test date</label>
            <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} className="w-full px-3 py-2 bg-accent/40 border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Purity % (e.g. 99.21)</label>
            <input type="number" min="0" max="100" step="0.01" value={purity} onChange={(e) => setPurity(e.target.value)} placeholder="99.21" className="w-full px-3 py-2 bg-accent/40 border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Lab name</label>
            <input value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="e.g. Janoshik Analytical (A2LA #5135)" className="w-full px-3 py-2 bg-accent/40 border border-border rounded-lg text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-muted mb-1">Internal notes (not customer-facing)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional. e.g. 're-run, first lot had baseline noise'" className="w-full px-3 py-2 bg-accent/40 border border-border rounded-lg text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-muted mb-1">PDF file *</label>
            <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
            {file && <p className="text-[11px] text-muted mt-1">{file.name} · {fmtBytes(file.size)}</p>}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={handleUpload} disabled={uploading || !file || !batchNumber.trim()}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Upload COA</>}
          </button>
          {uploadMsg && (
            <div className={`text-sm inline-flex items-center gap-1.5 ${uploadMsg.ok ? "text-emerald-700" : "text-red-700"}`}>
              {uploadMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {uploadMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* ── List ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
          Failed to load: {error}
        </div>
      )}
      {loading && rows.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…
        </div>
      ) : byProduct.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FlaskConical className="w-8 h-8 text-muted mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">No COAs uploaded yet.</p>
          <p className="text-xs text-muted mt-1">Upload your first one above. It will render automatically on the matching product page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {byProduct.map(([slug, coas]) => {
            const product = productLookup.get(slug);
            return (
              <div key={slug} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3 bg-accent/20 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">{product?.name || slug}</span>
                    <span className="text-[11px] text-muted">{coas.length} COA{coas.length === 1 ? "" : "s"}</span>
                  </div>
                  <a href={`/product/${slug}`} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                    View product page <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="divide-y divide-border">
                  {coas.map((c) => (
                    <div key={c.id} className={`px-5 py-3 flex items-center gap-4 ${c.isActive ? "" : "opacity-60"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-foreground">Batch {c.batchNumber}</span>
                          {c.variantSku && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{c.variantSku}</span>}
                          {c.purityPercent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{c.purityPercent}% pure</span>}
                          {!c.isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Superseded</span>}
                        </div>
                        <div className="text-xs text-muted">
                          {c.labName ? `${c.labName} · ` : ""}{fmtDate(c.testDate)} · {fmtBytes(c.fileSize)} · uploaded {fmtDate(c.uploadedAt)}
                          {c.uploaderFirstName ? ` by ${c.uploaderFirstName}` : ""}
                        </div>
                        {c.notes && <p className="text-[11px] text-muted mt-1 italic">{c.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <a href={`/api/coas/${c.id}/file`} target="_blank" rel="noreferrer"
                          className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-accent inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Open
                        </a>
                        <button onClick={() => toggleActive(c)}
                          className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-accent inline-flex items-center gap-1"
                          title={c.isActive ? "Mark superseded — hides from public" : "Mark active — re-publishes"}>
                          {c.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {c.isActive ? "Supersede" : "Re-activate"}
                        </button>
                        <button onClick={() => hardDelete(c)}
                          className="text-xs px-3 py-1.5 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 inline-flex items-center gap-1">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
