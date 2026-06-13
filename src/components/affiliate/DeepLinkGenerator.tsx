"use client";

import { useMemo, useState } from "react";
import { Copy, CheckCircle, Link2, Share2 } from "lucide-react";

const SITE = "https://basedresearch.com";

// Curated list of high-converting destinations affiliates can deep-link to.
// Ordered by intent: home → catalog → flagship PDPs → advertorials. Updated
// alongside the catalog when SKUs come and go (sourced from products.ts +
// research/* routes); a stale entry would just 404, not break the UI.
const POPULAR_DESTINATIONS: Array<{ label: string; path: string; hint: string }> = [
  { label: "Homepage", path: "/", hint: "Best for general audiences" },
  { label: "Shop catalog", path: "/shop", hint: "Browse all SKUs" },
  { label: "GIP3 (triple-agonist)", path: "/product/glp3-rta", hint: "Highest-margin flagship" },
  { label: "BPC-157", path: "/product/bpc-157", hint: "Best-seller, broad appeal" },
  { label: "TB-500", path: "/product/tb-500", hint: "Recovery audiences" },
  { label: "GHK-Cu", path: "/product/ghk-cu", hint: "Skin / longevity" },
  { label: "NAD+", path: "/product/nad-plus", hint: "Longevity audiences" },
  { label: "MOTS-c", path: "/product/mots-c", hint: "Performance audiences" },
  { label: "BPC-157 + TB-500 Blend", path: "/product/bpc-157-tb-500-blend", hint: "Bundle, higher AOV" },
  { label: "Glow Blend", path: "/product/glow-blend", hint: "Premium ($200 AOV)" },
  { label: "GHK-Cu advertorial", path: "/research/ghk-cu", hint: "Long-form, educated buyers" },
  { label: "BPC-157 advertorial", path: "/research/bpc-157", hint: "Long-form, educated buyers" },
];

export default function DeepLinkGenerator({ affiliateCode }: { affiliateCode: string }) {
  const [path, setPath] = useState<string>("/");
  const [copied, setCopied] = useState(false);

  // Construct the share URL — `?ref=CODE` for new traffic. If the
  // affiliate later turns the same code into a checkout coupon, that
  // path is handled by the cart, not by the URL.
  const shareUrl = useMemo(() => {
    const trimmed = path.trim();
    const safePath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    // Strip any existing ?ref= the affiliate may have pasted in.
    const noRef = safePath.replace(/([?&])ref=[^&]*&?/i, "$1").replace(/[?&]$/, "");
    const sep = noRef.includes("?") ? "&" : "?";
    return `${SITE}${noRef}${sep}ref=${affiliateCode}`;
  }, [path, affiliateCode]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — UI shows nothing changed, user can long-press to copy from the field */
    }
  };

  const share = async () => {
    if (typeof navigator === "undefined" || !("share" in navigator)) return copy();
    try {
      await navigator.share({
        title: "Based Research",
        text: "Research-grade peptides — pharmacy-tested, same-day shipping.",
        url: shareUrl,
      });
    } catch {
      /* user cancelled or share unsupported — ignore */
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-muted uppercase tracking-wide">
          Deep-link generator
        </p>
        <span className="text-[11px] text-muted">Same code works as a coupon at checkout</span>
      </div>

      <label className="block text-[12px] text-muted mb-1.5">Pick a destination</label>
      <select
        value={path}
        onChange={(e) => setPath(e.target.value)}
        className="block w-full bg-accent/40 border border-border rounded-md px-3 py-2 text-[13px] text-foreground mb-3 cursor-pointer"
      >
        {POPULAR_DESTINATIONS.map((d) => (
          <option key={d.path} value={d.path}>
            {d.label} — {d.hint}
          </option>
        ))}
      </select>

      <label className="block text-[12px] text-muted mb-1.5">
        Or paste any URL / path
      </label>
      <input
        type="text"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="/product/bpc-157"
        className="block w-full bg-accent/40 border border-border rounded-md px-3 py-2 text-[13px] font-mono text-foreground mb-3"
      />

      <div className="flex items-center gap-2">
        <div className="flex-1 font-mono text-[12px] bg-accent/60 px-3 py-2 rounded-md text-foreground truncate">
          {shareUrl}
        </div>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-[13px] font-medium rounded-md hover:bg-primary-light transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" /> Copy
            </>
          )}
        </button>
        <button
          onClick={share}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent text-foreground text-[13px] font-medium rounded-md hover:bg-accent/80 transition-colors cursor-pointer"
          aria-label="Share"
        >
          <Share2 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          Share
        </button>
      </div>

      <p className="text-[11px] text-muted mt-2 leading-snug">
        <Link2 className="inline w-3 h-3 mr-1 -mt-0.5" strokeWidth={1.5} aria-hidden="true" />
        Anyone who clicks gets credited to you on signup. Customers can also enter
        <span className="font-mono text-foreground mx-1">{affiliateCode}</span>
        as a coupon code at checkout for 10% off — you get the same commission either way.
      </p>
    </div>
  );
}
