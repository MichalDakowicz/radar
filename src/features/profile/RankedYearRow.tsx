import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { PosterThumb } from '@/features/social/PosterThumb';
import type { RankedYear } from '@/lib/rankedYears';

type RankedYearRowProps = {
  year: RankedYear;
  onPress: () => void;
};

/** One year in the "all years" list: the podium as a peek, the rest behind the tap. */
export function RankedYearRow({ year, onPress }: RankedYearRowProps) {
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

      <View className="flex-row gap-1.5">
        {year.entries.slice(0, 6).map((entry) => (
          <PosterThumb
            key={entry.movie.id}
            coverUrl={entry.movie.coverUrl}
            title={entry.movie.title}
            width={40}
            height={60}
            radius={5}
          />
        ))}
      </View>
    </Pressable>
  );
}
