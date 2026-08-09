import { migrateStatus } from './movieStatus';
import type { CastMember, Movie, NamedRef, ProductionCompany, Ratings } from '@/types/movie';

// Raw shape of a row from public.movies (supabase/schema.sql).
export type MovieRow = {
  id: string;
  user_id: string;
  tmdb_id: number | null;
  imdb_id: string | null;
  type: 'movie' | 'tv';
  title: string;
  release_date: string | null;
  cover_url: string | null;
  overview: string | null;
  runtime: number | null;
  vote_average: number | null;
  vote_count: number | null;
  in_watchlist: boolean;
  in_progress: boolean;
  watched: boolean;
  times_watched: number;
  status: string | null;
  completed_at: string | null;
  last_watched_position: string | null;
  notes: string | null;
  url: string | null;
  availability: string[] | null;
  director: NamedRef[] | null;
  cast_members: CastMember[] | null;
  genres: NamedRef[] | null;
  production_companies: ProductionCompany[] | null;
  ratings: Ratings | null;
  number_of_seasons: number | null;
  number_of_episodes: number | null;
  episodes_watched: Record<string, boolean> | null;
  episode_watch_dates: Record<string, string> | null;
  season_episode_counts: Record<string, number> | null;
  tmdb_status: string | null;
  tagline: string | null;
  budget: number | null;
  revenue: number | null;
  added_at: string;
  updated_at: string;
};

/**
 * The single read boundary (doc 10): every screen consumes `Movie`, never a
 * raw Postgres row. Coerces legacy shapes and re-derives the boolean status
 * flags via migrateStatus so a row can never render in an inconsistent state.
 */
export function normalizeMovie(row: MovieRow): Movie {
  const statusFlags = migrateStatus({
    inWatchlist: row.in_watchlist,
    inProgress: row.in_progress,
    watched: row.watched,
    status: row.status ?? undefined,
    timesWatched: row.times_watched,
    type: row.type,
    number_of_episodes: row.number_of_episodes ?? undefined,
    episodesWatched: row.episodes_watched ?? undefined,
  });

  return {
    id: row.id,
    userId: row.user_id,
    tmdbId: row.tmdb_id,
    imdbId: row.imdb_id,
    type: row.type,
    title: row.title,
    director: row.director ?? [],
    cast: row.cast_members ?? [],
    genres: row.genres ?? [],
    releaseDate: row.release_date,
    coverUrl: row.cover_url,
    overview: row.overview ?? '',
    runtime: row.runtime ?? 0,
    voteAverage: row.vote_average ?? 0,
    voteCount: row.vote_count ?? 0,
    tagline: row.tagline ?? '',
    budget: row.budget ?? 0,
    revenue: row.revenue ?? 0,
    productionCompanies: row.production_companies ?? [],
    numberOfSeasons: row.number_of_seasons,
    numberOfEpisodes: row.number_of_episodes,
    tmdbStatus: row.tmdb_status,
    availability: row.availability ?? [],

    status: row.status,
    ...statusFlags,
    timesWatched: row.times_watched,
    completedAt: row.completed_at,
    lastWatchedPosition: row.last_watched_position,
    ratings: row.ratings ?? {},
    notes: row.notes ?? '',
    url: row.url ?? '',
    addedAt: row.added_at,
    updatedAt: row.updated_at,

    episodesWatched: row.episodes_watched ?? {},
    episodeWatchDates: row.episode_watch_dates ?? {},
    seasonEpisodeCounts: row.season_episode_counts ?? {},
  };
}

// Partial camelCase Movie -> snake_case row columns, for writes. Only maps
// keys that are present so callers can pass a sparse update (doc 10 - all
// writes go through stripUndefined too).
const FIELD_MAP: Record<string, string> = {
  tmdbId: 'tmdb_id',
  imdbId: 'imdb_id',
  type: 'type',
  title: 'title',
  director: 'director',
  cast: 'cast_members',
  genres: 'genres',
  releaseDate: 'release_date',
  coverUrl: 'cover_url',
  overview: 'overview',
  runtime: 'runtime',
  voteAverage: 'vote_average',
  voteCount: 'vote_count',
  tagline: 'tagline',
  budget: 'budget',
  revenue: 'revenue',
  productionCompanies: 'production_companies',
  numberOfSeasons: 'number_of_seasons',
  numberOfEpisodes: 'number_of_episodes',
  tmdbStatus: 'tmdb_status',
  availability: 'availability',
  status: 'status',
  inWatchlist: 'in_watchlist',
  inProgress: 'in_progress',
  watched: 'watched',
  timesWatched: 'times_watched',
  completedAt: 'completed_at',
  lastWatchedPosition: 'last_watched_position',
  ratings: 'ratings',
  notes: 'notes',
  url: 'url',
  episodesWatched: 'episodes_watched',
  episodeWatchDates: 'episode_watch_dates',
  seasonEpisodeCounts: 'season_episode_counts',
};

export function toMovieRow(movie: Partial<Movie>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(movie)) {
    const column = FIELD_MAP[key];
    if (column) row[column] = value;
  }
  return row;
}
