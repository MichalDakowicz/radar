import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Check, Film, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { useMovies } from '@/hooks/useMovies';
import { MAX_W, useCenteredContentStyle } from '@/hooks/useResponsive';
import { isWatched } from '@/lib/movieStatus';
import { dateKey } from '@/lib/stats';
import { goBackOrHome } from '@/lib/utils';
import type { Movie } from '@/types/movie';

// Backfill which movies were completed on a given day (legacy ManageCompletions
// + ManualCompletionModal). The rewrite Movie has a single completedAt (no
// legacy completionDates[] array), so "add to date" sets completedAt to that
// day's local noon and "remove" clears it. Reached by tapping a StreakCalendar day.
export default function ManageCompletions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const contentStyle = useCenteredContentStyle(MAX_W.text);
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { movies, updateMovie } = useMovies();

  const selectedDate = date ? new Date(`${date}T12:00:00`) : new Date();
  const dateStr = dateKey(selectedDate);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [movieToRemove, setMovieToRemove] = useState<Movie | null>(null);
  const [removing, setRemoving] = useState(false);

  const moviesOnThisDay = useMemo(
    () => movies.filter((m) => m.completedAt && dateKey(m.completedAt) === dateStr),
    [movies, dateStr],
  );

  const results = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return movies.filter((m) => isWatched(m) && m.title.toLowerCase().includes(q)).slice(0, 50);
  }, [movies, searchQuery]);

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const isoForDate = () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 12).toISOString();

  const addSelected = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      const iso = isoForDate();
      for (const id of selectedIds) {
        await updateMovie(id, { completedAt: iso }, { silent: true });
      }
      setSelectedIds([]);
      setSearchQuery('');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!movieToRemove) return;
    setRemoving(true);
    try {
      await updateMovie(movieToRemove.id, { completedAt: null }, { silent: true });
      setMovieToRemove(null);
    } finally {
      setRemoving(false);
    }
  };

  const prettyDate = selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border px-4 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => goBackOrHome(router)} className="rounded-full bg-secondary p-2">
            <ArrowLeft size={20} color="hsl(0 0% 98%)" />
          </Pressable>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Calendar size={20} color="hsl(217 91% 60%)" />
              <Text className="text-xl font-bold text-foreground">{prettyDate}</Text>
            </View>
            <View className="mt-0.5 flex-row items-center gap-1.5">
              <Film size={13} color="hsl(0 0% 63.9%)" />
              <Text className="text-sm text-muted-foreground">
                {moviesOnThisDay.length} {moviesOnThisDay.length === 1 ? 'movie' : 'movies'} watched
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[{ padding: 16, paddingBottom: 48, gap: 24 }, contentStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Movies already on this day */}
        {moviesOnThisDay.length > 0 && (
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Movies Watched</Text>
            <View className="flex-row flex-wrap gap-3">
              {moviesOnThisDay.map((movie) => (
                <View key={movie.id} className="w-[30%]">
                  <Pressable
                    onPress={() => router.push({ pathname: '/edit/[movieId]', params: { movieId: movie.id } })}
                    className="aspect-[2/3] overflow-hidden rounded-lg border border-border bg-secondary"
                  >
                    {movie.coverUrl ? (
                      <Image source={{ uri: movie.coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <View className="flex-1 items-center justify-center p-2">
                        <Text className="text-center text-xs text-muted-foreground">{movie.title}</Text>
                      </View>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => setMovieToRemove(movie)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-red-500/90 p-1.5"
                  >
                    <Text className="text-[10px] font-bold leading-none text-white">✕</Text>
                  </Pressable>
                  <Text className="mt-1 text-xs text-foreground" numberOfLines={1}>
                    {movie.title}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Add movies */}
        <View className="gap-3">
          <Text className="text-lg font-bold text-foreground">Add Movies to This Date</Text>
          <View className="flex-row items-center gap-2 rounded-xl border border-border bg-secondary px-3">
            <Search size={18} color="hsl(0 0% 63.9%)" />
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search your watched movies…"
              placeholderTextColor="hsl(0 0% 63.9%)"
              className="flex-1 py-3 text-foreground"
            />
          </View>

          {selectedIds.length > 0 && (
            <View className="flex-row items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-3">
              <Text className="font-medium text-primary">
                {selectedIds.length} selected
              </Text>
              <Pressable onPress={addSelected} disabled={saving} className="rounded-lg bg-primary px-5 py-2.5">
                <Text className="font-semibold text-white">{saving ? 'Adding…' : 'Add to Date'}</Text>
              </Pressable>
            </View>
          )}

          {searchQuery ? (
            results.length === 0 ? (
              <Text className="py-8 text-center text-muted-foreground">No movies found</Text>
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {results.map((movie) => {
                  const selected = selectedIds.includes(movie.id);
                  const onThisDay = moviesOnThisDay.some((m) => m.id === movie.id);
                  return (
                    <Pressable
                      key={movie.id}
                      disabled={onThisDay}
                      onPress={() => toggle(movie.id)}
                      className={`w-[30%] overflow-hidden rounded-lg border ${
                        onThisDay ? 'border-border opacity-50' : selected ? 'border-primary' : 'border-border'
                      }`}
                    >
                      <View className="aspect-[2/3] bg-secondary">
                        {movie.coverUrl ? (
                          <Image source={{ uri: movie.coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        ) : (
                          <View className="flex-1 items-center justify-center p-2">
                            <Text className="text-center text-xs text-muted-foreground">{movie.title}</Text>
                          </View>
                        )}
                        {selected && (
                          <View className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-primary">
                            <Check size={16} color="#fff" />
                          </View>
                        )}
                        {onThisDay && (
                          <View className="absolute inset-0 items-center justify-center bg-black/60">
                            <Text className="text-xs font-medium text-white">Already added</Text>
                          </View>
                        )}
                      </View>
                      <Text className="p-1.5 text-xs text-foreground" numberOfLines={1}>
                        {movie.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )
          ) : (
            <View className="items-center gap-2 py-10">
              <Search size={40} color="hsl(0 0% 40%)" />
              <Text className="text-muted-foreground">Search for movies to add to this date</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={!!movieToRemove}
        title="Remove movie?"
        description={movieToRemove ? `Remove "${movieToRemove.title}" from ${prettyDate}?` : ''}
        confirmLabel="Remove"
        destructive
        loading={removing}
        onConfirm={confirmRemove}
        onCancel={() => setMovieToRemove(null)}
      />
    </View>
  );
}
