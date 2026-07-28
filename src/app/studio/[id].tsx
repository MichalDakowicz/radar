import { useLocalSearchParams, useRouter } from 'expo-router';
import { Building2 } from 'lucide-react-native';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContentShell } from '@/components/layout/ContentShell';
import { MediaGrid } from '@/components/media/MediaGrid';
import { BackButton } from '@/components/ui/BackButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { toDiscoveryMovie } from '@/features/browse/toDiscoveryMovie';
import { useQuickAdd } from '@/features/movies/add/useQuickAdd';
import { useCompanyDetails, useCompanyMoviesInfinite } from '@/hooks/useTmdb';
import { MAX_W } from '@/hooks/useResponsive';
import type { Movie } from '@/types/movie';

// Studio landing page - paginated TMDB titles for one production company.
// Mirrors GenreDetails; name comes from the company endpoint since the id
// param carries no name.
export default function StudioDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const companyId = Number(id);
  const quickAdd = useQuickAdd();

  const { data: company, isLoading: loadingCompany } = useCompanyDetails(companyId);
  const {
    data: moviePages,
    isLoading: loadingMovies,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCompanyMoviesInfinite(companyId);

  if (loadingCompany || loadingMovies) {
    return (
      <View className="flex-1 bg-background">
        <LoadingState label="Loading studio…" />
      </View>
    );
  }
  if (isError) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState message="Couldn't load this studio" onRetry={refetch} />
      </View>
    );
  }

  const studioName = company?.name ?? 'Studio';
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
            <View className="gap-2 px-4 pb-4" style={{ paddingTop: insets.top + 8 }}>
              <BackButton className="mb-3" />
              {company?.logoUrl ? (
                <Image
                  source={{ uri: company.logoUrl }}
                  resizeMode="contain"
                  className="h-14 w-32"
                />
              ) : null}
              <Text className="text-3xl font-bold text-foreground">{studioName}</Text>
              <View className="flex-row items-center gap-1.5">
                <Building2 size={14} color="#06b6d4" />
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
