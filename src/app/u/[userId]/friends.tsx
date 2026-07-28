import { useLocalSearchParams } from 'expo-router';
import { Lock, Users } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { FriendCard } from '@/features/friends/FriendCard';
import { usePublicFriends } from '@/hooks/useFriends';
import { useCanViewUser } from '@/hooks/usePublicMovies';
import { MAX_W, useCenteredContentStyle } from '@/hooks/useResponsive';

const MUTED = 'hsl(0 0% 45%)';

// Public friend list (legacy PublicFriends). Read-only FriendCards (no remove).
// Visibility is unified into private.can_view (doc 11) - one gate for
// movies/activity/friends alike.
export default function PublicFriendsScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { canView, loading: viewLoading } = useCanViewUser(userId);
  const { friends, loading, error } = usePublicFriends(canView ? userId : undefined);
  const contentStyle = useCenteredContentStyle(MAX_W.text);

  if (viewLoading || (canView && loading)) {
    return (
      <View className="flex-1 bg-background">
        <LoadingState label="Loading friends…" />
      </View>
    );
  }

  if (canView === false) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState icon={<Lock size={40} color={MUTED} />} title="Friends list is private" description="Only friends can view this user's connections." />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load friends'} />
      </View>
    );
  }

  if (friends.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState icon={<Users size={40} color={MUTED} />} title="No friends yet" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-3 p-4" contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
        {friends.map((profile) => (
          <FriendCard key={profile.id} profile={profile} />
        ))}
      </ScrollView>
    </View>
  );
}
