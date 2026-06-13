"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product, getStartingPrice } from "@/lib/products";
import { formatPriceShort } from "@/lib/utils";
import { useCurrencySubscription } from "@/components/CurrencyProvider";
import { getCategoryById } from "@/lib/categories";
import { getProductImagePath } from "@/lib/product-images";
import { ArrowRight, ShoppingBag, Lock } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { IS_OPEN_MODE } from "@/lib/site-mode";

// Promotional/retail badges suppressed from the catalog to keep a
// procurement tone (the data still carries them for internal use).
const PROMO_BADGES = new Set(["best seller", "bestseller", "popular", "best value"]);

interface ProductCardProps {
  product: Product;
  // When true, the card renders blurred behind an institutional-access
  // gate instead of linking to the product. Used for restricted SKUs
  // shown to logged-out visitors (e.g. GIP3) to drive account creation.
  locked?: boolean;
}

export default function ProductCard({ product, locked = false }: ProductCardProps) {
  // Subscribe to display currency so prices re-render when the
  // header toggle flips USD <-> COP. Hook returns nothing; the
  // subscription is the side-effect.
  useCurrencySubscription();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const category = getCategoryById(product.category);
  const startingPrice = getStartingPrice(product);
  const hasMultipleVariants = product.variants.length > 1;

  // Gated SKU shown to logged-out visitors: blur the product behind a
  // frosted overlay with a clear "create an account" CTA. Not a Link —
  // the card must not navigate to the (still-gated) product page.
  if (locked) {
    return (
      <div className="relative block bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Blurred preview — purely decorative, hidden from a11y tree */}
        <div className="blur-[7px] scale-105 pointer-events-none select-none" aria-hidden="true">
          <div className="relative aspect-square bg-gradient-to-br from-accent to-background overflow-hidden">
            <Image
              src={getProductImagePath(product.slug)}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          </div>
          <div className="p-4">
            <h3 className="font-serif text-lg text-foreground mt-1">{product.name}</h3>
            <p className="text-xs text-muted mt-1.5 line-clamp-2 leading-relaxed">{product.description}</p>
            <div className="mt-4 pt-3 border-t border-border">
              <span className="text-base font-semibold text-foreground">{formatPriceShort(startingPrice)}</span>
            </div>
          </div>
        </div>

        {/* Frosted access gate */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-3 px-4 bg-card/55 backdrop-blur-[2px]">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          <p className="text-xs text-muted leading-relaxed max-w-[15rem]">
            This product is available to verified institutions only.
          </p>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-primary-light transition-colors shadow-sm"
          >
            Create an account to see full catalog
          </Link>
          <span className="text-[10px] uppercase tracking-wider text-muted/80">Register your institution</span>
        </div>
      </div>
    );
  }

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, product.variants[0], 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block bg-card rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-lg hover:border-border-strong focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none transition-all duration-300"
      aria-label={`${product.name} — ${product.purity} purity, from ${formatPriceShort(startingPrice)}`}
    >
      {/* Product Image */}
      <div className="relative aspect-square bg-gradient-to-br from-accent to-background overflow-hidden">
        <Image
          src={getProductImagePath(product.slug)}
          alt={`${product.name} — ${product.purity} purity, ${product.form}`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badge — promotional/retail badges (Best Seller, Popular, Best
            Value) are suppressed to keep the catalog procurement-toned;
            only non-promotional badges render. */}
        {product.badge && (IS_OPEN_MODE || !PROMO_BADGES.has(product.badge.toLowerCase())) && (
          <span className="absolute top-3 left-3 bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            {product.badge}
          </span>
        )}

        {/* Add-to-order overlay */}
        <button
          onClick={handleQuickAdd}
          className="absolute bottom-3 left-3 right-3 bg-primary text-primary-foreground text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 hover:bg-primary-light transition-all shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer"
        >
          {added ? (
            "Added!"
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
              {IS_OPEN_MODE ? "Quick Add" : "Add to Order"}
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        {category && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-primary">
            {category.name}
          </span>
        )}

        {/* Name + size */}
        <h3 className="font-serif text-lg text-foreground mt-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        {/* Size indicator — essential context for research buyers comparing
            across vendors. Shows a single size ("10mg") for single-variant
            products and a range ("5mg – 10mg") when multiple sizes exist. */}
        <p className="text-[11px] text-muted/90 mt-0.5 font-mono uppercase tracking-wider">
          {hasMultipleVariants
            ? `${product.variants[0].size} – ${product.variants[product.variants.length - 1].size}`
            : product.variants[0].size}
        </p>

        {/* Description */}
        <p className="text-xs text-muted mt-1.5 line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <div>
            {hasMultipleVariants && (
              <span className="text-[10px] text-muted">From </span>
            )}
            <span className="text-base font-semibold text-foreground">
              {formatPriceShort(startingPrice)}
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            View Details <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
