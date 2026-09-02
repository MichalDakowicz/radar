import {
  absorbUndatedWatches,
  buildMoviePayload,
  fromMovie,
  recalcOverall,
  recalcSeasonsAverage,
  type EditForm,
} from './editForm';
import type { Movie } from '@/types/movie';

const ISO = '2026-08-01T20:00:00.000Z';
const LATER = '2026-08-13T21:00:00.000Z';

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
    form.status = { inWatchlist: false, inProgress: false, watched: false, timesWatched: 0, undatedWatches: 0 };

    expect(buildMoviePayload(form, BASE_MOVIE)).toEqual({ remove: true });
  });

  it('never removes a TV show even with no status set', () => {
    const tvMovie: Movie = { ...BASE_MOVIE, type: 'tv' };
    const form = fromMovie(tvMovie);
    form.status = { inWatchlist: false, inProgress: false, watched: false, timesWatched: 0, undatedWatches: 0 };

    const result = buildMoviePayload(form, tvMovie);
    expect(result.remove).toBe(false);
  });

  it('sets completedAt when marked watched and clears it when unwatched', () => {
    const form = fromMovie(BASE_MOVIE);
    form.status = { inWatchlist: false, inProgress: false, watched: true, timesWatched: 1, undatedWatches: 0 };

    const watched = buildMoviePayload(form, BASE_MOVIE);
    expect(watched.remove).toBe(false);
    if (!watched.remove) {
      expect(watched.updates.watched).toBe(true);
      expect(watched.updates.completedAt).toBeTruthy();
      expect(watched.updates.status).toBe('Completed');
    }

    form.status = { inWatchlist: true, inProgress: false, watched: false, timesWatched: 0, undatedWatches: 0 };
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
    form.status = { inWatchlist: true, inProgress: false, watched: true, timesWatched: 1, undatedWatches: 0 };

    const result = buildMoviePayload(form, movie);
    expect(result.remove).toBe(false);
    if (!result.remove) {
      expect(result.updates.completedAt).toBeNull();
      expect(result.updates.inWatchlist).toBe(true);
    }
  });

  // Raising the watch count is "I watched it again", and again happened today -
  // the whole reason the count exists is that the streak and the calendar see it.
  it('dates a rewatch that raises the count', () => {
    const movie: Movie = { ...BASE_MOVIE, watched: true, timesWatched: 1, completedAt: '2019-05-05T00:00:00.000Z' };
    const form = fromMovie(movie);
    form.status = { ...form.status, timesWatched: 2 };

    const result = buildMoviePayload(form, movie);
    expect(result.remove).toBe(false);
    if (!result.remove) {
      expect(result.updates.timesWatched).toBe(2);
      expect(Date.parse(result.updates.completedAt!)).toBeGreaterThan(Date.parse('2019-05-05T00:00:00.000Z'));
    }
  });

  it('leaves an added watch undated when it was added as an undated one', () => {
    const movie: Movie = { ...BASE_MOVIE, watched: true, timesWatched: 1, completedAt: '2019-05-05T00:00:00.000Z' };
    const form = fromMovie(movie);
    form.status = { ...form.status, timesWatched: 2, undatedWatches: 1 };

    const result = buildMoviePayload(form, movie);
    expect(result.remove).toBe(false);
    if (!result.remove) {
      expect(result.updates.timesWatched).toBe(2);
      expect(result.updates.completedAt).toBe('2019-05-05T00:00:00.000Z');
    }
  });

  it('builds tv ratings as { overall, seasons } instead of the movie category shape', () => {
    const tvMovie: Movie = { ...BASE_MOVIE, type: 'tv' };
    const form = fromMovie(tvMovie);
    form.status = { inWatchlist: false, inProgress: false, watched: true, timesWatched: 1, undatedWatches: 0 };
    form.overallRating = 4.5;
    form.seasonRatings = { 1: { overall: 4, story: 4, acting: 5, ending: 4, enjoyment: 4 } };

    const result = buildMoviePayload(form, tvMovie);
    expect(result.remove).toBe(false);
    if (!result.remove) {
      expect(result.updates.ratings).toEqual({ overall: 4.5, seasons: form.seasonRatings });
    }
  });

  it('defaults timesWatched to 1 when marking watched without an explicit count', () => {
    const form: EditForm = { ...fromMovie(BASE_MOVIE), status: { inWatchlist: false, inProgress: false, watched: true, timesWatched: 0, undatedWatches: 0 } };
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

  // timesWatched is the total: the dated passes the episode log proves, plus the
  // watches the user only remembers. A series' dated half is never typed in.
  it('reads a series dated passes off the log and adds the undated ones', () => {
    const show: Movie = { ...BASE_MOVIE, type: 'tv', numberOfEpisodes: 2, watched: true, timesWatched: 1 };
    const form = fromMovie(show);
    form.episodeWatchDates = { s1e1: [ISO], s1e2: [ISO] };
    form.episodesWatched = { s1e1: true, s1e2: true };
    form.status = { ...form.status, undatedWatches: 0 };

    const dated = buildMoviePayload(form, show);
    expect(dated.remove).toBe(false);
    if (!dated.remove) expect(dated.updates.timesWatched).toBe(1);

    // "I had also seen it twice before I started logging" - two more watches, and
    // not a single new date anywhere.
    const withPrior = buildMoviePayload({ ...form, status: { ...form.status, undatedWatches: 2 } }, show);
    expect(withPrior.remove).toBe(false);
    if (!withPrior.remove) expect(withPrior.updates.timesWatched).toBe(3);
  });

  it('reads a whole-series rewatch off the log', () => {
    const show: Movie = { ...BASE_MOVIE, type: 'tv', numberOfEpisodes: 2, watched: true, timesWatched: 1 };
    const form = fromMovie(show);
    form.episodeWatchDates = { s1e1: [ISO, LATER], s1e2: [ISO, LATER] };
    form.episodesWatched = { s1e1: true, s1e2: true };
    // The stored row had no log, so fromMovie read its single watch as undated;
    // dating both passes is what absorbUndatedWatches settles in the hook.
    form.status = { ...form.status, undatedWatches: 0 };

    const result = buildMoviePayload(form, show);
    expect(result.remove).toBe(false);
    if (!result.remove) expect(result.updates.timesWatched).toBe(2);
  });

  // The case that started this: a show finished five times before episodes were
  // ever tracked. There is no log and no date, so all five are undated - and the
  // count has to survive the save rather than collapsing to one.
  it('carries an untracked shows legacy count through as undated watches', () => {
    const show: Movie = { ...BASE_MOVIE, type: 'tv', numberOfEpisodes: 10, watched: true, timesWatched: 5, completedAt: null };
    const form = fromMovie(show);
    expect(form.status.undatedWatches).toBe(5);

    const result = buildMoviePayload(form, show);
    expect(result.remove).toBe(false);
    if (!result.remove) {
      expect(result.updates.timesWatched).toBe(5);
      // Above all: no date invented, so no streak day appears out of nowhere.
      expect(result.updates.completedAt).toBeNull();
    }
  });

  it('logs a films earlier watch without dating it', () => {
    const unseen: Movie = { ...BASE_MOVIE, watched: false, timesWatched: 0, completedAt: null };
    const form = fromMovie(unseen);
    form.status = { inWatchlist: false, inProgress: false, watched: true, timesWatched: 1, undatedWatches: 1 };

    const result = buildMoviePayload(form, unseen);
    expect(result.remove).toBe(false);
    if (!result.remove) {
      expect(result.updates.watched).toBe(true);
      expect(result.updates.timesWatched).toBe(1);
      expect(result.updates.completedAt).toBeNull();
    }
  });

  it('still stamps today for a film finished now, undated watches or not', () => {
    const unseen: Movie = { ...BASE_MOVIE, watched: false, timesWatched: 0, completedAt: null };
    const form = fromMovie(unseen);
    form.status = { inWatchlist: false, inProgress: false, watched: true, timesWatched: 1, undatedWatches: 0 };

    const result = buildMoviePayload(form, unseen);
    expect(result.remove).toBe(false);
    if (!result.remove) expect(result.updates.completedAt).toBeTruthy();
  });

  // Watched tonight, and then you remember seeing it years ago: one dated watch
  // plus one undated, two in total, one mark on the calendar.
  it('keeps a films date while adding an earlier watch beside it', () => {
    const seen: Movie = { ...BASE_MOVIE, watched: true, timesWatched: 1, completedAt: '2026-08-13T20:00:00.000Z' };
    const form = fromMovie(seen);
    expect(form.status.undatedWatches).toBe(0);

    const result = buildMoviePayload({ ...form, status: { ...form.status, undatedWatches: 1, timesWatched: 2 } }, seen);
    expect(result.remove).toBe(false);
    if (!result.remove) {
      expect(result.updates.timesWatched).toBe(2);
      expect(result.updates.completedAt).toBe('2026-08-13T20:00:00.000Z');
    }
  });

  it('writes the episode mirror alongside the log', () => {
    const show: Movie = { ...BASE_MOVIE, type: 'tv', numberOfEpisodes: 3 };
    const form = fromMovie(show);
    form.episodeWatchDates = { s1e1: [ISO] };

    const result = buildMoviePayload(form, show);
    expect(result.remove).toBe(false);
    if (!result.remove) expect(result.updates.episodesWatched).toEqual({ s1e1: true });
  });

  // Walking a legacy "watched once" show through the tracker documents that watch
  // rather than adding a second one.
  it('lets a newly dated pass absorb an undated watch', () => {
    expect(absorbUndatedWatches(1, 0, 1)).toBe(0);
    expect(absorbUndatedWatches(5, 0, 1)).toBe(4);
    expect(absorbUndatedWatches(5, 1, 3)).toBe(3);
  });

  it('never takes the undated count below zero, or raises it', () => {
    expect(absorbUndatedWatches(0, 0, 2)).toBe(0);
    expect(absorbUndatedWatches(2, 3, 1)).toBe(2); // dated passes removed, not gained
    expect(absorbUndatedWatches(2, 1, 1)).toBe(2);
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
