"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Product, ProductVariant } from "@/lib/products";
import { getDiscountedPrice, getLineTotal } from "@/lib/discounts";
import { trackAddToCart } from "@/lib/meta-pixel";
import { isInMetaCatalog } from "@/lib/meta-eligibility";
import { captureClient } from "@/lib/posthog-browser";
import { useAuth } from "@/components/AuthProvider";
import { computeCostPlusDiscountCents, COST_PLUS_LABEL } from "@/lib/cost-plus";

export interface CartItem {
  productId: string;
  productName: string;
  variantSku: string;
  variantSize: string;
  price: number;
  quantity: number;
  slug: string;
  // Subscription metadata (optional — only set when user picks "Subscribe & Save")
  isSubscription?: boolean;
  subscriptionFrequency?: number; // 30, 60, 90
}

/**
 * Applied coupon surfaces to downstream UI + the checkout payload.
 * Server-side revalidates before charging; never trust these numbers
 * for anything except display.
 */
export interface AppliedCoupon {
  code: string;
  couponId: string;
  discountCents: number;
  description: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, variant: ProductVariant, quantity?: number, subscription?: { frequency: number }) => void;
  removeItem: (sku: string) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  // Coupon state — set after a successful /api/coupons/validate call,
  // cleared on clearCart. Persisted alongside the cart in localStorage
  // so a page refresh between cart + checkout doesn't lose it.
  appliedCoupon: AppliedCoupon | null;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Versioned envelope for localStorage persistence. Bump CART_SCHEMA_VERSION
// whenever CartItem's shape changes in a non-additive way — the loader
// discards any envelope with a different version, preventing hydration
// crashes on users with a stale cart from an older deploy.
const CART_STORAGE_KEY = "based-research-cart";
const CART_SCHEMA_VERSION = 2;

interface StoredCart {
  v: number;
  items: CartItem[];
  coupon?: AppliedCoupon | null;
}

function loadStoredCart(): { items: CartItem[]; coupon: AppliedCoupon | null } {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [], coupon: null };

    const parsed: unknown = JSON.parse(raw);

    // v2+: versioned envelope — `{ v, items, coupon? }`.
    if (
      parsed &&
      typeof parsed === "object" &&
      "v" in parsed &&
      "items" in parsed
    ) {
      const env = parsed as StoredCart;
      if (env.v === CART_SCHEMA_VERSION && Array.isArray(env.items)) {
        return {
          items: env.items.filter(isValidCartItem),
          coupon: isValidCoupon(env.coupon) ? env.coupon : null,
        };
      }
      // Mismatched version — drop it. A future migration can branch here
      // instead of nuking, but "start fresh" is safer than "hydrate
      // partially and crash halfway through checkout".
      return { items: [], coupon: null };
    }

    // v1 legacy shape: raw array. Migrate in-place if still structurally
    // compatible so existing sessions don't lose their cart.
    if (Array.isArray(parsed)) {
      return { items: parsed.filter(isValidCartItem), coupon: null };
    }

    return { items: [], coupon: null };
  } catch {
    return { items: [], coupon: null };
  }
}

function isValidCoupon(x: unknown): x is AppliedCoupon {
  if (!x || typeof x !== "object") return false;
  const c = x as Record<string, unknown>;
  return (
    typeof c.code === "string" &&
    typeof c.couponId === "string" &&
    typeof c.discountCents === "number" &&
    (c.description === null || typeof c.description === "string")
  );
}

function isValidCartItem(x: unknown): x is CartItem {
  if (!x || typeof x !== "object") return false;
  const i = x as Record<string, unknown>;
  return (
    typeof i.productId === "string" &&
    typeof i.productName === "string" &&
    typeof i.variantSku === "string" &&
    typeof i.variantSize === "string" &&
    typeof i.price === "number" &&
    typeof i.quantity === "number" &&
    typeof i.slug === "string"
  );
}

