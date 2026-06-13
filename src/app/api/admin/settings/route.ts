import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAllSettings, setSetting, siteSettingDefaults, type SiteSettingKey, type SiteSettingSchema } from "@/lib/site-settings";

// GET /api/admin/settings
// Return every known setting (with defaults filled in for absent rows).
export async function GET() {
  try {
    await requireAdmin();
    const settings = await getAllSettings();
    return NextResponse.json({ settings, defaults: siteSettingDefaults });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

// PATCH /api/admin/settings
// Body: { key: SiteSettingKey, value: <matching type> }
// Validates the key against the known schema before writing.
export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { key, value } = body as { key?: string; value?: unknown };

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "key required" }, { status: 400 });
    }

    // Type-guard the key against the known catalog.
    const knownKeys: Record<SiteSettingKey, "boolean"> = {
      bump_offer_enabled: "boolean",
    };
    if (!(key in knownKeys)) {
      return NextResponse.json({ error: "Unknown setting key" }, { status: 400 });
    }

    const expectedType = knownKeys[key as SiteSettingKey];
    if (typeof value !== expectedType) {
      return NextResponse.json(
        { error: `Expected ${expectedType} for ${key}` },
        { status: 400 },
      );
    }

    await setSetting(
      key as SiteSettingKey,
      value as SiteSettingSchema[SiteSettingKey],
      admin.id,
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
