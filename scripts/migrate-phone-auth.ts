/**
 * One-off migration: add phone_verified column + unique constraint on phone.
 * Run with: npx dotenv-cli -e .env.local -- npx tsx scripts/migrate-phone-auth.ts
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding phone_verified column...");
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false
  `);
  console.log("  ✓ phone_verified added");

  console.log("Adding unique constraint on phone (nulls allowed)...");
  // Postgres treats NULL as distinct in unique constraints by default, so
  // multiple users with NULL phone is fine.
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_unique'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_phone_unique UNIQUE (phone);
      END IF;
    END $$
  `);
  console.log("  ✓ unique constraint on phone added");

  console.log("Adding phone index...");
  await db.execute(sql`CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone)`);
  console.log("  ✓ users_phone_idx added");

  console.log("\nMigration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
