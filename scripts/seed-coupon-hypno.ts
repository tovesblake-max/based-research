// Seed the HYPNO coupon — $70 off any cart containing GLP-3 RTA.
// Idempotent: running twice leaves a single row.
//
//   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-coupon-hypno.ts

import { db } from "../src/lib/db";
import { coupons } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const code = "HYPNO";

  const [existing] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, code))
    .limit(1);

  if (existing) {
    console.log(`Coupon ${code} already exists (id: ${existing.id}).`);
    console.log("Updating values to match seed...");
    await db
      .update(coupons)
      .set({
        description: "$70 off GLP-3 RTA",
        discountType: "fixed_amount",
        discountCents: 7000,
        discountPercent: null,
        appliesTo: ["glp3-rta"],
        minSubtotalCents: null,
        maxRedemptions: null,
        maxPerUser: null,
        validFrom: null,
        validUntil: null,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(coupons.id, existing.id));
    console.log("Updated.");
    return;
  }

  const [created] = await db
    .insert(coupons)
    .values({
      code,
      description: "$70 off GLP-3 RTA",
      discountType: "fixed_amount",
      discountCents: 7000,
      appliesTo: ["glp3-rta"],
      isActive: true,
    })
    .returning();

  console.log(`Created coupon ${code} (id: ${created.id}).`);
  console.log(`  $70 off any cart that contains GLP-3 RTA (slug: glp3-rta)`);
  console.log(`  Unlimited redemptions, unlimited per-user`);
  console.log(`  Test URL: POST /api/coupons/validate with { code: "HYPNO", items: [...] }`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
