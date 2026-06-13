// Key/value site settings — feature flags, admin-editable copy, etc.
//
// Read-side is deliberately cheap:
//   - React.cache dedupes reads within a single request
//   - Defaults live here so a missing row never breaks the site
// Write-side is admin-only via /api/admin/settings.

import { cache } from "react";
import { db } from "./db";
import { siteSettings } from "./db/schema";
import { eq } from "drizzle-orm";

// Typed catalog of known settings. Add new keys here so callers get
// autocomplete + type-safety instead of raw strings.
export type SiteSettingKey = "bump_offer_enabled";

export interface SiteSettingSchema {
  bump_offer_enabled: boolean;
}

export const siteSettingDefaults: SiteSettingSchema = {
  bump_offer_enabled: true,
};

/**
 * Read a single setting. Defaults are returned when the row is absent.
 * Cached per request.
 */
export const getSetting = cache(async <K extends SiteSettingKey>(
  key: K,
): Promise<SiteSettingSchema[K]> => {
  try {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);
    if (!row) return siteSettingDefaults[key];
    return row.value as SiteSettingSchema[K];
  } catch (err) {
    console.warn("[site-settings] read failed, using default", { key, err: String(err) });
    return siteSettingDefaults[key];
  }
});

/**
 * Read every known setting in one round-trip. Useful for the admin settings
 * page and for pushing flag state to the client in a single GET.
 */
export const getAllSettings = cache(async (): Promise<SiteSettingSchema> => {
  try {
    const rows = await db
      .select({ key: siteSettings.key, value: siteSettings.value })
      .from(siteSettings);
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    return {
      bump_offer_enabled: (byKey.get("bump_offer_enabled") as boolean | undefined) ?? siteSettingDefaults.bump_offer_enabled,
    };
  } catch (err) {
    console.warn("[site-settings] read-all failed, using defaults", { err: String(err) });
    return { ...siteSettingDefaults };
  }
});

/**
 * Write a setting. Upserts on the key. updatedBy is optional for logging.
 */
export async function setSetting<K extends SiteSettingKey>(
  key: K,
  value: SiteSettingSchema[K],
  updatedBy?: string,
): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ key, value, updatedBy: updatedBy || null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedBy: updatedBy || null, updatedAt: new Date() },
    });
}
