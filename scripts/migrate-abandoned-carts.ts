import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating abandoned_carts table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS abandoned_carts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      email_lower varchar(255) NOT NULL,
      items jsonb NOT NULL,
      subtotal integer NOT NULL,
      stage integer NOT NULL DEFAULT 0,
      recovery_token varchar(64) NOT NULL UNIQUE,
      converted_at timestamp,
      last_email_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  console.log("  ✓ table created");

  await db.execute(sql`CREATE INDEX IF NOT EXISTS abandoned_carts_email_idx ON abandoned_carts(email_lower)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS abandoned_carts_stage_idx ON abandoned_carts(stage)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS abandoned_carts_updated_idx ON abandoned_carts(updated_at)`);
  console.log("  ✓ indexes created");
  console.log("\nDone.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
