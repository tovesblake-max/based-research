import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, subscriptionEvents } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { captureEvent } from "@/lib/posthog";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["pause", "resume", "cancel", "update_frequency", "skip"]),
  frequency: z.number().optional(),
  pauseDays: z.number().optional(),
  cancelReason: z.string().optional(),
});

async function logEvent(subscriptionId: string, event: string, details?: Record<string, unknown>) {
  await db.insert(subscriptionEvents).values({ subscriptionId, event, details: details || {} }).catch((err) => console.warn("[subscriptions id-route]", err));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Verify subscription belongs to user
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
      .limit(1);

    if (!sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const { action } = parsed.data;
    const now = new Date();

    switch (action) {
      case "pause": {
        if (sub.status !== "active") {
          return NextResponse.json({ error: `Cannot pause a ${sub.status} subscription` }, { status: 400 });
        }
        const pauseDays = parsed.data.pauseDays || 30;
        const pausedUntil = new Date(now.getTime() + pauseDays * 24 * 60 * 60 * 1000);
        await db.update(subscriptions).set({
          status: "paused",
          pauseReason: "user",
          pausedUntil,
          updatedAt: now,
        }).where(eq(subscriptions.id, id));
        await logEvent(id, "paused", { pauseDays, pausedUntil: pausedUntil.toISOString(), reason: "user" });
        captureEvent({
          distinctId: user.id,
          event: "subscription_paused",
          properties: { subscriptionId: id, pauseDays, reason: "user" },
        }).catch((err) => console.warn("[subscriptions id-route]", err));
        return NextResponse.json({ message: `Subscription paused until ${pausedUntil.toLocaleDateString()}` });
      }

      case "resume": {
        if (sub.status !== "paused" && sub.status !== "payment_failed") {
          return NextResponse.json({ error: `Cannot resume a ${sub.status} subscription` }, { status: 400 });
        }
        const nextCharge = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        await db.update(subscriptions).set({
          status: "active",
          pauseReason: null,
          pausedUntil: null,
          retryCount: 0,
          nextChargeDate: nextCharge,
          updatedAt: now,
        }).where(eq(subscriptions.id, id));
        await logEvent(id, "resumed", { nextCharge: nextCharge.toISOString(), previousStatus: sub.status });
        captureEvent({
          distinctId: user.id,
          event: "subscription_resumed",
          properties: { subscriptionId: id, previousStatus: sub.status },
        }).catch((err) => console.warn("[subscriptions id-route]", err));
        return NextResponse.json({ message: "Subscription resumed. Next charge tomorrow." });
      }

      case "cancel": {
        if (sub.status === "cancelled") {
          return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
        }
        await db.update(subscriptions).set({
          status: "cancelled",
          cancelReason: parsed.data.cancelReason || null,
          processingAt: null,
          updatedAt: now,
        }).where(eq(subscriptions.id, id));
        await logEvent(id, "cancelled", { reason: parsed.data.cancelReason || "no reason given", previousStatus: sub.status });
        captureEvent({
          distinctId: user.id,
          event: "subscription_cancelled",
          properties: {
            subscriptionId: id,
            reason: parsed.data.cancelReason || "no reason given",
            previousStatus: sub.status,
            successfulCharges: sub.successfulCharges,
            daysActive: Math.floor((now.getTime() - new Date(sub.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          },
        }).catch((err) => console.warn("[subscriptions id-route]", err));
        return NextResponse.json({ message: "Subscription cancelled" });
      }

      case "update_frequency": {
        if (sub.status === "cancelled") {
          return NextResponse.json({ error: "Cannot modify a cancelled subscription" }, { status: 400 });
        }
        const freq = parsed.data.frequency;
        if (!freq || ![30, 60, 90].includes(freq)) {
          return NextResponse.json({ error: "Frequency must be 30, 60, or 90" }, { status: 400 });
        }
        const base = sub.lastChargedAt || sub.createdAt;
        const nextCharge = new Date(base.getTime() + freq * 24 * 60 * 60 * 1000);
        const finalDate = nextCharge > now ? nextCharge : new Date(now.getTime() + freq * 24 * 60 * 60 * 1000);
        await db.update(subscriptions).set({
          frequency: freq,
          nextChargeDate: finalDate,
          updatedAt: now,
        }).where(eq(subscriptions.id, id));
        await logEvent(id, "frequency_changed", { from: sub.frequency, to: freq, nextCharge: finalDate.toISOString() });
        return NextResponse.json({ message: `Frequency updated to every ${freq} days` });
      }

      case "skip": {
        if (sub.status !== "active") {
          return NextResponse.json({ error: "Can only skip active subscriptions" }, { status: 400 });
        }
        const newDate = new Date(sub.nextChargeDate.getTime() + sub.frequency * 24 * 60 * 60 * 1000);
        await db.update(subscriptions).set({
          nextChargeDate: newDate,
          updatedAt: now,
        }).where(eq(subscriptions.id, id));
        await logEvent(id, "skipped", { previousDate: sub.nextChargeDate.toISOString(), newDate: newDate.toISOString() });
        return NextResponse.json({ message: `Next order skipped. Next charge: ${newDate.toLocaleDateString()}` });
      }
    }
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Subscription Update]", error);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}
