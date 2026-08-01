import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/features/friends/Avatar';
import type { Profile } from '@/types/movie';

export type RailEntry = { profile: Profile; fresh: number };

type ActivityRailProps = {
  entries: RailEntry[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

const AVATAR = 46;

/**
 * The friend strip above the feed. A ring marks someone who has logged
 * something since your last visit and the badge is how much — both derived from
 * stored activity, so neither claims anyone is online.
 *
 * Tapping filters the feed to that person; tapping the lit one clears it.
 */
export function ActivityRail({ entries, selectedId, onSelect }: ActivityRailProps) {
  if (entries.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3 px-4 pb-3 pt-3.5"
    >
      {entries.map(({ profile, fresh }) => {
        const name = profile.displayName || profile.username;
        const first = name.split(' ')[0];
        const active = selectedId === profile.id;
        return (
          <Pressable
            key={profile.id}
            onPress={() => onSelect(active ? null : profile.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              fresh > 0 ? `Filter activity to ${name}, ${fresh} new` : `Filter activity to ${name}`
            }
            className="w-[58px] items-center gap-1.5 active:opacity-70"
          >
            <View className="h-14 w-14 items-center justify-center">
              {fresh > 0 && <View className="absolute inset-0 rounded-full border-2 border-primary" />}
              <View
                className="overflow-hidden rounded-full"
                style={{ borderWidth: 2, borderColor: active ? 'hsl(217 91% 60%)' : 'transparent' }}
              >
                <Avatar profile={profile} size={AVATAR} />
              </View>
              {fresh > 0 && (
                <View className="absolute -bottom-0.5 -right-0.5 min-w-[18px] items-center justify-center rounded-full border-[2.5px] border-background bg-primary px-1">
                  <Text className="text-[9.5px] font-bold text-white">{fresh}</Text>
                </View>
              )}
            </View>
            <Text
              numberOfLines={1}
              className={`max-w-[58px] text-[10.5px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {first}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
