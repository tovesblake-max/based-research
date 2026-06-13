"use client";

import { Product, ProductVariant, getRelatedProducts } from "@/lib/products";
import { getProductContent } from "@/lib/product-content";
import { getCategoryById } from "@/lib/categories";
import { getProductImagePath } from "@/lib/product-images";
import { formatPriceShort, cn } from "@/lib/utils";
import { useCart } from "@/components/CartProvider";
import { getVolumeTiersForPrice } from "@/lib/discounts";
import ProductCard from "@/components/ProductCard";
import Button from "@/components/Button";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  ChevronRight,
  FlaskConical,
  Minus,
  Plus,
  ShoppingBag,
  Shield,
  FileCheck,
  Thermometer,
  Truck,
  Clock,
  BadgeCheck,
  Microscope,
  Award,
  Info,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  ZoomIn,
  X,
  Sparkles,
} from "lucide-react";

import DeliveryTimeline from "@/components/DeliveryTimeline";
import { useTracking } from "@/components/TrackingProvider";
import { pushViewItem, pushAddToCart } from "@/lib/gtm-datalayer";
import { trackViewContent } from "@/lib/meta-pixel";
import { isInMetaCatalog } from "@/lib/meta-eligibility";
import InvestigationBanner from "@/components/InvestigationBanner";
import ProductCoaPanel from "@/components/ProductCoaPanel";
import CoaCard from "@/components/CoaCard";
import VolumeCalculator from "@/components/VolumeCalculator";
import BlendCrossSell, { getBlendsForProduct } from "@/components/BlendCrossSell";
import PaymentBadgeStrip from "@/components/PaymentBadgeStrip";
import { useCurrencySubscription } from "@/components/CurrencyProvider";

