"use client";

import { useCart } from "@/components/CartProvider";
import { useCurrencySubscription } from "@/components/CurrencyProvider";
import { useLocaleSubscription } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";
import { formatPriceShort } from "@/lib/utils";
import ShareCartButton from "@/components/ShareCartButton";
import { getProductImagePath } from "@/lib/product-images";
import { getDiscountedPrice, getLineTotal, getActiveTier, FREE_SHIPPING_THRESHOLD, computeShippingCents } from "@/lib/discounts";
import { getProductBySlug } from "@/lib/products";
import { captureClient } from "@/lib/posthog-browser";
import Button from "@/components/Button";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus, X, ShoppingBag, ArrowLeft, Truck, Shield, Lock } from "lucide-react";

export default function CartContent() {
  useCurrencySubscription(); // re-render on USD <-> COP toggle
  useLocaleSubscription(); // re-render on EN <-> ES toggle
  const { items, removeItem, updateQuantity, subtotal, clearCart, addItem, applyCoupon, appliedCoupon, removeCoupon } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Shared cart loader: ?share=SLUG hydrates a customer's cart with
  // a curated list the admin pre-built (see /api/admin/shared-carts).
  // Replaces the existing cart on load — the share is treated as the
  // intended cart contents, not an addition. Strips the query param
  // afterward so a refresh doesn't double-replace.
  //
  // If the URL ALSO has ?code=COUPON, we auto-apply the coupon AFTER
  // hydration finishes. This is the single-URL custom-checkout-link
  // path: the admin builds a shared cart + a one-shot coupon, sends
  // the combined URL, and the customer's cart is fully primed on
  // landing. The separate restore/code effect below handles the
  // abandoned-cart-recovery case where there's no share.
  useEffect(() => {
    const share = searchParams.get("share");
    const code = searchParams.get("code");
    if (!share) return;
    fetch(`/api/shared-carts/${encodeURIComponent(share)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        if (!data?.items?.length) return;
        clearCart();
        const itemsForCoupon: Array<{ slug: string; price: number; quantity: number }> = [];
        for (const item of data.items) {
          const product = getProductBySlug(item.slug);
          if (!product) continue;
          const variant =
            product.variants.find((v) => v.sku === item.variantSku) ??
            product.variants[0];
          addItem(product, variant, item.quantity);
          itemsForCoupon.push({
            slug: product.slug,
            price: variant.price,
            quantity: item.quantity,
          });
        }
        // Auto-apply coupon code if present. Run AFTER hydration so the
        // validator sees the right cart contents.
        if (code && itemsForCoupon.length > 0) {
          try {
            const r = await fetch("/api/coupons/validate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code, items: itemsForCoupon }),
            });
            if (r.ok) {
              const cd = await r.json();
              if (cd?.valid) {
                applyCoupon({
                  code: cd.code,
                  couponId: cd.couponId,
                  discountCents: cd.discountCents,
                  description: cd.description ?? null,
                });
              }
            }
          } catch (err) {
            console.warn("[CartContent] shared-cart coupon auto-apply failed", err);
          }
        }
      })
      .catch((err) => console.warn("[CartContent] shared-cart load failed", err))
      .finally(() => router.replace("/cart"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abandoned-cart recovery: ?restore=TOKEN loads the original items and
  // merges them into the local cart. Stage-3 emails also carry ?code=
  // so the recovery coupon auto-applies without the customer having to
  // type it — we run both in the same effect, then strip the query
  // params so a refresh doesn't re-trigger either flow.
  useEffect(() => {
    const token = searchParams.get("restore");
    const code = searchParams.get("code");
    // If ?share= is also present, the share effect above handles both
    // the items AND the coupon. Bail out here so we don't double-apply
    // or fight the share effect's router.replace.
    if (searchParams.get("share")) return;
    if (!token && !code) return;

    // Capture whatever items we end up with so the coupon validator
    // can use them (it requires an items[] payload). Two sources:
    //   - If ?restore= hit, we use the items the server returned.
    //   - Otherwise, we use whatever's already in the local cart.
    let itemsForValidation: Array<{ slug: string; price: number; quantity: number }> = items.map((i) => ({
      slug: i.slug,
      price: i.price,
      quantity: i.quantity,
    }));

    const restorePromise = token
      ? fetch(`/api/abandoned-cart/restore?token=${encodeURIComponent(token)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data?.items) return;
            for (const item of data.items) {
              const product = getProductBySlug(item.slug);
              if (!product) continue;
              const variant =
                product.variants.find((v) => v.sku === item.variantSku) ??
                product.variants[0];
              addItem(product, variant, item.quantity);
            }
            itemsForValidation = data.items.map((i: { slug: string; price: number; quantity: number }) => ({
              slug: i.slug,
              price: i.price,
              quantity: i.quantity,
            }));
          })
      : Promise.resolve();

    restorePromise
      .then(() => {
        if (!code) return;
        if (itemsForValidation.length === 0) return;
        fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, items: itemsForValidation }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data?.valid) return;
            applyCoupon({
              code: data.code,
              couponId: data.couponId,
              discountCents: data.discountCents,
              description: data.description ?? null,
            });
          })
          .catch((err) =>
            console.warn("[CartContent] coupon auto-apply failed", err),
          );
      })
      .catch((err) =>
        console.warn("[CartContent] abandoned-cart restore failed", err),
      )
      .finally(() => {
        // Clean the URL so a refresh doesn't re-add items or re-apply
        // the coupon.
        router.replace("/cart");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shippingThreshold = FREE_SHIPPING_THRESHOLD;
  const freeShipping = subtotal >= shippingThreshold;
  // Shared helper so cart-page shipping math matches checkout-page math
  // (both use FLAT_SHIPPING_CENTS = 1500 — whole-dollar policy 2026-05-16).
  const shippingCost = computeShippingCents(subtotal);
  // Coupon discount displayed here is advisory — server-side validation
  // recomputes from the coupon row at checkout. We trust it for the
  // cart-page total preview.
  const couponDiscount = appliedCoupon?.discountCents ?? 0;
  const total = Math.max(0, subtotal + shippingCost - couponDiscount);

  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCouponError("");
    const code = couponInput.trim();
    if (!code) {
      setCouponError("Enter a code.");
      return;
    }
    if (items.length === 0) {
      setCouponError("Add items to your cart first.");
      return;
    }
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          items: items.map((i) => ({
            slug: i.slug,
            price: i.price,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      // Always record the attempt — valid or invalid — so we can
      // surface "phantom codes" customers expect us to honor.
      captureClient("coupon_attempted", {
        code,
        valid: !!data?.valid,
        error: data?.valid ? null : data?.error || "unknown",
        cart_subtotal_cents: subtotal,
        cart_item_count: items.reduce((n, i) => n + i.quantity, 0),
      });
      if (!data?.valid) {
        setCouponError(data?.error || "Invalid code.");
        return;
      }
      applyCoupon({
        code: data.code,
        couponId: data.couponId,
        discountCents: data.discountCents,
        description: data.description ?? null,
      });
      captureClient("coupon_applied", {
        code: data.code,
        discount_cents: data.discountCents,
        cart_subtotal_cents: subtotal,
      });
      setCouponInput("");
    } catch {
      captureClient("coupon_attempted", {
        code,
        valid: false,
        error: "network_error",
      });
      setCouponError("Network error. Try again.");
    } finally {
      setCouponLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
        <h1 className="font-serif text-3xl text-foreground">Your Cart is Empty</h1>
        <p className="text-muted mt-2">
          Browse our catalog to find research peptides for your studies.
        </p>
        <Link href="/catalog" className="mt-8 inline-block">
          <Button variant="primary" size="lg">
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-10">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground">Cart</h1>
        <button
          onClick={clearCart}
          className="text-sm text-muted hover:text-destructive transition-colors cursor-pointer"
          aria-label="Clear all items from cart"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4" role="list" aria-label="Cart items">
          {items.map((item) => (
            <div
              key={item.variantSku}
              className="flex gap-4 p-4 rounded-xl border border-border bg-card"
              role="listitem"
            >
              {/* Product image */}
              <div className="relative w-20 h-20 rounded-lg bg-accent overflow-hidden flex-shrink-0">
                <Image
                  src={getProductImagePath(item.slug)}
                  alt={item.productName}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/product/${item.slug}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-sm text-muted mt-0.5">{item.variantSize}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.variantSku)}
                    className="text-muted hover:text-destructive transition-colors p-1 cursor-pointer"
                    aria-label={`Remove ${item.productName} from cart`}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5" role="group" aria-label={`Quantity for ${item.productName}`}>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.variantSku, item.quantity - 1)
                      }
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-accent transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={item.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    {/* Direct typing for bulk orders — paste "60" and
                        go. Same clamp pattern as the PDP. */}
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        if (digits === "") {
                          updateQuantity(item.variantSku, 1);
                          return;
                        }
                        const n = parseInt(digits, 10);
                        if (Number.isFinite(n)) {
                          updateQuantity(item.variantSku, Math.min(999, Math.max(1, n)));
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-12 h-8 text-center text-sm font-medium rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
                      aria-label={`Quantity for ${item.productName}`}
                      maxLength={3}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.variantSku, Math.min(999, item.quantity + 1))
                      }
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-accent transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="font-medium text-foreground">
                      {formatPriceShort(getLineTotal(item.price, item.quantity, item.slug))}
                    </span>
                    {getActiveTier(item.quantity, item.slug) && (
                      <p className="text-[10px] text-success font-medium">
                        {getActiveTier(item.quantity, item.slug)!.discountPercent}% off ({formatPriceShort(getDiscountedPrice(item.price, item.quantity, item.slug))}/ea)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 p-6 rounded-xl border border-border bg-card" aria-label="Order summary">
            <h2 className="font-serif text-xl text-foreground mb-4">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">{t("cart.subtotal")}</span>
                <span className="font-medium">{formatPriceShort(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">{t("cart.shipping")}</span>
                <span className="font-medium">
                  {freeShipping ? (
                    <span className="text-success">{t("cart.shippingFree")}</span>
                  ) : (
                    formatPriceShort(shippingCost)
                  )}
                </span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between items-center text-success">
                  <span className="flex items-center gap-1.5">
                    {/* Label flips between "Discount" and "Free shipping"
                        depending on what the validator returned. The
                        free-shipping coupon's description is the
                        canonical marker — set in lib/coupons.ts so any
                        free-shipping coupon (not just 0SHIP) lights up
                        the right label. */}
                    {appliedCoupon.description?.startsWith("Free shipping")
                      ? "Free shipping"
                      : t("cart.discount")}
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-success/10">
                      {appliedCoupon.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        captureClient("coupon_removed_by_user", {
                          code: appliedCoupon?.code,
                          discount_cents: appliedCoupon?.discountCents,
                        });
                        removeCoupon();
                      }}
                      className="text-muted hover:text-destructive cursor-pointer text-[11px] underline underline-offset-2"
                    >
                      {t("cart.remove").toLowerCase()}
                    </button>
                  </span>
                  <span className="font-medium">
                    {/* Cart already over the free-shipping threshold:
                        coupon is applied but saves nothing. Show
                        "applied" instead of "-$0.00" so the customer
                        understands the code worked. */}
                    {couponDiscount > 0
                      ? `-${formatPriceShort(couponDiscount)}`
                      : "applied"}
                  </span>
                </div>
              )}
              <hr className="border-border" />
              <div className="flex justify-between text-base">
                <span className="font-medium">{t("cart.total")}</span>
                <span className="font-semibold text-lg">
                  {formatPriceShort(total)}
                </span>
              </div>
            </div>

            {/* Promo code input — collapses to a single inline field +
                Apply button. Server-validated on submit; the discount
                shows up immediately above when accepted. */}
            {!appliedCoupon && (
              <form onSubmit={handleApplyCoupon} className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder={t("cart.couponPlaceholder")}
                  autoComplete="off"
                  className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={couponLoading || !couponInput.trim()}
                  className="h-10 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {couponLoading ? "..." : t("btn.applyCode")}
                </button>
              </form>
            )}
            {couponError && (
              <p className="mt-2 text-xs text-destructive">{couponError}</p>
            )}

            {!freeShipping && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                <p className="text-xs text-muted">
                  Add{" "}
                  <span className="font-medium text-foreground">
                    {formatPriceShort(shippingThreshold - subtotal)}
                  </span>{" "}
                  more for free shipping
                </p>
              </div>
            )}

            <a href="/checkout" className="block mt-6">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
              >
                Proceed to Checkout
              </Button>
            </a>

            {/* Institutional eligibility note */}
            <p className="text-[11px] text-muted text-center mt-3 leading-relaxed">
              For qualified labs and institutional buyers.{" "}
              <Link href="/institutional-use" className="text-primary hover:underline">
                Buyer eligibility &amp; research-use certification
              </Link>
            </p>

            {/* Save & share — generates a shareable URL of the current
                cart. Doubles as a wishlist (bookmark the link to come
                back later). Powered by /api/cart/share. */}
            <ShareCartButton />

            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-1 text-muted">
                <Shield className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wider">SSL Secured</span>
              </div>
              <div className="flex items-center gap-1 text-muted">
                <Lock className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Secure Payment</span>
              </div>
            </div>

            <Link
              href="/catalog"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary mt-4 py-2.5 rounded-lg border border-primary/20 hover:bg-primary/5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
