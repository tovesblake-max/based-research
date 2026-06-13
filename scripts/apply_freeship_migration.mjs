// Applies the free_shipping coupon column migration + inserts 0SHIP.
// Run with: DATABASE_URL=... node scripts/apply_freeship_migration.mjs
//
// Uses @vercel/postgres which is already installed (this is what the
// app's `src/lib/db/index.ts` uses for its drizzle connection — same
// path through the connection string handling, no extra deps).
import { createPool } from "@vercel/postgres";

const url = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "")
  .replace(/\\n/g, "")
  .trim();
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// @vercel/postgres uses createPool for pooled (`-pooler.`) connection
// strings — Neon's recommended path. createClient is for direct (non-
// pooled) connections only.
const pool = createPool({ connectionString: url });

async function main() {
  console.log("Connecting via pool…");

  await pool.query(`
    ALTER TABLE coupons
    ADD COLUMN IF NOT EXISTS free_shipping boolean NOT NULL DEFAULT false
  `);
  console.log("Column free_shipping ensured.");

  const result = await pool.query(
    `
    INSERT INTO coupons (code, description, discount_type, free_shipping, is_active)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (code) DO UPDATE SET
      description = EXCLUDED.description,
      discount_type = EXCLUDED.discount_type,
      free_shipping = EXCLUDED.free_shipping,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
    RETURNING id, code, discount_type, free_shipping, is_active
    `,
    ["0SHIP", "Free shipping (zeroes the shipping line)", "free_shipping", true, true],
  );

  console.log("Coupon row:", result.rows[0]);

  const verify = await pool.query(
    "SELECT code, discount_type, free_shipping, is_active FROM coupons WHERE code = '0SHIP'",
  );
  console.log("Verify:", verify.rows[0]);

  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
