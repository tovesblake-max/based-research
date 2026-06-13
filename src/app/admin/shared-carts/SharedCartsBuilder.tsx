"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { catalogProducts, type Product, type ProductVariant } from "@/lib/products";
import { Copy, CheckCircle, Plus, Trash2, ArrowLeft, ExternalLink } from "lucide-react";

interface DraftItem {
  slug: string;
  variantSku: string;
  quantity: number;
  // Hydrated from catalog at draft-add time (display-only).
  productName: string;
  variantSize: string;
  unitPriceCents: number;
}

interface SharedCart {
  id: string;
  slug: string;
  items: Array<{ slug: string; variantSku: string; quantity: number }>;
  notes: string | null;
  redeemCount: number;
  firstRedeemedAt: string | null;
  createdAt: string;
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function SharedCartsBuilder() {
  // ── Draft state ─────────────────────────────────────────
  const [pickedSlug, setPickedSlug] = useState<string>(catalogProducts[0]?.slug ?? "");
  const pickedProduct: Product | undefined = catalogProducts.find((p) => p.slug === pickedSlug);
  const [pickedVariantSku, setPickedVariantSku] = useState<string>(
    pickedProduct?.variants[0]?.sku ?? "",
  );
  const [pickedQuantity, setPickedQuantity] = useState<number>(1);

  // Reset variant selection when the product changes so we don't leave
  // a stale SKU pointing at a different product.
  useEffect(() => {
    setPickedVariantSku(pickedProduct?.variants[0]?.sku ?? "");
  }, [pickedProduct]);

  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState<string>("");
  const draftSubtotal = draft.reduce(
    (sum, i) => sum + i.unitPriceCents * i.quantity,
    0,
  );

  const addToDraft = () => {
    if (!pickedProduct || !pickedVariantSku) return;
    const variant: ProductVariant | undefined = pickedProduct.variants.find(
      (v) => v.sku === pickedVariantSku,
    );
    if (!variant) return;
    // Same SKU already in draft? bump qty rather than duplicate.
    const existing = draft.findIndex((d) => d.variantSku === pickedVariantSku);
    if (existing >= 0) {
      const next = [...draft];
      next[existing] = { ...next[existing], quantity: next[existing].quantity + pickedQuantity };
      setDraft(next);
    } else {
      setDraft([
        ...draft,
        {
          slug: pickedProduct.slug,
          variantSku: variant.sku,
          quantity: pickedQuantity,
          productName: pickedProduct.name,
          variantSize: variant.size,
          unitPriceCents: variant.price,
        },
      ]);
    }
    setPickedQuantity(1);
  };

  const removeFromDraft = (sku: string) => {
    setDraft(draft.filter((d) => d.variantSku !== sku));
  };

  // ── Submit + result state ───────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    setSubmitError(null);
    if (draft.length === 0) {
      setSubmitError("Add at least one product first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/shared-carts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: draft.map((d) => ({
            slug: d.slug,
            variantSku: d.variantSku,
            quantity: d.quantity,
          })),
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Could not create shared cart.");
        return;
      }
      setCreatedUrl(data.url);
      setCreatedSlug(data.sharedCart.slug);
      // Reset draft for the next one
      setDraft([]);
      setNotes("");
      // Refresh the recent list
      void refreshRecent();
    } catch {
      setSubmitError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyUrl = async () => {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can long-press the input to copy */
    }
  };

  // ── Recent shared carts list ────────────────────────────
  const [recent, setRecent] = useState<SharedCart[] | null>(null);
  const refreshRecent = async () => {
    try {
      const res = await fetch("/api/admin/shared-carts");
      if (!res.ok) return;
      const data = await res.json();
      setRecent(data.sharedCarts);
    } catch { /* ignore */ }
  };
  useEffect(() => {
    void refreshRecent();
  }, []);

  const variantOptions = useMemo(
    () => pickedProduct?.variants ?? [],
    [pickedProduct],
  );

  const inputCls =
    "block w-full px-3 py-2 bg-accent/40 border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="min-h-screen bg-accent/30">
      <header className="bg-primary text-white px-6 py-3 flex items-center gap-4">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to admin
        </Link>
        <span className="text-white/40">|</span>
        <span className="text-sm">Shared Carts</span>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-serif text-2xl text-foreground">Shared Carts</h1>
          <p className="text-sm text-muted mt-1">
            Build a curated cart and send the link to a customer. Clicking the link auto-loads the cart and sends them to checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* ── Builder ── */}
          <section className="space-y-5">
            <div className="bg-white rounded-xl border border-border p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Add a product</h2>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_90px_auto] gap-3 items-end">
                <label className="block">
                  <span className="block text-[12px] text-muted mb-1">Product</span>
                  <select
                    value={pickedSlug}
                    onChange={(e) => setPickedSlug(e.target.value)}
                    className={`${inputCls} cursor-pointer`}
                  >
                    {catalogProducts.map((p) => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[12px] text-muted mb-1">Variant</span>
                  <select
                    value={pickedVariantSku}
                    onChange={(e) => setPickedVariantSku(e.target.value)}
                    className={`${inputCls} cursor-pointer`}
                  >
                    {variantOptions.map((v) => (
                      <option key={v.sku} value={v.sku}>{v.size} — {fmt(v.price)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[12px] text-muted mb-1">Qty</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={pickedQuantity}
                    onChange={(e) => setPickedQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className={inputCls}
                  />
                </label>
                <button
                  onClick={addToDraft}
                  className="inline-flex items-center justify-center gap-1 h-[38px] px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-light transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>

            {/* Draft */}
            <div className="bg-white rounded-xl border border-border p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">
                Draft cart ({draft.length} {draft.length === 1 ? "item" : "items"})
              </h2>
              {draft.length === 0 ? (
                <p className="text-sm text-muted py-4 text-center">No items yet — pick from the catalog above.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {draft.map((d) => (
                    <li key={d.variantSku} className="flex items-center justify-between py-3 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">
                          {d.productName} <span className="text-muted">· {d.variantSize}</span>
                        </p>
                        <p className="text-[11px] text-muted font-mono">{d.variantSku}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm text-muted tabular-nums">× {d.quantity}</span>
                        <span className="text-sm font-medium text-foreground tabular-nums w-20 text-right">
                          {fmt(d.unitPriceCents * d.quantity)}
                        </span>
                        <button
                          onClick={() => removeFromDraft(d.variantSku)}
                          className="text-muted hover:text-destructive cursor-pointer p-1"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {draft.length > 0 && (
                <div className="border-t border-border pt-3 mt-3 flex justify-between text-sm font-semibold">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{fmt(draftSubtotal)}</span>
                </div>
              )}
            </div>

            {/* Notes + Generate */}
            <div className="bg-white rounded-xl border border-border p-5">
              <label className="block mb-3">
                <span className="block text-[12px] text-muted mb-1">Internal note (optional)</span>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. For Lucas Lima — abandoned $3,351 cart"
                  className={inputCls}
                  maxLength={500}
                />
              </label>
              {submitError && (
                <p className="text-[13px] text-destructive mb-3">{submitError}</p>
              )}
              <button
                onClick={generateLink}
                disabled={submitting || draft.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? "Generating…" : "Generate shareable link"}
              </button>
            </div>

            {/* Result */}
            {createdUrl && (
              <div className="bg-success/5 border border-success/30 rounded-xl p-5">
                <p className="text-sm font-semibold text-foreground mb-2">
                  Link created — slug <span className="font-mono">{createdSlug}</span>
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className={`${inputCls} font-mono text-[12px]`}
                  />
                  <button
                    onClick={copyUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary-light cursor-pointer"
                  >
                    {copied ? (<><CheckCircle className="w-4 h-4" /> Copied</>) : (<><Copy className="w-4 h-4" /> Copy</>)}
                  </button>
                </div>
                <p className="text-[11px] text-muted mt-2">
                  When the customer clicks this link, their cart is replaced with these items and they land on /cart ready to check out.
                </p>
              </div>
            )}
          </section>

          {/* ── Recent shared carts ── */}
          <aside className="bg-white rounded-xl border border-border p-5 h-fit lg:sticky lg:top-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Recent shared carts</h2>
            {recent === null ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted">No shared carts yet.</p>
            ) : (
              <ul className="space-y-3">
                {recent.map((sc) => (
                  <li key={sc.id} className="border-b border-border/50 last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/cart?share=${sc.slug}`}
                        target="_blank"
                        className="font-mono text-[13px] text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {sc.slug} <ExternalLink className="w-3 h-3" />
                      </Link>
                      <span className="text-[11px] text-muted">
                        {sc.redeemCount}× opened
                      </span>
                    </div>
                    {sc.notes && (
                      <p className="text-[12px] text-muted mt-1">{sc.notes}</p>
                    )}
                    <p className="text-[11px] text-muted mt-1">
                      {sc.items.length} item{sc.items.length === 1 ? "" : "s"} · {new Date(sc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
