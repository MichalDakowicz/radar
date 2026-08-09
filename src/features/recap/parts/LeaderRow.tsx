import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { MONO, RECAP } from '@/features/recap/recapTheme';
import type { LeaderboardRow } from '@/lib/recap';

type LeaderRowProps = { row: LeaderboardRow; place: number };

// Avatar tints, picked by initials so the same friend keeps the same colour
// across slides without a profile picture having to load inside the story.
const TINTS: [string, string][] = [
  ['#7c3aed', '#ec4899'],
  ['#0f766e', '#22c55e'],
  ['#b45309', '#f59e0b'],
  ['#be123c', '#f43f5e'],
  ['#0e7490', '#22d3ee'],
];

function tintFor(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return TINTS[hash % TINTS.length];
}

/** One person on the monthly leaderboard. Your own row is the highlighted one. */
export function LeaderRow({ row, place }: LeaderRowProps) {
  const tint: [string, string] = row.isYou ? ['#3b82f6', '#1d4ed8'] : tintFor(row.initials + row.name);

  return (
    <View
      className="flex-row items-center gap-3"
      style={
        row.isYou
          ? {
              marginHorizontal: -12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(59,130,246,.4)',
              backgroundColor: 'rgba(59,130,246,.12)',
            }
          : undefined
      }
    >
      <Text
        style={{ fontFamily: MONO, fontSize: 12, fontWeight: '600', width: 14, color: row.isYou ? RECAP.movieSoft : RECAP.muted }}
      >
        {place}
      </Text>
      <LinearGradient
        colors={tint}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 34, height: 34, borderRadius: 99, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{row.initials}</Text>
      </LinearGradient>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: RECAP.ink, flexShrink: 1 }}>
            {row.name}
          </Text>
          <Text style={{ fontFamily: MONO, fontSize: 12, fontWeight: '600', color: row.isYou ? RECAP.ink : RECAP.muted }}>
            {row.hours}h
          </Text>
        </View>
        <View className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ backgroundColor: RECAP.line }}>
          <View
            className="h-full rounded-full"
            style={{ width: `${row.ratio * 100}%`, backgroundColor: row.isYou ? RECAP.movieSoft : '#525252' }}
          />
        </View>
      </View>
    </View>
  );
}
