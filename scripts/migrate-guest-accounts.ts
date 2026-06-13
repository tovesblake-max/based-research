/**
 * Guest account migration:
 *   1. Make email nullable
 *   2. Convert placeholder "phone+...@phone.basedresearch.com" emails to NULL
 *
 * Run: npx dotenv-cli -e .env.local -- npx tsx scripts/migrate-guest-accounts.ts
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("1. Dropping NOT NULL on users.email...");
  await db.execute(sql`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`);
  console.log("   ✓ email is now nullable");

  console.log("2. Converting placeholder @phone.basedresearch.com emails to NULL...");
  const result = await db.execute(sql`
    UPDATE users
    SET email = NULL
    WHERE email LIKE '%@phone.basedresearch.com'
  `);
  console.log(`   ✓ updated ${result.rowCount ?? 0} placeholder emails to NULL`);

  console.log("\nMigration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
