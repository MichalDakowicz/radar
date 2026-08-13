import { useLocalSearchParams, useRouter } from 'expo-router';
import { Film } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { FacetLibraryHeader } from '@/features/library/FacetLibraryHeader';
import { LibraryMainList } from '@/features/library/LibraryMainList';
import { useMovies } from '@/hooks/useMovies';
import { MAX_W } from '@/hooks/useResponsive';
import { facetSummary, facetTitle, isLibraryFacet, selectFacetMovies } from '@/lib/libraryFacetView';
import { useLibraryPrefs } from '@/store/libraryPrefs';
import type { Movie } from '@/types/movie';

// "Which of my titles is this stat made of" (doc 13 §2). A Stats tap lands here
// instead of on TMDB, and instead of writing into the Library tab's persisted
// filters - those are durable user state and a stat tap must not overwrite them.
export default function InLibraryScreen() {
  const router = useRouter();
  const { facet, value = '', tmdbId } = useLocalSearchParams<{ facet?: string; value?: string; tmdbId?: string }>();
  const { movies, loading, error } = useMovies();
  const { viewMode, gridSize } = useLibraryPrefs();

  const resolved = isLibraryFacet(facet) ? facet : 'all';
  const selected = useMemo(() => selectFacetMovies(movies, resolved, value), [movies, resolved, value]);
  const summary = useMemo(() => facetSummary(selected), [selected]);

  const openMovie = (movie: Movie) => router.push({ pathname: '/edit/[movieId]', params: { movieId: movie.id } });

  const openExternal =
    tmdbId && resolved === 'director'
      ? () => router.push({ pathname: '/director/[id]', params: { id: tmdbId } })
      : tmdbId && resolved === 'genre'
        ? () => router.push({ pathname: '/genre/[id]', params: { id: tmdbId } })
        : undefined;

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <LoadingState label="Loading your library…" />
      </View>
    );
  }
  if (error) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load your library'} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenTop />
      <ContentShell fill maxWidth={MAX_W.grid}>
        <LibraryMainList
          movies={selected}
          viewMode={viewMode}
          gridSize={gridSize}
          onPress={openMovie}
          ListHeaderComponent={
            <FacetLibraryHeader
              facet={resolved}
              title={facetTitle(resolved, value)}
              summary={summary}
              onOpenExternal={openExternal}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Film size={40} color="hsl(0 0% 63.9%)" />}
              title="Nothing here yet"
              description="No title in your library matches this."
            />
          }
        />
      </ContentShell>
    </View>
  );
}
