import { Inbox } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { NestedHeader } from '@/features/social/NestedHeader';
import { RequestCard } from '@/features/social/RequestCard';
import { mutualLabel, useMutualFriends } from '@/features/social/useMutualFriends';
import { useFriends } from '@/hooks/useFriends';
import { MAX_W } from '@/hooks/useResponsive';

/** Incoming friend requests, with a real mutual-friend count where there is one. */
export default function FriendRequestsScreen() {
  const { show } = useToast();
  const { friends, requests, loading, error, acceptRequest, rejectRequest } = useFriends();

  const senderIds = useMemo(() => requests.map((r) => r.profile.id), [requests]);
  const friendIds = useMemo(() => friends.map((f) => f.id), [friends]);
  const mutuals = useMutualFriends(senderIds, friendIds);

  const busy = acceptRequest.isPending || rejectRequest.isPending;

  const guard = (promise: Promise<unknown>, done: string) =>
    promise.then(() => show(done)).catch((e) => show(e instanceof Error ? e.message : 'Something went wrong'));

  return (
    <View className="flex-1 bg-background">
      <NestedHeader title="Friend requests" />

      {loading ? (
        <LoadingState label="Loading requests…" />
      ) : error ? (
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load requests'} />
      ) : (
        <ContentShell fill maxWidth={MAX_W.text}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 px-4 pb-10 pt-4">
            {requests.map((request) => (
              <RequestCard
                key={request.profile.id}
                request={request}
                context={mutualLabel(mutuals[request.profile.id] ?? 0)}
                busy={busy}
                onAccept={() =>
                  guard(
                    acceptRequest.mutateAsync(request.profile.id),
                    `${request.profile.displayName || request.profile.username} is now a friend`,
                  )
                }
                onReject={() => guard(rejectRequest.mutateAsync(request.profile.id), 'Request declined')}
              />
            ))}

            {requests.length === 0 && (
              <EmptyState
                icon={<Inbox size={38} color="hsl(0 0% 35%)" />}
                title="Inbox clear"
                description="No pending requests. New ones land here and on the Social tab."
              />
            )}
          </ScrollView>
        </ContentShell>
      )}
    </View>
  );
}
