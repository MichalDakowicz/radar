import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { MediaGrid } from '@/components/media/MediaGrid';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { toDiscoveryMovie } from '@/features/browse/toDiscoveryMovie';
import { useQuickAdd } from '@/features/movies/add/useQuickAdd';
import { PersonHero } from '@/features/person/PersonHero';
import { useActorDetails, useActorMoviesInfinite } from '@/hooks/useTmdb';
import { MAX_W } from '@/hooks/useResponsive';
import type { Movie } from '@/types/movie';

// Actor bio + paginated filmography (doc 03 `ActorDetails`) - infinite-scroll
// grid instead of legacy's "show top 6 / load more" toggle.
export default function ActorDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const personId = Number(id);
  const quickAdd = useQuickAdd();

  const { data: actor, isLoading: loadingActor, isError: actorError, refetch: refetchActor } = useActorDetails(personId);
  const {
    data: creditPages,
    isLoading: loadingMovies,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useActorMoviesInfinite(personId);

  if (loadingActor || loadingMovies) {
    return (
      <View className="flex-1 bg-background">
        <LoadingState label="Loading actor…" />
      </View>
    );
  }
  if (actorError || !actor) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState message="Couldn't load this person" onRetry={refetchActor} />
      </View>
    );
  }

  const totalCount = creditPages?.pages[0]?.totalCount ?? 0;
  const movies = (creditPages?.pages.flatMap((p) => p.movies) ?? []).map(toDiscoveryMovie);

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
            <PersonHero
              name={actor.name}
              profileUrl={actor.profileUrl}
              knownForDepartment={actor.knownForDepartment}
              filmCount={totalCount}
              birthday={actor.birthday}
              placeOfBirth={actor.placeOfBirth}
              biography={actor.biography}
            />
          }
        />
      </ContentShell>
    </View>
  );
}
