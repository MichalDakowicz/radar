import { isWatched } from '@/lib/movieStatus';
import type { Stats } from '@/lib/stats';
import type { Movie } from '@/types/movie';

// The yearly report's closing verdict — a name for how someone watched, derived
// rather than assigned. Deliberately one pure function with an ordered rule
// table: the first profile that fits wins, so the specific labels get a chance
// before the general ones.

export type Classification = { name: string; blurb: string };

export type ViewerShape = {
  titles: number;
  /** Share of finished titles that were TV, 0–1. */
  tvShare: number;
  /** Mean runtime in minutes across finished films. */
  avgRuntime: number;
  /** Started but never finished, over everything tracked. */
  abandonRate: number;
  /** Share of finished titles released in the last three years, 0–1. */
  freshShare: number;
  /** Share of finished titles watched more than once, 0–1. */
  rewatchShare: number;
  topGenre: string | null;
};

function share(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

export function viewerShape(movies: Movie[], stats: Stats | null, now: Date = new Date()): ViewerShape {
  const finished = movies.filter((m) => isWatched(m));
  const films = finished.filter((m) => m.type !== 'tv' && m.runtime > 0);
  const runtimeSum = films.reduce((total, m) => total + m.runtime, 0);
  const fresh = finished.filter((m) => {
    const year = m.releaseDate ? Number(m.releaseDate.slice(0, 4)) : NaN;
    return Number.isFinite(year) && year >= now.getFullYear() - 2;
  });

  return {
    titles: finished.length,
    tvShare: share(stats?.typeCounts.tv ?? 0, (stats?.typeCounts.movie ?? 0) + (stats?.typeCounts.tv ?? 0)),
    avgRuntime: films.length > 0 ? runtimeSum / films.length : 0,
    abandonRate: share(movies.filter((m) => m.inProgress && !isWatched(m)).length, movies.length),
    freshShare: share(fresh.length, finished.length),
    rewatchShare: share(finished.filter((m) => m.timesWatched > 1).length, finished.length),
    topGenre: stats?.topGenres[0]?.name ?? null,
  };
}

const PROFILES: { name: string; blurb: string; fits: (s: ViewerShape) => boolean }[] = [
  {
    name: 'The Series Devourer',
    blurb: 'Mostly seasons, rarely films. You do not start something unless you intend to be there for a while.',
    fits: (s) => s.tvShare >= 0.55,
  },
  {
    name: 'The Slow-Burn Completionist',
    blurb: 'Long runtimes, almost nothing abandoned, a clear preference for films where very little explodes.',
    fits: (s) => s.avgRuntime >= 125 && s.abandonRate <= 0.15,
  },
  {
    name: 'The Front-Runner',
    blurb: 'Most of what you watched came out while you were watching it. Nothing sits in the pile for long.',
    fits: (s) => s.freshShare >= 0.6,
  },
  {
    name: 'The Loyalist',
    blurb: 'You go back. A good share of the year was spent rewatching things you already knew the ending of.',
    fits: (s) => s.rewatchShare >= 0.2,
  },
  {
    name: 'The Nightshift',
    blurb: 'Horror led the year and it was not close. Whatever you are working through, it is working.',
    fits: (s) => s.topGenre === 'Horror',
  },
  {
    name: 'The Volume Dealer',
    blurb: 'Quantity was the strategy. Very few people finish this much in twelve months and stay coherent.',
    fits: (s) => s.titles >= 120,
  },
  {
    name: 'The Serial Starter',
    blurb: 'A great deal begun, rather less concluded. The in-progress list is its own kind of art form.',
    fits: (s) => s.abandonRate >= 0.25,
  },
  {
    name: 'The Sampler',
    blurb: 'A little of everything and no obsessions. Hard to predict, which is a compliment.',
    fits: () => true,
  },
];

export function classifyViewer(movies: Movie[], stats: Stats | null, now: Date = new Date()): Classification {
  const shape = viewerShape(movies, stats, now);
  const match = PROFILES.find((profile) => profile.fits(shape));
  // The last profile matches unconditionally, so this fallback is unreachable —
  // it is here so the return type does not have to be nullable.
  return match ? { name: match.name, blurb: match.blurb } : { name: 'The Sampler', blurb: 'A little of everything.' };
}
