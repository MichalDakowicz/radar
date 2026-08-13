// One episode, watched more than once.
//
// `episode_watch_dates` used to hold a single stamp per episode key, so a
// rewatch had nowhere to go: the tracker was a tick-box and the second viewing
// was invisible to the TV streak, to hours watched and to recaps. It is now a
// *log* — an array of stamps per key — and that log is the single source of
// truth: count(key) = dates.length, watched(key) = count > 0.
//
// `episodes_watched` survives as a derived mirror, written on every save. The
// friend-shelf query selects that column directly (features/social/
// useFriendActivity) and older rows still only carry it, so every helper here
// falls back to it: a key ticked with no stamps reads as one watch.

/** `{ "s1e1": ["2026-08-01T…", "2026-08-13T…"] }` — oldest stamp first. */
export type EpisodeWatchLog = Record<string, string[]>;

/** What a helper needs to answer a question about episodes. */
export type EpisodeSource = {
  episodeWatchDates?: Record<string, string[] | string | number> | null;
  episodesWatched?: Record<string, boolean> | null;
  numberOfEpisodes?: number | null;
  number_of_episodes?: number;
};

function toStamp(value: unknown): string | null {
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  if (typeof value !== 'string' || value === '') return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function sortStamps(stamps: string[]): string[] {
  return [...stamps].sort((a, b) => Date.parse(a) - Date.parse(b));
}

/**
 * The read boundary for the jsonb column: a bare string becomes `[string]`, a
 * legacy epoch number becomes its ISO form, a missing or unparseable value
 * drops out. Keys that end up with no stamps are removed, so "the log has this
 * key" and "this episode has been watched" are the same statement.
 */
export function normalizeEpisodeWatchDates(raw: unknown): EpisodeWatchLog {
  if (!raw || typeof raw !== 'object') return {};
  const log: EpisodeWatchLog = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const stamps = (Array.isArray(value) ? value : [value]).map(toStamp).filter((s): s is string => s !== null);
    if (stamps.length > 0) log[key] = sortStamps(stamps);
  }
  return log;
}

function logOf(source: EpisodeSource): EpisodeWatchLog {
  return normalizeEpisodeWatchDates(source.episodeWatchDates);
}

/** Every episode key with at least one watch, log and legacy mirror together. */
export function watchedEpisodeKeys(source: EpisodeSource): string[] {
  const keys = new Set(Object.keys(logOf(source)));
  for (const [key, ticked] of Object.entries(source.episodesWatched ?? {})) {
    if (ticked) keys.add(key);
  }
  return [...keys];
}

/** Stamps for one episode, oldest first. Empty when it has never been watched. */
export function episodeWatchLog(source: EpisodeSource, key: string): string[] {
  return logOf(source)[key] ?? [];
}

/** How many times this episode was watched. A dateless legacy tick counts once. */
export function episodeWatchCount(source: EpisodeSource, key: string): number {
  const stamps = logOf(source)[key];
  if (stamps?.length) return stamps.length;
  return source.episodesWatched?.[key] ? 1 : 0;
}

/** Every watch of every episode, counting rewatches — what hours watched bills. */
export function totalEpisodeWatches(source: EpisodeSource): number {
  return watchedEpisodeKeys(source).reduce((total, key) => total + episodeWatchCount(source, key), 0);
}

/** Distinct episodes seen at least once — what a progress bar measures. */
export function watchedEpisodeCount(source: EpisodeSource): number {
  return watchedEpisodeKeys(source).length;
}

/** Every stamp in the log, unsorted — the calendars and recaps bucket these. */
export function allEpisodeStamps(source: EpisodeSource): string[] {
  return Object.values(logOf(source)).flat();
}

/**
 * How many times the *show* has been watched, derived rather than typed in:
 * the minimum count across every episode TMDB knows about. All 62 at 2 → the
 * show is watched twice; any episode at 0 → not fully watched, so 0. Episodes
 * TMDB lists but the log has no key for count as 0, which is what stops a
 * partial rewatch inflating the figure.
 */
export function showWatchCount(source: EpisodeSource): number {
  const keys = watchedEpisodeKeys(source);
  if (keys.length === 0) return 0;

  const total = source.numberOfEpisodes || source.number_of_episodes || 0;
  // An unticked episode is an episode at zero, and the minimum of a set
  // containing zero is zero.
  if (total > 0 && keys.length < total) return 0;

  return Math.min(...keys.map((key) => episodeWatchCount(source, key)));
}

/** Append one watch. */
export function logEpisodeWatch(log: EpisodeWatchLog, key: string, iso: string): EpisodeWatchLog {
  const stamp = toStamp(iso);
  if (!stamp) return log;
  return { ...log, [key]: sortStamps([...(log[key] ?? []), stamp]) };
}

/**
 * Drop one watch — the given stamp, or the latest when none is named. The key
 * disappears with its last stamp, which is what unwatches the episode.
 */
export function unlogEpisodeWatch(log: EpisodeWatchLog, key: string, iso?: string): EpisodeWatchLog {
  const stamps = log[key];
  if (!stamps || stamps.length === 0) return log;

  const index = iso ? stamps.indexOf(iso) : stamps.length - 1;
  if (index < 0) return log;

  const next = [...stamps.slice(0, index), ...stamps.slice(index + 1)];
  const out = { ...log };
  if (next.length === 0) delete out[key];
  else out[key] = next;
  return out;
}

/** Forget an episode entirely, however many times it was watched. */
export function clearEpisodeWatches(log: EpisodeWatchLog, key: string): EpisodeWatchLog {
  if (!(key in log)) return log;
  const out = { ...log };
  delete out[key];
  return out;
}

/** The `episodes_watched` column, rebuilt from the log. */
export function episodesWatchedMirror(log: EpisodeWatchLog): Record<string, boolean> {
  const mirror: Record<string, boolean> = {};
  for (const [key, stamps] of Object.entries(log)) {
    if (stamps.length > 0) mirror[key] = true;
  }
  return mirror;
}

/**
 * The mirror as it should be stored for a row: everything the log knows, plus
 * legacy ticks that never carried a date. Dropping those would unwatch episodes
 * on the first save after this shipped.
 */
export function mergeEpisodeMirror(
  stored: Record<string, boolean> | null | undefined,
  log: EpisodeWatchLog,
): Record<string, boolean> {
  const mirror: Record<string, boolean> = {};
  for (const [key, ticked] of Object.entries(stored ?? {})) {
    if (ticked) mirror[key] = true;
  }
  return { ...mirror, ...episodesWatchedMirror(log) };
}
