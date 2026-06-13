/**
 * Business Type / Industry — single source of truth.
 *
 * Collected at account creation (and confirmable at checkout). Stored in
 * `users.researcher_type` and mirrored to `orders.researcher_type` at
 * purchase time. Doubles as a B2B / MCC 5169 underwriting signal — the
 * option set mirrors what card-processor onboarding forms ask for.
 *
 * IMPORTANT — import these everywhere instead of re-listing the options:
 *   - SignUpForm.tsx        (the signup dropdown)
 *   - api/auth/sign-up      (validation)
 *   - CheckoutClient.tsx    (the checkout confirm/edit dropdown + labels)
 *
 * LEGACY VALUES: the dropdown only renders BUSINESS_TYPES (the new 11),
 * but validation must accept LEGACY_BUSINESS_TYPES too — existing users
 * have those saved on their profile, and rejecting them would break
 * checkout for anyone who signed up before 2026-05-21. Labels cover both
 * so historical rows still render a human-readable value.
 */

// Shown in the dropdown — order matches the onboarding form.
export const BUSINESS_TYPES = [
  { value: "independent_researcher", label: "Independent Researcher (Sole Proprietor)" },
  { value: "industrial_materials_lab", label: "Industrial or Materials Research Lab" },
  { value: "university", label: "University or Educational Institution" },
  { value: "biotech_company", label: "Biotechnology Company" },
  { value: "life_sciences_company", label: "Life Sciences Company" },
  { value: "industrial_manufacturing", label: "Industrial / Manufacturing" },
  { value: "cro", label: "Contract Research Organization (CRO)" },
  { value: "medical_devices_rd", label: "Medical Devices R&D" },
  { value: "government_research", label: "Government Research Facility" },
  { value: "nonprofit_biomedical", label: "Non-Profit Biomedical Research Org" },
  { value: "environmental_testing_lab", label: "Environmental Testing Laboratory" },
] as const;

// Pre-2026-05-21 values. Validation-only — never rendered in the dropdown.
// ("cro" already exists in the new set, so it's not duplicated here.)
export const LEGACY_BUSINESS_TYPES = [
  "academic",
  "biotech_rd",
  "private_lab",
  "clinical_research",
  "other",
] as const;

// Every value the server will accept (new + legacy). Use for z.enum().
// Cast through `unknown` because the source is an array type (X[]) while
// z.enum wants a non-empty tuple ([string, ...string[]]); the array is
// provably non-empty (BUSINESS_TYPES has 11 entries).
export const ACCEPTED_BUSINESS_TYPE_VALUES = [
  ...BUSINESS_TYPES.map((b) => String(b.value)),
  ...LEGACY_BUSINESS_TYPES,
] as unknown as [string, ...string[]];

// value → display label, covering new + legacy for graceful historical display.
export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  ...Object.fromEntries(BUSINESS_TYPES.map((b) => [b.value, b.label])),
  // Legacy labels
  academic: "Academic / University researcher",
  biotech_rd: "Biotech or pharmaceutical R&D",
  private_lab: "Independent / private laboratory",
  clinical_research: "Clinical research (non-patient-care)",
  other: "Other research professional",
};

export function businessTypeLabel(value: string | null | undefined): string {
  if (!value) return "";
  return BUSINESS_TYPE_LABELS[value] ?? value;
}
