import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import * as tmdb from '@/lib/tmdb';
import type { MediaType } from '@/types/movie';

export function useSearchMedia(query: string) {
  return useQuery({
    queryKey: ['tmdb', 'search', query],
    queryFn: () => tmdb.searchMedia(query),
    enabled: query.length > 0,
  });
}

export function useSearchBrowse(query: string) {
  return useQuery({
    queryKey: ['tmdb', 'searchBrowse', query],
    queryFn: () => tmdb.searchBrowse(query),
    enabled: query.trim().length > 0,
  });
}

export function useMediaMetadata(tmdbId: number | null, type: MediaType, countryCode = 'US') {
  return useQuery({
    queryKey: ['tmdb', 'metadata', type, tmdbId, countryCode],
    queryFn: () => tmdb.fetchMediaMetadata(tmdbId as number, type, countryCode),
    enabled: !!tmdbId,
  });
}

export function useSeasonDetails(tmdbId: number | null, season: number | null) {
  return useQuery({
    queryKey: ['tmdb', 'season', tmdbId, season],
    queryFn: () => tmdb.fetchSeasonDetails(tmdbId as number, season as number),
    enabled: !!tmdbId && season != null,
  });
}

export function useTrending() {
  return useQuery({ queryKey: ['tmdb', 'trending'], queryFn: tmdb.getTrending });
}

export function useMoviesByCategory(category: string) {
  return useQuery({ queryKey: ['tmdb', 'movies', category], queryFn: () => tmdb.getMovies(category) });
}

export function useTVShowsByCategory(category: string) {
  return useQuery({ queryKey: ['tmdb', 'tv', category], queryFn: () => tmdb.getTVShows(category) });
}

export function useDirectorDetails(personId: number | null) {
  return useQuery({
    queryKey: ['tmdb', 'director', personId],
    queryFn: () => tmdb.fetchDirectorDetails(personId as number),
    enabled: !!personId,
  });
}

export function useDirectorMovies(personId: number | null) {
  return useQuery({
    queryKey: ['tmdb', 'directorMovies', personId],
    queryFn: () => tmdb.fetchDirectorMovies(personId as number),
    enabled: !!personId,
  });
}

export function useActorDetails(personId: number | null) {
  return useQuery({
    queryKey: ['tmdb', 'actor', personId],
    queryFn: () => tmdb.fetchActorDetails(personId as number),
    enabled: !!personId,
  });
}

// Paginated filmography (doc 03 `ActorDetails` "paginated") - infinite query so
// the grid's onEndReached just calls fetchNextPage, no page-index state to track.
export function useActorMoviesInfinite(personId: number | null) {
  return useInfiniteQuery({
    queryKey: ['tmdb', 'actorMovies', 'infinite', personId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => tmdb.fetchActorMovies(personId as number, pageParam),
    getNextPageParam: (lastPage, pages) => (pages.length < lastPage.totalPages ? pages.length + 1 : undefined),
    enabled: !!personId,
  });
}

// Paginated genre titles (doc 03 `GenreDetails` "paginated") - same shape as above.
export function useGenreMoviesInfinite(genreId: number | null) {
  return useInfiniteQuery({
    queryKey: ['tmdb', 'genreMovies', 'infinite', genreId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => tmdb.fetchGenreMovies(genreId as number, pageParam),
    getNextPageParam: (lastPage, pages) => (pages.length < lastPage.totalPages ? pages.length + 1 : undefined),
    enabled: !!genreId,
  });
}

export function useSimilarMedia(tmdbId: number | null, type: MediaType = 'movie') {
  return useQuery({
    queryKey: ['tmdb', 'similar', type, tmdbId],
    queryFn: () => tmdb.fetchSimilarMedia(tmdbId as number, type),
    enabled: !!tmdbId,
  });
}

export function useMoviesByGenre(genreId: number | null, type: MediaType = 'movie') {
  return useQuery({
    queryKey: ['tmdb', 'byGenre', type, genreId],
    queryFn: () => tmdb.getMoviesByGenre(genreId as number, type),
    enabled: !!genreId,
  });
}

export function useGenres(type: MediaType = 'movie') {
  return useQuery({ queryKey: ['tmdb', 'genres', type], queryFn: () => tmdb.getGenres(type) });
}
