// Which weekly threshold a past week was measured against.
//
// The streak thresholds (movies / episodes per week) used to be one number applied
// to the whole history, so raising it from 2 to 4 quietly broke every old week
// that had managed only 2 or 3. Changing it now asks whether the new number is for
// "from now on" or for the whole history, and "from now on" needs somewhere to
// remember what the earlier weeks were measured against - this.
//
// The history stores only the *past* values. The current threshold stays where it
// always was (user_settings.streak_threshold), so a row with no history behaves
// exactly as before: every week uses the current number.
//
// Pure (doc 10): the settings hook persists it, lib/stats reads it.

export type ThresholdKind = 'movie' | 'tv';

/** Weeks that start before `before` (a Monday, `YYYY-MM-DD`) were measured against `threshold`. */
export type ThresholdStep = { before: string; threshold: number };

export type ThresholdHistory = Record<ThresholdKind, ThresholdStep[]>;

/** How far a threshold change reaches back. */
export type ThresholdScope = 'from-now' | 'whole-history';

export const EMPTY_THRESHOLD_HISTORY: ThresholdHistory = { movie: [], tv: [] };

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function normalizeSteps(raw: unknown): ThresholdStep[] {
  if (!Array.isArray(raw)) return [];
  const steps: ThresholdStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { before, threshold } = item as Record<string, unknown>;
    if (typeof before !== 'string' || !DAY_KEY.test(before)) continue;
    if (typeof threshold !== 'number' || !Number.isInteger(threshold) || threshold < 1) continue;
    steps.push({ before, threshold });
  }
  return steps.sort((a, b) => (a.before < b.before ? -1 : a.before > b.before ? 1 : 0));
}

/**
 * Reads whatever the column holds. A row from before the migration has no column
 * at all, and a hand-edited one can hold anything; both read as "no history",
 * which is the old single-number behaviour.
 */
export function normalizeThresholdHistory(raw: unknown): ThresholdHistory {
  if (!raw || typeof raw !== 'object') return EMPTY_THRESHOLD_HISTORY;
  const { movie, tv } = raw as Record<string, unknown>;
  const history = { movie: normalizeSteps(movie), tv: normalizeSteps(tv) };
  return history.movie.length === 0 && history.tv.length === 0 ? EMPTY_THRESHOLD_HISTORY : history;
}

/** The threshold the week starting `weekKey` (a Monday, `YYYY-MM-DD`) is measured against. */
export function thresholdForWeek(weekKey: string, current: number, steps: ThresholdStep[]): number {
  for (const step of steps) {
    if (weekKey < step.before) return step.threshold;
  }
  return current;
}

/** What one threshold is being changed from and to. */
export type ThresholdChange = { previous: number; next: number };

/**
 * The history after the movie and/or TV threshold is changed in one go. A kind
 * whose number did not actually move is left alone.
 */
export function applyThresholdChanges(
  history: ThresholdHistory,
  changes: Partial<Record<ThresholdKind, ThresholdChange>>,
  scope: ThresholdScope,
  weekKey: string,
): ThresholdHistory {
  let out = history;
  for (const kind of ['movie', 'tv'] as const) {
    const change = changes[kind];
    if (change && change.previous !== change.next) out = changeThreshold(out, kind, change.previous, scope, weekKey);
  }
  return out;
}

/**
 * The history after one threshold changes from `previous` to something else.
 *
 * "Whole history" forgets every step for that kind: all weeks, past included, are
 * measured against the new number. "From now on" files `previous` against every
 * week before `weekKey` (the Monday of the week the change is made in) - unless
 * that Monday is already a boundary, in which case the weeks before it are
 * already accounted for and a second step would cover no weeks at all.
 */
export function changeThreshold(
  history: ThresholdHistory,
  kind: ThresholdKind,
  previous: number,
  scope: ThresholdScope,
  weekKey: string,
): ThresholdHistory {
  const steps = history[kind];
  if (scope === 'whole-history') {
    return steps.length === 0 ? history : { ...history, [kind]: [] };
  }
  const last = steps[steps.length - 1];
  if (last && last.before >= weekKey) return history;
  return { ...history, [kind]: [...steps, { before: weekKey, threshold: previous }] };
}
