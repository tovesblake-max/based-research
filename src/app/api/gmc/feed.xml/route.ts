/**
 * Product feed — consumed by BOTH Google Merchant Center AND Meta Commerce.
 *
 * Format: RSS 2.0 + g: namespace per Google Shopping spec.
 *   https://support.google.com/merchants/answer/7052112
 *
 * Meta Commerce Manager accepts the same format directly:
 *   Catalog → Add data feed → Scheduled feed → URL = /api/gmc/feed.xml
 *
 * Submit URL: https://basedresearch.com/api/gmc/feed.xml
 *
 * Field choices reflect peptide-policy realities on Meta:
 *   - google_product_category = "Hardware > Tool Accessories > Laboratory
 *     Equipment" — frames the line as research equipment, NOT supplements.
 *     Meta inherits this signal and routes around the supplement-policy
 *     review queue.
 *   - identifier_exists = no — research compounds genuinely have no GTINs;
 *     faking one gets the catalog auto-flagged.
 *   - description template strips ALL claims-language ("treat", "improve",
 *     "boost", body-system references). Adds the FOR-RESEARCH-USE-ONLY
 *     disclaimer to every item.
 *   - item_group_id ties variants to a parent so DPA can pick a different
 *     size variant for the ad slot than the one the user originally viewed.
 *   - custom_label_0..2 are wired to product.featured / category / price
 *     band so Ads Manager can build "high-margin top-sellers" product sets
 *     and bid them differently.
 *
 * Excluded slugs match the sitemap + robots restricted-compound list.
 */
import { NextResponse } from "next/server";
import { catalogProducts } from "@/lib/products";
import { getProductImagePath } from "@/lib/product-images";
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_CENTS } from "@/lib/discounts";
import { RESTRICTED_META_SLUGS } from "@/lib/meta-eligibility";

const BASE_URL = "https://basedresearch.com";

// Restricted-compound slugs come from the shared meta-eligibility
// module so this list is the single source of truth — kept in sync
// with the pixel / CAPI gating in lib/meta-eligibility.ts. If a slug
// is here, it's also suppressed from event firing → no catalog miss.
const EXCLUDED_SLUGS = RESTRICTED_META_SLUGS;

// Lab-equipment framing — keeps the catalog OUT of Meta's supplement /
// health-and-beauty policy queue. Same code Google + Meta both honor.
const GOOGLE_PRODUCT_CATEGORY =
  "Hardware > Tool Accessories > Laboratory Equipment";

// Price bands for custom_label_2 — let Ads Manager bid differently on
// $40 entry-tier SKUs vs $200+ premium ones. Cents.
const PRICE_TIER_LOW_MAX_CENTS = 5000; // ≤ $50
const PRICE_TIER_MID_MAX_CENTS = 10000; // ≤ $100

function priceTier(cents: number): "low" | "mid" | "high" {
  if (cents <= PRICE_TIER_LOW_MAX_CENTS) return "low";
  if (cents <= PRICE_TIER_MID_MAX_CENTS) return "mid";
  return "high";
}

// 30-day window for the new-arrival label. Past this window the label
// drops automatically (no need to manually flip it off per product).
const NEW_ARRIVAL_WINDOW_DAYS = 30;

// Margin threshold splitting "fat" from "lean" — gross-margin %.
// Anything above this is bid-up territory in Ads Manager.
const FAT_MARGIN_THRESHOLD = 0.5;

/**
 * Returns "fat" / "lean" or null when costCents is missing/invalid.
 * Null = no custom_label_3 emitted, which is fine — Ads Manager treats
 * a missing label as "any" rather than as a specific bucket.
 */
function marginLabel(priceCents: number, costCents?: number): "fat" | "lean" | null {
  if (!costCents || costCents <= 0) return null;
  if (costCents >= priceCents) return "lean"; // negative-margin: definitely floor it
  const margin = (priceCents - costCents) / priceCents;
  return margin > FAT_MARGIN_THRESHOLD ? "fat" : "lean";
}

/**
 * True when the product has a launchedAt within the last NEW_ARRIVAL_WINDOW_DAYS.
 * Future-dated launches (pre-launch teasers) are NOT labeled — only currently-live
 * SKUs get the new-arrival boost.
 */
function isNewArrival(launchedAt?: string): boolean {
  if (!launchedAt) return false;
  const launchTime = new Date(launchedAt).getTime();
  if (Number.isNaN(launchTime)) return false;
  const ageDays = (Date.now() - launchTime) / (1000 * 60 * 60 * 24);
  return ageDays >= 0 && ageDays <= NEW_ARRIVAL_WINDOW_DAYS;
}

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(str: string): string {
  return `<![CDATA[${str.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} USD`;
}

