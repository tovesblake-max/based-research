// Day/month boundary helpers anchored to the business operating timezone.
//
// Vercel functions run in UTC, so naive `new Date(now.getFullYear(), …)`
// arithmetic buckets orders by UTC days. That puts the "today vs yesterday"
// rollover at 7pm Central (CDT) or 6pm Central (CST), so evening orders
// from the prior local day leak into "Today's Revenue" until UTC midnight
// catches up with Central. These helpers compute UTC instants that
// correspond to wall-clock midnight (or the 1st of the month) in the
// business timezone, DST included.

export const BUSINESS_TZ = "America/Chicago"; // 

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

interface BusinessParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  hour: number;  // 0-23
  minute: number;
  second: number;
}

export function businessPartsOf(d: Date): BusinessParts {
  const p = partsFormatter.formatToParts(d);
  const v = (t: Intl.DateTimeFormatPartTypes) =>
    Number(p.find((x) => x.type === t)!.value);
  // Some engines emit "24" at midnight when hour12=false; fold it back.
  return {
    year: v("year"),
    month: v("month"),
    day: v("day"),
    hour: v("hour") % 24,
    minute: v("minute"),
    second: v("second"),
  };
}

/**
 * Resolve the UTC instant whose wall-clock reading in BUSINESS_TZ is the
 * given components. Two iterations are enough to converge across DST
 * transitions: the first guess uses the raw components as if they were
 * UTC; the second corrects by the offset observed at that instant.
 *
 * Day/month overflow follows JS Date semantics (month -1 wraps to the
 * prior December, day 32 rolls into next month, etc.). The previous
 * /api/admin/stats arithmetic relied on the same overflow, so this
 * preserves that behavior.
 */
export function businessWallTimeToUtc(
  year: number,
  month: number, // 1-12 (matches BusinessParts)
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  for (let i = 0; i < 2; i++) {
    const at = businessPartsOf(guess);
    const target = Date.UTC(year, month - 1, day, hour, minute, second);
    const observed = Date.UTC(
      at.year,
      at.month - 1,
      at.day,
      at.hour,
      at.minute,
      at.second,
    );
    const delta = target - observed;
    if (delta === 0) break;
    guess = new Date(guess.getTime() + delta);
  }
  return guess;
}
