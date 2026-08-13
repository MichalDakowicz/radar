import { Check, Library, Minus, Plus, PlayCircle } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { setToInProgress, setToWatched, setToWatchlist, type StatusFlags } from '@/lib/movieStatus';

export type StatusPickerValue = StatusFlags & { timesWatched: number };

type StatusPickerProps = {
  value: StatusPickerValue;
  onChange: (next: StatusPickerValue) => void;
  /**
   * A series' watch count is the minimum across its episodes (lib/episodes), so
   * it is shown read-only with the episode tracker named as its source - typing
   * a 3 into a show whose episodes say once would only be overwritten on save.
   */
  derivedCount?: number | null;
};

// Legacy-style standalone status buttons (watchlist_app EditMovieWatchStatus)
// instead of a single segmented pill - watchlist/in-progress toggle
// independently, watched is its own box with a Yes/No + rewatch counter.
export function StatusPicker({ value, onChange, derivedCount = null }: StatusPickerProps) {
  const derived = derivedCount != null;
  const toggleWatchlist = () => {
    if (value.inWatchlist) onChange({ ...value, inWatchlist: false });
    else onChange({ ...setToWatchlist(value), timesWatched: value.timesWatched });
  };

  const toggleProgress = () => {
    if (value.inProgress) onChange({ ...value, inProgress: false });
    else onChange({ ...setToInProgress(value), timesWatched: value.timesWatched });
  };

  const toggleWatched = () => {
    if (value.watched) onChange({ ...value, watched: false, timesWatched: 0 });
    else onChange(setToWatched(value, value.timesWatched || 1));
  };

  const bumpTimesWatched = (delta: number) => {
    onChange({ ...value, timesWatched: Math.max(1, (value.timesWatched || 1) + delta) });
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
          <Library size={18} color={value.inWatchlist ? '#60a5fa' : 'hsl(0 0% 63.9%)'} />
          <Text className={value.inWatchlist ? 'font-medium text-blue-400' : 'font-medium text-muted-foreground'}>Watchlist</Text>
        </Pressable>
        <Pressable
          onPress={toggleProgress}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg border py-4 ${
            value.inProgress ? 'border-yellow-500/50 bg-yellow-500/20' : 'border-border bg-secondary/50'
          }`}
        >
          <PlayCircle size={18} color={value.inProgress ? '#facc15' : 'hsl(0 0% 63.9%)'} />
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
                    {derivedCount}× <Text className="font-sans text-xs text-muted-foreground">watched</Text>
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-2 rounded-lg bg-black/30 p-1">
                  <Pressable onPress={() => bumpTimesWatched(-1)} className="p-1">
                    <Minus size={14} color="hsl(0 0% 63.9%)" />
                  </Pressable>
                  <Text className="w-6 text-center font-mono text-sm text-foreground">{value.timesWatched || 1}</Text>
                  <Pressable onPress={() => bumpTimesWatched(1)} className="p-1">
                    <Plus size={14} color="hsl(0 0% 63.9%)" />
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
        {derived && value.watched && (
          <Text className="mt-2 text-xs text-muted-foreground">Counted from the episode tracker — rewatch a season to raise it</Text>
        )}
      </View>
    </View>
  );
}
