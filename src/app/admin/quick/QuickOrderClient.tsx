"use client";

// Mobile-first admin surface for the assistant. Two modes in one
// page:
//
//   1. New Order — log an already-paid out-of-band order (Apple Pay,
//      Cash App, Venmo, Zelle, wire, etc.). POSTs to
//      /api/admin/orders/manual which inserts a confirmed/completed
//      order; ShipStation picks it up on next poll.
//
//   2. Send Cart — build a cart and generate a share link the client
//      can open + pay through the normal checkout. POSTs to
//      /api/admin/shared-carts. Uses navigator.share() when available
//      so the assistant can fire it into iMessage / WhatsApp / email
//      with one tap, falls back to a copy button.
//
// Auth: the page itself is unguarded at the layout level, but every
// admin API route called from here runs requireAdmin() server-side.
// A non-admin user reaching this URL sees a 401 from the first fetch.
//
// Layout: single column, no sidebar, sticky bottom CTA. Inputs are
// 44px+ tall for thumb-tap targets. Designed for one-handed use on
// iPhone — landscape works too but the form is portrait-optimized.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { catalogProducts } from "@/lib/products";
import {
  ShoppingBag,
  Send,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  Loader2,
  LogOut,
  ExternalLink,
} from "lucide-react";

type Mode = "order" | "cart";

interface LineItem {
  sku: string;
  productName: string;
  variantSize: string;
  slug: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
}

const PAYMENT_GATEWAYS = [
  { value: "apple_pay", label: "Apple Pay" },
  { value: "cash_app", label: "Cash App" },
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
  { value: "wire", label: "Wire" },
  { value: "cash", label: "Cash" },
  { value: "crypto", label: "Crypto" },
  { value: "other", label: "Other" },
] as const;

// Flatten the catalog so the SKU dropdown lists every variant with
// product name + size + retail price.
const catalogSkus = catalogProducts.flatMap((p) =>
  p.variants.map((v) => ({
    productId: p.id,
    productName: p.name,
    slug: p.slug,
    sku: v.sku,
    size: v.size,
    retailCents: v.price,
  })),
);

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const fieldCls =
  "block w-full px-4 py-3 bg-card border border-border rounded-lg text-base text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary";

const labelCls = "block text-xs font-medium uppercase tracking-wider text-muted mb-1.5";

