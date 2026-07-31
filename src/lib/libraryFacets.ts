// Library facet filters (genre / director / release year). These were group-by
// dimensions, which re-bucketed the whole library on every keystroke and had to
// fall back to a non-virtualized list to render its section headers. As filters
// they narrow the one virtualized grid instead.
//
// Semantics: OR inside a facet (two genres = either genre), AND across facets
// (a genre and a year = both), which is what the status and service filters
// already do.

import { directorToDisplayString } from '@/lib/utils';
import type { Movie } from '@/types/movie';

export type Facet = { value: string; count: number };

export function movieGenres(movie: Movie): string[] {
  return (movie.genres ?? []).map((g) => g.name).filter(Boolean);
}

export function movieDirectors(movie: Movie): string[] {
  // Via the display helper: it already tolerates the legacy credit shapes
  // (plain string, single object, mixed array) that migrated rows still carry.
  return directorToDisplayString(movie.director)
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

export function movieYear(movie: Movie): string | null {
  const year = movie.releaseDate?.slice(0, 4);
  return year && /^\d{4}$/.test(year) ? year : null;
}

function tally(values: string[][]): Facet[] {
  const counts = new Map<string, number>();
  for (const row of values) {
    // Unique per title, so a title credited twice to one name counts once.
    for (const value of new Set(row)) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts, ([value, count]) => ({ value, count }));
}

/** Most-used first, then alphabetical, so the useful chips lead. */
function byCountThenName(a: Facet, b: Facet): number {
  return b.count - a.count || a.value.localeCompare(b.value);
}

export type LibraryFacets = {
  genres: Facet[];
  directors: Facet[];
  years: Facet[];
};

/** The facet values actually present in a library - never a fixed list. */
export function libraryFacets(movies: Movie[]): LibraryFacets {
  return {
    genres: tally(movies.map(movieGenres)).sort(byCountThenName),
    directors: tally(movies.map(movieDirectors)).sort(byCountThenName),
    // Newest year first: nobody scrolls to 1974 before 2026.
    years: tally(movies.map((m) => (movieYear(m) ? [movieYear(m)!] : []))).sort((a, b) => b.value.localeCompare(a.value)),
  };
}

function matchesAny(values: string[], selected: string[]): boolean {
  if (selected.length === 0) return true;
  return values.some((value) => selected.includes(value));
}

export function matchesGenreFilter(movie: Movie, selected: string[]): boolean {
  return matchesAny(movieGenres(movie), selected);
}

export function matchesDirectorFilter(movie: Movie, selected: string[]): boolean {
  return matchesAny(movieDirectors(movie), selected);
}

export function matchesYearFilter(movie: Movie, selected: string[]): boolean {
  const year = movieYear(movie);
  return matchesAny(year ? [year] : [], selected);
}

/** Case-insensitive contains, for narrowing a long facet list in the sheet. */
export function filterFacets(facets: Facet[], query: string): Facet[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return facets;
  return facets.filter((f) => f.value.toLowerCase().includes(trimmed));
}
