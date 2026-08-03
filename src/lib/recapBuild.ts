import { isWatched } from '@/lib/movieStatus';
import {
  heatmapWeeks,
  initials,
  podium,
  rank,
  ratioOf,
  typeWall,
  RECAP_VERSION,
  type LeaderboardRow,
  type MonthlyRecap,
  type PosterRef,
  type RatedPoster,
  type TitleCard,
  type YearlyRecap,
} from '@/lib/recap';
import { activityPeriods, monthName, periodDisplayName, periodRange, periodShortName, previousPeriodKey } from '@/lib/recapPeriod';
import { classifyViewer } from '@/lib/recapClassify';
import { computeStats, dateKey, type Stats } from '@/lib/stats';
import { scopeMoviesToPeriod } from '@/lib/statsPeriod';
import type { Movie, Ratings } from '@/types/movie';

// Turns a library into a finished recap payload. Pure: the hook feeds it the
// movies, the scoring function and (for the monthly) the friend rows it fetched,
// and gets back the exact JSON that goes into public.recaps.

export type ScoreFn = (ratings: Ratings | null | undefined) => number | null;

export type BuildInput = {
  movies: Movie[];
  score: ScoreFn;
  now?: Date;
  /** Monthly only — prepared by useRecapLeaderboard, snapshotted into the payload. */
  leaderboard?: LeaderboardRow[];
  sharedTitle?: string | null;
};

function posterRef(movie: Movie): PosterRef {
  return { title: movie.title, coverUrl: movie.coverUrl, tmdbId: movie.tmdbId, type: movie.type };
}

function releaseYear(movie: Movie): string | null {
  return movie.releaseDate && movie.releaseDate.length >= 4 ? movie.releaseDate.slice(0, 4) : null;
}

function titleCard(movie: Movie, score: ScoreFn): TitleCard {
  const rating = score(movie.ratings);
  return {
    ...posterRef(movie),
    year: releaseYear(movie),
    director: movie.director?.[0]?.name ?? null,
    rating: rating != null ? Number(rating.toFixed(1)) : null,
  };
}

/** Days with any activity at all, films and episodes together. */
function activeDayKeys(stats: Stats): string[] {
  return [...new Set([...Object.keys(stats.dailyCompletions), ...Object.keys(stats.dailyEpisodes)])].sort();
}

/** Longest run of consecutive active days, with the dates it ran between. */
export function longestRun(days: string[]): { length: number; from: string; to: string } | null {
  if (days.length === 0) return null;
  let best = { length: 1, from: days[0], to: days[0] };
  let runStart = days[0];
  let runLength = 1;

  for (let i = 1; i < days.length; i++) {
    const previous = new Date(days[i - 1]);
    previous.setDate(previous.getDate() + 1);
    if (dateKey(previous) === days[i]) {
      runLength++;
    } else {
      runStart = days[i];
      runLength = 1;
    }
    if (runLength > best.length) best = { length: runLength, from: runStart, to: days[i] };
  }
  return best;
}

/** "8 October" — how the streak sentence reads. */
export function longDate(key: string): string {
  const date = new Date(key);
  return `${date.getDate()} ${monthName(date.getMonth())}`;
}

/** Titles rated 5, newest completion first — the masterpiece grid. */
function masterpieces(movies: Movie[], score: ScoreFn, limit: number): Movie[] {
  return movies
    .filter((m) => (score(m.ratings) ?? 0) >= 5)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, limit);
}

/** Best score first, most recent breaking the tie. Ratings only, never guesses. */
function bestRated(movies: Movie[], score: ScoreFn, limit: number): RatedPoster[] {
  return movies
    .filter((m) => (score(m.ratings) ?? 0) > 0)
    .sort(
      (a, b) => (score(b.ratings) ?? 0) - (score(a.ratings) ?? 0) || (b.completedAt ?? '').localeCompare(a.completedAt ?? ''),
    )
    .slice(0, limit)
    .map((m) => ({ ...posterRef(m), rating: Number((score(m.ratings) ?? 0).toFixed(1)) }));
}

export function buildMonthlyRecap(key: string, input: BuildInput): MonthlyRecap {
  const { movies, score } = input;
  const { start, end } = periodRange('month', key);
  const scoped = scopeMoviesToPeriod(movies, start, end);
  const stats = computeStats(scoped);

  const previousKey = previousPeriodKey('month', key);
  const previousRange = periodRange('month', previousKey);
  const previousStats = computeStats(scopeMoviesToPeriod(movies, previousRange.start, previousRange.end));

  const hours = stats?.totalHours ?? 0;
  const previousHours = previousStats?.totalHours ?? 0;

  // Best-rated thing finished this month, most recent breaking the tie: the film
  // of the month is a verdict, not a timestamp.
  const finished = scoped
    .filter((m) => isWatched(m))
    .sort(
      (a, b) => (score(b.ratings) ?? 0) - (score(a.ratings) ?? 0) || (b.completedAt ?? '').localeCompare(a.completedAt ?? ''),
    );

  return {
    version: RECAP_VERSION,
    kind: 'month',
    key,
    display: periodDisplayName('month', key),
    year: String(start.getFullYear()),
    titles: stats?.watchedCount ?? 0,
    hours,
    activeDays: stats ? activeDayKeys(stats).length : 0,
    previous: previousStats ? { short: periodShortName('month', previousKey), hours: previousHours } : null,
    deltaPercent: previousHours > 0 ? Math.round(((hours - previousHours) / previousHours) * 100) : null,
    topGenre: stats ? (rank(stats.topGenres, 1)[0] ?? null) : null,
    film: finished[0] ? titleCard(finished[0], score) : null,
    // The month's other highlights, not its leftovers: the rest of what was
    // finished, best first, with the film of the month itself left out.
    runnersUp: finished.slice(1, 5).map((m) => {
      const rating = score(m.ratings);
      return { ...posterRef(m), rating: rating != null ? Number(rating.toFixed(1)) : null };
    }),
    leaderboard: input.leaderboard ?? [],
    sharedTitle: input.sharedTitle ?? null,
  };
}

