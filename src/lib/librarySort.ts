// Library sort comparators (doc 03 Library sort). Each comparator is written in
// canonical ascending form and the direction is applied on top, so the toolbar
// arrows can flip any sort. SORT_DEFAULT_DIR keeps the order each sort reads
// best in when picked: newest / highest / soonest first for the date and score
// sorts, A-Z and shortest first for the rest.

import { directorToDisplayString } from '@/lib/utils';
import type { SortBy } from '@/store/libraryPrefs';
import type { Movie } from '@/types/movie';

export type SortDir = 'asc' | 'desc';

export const SORT_DEFAULT_DIR: Record<SortBy, SortDir> = {
  custom: 'asc',
  title: 'asc',
  director: 'asc',
  runtime: 'asc',
  dateAdded: 'desc',
  rating: 'desc',
  releaseDate: 'desc',
};

export function averageRating(movie: Movie): number {
  if (!movie.ratings) return 0;
  const vals = Object.values(movie.ratings).filter((v): v is number => typeof v === 'number' && v > 0);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function firstDirector(movie: Movie): string {
  return directorToDisplayString(movie.director).split(',')[0].trim();
}

function compareAscending(a: Movie, b: Movie, sortBy: SortBy): number {
  switch (sortBy) {
    case 'custom': {
      // No stored order falls back to newest-added, which is what the library
      // looked like before a manual order existed.
      const orderA = a.customOrder ?? -new Date(a.addedAt).getTime();
      const orderB = b.customOrder ?? -new Date(b.addedAt).getTime();
      return orderA - orderB;
    }
    case 'dateAdded':
      return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
    case 'rating':
      return averageRating(a) - averageRating(b);
    case 'releaseDate':
      return new Date(a.releaseDate || 0).getTime() - new Date(b.releaseDate || 0).getTime();
    case 'director':
      return firstDirector(a).localeCompare(firstDirector(b));
    case 'runtime':
      return (a.runtime || 0) - (b.runtime || 0);
    case 'title':
    default:
      return a.title.localeCompare(b.title);
  }
}

export function compareMovies(a: Movie, b: Movie, sortBy: SortBy, dir: SortDir): number {
  const ascending = compareAscending(a, b, sortBy);
  return dir === 'asc' ? ascending : -ascending;
}