// sessionStorage key — module scope so both the auto-apply effect and
// removeCoupon() can flip the same flag. Cleared automatically when
// the tab closes (sessionStorage TTL).
const REF_AUTO_APPLIED_KEY = "br-ref-auto-applied";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  // Used to suppress the affiliate-code auto-apply effect for admin
  // accounts. An admin testing the site (clicking their own affiliate
  // deep links to QA the partner flow, for example) leaves sw-ref in
  // localStorage and would otherwise have every subsequent cart they
  // open silently apply some random affiliate's discount + credit the
  // affiliate. We skip the entire auto-apply branch when role==admin
  // so testing never leaks into commission ledgers or share-link
  // recipient experience.
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  // Insider / cost-plus pricing per user. Stored cents above supplier cost.
  // Server-authoritative at order-mint; this client-side number just drives
  // the "Insider pricing -$X.XX" line in the cart UI so the customer sees
  // what they're saving in real time.
  const costPlusMarginCents = user?.costPlusMarginCents ?? 0;

  useEffect(() => {
    setMounted(true);
    const loaded = loadStoredCart();
    setItems(loaded.items);
    setAppliedCoupon(loaded.coupon);
  }, []);

  useEffect(() => {
    if (mounted) {
      const envelope: StoredCart = {
        v: CART_SCHEMA_VERSION,
        items,
        coupon: appliedCoupon,
      };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(envelope));
    }
  }, [items, appliedCoupon, mounted]);

  // Revalidate the applied coupon any time the cart items change. The
  // server is the source of truth (min-subtotal, product-match, per-user
  // cap) so we re-call /api/coupons/validate; if it comes back invalid
  // we drop the coupon silently rather than charge the customer based
  // on a stale display. Skipped when no coupon is applied or the cart
  // is empty (empty-cart validate would always fail with "add eligible
  // product" — not actionable).
  useEffect(() => {
    if (!mounted) return;
    if (!appliedCoupon) return;
    if (items.length === 0) return;
    // The INSIDER_PRICING line is synthetic — derived from user.costPlusMarginCents
    // by the effect below, not a real coupons-table row. Calling validate on
    // it would 404 and drop it on every cart change. Skip revalidation here;
    // the cost-plus effect re-derives the amount whenever items change.
    if (appliedCoupon.code === "INSIDER_PRICING") return;
    const code = appliedCoupon.code;
    const validationItems = items.map((i) => ({
      slug: i.slug,
      price: i.price,
      quantity: i.quantity,
    }));
    let cancelled = false;
    fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, items: validationItems }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data?.valid) {
          captureClient("coupon_revalidated", {
            code,
            still_valid: false,
            reason: data?.error || "unknown",
          });
          // Drop the stale coupon. The cart UI will pop the discount
          // line; user can re-enter a different code if they want.
          setAppliedCoupon(null);
          return;
        }
        // Server may have recomputed the discount (e.g. quantity
        // changed for a percentage code). Patch state if it differs
        // so the displayed total stays accurate.
        if (data.discountCents !== appliedCoupon.discountCents) {
          captureClient("coupon_revalidated", {
            code,
            still_valid: true,
            old_discount_cents: appliedCoupon.discountCents,
            new_discount_cents: data.discountCents,
          });
          setAppliedCoupon({
            code: data.code,
            couponId: data.couponId,
            discountCents: data.discountCents,
            description: data.description ?? null,
          });
        }
      })
      .catch(() => { /* network blip — keep current state */ });
    return () => {
      cancelled = true;
    };
    // Depend on the applied coupon's identity (code + discount), not just
    // items, so swapping codes re-runs this effect — the cleanup cancels the
    // prior in-flight validate, preventing a stale resolve from overwriting
    // the new coupon (or comparing against a stale discountCents).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, mounted, appliedCoupon?.code, appliedCoupon?.discountCents]);

  // Auto-apply an affiliate code from localStorage["br-ref"] (set by
  // <ReferralCapture /> when ?ref= is in the URL). Fires once per
  // session when the cart has items AND no coupon is currently
  // applied AND the user has not explicitly removed an auto-applied
  // affiliate code in this session. Without this, customers who
  // arrive via a partner's link have to manually type the code at
  // checkout to get the discount, which is the leakiest part of the
  // funnel for affiliate-driven traffic.
  //
  // Idempotency: a sessionStorage flag tracks "already auto-applied
  // this session" so removeCoupon() does not loop. The ref code stays
  // in localStorage for signup attribution regardless.
  useEffect(() => {
    if (!mounted) return;
    if (appliedCoupon) return;
    if (items.length === 0) return;
    // Admin testing guard. Bug 2026-05-19: an admin browser had a
    // br-ref affiliate code set from an earlier deep-link QA pass, so
    // every cart opened (including shares) auto-applied that code as a
    // coupon — giving the customer the affiliate's discount and crediting
    // the affiliate for the commission. Skip the entire branch for admin
    // users. Real customers still get auto-apply.
    if (isAdmin) return;

    let refCode: string | null = null;
    let alreadyApplied = false;
    try {
      refCode = localStorage.getItem("br-ref");
      alreadyApplied = sessionStorage.getItem(REF_AUTO_APPLIED_KEY) === "1";
    } catch {
      // Private mode / disabled storage — silently skip.
      return;
    }
    if (!refCode || alreadyApplied) return;

    const validationItems = items.map((i) => ({
      slug: i.slug,
      price: i.price,
      quantity: i.quantity,
    }));

    let cancelled = false;
    fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: refCode, items: validationItems }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data?.valid) return;
        // Mark as applied BEFORE setting the coupon so a re-render
        // triggered by the state update cannot re-enter this effect
        // before the flag lands.
        try {
          sessionStorage.setItem(REF_AUTO_APPLIED_KEY, "1");
        } catch {
          /* ignore */
        }
        setAppliedCoupon({
          code: data.code,
          couponId: data.couponId,
          discountCents: data.discountCents,
          description: data.description ?? null,
        });
        captureClient("affiliate_code_auto_applied", {
          code: data.code,
          discount_cents: data.discountCents,
        });
      })
      .catch(() => { /* network blip — try again on next cart change */ });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, appliedCoupon, mounted, isAdmin]);

  // Cost-plus / insider pricing auto-apply. Fires whenever cart contents or
  // the user's costPlusMarginCents change. Synthesizes a coupon line equal
  // to (retail subtotal − cost-plus subtotal). Skips when:
  //   - margin is zero / unset (regular customer)
  //   - cart is empty
  //   - a different (user-entered) coupon is already applied — we don't
  //     stack insider pricing on top of a promo code without explicit UX
  //     for that case. Most-recent applied wins.
  //   - user is an admin (admin testing the site shouldn't see a fake
  //     auto-discount that could confuse pricing QA)
  useEffect(() => {
    if (!mounted) return;
    if (isAdmin) return;
    if (costPlusMarginCents <= 0) {
      // If a previously-applied insider line is still stuck on (user
      // signed out, server stripped the margin, etc.), clear it.
      if (appliedCoupon?.code === "INSIDER_PRICING") {
        setAppliedCoupon(null);
      }
      return;
    }
    if (items.length === 0) return;

    // Skip when the user has a real coupon code applied. Don't trample.
    if (appliedCoupon && appliedCoupon.code !== "INSIDER_PRICING") return;

    const result = computeCostPlusDiscountCents(
      items.map((i) => ({
        slug: i.slug,
        variantSku: i.variantSku,
        quantity: i.quantity,
        retailPriceCents: i.price,
      })),
      costPlusMarginCents,
    );

    if (result.discountCents <= 0) {
      // Nothing to discount on this cart (e.g. all cost-missing items).
      // Drop any stale insider line so subtotal doesn't look weird.
      if (appliedCoupon?.code === "INSIDER_PRICING") setAppliedCoupon(null);
      return;
    }

    // Only update state if the amount actually changed — otherwise React
    // re-render thrashing on every cart-effect tick.
    if (
      !appliedCoupon ||
      appliedCoupon.code !== "INSIDER_PRICING" ||
      appliedCoupon.discountCents !== result.discountCents
    ) {
      setAppliedCoupon({
        code: "INSIDER_PRICING",
        // A sentinel UUID so /api/coupons/validate is never queried for
        // this code (it doesn't exist in the coupons table; it's synthetic).
        couponId: "00000000-0000-0000-0000-000000000000",
        discountCents: result.discountCents,
        description: COST_PLUS_LABEL,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, costPlusMarginCents, mounted, isAdmin]);

  const addItem = useCallback((product: Product, variant: ProductVariant, quantity = 1, subscription?: { frequency: number }) => {
    setItems((prev) => {
      // For subscriptions, use a unique key so subscription + one-time don't merge
      const key = subscription ? `${variant.sku}:sub` : variant.sku;
      const existing = prev.find((item) =>
        subscription ? (item.variantSku === variant.sku && item.isSubscription) : (item.variantSku === variant.sku && !item.isSubscription)
      );
      if (existing) {
        return prev.map((item) =>
          (subscription ? (item.variantSku === variant.sku && item.isSubscription) : (item.variantSku === variant.sku && !item.isSubscription))
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          variantSku: variant.sku,
          variantSize: variant.size,
          price: variant.price,
          quantity,
          slug: product.slug,
          isSubscription: !!subscription,
          subscriptionFrequency: subscription?.frequency,
        },
      ];
    });
    setIsCartOpen(true);
    // Meta Pixel + CAPI AddToCart (deduped via shared eventID). Fires
    // for every addItem call site — product page, cart restore, related
    // products bundle, post-purchase upsell, etc. — so Meta sees a
    // complete AddToCart funnel regardless of which UI triggered it.
    //
    // Skipped for products that aren't in our Meta catalog feed:
    // restricted GLP-1s + upsellOnly accessories (BAC water, syringes,
    // alcohol swabs, etc.). Firing for those products generates
    // catalog-miss events that drag down the match-rate metric without
    // any upside (they can't be retargeted via dynamic ads anyway).
    if (isInMetaCatalog(product.slug)) {
      trackAddToCart({
        id: variant.sku,
        name: product.name,
        price: variant.price,
        quantity,
        category: product.category,
      });
    }

    // Persist the add to our own DB for admin-side interest tracking.
    // Fire-and-forget + keepalive so the call survives a navigation
    // right after the click. Anonymous users are a no-op server-side.
    fetch("/api/cart-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: product.slug,
        productName: product.name,
        variantSku: variant.sku,
        priceCents: variant.price,
        quantity,
      }),
      keepalive: true,
    }).catch((err) => console.warn("[CartProvider] cart-events log failed", err));
  }, []);

  const removeItem = useCallback((sku: string) => {
    setItems((prev) => prev.filter((item) => item.variantSku !== sku));
  }, []);

  const updateQuantity = useCallback((sku: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(sku);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.variantSku === sku ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedCoupon(null);
  }, []);

  const applyCoupon = useCallback((coupon: AppliedCoupon) => {
    setAppliedCoupon(coupon);
  }, []);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    // If the user is explicitly removing an auto-applied affiliate
    // code, keep the "already applied this session" flag set so the
    // auto-apply effect does not put it right back on the next
    // cart-change render. The flag clears naturally when the tab
    // closes (sessionStorage scope) or is overridden by a fresh
    // ?ref= visit (which writes a new sw-ref value).
    try {
      sessionStorage.setItem(REF_AUTO_APPLIED_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + getLineTotal(item.price, item.quantity, item.slug), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        isCartOpen,
        setIsCartOpen,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
