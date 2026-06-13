"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { useAuth } from "@/components/AuthProvider";
import Button from "@/components/Button";
import {
  computeShippingCents,
  computeCardProcessingFeeCents,
} from "@/lib/discounts";
import {
  Loader2,
  Lock,
  ShoppingBag,
  ArrowLeft,
  CreditCard,
} from "lucide-react";

/**
 * Checkout — blank-slate template.
 *
 * This template ships WITHOUT a payment processor. The form below
 * collects the shipping address, shows an order summary, and creates a
 * `pending` order via POST /api/checkout. The "Payment" section is a
 * placeholder: wire your processor's payment form / redirect there and in
 * src/app/api/checkout/route.ts, then run fulfillment from its webhook.
 */

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const emptyAddress = {
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
};

export default function CheckoutClient() {
  const router = useRouter();
  const { items, subtotal, appliedCoupon, removeCoupon, applyCoupon, clearCart } = useCart();
  const { user, isLoading: authLoading } = useAuth();

  const [address, setAddress] = useState(() => ({
    ...emptyAddress,
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
  }));
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable per-page-load idempotency key so a double-submit can't mint two orders.
  const idempotencyKey = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  );

  const couponDiscount = appliedCoupon?.discountCents ?? 0;
  const shippingCost = useMemo(() => computeShippingCents(subtotal), [subtotal]);
  const processingFee = useMemo(
    () => computeCardProcessingFeeCents(subtotal, shippingCost, "card"),
    [subtotal, shippingCost],
  );
  const total = Math.max(0, subtotal + shippingCost + processingFee - couponDiscount);

  function setField(field: keyof typeof emptyAddress, value: string) {
    setAddress((a) => ({ ...a, [field]: value }));
  }

  async function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          items: items.map((i) => ({ slug: i.slug, price: i.price, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (data.valid) {
        applyCoupon({
          code: data.code,
          couponId: data.couponId,
          discountCents: data.discountCents,
          description: data.description ?? null,
        });
        setCouponInput("");
      } else {
        setCouponError(data.error || "That code isn't valid.");
      }
    } catch {
      setCouponError("Could not validate code. Try again.");
    } finally {
      setCouponLoading(false);
    }
  }

  const addressComplete =
    address.firstName.trim() &&
    address.lastName.trim() &&
    address.address1.trim() &&
    address.city.trim() &&
    address.state.trim() &&
    address.zip.trim();

  async function handleSubmit() {
    if (!addressComplete || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            variantSku: i.variantSku,
            variantSize: i.variantSize,
            price: i.price,
            quantity: i.quantity,
            slug: i.slug,
          })),
          shippingAddress: {
            firstName: address.firstName.trim(),
            lastName: address.lastName.trim(),
            address1: address.address1.trim(),
            address2: address.address2.trim() || undefined,
            city: address.city.trim(),
            state: address.state.trim(),
            zip: address.zip.trim(),
            country: address.country || "US",
          },
          couponCode: appliedCoupon?.code,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.redirectTo) {
          router.push(data.redirectTo);
          return;
        }
        if (res.status === 401) {
          router.push("/auth/sign-in?redirect=/checkout");
          return;
        }
        setError(data.error || "Checkout failed. Please try again.");
        return;
      }
      clearCart();
      router.push(`/checkout/callback?order_number=${encodeURIComponent(data.orderNumber)}`);
    } catch {
      setError("Checkout failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Guards ────────────────────────────────────────────────────────
  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Lock className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-semibold">Sign in to check out</h1>
        <p className="mb-6 text-muted-foreground">You need an account to place an order.</p>
        <Link href="/auth/sign-in?redirect=/checkout">
          <Button size="lg">Sign in</Button>
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShoppingBag className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-semibold">Your cart is empty</h1>
        <p className="mb-6 text-muted-foreground">Add a few items before checking out.</p>
        <Link href="/shop">
          <Button size="lg">Browse the catalog</Button>
        </Link>
      </div>
    );
  }

  const input =
    "w-full rounded-lg border border-border-strong bg-background px-3.5 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/cart" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to cart
      </Link>
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* ── Left: shipping + payment ── */}
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-lg font-semibold">Shipping address</h2>
            <div className="grid grid-cols-2 gap-3">
              <input className={input} placeholder="First name" value={address.firstName} onChange={(e) => setField("firstName", e.target.value)} autoComplete="given-name" />
              <input className={input} placeholder="Last name" value={address.lastName} onChange={(e) => setField("lastName", e.target.value)} autoComplete="family-name" />
              <input className={`${input} col-span-2`} placeholder="Address" value={address.address1} onChange={(e) => setField("address1", e.target.value)} autoComplete="address-line1" />
              <input className={`${input} col-span-2`} placeholder="Apt, suite, etc. (optional)" value={address.address2} onChange={(e) => setField("address2", e.target.value)} autoComplete="address-line2" />
              <input className={input} placeholder="City" value={address.city} onChange={(e) => setField("city", e.target.value)} autoComplete="address-level2" />
              <input className={input} placeholder="State" value={address.state} onChange={(e) => setField("state", e.target.value)} autoComplete="address-level1" />
              <input className={input} placeholder="ZIP" value={address.zip} onChange={(e) => setField("zip", e.target.value)} autoComplete="postal-code" />
              <input className={input} placeholder="Country" value={address.country} onChange={(e) => setField("country", e.target.value)} autoComplete="country" />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Payment</h2>
            {/* PAYMENT INTEGRATION PLACEHOLDER — no processor is wired in this
                template. Replace this block (and the matching section in
                src/app/api/checkout/route.ts) with your processor's payment
                form, hosted-checkout redirect, or embedded element. */}
            <div className="flex items-start gap-3 rounded-lg border border-dashed border-border-strong bg-accent/40 p-4">
              <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">No payment processor is configured.</p>
                <p className="mt-1 text-muted-foreground">
                  This is a starter template. Placing the order below creates an
                  unpaid order record. Wire your payment provider in the checkout
                  route and this section to collect payment.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ── Right: order summary ── */}
        <aside className="h-fit rounded-xl border border-border-strong bg-card p-5 lg:sticky lg:top-6">
          <h2 className="mb-4 text-lg font-semibold">Order summary</h2>
          <ul className="mb-4 space-y-3">
            {items.map((i) => (
              <li key={i.variantSku} className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {i.productName}
                  <span className="text-xs"> · {i.variantSize} × {i.quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums">{money(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="mb-4 border-t border-border pt-4">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-lg bg-accent/50 px-3 py-2 text-sm">
                <span>
                  Code <span className="font-medium">{appliedCoupon.code}</span> applied
                </span>
                <button onClick={removeCoupon} className="text-xs text-muted-foreground hover:text-foreground">
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className={`${input} flex-1`}
                  placeholder="Discount code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                />
                <Button variant="outline" onClick={handleApplyCoupon} disabled={couponLoading || !couponInput.trim()}>
                  {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
            {couponError && <p className="mt-1.5 text-xs text-destructive">{couponError}</p>}
          </div>

          <dl className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="tabular-nums">{shippingCost === 0 ? "Free" : money(shippingCost)}</dd>
            </div>
            {processingFee > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Processing fee</dt>
                <dd className="tabular-nums">{money(processingFee)}</dd>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <dt>Discount</dt>
                <dd className="tabular-nums">−{money(couponDiscount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(total)}</dd>
            </div>
          </dl>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          <Button
            size="lg"
            className="mt-5 w-full"
            onClick={handleSubmit}
            disabled={!addressComplete || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing order…
              </>
            ) : (
              "Place order"
            )}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> No card is charged — payment is not configured.
          </p>
        </aside>
      </div>
    </div>
  );
}
