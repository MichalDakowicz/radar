import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Check, ChevronLeft, Tv } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useMovies } from '@/hooks/useMovies';
import { MAX_W, useCenteredContentStyle } from '@/hooks/useResponsive';
import { useSeasonDetails } from '@/hooks/useTmdb';
import {
  episodeWatchCount,
  episodeWatchLog,
  logEpisodeWatch,
  mergeEpisodeMirror,
  normalizeEpisodeWatchDates,
  unlogEpisodeWatch,
} from '@/lib/episodes';
import { setToUnwatched } from '@/lib/movieStatus';
import { dateKey } from '@/lib/stats';
import { retotalWatches } from '@/lib/watchCounts';
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
        // Watched episodes stay pickable: choosing one logs another watch on this
        // day, which is how a rewatch reaches the streak and the recaps.
        const watches = episodeWatchCount(show, key);
        const selected = selectedKeys.includes(key);
        return (
          <Pressable
            key={ep.id}
            onPress={() => onToggle(key)}
            className={`flex-row items-center gap-3 rounded-lg border p-3 ${selected ? 'border-primary bg-primary/10' : 'border-border'}`}
          >
            <View className={`h-5 w-5 items-center justify-center rounded border-2 ${selected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
              {selected && <Check size={12} color="#fff" />}
            </View>
            <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
              {ep.episode_number}. {ep.name}
            </Text>
            {watches > 0 && <Text className="text-xs text-muted-foreground">watched {watches}×</Text>}
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
  const contentStyle = useCenteredContentStyle(MAX_W.text);
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { movies, updateMovie } = useMovies();

  const selectedDate = date ? new Date(`${date}T12:00:00`) : new Date();
  const dateStr = dateKey(selectedDate);

  const [selectedShow, setSelectedShow] = useState<Movie | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const tvShows = useMemo(() => movies.filter((m) => m.type === 'tv'), [movies]);

  // One row per episode, carrying that day's stamps - not one row per stamp. An
  // episode watched five times on one day was five rows reading exactly alike,
  // so removing one of them looked like nothing had happened.
  const episodesOnThisDay = useMemo(() => {
    const out: { show: Movie; key: string; stamps: string[]; season: string; episode: string }[] = [];
    for (const show of tvShows) {
      for (const [key, stamps] of Object.entries(normalizeEpisodeWatchDates(show.episodeWatchDates))) {
        const today = stamps.filter((stamp) => dateKey(stamp) === dateStr);
        if (today.length === 0) continue;
        const match = key.match(/s(\d+)e(\d+)/i);
        out.push({ show, key, stamps: today, season: match?.[1] ?? '?', episode: match?.[2] ?? '?' });
      }
    }
    return out;
  }, [tvShows, dateStr]);

  /** Every watch logged on this day, across shows - what the header counts. */
  const watchesOnThisDay = useMemo(
    () => episodesOnThisDay.reduce((total, item) => total + item.stamps.length, 0),
    [episodesOnThisDay],
  );

  const isoForDate = () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 12).toISOString();

  const toggleKey = (key: string) =>
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const addEpisodes = async () => {
    if (!selectedShow || selectedKeys.length === 0) return;
    setSaving(true);
    try {
      const iso = isoForDate();
      let episodeWatchDates = normalizeEpisodeWatchDates(selectedShow.episodeWatchDates);
      for (const key of selectedKeys) episodeWatchDates = logEpisodeWatch(episodeWatchDates, key, iso);
      const episodesWatched = mergeEpisodeMirror(selectedShow.episodesWatched, episodeWatchDates);
      // The count is dated passes plus undated ones, so backfilling a day has to
      // re-total the row: a pass this completes documents a watch already claimed
      // and absorbs an undated one, rather than adding a sixth (lib/watchCounts).
      const timesWatched = retotalWatches(selectedShow, { ...selectedShow, episodeWatchDates, episodesWatched });
      await updateMovie(selectedShow.id, { episodesWatched, episodeWatchDates, timesWatched }, { silent: true });
      setSelectedKeys([]);
      setSelectedShow(null);
    } finally {
      setSaving(false);
    }
  };

  /** Writes a log back, keeping the mirror truthful about what is left. */
  const writeLog = async (show: Movie, episodeWatchDates: ReturnType<typeof normalizeEpisodeWatchDates>, dropped: string[]) => {
    // Losing an episode's last stamp is the user unwatching it, so its tick goes
    // too - every other episode keeps whatever the mirror already held.
    const episodesWatched = mergeEpisodeMirror(show.episodesWatched, episodeWatchDates);
    for (const key of dropped) {
      if (!episodeWatchDates[key]) delete episodesWatched[key];
    }
    // Dropping a watch has to drop it from the count too. Leaving the count alone
    // turned the removed watch into an undated one - still billed to your hours,
    // gone from every calendar - which is not what removing means.
    const next = { ...show, episodeWatchDates, episodesWatched };
    const timesWatched = retotalWatches(show, next);
    // Nothing left to have watched: the flag goes with the last watch, and a show
    // with episodes still ticked is partway through rather than unstarted.
    const flags = timesWatched === 0 ? setToUnwatched(next) : {};
    await updateMovie(show.id, { episodeWatchDates, episodesWatched, timesWatched, ...flags }, { silent: true });
  };

  /** Drops one watch - the newest of the ones logged on this day. */
  const removeOneWatch = async (show: Movie, key: string, stamps: string[]) => {
    const newest = stamps[stamps.length - 1];
    await writeLog(show, unlogEpisodeWatch(normalizeEpisodeWatchDates(show.episodeWatchDates), key, newest), [key]);
  };

  /** Drops every watch of one episode logged on this day, mis-taps included. */
  const removeEpisodeDay = async (show: Movie, key: string, stamps: string[]) => {
    let log = normalizeEpisodeWatchDates(show.episodeWatchDates);
    for (const stamp of stamps) log = unlogEpisodeWatch(log, key, stamp);
    await writeLog(show, log, [key]);
  };

  /**
   * Clears the whole day. "Rewatch season" moves every episode at once, so a
   * mis-tap lands dozens of stamps; undoing that one row at a time is not a fix.
   */
  const clearDay = async () => {
    setClearing(true);
    try {
      const byShow = new Map<string, { show: Movie; items: typeof episodesOnThisDay }>();
      for (const item of episodesOnThisDay) {
        const bucket = byShow.get(item.show.id);
        if (bucket) bucket.items.push(item);
        else byShow.set(item.show.id, { show: item.show, items: [item] });
      }
      for (const { show, items } of byShow.values()) {
        let log = normalizeEpisodeWatchDates(show.episodeWatchDates);
        for (const item of items) {
          for (const stamp of item.stamps) log = unlogEpisodeWatch(log, item.key, stamp);
        }
        await writeLog(show, log, items.map((i) => i.key));
      }
      setConfirmClear(false);
    } finally {
      setClearing(false);
    }
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
                {watchesOnThisDay} {watchesOnThisDay === 1 ? 'episode' : 'episodes'} watched
                {watchesOnThisDay > episodesOnThisDay.length ? ` · ${episodesOnThisDay.length} distinct` : ''}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[{ padding: 16, paddingBottom: 48, gap: 24 }, contentStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Episodes already on this day */}
        {episodesOnThisDay.length > 0 && (
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Episodes Watched</Text>
              <Pressable onPress={() => setConfirmClear(true)} className="rounded-md bg-red-500/20 px-3 py-1.5">
                <Text className="text-xs font-medium text-red-400">Clear day</Text>
              </Pressable>
            </View>
            <View className="gap-2">
              {episodesOnThisDay.map((item) => {
                const total = episodeWatchLog(item.show, item.key).length;
                return (
                  <View key={`${item.show.id}-${item.key}`} className="gap-2 rounded-lg border border-border bg-secondary/40 p-3">
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                          {item.show.title}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          Season {item.season}, Episode {item.episode}
                          {total > item.stamps.length ? ` · ${total} watches in all` : ''}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Pressable onPress={() => removeOneWatch(item.show, item.key, item.stamps)} className="rounded-md bg-red-500/20 px-3 py-1.5">
                          <Text className="text-xs font-medium text-red-400">
                            {item.stamps.length > 1 ? 'Remove one' : 'Remove'}
                          </Text>
                        </Pressable>
                        {item.stamps.length > 1 && (
                          <Pressable onPress={() => removeEpisodeDay(item.show, item.key, item.stamps)} className="rounded-md bg-red-500/20 px-3 py-1.5">
                            <Text className="text-xs font-medium text-red-400">All {item.stamps.length}</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                    {/* The times, so a batch of taps reads as a batch rather than as
                        a stack of rows that all say the same thing. */}
                    <Text className="text-[11px] text-muted-foreground">
                      {item.stamps.length} today · {item.stamps.map((s) => new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })).join(', ')}
                    </Text>
                  </View>
                );
              })}
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

      <ConfirmDialog
        visible={confirmClear}
        title="Clear this day?"
        description={`Removes all ${watchesOnThisDay} episode ${watchesOnThisDay === 1 ? 'watch' : 'watches'} logged on ${prettyDate}. Watches on other days are kept.`}
        confirmLabel="Clear day"
        destructive
        loading={clearing}
        onConfirm={clearDay}
        onCancel={() => setConfirmClear(false)}
      />
    </View>
  );
}
