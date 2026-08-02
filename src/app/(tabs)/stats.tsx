import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatsView } from '@/features/stats/StatsView';
import { useActivity } from '@/hooks/useActivity';
import { useMovies } from '@/hooks/useMovies';
import { MAX_W } from '@/hooks/useResponsive';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useStatsPeriod } from '@/store/statsPeriod';
import { withTabReload } from '@/store/tabReload';
import type { Movie } from '@/types/movie';

// Own-stats screen. Data fetching + navigation wiring live here; the actual
// stats composition is the shared StatsView (also used by the public shelf,
// Phase 8). All derivation is in lib/stats.ts.
export default withTabReload(StatsScreen, 'stats');

function StatsScreen() {
  const router = useRouter();
  const { movies, loading, error } = useMovies();
  const { activities } = useActivity(20);
  const { settings } = useUserSettings();
  const period = useStatsPeriod((s) => s.period);

  const openMovie = (movie: Movie) => router.push({ pathname: '/edit/[movieId]', params: { movieId: movie.id } });

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <LoadingState label="Loading your stats…" />
      </View>
    );
  }
  if (error) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load stats'} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenTop extra={0} />
      <ContentShell fill maxWidth={MAX_W.detail}>
        <StatsView
          movies={movies}
          activities={activities}
          streakThreshold={settings.streakThreshold}
          tvStreakThreshold={settings.tvStreakThreshold}
          period={period}
          onOpenMovie={openMovie}
          onManageMovies={(date) => router.push({ pathname: '/manage-completions', params: { date } })}
          onManageTV={(date) => router.push({ pathname: '/manage-tv-completions', params: { date } })}
        />
      </ContentShell>
    </View>
  );
}
