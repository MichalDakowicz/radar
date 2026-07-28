import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { MediaGrid } from '@/components/media/MediaGrid';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { toDiscoveryMovie } from '@/features/browse/toDiscoveryMovie';
import { useQuickAdd } from '@/features/movies/add/useQuickAdd';
import { PersonHero } from '@/features/person/PersonHero';
import { useDirectorDetails, useDirectorMovies } from '@/hooks/useTmdb';
import { MAX_W } from '@/hooks/useResponsive';
import type { Movie } from '@/types/movie';

// Director bio + directed-films grid (doc 03 `DirectorDetails`) - not
// paginated, `fetchDirectorMovies` already returns the full filmography.
export default function DirectorDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const personId = Number(id);
  const quickAdd = useQuickAdd();

  const {
    data: director,
    isLoading: loadingDirector,
    isError: directorError,
    refetch: refetchDirector,
  } = useDirectorDetails(personId);
  const { data: credits = [], isLoading: loadingMovies } = useDirectorMovies(personId);

  if (loadingDirector || loadingMovies) {
    return (
      <View className="flex-1 bg-background">
        <LoadingState label="Loading director…" />
      </View>
    );
  }
  if (directorError || !director) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState message="Couldn't load this person" onRetry={refetchDirector} />
      </View>
    );
  }

  const movies = [...credits].sort((a, b) => b.voteAverage - a.voteAverage).map(toDiscoveryMovie);

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
          ListHeaderComponent={
            <PersonHero
              name={director.name}
              profileUrl={director.profileUrl}
              knownForDepartment={director.knownForDepartment}
              filmCount={credits.length}
              birthday={director.birthday}
              placeOfBirth={director.placeOfBirth}
              biography={director.biography}
            />
          }
        />
      </ContentShell>
    </View>
  );
}
