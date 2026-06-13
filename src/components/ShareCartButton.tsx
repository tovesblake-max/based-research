"use client";

import { useState } from "react";
import { Share2, Check, Loader2, Copy, X } from "lucide-react";
import { useCart } from "@/components/CartProvider";

/**
 * Customer-facing "Save & share this cart" button + modal.
 *
 * Saves the current cart to /api/cart/share (which inserts into the
 * existing shared_carts table) and returns a short URL the customer
 * can copy / native-share / SMS to a friend. Opening the URL in any
 * browser hits CartContent's existing `?share=SLUG` handler and
 * restores the items into that visitor's local cart.
 *
 * Doubles as a wishlist: the customer can save their own cart, walk
 * away, and come back to the URL later. For signed-in users the
 * server stamps `createdBy` so the cart is recoverable from their
 * account history (admin / future "my saved carts" view can list).
 *
 * Native share (Web Share API) is preferred on mobile since it opens
 * the OS share sheet (iMessage, WhatsApp, Mail, etc.). Desktop falls
 * back to the in-modal copy button.
 */
export default function ShareCartButton() {
  const { items } = useCart();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = items.length === 0;

  const onClick = async () => {
    if (disabled) return;
    setOpen(true);
    if (shareUrl) return; // already generated this session — modal just re-opens
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cart/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            slug: i.slug,
            variantSku: i.variantSku,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to save cart");
      }
      setShareUrl(data.url);
    } catch (err) {
      setError((err as Error).message || "Failed to save cart");
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be locked — fall back to user manually selecting */
    }
  };

  // Web Share API — opens the OS share sheet on mobile (iMessage,
  // WhatsApp, Mail, Twitter, etc.). Desktop browsers without the API
  // fall back to the inline copy button. Wrap the share() call in a
  // user-gesture context (button click) so the prompt is allowed.
  const onNativeShare = async () => {
    if (!shareUrl || typeof navigator.share !== "function") return;
    try {
      await navigator.share({
        title: "My Based Research cart",
        text: "Check out this research-peptide cart I built on Based Research:",
        url: shareUrl,
      });
    } catch {
      /* user cancelled — no-op */
    }
  };

  const close = () => {
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary mt-3 py-2.5 rounded-lg border border-primary/20 hover:bg-primary/5 transition-all w-full disabled:opacity-50 disabled:cursor-not-allowed"
        title={disabled ? "Add items to cart first" : "Save and share this cart with someone (or save it for later)"}
      >
        <Share2 className="w-4 h-4" aria-hidden="true" />
        Save &amp; share this cart
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label="Share your cart"
          onClick={close}
        >
          <div
            className="relative w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted hover:text-foreground cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <Share2 className="w-5 h-5" aria-hidden="true" />
              </div>

              <h2 className="font-serif text-xl text-foreground text-center mb-2">
                Your cart, saved
              </h2>
              <p className="text-sm text-muted text-center mb-5 leading-relaxed">
                Send this link to a friend, or bookmark it to come back to
                this exact cart later.
              </p>

              {loading && (
                <div className="flex items-center justify-center py-8 text-muted">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving cart...
                </div>
              )}

              {error && !loading && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                  {error}
                </div>
              )}

              {shareUrl && !loading && (
                <div className="space-y-3">
                  <div className="flex items-stretch gap-2 bg-accent rounded-lg p-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 bg-transparent border-0 outline-none text-xs font-mono text-foreground px-2 select-all"
                      aria-label="Shareable cart URL"
                    />
                    <button
                      type="button"
                      onClick={onCopy}
                      className={`inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        copied
                          ? "bg-success text-white"
                          : "bg-primary text-primary-foreground hover:bg-primary-light"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  {typeof navigator !== "undefined" &&
                    typeof navigator.share === "function" && (
                      <button
                        type="button"
                        onClick={onNativeShare}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-card border border-border hover:border-border-strong text-foreground cursor-pointer transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        Share via...
                      </button>
                    )}

                  <p className="text-[11px] text-muted text-center pt-2">
                    Anyone who opens this link will see the same items in their
                    cart, ready to check out. The link does not expire.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
