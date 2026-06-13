/**
 * Google Tag Manager dataLayer helpers.
 *
 * Pushes GA4 / Google Ads standard events into window.dataLayer. GTM is
 * configured to forward them to whatever destinations you set up (GA4,
 * Google Ads conversion, Meta Pixel, etc.).
 *
 * All e-commerce events use the GA4 enhanced e-commerce schema:
 * https://developers.google.com/tag-platform/gtagjs/reference/events
 *
 * Enhanced Conversions: the purchase event includes user_data with
 * SHA-256-hashed email/phone when available — lets Google match
 * conversions to ad clicks at much higher fidelity than cookies.
 */

interface Product {
  slug: string;
  name: string;
  category?: string;
}

interface Variant {
  sku: string;
  size: string;
  price: number; // cents
}

interface CartItem {
  productId: string;
  productName: string;
  variantSku: string;
  variantSize: string;
  price: number; // cents
  quantity: number;
  slug: string;
}

type DataLayerEvent = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

function push(event: DataLayerEvent) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  // Clear previous ecommerce object per GA4 recommendation before pushing a new one
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(event);
}

/**
 * SHA-256 hash a string, returning lowercase hex.
 * Used for Enhanced Conversions (email, phone).
 */
async function sha256Hex(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase();
  const buf = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * GA4 enhanced-ecommerce item shape.
 */
function toGa4Item(item: {
  id: string;
  name: string;
  price: number; // cents
  quantity: number;
  category?: string;
  variant?: string;
}) {
  return {
    item_id: item.id,
    item_name: item.name,
    price: +(item.price / 100).toFixed(2),
    quantity: item.quantity,
    item_category: item.category,
    item_variant: item.variant,
  };
}

// ── Event emitters ──────────────────────────────────────────────────

export function pushViewItem(product: Product, variant: Variant) {
  push({
    event: "view_item",
    ecommerce: {
      currency: "USD",
      value: +(variant.price / 100).toFixed(2),
      items: [
        toGa4Item({
          id: variant.sku,
          name: product.name,
          price: variant.price,
          quantity: 1,
          category: product.category,
          variant: variant.size,
        }),
      ],
    },
  });
}

export function pushAddToCart(
  product: { slug: string; name: string; category?: string },
  variant: Variant,
  quantity = 1
) {
  push({
    event: "add_to_cart",
    ecommerce: {
      currency: "USD",
      value: +((variant.price * quantity) / 100).toFixed(2),
      items: [
        toGa4Item({
          id: variant.sku,
          name: product.name,
          price: variant.price,
          quantity,
          category: product.category,
          variant: variant.size,
        }),
      ],
    },
  });
}

export function pushBeginCheckout(cart: { items: CartItem[]; subtotal: number }) {
  push({
    event: "begin_checkout",
    ecommerce: {
      currency: "USD",
      value: +(cart.subtotal / 100).toFixed(2),
      items: cart.items.map((i) =>
        toGa4Item({
          id: i.variantSku,
          name: i.productName,
          price: i.price,
          quantity: i.quantity,
          variant: i.variantSize,
        })
      ),
    },
  });
}

export async function pushPurchase(opts: {
  orderNumber: string;
  items: CartItem[];
  subtotal: number; // cents
  shipping: number; // cents
  discount: number; // cents
  total: number; // cents
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  address?: {
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}) {
  // Enhanced Conversions user_data (hashed PII only — never plaintext)
  const userData: Record<string, string | Record<string, string>> = {};
  if (opts.email) userData.sha256_email_address = await sha256Hex(opts.email);
  if (opts.phone) userData.sha256_phone_number = await sha256Hex(opts.phone);
  if (opts.firstName || opts.lastName || opts.address) {
    const addr: Record<string, string> = {};
    if (opts.firstName) addr.sha256_first_name = await sha256Hex(opts.firstName);
    if (opts.lastName) addr.sha256_last_name = await sha256Hex(opts.lastName);
    if (opts.address?.city) addr.city = opts.address.city.toLowerCase();
    if (opts.address?.state) addr.region = opts.address.state;
    if (opts.address?.zip) addr.postal_code = opts.address.zip;
    if (opts.address?.country) addr.country = opts.address.country;
    userData.address = addr;
  }

  push({
    event: "purchase",
    ecommerce: {
      transaction_id: opts.orderNumber,
      value: +(opts.total / 100).toFixed(2),
      tax: 0,
      shipping: +(opts.shipping / 100).toFixed(2),
      currency: "USD",
      coupon: opts.discount > 0 ? "ACH_DISCOUNT" : undefined,
      items: opts.items.map((i) =>
        toGa4Item({
          id: i.variantSku,
          name: i.productName,
          price: i.price,
          quantity: i.quantity,
          variant: i.variantSize,
        })
      ),
    },
    user_data: Object.keys(userData).length > 0 ? userData : undefined,
  });
}

/**
 * Generic dataLayer push for custom events (used for Lead, sign_up, etc.).
 */
export function pushCustom(event: string, params: Record<string, unknown> = {}) {
  push({ event, ...params });
}
