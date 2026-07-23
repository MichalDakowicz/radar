import { BarChart3, CheckCircle2, Clock, Film, Flame, History, Star, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ContentMix } from '@/components/stats/ContentMix';
import { DecadeBars } from '@/components/stats/DecadeBars';
import { DirectorItem } from '@/components/stats/DirectorItem';
import { GenreTag, type GenreRank } from '@/components/stats/GenreTag';
import { HistoryPill } from '@/components/stats/HistoryPill';
import { Masterpieces } from '@/components/stats/Masterpieces';
import { QuickStat } from '@/components/stats/QuickStat';
import { StreakCalendar } from '@/components/stats/StreakCalendar';
import { ThinProgressBar } from '@/components/stats/ThinProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useStats } from '@/features/stats/useStats';
import type { ActivityEvent, Movie } from '@/types/movie';

const MUTED = 'hsl(0 0% 63.9%)';

function genreRank(index: number): GenreRank {
  if (index <= 1) return 'top';
  if (index <= 3) return 'high';
  if (index < 6) return 'mid';
  return 'low';
}

type StatsViewProps = {
  movies: Movie[];
  activities: ActivityEvent[];
  // Own-stats screen passes these to enable navigation; the public shelf omits
  // them so the view is read-only (no edit tap-through, no completion managers).
  onOpenMovie?: (movie: Movie) => void;
  onManageMovies?: (date: string) => void;
  onManageTV?: (date: string) => void;
  // Own screen passes the user's configured weekly streak thresholds (Phase 9);
  // the public shelf omits them (user_settings is owner-only) so streaks use
  // the defaults.
  streakThreshold?: number;
  tvStreakThreshold?: number;
};

