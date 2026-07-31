import { useMemo } from 'react';

import { matchesDirectorFilter, matchesGenreFilter, matchesYearFilter } from '@/lib/libraryFacets';
import { movieMatchesSearchQuery } from '@/lib/librarySearch';
import { compareMovies } from '@/lib/librarySort';
import { isInProgress, isInWatchlist, isRewatch, isWatched } from '@/lib/movieStatus';
import { normalizeAvailability, OTHER_SERVICE_KEY, isPopularService } from '@/lib/services';
import { selectComingSoon } from '@/lib/upcoming';
import type { SortBy, SortDir, StatusFilter } from '@/store/libraryPrefs';
import type { Movie } from '@/types/movie';

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

export type LibraryFilters = {
  continueWatching: Movie[];
  recentlyAdded: Movie[];
  comingSoon: Movie[];
  mainMovies: Movie[];
  validPickMovies: Movie[];
  totalCount: number;
};

export type LibraryFilterInput = {
  movies: Movie[];
  searchQuery: string;
  statusFilter: StatusFilter;
  selectedServices: string[];
  selectedGenres: string[];
  selectedDirectors: string[];
  selectedYears: string[];
  sortBy: SortBy;
  sortDir: SortDir;
  recentlyAddedDays?: number;
  showRecentlyAdded?: boolean;
};

// The one derive/memo hook for Library (doc 10) - LibraryScreen only composes
// this + presentational components, no filter logic in the screen file.
export function useLibraryFilters({
  movies,
  searchQuery,
  statusFilter,
  selectedServices,
  selectedGenres,
  selectedDirectors,
  selectedYears,
  sortBy,
  sortDir,
  recentlyAddedDays = 30,
  showRecentlyAdded = false,
}: LibraryFilterInput): LibraryFilters {
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
    result = result.filter((m) => matchesGenreFilter(m, selectedGenres));
    result = result.filter((m) => matchesDirectorFilter(m, selectedDirectors));
    result = result.filter((m) => matchesYearFilter(m, selectedYears));
    return [...result].sort((a, b) => compareMovies(a, b, sortBy, sortDir));
  }, [movies, searchQuery, statusFilter, selectedServices, selectedGenres, selectedDirectors, selectedYears, sortBy, sortDir]);

  const sectionIds = useMemo(() => {
    const ids = new Set<string>();
    continueWatching.forEach((m) => ids.add(m.id));
    recentlyAdded.forEach((m) => ids.add(m.id));
    comingSoon.forEach((m) => ids.add(m.id));
    return ids;
  }, [continueWatching, recentlyAdded, comingSoon]);

  const mainMovies = useMemo(
    () => filteredMovies.filter((m) => !sectionIds.has(m.id)),
    [filteredMovies, sectionIds],
  );

  const validPickMovies = useMemo(
    () => (statusFilter !== 'all' ? filteredMovies : filteredMovies.filter((m) => isInWatchlist(m))),
    [filteredMovies, statusFilter],
  );

  return {
    continueWatching,
    recentlyAdded,
    comingSoon,
    mainMovies,
    validPickMovies,
    totalCount: movies.length,
  };
}
