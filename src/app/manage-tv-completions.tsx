import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Check, ChevronLeft, Tv } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMovies } from '@/hooks/useMovies';
import { useSeasonDetails } from '@/hooks/useTmdb';
import { dateKey } from '@/lib/stats';
import { goBackOrHome } from '@/lib/utils';
import type { Movie } from '@/types/movie';

type Episode = { id: number; episode_number: number; name: string };

// Season/episode picker: lists a show's episodes for the chosen season and
// toggles selection. Isolated so useSeasonDetails runs unconditionally.
function SeasonEpisodePicker({
  show,
  season,
  selectedKeys,
  onToggle,
}: {
  show: Movie;
  season: number;
  selectedKeys: string[];
  onToggle: (key: string) => void;
}) {
  const { data, isLoading } = useSeasonDetails(show.tmdbId, season);
  const episodes: Episode[] = data?.episodes ?? [];

  if (isLoading) {
    return (
      <View className="py-8">
        <ActivityIndicator color="hsl(0 0% 63.9%)" />
      </View>
    );
  }
  if (episodes.length === 0) {
    return <Text className="py-6 text-center text-muted-foreground">No episodes found</Text>;
  }

  return (
    <View className="gap-2">
      {episodes.map((ep) => {
        const key = `s${season}e${ep.episode_number}`;
        const alreadyWatched = !!show.episodesWatched?.[key];
        const selected = selectedKeys.includes(key);
        return (
          <Pressable
            key={ep.id}
            disabled={alreadyWatched}
            onPress={() => onToggle(key)}
            className={`flex-row items-center gap-3 rounded-lg border p-3 ${
              alreadyWatched ? 'border-border opacity-50' : selected ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            <View className={`h-5 w-5 items-center justify-center rounded border-2 ${selected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
              {selected && <Check size={12} color="#fff" />}
            </View>
            <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
              {ep.episode_number}. {ep.name}
              {alreadyWatched ? '  · watched' : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Backfill per-episode watch dates for a given day (legacy ManageTVCompletions).
// Reached by tapping a day in the TV StreakCalendar.
export default function ManageTVCompletions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { movies, updateMovie } = useMovies();

  const selectedDate = date ? new Date(`${date}T12:00:00`) : new Date();
  const dateStr = dateKey(selectedDate);

  const [selectedShow, setSelectedShow] = useState<Movie | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const tvShows = useMemo(() => movies.filter((m) => m.type === 'tv'), [movies]);

  const episodesOnThisDay = useMemo(() => {
    const out: { show: Movie; key: string; season: string; episode: string }[] = [];
    for (const show of tvShows) {
      for (const [key, ts] of Object.entries(show.episodeWatchDates || {})) {
        if (dateKey(ts) !== dateStr) continue;
        const match = key.match(/s(\d+)e(\d+)/i);
        out.push({ show, key, season: match?.[1] ?? '?', episode: match?.[2] ?? '?' });
      }
    }
    return out;
  }, [tvShows, dateStr]);

  const isoForDate = () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 12).toISOString();

  const toggleKey = (key: string) =>
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const addEpisodes = async () => {
    if (!selectedShow || selectedKeys.length === 0) return;
    setSaving(true);
    try {
      const iso = isoForDate();
      const episodesWatched = { ...(selectedShow.episodesWatched || {}) };
      const episodeWatchDates = { ...(selectedShow.episodeWatchDates || {}) };
      for (const key of selectedKeys) {
        episodesWatched[key] = true;
        episodeWatchDates[key] = iso;
      }
      await updateMovie(selectedShow.id, { episodesWatched, episodeWatchDates }, { silent: true });
      setSelectedKeys([]);
      setSelectedShow(null);
    } finally {
      setSaving(false);
    }
  };

  const removeEpisode = async (show: Movie, key: string) => {
    const episodeWatchDates = { ...(show.episodeWatchDates || {}) };
    delete episodeWatchDates[key];
    await updateMovie(show.id, { episodeWatchDates }, { silent: true });
  };

  const prettyDate = selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const seasonCount = selectedShow?.numberOfSeasons ?? 1;

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border px-4 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => goBackOrHome(router)} className="rounded-full bg-secondary p-2">
            <ArrowLeft size={20} color="hsl(0 0% 98%)" />
          </Pressable>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Calendar size={20} color="hsl(271 91% 65%)" />
              <Text className="text-xl font-bold text-foreground">{prettyDate}</Text>
            </View>
            <View className="mt-0.5 flex-row items-center gap-1.5">
              <Tv size={13} color="hsl(0 0% 63.9%)" />
              <Text className="text-sm text-muted-foreground">
                {episodesOnThisDay.length} {episodesOnThisDay.length === 1 ? 'episode' : 'episodes'} watched
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 24 }} keyboardShouldPersistTaps="handled">
        {/* Episodes already on this day */}
        {episodesOnThisDay.length > 0 && (
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Episodes Watched</Text>
            <View className="gap-2">
              {episodesOnThisDay.map((item) => (
                <View key={`${item.show.id}-${item.key}`} className="flex-row items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                      {item.show.title}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Season {item.season}, Episode {item.episode}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeEpisode(item.show, item.key)} className="rounded-md bg-red-500/20 px-3 py-1.5">
                    <Text className="text-xs font-medium text-red-400">Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Add episodes */}
        <View className="gap-3">
          <Text className="text-lg font-bold text-foreground">Add Episodes</Text>

          {!selectedShow ? (
            tvShows.length === 0 ? (
              <Text className="py-6 text-center text-muted-foreground">No TV shows in your library</Text>
            ) : (
              <View className="gap-2">
                {tvShows.map((show) => (
                  <Pressable
                    key={show.id}
                    onPress={() => {
                      setSelectedShow(show);
                      setSelectedSeason(1);
                      setSelectedKeys([]);
                    }}
                    className="flex-row items-center justify-between rounded-lg border border-border p-3"
                  >
                    <Text className="flex-1 text-sm font-medium text-foreground" numberOfLines={1}>
                      {show.title}
                    </Text>
                    <Text className="text-xs text-muted-foreground">{show.numberOfSeasons ?? 1} seasons</Text>
                  </Pressable>
                ))}
              </View>
            )
          ) : (
            <View className="gap-3">
              <Pressable onPress={() => setSelectedShow(null)} className="flex-row items-center gap-1 self-start">
                <ChevronLeft size={16} color="hsl(0 0% 63.9%)" />
                <Text className="text-sm text-muted-foreground">All shows</Text>
              </Pressable>
              <Text className="text-base font-semibold text-foreground">{selectedShow.title}</Text>

              {/* Season selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {Array.from({ length: seasonCount }, (_, i) => i + 1).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSelectedSeason(s)}
                    className={`rounded-lg px-3 py-1.5 ${s === selectedSeason ? 'bg-purple-600' : 'bg-secondary'}`}
                  >
                    <Text className={`text-xs font-medium ${s === selectedSeason ? 'text-white' : 'text-muted-foreground'}`}>
                      Season {s}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <SeasonEpisodePicker show={selectedShow} season={selectedSeason} selectedKeys={selectedKeys} onToggle={toggleKey} />

              {selectedKeys.length > 0 && (
                <Pressable onPress={addEpisodes} disabled={saving} className="items-center rounded-lg bg-purple-600 py-3">
                  <Text className="font-semibold text-white">
                    {saving ? 'Adding…' : `Add ${selectedKeys.length} episode${selectedKeys.length === 1 ? '' : 's'}`}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
