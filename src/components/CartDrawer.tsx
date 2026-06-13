"use client";

import { X, Minus, Plus, ShoppingBag, Truck, FlaskConical, Lock } from "lucide-react";
import { useCart } from "./CartProvider";
import { useCurrencySubscription } from "./CurrencyProvider";
import { formatPriceShort } from "@/lib/utils";
import { getProductImagePath } from "@/lib/product-images";
import { getVolumeTiersForPrice, getDiscountedPrice, getLineTotal, getActiveTier, FREE_SHIPPING_THRESHOLD, FREE_BAC_WATER_THRESHOLD } from "@/lib/discounts";
import Image from "next/image";
import Link from "next/link";
import Button from "./Button";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  useCurrencySubscription(); // re-render on USD <-> COP toggle
  const { items, removeItem, updateQuantity, subtotal, totalItems } = useCart();

  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const freeBacWater = subtotal >= FREE_BAC_WATER_THRESHOLD;

  // Progress bar: 0 to $400 range
  const progressPercent = Math.min((subtotal / FREE_BAC_WATER_THRESHOLD) * 100, 100);
  const shippingPercent = (FREE_SHIPPING_THRESHOLD / FREE_BAC_WATER_THRESHOLD) * 100; // 50%

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-background shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-serif text-lg">
              Your cart{totalItems > 0 && <span className="text-muted font-sans text-sm font-normal"> ({totalItems} {totalItems === 1 ? "item" : "items"})</span>}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-4">
                <ShoppingBag className="w-12 h-12 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium text-foreground">Your cart is empty</p>
                  <p className="text-sm text-muted mt-1">
                    Browse our catalog to find research peptides.
                  </p>
                </div>
                <Link href="/catalog" onClick={onClose}>
                  <Button variant="primary" size="sm">
                    Browse Catalog
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Progress Bar */}
                <div className="px-4 pb-4">
                  <div className="relative">
                    {/* Labels */}
                    <div className="flex justify-between text-[10px] text-muted mb-1.5 px-0.5">
                      <span>{formatPriceShort(subtotal)}</span>
                      <span>{formatPriceShort(FREE_BAC_WATER_THRESHOLD)}</span>
                    </div>

                    {/* Track with inline milestones */}
                    <div className="relative h-3 bg-border rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* Milestone labels below the bar */}
                    <div className="flex justify-between mt-2">
                      {/* Free Shipping at 50% */}
                      <div className="flex items-center gap-1.5" style={{ marginLeft: `calc(${shippingPercent}% - 50px)` }}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${freeShipping ? "bg-primary text-white" : "bg-accent border border-border text-muted"}`}>
                          <Truck className="w-3 h-3" aria-hidden="true" />
                        </div>
                        <span className={`text-[10px] font-semibold whitespace-nowrap ${freeShipping ? "text-primary" : "text-muted"}`}>
                          {freeShipping ? "Free Shipping!" : "Free Shipping"}
                        </span>
                      </div>

                      {/* Free Bac Water at 100% */}
                      <div className="flex items-center gap-1.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${freeBacWater ? "bg-primary text-white" : "bg-accent border border-border text-muted"}`}>
                          <FlaskConical className="w-3 h-3" aria-hidden="true" />
                        </div>
                        <span className={`text-[10px] font-semibold whitespace-nowrap ${freeBacWater ? "text-primary" : "text-muted"}`}>
                          {freeBacWater ? "Free Bac Water!" : "Free Bac Water"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cart Items */}
                <div className="px-4 pt-8 space-y-3">
                  {items.map((item) => {
                    const volumeTiers = getVolumeTiersForPrice(item.price, item.slug);
                    const activeTier = getActiveTier(item.quantity, item.slug);
                    const unitPrice = getDiscountedPrice(item.price, item.quantity, item.slug);
                    const lineTotal = getLineTotal(item.price, item.quantity);
                    const hasDiscount = activeTier !== null;

                    return (
                      <div key={item.variantSku} className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="flex gap-3 p-3">
                          {/* Product image */}
                          <Link href={`/product/${item.slug}`} onClick={onClose} className="flex-shrink-0">
                            <div className="relative w-16 h-16 rounded-lg bg-accent overflow-hidden border border-border">
                              <Image
                                src={getProductImagePath(item.slug)}
                                alt={item.productName}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            </div>
                          </Link>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <Link
                                  href={`/product/${item.slug}`}
                                  onClick={onClose}
                                  className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                                >
                                  {item.productName}
                                </Link>
                                <p className="text-xs text-muted mt-0.5">{item.variantSize}</p>
                              </div>
                              <button
                                onClick={() => removeItem(item.variantSku)}
                                className="text-muted hover:text-destructive transition-colors cursor-pointer p-0.5"
                                aria-label={`Remove ${item.productName} from cart`}
                              >
                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => updateQuantity(item.variantSku, item.quantity - 1)}
                                  className="w-6 h-6 rounded flex items-center justify-center bg-background border border-border hover:bg-accent transition-colors cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" aria-hidden="true" />
                                </button>
                                <span className="text-sm font-medium w-6 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.variantSku, item.quantity + 1)}
                                  className="w-6 h-6 rounded flex items-center justify-center bg-background border border-border hover:bg-accent transition-colors cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" aria-hidden="true" />
                                </button>
                                <span className="text-xs text-muted ml-1">
                                  x {hasDiscount ? (
                                    <>
                                      <span className="line-through">{formatPriceShort(item.price)}</span>
                                      {" "}
                                      <span className="text-success font-semibold">{formatPriceShort(unitPrice)}</span>
                                    </>
                                  ) : (
                                    formatPriceShort(item.price)
                                  )}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-semibold text-foreground">
                                  {formatPriceShort(lineTotal)}
                                </span>
                                {hasDiscount && (
                                  <p className="text-[10px] text-success font-medium">
                                    -{activeTier.discountPercent}% applied
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Volume discount tiers */}
                        <div className="px-3 pb-3 pt-1">
                          <ul className="space-y-0.5">
                            {volumeTiers.map((tier) => {
                              const isActive = activeTier?.minQty === tier.qty;
                              return (
                                <li key={tier.qty} className={`flex items-center gap-1 text-[11px] ${isActive ? "text-success font-medium" : "text-muted"}`}>
                                  <span>{isActive ? "✓" : "•"}</span>
                                  <span>Buy <strong className={isActive ? "text-success" : "text-foreground"}>{tier.qty}+</strong> for <strong className={isActive ? "text-success" : "text-foreground"}>{formatPriceShort(tier.price)}</strong> each and <strong className="text-success">save {tier.discount}%</strong></span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pre-purchase upsells intentionally removed — product
                    suggestions live only in the post-purchase flow
                    (/checkout/callback → PostPurchaseUpsell) and as the
                    bump offer on the checkout page. Keep this file clean
                    of "you may also like" widgets. */}
              </>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-border p-4 space-y-3 bg-background">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Total:</span>
                <span className="text-xl font-bold text-foreground">{formatPriceShort(subtotal)}</span>
              </div>

              <a href="/checkout" onClick={onClose}>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
                  Secure Checkout
                </Button>
              </a>

              <Link
                href="/cart"
                onClick={onClose}
                className="block text-center text-sm font-medium text-primary hover:underline"
              >
                View cart
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
