import { applyMovieUpdate } from './movieUpdate';
import { normalizeMovie, type MovieRow } from './normalizeMovie';

const row = (over: Partial<MovieRow> = {}): MovieRow => ({
  id: 'm1',
  user_id: 'u1',
  tmdb_id: 603,
  imdb_id: null,
  type: 'movie',
  title: 'The Matrix',
  release_date: '1999-03-31',
  cover_url: null,
  overview: 'A hacker learns the truth.',
  runtime: 136,
  vote_average: 8.2,
  vote_count: 1000,
  in_watchlist: true,
  in_progress: false,
  watched: false,
  times_watched: 0,
  status: 'Watchlist',
  completed_at: null,
  last_watched_position: null,
  notes: null,
  url: null,
  availability: ['Netflix'],
  director: [{ id: 1, name: 'Lana Wachowski' }],
  cast_members: null,
  genres: [{ id: 28, name: 'Action' }],
  production_companies: null,
  ratings: { overall: 4 },
  number_of_seasons: null,
  number_of_episodes: null,
  episodes_watched: null,
  episode_watch_dates: null,
  watch_dates: null,
  season_episode_counts: null,
  tmdb_status: null,
  tagline: null,
  budget: null,
  revenue: null,
  added_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-02T10:00:00.000Z',
  ...over,
});

describe('applyMovieUpdate', () => {
  it('is the identity for an empty update', () => {
    const movie = normalizeMovie(row());
    expect(applyMovieUpdate(movie, {})).toEqual(movie);
  });

  it('round-trips a watched film with a watch log', () => {
    const movie = normalizeMovie(
      row({
        in_watchlist: false,
        watched: true,
        times_watched: 2,
        status: 'Completed',
        completed_at: '2026-02-01T12:00:00.000Z',
        watch_dates: ['2026-01-10T12:00:00.000Z', '2026-02-01T12:00:00.000Z'],
      }),
    );
    expect(applyMovieUpdate(movie, {})).toEqual(movie);
  });

  it('applies the fields it is given and leaves the rest', () => {
    const movie = normalizeMovie(row());
    const next = applyMovieUpdate(movie, { notes: 'rewatch with Sam', ratings: { overall: 5 } });
    expect(next.notes).toBe('rewatch with Sam');
    expect(next.ratings.overall).toBe(5);
    expect(next.title).toBe('The Matrix');
    expect(next.id).toBe('m1');
    expect(next.addedAt).toBe(movie.addedAt);
  });

  it('re-derives the status flags the way a read does', () => {
    const movie = normalizeMovie(row());
    // A row cannot be in progress and on the watchlist at once; the read boundary
    // settles that, and so must the preview of it.
    const next = applyMovieUpdate(movie, { inProgress: true, inWatchlist: true });
    expect(next.inProgress).toBe(true);
    expect(next.inWatchlist).toBe(false);
  });

  it('ignores undefined fields rather than blanking them', () => {
    const movie = normalizeMovie(row());
    const next = applyMovieUpdate(movie, { notes: undefined, title: undefined });
    expect(next.title).toBe('The Matrix');
  });

  it('does not mutate the title it was given', () => {
    const movie = normalizeMovie(row());
    applyMovieUpdate(movie, { notes: 'x' });
    expect(movie.notes).toBe('');
  });
});