export default function ProductDetailClient({ product }: { product: Product }) {
  useCurrencySubscription(); // re-render on USD <-> COP toggle
  const category = getCategoryById(product.category);
  const related = getRelatedProducts(product);
  const content = getProductContent(product.id);
  const { addItem } = useCart();
  const { track } = useTracking();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]);
  const [quantity, setQuantity] = useState(1);
  // Click-to-zoom modal for the product image so customers can read
  // label details (lot, batch, mg breakdown). Closes on backdrop
  // click, X button, or Esc.
  const [imageZoomOpen, setImageZoomOpen] = useState(false);

  // Esc to close the zoom modal + lock body scroll while it's open
  useEffect(() => {
    if (!imageZoomOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImageZoomOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [imageZoomOpen]);
  const [added, setAdded] = useState(false);
  // All purchases are one-time. The Subscribe & Save option was removed
  // 2026-05-26 per merchant request — there's no subscribe path on the
  // product page anymore; smallest variant (variants[0]) is preselected
  // so visitors are one click (Add to Cart) from buying.
  const [showStickyBar, setShowStickyBar] = useState(false);
  const addToCartRef = useRef<HTMLButtonElement>(null);
  // Ship-estimate state removed — DeliveryTimeline owns its own ticking
  // clock and renders the date milestones directly.

  // Track ViewContent on product page load
  useEffect(() => {
    track({
      event: "ViewContent",
      productId: product.id,
      productName: product.name,
      value: product.variants[0].price,
      category: product.category,
    });
    // GTM view_item event for GA4 / Google Ads
    pushViewItem(product, product.variants[0]);
    // Meta Pixel + CAPI (deduped via shared eventID). Only fire for
    // products that exist in our Meta catalog — restricted GLP-1s and
    // upsellOnly accessories are deliberately excluded from the feed,
    // so firing for them would just rack up "catalog miss" events
    // and tank the catalog match rate dashboard metric.
    if (isInMetaCatalog(product.slug)) {
      trackViewContent({
        id: product.variants[0].sku,
        name: product.name,
        price: product.variants[0].price,
        category: product.category,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  useEffect(() => {
    const button = addToCartRef.current;
    if (!button) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  // While the sticky Add-to-Cart bar is mounted, lift any other
  // bottom-pinned UI (notably the SupportBubble) above it so the chat
  // button doesn't cover the Add to Cart CTA. SupportBubble reads
  // --sticky-cta-bottom-offset and pads its `bottom` accordingly.
  // 4.5rem ≈ 72px, which is the actual rendered height of the sticky
  // bar (py-3 + size="md" button).
  useEffect(() => {
    if (!showStickyBar) return;
    document.documentElement.style.setProperty("--sticky-cta-bottom-offset", "4.5rem");
    return () => {
      document.documentElement.style.removeProperty("--sticky-cta-bottom-offset");
    };
  }, [showStickyBar]);

  const handleAddToCart = () => {
    // Clamp before adding — the quantity input can transiently be 0
    // while the user is typing. If they hit Add to Cart in that
    // window without blurring first, treat it as 1.
    const safeQty = Math.max(1, Math.min(999, quantity));
    addItem(product, selectedVariant, safeQty);
    track({
      event: "AddToCart",
      productId: product.id,
      productName: product.name,
      value: selectedVariant.price * safeQty,
      quantity: safeQty,
      category: product.category,
    });
    pushAddToCart(product, selectedVariant, safeQty);
    // Snap the visible value back to the clamped one so the user
    // sees what was actually added.
    if (safeQty !== quantity) setQuantity(safeQty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const basePrice = selectedVariant.price;
  // Pass product slug so SKU-specific tiers (e.g. 40+/20% on BPC, GHK,
  // GIP3) appear in the discount-box ladder for those products only.
  const volumeTiers = getVolumeTiersForPrice(basePrice, product.slug);

  // Inline blend-discovery pills. Computed once per product slug —
  // returns every public blend this single peptide appears in (e.g.
  // BPC-157 → BPC+TB Blend AND Glow Blend). Empty list for products
  // not in any blend; the pill row is hidden in that case.
  const inlineBlendLinks = getBlendsForProduct(product.slug);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <Link href="/catalog" className="hover:text-foreground transition-colors">
          Shop
        </Link>
        {category && (
          <>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            <Link
              href={`/catalog?category=${category.id}`}
              className="hover:text-foreground transition-colors"
            >
              {category.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="text-foreground" aria-current="page">{product.name}</span>
      </nav>

      {/* Product Section */}
      {/* Mobile DOM/visual order: image → details (name/price/size/Add to Cart) → COA.
          Desktop layout reflows via explicit row/col placement so the COA still
          sits in the left column under the image, while the details column spans
          both rows on the right. The COA card is the rare element here (only
          shipped for products with a lot-specific report — GIP3, Glow Blend, etc.) —
          when product.coa is null we just have a 1-row grid with image + details. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6 mb-10">
        {/* ── Image + Trust Seals (col 1, row 1) ── */}
        <div className="lg:col-start-1 lg:row-start-1">
          <div className="relative bg-gradient-to-br from-accent via-background to-accent/50 rounded-2xl border border-border overflow-hidden" role="img" aria-label={`${product.name} product image`}>
            {/* Trust Seals — floating on image, left column */}
            <div className="absolute top-3 left-3 md:top-4 md:left-4 flex flex-col gap-2 md:gap-3 z-10">
              <TrustSeal icon={<Shield className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="Purity" sublabel="Guaranteed" />
              <TrustSeal icon={<Award className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="USA Lab" sublabel="Verified" />
              <TrustSeal icon={<Microscope className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="3rd Party" sublabel="Tested" />
              <TrustSeal icon={<BadgeCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="Advanced" sublabel="Analysis" />
            </div>

            {/* Badges — top right */}
            <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10">
              {product.badge && (
                <span className="bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md">
                  {product.badge}
                </span>
              )}
              <span className="bg-white text-foreground text-xs font-mono font-bold px-3 py-1.5 rounded-full border border-border shadow-sm">
                {product.purity}
              </span>
            </div>

            {/* Product image — click anywhere on the vial to open the
                zoom modal. The cursor + corner badge make the affordance
                obvious so customers know they can inspect the label. */}
            <button
              type="button"
              onClick={() => setImageZoomOpen(true)}
              className="w-full flex items-center justify-center py-8 md:py-16 px-8 md:px-16 cursor-zoom-in group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
              aria-label={`Zoom in on ${product.name} vial`}
            >
              <div className="relative w-48 h-48 md:w-64 md:h-64">
                <Image
                  src={getProductImagePath(product.slug)}
                  alt={`${product.name} — ${product.purity} purity, ${product.form}`}
                  fill
                  sizes="(max-width: 768px) 192px, 256px"
                  className="object-contain drop-shadow-lg group-hover:scale-[1.03] transition-transform duration-300"
                  priority
                />
                {/* Zoom hint pill — fades in on image hover */}
                <span className="absolute bottom-1 right-1 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-foreground/85 text-background text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm pointer-events-none">
                  <ZoomIn className="w-3 h-3" aria-hidden="true" />
                  Click to zoom
                </span>
              </div>
            </button>

            {/* Specs overlay — bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/95 via-white/80 to-transparent pt-10 pb-4 px-5">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                <div>
                  <span className="text-muted">Purity</span>
                  <p className="font-mono font-bold text-foreground">{product.purity}</p>
                </div>
                {product.cas && (
                  <div>
                    <span className="text-muted">CAS Number</span>
                    <p className="font-mono font-bold text-foreground">{product.cas}</p>
                  </div>
                )}
                {product.molecularWeight && (
                  <div>
                    <span className="text-muted">Molar Mass</span>
                    <p className="font-mono font-bold text-foreground">{product.molecularWeight}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Blend cross-sell card — directly under the product image
              on desktop. Surfaces a "researchers studying X often
              combine" stack with side-by-side singles-vs-blend pricing
              + an Add-to-Cart button. Component returns null for
              products that don't map to any blend, so non-blend
              products still get the clean image-only left column. */}
          <BlendCrossSell product={product} />
        </div>

        {/* ── Details (col 2, spans rows 1+2 on desktop; renders second on mobile) ── */}
        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
          {category && (
            <span className="text-xs font-medium uppercase tracking-wider text-primary">
              {category.name}
            </span>
          )}

          <h1 className="font-serif text-3xl md:text-4xl text-foreground mt-1">
            {product.name}
          </h1>

          {/* Composition — for blends, show the per-component mg
              breakdown immediately under the title. Most blend
              questions ("how many mg of GHK?") get answered before
              the customer has to read further. Single-compound
              products skip this block. */}
          {product.composition && product.composition.length > 0 && (
            <div className="mt-3 inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                What&apos;s in the vial:
              </span>
              {product.composition.map((c, idx) => (
                <span
                  key={c.name}
                  className="inline-flex items-center gap-1"
                >
                  <span className="font-mono font-semibold text-foreground">
                    {c.amount}
                  </span>
                  <span className="text-foreground">{c.name}</span>
                  {idx < product.composition!.length - 1 && (
                    <span className="text-muted/60 mx-0.5">+</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="mt-4">
            <span className="text-3xl font-bold text-foreground">
              {formatPriceShort(selectedVariant.price)}
            </span>
          </div>

          {/* Description */}
          <p className="text-muted mt-3 leading-relaxed text-sm">{product.description}</p>

          {/* Banner pointing at the on-site /research/<slug> investigation
              page when one exists for this product. Renders nothing for
              products without a paired research piece. Placed directly
              under the short description so it's the first prominent
              non-pricing CTA — credibility scaffolding before "add to
              cart" — for the small set of products where we've invested
              in long-form editorial content. */}
          <InvestigationBanner productSlug={product.slug} />

          {/* Inline blend-discovery pills.
              For singles that appear in one or more public blends, surface
              a one-tap navigation pill PER blend (e.g. BPC-157 shows pills
              for both the BPC+TB Blend and the Glow Blend; Ipamorelin
              shows CJC+Ipa and Tesa+Ipa). Sits high on the page so
              browsers see the alternative before the Add-to-Cart commit.
              The full math/savings card lives lower on the page via
              <BlendCrossSell />. */}
          {inlineBlendLinks.length > 0 && (
            <div
              className="mt-4 flex flex-wrap gap-2"
              aria-label="Related blends containing this product"
            >
              {inlineBlendLinks.map((b) => (
                <Link
                  key={b.slug}
                  href={`/product/${b.slug}`}
                  className="group inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 transition-colors text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>Looking for the {b.name}?</span>
                  <ArrowRight
                    className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          )}

          {/* Interactive volume calculator. Replaces the old static tier
              list. Two-way binds quantity with the Add-to-Cart input below
              so dragging the slider updates the quantity stepper too.
              Hidden for accessories (fridge, swabs) — they don't have
              volume tiers. */}
          {product.category !== "accessories" && volumeTiers.length > 0 && (
            <VolumeCalculator
              basePrice={selectedVariant.price}
              slug={product.slug}
              tiers={volumeTiers}
              quantity={quantity}
              onQuantityChange={setQuantity}
            />
          )}

          {/* Variant Selector */}
          {product.variants.length > 1 && (
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-foreground mb-2">
                Size:
              </legend>
              <div className="flex gap-2" role="radiogroup">
                {product.variants.map((variant) => (
                  <button
                    key={variant.sku}
                    onClick={() => setSelectedVariant(variant)}
                    role="radio"
                    aria-checked={selectedVariant.sku === variant.sku}
                    className={cn(
                      "px-5 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer",
                      selectedVariant.sku === variant.sku
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                        : "border-border text-muted hover:border-border-strong hover:text-foreground"
                    )}
                  >
                    {variant.size}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-3 mt-6">
            <div className="flex items-center border border-border rounded-lg bg-background overflow-hidden" role="group" aria-label="Quantity">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-12 flex items-center justify-center hover:bg-accent transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              {/* Direct typing for bulk orders — no need to click + 60
                  times for 60 vials. Editable while focused; on blur
                  we clamp to [1, 999] (999 is a soft ceiling — over
                  that, customer should reach out for a wholesale quote
                  via /wholesale/apply, not buy retail). */}
              <input
                type="text"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => {
                  // Strip non-digits live so a paste like "5x" or "12 vials"
                  // resolves to "5" or "12" cleanly.
                  const digits = e.target.value.replace(/\D/g, "");
                  if (digits === "") {
                    // Allow temporary empty value while typing; we
                    // restore to 1 on blur if the user walks away.
                    setQuantity(0);
                    return;
                  }
                  const n = parseInt(digits, 10);
                  setQuantity(Math.min(999, Math.max(0, n)));
                }}
                onBlur={(e) => {
                  // Clamp on blur so the field never settles on 0 / empty.
                  const n = parseInt(e.target.value, 10);
                  setQuantity(Number.isFinite(n) && n >= 1 ? Math.min(999, n) : 1);
                }}
                onFocus={(e) => e.target.select()}
                className="w-14 h-12 text-center text-sm font-semibold border-x border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background tabular-nums"
                aria-label="Quantity"
                maxLength={3}
              />
              <button
                type="button"
                onClick={() => setQuantity(Math.min(999, quantity + 1))}
                className="w-11 h-12 flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <Button
              ref={addToCartRef}
              variant="primary"
              size="lg"
              className={cn(
                "flex-1 h-12 text-base",
                added && "bg-success hover:bg-success"
              )}
              onClick={handleAddToCart}
            >
              <ShoppingBag className="w-5 h-5 mr-2" aria-hidden="true" />
              {added ? "Added to Cart!" : "Add to Cart"}
            </Button>
          </div>

          {/* Payment-method visibility — sits at peak commit attention,
              right under the Add-to-Cart button. Pre-answers the
              implicit "can I actually pay with my card?" question that
              dominates research-compound buyer hesitation (most
              competitors are crypto-only or manual-invoice). The icons
              do the heavy lifting; copy is intentionally matter-of-fact. */}
          <div className="mt-4">
            <PaymentBadgeStrip />
          </div>

          {/* Delivery Timeline — visual milestones with concrete dates.
              Replaces the prior 3-line "Ships X / Free shipping / Tested"
              copy block. Free-shipping note + tested badge moved below
              the timeline so they stay visible without competing with
              the dated milestones. */}
          <div className="mt-5">
            <DeliveryTimeline />
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm text-muted">
                  <strong className="text-foreground">Free</strong> US shipping on orders over $200, with tracking provided.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <BadgeCheck className="w-4 h-4 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm text-foreground font-medium">
                  Third-party tested
                </p>
              </div>
            </div>
          </div>

          {/* Research disclaimer + institutional eligibility (right column) */}
          <div className="p-3.5 bg-accent rounded-xl border border-border mt-5">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-xs font-semibold text-muted leading-relaxed">
                For laboratory research use only. Not for human or veterinary use. Not for diagnostic or therapeutic use.
              </span>
            </div>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Supplied to qualified labs and institutional buyers.{" "}
              <Link href="/institutional-use" className="text-primary font-medium hover:underline">
                Institutional use &amp; buyer eligibility
              </Link>
            </p>
          </div>

          {/* Mobile podcast CTA removed alongside desktop version. */}

        </div>

        {/* ── Lot-specific COA (col 1, row 2 on desktop; renders LAST on mobile,
            after the Add to Cart sticky-bar / details column) ── */}
        {product.coa && (
          <div className="lg:col-start-1 lg:row-start-2">
            <CoaCard product={product} coa={product.coa} />
          </div>
        )}
      </div>

      {/* ── Section Navigation ── */}
      {content && (
        <nav className="sticky top-[64px] z-20 bg-background/95 backdrop-blur-sm border-y border-border mt-6 -mx-4 px-4 overflow-x-auto">
          <div className="max-w-6xl mx-auto flex items-center gap-6 py-3 min-w-max">
            {[
              { id: "characteristics", label: "Characteristics" },
              { id: "research-use", label: `How is ${product.name} Used in Research?` },
              { id: "areas-of-study", label: "Areas of Study" },
              ...(product.category !== "accessories" ? [{ id: "references", label: "References" }] : []),
              // Hide the COA anchor when the lot-specific card lives in the
              // image column (it's already in-view on desktop, so a sticky
              // jump-link would scroll the user backwards).
              ...(!product.coa
                ? [{ id: "coa-section", label: "Certificate of Analysis (COA)" }]
                : []),
            ].map((nav) => (
              <a
                key={nav.id}
                href={`#${nav.id}`}
                className="text-sm font-medium text-muted hover:text-primary transition-colors whitespace-nowrap"
              >
                {nav.label}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* ── Full Content Sections (Power Peptides style) ── */}
      {content ? (
        <div className="mt-10 space-y-16 mb-16">
          {/* Characteristics Table */}
          <section id="characteristics" className="scroll-mt-28">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6">
              Characteristics
            </h2>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <caption className="sr-only">Characteristics of {product.name}</caption>
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Property</th>
                    <th scope="col">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {content.characteristics.map((char, i) => (
                    <tr key={char.label} className={cn("border-b border-border last:border-0", i % 2 === 0 ? "bg-accent/30" : "bg-card")}>
                      <th scope="row" className="text-sm text-muted font-medium py-3.5 px-5 text-left w-1/3">{char.label}</th>
                      <td className="text-sm text-foreground font-mono py-3.5 px-5">{char.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* How is [Product] Used in Research? */}
          <section id="research-use" className="scroll-mt-28">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6">
              How is {product.name} Used in Research?
            </h2>
            <div className="prose prose-sm max-w-none">
              {content.researchSummary.split("\n\n").map((paragraph, i) => (
                <p key={i} className="text-muted leading-relaxed mb-4">{paragraph}</p>
              ))}
            </div>
            <div className="mt-6 p-4 bg-accent/50 rounded-lg border border-border">
              <p className="text-xs text-muted">
                This product is supplied in a <strong className="text-foreground">lyophilized form</strong> and
                requires <strong className="text-foreground">reconstitution</strong> prior to laboratory handling.
                For <strong className="text-foreground">research and laboratory use only.
                Not for human or veterinary consumption</strong>.
              </p>
            </div>
          </section>

          {/* Areas of Study */}
          <section id="areas-of-study" className="scroll-mt-28">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6">
              Areas of Study
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {content.areasOfStudy.map((area) => (
                <div key={area.title} className="bg-card rounded-xl border border-border p-5 hover:border-secondary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FlaskConical className="w-4 h-4 text-secondary" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">{area.title}</h3>
                      <p className="text-xs text-muted leading-relaxed">{area.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* References (hide for accessories) */}
          {product.category !== "accessories" && (
          <section id="references" className="scroll-mt-28">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6">
              References
            </h2>
            <div className="bg-card rounded-xl border border-border p-6">
              <ol className="space-y-3">
                {content.references.map((ref) => (
                  <li key={ref.id} className="flex gap-3 text-sm">
                    <span className="text-primary font-bold font-mono flex-shrink-0">[{ref.id}]</span>
                    <span className="text-muted leading-relaxed">{ref.text}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 pt-4 border-t border-border">
                <p className="text-xs text-muted">
                  <strong className="text-foreground">Disclaimer:</strong> The information provided is for research reference only and does not constitute medical advice. Products are sold strictly for in-vitro research use.
                </p>
              </div>
            </div>
          </section>
          )}

          {/* Certificate of Analysis — fallback for products without a
              lot-specific COA. When `product.coa` is set, the full
              CoaCard renders up in the left column under the image
              (avoiding duplicate cards on the page). */}
          {!product.coa && (
            <section id="coa-section" className="scroll-mt-28">
              <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6">
                Certificate of Analysis (COA)
              </h2>
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex flex-col sm:flex-row items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-7 h-7 text-primary" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Third-Party Verified Quality</h3>
                    <p className="text-sm text-muted leading-relaxed mb-4">
                      Every batch of {product.name} is independently tested by an A2LA-accredited (ISO 17025:2017) third-party laboratory using HPLC-UV/VIS for purity and measured quantity. Each COA carries the lab&apos;s signed report and a batch-specific lot number. We publish these results publicly so you can verify exactly what you&apos;re getting.
                    </p>
                    <Link
                      href="/coa"
                      className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:gap-2.5 transition-all"
                    >
                      View Lab Results <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>
      ) : (
        /* Fallback for products without extended content */
        <div className="max-w-3xl mb-16 mt-10">
          <h2 className="font-serif text-2xl text-foreground mb-4">About {product.name}</h2>
          <p className="text-muted leading-relaxed mb-6">{product.longDescription}</p>
          <table className="w-full mb-6">
            <caption className="sr-only">Product specifications for {product.name}</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Property</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              <SpecRow label="Product Name" value={product.name} />
              <SpecRow label="Form" value={product.form} />
              <SpecRow label="Appearance" value={product.appearance} />
              <SpecRow label="Purity" value={product.purity} />
              {product.cas && <SpecRow label="CAS Number" value={product.cas} />}
              {product.molecularWeight && <SpecRow label="Molecular Weight" value={product.molecularWeight} />}
              {product.sequence && <SpecRow label="Sequence" value={product.sequence} />}
              <SpecRow label="Storage" value={product.storage} />
            </tbody>
          </table>
          <div className="p-4 bg-accent/50 rounded-lg border border-border">
            <p className="text-xs text-muted">
              <strong className="text-foreground">Disclaimer:</strong> The information provided is for research reference only and does not constitute medical advice. Products are sold strictly for in-vitro research use.
            </p>
          </div>
        </div>
      )}

      {/* Lab Results — dynamic COA panel. Renders nothing if there are
          no active uploads for this product, so the page doesn't show an
          empty-state on products without lab work yet. Admin uploads via
          the Lab COAs tab populate this section automatically. */}
      <ProductCoaPanel slug={product.slug} />

      {/* Related Research block removed 2026-05-21 — it cross-linked to
          external blog.basedresearch.com articles with human-applicable
          framing (metabolic / satiety / GH), which doesn't fit the
          research-use-only compliance posture. */}

      {/* Blend cross-sell USED to live here (below the description /
          tabs). Moved 2026-05-07 to sit directly under the product
          image in the left column of the hero grid — it earns far more
          clicks when surfaced before the customer commits to scrolling
          past Add-to-Cart. */}

      {related.length > 0 && (
        <section aria-label="Related products">
          <h2 className="font-serif text-2xl text-foreground mb-6">
            Related Products
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Frequently Bought Together — desktop / tablet only.
          Hidden below the `md` breakpoint (≥768px) because the FBT
          card stacks vertically on mobile (three product tiles +
          bundle-total card + Add All button) and ate too much
          screen real estate above the relevant content. The blend
          cross-sell card under the product image already covers the
          "researchers-also-buy" surface for mobile users. */}
      {related.length >= 2 && (
        <section aria-label="Frequently bought together" className="hidden md:block mt-12">
          <h2 className="font-serif text-2xl text-foreground mb-6">
            Frequently Bought Together
          </h2>
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {/* Current product */}
              <div className="text-center min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                <p className="text-xs text-muted">{product.variants[0].size}</p>
                <p className="text-sm font-bold text-foreground mt-1">{formatPriceShort(product.variants[0].price)}</p>
              </div>

              <span className="text-xl font-bold text-muted" aria-hidden="true">+</span>

              {/* Related product 1 */}
              <div className="text-center min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{related[0].name}</p>
                <p className="text-xs text-muted">{related[0].variants[0].size}</p>
                <p className="text-sm font-bold text-foreground mt-1">{formatPriceShort(related[0].variants[0].price)}</p>
              </div>

              <span className="text-xl font-bold text-muted" aria-hidden="true">+</span>

              {/* Related product 2 */}
              <div className="text-center min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{related[1].name}</p>
                <p className="text-xs text-muted">{related[1].variants[0].size}</p>
                <p className="text-sm font-bold text-foreground mt-1">{formatPriceShort(related[1].variants[0].price)}</p>
              </div>

              <div className="sm:ml-auto flex flex-col items-center gap-1">
                <p className="text-xs text-muted">Bundle total</p>
                <p className="text-lg font-bold text-foreground">
                  {formatPriceShort(product.variants[0].price + related[0].variants[0].price + related[1].variants[0].price)}
                </p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    addItem(product, product.variants[0], 1);
                    addItem(related[0], related[0].variants[0], 1);
                    addItem(related[1], related[1].variants[0], 1);
                  }}
                >
                  <ShoppingBag className="w-4 h-4 mr-2" aria-hidden="true" />
                  Add All to Cart
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sticky Add to Cart Bar */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
              <p className="text-sm font-bold text-foreground">{formatPriceShort(selectedVariant.price)}</p>
            </div>
            <Button
              variant="primary"
              size="md"
              className={cn(
                "flex-shrink-0",
                added && "bg-success hover:bg-success"
              )}
              onClick={handleAddToCart}
            >
              <ShoppingBag className="w-4 h-4 mr-2" aria-hidden="true" />
              {added ? "Added!" : "Add to Cart"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Zoom modal ── */}
      {imageZoomOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} zoomed image`}
          onClick={() => setImageZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setImageZoomOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            aria-label="Close zoom"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
          <div
            className="relative w-full max-w-3xl aspect-square"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={getProductImagePath(product.slug)}
              alt={`${product.name} — ${product.purity} purity, ${product.form}, large preview`}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-contain"
              priority
            />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs flex items-center gap-2">
            <span className="font-mono uppercase tracking-wider">Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Trust Seal Badge ── */
function TrustSeal({ icon, label, sublabel }: { icon: React.ReactNode; label: string; sublabel: string }) {
  return (
    <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white border-2 border-secondary/25 flex flex-col items-center justify-center shadow-sm" aria-label={`${label} ${sublabel}`}>
      <div className="text-secondary">{icon}</div>
      <span className="text-[5px] md:text-[6px] font-bold uppercase tracking-wider text-secondary/80 leading-none mt-0.5">{label}</span>
      <span className="text-[4px] md:text-[5px] font-semibold uppercase tracking-wider text-muted leading-none">{sublabel}</span>
    </div>
  );
}

/* ── Spec Table Row ── */
function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border">
      <th scope="row" className="text-sm text-muted font-normal py-3 text-left pr-8">{label}</th>
      <td className="text-sm font-medium text-foreground font-mono py-3 text-right">{value}</td>
    </tr>
  );
}
