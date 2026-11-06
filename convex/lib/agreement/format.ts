/**
 * Loan agreement — formatting and Namibian calendar helpers.
 *
 * Deliberately dependency-free so the browser can import it: `merge.ts` pulls in the
 * amortization engine, whose import chain reaches Convex function definitions, which
 * should not be bundled into the client. `merge.ts` re-exports everything here.
 */

// ---------------------------------------------------------------------------
// Deterministic formatting
// ---------------------------------------------------------------------------

/**
 * `N$1,234.56` from integer cents. Deliberately not `toLocaleString`: the output is
 * hashed into a legal record, so it must not depend on the ICU data of whichever
 * runtime (V8 isolate, Node action, browser) happens to format it.
 */
export function formatNadCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}N$${whole}.${String(abs % 100).padStart(2, '0')}`;
}

/** Same rounding as amortization.toCents, so the two can never disagree. */
export const formatNad = (nad: number): string => formatNadCents(Math.round(nad * 100));

// ---------------------------------------------------------------------------
// Namibian calendar dates (UTC+2, no DST since 2017)
// ---------------------------------------------------------------------------

const WINDHOEK_OFFSET_MS = 2 * 60 * 60 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Calendar date in Windhoek for a UTC timestamp, as YYYY-MM-DD. */
export function namibianDate(timestamp: number): string {
  return new Date(timestamp + WINDHOEK_OFFSET_MS).toISOString().slice(0, 10);
}

export function isIsoDate(value: string | undefined | null): value is string {
  if (!value || !ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Add calendar months, clamping to the last day of a shorter month: 31 Jan + 1 month
 * is 28/29 Feb, not 2/3 March. JavaScript's `setMonth` overflows instead, which would
 * silently move a borrower's due date into the following month.
 */
export function addMonthsClamped(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)
  ).getUTCDate();
  first.setUTCDate(Math.min(d, lastDay));
  return first.toISOString().slice(0, 10);
}

/** 12:00 Windhoek on the given date — renders as that date in any timezone ±10h. */
export function middayWindhoekMs(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 10, 0, 0);
}

export function formatLongDate(isoDate: string): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}
