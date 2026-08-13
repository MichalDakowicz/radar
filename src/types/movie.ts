export type MediaType = 'movie' | 'tv';

export type NamedRef = { id?: number; name: string };

// A billed performer. Stored inside movies.cast_members (jsonb), so the two
// extra fields simply appear on rows written after this shipped - anything
// older keeps rendering as a bare name until the metadata refresh reaches it.
export type CastMember = NamedRef & {
  /** Role as credited, null when TMDB billed the person without a character. */
  character?: string | null;
  profileUrl?: string | null;
};

export type Ratings = {
  story?: number;
  acting?: number;
  ending?: number;
  enjoyment?: number;
  overall?: number;
  seasons?: Record<string, { overall?: number; story?: number; acting?: number; ending?: number; enjoyment?: number }>;
};

export type ProductionCompany = { id?: number; name: string; logo: string | null };

// App-side shape produced by normalizeMovie() at the read boundary (doc 02, 10).
// Mirrors the current Firebase Movie object; only the storage layer changed.
export type Movie = {
  id: string;
  userId: string;
  tmdbId: number | null;
  imdbId: string | null;
  type: MediaType;
  title: string;
  director: NamedRef[];
  cast: CastMember[];
  genres: NamedRef[];
  releaseDate: string | null;
  coverUrl: string | null;
  backdropUrl?: string | null;
  overview: string;
  runtime: number;
  voteAverage: number;
  voteCount: number;
  tagline: string;
  budget: number;
  revenue: number;
  productionCompanies: ProductionCompany[];
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  tmdbStatus: string | null;
  availability: string[];

  // user tracking
  status: string | null;
  inWatchlist: boolean;
  inProgress: boolean;
  watched: boolean;
  timesWatched: number;
  completedAt: string | null;
  lastWatchedPosition: string | null;
  ratings: Ratings;
  notes: string;
  url: string;
  addedAt: string;
  updatedAt: string;

  // TV episode tracking. episodeWatchDates is the log and the source of truth -
  // one stamp per watch, so a rewatched episode keeps every date. episodesWatched
  // is its derived mirror (lib/episodes).
  episodesWatched: Record<string, boolean>;
  episodeWatchDates: Record<string, string[]>;
  seasonEpisodeCounts: Record<string, number>;
};

export type ActivityType =
  | 'added'
  | 'completed'
  | 'started_watching'
  | 'added_to_watchlist'
  | 'status_changed'
  | 'rating_changed'
  | 'updated'
  | 'removed';

export type ActivityEvent = {
  id: string;
  userId: string;
  movieId: string | null;
  movieTitle: string;
  type: ActivityType;
  mediaType: MediaType | null;
  details: Record<string, unknown>;
  createdAt: string;
};

// One of the up-to-4 titles pinned to a profile (Letterboxd's "favourite
// films"). A snapshot, not a reference: profiles.favorites is world-readable
// while public.movies is RLS-gated, and a pinned title should survive being
// removed from the library. tmdbId+type is enough to route to the detail page.
export type FavoriteItem = {
  tmdbId: number;
  type: MediaType;
  title: string;
  coverUrl: string | null;
};

export type Profile = {
  id: string;
  username: string;
  displayName: string | null;
  pfp: string | null;
  favorites: FavoriteItem[];
  createdAt: string;
};

export type ServiceName = string;
