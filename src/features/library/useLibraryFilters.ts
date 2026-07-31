import { useMemo } from 'react';

import { movieMatchesSearchQuery } from '@/lib/librarySearch';
import { isInProgress, isInWatchlist, isRewatch, isWatched } from '@/lib/movieStatus';
import { normalizeAvailability, OTHER_SERVICE_KEY, isPopularService } from '@/lib/services';
import { selectComingSoon } from '@/lib/upcoming';
import { directorToDisplayString } from '@/lib/utils';
import type { GroupBy, SortBy, StatusFilter } from '@/store/libraryPrefs';
import type { Movie } from '@/types/movie';

function averageRating(movie: Movie): number {
  if (!movie.ratings) return 0;
  const vals = Object.values(movie.ratings).filter((v): v is number => typeof v === 'number' && v > 0);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function matchesStatusFilter(movie: Movie, filter: StatusFilter): boolean {
  switch (filter) {
    case 'watchlist':
      return isInWatchlist(movie);
    case 'watching':
      return isInProgress(movie);
    case 'completed':
      return isWatched(movie);
    case 'rewatch':
      return isRewatch(movie);
    default:
      return true;
  }
}

function matchesServiceFilter(movie: Movie, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const services = normalizeAvailability(movie.availability);
  const matchesPopular = selected.some((s) => s !== OTHER_SERVICE_KEY && services.includes(s));
  const matchesOther = selected.includes(OTHER_SERVICE_KEY) && services.some((s) => !isPopularService(s));
  return matchesPopular || matchesOther;
}

function compareBySort(a: Movie, b: Movie, sortBy: SortBy): number {
  switch (sortBy) {
    case 'custom': {
      const orderA = a.customOrder ?? -new Date(a.addedAt).getTime();
      const orderB = b.customOrder ?? -new Date(b.addedAt).getTime();
      return orderA - orderB;
    }
    case 'dateAdded':
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    case 'rating':
      return averageRating(b) - averageRating(a);
    case 'releaseDate':
      return new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime();
    case 'director':
      return directorToDisplayString(a.director)
        .split(',')[0]
        .trim()
        .localeCompare(directorToDisplayString(b.director).split(',')[0].trim());
    case 'runtime':
      return (a.runtime || 0) - (b.runtime || 0);
    case 'title':
    default:
      return a.title.localeCompare(b.title);
  }
}

function groupKey(movie: Movie, groupBy: GroupBy): string {
  switch (groupBy) {
    case 'director':
      return directorToDisplayString(movie.director).split(',')[0].trim() || 'Unknown Director';
    case 'year':
      return movie.releaseDate ? movie.releaseDate.slice(0, 4) : 'Unknown Year';
    case 'genre':
      return movie.genres[0]?.name ?? 'No Genre';
    case 'availability':
      return normalizeAvailability(movie.availability)[0] ?? 'Unknown';
    case 'status':
      return movie.status ?? 'Collection';
    default:
      return 'Other';
  }
}

export type LibraryGroup = { title: string; movies: Movie[] };

export type LibraryFilters = {
  continueWatching: Movie[];
  recentlyAdded: Movie[];
  comingSoon: Movie[];
  mainMovies: Movie[];
  groups: LibraryGroup[] | null;
  validPickMovies: Movie[];
  isReorderEnabled: boolean;
  totalCount: number;
};

// The one derive/memo hook for Library (doc 10) - LibraryScreen only composes
// this + presentational components, no filter logic in the screen file.
export function useLibraryFilters(
  movies: Movie[],
  searchQuery: string,
  statusFilter: StatusFilter,
  selectedServices: string[],
  sortBy: SortBy,
  groupBy: GroupBy,
  recentlyAddedDays = 30,
  showRecentlyAdded = false,
  reorderMode = false,
): LibraryFilters {
  const continueWatching = useMemo(() => {
    const inProgress = movies.filter((m) => isInProgress(m)).slice(0, 30);
    return searchQuery.trim() ? inProgress.filter((m) => movieMatchesSearchQuery(m, searchQuery)) : inProgress;
  }, [movies, searchQuery]);

  // "Recently added" carousel (user_settings.show_recently_added + _days, Phase
  // 9). Titles added within the window, newest first; empty when the setting is
  // off so the section collapses.
  const recentlyAdded = useMemo(() => {
    if (!showRecentlyAdded) return [];
    const cutoff = Date.now() - recentlyAddedDays * 24 * 60 * 60 * 1000;
    const recent = movies
      .filter((m) => m.addedAt && new Date(m.addedAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, 30);
    return searchQuery.trim() ? recent.filter((m) => movieMatchesSearchQuery(m, searchQuery)) : recent;
  }, [movies, searchQuery, showRecentlyAdded, recentlyAddedDays]);

  const comingSoon = useMemo(() => {
    const upcoming = selectComingSoon(movies, Date.now());
    return searchQuery.trim() ? upcoming.filter((m) => movieMatchesSearchQuery(m, searchQuery)) : upcoming;
  }, [movies, searchQuery]);

  const filteredMovies = useMemo(() => {
    let result = movies;
    if (searchQuery.trim()) result = result.filter((m) => movieMatchesSearchQuery(m, searchQuery));
    result = result.filter((m) => matchesStatusFilter(m, statusFilter));
    result = result.filter((m) => matchesServiceFilter(m, selectedServices));
    return [...result].sort((a, b) => compareBySort(a, b, sortBy));
  }, [movies, searchQuery, statusFilter, selectedServices, sortBy]);

  const sectionIds = useMemo(() => {
    const ids = new Set<string>();
    continueWatching.forEach((m) => ids.add(m.id));
    recentlyAdded.forEach((m) => ids.add(m.id));
    comingSoon.forEach((m) => ids.add(m.id));
    return ids;
  }, [continueWatching, recentlyAdded, comingSoon]);

  const mainMovies = useMemo(
    () => (groupBy !== 'none' ? filteredMovies : filteredMovies.filter((m) => !sectionIds.has(m.id))),
    [filteredMovies, groupBy, sectionIds],
  );

  const groups = useMemo<LibraryGroup[] | null>(() => {
    if (groupBy === 'none') return null;
    const map = new Map<string, Movie[]>();
    filteredMovies.forEach((movie) => {
      const key = groupKey(movie, groupBy);
      map.set(key, [...(map.get(key) ?? []), movie]);
    });
    let keys = Array.from(map.keys()).sort();
    if (groupBy === 'year') keys = keys.reverse();
    return keys.map((title) => ({ title, movies: map.get(title)! }));
  }, [filteredMovies, groupBy]);

  const validPickMovies = useMemo(
    () => (statusFilter !== 'all' ? filteredMovies : filteredMovies.filter((m) => isInWatchlist(m))),
    [filteredMovies, statusFilter],
  );

  const isReorderEnabled =
    reorderMode &&
    sortBy === 'custom' &&
    groupBy === 'none' &&
    !searchQuery.trim() &&
    statusFilter === 'all' &&
    selectedServices.length === 0;

  return {
    continueWatching,
    recentlyAdded,
    comingSoon,
    mainMovies,
    groups,
    validPickMovies,
    isReorderEnabled,
    totalCount: movies.length,
  };
}
