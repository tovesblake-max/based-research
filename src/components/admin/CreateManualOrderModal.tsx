"use client";

// Admin-only modal for logging out-of-band sales — Apple Pay, Cash App,
// Telegram-DM, wholesale wire transfers, etc. Replaces the one-off
// CLI scripts we used to write per customer.
//
// Submit POSTs /api/admin/orders/manual which inserts a confirmed +
// payment_status=completed order. ShipStation pulls it on next poll.

import { useState } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { catalogProducts } from "@/lib/products";
import { formatPriceShort } from "@/lib/utils";

interface LineItem {
  sku: string;
  productName: string;
  variantSize: string;
  quantity: number;
  unitPriceCents: number;
}

const PAYMENT_GATEWAYS: Array<{ value: string; label: string }> = [
  { value: "apple_pay", label: "Apple Pay" },
  { value: "cash_app", label: "Cash App" },
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
  { value: "wire", label: "Wire Transfer" },
  { value: "cash", label: "Cash" },
  { value: "crypto", label: "Crypto" },
  { value: "other", label: "Other" },
];

// Flatten catalog so the SKU dropdown can show every variant with its
// product name + size + retail price for reference.
const catalogSkus = catalogProducts.flatMap((p) =>
  p.variants.map((v) => ({
    sku: v.sku,
    productId: p.id,
    productName: p.name,
    size: v.size,
    retailCents: v.price,
  })),
);

