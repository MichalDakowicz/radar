import type { Movie } from '@/types/movie';

// Period identity for a recap: which window it covers, how it is keyed in
// Supabase, and how it is named on screen. Pure — the builders in lib/recap*.ts
// and the storage hook both read these, so a key can only ever mean one range.

export type RecapKind = 'month' | 'year';

/** `2026-07` for a month, `2026` for a year. Sorts chronologically as a string. */
export type RecapPeriodKey = string;

export type RecapPeriod = { kind: RecapKind; key: RecapPeriodKey };

const MONTH_NAMES = [
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

export function monthKey(date: Date): RecapPeriodKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function yearKey(date: Date): RecapPeriodKey {
  return String(date.getFullYear());
}

export function periodKey(kind: RecapKind, date: Date): RecapPeriodKey {
  return kind === 'month' ? monthKey(date) : yearKey(date);
}

/** True when the key is well-formed for its kind. Guards the route params. */
export function isValidPeriodKey(kind: RecapKind, key: string): boolean {
  if (kind === 'year') return /^\d{4}$/.test(key);
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

/** Half-open [start, end): end is the first instant of the following period. */
export function periodRange(kind: RecapKind, key: RecapPeriodKey): { start: Date; end: Date } {
  if (kind === 'year') {
    const year = Number(key);
    return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
  }
  const [year, month] = key.split('-').map(Number);
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

/** The period one step back — `2026-01` → `2025-12`, `2026` → `2025`. */
export function previousPeriodKey(kind: RecapKind, key: RecapPeriodKey): RecapPeriodKey {
  const { start } = periodRange(kind, key);
  const previous = kind === 'year' ? new Date(start.getFullYear() - 1, 0, 1) : new Date(start.getFullYear(), start.getMonth() - 1, 1);
  return periodKey(kind, previous);
}

/** "July 2026" / "2026". */
export function periodLabel(kind: RecapKind, key: RecapPeriodKey): string {
  if (kind === 'year') return key;
  const { start } = periodRange(kind, key);
  return `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
}

/** Just the month name, uppercased for the cover — "JULY". Years give the year. */
export function periodDisplayName(kind: RecapKind, key: RecapPeriodKey): string {
  if (kind === 'year') return key;
  return MONTH_NAMES[periodRange(kind, key).start.getMonth()].toUpperCase();
}

/** "JUL" — the short axis label the comparison bars use. */
export function periodShortName(kind: RecapKind, key: RecapPeriodKey): string {
  if (kind === 'year') return key;
  return MONTH_NAMES[periodRange(kind, key).start.getMonth()].slice(0, 3).toUpperCase();
}

export function monthName(index: number): string {
  return MONTH_NAMES[index] ?? '';
}

/** Every timestamp that counts as watch activity, as local dates. */
function watchDates(movie: Movie): Date[] {
  const dates: Date[] = [];
  if (movie.completedAt) dates.push(new Date(movie.completedAt));
  for (const timestamp of Object.values(movie.episodeWatchDates || {})) dates.push(new Date(timestamp));
  return dates.filter((d) => Number.isFinite(d.getTime()));
}

/**
 * Periods a recap can actually be built for, newest first: the ones with watch
 * activity in them. A month with nothing in it gets no card rather than a card
 * full of zeros. The current period is always offered once it has any activity,
 * which is what makes a recap watchable before the month is over.
 */
export function availablePeriods(movies: Movie[], kind: RecapKind): RecapPeriodKey[] {
  const keys = new Set<RecapPeriodKey>();
  for (const movie of movies) {
    for (const date of watchDates(movie)) keys.add(periodKey(kind, date));
  }
  return [...keys].sort().reverse();
}

/**
 * Which month keys survive retention: the current month and the one before it.
 * Years are all kept, so this only ever narrows months — the archive is a
 * yearly record, and a stale monthly hype reel is not worth the row.
 */
export function retainedMonthKeys(now: Date = new Date()): RecapPeriodKey[] {
  const current = monthKey(now);
  return [current, previousPeriodKey('month', current)];
}
