const requiredServerVars = [
  "POSTGRES_URL",
  "JWT_SECRET",
] as const;

let validated = false;

export function validateEnv() {
  // Only warn once, and never throw during build (NEXT_PHASE is set during build)
  if (validated) return;
  validated = true;

  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  const missing = requiredServerVars.filter((key) => !process.env[key]);

  if (missing.length === 0) return;

  if (isBuild) {
    // During build, just warn — env vars may not be available for static pages
    console.warn(`[env] Build-time: missing ${missing.join(", ")} (will be available at runtime)`);
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  console.warn(`[env] Missing environment variables: ${missing.join(", ")}`);
}
