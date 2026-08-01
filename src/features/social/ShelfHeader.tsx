import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeftRight, ListVideo } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/features/friends/Avatar';
import type { ShelfStats } from '@/lib/shelfSummary';
import { formatScore } from '@/lib/socialFeed';
import type { Profile } from '@/types/movie';

type ShelfHeaderProps = {
  profile: Profile;
  stats: ShelfStats;
  /** Poster behind the header — their most recently logged title. */
  backdropUrl: string | null;
  onCompare: () => void;
  onWatchTogether: () => void;
};

/** Identity, three numbers, and the two things you can do together. */
export function ShelfHeader({ profile, stats, backdropUrl, onCompare, onWatchTogether }: ShelfHeaderProps) {
  const name = profile.displayName || profile.username;
  const cells: { value: string; label: string }[] = [
    { value: String(stats.films), label: 'films' },
    { value: String(stats.thisYear), label: 'this yr' },
    { value: stats.average == null ? '—' : formatScore(stats.average), label: 'avg' },
  ];

  return (
    <View className="overflow-hidden">
      {!!backdropUrl && (
        <Image
          source={{ uri: backdropUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={30}
          transition={200}
          accessibilityElementsHidden
        />
      )}
      {/* Without the wash, light posters make the name unreadable. */}
      <LinearGradient
        colors={['rgba(10,10,10,0.45)', 'rgba(10,10,10,0.92)', 'hsl(0 0% 3.9%)']}
        locations={[0, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View className="gap-3.5 px-4 pb-4 pt-5">
        <View className="flex-row items-end gap-3">
          <View className="rounded-full border-[3px] border-background">
            <Avatar profile={profile} size={68} />
          </View>
          <View className="min-w-0 flex-1 pb-1">
            <Text numberOfLines={2} className="text-[19px] font-bold tracking-tight text-foreground">
              {name}
            </Text>
            <Text numberOfLines={1} className="mt-0.5 text-[12.5px] text-foreground/70">
              @{profile.username}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          {cells.map((cell) => (
            <View key={cell.label} className="flex-1 rounded-[10px] border border-border bg-black/40 px-2.5 py-2">
              <Text className="text-[17px] font-bold tracking-tight text-foreground">{cell.value}</Text>
              <Text className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {cell.label}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row gap-2">
          <Pressable
            onPress={onCompare}
            accessibilityRole="button"
            className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-primary active:opacity-80"
          >
            <ArrowLeftRight size={16} color="#fff" />
            <Text className="text-[13px] font-bold text-primary-foreground">Compare</Text>
          </Pressable>
          <Pressable
            onPress={onWatchTogether}
            accessibilityRole="button"
            className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-border bg-black/40 active:opacity-70"
          >
            <ListVideo size={16} color="hsl(0 0% 92%)" />
            <Text className="text-[13px] font-semibold text-foreground">Watch together</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
