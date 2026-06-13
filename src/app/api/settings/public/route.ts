import { NextResponse } from "next/server";
import { getAllSettings } from "@/lib/site-settings";

// Public, unauthenticated read of the subset of site settings the client
// needs to make UI decisions (feature flags only — never anything sensitive).
// Cached at the edge for 60s so the checkout page doesn't hit the DB on
// every view.
export async function GET() {
  const all = await getAllSettings();
  return NextResponse.json(
    {
      bumpOfferEnabled: all.bump_offer_enabled,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