export default function QuickOrderClient() {
  const { user, signOut } = useAuth();
  const [mode, setMode] = useState<Mode>("order");

  return (
    <div className="min-h-screen bg-accent/20 pb-32">
      {/* ── Top bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex flex-col leading-tight">
          <span className="font-serif text-base">Based Research</span>
          <span className="text-[11px] text-white/70 uppercase tracking-wider">Quick Order</span>
        </div>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="text-[11px] text-white/70 hidden sm:inline">{user.email}</span>
          )}
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="text-white/70 hover:text-white p-2 -m-2"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ── Mode selector ───────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <div className="bg-white border border-border rounded-xl p-1 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setMode("order")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              mode === "order"
                ? "bg-primary text-white shadow-sm"
                : "text-foreground"
            }`}
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            New Order
          </button>
          <button
            type="button"
            onClick={() => setMode("cart")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              mode === "cart"
                ? "bg-primary text-white shadow-sm"
                : "text-foreground"
            }`}
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            Send Cart
          </button>
        </div>
      </div>

      {/* ── Mode content ────────────────────────────────────────── */}
      <main className="px-4 pt-4 pb-4 max-w-2xl mx-auto">
        {mode === "order" ? <NewOrderForm /> : <SendCartForm />}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// New Order — log an out-of-band paid order
// ─────────────────────────────────────────────────────────────────
function NewOrderForm() {
  // Customer
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Address
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [zip, setZip] = useState("");

  // Line items
  const [items, setItems] = useState<LineItem[]>([]);
  const [pickedSku, setPickedSku] = useState<string>(catalogSkus[0]?.sku ?? "");
  const [pickedQty, setPickedQty] = useState<number>(1);

  // Payment + adjustments
  const [paymentGateway, setPaymentGateway] = useState<string>("apple_pay");
  const [notes, setNotes] = useState("");
  const [discountDollars, setDiscountDollars] = useState("0");
  const [shippingDollars, setShippingDollars] = useState("0");
  const [totalOverrideDollars, setTotalOverrideDollars] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null);

  const subtotalCents = items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
  const discountCents = Math.max(0, Math.round((parseFloat(discountDollars) || 0) * 100));
  const shippingCents = Math.max(0, Math.round((parseFloat(shippingDollars) || 0) * 100));
  const overrideCents = totalOverrideDollars.trim()
    ? Math.round((parseFloat(totalOverrideDollars) || 0) * 100)
    : null;
  const computedTotalCents = Math.max(0, subtotalCents + shippingCents - discountCents);
  const totalCents = overrideCents ?? computedTotalCents;

  const addItem = () => {
    const catalogItem = catalogSkus.find((s) => s.sku === pickedSku);
    if (!catalogItem) return;
    setItems((prev) => [
      ...prev,
      {
        sku: catalogItem.sku,
        productName: catalogItem.productName,
        variantSize: catalogItem.size,
        slug: catalogItem.slug,
        productId: catalogItem.productId,
        quantity: pickedQty,
        unitPriceCents: catalogItem.retailCents,
      },
    ]);
    setPickedQty(1);
  };

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    setError(null);
    setSuccess(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required (use a placeholder if unknown — e.g. unknown@basedresearch.com).");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one line item.");
      return;
    }
    if (!address1.trim() || !city.trim() || !stateCode.trim() || !zip.trim()) {
      setError("Complete the shipping address.");
      return;
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
            state: stateCode.trim().toUpperCase(),
            zip: zip.trim(),
            country: "US",
          },
          lineItems: items.map((i) => ({
            sku: i.sku,
            productName: i.productName,
            variantSize: i.variantSize,
            slug: i.slug,
            productId: i.productId,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
          })),
          subtotalCents,
          discountCents,
          shippingCostCents: shippingCents,
          totalCents,
          paymentGateway,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.detail || "Could not create order.");
        return;
      }
      setSuccess({ orderNumber: data.orderNumber });
      // Reset for the next order
      setItems([]);
      setNotes("");
      setDiscountDollars("0");
      setShippingDollars("0");
      setTotalOverrideDollars("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <SuccessCard
        title="Order created"
        primary={success.orderNumber}
        sub="Order is confirmed + paid. ShipStation will pick it up on the next poll (within 1 hour). Customer will receive a thank-you SMS when it ships."
        onReset={() => {
          setSuccess(null);
          setFirstName("");
          setLastName("");
          setEmail("");
          setPhone("");
          setAddress1("");
          setAddress2("");
          setCity("");
          setStateCode("");
          setZip("");
        }}
        resetLabel="Log another order"
      />
    );
  }

  return (
    <div className="space-y-5">
      <Section title="Customer">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            className={fieldCls}
          />
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            className={fieldCls}
          />
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          className={`${fieldCls} mt-3`}
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          inputMode="tel"
          className={`${fieldCls} mt-3`}
        />
      </Section>

      <Section title="Shipping address">
        <AddressAutocomplete
          placeholder="Address line 1"
          className={fieldCls}
          value={address1}
          onChange={(v) => setAddress1(v)}
          onSelect={(resolved) => {
            setAddress1(resolved.address1 || address1);
            setCity(resolved.city || city);
            setStateCode(resolved.state || stateCode);
            setZip(resolved.zip || zip);
          }}
        />
        <input
          type="text"
          placeholder="Apt / suite (optional)"
          value={address2}
          onChange={(e) => setAddress2(e.target.value)}
          autoComplete="address-line2"
          className={`${fieldCls} mt-3`}
        />
        <div className="grid grid-cols-2 gap-3 mt-3">
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            autoComplete="address-level2"
            className={fieldCls}
          />
          <input
            type="text"
            placeholder="State (CA)"
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value.toUpperCase())}
            autoComplete="address-level1"
            maxLength={2}
            className={fieldCls}
          />
        </div>
        <input
          type="text"
          placeholder="ZIP"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          autoComplete="postal-code"
          inputMode="numeric"
          className={`${fieldCls} mt-3 max-w-[200px]`}
        />
      </Section>

      <Section title="Line items">
        <SkuPicker
          pickedSku={pickedSku}
          onPick={setPickedSku}
          pickedQty={pickedQty}
          onQtyChange={setPickedQty}
          onAdd={addItem}
        />
        {items.length > 0 && (
          <ul className="mt-3 space-y-2">
            {items.map((it, idx) => (
              <li
                key={`${it.sku}-${idx}`}
                className="flex items-center justify-between gap-3 bg-card rounded-lg p-3 border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {it.productName} <span className="text-muted">· {it.variantSize}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {it.quantity} × {fmt(it.unitPriceCents)} = {fmt(it.unitPriceCents * it.quantity)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  aria-label="Remove line"
                  className="p-2 -m-2 text-muted hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Payment method">
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_GATEWAYS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setPaymentGateway(g.value)}
              className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                paymentGateway === g.value
                  ? "bg-primary text-white border-primary"
                  : "bg-card border-border text-foreground"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Adjustments (optional)">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Discount $</label>
            <input
              type="text"
              inputMode="decimal"
              value={discountDollars}
              onChange={(e) => setDiscountDollars(e.target.value)}
              className={fieldCls}
            />
          </div>
          <div>
            <label className={labelCls}>Shipping $</label>
            <input
              type="text"
              inputMode="decimal"
              value={shippingDollars}
              onChange={(e) => setShippingDollars(e.target.value)}
              className={fieldCls}
            />
          </div>
        </div>
        <div className="mt-3">
          <label className={labelCls}>Override total (optional)</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder={`Auto: ${fmt(computedTotalCents)}`}
            value={totalOverrideDollars}
            onChange={(e) => setTotalOverrideDollars(e.target.value)}
            className={fieldCls}
          />
        </div>
      </Section>

      <Section title="Notes (optional)">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Paid via Apple Pay to the operator @ 5:42pm"
          className={`${fieldCls} resize-none`}
        />
      </Section>

      {/* Total summary */}
      <div className="bg-white border border-border rounded-xl p-4 space-y-1.5 text-sm">
        <Row label="Subtotal" value={fmt(subtotalCents)} muted />
        {discountCents > 0 && <Row label="Discount" value={`-${fmt(discountCents)}`} muted />}
        {shippingCents > 0 && <Row label="Shipping" value={fmt(shippingCents)} muted />}
        <div className="border-t border-border pt-1.5 mt-1.5">
          <Row label="Total" value={fmt(totalCents)} bold />
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <StickyCta
        label={submitting ? "Creating…" : `Create order · ${fmt(totalCents)}`}
        onClick={submit}
        disabled={submitting || items.length === 0}
        loading={submitting}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Send Cart — generate a shareable cart link
// ─────────────────────────────────────────────────────────────────
function SendCartForm() {
  const [items, setItems] = useState<LineItem[]>([]);
  const [pickedSku, setPickedSku] = useState<string>(catalogSkus[0]?.sku ?? "");
  const [pickedQty, setPickedQty] = useState<number>(1);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const subtotalCents = items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);

  const addItem = () => {
    const catalogItem = catalogSkus.find((s) => s.sku === pickedSku);
    if (!catalogItem) return;
    setItems((prev) => [
      ...prev,
      {
        sku: catalogItem.sku,
        productName: catalogItem.productName,
        variantSize: catalogItem.size,
        slug: catalogItem.slug,
        productId: catalogItem.productId,
        quantity: pickedQty,
        unitPriceCents: catalogItem.retailCents,
      },
    ]);
    setPickedQty(1);
  };

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const generate = async () => {
    setError(null);
    if (items.length === 0) {
      setError("Add at least one product first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/shared-carts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            slug: i.slug,
            variantSku: i.sku,
            quantity: i.quantity,
          })),
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create shared cart.");
        return;
      }
      setCreatedUrl(data.url);
      setCreatedSlug(data.sharedCart?.slug ?? null);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const share = async () => {
    if (!createdUrl) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Your Based Research cart",
          text: "Here's the cart we put together for you:",
          url: createdUrl,
        });
        return;
      } catch {
        /* user cancelled or share unavailable — fall through to copy */
      }
    }
    await copy();
  };

  const copy = async () => {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user long-presses the input */
    }
  };

  if (createdUrl) {
    return (
      <div className="space-y-4">
        <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Cart link ready</p>
            <p className="text-xs text-muted mt-0.5">
              When the client opens it, their cart auto-fills with these items and they pay through our normal checkout.
            </p>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-4 space-y-3">
          <label className={labelCls}>Share link</label>
          <input
            type="text"
            value={createdUrl}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            className={`${fieldCls} font-mono text-xs`}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-white text-sm font-medium"
            >
              <Send className="w-4 h-4" aria-hidden="true" /> Share
            </button>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-card border border-border text-foreground text-sm font-medium"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-success" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" /> Copy
                </>
              )}
            </button>
          </div>
          {createdSlug && (
            <a
              href={createdUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
            >
              Preview the cart page <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setCreatedUrl(null);
            setCreatedSlug(null);
            setItems([]);
            setNotes("");
          }}
          className="w-full text-center py-3 text-sm text-primary font-medium"
        >
          Send another cart
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Section title="Products to send">
        <SkuPicker
          pickedSku={pickedSku}
          onPick={setPickedSku}
          pickedQty={pickedQty}
          onQtyChange={setPickedQty}
          onAdd={addItem}
        />
        {items.length > 0 && (
          <ul className="mt-3 space-y-2">
            {items.map((it, idx) => (
              <li
                key={`${it.sku}-${idx}`}
                className="flex items-center justify-between gap-3 bg-card rounded-lg p-3 border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {it.productName} <span className="text-muted">· {it.variantSize}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {it.quantity} × {fmt(it.unitPriceCents)} = {fmt(it.unitPriceCents * it.quantity)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  aria-label="Remove line"
                  className="p-2 -m-2 text-muted hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Notes for the client (optional)">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Shown when they open the cart. E.g. 'Per our chat — let me know once you order.'"
          className={`${fieldCls} resize-none`}
        />
      </Section>

      <div className="bg-white border border-border rounded-xl p-4 text-sm">
        <Row label="Subtotal (preview)" value={fmt(subtotalCents)} bold />
        <p className="text-[11px] text-muted mt-1.5">
          The client&apos;s final total may differ — shipping, processing fees, and any coupon they apply are added at checkout.
        </p>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <StickyCta
        label={submitting ? "Generating link…" : "Generate share link"}
        onClick={generate}
        disabled={submitting || items.length === 0}
        loading={submitting}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Shared atoms
// ─────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground mb-2.5">{title}</h2>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted" : "text-foreground"}>{label}</span>
      <span
        className={`tabular-nums ${bold ? "font-semibold text-foreground" : muted ? "text-muted" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-3 py-2.5 text-sm"
    >
      {children}
    </div>
  );
}

function StickyCta({
  label,
  onClick,
  disabled,
  loading,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] bg-gradient-to-t from-accent/80 to-transparent backdrop-blur-sm">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white text-base font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {label}
        </button>
      </div>
    </div>
  );
}

function SuccessCard({
  title,
  primary,
  sub,
  onReset,
  resetLabel,
}: {
  title: string;
  primary: string;
  sub: string;
  onReset: () => void;
  resetLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-success/10 border border-success/30 rounded-xl p-5 flex items-start gap-3">
        <CheckCircle className="w-6 h-6 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm font-mono text-foreground mt-1">{primary}</p>
          <p className="text-xs text-muted mt-2">{sub}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="w-full text-center py-3 text-sm text-primary font-medium"
      >
        {resetLabel}
      </button>
    </div>
  );
}

function SkuPicker({
  pickedSku,
  onPick,
  pickedQty,
  onQtyChange,
  onAdd,
}: {
  pickedSku: string;
  onPick: (sku: string) => void;
  pickedQty: number;
  onQtyChange: (q: number) => void;
  onAdd: () => void;
}) {
  // Bucket SKUs by product so the dropdown has a sane group structure.
  // Keeps the picker friendly when there are 30+ variants.
  const grouped = useMemo(() => {
    const byProduct = new Map<string, typeof catalogSkus>();
    for (const s of catalogSkus) {
      if (!byProduct.has(s.productName)) byProduct.set(s.productName, []);
      byProduct.get(s.productName)!.push(s);
    }
    return [...byProduct.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  // When the picked SKU changes, surface a price preview the assistant
  // can sanity-check before adding.
  const previewItem = catalogSkus.find((s) => s.sku === pickedSku);

  // Pre-empt a weird state where the parent passes an empty SKU.
  useEffect(() => {
    if (!pickedSku && catalogSkus[0]) onPick(catalogSkus[0].sku);
  }, [pickedSku, onPick]);

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-3">
      <div>
        <label className={labelCls}>Product / size</label>
        <select
          value={pickedSku}
          onChange={(e) => onPick(e.target.value)}
          className={`${fieldCls} appearance-none pr-10`}
        >
          {grouped.map(([productName, skus]) => (
            <optgroup key={productName} label={productName}>
              {skus.map((s) => (
                <option key={s.sku} value={s.sku}>
                  {s.size} · {fmt(s.retailCents)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <div>
          <label className={labelCls}>Qty</label>
          <input
            type="number"
            min={1}
            max={99}
            value={pickedQty}
            onChange={(e) => onQtyChange(Math.max(1, Number(e.target.value) || 1))}
            inputMode="numeric"
            className={fieldCls}
          />
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-4 py-3 rounded-lg bg-primary text-white text-sm font-medium whitespace-nowrap"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Add
        </button>
      </div>
      {previewItem && (
        <p className="text-[11px] text-muted">
          SKU <span className="font-mono text-foreground">{previewItem.sku}</span> · adds {fmt(previewItem.retailCents * pickedQty)} to the order.
        </p>
      )}
    </div>
  );
}
