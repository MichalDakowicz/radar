import { normalizeEpisodeWatchDates } from './episodes';

// Which season a series opens on, and which of those are worth fetching before
// the user asks. Both answers come from the watch log alone - no network - so
// the Episodes tab can decide its season during the first render.

/** The watch state a season decision needs. */
export type SeasonProgressSource = {
  numberOfSeasons?: number | null;
  episodesWatched?: Record<string, boolean> | null;
  episodeWatchDates?: Record<string, string[] | string | number> | null;
};

/** An in-progress series and the season its Episodes tab will open on. */
export type PreloadTarget = { tmdbId: number; season: number };

/** A library row, loosely typed so both Movie and the edit form fit. */
export type PreloadCandidate = SeasonProgressSource & {
  tmdbId?: number | null;
  type?: string;
  inProgress?: boolean;
  updatedAt?: string | null;
};

export function parseEpisodeKey(key: string): { season: number; episode: number } | null {
  const match = /^s(\d+)e(\d+)$/i.exec(key);
  if (!match) return null;
  return { season: Number(match[1]), episode: Number(match[2]) };
}

/**
 * The season the user is actually in: the one holding their most recent watch,
 * falling back to the highest season they have watched anything in (legacy
 * ticks carry no date) and finally to season 1 for a series never started.
 */
export function currentEpisodeSeason(source: SeasonProgressSource, numberOfSeasons?: number | null): number {
  const total = Math.max(1, numberOfSeasons ?? 0);
  const log = normalizeEpisodeWatchDates(source.episodeWatchDates);

  let latestStamp = -Infinity;
  let latestSeason = 0;
  let highestSeason = 0;

  for (const [key, stamps] of Object.entries(log)) {
    const parsed = parseEpisodeKey(key);
    if (!parsed) continue;
    if (parsed.season > highestSeason) highestSeason = parsed.season;
    const newest = Date.parse(stamps[stamps.length - 1] ?? '');
    if (Number.isFinite(newest) && newest > latestStamp) {
      latestStamp = newest;
      latestSeason = parsed.season;
    }
  }

  for (const [key, ticked] of Object.entries(source.episodesWatched ?? {})) {
    if (!ticked) continue;
    const parsed = parseEpisodeKey(key);
    if (parsed && parsed.season > highestSeason) highestSeason = parsed.season;
  }

  const season = latestSeason || highestSeason || 1;
  return Math.min(Math.max(season, 1), total);
}

/**
 * Seasons to warm before the user opens anything. Only shows they are part-way
 * through qualify - a watchlist of 300 titles is not worth 300 TMDB calls -
 * and the most recently touched come first, since that is what gets opened.
 */
export function seasonsToPreload(movies: PreloadCandidate[], limit: number): PreloadTarget[] {
  return movies
    .filter((movie) => movie.type === 'tv' && movie.inProgress && !!movie.tmdbId)
    .sort((a, b) => Date.parse(b.updatedAt ?? '') - Date.parse(a.updatedAt ?? '') || 0)
    .slice(0, Math.max(0, limit))
    .map((movie) => ({
      tmdbId: movie.tmdbId as number,
      season: currentEpisodeSeason(movie, movie.numberOfSeasons),
    }));
}