export default function CreateManualOrderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (orderNumber: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [paymentGateway, setPaymentGateway] = useState("apple_pay");
  const [couponCode, setCouponCode] = useState("");
  const [notes, setNotes] = useState("");
  const [discountDollars, setDiscountDollars] = useState("0");
  const [shippingDollars, setShippingDollars] = useState("0");
  const [totalOverrideDollars, setTotalOverrideDollars] = useState(""); // optional
  const [items, setItems] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const subtotalCents = items.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0);
  const discountCents = Math.max(0, Math.round(parseFloat(discountDollars || "0") * 100));
  const shippingCostCents = Math.max(0, Math.round(parseFloat(shippingDollars || "0") * 100));
  const computedTotal = subtotalCents - discountCents + shippingCostCents;
  const totalCents = totalOverrideDollars
    ? Math.max(0, Math.round(parseFloat(totalOverrideDollars) * 100))
    : computedTotal;

  const addItemFromSku = (sku: string) => {
    const cat = catalogSkus.find((c) => c.sku === sku);
    if (!cat) return;
    setItems((prev) => [
      ...prev,
      {
        sku: cat.sku,
        productName: cat.productName,
        variantSize: cat.size,
        quantity: 1,
        unitPriceCents: cat.retailCents,
      },
    ]);
  };

  const addFreeformItem = () => {
    setItems((prev) => [
      ...prev,
      { sku: "", productName: "", variantSize: "", quantity: 1, unitPriceCents: 0 },
    ]);
  };

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    setError("");
    if (!email.trim()) return setError("Email required");
    if (!firstName.trim() || !lastName.trim()) return setError("Customer name required");
    if (!address1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      return setError("Complete shipping address required");
    }
    if (items.length === 0) return setError("Add at least one line item");
    for (const it of items) {
      if (!it.sku.trim()) return setError("Every line item needs a SKU");
      if (!it.productName.trim()) return setError("Every line item needs a product name");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          shippingAddress: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            address1: address1.trim(),
            address2: address2.trim() || undefined,
            city: city.trim(),
            state: state.trim().toUpperCase(),
            zip: zip.trim(),
            country: "US",
          },
          lineItems: items.map((it) => ({
            sku: it.sku,
            productName: it.productName,
            variantSize: it.variantSize,
            quantity: it.quantity,
            unitPriceCents: it.unitPriceCents,
          })),
          subtotalCents,
          discountCents,
          shippingCostCents,
          totalCents,
          paymentGateway,
          couponCode: couponCode.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");
      onCreated(data.orderNumber);
      onClose();
      // Reset form
      setEmail(""); setFirstName(""); setLastName(""); setAddress1(""); setAddress2("");
      setCity(""); setState(""); setZip(""); setCouponCode(""); setNotes("");
      setDiscountDollars("0"); setShippingDollars("0"); setTotalOverrideDollars("");
      setItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Create Custom Order</h2>
            <p className="text-xs text-muted">Out-of-band sale — paid Apple Pay, Cash App, wire, etc.</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Customer block */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Customer</h3>
            <div className="grid grid-cols-2 gap-3">
              <input className={inp} placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <input className={inp} placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <input className={`${inp} col-span-2`} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          {/* Shipping address */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Shipping address</h3>
            <div className="space-y-2">
              <input className={inp} placeholder="Address line 1" value={address1} onChange={(e) => setAddress1(e.target.value)} />
              <input className={inp} placeholder="Address line 2 (apt, suite, etc)" value={address2} onChange={(e) => setAddress2(e.target.value)} />
              <div className="grid grid-cols-3 gap-2">
                <input className={inp} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                <input className={inp} placeholder="State" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} />
                <input className={inp} placeholder="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Line items</h3>
              <div className="flex gap-2">
                <select
                  className="text-xs px-2 py-1 rounded border border-border bg-white cursor-pointer"
                  value=""
                  onChange={(e) => { if (e.target.value) addItemFromSku(e.target.value); e.target.value = ""; }}
                >
                  <option value="">+ Add from catalog…</option>
                  {catalogSkus.map((c) => (
                    <option key={c.sku} value={c.sku}>
                      {c.productName} {c.size} ({c.sku}) — {formatPriceShort(c.retailCents)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addFreeformItem}
                  className="text-xs px-2 py-1 rounded border border-border bg-white hover:bg-accent/40 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Freeform
                </button>
              </div>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted italic">No line items yet</p>
            ) : (
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      className={`${inp} col-span-2 font-mono text-xs`}
                      placeholder="SKU"
                      value={it.sku}
                      onChange={(e) => updateItem(idx, { sku: e.target.value })}
                    />
                    <input
                      className={`${inp} col-span-4`}
                      placeholder="Product name"
                      value={it.productName}
                      onChange={(e) => updateItem(idx, { productName: e.target.value })}
                    />
                    <input
                      className={`${inp} col-span-2`}
                      placeholder="Size"
                      value={it.variantSize}
                      onChange={(e) => updateItem(idx, { variantSize: e.target.value })}
                    />
                    <input
                      className={`${inp} col-span-1 text-center`}
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value || "1")) })}
                    />
                    <input
                      className={`${inp} col-span-2 text-right`}
                      type="number"
                      step={0.01}
                      placeholder="Unit $"
                      value={(it.unitPriceCents / 100).toFixed(2)}
                      onChange={(e) => updateItem(idx, { unitPriceCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="col-span-1 text-muted hover:text-destructive cursor-pointer flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Money */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Totals</h3>
            <div className="bg-accent/30 border border-border rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal (computed)</span>
                <span className="font-medium">{formatPriceShort(subtotalCents)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Discount
                  <input className={inp} type="number" step={0.01} min={0} value={discountDollars} onChange={(e) => setDiscountDollars(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Shipping
                  <input className={inp} type="number" step={0.01} min={0} value={shippingDollars} onChange={(e) => setShippingDollars(e.target.value)} />
                </label>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-muted">Computed total</span>
                <span className="font-medium tabular-nums">{formatPriceShort(computedTotal)}</span>
              </div>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Total override (leave blank to use computed)
                <input className={inp} type="number" step={0.01} min={0} placeholder={`${(computedTotal / 100).toFixed(2)}`} value={totalOverrideDollars} onChange={(e) => setTotalOverrideDollars(e.target.value)} />
              </label>
              <div className="flex justify-between text-base font-bold border-t border-border pt-2">
                <span>Final total charged</span>
                <span className="text-success tabular-nums">{formatPriceShort(totalCents)}</span>
              </div>
            </div>
          </div>

          {/* Payment + meta */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Payment & metadata</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted">
                Payment method
                <select className={inp} value={paymentGateway} onChange={(e) => setPaymentGateway(e.target.value)}>
                  {PAYMENT_GATEWAYS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Coupon label (optional)
                <input className={inp} placeholder="e.g. BIOCODE-T2" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-muted mt-3">
              Notes
              <textarea
                className={`${inp} min-h-[60px]`}
                placeholder="Tier 2 BioCode pricing applied as a fixed $351 discount on retail subtotal."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-muted hover:text-foreground cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
            ) : (
              `Create order — ${formatPriceShort(totalCents)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp =
  "w-full px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
