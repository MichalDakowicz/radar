// Device-local copy of a TMDB season's episode list.
//
// Episodes is the default tab of a series now, so it cannot afford a network
// round-trip on every open. A season's episode list is also close to immutable
// once the season has finished airing - TMDB only touches it to correct a
// title or fill in an overview - so the useful cache policy is not one TTL but
// two: a settled season is trusted for weeks, a season still airing is
// revalidated on the next open because it gains an episode a week.

/** The fields the episode tracker renders. Stills, crew and guest stars are dropped. */
export type CachedEpisode = {
  id: number;
  episode_number: number;
  name: string;
  air_date: string | null;
  overview: string;
};

export type SeasonEntry = {
  episodes: CachedEpisode[];
  /** Epoch ms of the fetch this entry came from. */
  fetchedAt: number;
};

/** An aired season only changes when TMDB corrects it. */
export const SETTLED_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Anything still airing, or with air dates missing, is revalidated same-day. */
export const AIRING_TTL_MS = 6 * 60 * 60 * 1000;
/** How long after its last air date a season counts as finished. */
export const SETTLE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;

function toEpisode(raw: unknown): CachedEpisode | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const number = Number(value.episode_number);
  if (!Number.isFinite(number)) return null;
  const airDate = typeof value.air_date === 'string' && value.air_date !== '' ? value.air_date : null;
  return {
    id: Number.isFinite(Number(value.id)) ? Number(value.id) : number,
    episode_number: number,
    name: typeof value.name === 'string' ? value.name : '',
    air_date: airDate,
    overview: typeof value.overview === 'string' ? value.overview : '',
  };
}

/**
 * Trim a TMDB season payload down to what gets stored. Returns null for a
 * failed fetch (lib/tmdb hands back null) or a payload with no episodes, so a
 * blank response never overwrites a good entry.
 */
export function toSeasonEntry(payload: unknown, now: number): SeasonEntry | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = (payload as { episodes?: unknown }).episodes;
  if (!Array.isArray(raw)) return null;
  const episodes = raw.map(toEpisode).filter((e): e is CachedEpisode => e !== null);
  if (episodes.length === 0) return null;
  return { episodes, fetchedAt: now };
}

/** The read boundary for the stored JSON: anything unrecognisable reads as a miss. */
export function parseSeasonEntry(raw: string | null | undefined): SeasonEntry | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const fetchedAt = Number((parsed as { fetchedAt?: unknown }).fetchedAt);
    if (!Number.isFinite(fetchedAt) || fetchedAt <= 0) return null;
    const entry = toSeasonEntry(parsed, fetchedAt);
    return entry;
  } catch {
    return null;
  }
}

/** Latest air date in the season, epoch ms. Null when any episode has none. */
function lastAirDate(entry: SeasonEntry): number | null {
  let latest = 0;
  for (const episode of entry.episodes) {
    const stamp = episode.air_date ? Date.parse(episode.air_date) : NaN;
    if (!Number.isFinite(stamp)) return null;
    if (stamp > latest) latest = stamp;
  }
  return latest > 0 ? latest : null;
}

/** How long this entry can be trusted without asking TMDB again. */
export function seasonTtl(entry: SeasonEntry | undefined | null, now: number): number {
  if (!entry || entry.episodes.length === 0) return 0;
  const aired = lastAirDate(entry);
  // No air dates, a date still in the future, or a finale only days old: the
  // season is not done, so TMDB has more to say about it.
  if (aired === null || aired + SETTLE_GRACE_MS > now) return AIRING_TTL_MS;
  return SETTLED_TTL_MS;
}

export function isSeasonStale(entry: SeasonEntry | undefined | null, now: number): boolean {
  if (!entry) return true;
  return now - entry.fetchedAt >= seasonTtl(entry, now);
}
