import { Check, Library, Minus, Plus, PlayCircle } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { setToInProgress, setToWatched, setToWatchlist, type StatusFlags } from '@/lib/movieStatus';
import { totalWatches } from '@/lib/watchCounts';

export type StatusPickerValue = StatusFlags & { timesWatched: number; undatedWatches: number };

type StatusPickerProps = {
  value: StatusPickerValue;
  onChange: (next: StatusPickerValue) => void;
  /**
   * Complete watches that carry dates. For a series this comes from the episode
   * tracker, so the total is shown read-only and only the undated part is typed;
   * for a film it is 0 or 1 and the stepper stays.
   */
  datedPasses?: number;
  /** True for a series, where dated watches are the episode tracker's business. */
  derived?: boolean;
};

const MUTED = 'hsl(0 0% 63.9%)';

// Legacy-style standalone status buttons (watchlist_app EditMovieWatchStatus)
// instead of a single segmented pill - watchlist/in-progress toggle
// independently, watched is its own box with a Yes/No + rewatch counter.
export function StatusPicker({ value, onChange, datedPasses = 0, derived = false }: StatusPickerProps) {
  const undated = value.undatedWatches ?? 0;
  const total = value.timesWatched || 0;

  const toggleWatchlist = () => {
    if (value.inWatchlist) onChange({ ...value, inWatchlist: false });
    else onChange({ ...setToWatchlist(value), timesWatched: value.timesWatched, undatedWatches: undated });
  };

  const toggleProgress = () => {
    if (value.inProgress) onChange({ ...value, inProgress: false });
    else onChange({ ...setToInProgress(value), timesWatched: value.timesWatched, undatedWatches: undated });
  };

  const toggleWatched = () => {
    if (value.watched) onChange({ ...value, watched: false, timesWatched: 0, undatedWatches: 0 });
    else onChange({ ...setToWatched(value, value.timesWatched || 1), undatedWatches: undated });
  };

  /**
   * A watch with no date on it: counts towards hours and the number on the card,
   * invisible to every calendar and streak because there is no day to put it on.
   * This is how "I saw it years ago and never logged it" gets recorded.
   */
  const bumpUndated = (delta: number) => {
    const next = Math.max(0, undated + delta);
    onChange({
      ...value,
      watched: value.watched || next > 0,
      undatedWatches: next,
      timesWatched: totalWatches(datedPasses, next),
    });
  };

  // Films only: the total is typed, and the dated pass is whatever completedAt
  // holds. Lowering it takes an undated watch off first, so a real date is never
  // the thing that gets thrown away.
  const bumpTotal = (delta: number) => {
    const next = Math.max(1, total + delta);
    onChange({ ...value, timesWatched: next, undatedWatches: Math.max(0, Math.min(undated + delta, next)) });
  };

  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <Pressable
          onPress={toggleWatchlist}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg border py-4 ${
            value.inWatchlist ? 'border-blue-500/50 bg-blue-500/20' : 'border-border bg-secondary/50'
          }`}
        >
          <Library size={18} color={value.inWatchlist ? '#60a5fa' : MUTED} />
          <Text className={value.inWatchlist ? 'font-medium text-blue-400' : 'font-medium text-muted-foreground'}>Watchlist</Text>
        </Pressable>
        <Pressable
          onPress={toggleProgress}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg border py-4 ${
            value.inProgress ? 'border-yellow-500/50 bg-yellow-500/20' : 'border-border bg-secondary/50'
          }`}
        >
          <PlayCircle size={18} color={value.inProgress ? '#facc15' : MUTED} />
          <Text className={value.inProgress ? 'font-medium text-yellow-400' : 'font-medium text-muted-foreground'}>In Progress</Text>
        </Pressable>
      </View>

      <View className={`rounded-xl border p-3 ${value.watched ? 'border-green-500/30 bg-green-500/10' : 'border-border bg-secondary/50'}`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Check size={18} color={value.watched ? '#4ade80' : 'hsl(0 0% 98%)'} />
            <Text className={value.watched ? 'font-medium text-green-400' : 'font-medium text-foreground'}>Watched</Text>
          </View>
          <View className="flex-row items-center gap-3">
            {value.watched &&
              (derived ? (
                <View className="rounded-lg bg-black/30 px-3 py-1.5">
                  <Text className="font-mono text-sm text-foreground">
                    {total}× <Text className="font-sans text-xs text-muted-foreground">watched</Text>
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-2 rounded-lg bg-black/30 p-1">
                  <Pressable onPress={() => bumpTotal(-1)} className="p-1">
                    <Minus size={14} color={MUTED} />
                  </Pressable>
                  <Text className="w-6 text-center font-mono text-sm text-foreground">{total || 1}</Text>
                  <Pressable onPress={() => bumpTotal(1)} className="p-1">
                    <Plus size={14} color={MUTED} />
                  </Pressable>
                </View>
              ))}
            <Pressable
              onPress={toggleWatched}
              className={`rounded-md border px-2 py-1 ${value.watched ? 'border-green-500/50' : 'border-border'}`}
            >
              <Text className={value.watched ? 'text-xs font-semibold text-green-400' : 'text-xs text-muted-foreground'}>
                {value.watched ? 'Yes' : 'No'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Where those watches came from, and the one action that adds a watch
            without touching a streak. Offered even on an unwatched title: "I
            watched this before I ever tracked it" is exactly the missing case. */}
        <View className="mt-3 gap-2 border-t border-border/60 pt-3">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xs font-medium text-foreground">Watched before, no date</Text>
              <Text className="text-[11px] leading-4 text-muted-foreground">
                Counts towards your hours, never towards a streak
              </Text>
            </View>
            <View className="flex-row items-center gap-2 rounded-lg bg-black/30 p-1">
              <Pressable onPress={() => bumpUndated(-1)} hitSlop={6} className="p-1">
                <Minus size={14} color={MUTED} />
              </Pressable>
              <Text className="w-5 text-center font-mono text-sm text-foreground">{undated}</Text>
              <Pressable onPress={() => bumpUndated(1)} hitSlop={6} className="p-1">
                <Plus size={14} color={MUTED} />
              </Pressable>
            </View>
          </View>
          {value.watched && (
            <Text className="text-[11px] text-muted-foreground">
              {datedPasses > 0
                ? `${datedPasses} dated${derived ? ' from the episode tracker' : ''}`
                : 'none dated'}
              {undated > 0 ? ` · ${undated} undated` : ''}
              {derived ? ' · rewatch a season to add a dated one' : ''}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
