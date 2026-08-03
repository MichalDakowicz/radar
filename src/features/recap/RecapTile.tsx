import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

import { periodDisplayName, periodLabel, type RecapKind } from '@/lib/recapPeriod';

export const TILE_W = 142;
export const TILE_H = 156;

type RecapTileProps = {
  kind: RecapKind;
  periodKey: string;
  onPress: () => void;
};

// Two palettes, one per kind, so a month and a year never read as the same
// object at a glance: blue is the monthly reel, purple the annual report — the
// same pairing the rest of the app uses for movies and TV.
const PALETTE: Record<RecapKind, { bg: [string, string]; shapes: string[] }> = {
  month: { bg: ['#12213f', '#0b0f1a'], shapes: ['#3b82f6', '#60a5fa', '#ec4899'] },
  year: { bg: ['#241540', '#100b1a'], shapes: ['#a855f7', '#c084fc', '#fbbf24'] },
};

/** Stable pseudo-random per period, so a tile's art never changes under you. */
function hash(seed: string): number {
  let value = 0;
  for (let i = 0; i < seed.length; i++) value = (value * 31 + seed.charCodeAt(i)) % 9973;
  return value;
}

/**
 * One recap as a piece of cover art rather than a row in a card. The rail is the
 * point: recaps are a small set of collectable things, and a tile you can
 * recognise by its shape beats a list item that spells the same words.
 */
export function RecapTile({ kind, periodKey, onPress }: RecapTileProps) {
  const palette = PALETTE[kind];
  const seed = hash(`${kind}:${periodKey}`);
  const title = kind === 'year' ? periodKey : periodDisplayName('month', periodKey).charAt(0) + periodDisplayName('month', periodKey).slice(1).toLowerCase();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play the ${periodLabel(kind, periodKey)} recap`}
      className="overflow-hidden rounded-2xl active:opacity-80"
      style={{ width: TILE_W, height: TILE_H }}
    >
      <LinearGradient colors={palette.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 12, justifyContent: 'flex-end' }}>
        {/* Decorative only — the label underneath carries the meaning, so none of
            this is exposed to the screen reader. */}
        <View pointerEvents="none" className="absolute inset-0">
          <View
            style={{
              position: 'absolute',
              top: 10 + (seed % 14),
              right: 8 + (seed % 10),
              width: 46,
              height: 46,
              borderRadius: 99,
              backgroundColor: palette.shapes[0],
              opacity: 0.9,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 40 + (seed % 9),
              left: 12 + (seed % 12),
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: palette.shapes[1],
              opacity: 0.5,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 22 + (seed % 20),
              right: 44 + (seed % 8),
              width: 22,
              height: 22,
              borderRadius: 99,
              backgroundColor: palette.shapes[2],
              opacity: 0.55,
            }}
          />
          {/* Keeps the label readable whatever the shapes land on. */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,.72)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 74 }}
          />
        </View>

        <Text numberOfLines={1} className="text-[17px] font-bold text-white">
          {title}
        </Text>
        <Text className="text-[11.5px] text-white/60">{kind === 'year' ? 'annual report' : 'recap'}</Text>
      </LinearGradient>
    </Pressable>
  );
}
