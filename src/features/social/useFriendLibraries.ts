import { useMemo } from 'react';

import { personalScore } from '@/components/media/RatingStars';
import { useMovies } from '@/hooks/useMovies';
import { useProfile } from '@/hooks/useProfile';
import { useCanViewUser, usePublicMovies } from '@/hooks/usePublicMovies';
import { titleKey, type RatedTitle } from '@/lib/compareTaste';
import type { Movie } from '@/types/movie';

/**
 * Both sides of a comparison in one place: your library, theirs, and whether
 * you are allowed to see theirs at all.
 *
 * Every friend-facing screen (shelf, compare, watch together) needs the same
 * three reads, and react-query dedupes them across screens — so pushing from a
 * shelf into Compare costs nothing beyond the render.
 */
export function useFriendLibraries(friendId: string | undefined) {
  const { canView, loading: viewLoading } = useCanViewUser(friendId);
  const { profile, loading: profileLoading } = useProfile(friendId);
  const { movies: theirs, loading: theirsLoading, error } = usePublicMovies(canView ? friendId : undefined);
  const { movies: mine, loading: mineLoading } = useMovies();

  return {
    profile,
    canView,
    theirs,
    mine,
    loading: viewLoading || profileLoading || mineLoading || (canView === true && theirsLoading),
    error,
  };
}

/** A library flattened to the titles that carry a score, keyed for set maths. */
export function toRatedTitles(movies: Movie[]): RatedTitle[] {
  const rated: RatedTitle[] = [];
  for (const movie of movies) {
    const score = personalScore(movie.ratings);
    if (score == null || score <= 0) continue;
    rated.push({
      key: titleKey(movie.tmdbId, movie.type, movie.title),
      title: movie.title,
      coverUrl: movie.coverUrl,
      tmdbId: movie.tmdbId,
      type: movie.type,
      score,
    });
  }
  return rated;
}

export function useRatedTitles(movies: Movie[]): RatedTitle[] {
  return useMemo(() => toRatedTitles(movies), [movies]);
}
