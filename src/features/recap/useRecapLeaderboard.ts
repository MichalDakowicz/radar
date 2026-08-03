import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { usePublicFriends } from '@/hooks/useFriends';
import { normalizeMovie, type MovieRow } from '@/lib/normalizeMovie';
import { leaderboardRow } from '@/lib/recapBuild';
import { periodRange } from '@/lib/recapPeriod';
import { computeStats } from '@/lib/stats';
import { scopeMoviesToPeriod } from '@/lib/statsPeriod';
import { supabase } from '@/lib/supabase';
import type { LeaderboardRow } from '@/lib/recap';
import type { Movie } from '@/types/movie';

// The monthly recap's "among your friends" slide. One query for everybody's rows
// rather than one per friend: movies_visible_read already filters to what each
// friendship and visibility setting allows, so a friend who hid their shelf
// simply contributes no rows and drops off the board.

// Enough of public.movies to run the same runtime maths the Stats screen does.
// normalizeMovie fills the rest with its own defaults.
const COLUMNS =
  'id, user_id, type, title, runtime, times_watched, watched, in_progress, in_watchlist, status, completed_at, episodes_watched, episode_watch_dates, number_of_episodes, number_of_seasons, added_at';

export type LeaderboardResult = { rows: LeaderboardRow[]; sharedTitle: string | null };

const EMPTY: LeaderboardResult = { rows: [], sharedTitle: null };

/** Titles finished inside the window, per person, as a lowercase title set. */
function finishedTitles(movies: Movie[]): Set<string> {
  return new Set(movies.filter((m) => m.completedAt).map((m) => m.title.toLowerCase()));
}

async function fetchLeaderboard(
  key: string,
  names: Map<string, string>,
  meId: string,
): Promise<LeaderboardResult> {
  const ids = [...names.keys()];
  const { data, error } = await supabase.from('movies').select(COLUMNS).in('user_id', ids);
  if (error) throw error;

  const { start, end } = periodRange('month', key);
  const byUser = new Map<string, Movie[]>();
  for (const row of data as unknown as MovieRow[]) {
    const movie = normalizeMovie(row);
    const list = byUser.get(movie.userId);
    if (list) list.push(movie);
    else byUser.set(movie.userId, [movie]);
  }

  const scored = ids
    .map((id) => {
      const scoped = scopeMoviesToPeriod(byUser.get(id) ?? [], start, end);
      return { id, hours: computeStats(scoped)?.totalHours ?? 0, titles: finishedTitles(scoped) };
    })
    .sort((a, b) => b.hours - a.hours);

  const top = scored[0]?.hours ?? 0;
  const rows = scored.map((entry) => leaderboardRow(names.get(entry.id) ?? 'Someone', entry.hours, top, entry.id === meId));

  // A title everybody on the board watched this month. Read from the whole
  // board, not the visible top three — that it is shared is the point.
  const active = scored.filter((entry) => entry.titles.size > 0);
  const shared =
    active.length > 1
      ? [...active[0].titles].find((title) => active.every((entry) => entry.titles.has(title)))
      : undefined;
  const sharedOwner = shared
    ? (byUser.get(active[0].id) ?? []).find((m) => m.title.toLowerCase() === shared)
    : undefined;

  return { rows, sharedTitle: sharedOwner?.title ?? null };
}

/**
 * Hours per person for one month, you included, plus the title you all watched.
 * Pass null to skip entirely (the yearly report has no leaderboard slide).
 */
export function useRecapLeaderboard(key: string | null): { data: LeaderboardResult; loading: boolean } {
  const { user } = useAuth();
  const { friends } = usePublicFriends(user?.id);

  const names = new Map<string, string>();
  if (user?.id) names.set(user.id, 'You');
  for (const friend of friends) names.set(friend.id, friend.displayName || friend.username);

  const friendIds = friends.map((f) => f.id).sort();
  const query = useQuery({
    // Keyed on the friend list, not just the month: gaining a friend changes the
    // board, and the recap is only snapshotted once the board is settled.
    queryKey: ['recapLeaderboard', user?.id, key, friendIds],
    queryFn: () => fetchLeaderboard(key!, names, user!.id),
    // Nothing to rank when you have no friends — the slide is dropped instead.
    enabled: !!user?.id && !!key && friendIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return { data: query.data ?? EMPTY, loading: query.isLoading && friendIds.length > 0 };
}
