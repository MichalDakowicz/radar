import { Check, CheckCircle, Minus, Plus, RotateCcw } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

export type TmdbEpisode = {
  id: number;
  episode_number: number;
  name: string;
  air_date: string | null;
  overview: string;
};

type EpisodeListProps = {
  season: number;
  episodes: TmdbEpisode[];
  /** Watches per episode number — 0 for never watched (lib/episodes). */
  counts: Record<number, number>;
  onToggle: (episodeNumber: number) => void;
  onBump: (episodeNumber: number, delta: number) => void;
  onMarkSeasonComplete: () => void;
  onRewatchSeason: () => void;
};

const MUTED = 'hsl(0 0% 63.9%)';

// Per-season episode checklist + progress bar + season actions (doc 03
// `EpisodeList`). A watched row carries a `- N +` stepper, so a rewatched
// episode is logged again rather than being stuck at "watched".
export function EpisodeList({
  season,
  episodes,
  counts,
  onToggle,
  onBump,
  onMarkSeasonComplete,
  onRewatchSeason,
}: EpisodeListProps) {
  const watchedCount = episodes.filter((e) => (counts[e.episode_number] ?? 0) > 0).length;
  const progress = episodes.length > 0 ? Math.round((watchedCount / episodes.length) * 100) : 0;
  const seasonComplete = episodes.length > 0 && watchedCount === episodes.length;

  return (
    <View className="gap-3">
      <View className="gap-3 rounded-xl border border-border bg-secondary/40 p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-semibold uppercase text-muted-foreground">Season {season} progress</Text>
            <Text className="text-2xl font-bold text-foreground">{progress}%</Text>
          </View>
          <View className="flex-row items-center gap-2">
            {!seasonComplete && (
              <Pressable
                onPress={onMarkSeasonComplete}
                className="flex-row items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5"
              >
                <CheckCircle size={14} color="hsl(217 91% 60%)" />
                <Text className="text-xs font-medium text-primary">Mark complete</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onRewatchSeason}
              className="flex-row items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5"
            >
              <RotateCcw size={14} color={MUTED} />
              <Text className="text-xs font-medium text-muted-foreground">Rewatch season</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-secondary">
        <View className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </View>

      <View className="gap-2">
        {episodes.map((episode) => {
          const count = counts[episode.episode_number] ?? 0;
          const isWatched = count > 0;
          return (
            <Pressable
              key={episode.id}
              onPress={() => onToggle(episode.episode_number)}
              className="flex-row gap-3 rounded-xl border p-3"
              style={{
                borderColor: isWatched ? 'rgba(34,197,94,0.3)' : 'hsl(var(--border))',
                backgroundColor: isWatched ? 'rgba(34,197,94,0.08)' : 'transparent',
              }}
            >
              <View
                className="mt-0.5 h-6 w-6 items-center justify-center rounded-full border-2"
                style={{ borderColor: isWatched ? '#22c55e' : 'hsl(0 0% 40%)', backgroundColor: isWatched ? '#22c55e' : 'transparent' }}
              >
                {isWatched && <Check size={14} color="#fff" strokeWidth={3} />}
              </View>
              <View className="flex-1 gap-1">
                <View className="flex-row items-start justify-between gap-2">
                  <Text numberOfLines={1} className={isWatched ? 'flex-1 font-medium text-green-500' : 'flex-1 font-medium text-foreground'}>
                    {episode.episode_number}. {episode.name}
                  </Text>
                  {isWatched ? (
                    <View className="flex-row items-center gap-2 rounded-lg bg-black/30 p-1">
                      <Pressable onPress={() => onBump(episode.episode_number, -1)} hitSlop={6} className="p-1">
                        <Minus size={14} color={MUTED} />
                      </Pressable>
                      <Text className="w-5 text-center font-mono text-sm text-foreground">{count}</Text>
                      <Pressable onPress={() => onBump(episode.episode_number, 1)} hitSlop={6} className="p-1">
                        <Plus size={14} color={MUTED} />
                      </Pressable>
                    </View>
                  ) : (
                    !!episode.air_date && <Text className="text-xs text-muted-foreground">{episode.air_date}</Text>
                  )}
                </View>
                {isWatched && !!episode.air_date && <Text className="text-xs text-muted-foreground">{episode.air_date}</Text>}
                {!!episode.overview && (
                  <Text numberOfLines={2} className="text-xs text-muted-foreground">
                    {episode.overview}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
