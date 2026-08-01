// "You both like" — the chips on a friend's shelf.
//
// Built from watched titles rather than ratings: a genre you have both sat
// through ten times is a shared taste whether or not either of you got round to
// scoring them, and most libraries are far better populated with watches than
// with ratings.

import { directorToDisplayString } from '@/lib/utils';
import type { Movie } from '@/types/movie';

export type TasteTag = { label: string; kind: 'genre' | 'director'; shared: number };

/** Below this, a shared tag is coincidence rather than taste. */
const MIN_EACH = 2;

function tally(movies: Movie[]): { genres: Map<string, number>; directors: Map<string, number> } {
  const genres = new Map<string, number>();
  const directors = new Map<string, number>();

  for (const movie of movies) {
    if (!movie.watched) continue;
    for (const genre of movie.genres ?? []) {
      if (genre?.name) genres.set(genre.name, (genres.get(genre.name) ?? 0) + 1);
    }
    // A title's directors arrive as a list or a legacy string; split either into
    // individual names so a two-director film credits both.
    for (const name of directorToDisplayString(movie.director).split(',')) {
      const clean = name.trim();
      if (clean) directors.set(clean, (directors.get(clean) ?? 0) + 1);
    }
  }
  return { genres, directors };
}

function overlap(
  mine: Map<string, number>,
  theirs: Map<string, number>,
  kind: TasteTag['kind'],
): TasteTag[] {
  const tags: TasteTag[] = [];
  for (const [label, count] of mine) {
    const other = theirs.get(label) ?? 0;
    // min(), not sum: a genre you have watched forty times and they have watched
    // once is your taste, not a shared one.
    const shared = Math.min(count, other);
    if (shared >= MIN_EACH) tags.push({ label, kind, shared });
  }
  return tags;
}

export function sharedTasteTags(yours: Movie[], theirs: Movie[], limit = 6): TasteTag[] {
  const mine = tally(yours);
  const other = tally(theirs);

  return [...overlap(mine.genres, other.genres, 'genre'), ...overlap(mine.directors, other.directors, 'director')]
    .sort((a, b) => b.shared - a.shared || a.label.localeCompare(b.label))
    .slice(0, limit);
}
