import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { RequestCard } from '@/features/social/RequestCard';
import { mutualLabel, useMutualFriends } from '@/features/social/useMutualFriends';
import { useFriends } from '@/hooks/useFriends';

/**
 * Pending friend requests, at the top of the inbox. Kept as accept/decline cards
 * rather than folded into the notification list: a request is the one kind you
 * can act on without going anywhere, and a row that only says "someone asked"
 * would make you tap twice to do the obvious thing.
 *
 * Renders nothing at all when the queue is empty — the inbox's own empty state
 * covers that case, and a "no requests" heading above a list of notifications
 * would be answering a question nobody asked.
 */
export function InboxRequests() {
  const { show } = useToast();
  const { friends, requests, acceptRequest, rejectRequest } = useFriends();

  const senderIds = useMemo(() => requests.map((request) => request.profile.id), [requests]);
  const friendIds = useMemo(() => friends.map((friend) => friend.id), [friends]);
  const mutuals = useMutualFriends(senderIds, friendIds);

  const busy = acceptRequest.isPending || rejectRequest.isPending;

  const guard = (promise: Promise<unknown>, done: string) =>
    promise.then(() => show(done)).catch((error) => show(error instanceof Error ? error.message : 'Something went wrong'));

  if (requests.length === 0) return null;

  return (
    <View className="gap-3">
      <Text className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {requests.length === 1 ? 'Friend request' : `Friend requests · ${requests.length}`}
      </Text>
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
    </View>
  );
}
