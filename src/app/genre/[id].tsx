import { useLocalSearchParams, useRouter } from 'expo-router';
import { Film } from 'lucide-react-native';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContentShell } from '@/components/layout/ContentShell';
import { GenreIcon } from '@/components/media/GenreIcon';
import { MediaGrid } from '@/components/media/MediaGrid';
import { BackButton } from '@/components/ui/BackButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { toDiscoveryMovie } from '@/features/browse/toDiscoveryMovie';
import { useQuickAdd } from '@/features/movies/add/useQuickAdd';
import { useGenreMoviesInfinite, useGenres } from '@/hooks/useTmdb';
import { MAX_W } from '@/hooks/useResponsive';
import type { Movie } from '@/types/movie';

// Genre landing page - paginated TMDB titles for one genre (doc 03
// `GenreDetails`). No id param carries the name, so it's resolved from the
// cached movie-genre list rather than legacy's hardcoded id->name table.
export default function GenreDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const genreId = Number(id);
  const quickAdd = useQuickAdd();

  const { data: genres = [], isLoading: loadingGenres } = useGenres('movie');
  const {
    data: moviePages,
    isLoading: loadingMovies,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGenreMoviesInfinite(genreId);

  if (loadingGenres || loadingMovies) {
    return (
      <View className="flex-1 bg-background">
        <LoadingState label="Loading genre…" />
      </View>
    );
  }
  if (isError) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState message="Couldn't load this genre" onRetry={refetch} />
      </View>
    );
  }

  const genreName = genres.find((g) => g.id === genreId)?.name ?? 'Genre';
  const totalCount = moviePages?.pages[0]?.totalCount ?? 0;
  const movies = (moviePages?.pages.flatMap((p) => p.movies) ?? []).map(toDiscoveryMovie);

  const openMovie = (movie: Movie) => {
    const owned = quickAdd.findByTmdbId(movie.tmdbId);
    if (owned) router.push({ pathname: '/edit/[movieId]', params: { movieId: owned.id } });
    else router.push({ pathname: '/movie/[tmdbId]/[type]', params: { tmdbId: String(movie.tmdbId), type: movie.type } });
  };

  return (
    <View className="flex-1 bg-background">
      <ContentShell fill maxWidth={MAX_W.grid}>
        <MediaGrid
          movies={movies}
          onPress={openMovie}
          showStatus={false}
          showRatings={false}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="items-center py-6">
                <ActivityIndicator color="hsl(217 91% 60%)" />
              </View>
            ) : undefined
          }
          ListHeaderComponent={
            <View className="gap-1 px-4 pb-4" style={{ paddingTop: insets.top + 8 }}>
              <BackButton className="mb-3" />
              <View className="flex-row items-center gap-2">
                <GenreIcon genre={genreName} size={26} color="hsl(0 0% 98%)" />
                <Text className="text-3xl font-bold text-foreground">{genreName}</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Film size={14} color="#3b82f6" />
                <Text className="text-sm text-muted-foreground">
                  {totalCount} {totalCount === 1 ? 'title' : 'titles'}
                </Text>
              </View>
            </View>
          }
        />
      </ContentShell>
    </View>
  );
}
