import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, subscriptionItems, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { eq, and, between } from "drizzle-orm";

// Cron: send pre-charge reminder emails 3 days before next charge
export async function GET(request: Request) {
  // Fail closed on missing CRON_SECRET.
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    // Find active subscriptions charging in ~3 days
    const upcoming = await db
      .select({
        sub: subscriptions,
        email: users.email,
        firstName: users.firstName,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .where(
        and(
          eq(subscriptions.status, "active"),
          between(subscriptions.nextChargeDate, threeDaysFromNow, fourDaysFromNow)
        )
      );

    let sent = 0;

    for (const { sub, email, firstName } of upcoming) {
      // Skip subscriptions whose user has no email on file
      if (!email) {
        console.warn(`[Sub Reminder] Skipping ${sub.id}: user has no email`);
        continue;
      }
      try {
        const items = await db
          .select()
          .from(subscriptionItems)
          .where(eq(subscriptionItems.subscriptionId, sub.id));

        const itemList = items
          .map((i) => `${i.productName} (${i.variantSize}) x${i.quantity}`)
          .join(", ");

        const chargeDate = sub.nextChargeDate.toLocaleDateString("en-US", {
          weekday: "long", month: "long", day: "numeric",
        });

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://basedresearch.com";

        await sendEmail({
          to: email,
          subject: `Your subscription order ships ${chargeDate}`,
          meta: { template: "subscription_pre_charge_reminder", userId: sub.userId },
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
              <h1 style="font-size: 22px; color: #1a1a19; margin-bottom: 8px;">Based Research</h1>
              <h2 style="font-size: 18px; color: #1a1a19; margin-bottom: 16px;">Upcoming Subscription Order</h2>
              <p style="font-size: 15px; color: #737373; line-height: 1.6;">
                Hi ${firstName || "there"}, your next auto-ship order is scheduled for <strong style="color: #1a1a19;">${chargeDate}</strong>.
              </p>
              <div style="background: #f5f5f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="font-size: 14px; color: #1a1a19; margin: 0 0 4px;"><strong>Items:</strong> ${itemList}</p>
                <p style="font-size: 14px; color: #1a1a19; margin: 4px 0 0;">
                  <strong>Discount:</strong> ${sub.discountPercent}% Subscribe & Save
                </p>
              </div>
              <p style="font-size: 14px; color: #737373; line-height: 1.6; margin-bottom: 24px;">
                Need to make changes? You can skip, modify, or update your subscription anytime.
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${siteUrl}/account/subscriptions" style="display: inline-block; background-color: #1E3A5F; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                  Manage Subscription
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
              <p style="font-size: 11px; color: #999; text-align: center;">
                Based Research · Research-Grade Peptides
              </p>
            </div>
          `,
        });

        sent++;
      } catch (err) {
        console.error(`[Sub Reminder] Failed for ${sub.id}:`, err);
      }
    }

    // Heartbeat — ping dead-man's-switch so we learn if reminders stop.
    if (process.env.HEARTBEAT_URL_SUBSCRIPTION_REMINDERS) {
      fetch(process.env.HEARTBEAT_URL_SUBSCRIPTION_REMINDERS).catch((err) => console.warn("[cron subscription-reminders heartbeat]", err));
    }

    return NextResponse.json({ found: upcoming.length, sent });
  } catch (error) {
    console.error("[Sub Reminder]", error);
    return NextResponse.json({ error: "Reminder cron failed" }, { status: 500 });
  }
}