// The shared Stats body (own screen + public shelf render the same component,
// per doc 03 "same component reads userId"). All derivation is in lib/stats.ts;
// this is the composition layer, extracted from (tabs)/stats.tsx in Phase 8.
export function StatsView({
  movies,
  activities,
  onOpenMovie,
  onManageMovies,
  onManageTV,
  streakThreshold,
  tvStreakThreshold,
}: StatsViewProps) {
  const stats = useStats(movies, { streakThreshold, tvStreakThreshold });
  const [calendarView, setCalendarView] = useState<'movies' | 'tv'>('movies');

  if (!stats) {
    return (
      <EmptyState
        icon={<BarChart3 size={40} color={MUTED} />}
        title="No data yet"
        description="No tracked titles to build stats from."
      />
    );
  }

  const topGenre = stats.topGenres[0]?.name ?? 'N/A';
  const maxDirector = stats.topDirectors[0]?.count ?? 1;
  const isMovieView = calendarView === 'movies';

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      {/* Recent activity rail */}
      {activities.length > 0 && (
        <View className="pt-6">
          <View className="mb-4 flex-row items-center gap-2 px-4">
            <History size={18} color={MUTED} />
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent Activity</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {activities.map((item) => (
              <HistoryPill key={item.id} event={item} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Overview grid */}
      <View className="my-6 flex-row flex-wrap gap-x-4 gap-y-8 border-y border-border/50 px-4 py-8">
        <View className="w-[47%]">
          <QuickStat value={stats.totalMovies} label="Total Items" icon={<Film size={16} color={MUTED} />} />
        </View>
        <View className="w-[47%]">
          <QuickStat value={`${stats.totalHours}h`} label="Time Watched" icon={<Clock size={16} color={MUTED} />} />
        </View>
        <View className="w-[47%]">
          <QuickStat value={stats.watchedCount} label="Completed" icon={<CheckCircle2 size={16} color={MUTED} />} />
        </View>
        <View className="w-[47%]">
          <QuickStat value={topGenre} label="Top Genre" icon={<Trophy size={16} color={MUTED} />} />
        </View>
        <View className="w-[47%]">
          <QuickStat value={stats.avgRating} label="Avg Rating" icon={<Star size={16} color={MUTED} />} suffix="/5" />
        </View>
        <View className="w-[47%]">
          <QuickStat value={`${stats.completionRate}%`} label="Completion" icon={<BarChart3 size={16} color={MUTED} />} />
        </View>
        <View className="w-[47%]">
          <QuickStat value={stats.currentStreak} label="Movie Streak" icon={<Flame size={16} color={MUTED} />} />
        </View>
        <View className="w-[47%]">
          <QuickStat value={stats.currentTVStreak} label="TV Streak" icon={<Flame size={16} color={MUTED} />} />
        </View>
      </View>

      {/* Streak calendars (movie / TV toggle) */}
      <View className="mb-10 gap-4 px-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row gap-2">
            <Text
              onPress={() => setCalendarView('movies')}
              className={`overflow-hidden rounded-lg px-3 py-1.5 text-xs font-medium ${
                isMovieView ? 'bg-blue-600 text-white' : 'bg-secondary text-muted-foreground'
              }`}
            >
              Movies
            </Text>
            <Text
              onPress={() => setCalendarView('tv')}
              className={`overflow-hidden rounded-lg px-3 py-1.5 text-xs font-medium ${
                !isMovieView ? 'bg-purple-600 text-white' : 'bg-secondary text-muted-foreground'
              }`}
            >
              TV Shows
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Flame size={13} color={isMovieView ? 'hsl(217 91% 60%)' : 'hsl(271 91% 65%)'} />
            <Text className="text-xs text-muted-foreground">
              {isMovieView ? stats.currentStreak : stats.currentTVStreak} days · Longest{' '}
              {isMovieView ? stats.longestStreak : stats.longestTVStreak}
            </Text>
          </View>
        </View>

        {isMovieView ? (
          <StreakCalendar daily={stats.dailyCompletions} accent="movie" unit="movie" onDayPress={onManageMovies} />
        ) : (
          <StreakCalendar daily={stats.dailyEpisodes} accent="tv" unit="episode" onDayPress={onManageTV} />
        )}
      </View>

      {/* Masterpieces (formerly Hall of Fame) */}
      <View className="mb-12">
        <Masterpieces movies={movies} onPress={onOpenMovie} />
      </View>

      {/* Status breakdown */}
      <View className="mb-12 px-4">
        <Text className="mb-6 text-2xl font-bold tracking-tight text-foreground">Status Breakdown</Text>
        <View className="gap-6">
          {stats.sortedStatus.slice(0, 3).map((s) => (
            <ThinProgressBar key={s.name} label={s.name} value={s.count} max={stats.totalMovies} />
          ))}
        </View>
      </View>

      {/* Content mix */}
      <View className="mb-12 px-4">
        <Text className="mb-6 text-2xl font-bold tracking-tight text-foreground">Content Mix</Text>
        <ContentMix movieCount={stats.typeCounts.movie} tvCount={stats.typeCounts.tv} total={stats.totalMovies} />
      </View>

      {/* Release eras */}
      {stats.sortedDecades.length > 0 && (
        <View className="mb-12 px-4">
          <Text className="mb-6 text-2xl font-bold tracking-tight text-foreground">Release Eras</Text>
          <DecadeBars decades={stats.sortedDecades} />
        </View>
      )}

      {/* Most watched directors */}
      {stats.topDirectors.length > 0 && (
        <View className="mb-12 px-4">
          <Text className="mb-6 text-2xl font-bold tracking-tight text-foreground">Most Watched Directors</Text>
          <View>
            {stats.topDirectors.map((d) => (
              <DirectorItem key={d.name} name={d.name} count={d.count} max={maxDirector} directorId={d.id} />
            ))}
          </View>
        </View>
      )}

      {/* Favorite genres */}
      {stats.topGenres.length > 0 && (
        <View className="mb-12 px-4">
          <Text className="mb-6 text-2xl font-bold tracking-tight text-foreground">Favorite Genres</Text>
          <View className="flex-row flex-wrap gap-3">
            {stats.topGenres.map((g, i) => (
              <GenreTag key={g.name} name={g.name} count={g.count} rank={genreRank(i)} genreId={g.id} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
