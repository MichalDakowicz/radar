import { isWatched } from '@/lib/movieStatus';
import type { Movie } from '@/types/movie';

// Pure stats derivation ported from legacy pages/Stats.jsx's 550-line useMemo.
// The four near-identical streak blocks in the original (movie current, movie
// longest, TV current, TV longest) collapse into computeCurrentStreak /
// computeLongestStreak here - same weekly-threshold rules, one implementation.

/** Cast entries per title that count towards the actor ranking. */
export const BILLED_CAST_DEPTH = 5;

export const DEFAULT_STREAK_THRESHOLD = 2; // movies completed per week
export const DEFAULT_TV_STREAK_THRESHOLD = 5; // episodes watched per week

export type StatusSlice = { name: string; count: number; percent: number };
export type DirectorSlice = { name: string; count: number; id?: number };
/** A performer plus the headshot the first title they appeared in carried. */
export type ActorSlice = DirectorSlice & { image?: string | null };
export type GenreSlice = { name: string; count: number; percent: number; id?: number };
export type DecadeSlice = { decade: string; count: number };

export type Stats = {
  totalMovies: number;
  sortedStatus: StatusSlice[];
  totalHours: number;
  avgRating: string;
  typeCounts: { movie: number; tv: number };
  topDirectors: DirectorSlice[];
  topActors: ActorSlice[];
  topGenres: GenreSlice[];
  sortedDecades: DecadeSlice[];
  completionRate: number;
  watchedCount: number;
  currentStreak: number;
  longestStreak: number;
  currentTVStreak: number;
  longestTVStreak: number;
  /** date "YYYY-MM-DD" -> movies completed that day */
  dailyCompletions: Record<string, number>;
  /** date "YYYY-MM-DD" -> episodes watched that day */
  dailyEpisodes: Record<string, number>;
};

