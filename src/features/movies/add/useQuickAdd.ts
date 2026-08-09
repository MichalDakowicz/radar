import { useState } from 'react';

import { useMovies } from '@/hooks/useMovies';
import { normalizeAvailability } from '@/lib/services';
import type { StatusFlags } from '@/lib/movieStatus';
import { fetchMediaMetadata, type MediaMetadata } from '@/lib/tmdb';
import type { MediaType, Movie, Ratings } from '@/types/movie';

export type QuickAddStatus = StatusFlags & { timesWatched: number };

export const DEFAULT_QUICK_ADD_STATUS: QuickAddStatus = {
  inWatchlist: true,
  inProgress: false,
  watched: false,
  timesWatched: 0,
};

function statusLabel(status: StatusFlags): string {
  return status.watched ? 'Completed' : status.inProgress ? 'Watching' : 'Watchlist';
}

function metadataToPayload(
  meta: MediaMetadata,
  status: QuickAddStatus,
  ratings: Ratings = {},
): Partial<Movie> & { title: string; type: MediaType } {
  return {
    tmdbId: meta.tmdbId,
    imdbId: meta.imdbId,
    type: meta.type,
    title: meta.title,
    director: meta.director,
    cast: meta.cast,
    genres: meta.genres,
    releaseDate: meta.releaseDate,
    coverUrl: meta.coverUrl,
    overview: meta.overview,
    runtime: meta.runtime,
    voteAverage: meta.voteAverage,
    voteCount: meta.voteCount,
    tagline: meta.tagline,
    budget: meta.budget,
    revenue: meta.revenue,
    productionCompanies: meta.productionCompanies,
    numberOfSeasons: meta.number_of_seasons,
    numberOfEpisodes: meta.number_of_episodes,
    tmdbStatus: meta.tmdbStatus,
    availability: normalizeAvailability(meta.availability),
    status: statusLabel(status),
    inWatchlist: status.inWatchlist,
    inProgress: status.inProgress,
    watched: status.watched,
    timesWatched: status.watched ? status.timesWatched || 1 : 0,
    completedAt: status.watched ? new Date().toISOString() : null,
    ratings,
  };
}

// Shared "add to library" entry point (doc 12 part 2): Browse's quick-add
// buttons and the QuickAddSheet both go through this, so "add from Browse" and
// "add from the + button" are the same code path.
export function useQuickAdd() {
  const { movies, addMovie, removeMovie } = useMovies();
  const [pendingTmdbId, setPendingTmdbId] = useState<number | null>(null);

  // Type narrows the match where the caller knows it: TMDB numbers a film and a
  // series independently, so id alone can call a show "already added" because a
  // movie happens to carry the same number.
  const findByTmdbId = (tmdbId: number | null, type?: MediaType) =>
    tmdbId ? (movies.find((m) => m.tmdbId === tmdbId && (!type || m.type === type)) ?? null) : null;
  const isAdded = (tmdbId: number | null, type?: MediaType) => findByTmdbId(tmdbId, type) !== null;

  // Browse's quick-add buttons: always defaults to Watchlist (doc 12's confirm).
  const add = async (tmdbId: number, type: MediaType, countryCode = 'US') => {
    if (isAdded(tmdbId, type)) return;
    setPendingTmdbId(tmdbId);
    try {
      const metadata = await fetchMediaMetadata(tmdbId, type, countryCode);
      if (!metadata) return;
      await addMovie(metadataToPayload(metadata, DEFAULT_QUICK_ADD_STATUS));
    } finally {
      setPendingTmdbId(null);
    }
  };

  // QuickAddSheet path: caller already picked a status via StatusPicker.
  const addWithStatus = async (meta: MediaMetadata, status: QuickAddStatus, ratings: Ratings = {}) => {
    if (isAdded(meta.tmdbId, meta.type)) return;
    setPendingTmdbId(meta.tmdbId);
    try {
      await addMovie(metadataToPayload(meta, status, ratings));
    } finally {
      setPendingTmdbId(null);
    }
  };

  // "Add manually" - TMDB couldn't find the title, so only title/type/status are known.
  const addManual = async (title: string, type: MediaType, status: QuickAddStatus, ratings: Ratings = {}) => {
    await addMovie({
      title,
      type,
      director: [],
      cast: [],
      genres: [],
      availability: [],
      status: statusLabel(status),
      inWatchlist: status.inWatchlist,
      inProgress: status.inProgress,
      watched: status.watched,
      timesWatched: status.watched ? status.timesWatched || 1 : 0,
      completedAt: status.watched ? new Date().toISOString() : null,
      ratings,
    });
  };

  const remove = async (tmdbId: number) => {
    const movie = findByTmdbId(tmdbId);
    if (!movie) return;
    setPendingTmdbId(tmdbId);
    try {
      await removeMovie(movie.id);
    } finally {
      setPendingTmdbId(null);
    }
  };

  return { movies, add, addWithStatus, addManual, remove, isAdded, findByTmdbId, pendingTmdbId };
}
