import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * How many of your friends are also friends with each of these people — the
 * only thing Radar honestly knows about a stranger who has requested you.
 *
 * One query, not one per requester: ask for the friendship rows *your* friends
 * own that point at any of the senders. RLS lets you read a friend's rows
 * (friendships_read → can_view), so a friend who has gone private simply does
 * not contribute, which is the correct answer rather than a wrong count.
 */
export function useMutualFriends(candidateIds: string[], myFriendIds: string[]) {
  const candidateKey = [...candidateIds].sort().join(',');
  const friendKey = [...myFriendIds].sort().join(',');

  const query = useQuery({
    queryKey: ['mutualFriends', candidateKey, friendKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .in('user_id', myFriendIds)
        .in('friend_id', candidateIds);
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data as { friend_id: string }[]) {
        counts[row.friend_id] = (counts[row.friend_id] ?? 0) + 1;
      }
      return counts;
    },
    enabled: candidateIds.length > 0 && myFriendIds.length > 0,
  });

  return query.data ?? {};
}

export function mutualLabel(count: number): string {
  if (count <= 0) return '';
  return count === 1 ? '1 friend in common' : `${count} friends in common`;
}
