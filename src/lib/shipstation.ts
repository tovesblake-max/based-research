// ShipStation API v1 Client
// Docs: https://www.shipstation.com/docs/api/

const SS_BASE = "https://ssapi.shipstation.com";
// ShipStation v1 uses HTTP Basic Auth with API key + API secret.
//
// Production stores these as SS_STORE_USERNAME / SS_STORE_PASSWORD —
// misleading names (it's not a "username/password," it's the API
// key/secret pair from ShipStation → Account → API Settings). The
// original SHIPSTATION_API_KEY / SHIPSTATION_API_SECRET names were
// what this lib originally read; nobody noticed the mismatch for
// ~2 weeks because the cs/notify callsite swallows errors with
// .catch(), so every silent 401 just rolled past and orders sat
// un-pushed.
//
// Read both name pairs so either can be used. SS_STORE_* wins because
// that's what's actually set in prod.
const SS_API_KEY =
  process.env.SS_STORE_USERNAME || process.env.SHIPSTATION_API_KEY || "";
const SS_API_SECRET =
  process.env.SS_STORE_PASSWORD || process.env.SHIPSTATION_API_SECRET || "";

function authHeader(): string {
  return "Basic " + Buffer.from(`${SS_API_KEY}:${SS_API_SECRET}`).toString("base64");
}

async function ssRequest(path: string, method: string = "GET", body?: unknown) {
  const res = await fetch(`${SS_BASE}${path}`, {
    method,
    headers: {
      "Authorization": authHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[ShipStation] ${method} ${path} failed (${res.status}):`, text);
    // Include the response body in the thrown message — a bare status
    // code is undiagnosable when the call is buried behind a .catch().
    throw new Error(`ShipStation API error: ${res.status} — ${text.slice(0, 500)}`);
  }

  return res.json();
}

// ── Create/Update Order ────────────────────────────────────
export async function createOrder(params: {
  orderNumber: string;
  orderDate: string; // ISO date
  customerEmail: string;
  customerName: string;
  shipTo: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  items: {
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number; // dollars
  }[];
  amountPaid: number; // dollars
  shippingAmount: number; // dollars
  internalNotes?: string;
}) {
  const order = {
    orderNumber: params.orderNumber,
    orderKey: params.orderNumber, // use orderNumber as idempotency key
    orderDate: params.orderDate,
    orderStatus: "awaiting_shipment",
    customerEmail: params.customerEmail,
    billTo: {
      name: params.customerName,
      street1: params.shipTo.street1,
      street2: params.shipTo.street2 || null,
      city: params.shipTo.city,
      state: params.shipTo.state,
      postalCode: params.shipTo.postalCode,
      country: params.shipTo.country,
      phone: params.shipTo.phone || null,
    },
    shipTo: {
      name: params.shipTo.name,
      street1: params.shipTo.street1,
      street2: params.shipTo.street2 || null,
      city: params.shipTo.city,
      state: params.shipTo.state,
      postalCode: params.shipTo.postalCode,
      country: params.shipTo.country,
      phone: params.shipTo.phone || null,
    },
    items: params.items.map((item) => ({
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    amountPaid: params.amountPaid,
    shippingAmount: params.shippingAmount,
    internalNotes: params.internalNotes || null,
    requestedShippingService: "UPS 2nd Day Air",
  };

  return ssRequest("/orders/createorder", "POST", order);
}

// ── Get Order ──────────────────────────────────────────────
export async function getOrder(orderId: number) {
  return ssRequest(`/orders/${orderId}`);
}

// ── Get Shipment by resource_url (for webhook processing) ──
export async function getResource(resourceUrl: string) {
  const res = await fetch(resourceUrl, {
    headers: { "Authorization": authHeader() },
  });
  if (!res.ok) throw new Error(`ShipStation resource fetch failed: ${res.status}`);
  return res.json();
}

// ── Subscribe to Webhook ───────────────────────────────────
export async function subscribeWebhook(targetUrl: string, event: string = "SHIP_NOTIFY") {
  return ssRequest("/webhooks/subscribe", "POST", {
    target_url: targetUrl,
    event,
    friendly_name: `Based Research ${event}`,
  });
}

// ── List Webhooks ──────────────────────────────────────────
export async function listWebhooks() {
  return ssRequest("/webhooks");
}

// ── Mark Order Shipped (manual) ────────────────────────────
export async function markOrderShipped(orderId: number, trackingNumber: string, carrierCode: string = "ups") {
  return ssRequest("/orders/markasshipped", "POST", {
    orderId,
    carrierCode,
    trackingNumber,
    notifyCustomer: false, // we handle our own emails
    notifySalesChannel: false,
  });
}
