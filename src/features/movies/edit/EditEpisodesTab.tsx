import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { LoadingState } from '@/components/ui/LoadingState';
import { useSeasonDetails } from '@/hooks/useTmdb';

import { EpisodeList } from './EpisodeList';

type EditEpisodesTabProps = {
  tmdbId: number | null;
  numberOfSeasons: number;
  episodesWatched: Record<string, boolean>;
  onToggleEpisode: (season: number, episodeNumber: number) => void;
  onMarkSeasonComplete: (season: number, episodeNumbers: number[]) => void;
};

// TV-only episode tracker (doc 03 Edit `EditEpisodesTab`) - season switcher +
// EpisodeList, backed by the TMDB season endpoint (already wrapped by useSeasonDetails).
export function EditEpisodesTab({
  tmdbId,
  numberOfSeasons,
  episodesWatched,
  onToggleEpisode,
  onMarkSeasonComplete,
}: EditEpisodesTabProps) {
  const [season, setSeason] = useState(1);
  const { data: seasonData, isLoading } = useSeasonDetails(tmdbId, season);
  const seasons = Array.from({ length: numberOfSeasons || 1 }, (_, i) => i + 1);

  return (
    <View className="gap-4">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {seasons.map((num) => (
          <Pressable
            key={num}
            onPress={() => setSeason(num)}
            className="rounded-xl px-4 py-2"
            style={{ backgroundColor: season === num ? 'hsl(217 91% 60%)' : 'hsl(0 0% 14%)' }}
          >
            <Text className={season === num ? 'font-bold text-white' : 'font-bold text-muted-foreground'}>Season {num}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <LoadingState label="Loading episodes…" />
      ) : seasonData?.episodes?.length ? (
        <EpisodeList
          season={season}
          episodes={seasonData.episodes}
          episodesWatched={episodesWatched}
          onToggle={(episodeNumber) => onToggleEpisode(season, episodeNumber)}
          onMarkSeasonComplete={() => onMarkSeasonComplete(season, seasonData.episodes.map((e: { episode_number: number }) => e.episode_number))}
        />
      ) : (
        <View className="items-center rounded-xl border border-dashed border-border py-12">
          <Text className="text-muted-foreground">No episode data. Try Smart-fill or check the TMDB ID.</Text>
        </View>
      )}
    </View>
  );
}
