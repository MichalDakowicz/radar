import type { CatalogItem, CreditItem, MediaSummary } from '@/lib/tmdb';
import type { Movie } from '@/types/movie';

const EPOCH = new Date(0).toISOString();

// Browse/discovery items come straight from TMDB, not the library - build a
// throwaway Movie so the single MovieCard can render them (doc 12 part 1).
// Display-only: never written, and `id` is a synthetic tmdb-* key, not a row id.
// Also reused by Director/Actor/Genre pages (doc 03) for their TMDB credit grids.
export function toDiscoveryMovie(item: MediaSummary | CatalogItem | CreditItem): Movie {
  return {
    id: `tmdb-${item.type}-${item.tmdbId}`,
    userId: '',
    tmdbId: item.tmdbId,
    imdbId: null,
    type: item.type,
    title: item.title,
    director: 'director' in item ? item.director ?? [] : [],
    cast: [],
    genres: [],
    releaseDate: item.releaseDate,
    coverUrl: item.coverUrl,
    backdropUrl: 'backdropUrl' in item ? item.backdropUrl : null,
    overview: item.overview ?? '',
    runtime: 0,
    voteAverage: item.voteAverage ?? 0,
    voteCount: 0,
    tagline: '',
    budget: 0,
    revenue: 0,
    productionCompanies: [],
    numberOfSeasons: null,
    numberOfEpisodes: null,
    tmdbStatus: null,
    availability: [],
    status: null,
    inWatchlist: false,
    inProgress: false,
    watched: false,
    timesWatched: 0,
    completedAt: null,
    lastWatchedPosition: null,
    ratings: {},
    notes: '',
    url: '',
    customOrder: null,
    addedAt: EPOCH,
    updatedAt: EPOCH,
    episodesWatched: {},
    episodeWatchDates: {},
    seasonEpisodeCounts: {},
  };
}
