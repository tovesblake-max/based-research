import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalogProducts, getProductBySlug, getStartingPrice } from "@/lib/products";
import { getCategoryById } from "@/lib/categories";
import { formatPriceShort } from "@/lib/utils";
import { getProductImagePath } from "@/lib/product-images";
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_CENTS } from "@/lib/discounts";
import ProductDetailClient from "./ProductDetailClient";

interface Props {
  params: Promise<{ slug: string }>;
}

// Slugs that are hidden from catalog/sitemap/feed but still render a product
// page at a direct URL — reachable only by someone who has the link (or via
// cart upsells). Used for accessory products we don't want showing up in
// shop browsing.
//
// 2026-05-23: emptied. The internal test SKUs (`test-ach-daily` $3 ACH,
// `card-test` $20 card) were removed from products.ts on 2026-05-04, so
// keeping their slugs here only made the build pre-render two 404 pages.
// bacteriostatic-water moved to the public catalog 2026-05-03 (now a
// bump-offer SKU) so it renders via the normal catalog path. If a hidden
// direct-URL SKU is needed again, add its slug here.
const ALLOW_DIRECT_URL_SLUGS = new Set<string>([]);

export function generateStaticParams() {
  // Catalog products get pre-rendered. Direct-URL-only test SKUs are added so
  // they can be loaded by link without failing the build with notFound().
  const base = catalogProducts.map((p) => ({ slug: p.slug }));
  const extra = [...ALLOW_DIRECT_URL_SLUGS].map((slug) => ({ slug }));
  return [...base, ...extra];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return { title: "Product Not Found | Based Research" };
  }

  const category = getCategoryById(product.category);
  const price = formatPriceShort(getStartingPrice(product));

  return {
    title: `${product.name} | Based Research`,
    description: product.description,
    alternates: {
      canonical: `https://basedresearch.com/product/${product.slug}`,
    },
    // Hidden test SKUs (upsellOnly + reachable by direct URL) get a
    // hard noindex so search engines that stumble on the URL don't
    // add it to results. Public catalog products fall through.
    robots:
      product.upsellOnly === true
        ? { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
        : undefined,
    openGraph: {
      title: `${product.name} \u2014 ${product.purity} Purity | Based Research`,
      description: product.description,
      type: "website",
      url: `https://basedresearch.com/product/${product.slug}`,
      // Image is generated dynamically by opengraph-image.tsx in this
      // same directory — renders the product name, category, and price.
      // Next.js auto-wires the meta tag.
    },
  };
}


export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  // Upsell-only products are directly addressable in the cart flow but should
  // not render as a public product page — except for slugs explicitly allowed
  // by direct URL (e.g. the internal ACH rail test SKU).
  if (!product || (product.upsellOnly && !ALLOW_DIRECT_URL_SLUGS.has(product.slug))) {
    notFound();
  }

  const category = getCategoryById(product.category);
  const startingPrice = getStartingPrice(product);

  // Product structured data — eligible for Google Shopping rich results
  const productUrl = `https://basedresearch.com/product/${product.slug}`;
  const imageUrl = `https://basedresearch.com${getProductImagePath(product.slug)}`;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.variants[0].sku,
    mpn: product.variants[0].sku,
    productID: product.id,
    url: productUrl,
    image: [imageUrl],
    brand: {
      "@type": "Brand",
      name: "Based Research",
    },
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      url: productUrl,
      price: (variant.price / 100).toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      sku: variant.sku,
      mpn: variant.sku,
      name: `${product.name} ${variant.size}`,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      seller: {
        "@type": "Organization",
        name: "Based Research",
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "US",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: variant.price >= FREE_SHIPPING_THRESHOLD ? "0.00" : (FLAT_SHIPPING_CENTS / 100).toFixed(2),
          currency: "USD",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "US",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
        },
      },
    })),
    ...(product.cas && { identifier: product.cas }),
    ...(product.cas && { gtin: undefined }),
    additionalProperty: [
      { "@type": "PropertyValue", name: "Purity", value: product.purity },
      { "@type": "PropertyValue", name: "Form", value: product.form },
      ...(product.molecularWeight
        ? [{ "@type": "PropertyValue", name: "Molecular Weight", value: product.molecularWeight }]
        : []),
      ...(product.cas
        ? [{ "@type": "PropertyValue", name: "CAS Number", value: product.cas }]
        : []),
    ],
  };

  // Breadcrumb structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://basedresearch.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: "https://basedresearch.com/catalog",
      },
      ...(category
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: category.name,
              item: `https://basedresearch.com/catalog?category=${category.id}`,
            },
            {
              "@type": "ListItem",
              position: 4,
              name: product.name,
              item: `https://basedresearch.com/product/${product.slug}`,
            },
          ]
        : [
            {
              "@type": "ListItem",
              position: 3,
              name: product.name,
              item: `https://basedresearch.com/product/${product.slug}`,
            },
          ]),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}
