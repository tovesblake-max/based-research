/**
 * Google Places Autocomplete proxy.
 *
 * The browser POSTs `{ input, sessionToken }` and we forward the
 * request to Google's Places Autocomplete (New) API with our server-
 * side key, returning the suggestion list. Keeps the API key OFF the
 * client bundle so it can't be lifted from page source and abused.
 *
 * Session tokens: Google bills "session-based" — autocomplete
 * keystrokes within a single session that end with a place-details
 * call get billed once. The client mints a UUID per address-entry
 * session and passes it through both endpoints.
 *
 * Disabled (returns 503) when GOOGLE_PLACES_API_KEY isn't set, so
 * the AddressAutocomplete component falls back to a plain input
 * without any errors.
 */
import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

interface PlacesResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId: string;
      text?: { text: string };
      structuredFormat?: {
        mainText?: { text: string };
        secondaryText?: { text: string };
      };
    };
  }>;
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Address autocomplete not configured", suggestions: [] },
      { status: 503 },
    );
  }

  // Per-IP throttle so the proxy can't be used as an open Places API
  // gateway. 100 requests / 15min covers a customer typing fluently
  // through several address attempts.
  const ip = getClientIp(request);
  if (!(await rateLimit(`places-autocomplete:${ip}`, 100, 15 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Too many requests", suggestions: [] },
      { status: 429 },
    );
  }

  let body: { input?: string; sessionToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = (body.input || "").trim();
  if (input.length < 3) {
    // Don't burn quota on 1-2 char queries — barely useful predictions.
    return NextResponse.json({ suggestions: [] });
  }
  const sessionToken = (body.sessionToken || "").trim();

  // Places Autocomplete (New) API — POST endpoint.
  // https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
  const resp = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // Field mask — only ask for the fields we render. Reduces
        // billing tier on Google's side AND reduces payload size.
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
      },
      body: JSON.stringify({
        input,
        // US-only addresses for now. Switch to multi-region by passing
        // an array (or removing entirely) when the merchant ships
        // outside the US.
        includedRegionCodes: ["us"],
        // Bias toward the US — matches the storefront's primary market.
        // `includedPrimaryTypes` further narrows to street addresses
        // (skips business POIs, transit stops, etc.).
        includedPrimaryTypes: ["street_address", "premise", "subpremise"],
        ...(sessionToken ? { sessionToken } : {}),
      }),
    },
  );

  if (!resp.ok) {
    console.warn("[places/autocomplete] Google API error", {
      http_status: resp.status,
      raw: (await resp.text()).slice(0, 300),
    });
    return NextResponse.json(
      { error: "Address suggestions unavailable", suggestions: [] },
      { status: 502 },
    );
  }

  const data = (await resp.json()) as PlacesResponse;
  const suggestions = (data.suggestions || [])
    .filter((s) => s.placePrediction)
    .map((s) => ({
      placeId: s.placePrediction!.placeId,
      label: s.placePrediction!.text?.text || "",
      mainText: s.placePrediction!.structuredFormat?.mainText?.text || "",
      secondaryText: s.placePrediction!.structuredFormat?.secondaryText?.text || "",
    }));

  return NextResponse.json({ suggestions });
}
