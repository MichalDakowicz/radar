import { Check, CheckCircle } from 'lucide-react-native';
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
  episodesWatched: Record<string, boolean>;
  onToggle: (episodeNumber: number) => void;
  onMarkSeasonComplete: () => void;
};

// Per-season episode checklist + progress bar + "mark season complete"
// (doc 03 `EpisodeList`, doc 03 Edit "episode tracker").
export function EpisodeList({ season, episodes, episodesWatched, onToggle, onMarkSeasonComplete }: EpisodeListProps) {
  const watchedCount = episodes.filter((e) => episodesWatched[`s${season}e${e.episode_number}`]).length;
  const progress = episodes.length > 0 ? Math.round((watchedCount / episodes.length) * 100) : 0;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">
        <View>
          <Text className="text-xs font-semibold uppercase text-muted-foreground">Season {season} progress</Text>
          <Text className="text-2xl font-bold text-foreground">{progress}%</Text>
        </View>
        <Pressable
          onPress={onMarkSeasonComplete}
          className="flex-row items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5"
        >
          <CheckCircle size={14} color="hsl(217 91% 60%)" />
          <Text className="text-xs font-medium text-primary">Mark complete</Text>
        </Pressable>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-secondary">
        <View className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </View>

      <View className="gap-2">
        {episodes.map((episode) => {
          const isWatched = !!episodesWatched[`s${season}e${episode.episode_number}`];
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
                  {!!episode.air_date && <Text className="text-xs text-muted-foreground">{episode.air_date}</Text>}
                </View>
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
