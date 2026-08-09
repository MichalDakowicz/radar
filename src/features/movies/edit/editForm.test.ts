import { buildMoviePayload, fromMovie, recalcOverall, recalcSeasonsAverage, type EditForm } from './editForm';
import type { Movie } from '@/types/movie';

const BASE_MOVIE: Movie = {
  id: 'm1',
  userId: 'u1',
  tmdbId: 42,
  imdbId: 'tt1',
  type: 'movie',
  title: 'Test Movie',
  director: [],
  cast: [],
  genres: [],
  releaseDate: '2020-01-01',
  coverUrl: null,
  overview: '',
  runtime: 100,
  voteAverage: 7,
  voteCount: 10,
  tagline: '',
  budget: 0,
  revenue: 0,
  productionCompanies: [],
  numberOfSeasons: null,
  numberOfEpisodes: null,
  tmdbStatus: null,
  availability: [],
  status: 'Watchlist',
  inWatchlist: true,
  inProgress: false,
  watched: false,
  timesWatched: 0,
  completedAt: null,
  lastWatchedPosition: null,
  ratings: {},
  notes: '',
  url: '',
  addedAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
  episodesWatched: {},
  episodeWatchDates: {},
  seasonEpisodeCounts: {},
};

describe('fromMovie / buildMoviePayload round trip', () => {
  it('marks a movie for removal when unwatched and unchecked from every status', () => {
    const form = fromMovie(BASE_MOVIE);
    form.status = { inWatchlist: false, inProgress: false, watched: false, timesWatched: 0 };

    expect(buildMoviePayload(form, BASE_MOVIE)).toEqual({ remove: true });
  });

  it('never removes a TV show even with no status set', () => {
    const tvMovie: Movie = { ...BASE_MOVIE, type: 'tv' };
    const form = fromMovie(tvMovie);
    form.status = { inWatchlist: false, inProgress: false, watched: false, timesWatched: 0 };

    const result = buildMoviePayload(form, tvMovie);
    expect(result.remove).toBe(false);
  });

  it('sets completedAt when marked watched and clears it when unwatched', () => {
    const form = fromMovie(BASE_MOVIE);
    form.status = { inWatchlist: false, inProgress: false, watched: true, timesWatched: 1 };

    const watched = buildMoviePayload(form, BASE_MOVIE);
    expect(watched.remove).toBe(false);
    if (!watched.remove) {
      expect(watched.updates.watched).toBe(true);
      expect(watched.updates.completedAt).toBeTruthy();
      expect(watched.updates.status).toBe('Completed');
    }

    form.status = { inWatchlist: true, inProgress: false, watched: false, timesWatched: 0 };
    const backToWatchlist = buildMoviePayload(form, BASE_MOVIE);
    expect(backToWatchlist.remove).toBe(false);
    if (!backToWatchlist.remove) {
      expect(backToWatchlist.updates.completedAt).toBeNull();
      expect(backToWatchlist.updates.status).toBe('Watchlist');
    }
  });

  it('preserves an existing completedAt instead of overwriting it', () => {
    const movie: Movie = { ...BASE_MOVIE, watched: true, completedAt: '2019-05-05T00:00:00.000Z' };
    const form = fromMovie(movie);

    const result = buildMoviePayload(form, movie);
    expect(result.remove).toBe(false);
    if (!result.remove) expect(result.updates.completedAt).toBe('2019-05-05T00:00:00.000Z');
  });

  it('leaves an already-watched title undated rather than stamping today', () => {
    // Ticking Watchlist on a title finished long ago (an import with no date)
    // must not put a mark on today's square in the streak calendar.
    const movie: Movie = { ...BASE_MOVIE, watched: true, completedAt: null, timesWatched: 1 };
    const form = fromMovie(movie);
    form.status = { inWatchlist: true, inProgress: false, watched: true, timesWatched: 1 };

    const result = buildMoviePayload(form, movie);
    expect(result.remove).toBe(false);
    if (!result.remove) {
      expect(result.updates.completedAt).toBeNull();
      expect(result.updates.inWatchlist).toBe(true);
    }
  });

  it('builds tv ratings as { overall, seasons } instead of the movie category shape', () => {
    const tvMovie: Movie = { ...BASE_MOVIE, type: 'tv' };
    const form = fromMovie(tvMovie);
    form.status = { inWatchlist: false, inProgress: false, watched: true, timesWatched: 1 };
    form.overallRating = 4.5;
    form.seasonRatings = { 1: { overall: 4, story: 4, acting: 5, ending: 4, enjoyment: 4 } };

    const result = buildMoviePayload(form, tvMovie);
    expect(result.remove).toBe(false);
    if (!result.remove) {
      expect(result.updates.ratings).toEqual({ overall: 4.5, seasons: form.seasonRatings });
    }
  });

  it('defaults timesWatched to 1 when marking watched without an explicit count', () => {
    const form: EditForm = { ...fromMovie(BASE_MOVIE), status: { inWatchlist: false, inProgress: false, watched: true, timesWatched: 0 } };
    const result = buildMoviePayload(form, BASE_MOVIE);
    expect(result.remove).toBe(false);
    if (!result.remove) expect(result.updates.timesWatched).toBe(1);
  });

  it('saves a fully ticked series as watched once, even with the status untouched', () => {
    const show: Movie = { ...BASE_MOVIE, type: 'tv', numberOfEpisodes: 3 };
    const form = fromMovie(show);
    form.episodesWatched = { s1e1: true, s1e2: true, s1e3: true };

    const result = buildMoviePayload(form, show);
    expect(result.remove).toBe(false);
    if (!result.remove) {
      expect(result.updates.watched).toBe(true);
      expect(result.updates.timesWatched).toBe(1);
      expect(result.updates.status).toBe('Completed');
      expect(result.updates.inWatchlist).toBe(false);
      expect(result.updates.completedAt).toBeTruthy();
    }
  });

  it('leaves a part-watched series alone', () => {
    const show: Movie = { ...BASE_MOVIE, type: 'tv', numberOfEpisodes: 3 };
    const form = fromMovie(show);
    form.episodesWatched = { s1e1: true };

    const result = buildMoviePayload(form, show);
    expect(result.remove).toBe(false);
    if (!result.remove) {
      expect(result.updates.watched).toBe(false);
      expect(result.updates.timesWatched).toBe(0);
    }
  });

  it('keeps a rewatch count on a finished series rather than flattening it to one', () => {
    const show: Movie = { ...BASE_MOVIE, type: 'tv', numberOfEpisodes: 2, watched: true, timesWatched: 3 };
    const form = fromMovie(show);
    form.episodesWatched = { s1e1: true, s1e2: true };

    const result = buildMoviePayload(form, show);
    expect(result.remove).toBe(false);
    if (!result.remove) expect(result.updates.timesWatched).toBe(3);
  });

  it('upgrades legacy flat-number season ratings to the object format', () => {
    const movie: Movie = { ...BASE_MOVIE, type: 'tv', ratings: { seasons: { '1': 3.5 } as never } };
    const form = fromMovie(movie);
    expect(form.seasonRatings[1]).toEqual({ overall: 3.5, story: 0, acting: 0, ending: 0, enjoyment: 0 });
  });
});

describe('recalcOverall', () => {
  it('averages only the populated categories', () => {
    expect(recalcOverall({ story: 5, acting: 4, ending: 0, enjoyment: 0 })).toBe(4.5);
  });

  it('returns null when nothing is rated', () => {
    expect(recalcOverall({ story: 0, acting: 0, ending: 0, enjoyment: 0 })).toBeNull();
  });
});

describe('recalcSeasonsAverage', () => {
  it('averages season overalls, ignoring unrated seasons', () => {
    expect(
      recalcSeasonsAverage({
        1: { overall: 4, story: 0, acting: 0, ending: 0, enjoyment: 0 },
        2: { overall: 5, story: 0, acting: 0, ending: 0, enjoyment: 0 },
        3: { overall: 0, story: 0, acting: 0, ending: 0, enjoyment: 0 },
      }),
    ).toBe(4.5);
  });
});
