import { Search, Star, X } from 'lucide-react-native';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { BottomSheetModal, BottomSheetTextInput, Sheet } from '@/components/ui/Sheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { FavoritePickerGrid } from '@/features/profile/FavoritePickerGrid';
import { FavoritePoster } from '@/features/profile/FavoritePoster';
import { useMovies } from '@/hooks/useMovies';
import { useProfile, useUpdateFavorites } from '@/hooks/useProfile';
import { MAX_FAVORITES, favoriteKey, movieToFavorite, sortByRatingDesc, toggleFavorite } from '@/lib/favorites';
import { movieMatchesSearchQuery } from '@/lib/librarySearch';
import type { FavoriteItem, Movie } from '@/types/movie';

const MUTED = 'hsl(0 0% 63.9%)';

/**
 * Editor for the profile top 4. Edits a local draft and commits on Save, so
 * shuffling picks doesn't fire a write per tap, and dismissing without saving
 * leaves the profile as it was.
 *
 * Takes no props and reads its own data (like EditProfileSheet) so it can be
 * mounted at screen level, as a sibling of the Settings ScrollView. Declared
 * *inside* that ScrollView instead, its list gesture loses to the scroll view's
 * pan and the picker cannot be scrolled at all.
 */
export const FavoritesEditorSheet = forwardRef<BottomSheetModal>(
  function FavoritesEditorSheet(_props, ref) {
    const { show } = useToast();
    const { user } = useAuth();
    const { profile } = useProfile(user?.id);
    const { movies } = useMovies();
    const updateFavorites = useUpdateFavorites();

    const favorites = useMemo(() => profile?.favorites ?? [], [profile]);
    const [draft, setDraft] = useState<FavoriteItem[]>(favorites);
    const [query, setQuery] = useState('');

    // Watched only, best first: a favourite is a verdict on something you've
    // seen, and the top of the list is where your highest-rated titles — the
    // likely picks — should already be. tmdbId is required too, since manual
    // entries have no detail page to open and no poster to draw.
    const pinnable = useMemo(() => sortByRatingDesc(movies.filter((m) => m.tmdbId != null && m.watched)), [movies]);
    const results = useMemo(
      () => (query.trim() ? pinnable.filter((m) => movieMatchesSearchQuery(m, query)) : pinnable),
      [pinnable, query],
    );

    const orderOf = useCallback(
      (movie: Movie) => {
        const index = draft.findIndex((f) => f.tmdbId === movie.tmdbId && f.type === movie.type);
        return index === -1 ? null : index + 1;
      },
      [draft],
    );

    const toggle = (movie: Movie) => {
      const item = movieToFavorite(movie);
      if (!item) return;
      const next = toggleFavorite(draft, item);
      // toggleFavorite returns the same array when the list is full, which is
      // the only silent failure here — say so rather than eat the tap.
      if (next === draft) {
        show(`Remove one first — ${MAX_FAVORITES} is the limit`);
        return;
      }
      setDraft(next);
    };

    const removeAt = (index: number) => setDraft(draft.filter((_, i) => i !== index));

    const save = async () => {
      try {
        await updateFavorites.mutateAsync(draft);
        show('Favourites updated');
        (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
      } catch (e) {
        show(e instanceof Error ? e.message : 'Could not save your favourites');
      }
    };

    const slots = Array.from({ length: MAX_FAVORITES }, (_, i) => draft[i] ?? null);

    return (
      <Sheet
        ref={ref}
        snapPoints={['85%']}
        maxWidth={680}
        // Re-seed on open so a dismissed edit doesn't linger as the next draft.
        onChange={(index) => {
          if (index >= 0) {
            setDraft(favorites);
            setQuery('');
          }
        }}
      >
        <View className="flex-1 pb-2">
          <View className="flex-row items-center gap-3 px-4 pb-3 pt-1">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Star size={20} color="hsl(217 91% 60%)" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-foreground">Your top {MAX_FAVORITES}</Text>
              <Text className="text-xs text-muted-foreground">
                {draft.length}/{MAX_FAVORITES} picked · from titles you&apos;ve watched
              </Text>
            </View>
          </View>

          {/* Draft strip — the order here is the order the profile shows. */}
          <View className="flex-row gap-2 px-4 pb-3">
            {slots.map((item, index) => (
              <View key={item ? favoriteKey(item) : `empty-${index}`} className="flex-1">
                <FavoritePoster
                  item={item}
                  slot={index + 1}
                  editable
                  onPress={item ? () => removeAt(index) : undefined}
                />
              </View>
            ))}
          </View>

          <View className="mx-4 mb-3 flex-row items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2.5">
            <Search size={18} color={MUTED} />
            <BottomSheetTextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search your library…"
              placeholderTextColor={MUTED}
              returnKeyType="search"
              className="flex-1 text-foreground"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8} className="rounded-full bg-muted/40 p-1">
                <X size={14} color={MUTED} />
              </Pressable>
            )}
          </View>

          <FavoritePickerGrid
            movies={results}
            orderOf={orderOf}
            onToggle={toggle}
            ListEmptyComponent={
              <EmptyState
                title={pinnable.length === 0 ? 'Nothing to pin yet' : 'No matches'}
                description={
                  pinnable.length === 0
                    ? 'Mark a movie or show as watched and it can go in your top 4.'
                    : 'No watched title matches that search.'
                }
              />
            }
          />

          <View className="border-t border-border px-4 pb-2 pt-3">
            <Pressable
              onPress={save}
              disabled={updateFavorites.isPending}
              className="items-center rounded-full bg-primary py-3.5"
              style={{ opacity: updateFavorites.isPending ? 0.5 : 1 }}
            >
              {updateFavorites.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-bold text-primary-foreground">Save favourites</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Sheet>
    );
  },
);
