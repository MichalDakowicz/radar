import { duplicateRowCount, findDuplicates } from '@/lib/duplicates';
import type { Movie } from '@/types/movie';

function movie(partial: Partial<Movie> & { id: string }): Movie {
  return {
    userId: 'u1',
    tmdbId: 100,
    imdbId: null,
    type: 'movie',
    title: 'Parasite',
    director: [],
    cast: [],
    genres: [],
    releaseDate: '2019-05-30',
    coverUrl: null,
    overview: '',
    runtime: 0,
    voteAverage: 0,
    voteCount: 0,
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
    addedAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    episodesWatched: {},
    episodeWatchDates: {},
    seasonEpisodeCounts: {},
    ...partial,
  } as Movie;
}

describe('findDuplicates', () => {
  it('finds nothing in a clean library', () => {
    const groups = findDuplicates([movie({ id: 'a' }), movie({ id: 'b', tmdbId: 200 })]);
    expect(groups).toEqual([]);
    expect(duplicateRowCount(groups)).toBe(0);
  });

  it('never groups a remake with its original', () => {
    // Same title, different TMDB id - The Hitcher 1986 and 2007.
    expect(findDuplicates([movie({ id: 'a', tmdbId: 9542 }), movie({ id: 'b', tmdbId: 8398 })])).toEqual([]);
  });

  it('never groups a show with a movie of the same id', () => {
    expect(findDuplicates([movie({ id: 'a' }), movie({ id: 'b', type: 'tv' })])).toEqual([]);
  });

  it('leaves manually added rows alone', () => {
    expect(findDuplicates([movie({ id: 'a', tmdbId: null }), movie({ id: 'b', tmdbId: null })])).toEqual([]);
  });

  it('keeps the row carrying the watch history', () => {
    const groups = findDuplicates([
      movie({ id: 'empty' }),
      movie({ id: 'rich', watched: true, timesWatched: 2, ratings: { overall: 4.5 } }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].keep.id).toBe('rich');
    expect(groups[0].remove.map((m) => m.id)).toEqual(['empty']);
    expect(duplicateRowCount(groups)).toBe(1);
  });

  it('lifts the watch data off the row it deletes', () => {
    const groups = findDuplicates([
      movie({ id: 'rated', ratings: { overall: 4 }, notes: 'great' }),
      movie({
        id: 'watched',
        watched: true,
        status: 'Completed',
        inWatchlist: false,
        timesWatched: 3,
        completedAt: '2024-06-01T00:00:00.000Z',
      }),
    ]);

    expect(groups[0].keep.id).toBe('watched');
    expect(groups[0].patch).toMatchObject({ ratings: { overall: 4 }, notes: 'great' });
  });

  it('marks the survivor watched and keeps the earliest completion date', () => {
    const groups = findDuplicates([
      movie({ id: 'first', ratings: { overall: 5 }, notes: 'n' }),
      movie({ id: 'second', watched: true, timesWatched: 1, completedAt: '2024-02-02T00:00:00.000Z' }),
      movie({ id: 'third', watched: true, timesWatched: 1, completedAt: '2023-01-01T00:00:00.000Z' }),
    ]);

    const { keep, patch } = groups[0];
    // The patch only carries what changes, so read it through the keeper.
    expect(patch.timesWatched ?? keep.timesWatched).toBe(1);
    expect(patch.completedAt).toBe('2023-01-01T00:00:00.000Z');
  });

  it('unions the episode watch logs on each copy of a show', () => {
    const groups = findDuplicates([
      movie({
        id: 'a',
        type: 'tv',
        inProgress: true,
        episodesWatched: { s1e1: true, s1e2: true },
        episodeWatchDates: { s1e1: ['2024-03-01T00:00:00.000Z'], s1e2: ['2024-03-02T00:00:00.000Z'] },
      }),
      movie({
        id: 'b',
        type: 'tv',
        episodesWatched: { s1e3: true },
        episodeWatchDates: { s1e1: ['2024-01-01T00:00:00.000Z'], s1e3: ['2024-04-01T00:00:00.000Z'] },
      }),
    ]);

    expect(groups[0].keep.id).toBe('a');
    expect(groups[0].patch.episodesWatched).toEqual({ s1e1: true, s1e2: true, s1e3: true });
    // Both dates survive: the same episode logged on two rows on two days is two
    // real watches, and the duplicate is exactly how they got split up.
    expect(groups[0].patch.episodeWatchDates).toEqual({
      s1e1: ['2024-01-01T00:00:00.000Z', '2024-03-01T00:00:00.000Z'],
      s1e2: ['2024-03-02T00:00:00.000Z'],
      s1e3: ['2024-04-01T00:00:00.000Z'],
    });
  });

  it('keeps a legacy tick that never carried a date', () => {
    const groups = findDuplicates([
      movie({ id: 'a', type: 'tv', inProgress: true, episodesWatched: { s1e1: true }, episodeWatchDates: {} }),
      movie({ id: 'b', type: 'tv', episodesWatched: { s1e2: true }, episodeWatchDates: {} }),
    ]);
    expect(groups[0].patch.episodesWatched).toEqual({ s1e1: true, s1e2: true });
  });

  it('patches nothing when the copies are identical', () => {
    const groups = findDuplicates([movie({ id: 'a' }), movie({ id: 'b' })]);
    expect(groups[0].patch).toEqual({});
  });
});
