import { Text, TextInput, View } from 'react-native';

import type { CategoryRatings, EditForm, SeasonRating } from './editForm';
import { RatingSlider, RatingValue } from './RatingSlider';
import { SeasonRatings } from './SeasonRatings';

const CATEGORIES: { key: keyof CategoryRatings; label: string }[] = [
  { key: 'story', label: 'Story' },
  { key: 'acting', label: 'Acting' },
  { key: 'ending', label: 'Ending' },
  { key: 'enjoyment', label: 'Enjoyment' },
];

type EditRatingsTabProps = {
  form: EditForm;
  onChange: (patch: Partial<EditForm>) => void;
  onRecalcSeasonOverall: (season: number) => void;
  onChangeSeasonRating: (season: number, key: keyof SeasonRating, value: number) => void;
};

// Category breakdown (movie) / per-season ratings (tv) + notes (doc 03 Edit
// `EditRatingsTab`) - the overall rating slider lives in the always-visible
// main section (doc 12 part 1 unify), and the TMDB public score sits with the
// other catalogue facts, so what is left here is purely the user's own.
export function EditRatingsTab({
  form,
  onChange,
  onRecalcSeasonOverall,
  onChangeSeasonRating,
}: EditRatingsTabProps) {
  return (
    <View className="gap-6">
      <View className="gap-3">
        <Text className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Category breakdown</Text>
        {form.type === 'tv' ? (
          <SeasonRatings
            numberOfSeasons={form.numberOfSeasons}
            seasonRatings={form.seasonRatings}
            onChange={onChangeSeasonRating}
            onAutoCalc={onRecalcSeasonOverall}
          />
        ) : (
          <View className="gap-4">
            {CATEGORIES.map(({ key, label }) => (
              <View key={key} className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold uppercase text-muted-foreground">{label}</Text>
                  <RatingValue value={form.ratings[key]} />
                </View>
                <RatingSlider value={form.ratings[key]} onChange={(v) => onChange({ ratings: { ...form.ratings, [key]: v } })} />
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="gap-2">
        <Text className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Personal notes</Text>
        <TextInput
          value={form.notes}
          onChangeText={(notes) => onChange({ notes })}
          multiline
          placeholder="Write your review or thoughts here…"
          placeholderTextColor="hsl(0 0% 63.9%)"
          className="min-h-32 rounded-xl border border-border bg-secondary px-4 py-3 text-sm leading-relaxed text-foreground"
        />
      </View>
    </View>
  );
}
