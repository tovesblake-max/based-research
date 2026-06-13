"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Truck, MapPin } from "lucide-react";
import {
  getDeliveryTimeline,
  formatShortDate,
  formatDateRange,
  type DeliveryTimeline as TimelineData,
} from "@/lib/shipping";

// PDP "when does this arrive?" widget. Three milestones (Purchased →
// Processing → Delivered) connected by lines, with a one-line summary
// above ("Orders placed today are expected to arrive Month D – Month
// D."). Recomputes once a minute so the dates stay accurate even if
// the customer leaves the tab open across the 2pm ET cutoff.
export default function DeliveryTimeline() {
  const [timeline, setTimeline] = useState<TimelineData | null>(null);

  useEffect(() => {
    setTimeline(getDeliveryTimeline());
    const id = window.setInterval(() => setTimeline(getDeliveryTimeline()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!timeline) {
    // SSR + first paint — render a stable skeleton matching the final
    // height so the page doesn't jump when the client hydrates.
    return <div className="h-[148px] bg-accent/30 rounded-xl border border-border" aria-hidden="true" />;
  }

  const arrivalRange = formatDateRange(timeline.arrivalEarliest, timeline.arrivalLatest);
  const processingRange = formatDateRange(timeline.processingStart, timeline.processingEnd);
  const purchasedDate = formatShortDate(timeline.purchasedDate);

  return (
    <div className="text-sm">
      <p className="text-muted mb-3">
        Orders placed today are expected to arrive{" "}
        <strong className="text-foreground">{arrivalRange}</strong>.
      </p>

      <div className="bg-accent/30 rounded-xl border border-border p-5">
        <div className="grid grid-cols-3 items-start gap-2">
          <Milestone icon={<ShoppingBag className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />} label="Purchased" date={purchasedDate} />
          <Milestone icon={<Truck className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />} label="Processing" date={processingRange} />
          <Milestone icon={<MapPin className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />} label="Delivered" date={arrivalRange} />
        </div>

        {/* Connector lines — absolutely positioned over the icon row.
            We use a flex layout below the grid so the lines align with
            the icon centers regardless of label-text length. */}
        <div className="relative -mt-[58px] h-px pointer-events-none" aria-hidden="true">
          <div className="absolute inset-x-0 flex items-center">
            <div className="w-1/6" />
            <div className="flex-1 flex items-center">
              <span className="block w-1.5 h-1.5 rounded-full bg-foreground" />
              <span className="block flex-1 h-px bg-foreground" />
              <span className="block w-1.5 h-1.5 rounded-full bg-foreground" />
            </div>
            <div className="flex-1 flex items-center">
              <span className="block w-1.5 h-1.5 rounded-full bg-foreground" />
              <span className="block flex-1 h-px bg-foreground" />
              <span className="block w-1.5 h-1.5 rounded-full bg-foreground" />
            </div>
            <div className="w-1/6" />
          </div>
        </div>
        {/* Spacer to restore the original height after the negative-margin
            connector overlay. The connector takes 0 layout space; we
            subtracted 58px to position it, so add it back here. */}
        <div className="h-[58px] -mt-px" aria-hidden="true" />
      </div>
    </div>
  );
}

function Milestone({
  icon,
  label,
  date,
}: {
  icon: React.ReactNode;
  label: string;
  date: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-1.5">
      <div className="text-foreground">{icon}</div>
      <p className="font-semibold text-foreground text-[13px]">{label}</p>
      <p className="text-[12px] text-muted">{date}</p>
    </div>
  );
}
