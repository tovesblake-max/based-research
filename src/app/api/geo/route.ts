import { NextResponse } from "next/server";

// EU/EEA country codes (GDPR applies)
const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // EEA
  "IS", "LI", "NO",
  // UK (post-Brexit, still has equivalent GDPR)
  "GB",
]);

export async function GET(request: Request) {
  // Vercel provides geo headers automatically on deployed instances
  const country = request.headers.get("x-vercel-ip-country") || "";
  const region = request.headers.get("x-vercel-ip-country-region") || "";

  const isEU = EU_COUNTRIES.has(country.toUpperCase());
  const isCalifornia = country.toUpperCase() === "US" && region.toUpperCase() === "CA";

  return NextResponse.json({
    country,
    region,
    consentRequired: isEU ? "gdpr" : isCalifornia ? "ccpa" : null,
  });
}
