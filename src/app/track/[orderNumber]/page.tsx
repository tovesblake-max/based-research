"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Package, Truck, MapPin, CheckCircle, AlertTriangle, Clock, ArrowLeft } from "lucide-react";

interface TrackingEvent {
  status: string;
  statusMilestone: string;
  location: string;
  timestamp: string;
}

interface TrackingData {
  orderNumber: string;
  trackingNumber: string;
  trackingCarrier: string;
  trackingMilestone: string;
  trackingLastEvent: string;
  status: string;
  deliveredAt: string | null;
  createdAt: string;
  events: TrackingEvent[];
}

const milestoneSteps = [
  { key: "confirmed", label: "Order Confirmed", icon: CheckCircle },
  { key: "shipped", label: "Shipped", icon: Package },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: MapPin },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

function getMilestoneIndex(milestone: string, orderStatus: string): number {
  if (orderStatus === "delivered" || milestone === "delivered") return 4;
  if (milestone === "out_for_delivery") return 3;
  if (milestone === "in_transit") return 2;
  if (orderStatus === "shipped") return 1;
  return 0;
}

export default function TrackingPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/track/${orderNumber}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load tracking info"))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-10 h-10 text-muted mx-auto mb-4" />
        <h1 className="font-serif text-2xl text-foreground mb-2">Order Not Found</h1>
        <p className="text-muted text-sm mb-6">{error || "We couldn't find tracking info for this order."}</p>
        <Link href="/contact" className="text-primary text-sm hover:underline">Contact Support</Link>
      </div>
    );
  }

  const currentStep = getMilestoneIndex(data.trackingMilestone || "", data.status);
  const isException = data.trackingMilestone === "exception";

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </Link>

      <h1 className="font-serif text-2xl text-foreground mb-1">Track Your Order</h1>
      <p className="text-muted text-sm mb-8">
        Order <span className="font-mono text-foreground">{data.orderNumber}</span>
        {data.trackingNumber && <> · Tracking <span className="font-mono text-foreground">{data.trackingNumber}</span></>}
        {data.trackingCarrier && <> · {data.trackingCarrier.toUpperCase()}</>}
      </p>

      {/* Progress Bar */}
      {!isException && (
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            {/* Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" aria-hidden="true" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
              style={{ width: `${(currentStep / (milestoneSteps.length - 1)) * 100}%` }}
              aria-hidden="true"
            />

            {milestoneSteps.map((step, i) => {
              const Icon = step.icon;
              const isActive = i <= currentStep;
              const isCurrent = i === currentStep;
              return (
                <div key={step.key} className="relative flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-accent text-muted border-2 border-border"
                  } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}>
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <span className={`text-[11px] mt-2 text-center ${isActive ? "text-foreground font-medium" : "text-muted"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exception alert */}
      {isException && (
        <div className="mb-8 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Shipping Exception</p>
            <p className="text-xs text-muted mt-1">{data.trackingLastEvent || "There's an issue with your shipment. Please contact support."}</p>
          </div>
        </div>
      )}

      {/* Current Status */}
      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">Current Status</p>
        <p className="text-lg font-medium text-foreground">
          {data.status === "delivered" ? "Delivered" :
           data.trackingMilestone === "out_for_delivery" ? "Out for Delivery" :
           data.trackingMilestone === "in_transit" ? "In Transit" :
           data.status === "shipped" ? "Shipped" : "Processing"}
        </p>
        {data.trackingLastEvent && (
          <p className="text-sm text-muted mt-1">{data.trackingLastEvent}</p>
        )}
        {data.deliveredAt && (
          <p className="text-xs text-success mt-2">
            Delivered on {new Date(data.deliveredAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        )}
      </div>

      {/* Event Timeline */}
      {data.events && data.events.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Tracking History</h2>
          </div>
          <div className="divide-y divide-border/50">
            {data.events.map((event, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  event.statusMilestone === "delivered" ? "bg-success" :
                  event.statusMilestone === "exception" ? "bg-destructive" :
                  i === 0 ? "bg-primary" : "bg-border"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{event.status}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {event.location && <span className="text-xs text-muted">{event.location}</span>}
                    {event.timestamp && (
                      <span className="text-xs text-muted">
                        {new Date(event.timestamp).toLocaleString("en-US", {
                          month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