export function buildYearlyRecap(key: string, input: BuildInput): YearlyRecap {
  const { movies, score } = input;
  const year = Number(key);
  const { start, end } = periodRange('year', key);
  const scoped = scopeMoviesToPeriod(movies, start, end);
  const stats = computeStats(scoped);

  const days = stats ? activeDayKeys(stats) : [];
  const run = longestRun(days);

  // Titles per calendar month, so the busiest/quietest cards name a month rather
  // than a bucket index.
  const perMonth = Array.from({ length: 12 }, () => 0);
  for (const movie of scoped) {
    if (isWatched(movie) && movie.completedAt) perMonth[new Date(movie.completedAt).getMonth()]++;
  }
  const touched = perMonth.map((count, index) => ({ name: monthName(index), count })).filter((m) => m.count > 0);
  const byCount = [...touched].sort((a, b) => b.count - a.count);

  const years = scoped.map(releaseYear).filter((y): y is string => !!y).map(Number).sort((a, b) => a - b);
  const oldestMovie = scoped
    .filter((m) => releaseYear(m))
    .sort((a, b) => (releaseYear(a) ?? '').localeCompare(releaseYear(b) ?? ''))[0];

  // Read from the unscoped library on purpose: scoping rewrites timesWatched to
  // 1 (a rewatch carries no date, so it cannot be placed inside a window). The
  // count is therefore a lifetime figure for a title finished this year, which
  // is what "kept going back to" means anyway.
  const finishedThisYear = (movie: Movie) => {
    const at = movie.completedAt ? new Date(movie.completedAt).getTime() : NaN;
    return Number.isFinite(at) && at >= start.getTime() && at < end.getTime();
  };
  const rewatched = movies
    .filter((m) => m.timesWatched > 1 && finishedThisYear(m))
    .sort((a, b) => b.timesWatched - a.timesWatched)[0];

  const titles = stats?.watchedCount ?? 0;
  const perfect = masterpieces(scoped, score, 6);
  const perfectTotal = scoped.filter((m) => (score(m.ratings) ?? 0) >= 5).length;
  const movieCount = stats?.typeCounts.movie ?? 0;
  const tvCount = stats?.typeCounts.tv ?? 0;

  return {
    version: RECAP_VERSION,
    kind: 'year',
    key,
    // Which report this is: the user's first tracked year is No. 01. Counted from
    // all activity, not from what is publishable — the year being reported on is
    // itself one of them.
    edition: activityPeriods(movies, 'year').filter((y) => Number(y) <= year).length || 1,
    titles,
    hours: stats?.totalHours ?? 0,
    activeDays: days.length,
    avgRating: stats?.avgRating ?? '0',
    typeCounts: { movie: movieCount, tv: tvCount },
    moviePercent: Math.round(ratioOf(movieCount, movieCount + tvCount) * 100),
    longestStreak: run?.length ?? 0,
    streakRange: run && run.length > 1 ? { from: longDate(run.from), to: longDate(run.to) } : null,
    busiestMonth: byCount[0] ?? null,
    quietestMonth: byCount.length > 1 ? byCount[byCount.length - 1] : null,
    weeks: heatmapWeeks(year, stats?.dailyCompletions ?? {}, stats?.dailyEpisodes ?? {}),
    genres: typeWall(rank(stats?.topGenres ?? [], 8)),
    directors: podium(rank(stats?.topDirectors ?? [], 3)),
    decades: rank(
      (stats?.sortedDecades ?? []).map((d) => ({ name: d.decade, count: d.count })),
      12,
      // Decades read chronologically, not by size — ranking gives the ratios,
      // the sort puts them back in time order.
    ).sort((a, b) => a.name.localeCompare(b.name)),
    medianYear: years.length > 0 ? String(years[Math.floor(years.length / 2)]) : null,
    oldest: oldestMovie ? { title: oldestMovie.title, year: releaseYear(oldestMovie) ?? '' } : null,
    masterpieces: perfect.map(posterRef),
    masterpiecePercent: titles > 0 ? Number(((perfectTotal / titles) * 100).toFixed(1)) : 0,
    topRated: perfect.length === 0 ? bestRated(scoped, score, 6) : [],
    rewatch: rewatched ? { ...titleCard(rewatched, score), times: rewatched.timesWatched } : null,
    classification: classifyViewer(scoped, stats),
  };
}

export function leaderboardRow(name: string, hours: number, topHours: number, isYou: boolean): LeaderboardRow {
  return { name, initials: initials(name), hours, ratio: ratioOf(hours, topHours), isYou };
}
