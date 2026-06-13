// Ship24 Tracking API Client
// Docs: https://docs.ship24.com/
// Free tier available for testing

const SHIP24_BASE = "https://api.ship24.com/public/v1";
const SHIP24_API_KEY = process.env.SHIP24_API_KEY || "";

async function ship24Request(path: string, method: string = "GET", body?: unknown) {
  const res = await fetch(`${SHIP24_BASE}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${SHIP24_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Ship24] ${method} ${path} failed (${res.status}):`, text);
    return null;
  }

  return res.json();
}

// Status milestones from Ship24
export type TrackingMilestone =
  | "info_received"
  | "in_transit"
  | "out_for_delivery"
  | "failed_attempt"
  | "available_for_pickup"
  | "delivered"
  | "exception"
  | "pending";

export interface TrackingResult {
  trackingNumber: string;
  milestone: TrackingMilestone;
  lastEvent: string; // raw status text
  lastLocation: string;
  lastTimestamp: string; // ISO
  estimatedDelivery: string | null;
  carrier: string;
  events: {
    status: string;
    statusCode: string;
    statusMilestone: TrackingMilestone;
    location: string;
    timestamp: string;
  }[];
}

// Create a tracker and get results in one call (idempotent)
export async function trackPackage(trackingNumber: string): Promise<TrackingResult | null> {
  if (!SHIP24_API_KEY) {
    console.warn("[Ship24] No API key configured");
    return null;
  }

  const data = await ship24Request("/trackers/track", "POST", {
    trackingNumber,
  });

  if (!data?.data?.trackings?.[0]) return null;

  const tracking = data.data.trackings[0];
  const shipment = tracking.shipment || {};
  const events = tracking.events || [];
  const lastEvent = events[0]; // most recent

  return {
    trackingNumber,
    milestone: (shipment.statusMilestone || lastEvent?.statusMilestone || "pending") as TrackingMilestone,
    lastEvent: lastEvent?.status || "No updates yet",
    lastLocation: lastEvent?.location || "",
    lastTimestamp: lastEvent?.datetime || "",
    estimatedDelivery: shipment.delivery?.estimatedDeliveryDate || null,
    carrier: shipment.carrier?.name || "",
    events: events.map((e: Record<string, unknown>) => ({
      status: (e.status as string) || "",
      statusCode: (e.statusCode as string) || "",
      statusMilestone: (e.statusMilestone as TrackingMilestone) || "pending",
      location: (e.location as string) || "",
      timestamp: (e.datetime as string) || "",
    })),
  };
}
