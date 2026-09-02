// A film's watch log: every viewing with the day it happened on.
//
// `completed_at` holds one timestamp, so a film could only ever be on the
// calendar once. A second viewing had nowhere to put its date - it counted, and
// it was invisible to every streak - and removing the one dated watch left the
// rest reading as "watched, day unknown", which is a claim the user never made.
//
// So films get what episodes already have (lib/episodes): an array of stamps,
// oldest first, and it is the source of truth. `completed_at` survives as the
// *latest* of them - the ordering everything else already reads (recently
// logged, ranked years, duplicate merge) - and is written on every save.
//
// Pure (doc 10). A series keeps its dated passes in the episode log; this is
// films only, which is why nothing here knows about types.

/** Read boundary for the jsonb column: anything unparseable drops out. */
export function normalizeWatchDates(raw: unknown, completedAt?: string | null): string[] {
  const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  const stamps = values
    .map((value) => (typeof value === 'number' ? new Date(value).toISOString() : value))
    .filter((value): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)));

  // A row written before the log existed carries its one date in completed_at,
  // so the log reads as that single watch rather than as none.
  if (stamps.length === 0 && completedAt && Number.isFinite(Date.parse(completedAt))) return [completedAt];

  return sortStamps(stamps);
}

function sortStamps(stamps: string[]): string[] {
  return [...stamps].sort((a, b) => Date.parse(a) - Date.parse(b));
}

/** The stamp `completed_at` should carry: the most recent watch, or none. */
export function latestWatch(dates: string[]): string | null {
  return dates.length === 0 ? null : dates[dates.length - 1];
}

/** Append one watch. */
export function logWatch(dates: string[], iso: string): string[] {
  return Number.isFinite(Date.parse(iso)) ? sortStamps([...dates, iso]) : dates;
}

/** Drop one watch - the given stamp, or the newest when none is named. */
export function unlogWatch(dates: string[], iso?: string): string[] {
  if (dates.length === 0) return dates;
  const index = iso ? dates.indexOf(iso) : dates.length - 1;
  if (index < 0) return dates;
  return [...dates.slice(0, index), ...dates.slice(index + 1)];
}

/** Every watch logged on one local day - what a calendar square is made of. */
export function watchesOnDay(dates: string[], dayKey: string, keyOf: (iso: string) => string): string[] {
  return dates.filter((stamp) => keyOf(stamp) === dayKey);
}

/**
 * The log grown or trimmed to the number of dated watches a save asks for.
 *
 * The count is typed on the status stepper and the dates are not, so the two
 * have to be reconciled somewhere: a watch added without a date is one that
 * happened now, and a watch removed takes the newest date with it. Undated
 * watches are counted elsewhere and never reach this (lib/watchCounts).
 */
export function resizeWatchLog(dates: string[], dated: number, nowIso: string): string[] {
  const target = Math.max(0, dated);
  if (dates.length === target) return dates;

  let next = [...dates];
  while (next.length > target) next = unlogWatch(next);
  while (next.length < target) next = logWatch(next, nowIso);
  return next;
}
