export function getShipEstimate() {
  const now = new Date();
  const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = est.getDay();
  const hour = est.getHours();
  const minute = est.getMinutes();

  const isWeekday = day >= 1 && day <= 5;
  const beforeCutoff = hour < 14;

  if (isWeekday && beforeCutoff) {
    const remaining = (14 - hour - 1) * 60 + (60 - minute);
    const hrs = Math.floor(remaining / 60);
    const mins = remaining % 60;
    return { sameDay: true, hrs, mins, shipDay: "today" };
  }

  // Calculate next business day
  let daysUntil = 1;
  let nextDay = (day + 1) % 7;
  while (nextDay === 0 || nextDay === 6) {
    daysUntil++;
    nextDay = (nextDay + 1) % 7;
  }
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return { sameDay: false, hrs: 0, mins: 0, shipDay: days[nextDay] };
}

// ── Delivery timeline (PDP "when does this arrive?" widget) ──
//
// Computes the three milestones the customer sees on the product page:
//   1. PURCHASED      → today (in ET)
//   2. PROCESSING     → today through ship date (warehouse pick/pack window)
//   3. DELIVERED      → ship date + 2 business days through ship date + 4
//                       business days. UPS 2nd Day Air has a 2-day SLA
//                       from pickup; the +4 day tail covers weather/route
//                       delays so the customer never feels misled.
//
// All dates are computed relative to America/New_York (matches the 2pm
// ET shipping cutoff used in `getShipEstimate`). Output is plain Date
// objects so the UI can format however it wants.

function isBusinessDay(d: Date): boolean {
  const wd = d.getDay();
  return wd >= 1 && wd <= 5;
}

function addBusinessDays(start: Date, n: number): Date {
  const out = new Date(start);
  let added = 0;
  while (added < n) {
    out.setDate(out.getDate() + 1);
    if (isBusinessDay(out)) added++;
  }
  return out;
}

export interface DeliveryTimeline {
  purchasedDate: Date;       // today (ET wall clock, midnight)
  shipDate: Date;            // either purchasedDate or next business day
  processingStart: Date;     // = purchasedDate (warehouse handling starts immediately)
  processingEnd: Date;       // = shipDate (handoff to carrier)
  arrivalEarliest: Date;     // ship + 2 business days
  arrivalLatest: Date;       // ship + 4 business days (delivery buffer)
  sameDayShip: boolean;      // weekday + before 2pm ET
}

export function getDeliveryTimeline(): DeliveryTimeline {
  const now = new Date();
  // Anchor everything to ET — shipping cutoff is ET, warehouse is ET.
  const etNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const purchasedDate = new Date(etNow.getFullYear(), etNow.getMonth(), etNow.getDate());

  const isWeekday = isBusinessDay(etNow);
  const beforeCutoff = etNow.getHours() < 14;
  const sameDayShip = isWeekday && beforeCutoff;

  // Ship date = today if we make the cutoff, else next business day
  let shipDate: Date;
  if (sameDayShip) {
    shipDate = new Date(purchasedDate);
  } else {
    shipDate = addBusinessDays(purchasedDate, 1);
  }

  const arrivalEarliest = addBusinessDays(shipDate, 2);
  const arrivalLatest = addBusinessDays(shipDate, 4);

  return {
    purchasedDate,
    shipDate,
    processingStart: purchasedDate,
    processingEnd: shipDate,
    arrivalEarliest,
    arrivalLatest,
    sameDayShip,
  };
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format a Date as "May 4" — month short name + numeric day. */
export function formatShortDate(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** Format a date range as "May 4 – May 6" (en dash, no comma). Single
 *  date if start == end. */
export function formatDateRange(start: Date, end: Date): string {
  const a = formatShortDate(start);
  const b = formatShortDate(end);
  if (a === b) return a;
  return `${a} – ${b}`;
}
