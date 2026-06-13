/**
 * Google Places Details proxy.
 *
 * After the customer picks a suggestion from the autocomplete dropdown,
 * we resolve the placeId to a structured address (street + city + state
 * + zip + country). Returns the broken-out fields the checkout form
 * needs to populate.
 *
 * Same session-token pattern as /api/places/autocomplete — if the
 * client passes the matching sessionToken used during autocomplete,
 * Google bills the whole interaction as a single session.
 */
import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

interface PlaceDetails {
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
  formattedAddress?: string;
}

interface ParsedAddress {
  address1: string;
  city: string;
  state: string;     // 2-letter USPS code
  zip: string;
  country: string;   // ISO-2
  formatted: string;
}

function parseAddressComponents(details: PlaceDetails): ParsedAddress {
  const components = details.addressComponents || [];
  const find = (type: string, useShort = false) => {
    const match = components.find((c) => (c.types || []).includes(type));
    if (!match) return "";
    return (useShort ? match.shortText : match.longText) || "";
  };
  // street_number + route → "123 Main St"
  const streetNumber = find("street_number");
  const route = find("route");
  const address1 = [streetNumber, route].filter(Boolean).join(" ");
  // City: locality is the standard US city; postal_town and sublocality
  // are fallbacks for less-common admin layouts.
  const city =
    find("locality") || find("postal_town") || find("sublocality") || "";
  const state = find("administrative_area_level_1", true); // 2-letter
  const zip = find("postal_code");
  const country = find("country", true);
  return {
    address1,
    city,
    state,
    zip,
    country,
    formatted: details.formattedAddress || "",
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Address autocomplete not configured" },
      { status: 503 },
    );
  }

  const ip = getClientIp(request);
  if (!(await rateLimit(`places-details:${ip}`, 50, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { placeId?: string; sessionToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const placeId = (body.placeId || "").trim();
  if (!placeId) {
    return NextResponse.json({ error: "placeId required" }, { status: 400 });
  }
  const sessionToken = (body.sessionToken || "").trim();

  const url = new URL(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
  );
  if (sessionToken) url.searchParams.set("sessionToken", sessionToken);

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      // Only ask for the fields we use. Cuts cost + payload.
      "X-Goog-FieldMask": "addressComponents,formattedAddress",
    },
  });

  if (!resp.ok) {
    console.warn("[places/details] Google API error", {
      http_status: resp.status,
      placeId,
      raw: (await resp.text()).slice(0, 300),
    });
    return NextResponse.json(
      { error: "Address details unavailable" },
      { status: 502 },
    );
  }

  const details = (await resp.json()) as PlaceDetails;
  return NextResponse.json(parseAddressComponents(details));
}
