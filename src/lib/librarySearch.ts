import { directorToDisplayString } from '@/lib/utils';
import type { Movie } from '@/types/movie';

type SearchableMovie = Pick<Movie, 'title' | 'director' | 'genres' | 'releaseDate'>;

// Ported 1:1 from legacy Home.jsx movieMatchesSearchQuery (doc 03 Library).
export function movieMatchesSearchQuery(movie: SearchableMovie, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  const titleMatch = movie.title?.toLowerCase().includes(lower) ?? false;
  const directorMatch = directorToDisplayString(movie.director).toLowerCase().includes(lower);
  const genreMatch = movie.genres?.some((g) => g.name.toLowerCase().includes(lower)) ?? false;
  const yearMatch = !!movie.releaseDate && movie.releaseDate.startsWith(trimmed);

  return titleMatch || directorMatch || genreMatch || yearMatch;
}
