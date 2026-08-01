// "Watch together" — the titles sitting on both watchlists, which is the only
// honest answer to "what should we put on tonight" that Radar can give from
// stored data.

import { titleKey } from '@/lib/compareTaste';
import type { MediaType, Movie } from '@/types/movie';

export type SharedTitle = {
  key: string;
  title: string;
  coverUrl: string | null;
  tmdbId: number | null;
  type: MediaType;
  releaseYear: string | null;
  runtime: number;
  /** Union of what each of you has recorded it as streaming on. */
  services: string[];
};

function year(releaseDate: string | null): string | null {
  const parsed = releaseDate?.slice(0, 4);
  return parsed && /^\d{4}$/.test(parsed) ? parsed : null;
}

function toShared(movie: Movie, key: string, services: string[]): SharedTitle {
  return {
    key,
    title: movie.title,
    coverUrl: movie.coverUrl,
    tmdbId: movie.tmdbId,
    type: movie.type,
    releaseYear: year(movie.releaseDate),
    runtime: movie.runtime,
    services,
  };
}

/**
 * Intersection of two watchlists. `watched` is deliberately ignored on your
 * side: a title you have seen but kept on the watchlist is a rewatch you are
 * still up for (movieStatus.isRewatch), which is a fine thing to suggest.
 */
export function sharedWatchlist(yours: Movie[], theirs: Movie[]): SharedTitle[] {
  const mine = new Map<string, Movie>();
  for (const movie of yours) {
    if (movie.inWatchlist) mine.set(titleKey(movie.tmdbId, movie.type, movie.title), movie);
  }

  const shared: SharedTitle[] = [];
  const seen = new Set<string>();

  for (const movie of theirs) {
    if (!movie.inWatchlist) continue;
    const key = titleKey(movie.tmdbId, movie.type, movie.title);
    const my = mine.get(key);
    if (!my || seen.has(key)) continue;
    seen.add(key);
    // Availability is per-library and per-country, so a title one of you has
    // no providers for still shows the other's — union, not intersection.
    const services = Array.from(new Set([...my.availability, ...movie.availability]));
    shared.push(toShared(movie.coverUrl ? movie : my, key, services));
  }

  return shared.sort((a, b) => a.title.localeCompare(b.title));
}

/** Blurb above the list: "7 titles on both your watchlists." */
export function sharedCountLabel(count: number): string {
  if (count === 0) return 'Nothing on both your watchlists yet.';
  return count === 1 ? '1 title on both your watchlists.' : `${count} titles on both your watchlists.`;
}
