/**
 * Server-side helper to extract acquisition (UTM + landing + referrer)
 * fields from a checkout request body. Pairs with the client tracker
 * in src/lib/acquisition.ts.
 *
 * Returns an object that can be spread directly into a Drizzle insert
 * payload for the `orders` table — every field defaults to null when
 * absent. Strings are clamped to schema column lengths so a malformed
 * client can't blow past the varchar limit.
 *
 * Shape returned matches the orders-table column names exactly so
 * spreading is one line in the call site:
 *
 *   await db.insert(orders).values({
 *     ...,
 *     ...extractAcquisition(body),
 *   })
 */

interface RawAcquisitionInput {
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmContent?: unknown;
  utmTerm?: unknown;
  landingPath?: unknown;
  referrerDomain?: unknown;
}

export interface OrderAcquisitionFields {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  landingPath: string | null;
  referrerDomain: string | null;
}

function clamp(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function extractAcquisition(body: RawAcquisitionInput | undefined | null): OrderAcquisitionFields {
  const b = body || {};
  return {
    utmSource: clamp(b.utmSource, 100),
    utmMedium: clamp(b.utmMedium, 100),
    utmCampaign: clamp(b.utmCampaign, 200),
    utmContent: clamp(b.utmContent, 200),
    utmTerm: clamp(b.utmTerm, 200),
    landingPath: clamp(b.landingPath, 255),
    referrerDomain: clamp(b.referrerDomain, 255),
  };
}
