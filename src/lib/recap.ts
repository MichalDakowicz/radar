import type { MediaType } from '@/types/movie';

import { dateKey } from '@/lib/stats';

// Shapes and shared derivations for Radar Recap. Everything here is plain JSON:
// a built recap is stored verbatim in public.recaps.payload, so the player can
// draw last year's report without recomputing it from a library that has since
// moved on. No Date objects, no undefined — jsonb round-trips neither.

/** Schema version of the stored payload. Bump when a slide needs a new field. */
export const RECAP_VERSION = 2;

export type PosterRef = {
  title: string;
  coverUrl: string | null;
  tmdbId: number | null;
  type: MediaType;
};

/** A poster that carries the score it earned, for rows that show the number. */
export type RatedPoster = PosterRef & { rating: number | null };

export type TitleCard = PosterRef & {
  /** Release year as text, or null when TMDB has no date. */
  year: string | null;
  director: string | null;
  /** Personal 0–5 score, null when unrated. */
  rating: number | null;
};

/** A label/value pair plus its share of the leader — `ratio` is what gets drawn. */
export type RankedItem = { name: string; count: number; ratio: number; id: number | null };

export type PodiumEntry = RankedItem & { place: 1 | 2 | 3; initials: string };

export type WallEntry = RankedItem & { fontSize: number; opacity: number };

export type LeaderboardRow = {
  name: string;
  initials: string;
  hours: number;
  ratio: number;
  isYou: boolean;
};

/** Heatmap cell levels. -1 is a padding day outside the year. */
export type HeatLevel = -1 | 0 | 1 | 2 | 3 | 4;

export type MonthlyRecap = {
  version: number;
  kind: 'month';
  key: string;
  /** "JULY" — the cover word. */
  display: string;
  year: string;
  titles: number;
  hours: number;
  activeDays: number;
  /** Same numbers for the month before, for the comparison bars. */
  previous: { short: string; hours: number } | null;
  /** Whole-percent change against `previous.hours`, null when there is nothing to compare. */
  deltaPercent: number | null;
  topGenre: RankedItem | null;
  film: TitleCard | null;
  /** The rest of the month's best, behind `film` — highest rated first. */
  runnersUp: RatedPoster[];
  leaderboard: LeaderboardRow[];
  /** Title everyone on the leaderboard watched this month, when there is one. */
  sharedTitle: string | null;
};

export type YearlyRecap = {
  version: number;
  kind: 'year';
  key: string;
  /** Which annual report this is — 1 for a user's first year of tracking. */
  edition: number;
  titles: number;
  hours: number;
  activeDays: number;
  avgRating: string;
  typeCounts: { movie: number; tv: number };
  moviePercent: number;
  longestStreak: number;
  streakRange: { from: string; to: string } | null;
  busiestMonth: { name: string; count: number } | null;
  quietestMonth: { name: string; count: number } | null;
  /** 53 columns of 7 days, Monday-first, padded either side of the year. */
  weeks: HeatLevel[][];
  genres: WallEntry[];
  directors: PodiumEntry[];
  decades: RankedItem[];
  medianYear: string | null;
  oldest: { title: string; year: string } | null;
  /** Only the genuine fives. Empty is a real answer, not something to pad. */
  masterpieces: PosterRef[];
  masterpiecePercent: number;
  /**
   * The best you actually gave, for the year where nothing reached five. Ordered
   * by score, so the slide can name the ceiling instead of picking a title at
   * random to stand in for a masterpiece.
   */
  topRated: RatedPoster[];
  rewatch: (TitleCard & { times: number }) | null;
  classification: { name: string; blurb: string };
};

export type Recap = MonthlyRecap | YearlyRecap;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

/** "second" for 2. Falls back to "12th" past the words that read well. */
export function ordinalWord(place: number): string {
  return ORDINALS[place - 1] ?? `${place}th`;
}

/** Share of the leader, 0–1. Guards the empty and all-zero cases. */
export function ratioOf(count: number, max: number): number {
  if (!max || max <= 0) return 0;
  return Math.min(1, Math.max(0, count / max));
}

export function rank(
  entries: { name: string; count: number; id?: number | null }[],
  limit = entries.length,
): RankedItem[] {
  const sorted = [...entries].sort((a, b) => b.count - a.count).slice(0, limit);
  const max = sorted[0]?.count ?? 0;
  return sorted.map((e) => ({ name: e.name, count: e.count, ratio: ratioOf(e.count, max), id: e.id ?? null }));
}

/**
 * The type wall: size *is* the data, so both the point size and the ink are
 * interpolated from each entry's true share of the leader rather than from its
 * rank. Two genres one apart in count therefore look one apart, which is the
 * whole reason for choosing this layout over ranked bars.
 */
export function typeWall(entries: RankedItem[], maxSize = 52, minSize = 14): WallEntry[] {
  return entries.map((e) => ({
    ...e,
    fontSize: Math.round(minSize + (maxSize - minSize) * e.ratio),
    // Kept above .5 so the tail stays legible on near-black (the design system's
    // own contrast finding about GenreTag rank="low").
    opacity: Number((0.55 + 0.45 * e.ratio).toFixed(2)),
  }));
}

/** Top three in reading order 2 · 1 · 3, which is how a podium is looked at. */
export function podium(entries: RankedItem[]): PodiumEntry[] {
  const [first, second, third] = entries;
  const ordered: { entry: RankedItem | undefined; place: 1 | 2 | 3 }[] = [
    { entry: second, place: 2 },
    { entry: first, place: 1 },
    { entry: third, place: 3 },
  ];
  return ordered
    .filter((o): o is { entry: RankedItem; place: 1 | 2 | 3 } => !!o.entry)
    .map(({ entry, place }) => ({ ...entry, place, initials: initials(entry.name) }));
}

/**
 * Plinth height in px for a podium column. The ratio is honoured exactly — the
 * value and the name sit *above* the plinth rather than inside it, so a 1-vs-9
 * director still reads its own label instead of being clipped by a short bar.
 */
export function plinthHeight(ratio: number, max = 170): number {
  return Math.max(6, Math.round(ratio * max));
}

function levelFor(films: number, episodes: number): HeatLevel {
  if (films > 0) return films > 1 ? 2 : 1;
  if (episodes > 0) return episodes > 2 ? 4 : 3;
  return 0;
}

/**
 * A year as Monday-first week columns. Days before 1 January and after 31
 * December are level -1 so the grid keeps its rectangle without pretending the
 * padding was a quiet day.
 */
export function heatmapWeeks(
  year: number,
  dailyCompletions: Record<string, number>,
  dailyEpisodes: Record<string, number>,
): HeatLevel[][] {
  const first = new Date(year, 0, 1);
  const cursor = new Date(first);
  // Monday-anchored, matching lib/stats weekStart.
  cursor.setDate(cursor.getDate() - (cursor.getDay() === 0 ? 6 : cursor.getDay() - 1));
  const last = new Date(year, 11, 31);
  const weeks: HeatLevel[][] = [];

  while (cursor <= last) {
    const week: HeatLevel[] = [];
    for (let i = 0; i < 7; i++) {
      if (cursor.getFullYear() !== year) {
        week.push(-1);
      } else {
        const key = dateKey(cursor);
        week.push(levelFor(dailyCompletions[key] || 0, dailyEpisodes[key] || 0));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}
