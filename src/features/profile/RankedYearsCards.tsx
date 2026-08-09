import { ChevronRight, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PosterThumb } from '@/features/social/PosterThumb';
import type { RankedYear } from '@/lib/rankedYears';

type RankedYearsCardsProps = {
  /** Newest year with rated titles in it. Null renders nothing at all. */
  latest: RankedYear | null;
  /** How many years have a ranking, for the "all years" card's caption. */
  yearCount: number;
  onOpenYear: (year: number) => void;
  onOpenAll: () => void;
};

const PODIUM_GAP = 6;
/** Below this a poster is too small to recognise, so the row drops a column. */
const MIN_POSTER = 44;

/**
 * Ranked years on the Profile, kept to a single row: the year you are living in
 * gets the wide card with its podium showing, and everything older sits behind
 * one arrow. A full ranking is a page, not a section — this is the door to it.
 *
 * The podium is measured rather than sized in advance: the card is `flex-1`, so
 * its width is whatever the column leaves over, and fixed-width posters would
 * either leave a gap on a tablet or overflow on a small phone.
 */
export function RankedYearsCards({ latest, yearCount, onOpenYear, onOpenAll }: RankedYearsCardsProps) {
  const [podiumWidth, setPodiumWidth] = useState(0);
  if (!latest) return null;

  const columns = podiumWidth > 0 ? Math.max(3, Math.floor((podiumWidth + PODIUM_GAP) / (MIN_POSTER + PODIUM_GAP))) : 4;
  const posterWidth = podiumWidth > 0 ? Math.floor((podiumWidth - PODIUM_GAP * (columns - 1)) / columns) : MIN_POSTER;
  const podium = latest.entries.slice(0, columns);

  return (
    <View className="gap-3">
      <View className="flex-row items-baseline gap-2">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Ranked years</Text>
        <Text className="ml-auto text-[11px] text-muted-foreground">By release year</Text>
      </View>

      <View className="flex-row items-stretch gap-2.5">
        <Pressable
          onPress={() => onOpenYear(latest.year)}
          accessibilityRole="button"
          accessibilityLabel={`Open your ${latest.year} ranking, ${latest.entries.length} titles`}
          className="min-w-0 flex-1 gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-3 active:opacity-70"
        >
          <View className="flex-row items-center gap-2">
            <Trophy size={15} color="#fbbf24" />
            <Text className="text-[14.5px] font-bold text-foreground">{latest.year} ranked</Text>
            <Text className="ml-auto text-[11px] text-muted-foreground">{latest.entries.length}</Text>
          </View>

          <View
            className="w-full flex-row justify-start"
            style={{ gap: PODIUM_GAP }}
            onLayout={(event) => setPodiumWidth(event.nativeEvent.layout.width)}
          >
            {podium.map((entry) => (
              <View key={entry.movie.id} className="items-center gap-1">
                <PosterThumb
                  coverUrl={entry.movie.coverUrl}
                  title={entry.movie.title}
                  width={posterWidth}
                  height={Math.round(posterWidth * 1.5)}
                  radius={5}
                />
                <Text className="text-[10px] font-bold text-muted-foreground">{entry.rank}</Text>
              </View>
            ))}
          </View>
        </Pressable>

        <Pressable
          onPress={onOpenAll}
          accessibilityRole="button"
          accessibilityLabel={`Open every ranked year, ${yearCount} in total`}
          className="w-[76px] items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-secondary/30 active:opacity-70"
        >
          <ChevronRight size={20} color="hsl(0 0% 63.9%)" />
          <Text className="text-[11.5px] font-semibold text-foreground/85">All years</Text>
          <Text className="text-[10.5px] text-muted-foreground">{yearCount}</Text>
        </Pressable>
      </View>
    </View>
  );
}
