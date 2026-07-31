import { useLocalSearchParams, useRouter } from 'expo-router';
import { Lock, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { MediaGrid } from '@/components/media/MediaGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { FavoritesRow } from '@/features/profile/FavoritesRow';
import { movieMatchesSearchQuery } from '@/lib/librarySearch';
import { useProfile } from '@/hooks/useProfile';
import { useCanViewUser, usePublicMovies } from '@/hooks/usePublicMovies';
import { MAX_W } from '@/hooks/useResponsive';
import type { FavoriteItem, Movie } from '@/types/movie';

const MUTED = 'hsl(0 0% 45%)';

// Public read-only library (legacy SharedShelf). Renders through the unified
// MediaGrid/MovieCard (readOnly) - no per-page card markup (doc 12). Availability
// is gated by RLS (private.can_view); can_view_user tells private from empty.
export default function PublicLibrary() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { canView, loading: viewLoading } = useCanViewUser(userId);
  const { movies, loading, error } = usePublicMovies(canView ? userId : undefined);
  const { profile } = useProfile(userId);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => (search.trim() ? movies.filter((m) => movieMatchesSearchQuery(m, search)) : movies),
    [movies, search],
  );

  const openTitle = (tmdbId: number, type: Movie['type']) =>
    router.push({ pathname: '/movie/[tmdbId]/[type]', params: { tmdbId: String(tmdbId), type } });

  const openMovie = (movie: Movie) => {
    if (movie.tmdbId == null) return; // manual entries have no TMDB detail page
    openTitle(movie.tmdbId, movie.type);
  };

  const openFavorite = (item: FavoriteItem) => openTitle(item.tmdbId, item.type);

  const favorites = profile?.favorites ?? [];

  if (viewLoading || (canView && loading)) {
    return (
      <View className="flex-1 bg-background">
        <LoadingState label="Loading shelf…" />
      </View>
    );
  }

  if (canView === false) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState icon={<Lock size={40} color={MUTED} />} title="This shelf is private" description="Only friends can view this collection." />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load shelf'} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 border-b border-border px-4 py-3">
        <Search size={18} color="hsl(0 0% 63.9%)" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search this collection…"
          placeholderTextColor="hsl(0 0% 63.9%)"
          className="flex-1 text-foreground"
        />
      </View>
      <ContentShell fill maxWidth={MAX_W.grid}>
        <MediaGrid
          movies={filtered}
          size="normal"
          onPress={openMovie}
          readOnly
          showRatings
          // Pinned picks head the shelf, and scroll away with it. Hidden while
          // searching: the row isn't part of the result set, so leaving it up
          // would read as four stray matches.
          ListHeaderComponent={
            !search.trim() && favorites.length > 0 ? (
              <View className="px-4 pb-2 pt-4">
                <FavoritesRow favorites={favorites} onPressItem={openFavorite} />
              </View>
            ) : undefined
          }
          ListEmptyComponent={<EmptyState title="Nothing here yet" description="This collection is empty." />}
        />
      </ContentShell>
    </View>
  );
}
