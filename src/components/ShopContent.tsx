"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { catalogProducts, getStartingPrice, getPriceRange, getAvailableForms, getAvailableTags } from "@/lib/products";
import { categories } from "@/lib/categories";
import { getCategoryHero } from "@/lib/category-content";
import { formatPriceShort } from "@/lib/utils";
import { useCart } from "@/components/CartProvider";
import { useCurrencySubscription } from "@/components/CurrencyProvider";
import { useAuth } from "@/components/AuthProvider";
import { IS_OPEN_MODE } from "@/lib/site-mode";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { ChevronDown, ChevronUp, SlidersHorizontal, X, CheckCircle, FlaskConical, Building2 } from "lucide-react";

// SKUs gated behind institutional account creation when viewed logged-out.
// The card renders blurred with a "create an account" CTA instead of a link.
const GATED_SLUGS = new Set<string>(["glp3-rta"]);

type SortOption = "best-sellers" | "name" | "price-low" | "price-high";

const priceRangeData = getPriceRange();
const availableForms = getAvailableForms();
const availableTags = getAvailableTags();

function FilterSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-4 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left cursor-pointer"
        aria-expanded={open}
      >
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {open ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default function ShopContent() {
  useCurrencySubscription(); // re-render on USD <-> COP toggle
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  // Gate restricted SKUs only in institutional mode, and only once we know
  // the visitor is logged-out. Open mode never gates (all products visible);
  // while auth resolves we don't lock, so a logged-in researcher never sees
  // a flash of the gate.
  const gateRestricted = !IS_OPEN_MODE && !authLoading && !user;
  const initialCategory = searchParams.get("category") || "all";

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<SortOption>("best-sellers");
  const [priceMin, setPriceMin] = useState(priceRangeData.min);
  const [priceMax, setPriceMax] = useState(priceRangeData.max);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const toggleForm = useCallback((form: string) => {
    setSelectedForms((prev) =>
      prev.includes(form) ? prev.filter((f) => f !== form) : [...prev, form]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategory("all");
    setPriceMin(priceRangeData.min);
    setPriceMax(priceRangeData.max);
    setSelectedTags([]);
    setSelectedForms([]);
  }, []);

  const hasActiveFilters = selectedCategory !== "all" || selectedTags.length > 0 || selectedForms.length > 0 || priceMin !== priceRangeData.min || priceMax !== priceRangeData.max;

  const filteredProducts = useMemo(() => {
    let filtered = [...catalogProducts];

    // Category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Price range
    filtered = filtered.filter((p) => {
      const price = getStartingPrice(p);
      return price >= priceMin && price <= priceMax;
    });

    // Tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((p) =>
        selectedTags.some((tag) => p.tags?.includes(tag))
      );
    }

    // Form
    if (selectedForms.length > 0) {
      filtered = filtered.filter((p) => selectedForms.includes(p.form));
    }

    // Pinned top slots — product IDs listed here appear at the very top
    // of the default "best-sellers" sort (and only that sort), in list
    // order. Used to guarantee flagship SKUs get first-viewport real
    // estate regardless of what `featured` flags drift to over time.
    //
    // Layout intent (lg = 3-col, xl = 4-col):
    //   Row 1: glp3-rta · bpc-157 · glow-blend [· tb-500 @ xl]
    //   Row 2: tb-500 @ lg / ghk-cu @ xl, ghk-cu, tesamorelin, mots-c, ...
    // Glow Blend pinned to slot #3 (2026-05-05) — premium SKU that
    // anchors first-viewport revenue at the new $200 price point.
    const PINNED_TOP_IDS = [
      "glp3-rta",
      "bpc-157",
      "glow-blend",
      "tb-500",
      "ghk-cu",
      "tesamorelin",
      "mots-c",
    ];

    // Sort
    switch (sortBy) {
      case "best-sellers":
        filtered.sort((a, b) => {
          const aPin = PINNED_TOP_IDS.indexOf(a.id);
          const bPin = PINNED_TOP_IDS.indexOf(b.id);
          if (aPin !== -1 || bPin !== -1) {
            // Both pinned → preserve pin-list order
            // Only a pinned → a first
            // Only b pinned → b first
            if (aPin === -1) return 1;
            if (bPin === -1) return -1;
            return aPin - bPin;
          }
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return 0;
        });
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "price-low":
        filtered.sort((a, b) => getStartingPrice(a) - getStartingPrice(b));
        break;
      case "price-high":
        filtered.sort((a, b) => getStartingPrice(b) - getStartingPrice(a));
        break;
    }

    return filtered;
  }, [selectedCategory, sortBy, priceMin, priceMax, selectedTags, selectedForms]);

  const formCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of catalogProducts) {
      counts.set(p.form, (counts.get(p.form) ?? 0) + 1);
    }
    return counts;
  }, []);

  const filterSidebar = (
    <div className="space-y-0">
      {/* Price Range */}
      <FilterSection title="Price Range">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-background border border-border rounded-lg px-2 py-1.5 flex-1">
              <span className="text-xs text-muted">$</span>
              <input
                type="number"
                value={Math.round(priceMin / 100)}
                onChange={(e) => setPriceMin(Number(e.target.value) * 100)}
                className="w-full text-sm bg-transparent outline-none text-foreground"
                min={Math.round(priceRangeData.min / 100)}
                max={Math.round(priceRangeData.max / 100)}
                aria-label="Minimum price"
              />
            </div>
            <span className="text-muted text-sm">—</span>
            <div className="flex items-center gap-1 bg-background border border-border rounded-lg px-2 py-1.5 flex-1">
              <span className="text-xs text-muted">$</span>
              <input
                type="number"
                value={Math.round(priceMax / 100)}
                onChange={(e) => setPriceMax(Number(e.target.value) * 100)}
                className="w-full text-sm bg-transparent outline-none text-foreground"
                min={Math.round(priceRangeData.min / 100)}
                max={Math.round(priceRangeData.max / 100)}
                aria-label="Maximum price"
              />
            </div>
          </div>
          <input
            type="range"
            min={priceRangeData.min}
            max={priceRangeData.max}
            value={priceMax}
            onChange={(e) => setPriceMax(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Price range slider"
          />
        </div>
      </FilterSection>

      {/* Category */}
      <FilterSection title="Research Categories">
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={selectedCategory === "all"}
              onChange={() => setSelectedCategory("all")}
              className="w-4 h-4 rounded border-border text-primary accent-primary"
            />
            <span className="text-sm text-foreground group-hover:text-primary transition-colors">All Categories</span>
          </label>
          {categories.map((cat) => {
            const count = catalogProducts.filter((p) => p.category === cat.id).length;
            return (
              <label key={cat.id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedCategory === cat.id}
                  onChange={() => setSelectedCategory(selectedCategory === cat.id ? "all" : cat.id)}
                  className="w-4 h-4 rounded border-border text-primary accent-primary"
                />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                  {cat.name} <span className="text-muted">({count})</span>
                </span>
              </label>
            );
          })}
        </div>
      </FilterSection>

      {/* Tags */}
      <FilterSection title="Tags">
        <div className="space-y-1.5">
          {availableTags.map(({ tag, count }) => (
            <label key={tag} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedTags.includes(tag)}
                onChange={() => toggleTag(tag)}
                className="w-4 h-4 rounded border-border text-primary accent-primary"
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                {tag} <span className="text-muted">({count})</span>
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Form */}
      <FilterSection title="Form">
        <div className="space-y-1.5">
          {availableForms.map((form) => (
            <label key={form} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedForms.includes(form)}
                onChange={() => toggleForm(form)}
                className="w-4 h-4 rounded border-border text-primary accent-primary"
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                {form} <span className="text-muted">({formCounts.get(form) ?? 0})</span>
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="text-sm text-primary hover:underline cursor-pointer"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  const categoryHero = selectedCategory !== "all" ? getCategoryHero(selectedCategory) : null;

  return (
    <div>
      {/* Category Hero */}
      {categoryHero && (
        <section className="bg-gradient-to-br from-accent to-background border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-12 md:py-16">
            <p className="text-sm font-medium text-primary mb-2">Buy Online</p>
            <h1 className="font-serif text-3xl md:text-5xl text-foreground mb-8">
              {categoryHero.title}
            </h1>
            <ul className="space-y-4 max-w-2xl">
              {categoryHero.bullets.map((bullet, i) => (
                <li key={i} className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-sm md:text-base text-foreground/80 leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

    <div className="max-w-[1400px] mx-auto px-4 py-12">
      {/* Header (show only when no category hero) */}
      {!categoryHero && (
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-5xl text-foreground">Research Materials Catalog</h1>
        <p className="text-muted mt-2">
          {IS_OPEN_MODE
            ? "A2LA-accredited, HPLC-verified research reference materials. Every lot ships with a third-party Certificate of Analysis. For laboratory research use only."
            : "A2LA-accredited, HPLC-verified reference materials for in-vitro assays, receptor-binding studies, and non-clinical research workflows. For qualified labs and institutional buyers; research-use certification at checkout."}
        </p>
      </div>
      )}

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24">
            <h2 className="text-base font-semibold text-foreground mb-4">Filter by</h2>
            {filterSidebar}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <p className="text-sm font-medium text-foreground" aria-live="polite">
              {selectedCategory !== "all" ? categories.find(c => c.id === selectedCategory)?.name ?? "All research materials" : "All research materials"} <span className="text-muted">({filteredProducts.length})</span>
            </p>

            <div className="flex items-center gap-3">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden flex items-center gap-1.5 text-sm text-foreground border border-border rounded-lg px-3 py-2 hover:bg-accent transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                Filters
                {hasActiveFilters && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {selectedTags.length + selectedForms.length + (selectedCategory !== "all" ? 1 : 0)}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted hidden sm:inline">Sort By</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-10 px-3 rounded-lg border border-primary text-sm text-primary font-medium bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  aria-label="Sort products"
                >
                  <option value="best-sellers">Default: Best Sellers</option>
                  <option value="name">Name</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Institutional registration prompt — shown to logged-out
              visitors. Restricted SKUs (e.g. GIP3) appear blurred until an
              account is created; this banner spells out the path. */}
          {gateRestricted && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl border border-border bg-accent/40 px-4 py-3.5">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Register your institution</span> to unlock the full catalog and restricted products.
                </p>
              </div>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-primary-light transition-colors whitespace-nowrap"
              >
                Register your institution
              </Link>
            </div>
          )}

          {/* Product Grid — 2-up on mobile (matches the reference layout)
              so the catalog feels denser on phones; ladder up on wider
              viewports. Reduced gap on mobile so cards don't get cramped. */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                locked={gateRestricted && GATED_SLUGS.has(product.slug)}
              />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted text-lg">No products match your filters.</p>
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-primary hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-background shadow-2xl z-50 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Filter by</h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors cursor-pointer"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4">
              {filterSidebar}
            </div>
          </div>
        </>
      )}
    </div>
    </div>
  );
}