/** Local-time date key "YYYY-MM-DD". */
export function dateKey(input: string | number | Date): string {
  const d = new Date(input);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Monday-anchored start-of-week at 00:00 local. */
export function weekStart(input: Date): Date {
  const d = new Date(input);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Sunday -> back 6, else back to Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function countInWeek(daily: Record<string, number>, start: Date): number {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    count += daily[dateKey(d)] || 0;
  }
  return count;
}

/**
 * Consecutive-day streak walking back from `now`. A day contributes when it has
 * activity and its week meets `threshold` (the current week counts with any
 * activity). Empty days are skipped only while their week still qualifies.
 */
export function computeCurrentStreak(daily: Record<string, number>, threshold: number, now: Date): number {
  if (Object.keys(daily).length === 0) return 0;

  const thisWeekStart = weekStart(now).getTime();
  let streak = 0;
  const cursor = new Date(now);

  while (true) {
    const start = weekStart(cursor);
    const inWeek = countInWeek(daily, start);
    const isCurrentWeek = start.getTime() === thisWeekStart;
    const weekQualifies = inWeek >= threshold || (isCurrentWeek && inWeek > 0);

    if ((daily[dateKey(cursor)] || 0) > 0) {
      if (weekQualifies) streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (weekQualifies) {
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Longest historical run under the same weekly-threshold rules. */
export function computeLongestStreak(daily: Record<string, number>, threshold: number): number {
  const keys = Object.keys(daily).sort();
  if (keys.length === 0) return 0;

  const cursor = new Date(keys[0]);
  const end = new Date(keys[keys.length - 1]);
  let temp = 0;
  let longest = 0;

  while (cursor <= end) {
    const inWeek = countInWeek(daily, weekStart(cursor));
    if ((daily[dateKey(cursor)] || 0) > 0) {
      if (inWeek >= threshold) {
        temp++;
        longest = Math.max(longest, temp);
      }
    } else if (inWeek < threshold) {
      temp = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return longest;
}

type ComputeOpts = {
  streakThreshold?: number;
  tvStreakThreshold?: number;
  now?: Date;
};

export function computeStats(movies: Movie[], opts: ComputeOpts = {}): Stats | null {
  if (!movies || movies.length === 0) return null;

  const streakThreshold = opts.streakThreshold ?? DEFAULT_STREAK_THRESHOLD;
  const tvStreakThreshold = opts.tvStreakThreshold ?? DEFAULT_TV_STREAK_THRESHOLD;
  const now = opts.now ?? new Date();

  const totalMovies = movies.length;
  const statusCounts: Record<string, number> = { Watchlist: 0, Watching: 0, Completed: 0 };
  const typeCounts = { movie: 0, tv: 0 };
  const directorCounts: Record<string, number> = {};
  const directorIds: Record<string, number> = {};
  const actorCounts: Record<string, number> = {};
  const actorIds: Record<string, number> = {};
  const actorImages: Record<string, string | null> = {};
  const genreCounts: Record<string, number> = {};
  const genreIds: Record<string, number> = {};
  const decadeCounts: Record<number, number> = {};

  let totalRuntimeMinutes = 0;
  let ratingSum = 0;
  let totalRatings = 0;

  for (const movie of movies) {
    const t = movie.type === 'tv' ? 'tv' : 'movie';
    typeCounts[t]++;

    if (movie.inWatchlist) statusCounts.Watchlist++;
    if (movie.inProgress) statusCounts.Watching++;
    if (movie.watched || isWatched(movie)) statusCounts.Completed++;

    // Runtime: movies scale by times watched; TV by watched episodes + full rewatches.
    const runtime = movie.runtime || 0;
    if (t === 'movie') {
      if (movie.timesWatched > 0) totalRuntimeMinutes += runtime * movie.timesWatched;
    } else {
      const watchedEps = Object.values(movie.episodesWatched || {}).filter(Boolean).length;
      const totalEps = movie.numberOfEpisodes || (movie.numberOfSeasons || 1) * 10;
      // The larger of the two readings, never their sum: a finished series
      // carries both a full set of ticked episodes *and* a watch count of one,
      // and adding them would bill you twice for the same run. A rewatch
      // (timesWatched 2) still outgrows the ticks and wins.
      totalRuntimeMinutes += runtime * Math.max(watchedEps, movie.timesWatched * totalEps);
    }

    const overall = movie.ratings?.overall;
    if (overall && overall > 0) {
      ratingSum += overall;
      totalRatings++;
    }

    // Directors carry {id, name} now (legacy needed a name->id search). Fall
    // back to cast when a title has no director (matches legacy artist fallback).
    const credits = (movie.director?.length ? movie.director : movie.cast) || [];
    for (const c of credits) {
      const name = c?.name?.trim();
      if (!name) continue;
      directorCounts[name] = (directorCounts[name] || 0) + 1;
      if (c.id != null && directorIds[name] == null) directorIds[name] = c.id;
    }

    // Only the top billing counts. Everyone TMDB lists is "in" a film, so the
    // whole cast list would rank whoever plays the most bit parts; the first
    // five are the people a viewer would say they watched.
    for (const actor of (movie.cast || []).slice(0, BILLED_CAST_DEPTH)) {
      const name = actor?.name?.trim();
      if (!name) continue;
      actorCounts[name] = (actorCounts[name] || 0) + 1;
      if (actor.id != null && actorIds[name] == null) actorIds[name] = actor.id;
      if (actor.profileUrl && actorImages[name] == null) actorImages[name] = actor.profileUrl;
    }

    for (const g of movie.genres || []) {
      const clean = g?.name?.trim();
      if (clean) {
        genreCounts[clean] = (genreCounts[clean] || 0) + 1;
        if (g.id != null && genreIds[clean] == null) genreIds[clean] = g.id;
      }
    }

    if (movie.releaseDate && movie.releaseDate.length >= 4) {
      const year = parseInt(movie.releaseDate.substring(0, 4), 10);
      if (!Number.isNaN(year)) {
        const decade = Math.floor(year / 10) * 10;
        decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
      }
    }
  }

  const sortedStatus: StatusSlice[] = Object.entries(statusCounts)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, percent: Math.round((count / totalMovies) * 100) }));

  const topDirectors: DirectorSlice[] = Object.entries(directorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count, id: directorIds[name] }));

  const topActors: ActorSlice[] = Object.entries(actorCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([name, count]) => ({ name, count, id: actorIds[name], image: actorImages[name] ?? null }));

  const topGenres: GenreSlice[] = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / totalMovies) * 100),
      id: genreIds[name],
    }));

  const sortedDecades: DecadeSlice[] = Object.entries(decadeCounts)
    .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
    .map(([decade, count]) => ({ decade: `${decade}s`, count }));

  const watchedCount = movies.filter((m) => isWatched(m)).length;
  const completionRate = Math.round((watchedCount / totalMovies) * 100);

  // Daily completion buckets feed both the streaks and the calendars.
  const dailyCompletions: Record<string, number> = {};
  for (const m of movies) {
    if (isWatched(m) && m.completedAt) {
      const key = dateKey(m.completedAt);
      dailyCompletions[key] = (dailyCompletions[key] || 0) + 1;
    }
  }

  const dailyEpisodes: Record<string, number> = {};
  for (const m of movies) {
    if (m.type !== 'tv' || !m.episodeWatchDates) continue;
    for (const ts of Object.values(m.episodeWatchDates)) {
      const key = dateKey(ts);
      dailyEpisodes[key] = (dailyEpisodes[key] || 0) + 1;
    }
  }

  return {
    totalMovies,
    sortedStatus,
    totalHours: Math.round(totalRuntimeMinutes / 60),
    avgRating: totalRatings > 0 ? (ratingSum / totalRatings).toFixed(1) : '0',
    typeCounts,
    topDirectors,
    topActors,
    topGenres,
    sortedDecades,
    completionRate,
    watchedCount,
    currentStreak: computeCurrentStreak(dailyCompletions, streakThreshold, now),
    longestStreak: computeLongestStreak(dailyCompletions, streakThreshold),
    currentTVStreak: computeCurrentStreak(dailyEpisodes, tvStreakThreshold, now),
    longestTVStreak: computeLongestStreak(dailyEpisodes, tvStreakThreshold),
    dailyCompletions,
    dailyEpisodes,
  };
}
