import type { MediaMetadata } from '@/lib/tmdb';
import type { MediaType, Movie } from '@/types/movie';

// Planning half of the metadata refresh (doc 10 - pure helpers live in lib/).
// Decides *what* to re-fetch and *what to write back*; runMetadataRefresh.ts
// owns the network and database side so this stays unit-testable.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Titles whose TMDB record still moves: airing shows, unreleased films. */
export const VOLATILE_MAX_AGE_MS = 3 * DAY_MS;
/** Everything else - a finished film's cast and runtime barely change. */
export const STABLE_MAX_AGE_MS = 30 * DAY_MS;

// A title stays "volatile" for a while after release too: watch providers and
// vote counts churn hardest in the first months on streaming.
const FRESH_RELEASE_WINDOW_MS = 120 * DAY_MS;

const VOLATILE_TMDB_STATUS = new Set(['Returning Series', 'In Production', 'Planned', 'Post Production', 'Rumored']);

/** Narrow projection of public.movies the refresh queue plans over. */
export type RefreshCandidate = {
  id: string;
  tmdbId: number;
  type: MediaType;
  title: string;
  tmdbStatus: string | null;
  releaseDate: string | null;
  metadataSyncedAt: string | null;
};

export type RefreshCandidateRow = {
  id: string;
  tmdb_id: number | null;
  type: MediaType;
  title: string;
  tmdb_status: string | null;
  release_date: string | null;
  metadata_synced_at: string | null;
};

export function toRefreshCandidate(row: RefreshCandidateRow): RefreshCandidate | null {
  if (row.tmdb_id == null) return null;
  return {
    id: row.id,
    tmdbId: row.tmdb_id,
    type: row.type,
    title: row.title,
    tmdbStatus: row.tmdb_status,
    releaseDate: row.release_date,
    metadataSyncedAt: row.metadata_synced_at,
  };
}

export function isVolatile(candidate: RefreshCandidate, now: number): boolean {
  if (candidate.tmdbStatus && VOLATILE_TMDB_STATUS.has(candidate.tmdbStatus)) return true;
  if (!candidate.releaseDate) return true;
  const released = Date.parse(candidate.releaseDate);
  if (Number.isNaN(released)) return true;
  return now - released < FRESH_RELEASE_WINDOW_MS;
}

export function maxAgeMs(candidate: RefreshCandidate, now: number): number {
  return isVolatile(candidate, now) ? VOLATILE_MAX_AGE_MS : STABLE_MAX_AGE_MS;
}

/**
 * How overdue a title is, as a multiple of its own allowance. Never-synced is
 * Infinity. Scoring by ratio rather than raw age is what makes an airing show
 * outrank a decade-old film that happens to have sat longer.
 */
export function stalenessScore(candidate: RefreshCandidate, now: number): number {
  if (!candidate.metadataSyncedAt) return Infinity;
  const synced = Date.parse(candidate.metadataSyncedAt);
  if (Number.isNaN(synced)) return Infinity;
  return (now - synced) / maxAgeMs(candidate, now);
}

export type QueueOptions = {
  now: number;
  limit: number;
  /**
   * ISO timestamp a manual "refresh everything" run started at. When set, the
   * queue ignores staleness and takes every title not yet synced *since* that
   * moment - which is what makes an interrupted full refresh resumable: the
   * rows already done have a newer metadata_synced_at and drop out.
   */
  fullRefreshSince?: string | null;
};

export function selectRefreshQueue(
  candidates: RefreshCandidate[],
  { now, limit, fullRefreshSince }: QueueOptions,
): RefreshCandidate[] {
  const since = fullRefreshSince ? Date.parse(fullRefreshSince) : null;
  const forced = since != null && !Number.isNaN(since);

  const due = candidates.filter((candidate) => {
    if (!candidate.metadataSyncedAt) return true;
    const synced = Date.parse(candidate.metadataSyncedAt);
    if (Number.isNaN(synced)) return true;
    return forced ? synced < since! : now - synced >= maxAgeMs(candidate, now);
  });

  // Most overdue first; title breaks ties so a run is deterministic and a
  // resumed run picks up where the last one stopped instead of reshuffling.
  const score = new Map(due.map((candidate) => [candidate.id, stalenessScore(candidate, now)]));
  due.sort((a, b) => {
    const scoreA = score.get(a.id)!;
    const scoreB = score.get(b.id)!;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.title.localeCompare(b.title);
  });

  return due.slice(0, limit);
}

/**
 * TMDB-sourced columns only. Anything the user owns (ratings, watch flags,
 * notes, dates) is preserved by simply not being in the patch, and a field TMDB
 * came back empty on is left `undefined` so stripUndefined drops it and the
 * stored value survives.
 */
export function metadataPatch(fresh: MediaMetadata): Partial<Movie> {
  return {
    title: fresh.title || undefined,
    coverUrl: fresh.coverUrl || undefined,
    releaseDate: fresh.releaseDate || undefined,
    genres: fresh.genres,
    director: fresh.director,
    cast: fresh.cast,
    overview: fresh.overview,
    runtime: fresh.runtime,
    voteAverage: fresh.voteAverage,
    voteCount: fresh.voteCount,
    imdbId: fresh.imdbId || undefined,
    numberOfSeasons: fresh.number_of_seasons ?? undefined,
    numberOfEpisodes: fresh.number_of_episodes ?? undefined,
    tmdbStatus: fresh.tmdbStatus || undefined,
    tagline: fresh.tagline || undefined,
    budget: fresh.budget ?? undefined,
    revenue: fresh.revenue ?? undefined,
    productionCompanies: fresh.productionCompanies?.length ? fresh.productionCompanies : undefined,
    availability: fresh.availability?.length ? fresh.availability : undefined,
  };
}
