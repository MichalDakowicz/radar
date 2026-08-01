import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/features/friends/Avatar';
import type { WeekBar } from '@/lib/socialFeed';
import type { Profile } from '@/types/movie';

type WeekDigestProps = {
  bars: WeekBar[];
  total: number;
  leader: Profile | null;
  profiles: Map<string, Profile>;
  onCompareLeader: () => void;
};

/**
 * "This week" — who logged what over the trailing seven days. Bars are relative
 * to the busiest friend so the shape stays readable however lopsided the week was.
 */
export function WeekDigest({ bars, total, leader, profiles, onCompareLeader }: WeekDigestProps) {
  if (bars.length === 0) return null;
  const leaderName = leader ? (leader.displayName || leader.username).split(' ')[0] : null;

  return (
    <View className="mx-4 mt-3.5 gap-3 rounded-xl border border-border bg-primary/5 p-3.5">
      <View className="flex-row items-baseline gap-2">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-primary">This week</Text>
        <Text className="ml-auto text-[11.5px] text-muted-foreground">
          {total} {total === 1 ? 'title' : 'titles'} logged
        </Text>
      </View>

      <View className="gap-1.5">
        {bars.map((bar) => {
          const profile = profiles.get(bar.userId);
          const first = (profile?.displayName || profile?.username || '?').split(' ')[0];
          return (
            <View key={bar.userId} className="flex-row items-center gap-2.5">
              <Avatar profile={profile ?? null} size={22} />
              <Text numberOfLines={1} className="w-12 text-[11.5px] text-foreground/80">
                {first}
              </Text>
              <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <View className="h-full rounded-full bg-primary" style={{ width: `${bar.widthPct}%` }} />
              </View>
              <Text className="w-3 text-right text-[11px] text-muted-foreground">{bar.count}</Text>
            </View>
          );
        })}
      </View>

      {!!leaderName && (
        <Pressable
          onPress={onCompareLeader}
          accessibilityRole="button"
          className="h-11 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 active:opacity-70"
        >
          <Text className="text-[12.5px] font-bold text-primary">Compare taste with {leaderName}</Text>
        </Pressable>
      )}
    </View>
  );
}
