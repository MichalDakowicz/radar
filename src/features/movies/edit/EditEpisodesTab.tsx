import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { LoadingState } from '@/components/ui/LoadingState';
import { useSeasonDetails } from '@/hooks/useSeasonDetails';
import { episodeWatchCount, type EpisodeWatchLog } from '@/lib/episodes';
import { currentEpisodeSeason } from '@/lib/seasonPreload';

import { EpisodeList } from './EpisodeList';

type EditEpisodesTabProps = {
  tmdbId: number | null;
  numberOfSeasons: number;
  episodeWatchDates: EpisodeWatchLog;
  episodesWatched: Record<string, boolean>;
  onToggleEpisode: (season: number, episodeNumber: number) => void;
  onBumpEpisode: (season: number, episodeNumber: number, delta: number) => void;
  onMarkSeasonComplete: (season: number, episodeNumbers: number[]) => void;
  onRewatchSeason: (season: number, episodeNumbers: number[]) => void;
};

// TV-only episode tracker (doc 03 Edit `EditEpisodesTab`) - season switcher +
// EpisodeList, backed by the TMDB season endpoint (already wrapped by useSeasonDetails).
export function EditEpisodesTab({
  tmdbId,
  numberOfSeasons,
  episodeWatchDates,
  episodesWatched,
  onToggleEpisode,
  onBumpEpisode,
  onMarkSeasonComplete,
  onRewatchSeason,
}: EditEpisodesTabProps) {
  // Opens where the user left off rather than at season 1 - and that is the
  // season SeasonPreload warmed, so the list is usually already on the device.
  const [season, setSeason] = useState(() =>
    currentEpisodeSeason({ episodeWatchDates, episodesWatched }, numberOfSeasons),
  );
  const { data: seasonData, isLoading } = useSeasonDetails(tmdbId, season);
  const seasons = Array.from({ length: numberOfSeasons || 1 }, (_, i) => i + 1);
  const episodes = seasonData?.episodes;

  // Watch counts for the season on screen, so EpisodeList never touches the log
  // shape itself.
  const counts = useMemo(() => {
    const out: Record<number, number> = {};
    for (const episode of episodes ?? []) {
      out[episode.episode_number] = episodeWatchCount(
        { episodeWatchDates, episodesWatched },
        `s${season}e${episode.episode_number}`,
      );
    }
    return out;
  }, [episodes, episodeWatchDates, episodesWatched, season]);

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
          counts={counts}
          onToggle={(episodeNumber) => onToggleEpisode(season, episodeNumber)}
          onBump={(episodeNumber, delta) => onBumpEpisode(season, episodeNumber, delta)}
          onMarkSeasonComplete={() => onMarkSeasonComplete(season, seasonData.episodes.map((e) => e.episode_number))}
          onRewatchSeason={() => onRewatchSeason(season, seasonData.episodes.map((e) => e.episode_number))}
        />
      ) : (
        <View className="items-center rounded-xl border border-dashed border-border py-12">
          <Text className="text-muted-foreground">No episode data. Try Smart-fill or check the TMDB ID.</Text>
        </View>
      )}
    </View>
  );
}