/**
 * Build a Meta-policy-friendly description. Strips claims-language,
 * leans on lab-equipment / research framing, ends with the mandatory
 * "for research use only" disclaimer.
 *
 * Template inputs:
 *   {name}    "BPC-157"
 *   {purity}  "≥99%" (falls through to "research-grade" if absent)
 *   {size}    "5mg"
 *   {form}    "Lyophilized Powder" (falls through to "lyophilized powder")
 */
function buildDescription(
  product: { name: string; purity?: string; form?: string },
  size: string,
): string {
  const purity = product.purity?.trim() || "research-grade";
  const form = (product.form || "lyophilized powder").toLowerCase();

  return [
    `${product.name}, ${purity} HPLC-tested.`,
    `${size} per vial as a ${form}.`,
    `Batch-linked Certificate of Analysis from an A2LA-accredited lab included with every shipment.`,
    `Ships from the US in temperature-managed packaging.`,
    `For research use only — not for human consumption.`,
  ].join(" ");
}

export async function GET() {
  const items: string[] = [];

  for (const product of catalogProducts) {
    if (EXCLUDED_SLUGS.has(product.slug)) continue;
    if (!product.variants?.length) continue;

    // Emit one <item> per variant — feed-spec treats each SKU as its own
    // offer. item_group_id (below) ties them back together for DPA.
    for (const variant of product.variants) {
      const id = variant.sku;
      const title = `${product.name} ${variant.size} | Based Research`.slice(0, 150);
      const link = `${BASE_URL}/product/${product.slug}`;
      const imageUrl = `${BASE_URL}${getProductImagePath(product.slug)}`;
      const price = formatPrice(variant.price);
      const brand = "Based Research";
      const condition = "new";
      const availability = "in stock";
      const mpn = variant.sku;
      const description = buildDescription(product, variant.size);
      const tier = priceTier(variant.price);
      const featuredLabel = product.featured ? "top-seller" : "standard";
      const margin = marginLabel(variant.price, variant.costCents);
      const newArrival = isNewArrival(product.launchedAt);

      items.push(`
    <item>
      <g:id>${xmlEscape(id)}</g:id>
      <g:title>${cdata(title)}</g:title>
      <g:description>${cdata(description)}</g:description>
      <g:link>${xmlEscape(link)}</g:link>
      <g:image_link>${xmlEscape(imageUrl)}</g:image_link>
      <g:condition>${condition}</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${xmlEscape(price)}</g:price>
      <g:brand>${xmlEscape(brand)}</g:brand>
      <g:mpn>${xmlEscape(mpn)}</g:mpn>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>${xmlEscape(GOOGLE_PRODUCT_CATEGORY)}</g:google_product_category>
      <g:product_type>${cdata(product.category.replace(/-/g, " "))}</g:product_type>
      <g:item_group_id>${xmlEscape(product.slug)}</g:item_group_id>
      <g:size>${xmlEscape(variant.size)}</g:size>
      <g:custom_label_0>${xmlEscape(featuredLabel)}</g:custom_label_0>
      <g:custom_label_1>${xmlEscape(`category:${product.category}`)}</g:custom_label_1>
      <g:custom_label_2>${xmlEscape(`price-tier:${tier}`)}</g:custom_label_2>${margin ? `
      <g:custom_label_3>${xmlEscape(`margin:${margin}`)}</g:custom_label_3>` : ""}${newArrival ? `
      <g:custom_label_4>new-arrival</g:custom_label_4>` : ""}
      <g:shipping>
        <g:country>US</g:country>
        <g:service>UPS 2nd Day Air</g:service>
        <g:price>${xmlEscape(variant.price >= FREE_SHIPPING_THRESHOLD ? "0.00 USD" : `${(FLAT_SHIPPING_CENTS / 100).toFixed(2)} USD`)}</g:price>
      </g:shipping>
      <g:adult>no</g:adult>
    </item>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Based Research — Research Compounds</title>
    <link>${BASE_URL}</link>
    <description>HPLC-verified research compounds for in-vitro applications. A2LA-accredited Certificates of Analysis batch-linked to every shipment.</description>
${items.join("")}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

// Ensure Next doesn't try to preload or cache this at build time incorrectly
export const dynamic = "force-dynamic";
