import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PosterThumb } from '@/features/social/PosterThumb';
import type { RankedYear } from '@/lib/rankedYears';

type RankedYearRowProps = {
  year: RankedYear;
  onPress: () => void;
};

const PEEK_GAP = 6;
const MIN_PEEK = 40;

/** One year in the "all years" list: the podium as a peek, the rest behind the tap. */
export function RankedYearRow({ year, onPress }: RankedYearRowProps) {
  // Measured for the same reason the Profile card is: the row is as wide as the
  // screen, so the peek has to grow with it rather than sit in a fixed clump.
  const [rowWidth, setRowWidth] = useState(0);
  const columns = rowWidth > 0 ? Math.max(4, Math.floor((rowWidth + PEEK_GAP) / (MIN_PEEK + PEEK_GAP))) : 6;
  const posterWidth = rowWidth > 0 ? Math.floor((rowWidth - PEEK_GAP * (columns - 1)) / columns) : MIN_PEEK;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open your ${year.year} ranking, ${year.entries.length} titles`}
      className="gap-2.5 rounded-2xl border border-border bg-card p-3 active:opacity-70"
    >
      <View className="flex-row items-center gap-2">
        <Text className="text-[15px] font-bold text-foreground">{year.year} ranked</Text>
        <Text className="ml-auto text-[11.5px] text-muted-foreground">{year.entries.length} titles</Text>
        <ChevronRight size={15} color="hsl(0 0% 63.9%)" />
      </View>

      <View
        className="w-full flex-row justify-start"
        style={{ gap: PEEK_GAP }}
        onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
      >
        {year.entries.slice(0, columns).map((entry) => (
          <PosterThumb
            key={entry.movie.id}
            coverUrl={entry.movie.coverUrl}
            title={entry.movie.title}
            width={posterWidth}
            height={Math.round(posterWidth * 1.5)}
            radius={5}
          />
        ))}
      </View>
    </Pressable>
  );
}
