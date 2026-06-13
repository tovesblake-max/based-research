"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, User, Menu, X, Search, Mail, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useCart } from "./CartProvider";
import { useAuth } from "./AuthProvider";
import { useLocaleSubscription } from "./LocaleProvider";
import { t } from "@/lib/i18n";
import { catalogProducts } from "@/lib/products";
import CartDrawer from "./CartDrawer";

export default function Header() {
  useLocaleSubscription(); // re-render header strings on locale change
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { totalItems, isCartOpen, setIsCartOpen } = useCart();
  const { user } = useAuth();

  // Nav links translated at render time so flipping locale updates them.
  // Hrefs stay constant; only labels swap. Brand-specific feature
  // names (Lab Results, Research Blog) stay English in both locales —
  // they read fine to a Spanish-speaking researcher.
  //
  // Removed 2026-05-07: /membership and /about — the operator elected to drop
  // both from the primary nav. Pages still exist (so any inbound links
  // continue to resolve) but they're no longer surfaced in the header.
  const navLinks = [
    { href: "/catalog", label: t("nav.shop") },
    { href: "/coa", label: "Lab Results" },
    { href: "/faq", label: t("nav.faq") },
    { href: "/contact", label: t("nav.contact") },
    { href: "https://blog.basedresearch.com", label: "Research Blog" },
  ];

  const searchResults = searchQuery.length >= 2
    ? catalogProducts.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  // Close search on click/tap outside the search container. Listen for
  // both mouse and touch events — `mousedown` alone misses iOS Safari's
  // touch-only contexts (search drawer would stay open after a tap on
  // the page background).
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  // Lock body scroll when the mobile full-screen search sheet is open
  // so the underlying page doesn't scroll behind it. No-op on desktop
  // because the dropdown is a small floating element and scrolling the
  // page underneath is fine. We feature-detect by checking viewport width.
  useEffect(() => {
    if (!searchOpen) return;
    const isMobile = window.innerWidth < 640; // matches Tailwind sm: breakpoint
    if (!isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [searchOpen]);

  // Focus input when search opens — slight delay on mobile so the
  // sheet's transition completes before the keyboard slides up.
  useEffect(() => {
    if (!searchOpen || !inputRef.current) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [searchOpen]);

  return (
    <>
      {/* Promo Banner */}
      <div className="bg-gradient-to-r from-primary via-primary to-secondary text-primary-foreground text-center py-2 px-4">
        <p className="text-xs tracking-wide font-medium">
          <span className="hidden sm:inline">&#127482;&#127480; {t("banner.prefix")}</span>{t("banner.core")}
        </p>
      </div>

      {/* Contact Info Bar */}
      <div className="hidden md:block border-b border-border bg-accent/40">
        <div className="max-w-6xl mx-auto px-4 h-9 flex items-center justify-between text-[12px] text-muted">
          <div className="flex items-center gap-5">
            <a href="mailto:support@basedresearch.com" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Mail className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
              support@basedresearch.com
            </a>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
              {t("header.hours")}
            </span>
          </div>
          {/* Language + currency toggles intentionally LIVE IN THE
              FOOTER, not the header. We don't want the English-default
              experience to surface any region-switcher chrome up top —
              the toggles are findable for users who need them via the
              <RegionSwitcher /> block at the bottom of the page. */}
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center group flex-shrink-0" aria-label="Based Research home">
            <Image
              src="/images/site/logo-light.png"
              alt="Based Research"
              width={200}
              height={50}
              className="h-9 w-auto"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted hover:text-foreground transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[1.5px] after:bg-primary after:transition-all hover:after:w-full whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative" ref={searchRef}>
              <button
                onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}
                className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                aria-label="Search products"
              >
                <Search className="w-4.5 h-4.5 text-muted" strokeWidth={1.5} aria-hidden="true" />
              </button>

              {searchOpen && (
                <>
                  {/* Mobile backdrop — taps anywhere outside the input
                      area close the sheet. Desktop hides this entirely. */}
                  <div
                    className="sm:hidden fixed inset-0 bg-black/40 z-40"
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                    aria-hidden="true"
                  />
                  {/* On mobile: full-width sheet anchored to top of viewport
                      so the iOS keyboard doesn't shove it offscreen. On
                      desktop: floating dropdown anchored to the search
                      button. Big input + 12px tap targets on mobile. */}
                  <div
                    className="
                      fixed inset-x-0 top-0 max-h-[90vh] bg-card shadow-2xl overflow-hidden z-50
                      sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-80 sm:max-h-none sm:rounded-xl sm:border sm:border-border
                    "
                  >
                    <div className="p-3 border-b border-border flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-accent rounded-lg px-3 h-12 sm:h-10 flex-1">
                        <Search className="w-4 h-4 text-muted flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
                        <input
                          ref={inputRef}
                          type="search"
                          inputMode="search"
                          enterKeyHint="search"
                          autoComplete="off"
                          autoCapitalize="off"
                          autoCorrect="off"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t("nav.searchPlaceholder")}
                          className="flex-1 bg-transparent text-base sm:text-sm text-foreground outline-none placeholder:text-muted min-w-0"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => { setSearchQuery(""); inputRef.current?.focus(); }}
                            className="text-muted hover:text-foreground cursor-pointer p-1 -mr-1"
                            aria-label="Clear search"
                          >
                            <X className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      {/* Mobile close button — explicit Cancel since
                          tapping the backdrop isn't always discoverable. */}
                      <button
                        onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                        className="sm:hidden text-sm text-primary font-medium px-2 py-2 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    {searchQuery.length >= 2 && (
                      <div className="overflow-y-auto sm:max-h-72" style={{ maxHeight: "calc(90vh - 64px)" }}>
                        {searchResults.length > 0 ? (
                          searchResults.map((p) => (
                            <Link
                              key={p.slug}
                              href={`/product/${p.slug}`}
                              onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                              className="flex items-center gap-3 px-4 py-3.5 sm:py-2.5 hover:bg-accent/50 active:bg-accent transition-colors border-b border-border/50 sm:border-0 last:border-0"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-[15px] sm:text-sm text-foreground truncate">{p.name}</p>
                                <p className="text-[12px] sm:text-[11px] text-muted">{p.purity} · {p.form}</p>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <div className="px-4 py-8 sm:py-6 text-center text-sm text-muted">
                            No results for &ldquo;{searchQuery}&rdquo;
                          </div>
                        )}
                      </div>
                    )}
                    {searchQuery.length < 2 && (
                      <div className="px-4 py-6 sm:py-4 text-center text-[13px] sm:text-xs text-muted">
                        Type at least 2 characters to search
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {user ? (
              <Link
                href="/account"
                className="hidden md:flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
              >
                <User className="w-4 h-4" />
                <span>{user.firstName || "Account"}</span>
              </Link>
            ) : (
              <Link
                href="/auth/sign-in"
                className="hidden md:flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1.5 px-3 h-10 rounded-lg hover:bg-accent transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              aria-label={`Shopping cart${totalItems > 0 ? `, ${totalItems} items` : ""}`}
            >
              <ShoppingBag className="w-5 h-5 text-foreground" aria-hidden="true" />
              <span className="hidden md:inline text-sm text-foreground">{t("nav.cart")}</span>
              {totalItems > 0 && (
                <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center" aria-hidden="true">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent transition-colors cursor-pointer"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border bg-background">
            <nav className="flex flex-col p-4 gap-1" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-foreground py-2.5 px-3 rounded-lg hover:bg-accent transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2 border-border" />
              <div className="flex items-center gap-4 px-3 py-2 text-xs text-muted">
                <a href="mailto:support@basedresearch.com" className="hover:text-foreground transition-colors">
                  support@basedresearch.com
                </a>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 text-xs text-muted">
                <Clock className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
                Mon–Fri 9AM–5PM EST
              </div>
              <hr className="my-2 border-border" />
              <Link
                href={user ? "/account" : "/auth/sign-in"}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-foreground py-2.5 px-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                {user ? (user.firstName || "Account") : "Sign In"}
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Cart Drawer */}
      <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
