import { useLocalSearchParams } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatsView } from '@/features/stats/StatsView';
import { useCanViewUser, usePublicActivity, usePublicMovies } from '@/hooks/usePublicMovies';

const MUTED = 'hsl(0 0% 45%)';

// Public stats - the same StatsView the own-stats screen renders, minus the
// navigation callbacks so it's read-only (no edit tap-through / completion
// managers). RLS gates the underlying reads (doc 03: same component reads userId).
export default function PublicStats() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { canView, loading: viewLoading } = useCanViewUser(userId);
  const { movies, loading, error } = usePublicMovies(canView ? userId : undefined);
  const { activities } = usePublicActivity(canView ? userId : undefined, 20);

  if (viewLoading || (canView && loading)) {
    return (
      <View className="flex-1 bg-background">
        <LoadingState label="Loading stats…" />
      </View>
    );
  }

  if (canView === false) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState icon={<Lock size={40} color={MUTED} />} title="These stats are private" description="Only friends can view this user's stats." />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load stats'} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatsView movies={movies} activities={activities} />
    </View>
  );
}
