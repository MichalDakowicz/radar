import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { MovieDetailScreen } from '@/features/movies/detail/MovieDetailScreen';
import { useMovies } from '@/hooks/useMovies';
import { goBackOrHome } from '@/lib/utils';

// Owned-title entry point (doc 03 Edit, doc 12 part 1 unify) - resolved by
// local id (not tmdbId) so manually-added titles with no TMDB match still
// open correctly. Renders the same shared MovieDetailScreen as
// /movie/[tmdbId]/[type].
export default function EditMovie() {
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const router = useRouter();
  const { movies, loading } = useMovies();
  const movie = movies.find((m) => m.id === movieId);

  if (loading) return <LoadingState label="Loading…" />;
  if (!movie) return <ErrorState message="Movie not found" onRetry={() => goBackOrHome(router)} />;

  return <MovieDetailScreen tmdbId={movie.tmdbId} type={movie.type} movieId={movie.id} />;
}
