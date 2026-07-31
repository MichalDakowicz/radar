import { Calculator, RefreshCw } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { StatusPicker } from '@/components/media/StatusPicker';
import type { EditForm } from '@/features/movies/edit/editForm';
import { RatingSliderPrecise, RatingValue } from '@/features/movies/edit/RatingSlider';

const MUTED = 'hsl(0 0% 63.9%)';

type OwnedControlsProps = {
  form: EditForm;
  onChange: (patch: Partial<EditForm>) => void;
  onAutoCalc: () => void;
};

// The part of the detail screen that belongs to the user rather than to TMDB:
// where they are in the title and what they thought of it. Everything else on
// the screen is read-only catalogue data.
export function OwnedControls({ form, onChange, onAutoCalc }: OwnedControlsProps) {
  return (
    <>
      <View className="gap-3">
        <Text className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Watch status</Text>
        <StatusPicker value={form.status} onChange={(status) => onChange({ status })} />
        {form.status.inProgress && (
          <View className="gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <Text className="text-xs font-semibold uppercase text-amber-500">Last watched position</Text>
            <TextInput
              value={form.lastWatchedPosition}
              onChangeText={(lastWatchedPosition) => onChange({ lastWatchedPosition })}
              placeholder={form.type === 'tv' ? 'e.g. S02E05 at 23:15' : 'e.g. 45:30'}
              placeholderTextColor={MUTED}
              className="rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-sm text-foreground"
            />
          </View>
        )}
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Your rating</Text>
          <View className="flex-row items-center gap-2">
            <RatingValue value={form.overallRating} />
            <Pressable onPress={onAutoCalc} className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1">
              <Calculator size={13} color={MUTED} />
              <Text className="text-xs font-medium text-muted-foreground">
                {form.type === 'tv' ? 'Avg seasons' : 'Auto-calc'}
              </Text>
            </Pressable>
          </View>
        </View>
        <RatingSliderPrecise value={form.overallRating} onChange={(overallRating) => onChange({ overallRating })} />
      </View>
    </>
  );
}

// Re-pulls the catalogue fields from TMDB. The only write path left for them
// now that they are all read-only on the screen itself.
export function SmartFillButton({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className="flex-row items-center justify-center gap-2 rounded-lg border border-border py-2"
    >
      {busy ? <ActivityIndicator size="small" color={MUTED} /> : <RefreshCw size={14} color={MUTED} />}
      <Text className="text-sm text-muted-foreground">Refresh details from TMDB</Text>
    </Pressable>
  );
}
