import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding fraud_score + fraud_signals to orders...");
  await db.execute(sql`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS fraud_score integer,
      ADD COLUMN IF NOT EXISTS fraud_signals text[]
  `);
  console.log("  ✓ columns added");
  await db.execute(sql`CREATE INDEX IF NOT EXISTS orders_fraud_idx ON orders(fraud_score) WHERE fraud_score IS NOT NULL`);
  console.log("  ✓ index added");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
