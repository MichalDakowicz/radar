// The "which of *my* titles is this stat made of" view (doc 13 §2). Stats used
// to send every tap to TMDB, which answers a different question - every film a
// director made, most of them not owned. These helpers narrow the library
// instead, reusing the filter predicates rather than restating the rules.
//
// All-time by design: the library has no period, so a stat measured over 30 days
// can drill into more titles than the number that was tapped. The header says
// "in your library" rather than repeating the stat's count so the two numbers
// never read as a contradiction.

import { matchesGenreFilter, matchesTypeFilter, movieDirectors, movieYear } from '@/lib/libraryFacets';
import { isInProgress, isInWatchlist, isWatched } from '@/lib/movieStatus';
import { computeStats } from '@/lib/stats';
import type { Movie } from '@/types/movie';

export const LIBRARY_FACETS = ['director', 'genre', 'year', 'decade', 'type', 'status', 'all'] as const;
export type LibraryFacet = (typeof LIBRARY_FACETS)[number];

export function isLibraryFacet(value: string | undefined): value is LibraryFacet {
  return !!value && (LIBRARY_FACETS as readonly string[]).includes(value);
}

/** "1990s" (and the bare "1990") -> the decade's first year, else null. */
function decadeStart(value: string): number | null {
  const digits = value.replace(/s$/i, '');
  if (!/^\d{4}$/.test(digits)) return null;
  return Math.floor(parseInt(digits, 10) / 10) * 10;
}

export function facetTitle(facet: LibraryFacet, value: string): string {
  switch (facet) {
    case 'type':
      return value === 'tv' ? 'TV Shows' : 'Movies';
    case 'status':
      return value === 'watchlist' ? 'Watchlist' : value === 'watching' ? 'Watching' : 'Completed';
    case 'decade': {
      const start = decadeStart(value);
      return start === null ? value : `${start}s`;
    }
    case 'all':
      return 'Your library';
    default:
      // Director, genre and year carry their own display string.
      return value;
  }
}

function matchesStatus(movie: Movie, value: string): boolean {
  switch (value) {
    case 'watchlist':
      return isInWatchlist(movie);
    case 'watching':
      return isInProgress(movie);
    case 'completed':
      return isWatched(movie);
    default:
      return false;
  }
}

/** The titles behind one stat. Unknown facet values select nothing. */
export function selectFacetMovies(movies: Movie[], facet: LibraryFacet, value: string): Movie[] {
  switch (facet) {
    case 'all':
      return [...movies];
    case 'director': {
      const wanted = value.trim().toLowerCase();
      return movies.filter((m) => movieDirectors(m).some((name) => name.toLowerCase() === wanted));
    }
    case 'genre':
      return movies.filter((m) => matchesGenreFilter(m, [value]));
    case 'year':
      return movies.filter((m) => movieYear(m) === value);
    case 'decade': {
      const start = decadeStart(value);
      if (start === null) return [];
      return movies.filter((m) => {
        const year = movieYear(m);
        return year ? parseInt(year, 10) >= start && parseInt(year, 10) < start + 10 : false;
      });
    }
    case 'type':
      return value === 'movie' || value === 'tv' ? movies.filter((m) => matchesTypeFilter(m, value)) : [];
    case 'status':
      return movies.filter((m) => matchesStatus(m, value));
    default:
      return [];
  }
}

export type FacetSummary = {
  count: number;
  /** One decimal, or null when nothing in the selection is rated. */
  avgRating: string | null;
  hours: number;
  completed: number;
};

/**
 * Via computeStats so hours follow the same runtime rules as the Stats page -
 * a second copy would drift the moment TV runtime changes.
 */
export function facetSummary(movies: Movie[]): FacetSummary {
  const stats = computeStats(movies);
  if (!stats) return { count: 0, avgRating: null, hours: 0, completed: 0 };
  return {
    count: movies.length,
    avgRating: Number(stats.avgRating) > 0 ? stats.avgRating : null,
    hours: stats.totalHours,
    completed: stats.watchedCount,
  };
}
