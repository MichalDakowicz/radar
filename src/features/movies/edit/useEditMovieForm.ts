import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useMovies } from '@/hooks/useMovies';
import { normalizeAvailability } from '@/lib/services';
import { fetchMediaMetadata, searchMedia } from '@/lib/tmdb';
import { goBackOrHome } from '@/lib/utils';
import type { Movie } from '@/types/movie';

import { buildMoviePayload, fromMovie, recalcOverall, recalcSeasonsAverage, type EditForm } from './editForm';

/**
 * All the useState + save/delete logic for the Edit screen (doc 03
 * `useEditMovieForm`) - the tabs are pure rendering, this hook owns the form.
 */
export function useEditMovieForm(movie: Movie | undefined) {
  const router = useRouter();
  const { updateMovie, removeMovie } = useMovies();

  const [form, setForm] = useState<EditForm | null>(null);
  const [isSmartFilling, setIsSmartFilling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initializedId = useRef<string | null>(null);

  // Initialize once per movie id - later cache refreshes (realtime, silent
  // reorder writes) must not clobber in-progress edits.
  useEffect(() => {
    if (movie && initializedId.current !== movie.id) {
      initializedId.current = movie.id;
      setForm(fromMovie(movie));
    }
  }, [movie]);

  const update = (patch: Partial<EditForm>) => setForm((f) => (f ? { ...f, ...patch } : f));

  // Catalogue fields (title, cast, genres, availability, overview…) have no
  // hand-editing path anymore - they are TMDB facts, and Smart-fill below is
  // the only thing that rewrites them. The user owns status, rating and notes.
  const handleSmartFill = async () => {
    if (!form?.title) return;
    setIsSmartFilling(true);
    try {
      let data = form.tmdbId ? await fetchMediaMetadata(form.tmdbId, form.type, 'US') : null;
      if (!data) {
        const results = await searchMedia(form.title);
        const match = results.find((r) => r.type === form.type) ?? results[0];
        if (match) data = await fetchMediaMetadata(match.tmdbId, match.type, 'US');
      }
      if (data) {
        update({
          tmdbId: data.tmdbId,
          imdbId: data.imdbId,
          voteAverage: data.voteAverage,
          title: data.title,
          type: data.type,
          coverUrl: data.coverUrl || form.coverUrl,
          releaseDate: data.releaseDate || form.releaseDate,
          genres: data.genres,
          cast: data.cast,
          runtime: data.runtime,
          overview: data.overview,
          availability: normalizeAvailability(data.availability),
          numberOfSeasons: data.number_of_seasons ?? 0,
          numberOfEpisodes: data.number_of_episodes ?? 0,
          director: data.director.length > 0 ? data.director : form.director,
        });
      }
    } finally {
      setIsSmartFilling(false);
    }
  };

  const recalcMovieOverall = () => {
    if (!form) return;
    const avg = recalcOverall(form.ratings);
    if (avg != null) update({ overallRating: avg });
  };

  const recalcSeasonOverall = (season: number) => {
    if (!form) return;
    const s = form.seasonRatings[season];
    if (!s) return;
    const avg = recalcOverall({ story: s.story, acting: s.acting, ending: s.ending, enjoyment: s.enjoyment });
    if (avg != null) setSeasonRating(season, 'overall', avg);
  };

  const recalcAllSeasonsAverage = () => {
    if (!form) return;
    const avg = recalcSeasonsAverage(form.seasonRatings);
    if (avg != null) update({ overallRating: avg });
  };

  const setSeasonRating = (season: number, key: 'overall' | 'story' | 'acting' | 'ending' | 'enjoyment', value: number) => {
    if (!form) return;
    const current = form.seasonRatings[season] ?? { overall: 0, story: 0, acting: 0, ending: 0, enjoyment: 0 };
    update({ seasonRatings: { ...form.seasonRatings, [season]: { ...current, [key]: value } } });
  };

  const episodeKey = (season: number, episodeNumber: number) => `s${season}e${episodeNumber}`;

  const toggleEpisodeWatched = (season: number, episodeNumber: number) => {
    if (!form) return;
    const key = episodeKey(season, episodeNumber);
    const nowWatched = !form.episodesWatched[key];
    const episodesWatched = { ...form.episodesWatched, [key]: nowWatched };
    const episodeWatchDates = { ...form.episodeWatchDates };
    if (nowWatched) episodeWatchDates[key] = new Date().toISOString();
    else delete episodeWatchDates[key];
    update({ episodesWatched, episodeWatchDates });
  };

  const markSeasonComplete = (season: number, episodeNumbers: number[]) => {
    if (!form) return;
    const now = new Date().toISOString();
    const episodesWatched = { ...form.episodesWatched };
    const episodeWatchDates = { ...form.episodeWatchDates };
    for (const num of episodeNumbers) {
      const key = episodeKey(season, num);
      episodesWatched[key] = true;
      if (!form.episodesWatched[key]) episodeWatchDates[key] = now;
    }
    update({ episodesWatched, episodeWatchDates });
  };

  const save = async () => {
    if (!form || !movie) return;
    setIsSaving(true);
    try {
      const result = buildMoviePayload(form, movie);
      if (result.remove) await removeMovie(movie.id);
      else await updateMovie(movie.id, result.updates);
      goBackOrHome(router);
    } finally {
      setIsSaving(false);
    }
  };

  // No navigation here - the detail screen decides where the user lands after
  // a removal (it keeps them on the title so they can add it straight back).
  const remove = async () => {
    if (!movie) return;
    setIsSaving(true);
    try {
      await removeMovie(movie.id);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    form,
    update,
    handleSmartFill,
    recalcMovieOverall,
    recalcSeasonOverall,
    recalcAllSeasonsAverage,
    setSeasonRating,
    toggleEpisodeWatched,
    markSeasonComplete,
    save,
    remove,
    isSmartFilling,
    isSaving,
  };
}
