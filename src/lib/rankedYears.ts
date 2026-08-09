// "2026 ranked" — your watched-and-rated titles bucketed by the year they came
// out, best first. Release year, not the year you logged it: the point is to
// rank a year's crop against itself, which is what a "best of 2026" list is.
//
// Pure so the Profile section, a test, and anything non-React can share the
// rule; the scoring function arrives as a callback for the same reason
// shelfSummary takes one (see lib/personalScore).

import type { Movie } from '@/types/movie';

export type RankedEntry = {
  movie: Movie;
  /** 1-based position inside its year. */
  rank: number;
  score: number;
};

export type RankedYear = {
  year: number;
  entries: RankedEntry[];
};

type ScoreFn = (movie: Movie) => number | null;

function finishedAt(movie: Movie): number {
  const parsed = Date.parse(movie.completedAt ?? '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function releaseYear(movie: Movie): number | null {
  const year = Number(movie.releaseDate?.slice(0, 4));
  return Number.isFinite(year) && year > 1800 ? year : null;
}

/**
 * Every release year you have finished *and* rated something in, newest year
 * first, each year's titles ordered best to worst. Unrated or unwatched titles
 * are left out entirely — a ranking with unranked entries in it is not one.
 */
export function rankedYears(movies: Movie[], score: ScoreFn): RankedYear[] {
  const byYear = new Map<number, RankedEntry[]>();

  for (const movie of movies) {
    if (!movie.watched) continue;
    const year = releaseYear(movie);
    if (year == null) continue;
    const value = score(movie);
    if (value == null || value <= 0) continue;

    const bucket = byYear.get(year);
    if (bucket) bucket.push({ movie, rank: 0, score: value });
    else byYear.set(year, [{ movie, rank: 0, score: value }]);
  }

  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, entries]) => ({
      year,
      // Your own score first, then rewatches - going back to something says more
      // about it than a 1-5 score can hold - then the crowd's TMDB average, so a
      // 1-5 scale that only has ten steps in it still resolves down to an order
      // instead of falling back on the alphabet - a title Radar has no TMDB
      // average for yet (a 2026 release added before it had votes) reads as 0
      // and sinks, which is the honest place for "unknown". The completion date
      // is the last stat standing; title only keeps two identical rows from
      // swapping places on a re-render.
      entries: entries
        .sort(
          (a, b) =>
            b.score - a.score ||
            (b.movie.timesWatched ?? 0) - (a.movie.timesWatched ?? 0) ||
            (b.movie.voteAverage ?? 0) - (a.movie.voteAverage ?? 0) ||
            finishedAt(b.movie) - finishedAt(a.movie) ||
            a.movie.title.localeCompare(b.movie.title),
        )
        .map((entry, index) => ({ ...entry, rank: index + 1 })),
    }));
}
