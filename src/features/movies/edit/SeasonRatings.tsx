import { Calculator } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { SeasonRating } from './editForm';
import { RatingSlider, RatingSliderPrecise, RatingValue } from './RatingSlider';

const CATEGORIES: { key: 'story' | 'acting' | 'ending' | 'enjoyment'; label: string }[] = [
  { key: 'story', label: 'Story' },
  { key: 'acting', label: 'Acting' },
  { key: 'ending', label: 'Ending' },
  { key: 'enjoyment', label: 'Enjoyment' },
];

type SeasonRatingsProps = {
  numberOfSeasons: number;
  seasonRatings: Record<number, SeasonRating>;
  onChange: (season: number, key: 'overall' | 'story' | 'acting' | 'ending' | 'enjoyment', value: number) => void;
  onAutoCalc: (season: number) => void;
};

const EMPTY: SeasonRating = { overall: 0, story: 0, acting: 0, ending: 0, enjoyment: 0 };

// Per-season overall + category breakdown (doc 03 `SeasonRatings`) - one card
// per season, each with its own Auto-Calc (doc 02 category-breakdown note).
export function SeasonRatings({ numberOfSeasons, seasonRatings, onChange, onAutoCalc }: SeasonRatingsProps) {
  const seasons = Array.from({ length: numberOfSeasons || 1 }, (_, i) => i + 1);

  return (
    <View className="gap-4">
      {seasons.map((season) => {
        const rating = seasonRatings[season] ?? EMPTY;
        return (
          <View key={season} className="gap-4 rounded-2xl border border-border bg-secondary/40 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold uppercase tracking-wide text-foreground">Season {season}</Text>
              <Pressable
                onPress={() => onAutoCalc(season)}
                className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1"
              >
                <Calculator size={13} color="hsl(0 0% 63.9%)" />
                <Text className="text-xs font-medium text-muted-foreground">Auto-Calc</Text>
              </Pressable>
            </View>

            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-semibold uppercase text-muted-foreground">Overall</Text>
                <RatingValue value={rating.overall} />
              </View>
              <RatingSliderPrecise value={rating.overall} onChange={(v) => onChange(season, 'overall', v)} />
            </View>

            <View className="gap-4">
              {CATEGORIES.map(({ key, label }) => (
                <View key={key} className="gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold uppercase text-muted-foreground">{label}</Text>
                    <RatingValue value={rating[key]} />
                  </View>
                  <RatingSlider value={rating[key]} onChange={(v) => onChange(season, key, v)} />
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
