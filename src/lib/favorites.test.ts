import {
  MAX_FAVORITES,
  favoriteKey,
  isFavorite,
  moveFavorite,
  movieToFavorite,
  normalizeFavorites,
  sortByRatingDesc,
  toFavoritesPayload,
  toggleFavorite,
} from './favorites';
import type { FavoriteItem, Movie } from '@/types/movie';

const fav = (tmdbId: number, type: 'movie' | 'tv' = 'movie'): FavoriteItem => ({
  tmdbId,
  type,
  title: `Title ${tmdbId}`,
  coverUrl: `https://img/${tmdbId}.jpg`,
});

describe('favoriteKey', () => {
  it('separates a movie and a show sharing a tmdb id', () => {
    expect(favoriteKey({ tmdbId: 1, type: 'movie' })).not.toBe(favoriteKey({ tmdbId: 1, type: 'tv' }));
  });
});

describe('movieToFavorite', () => {
  const movie = { tmdbId: 603, type: 'movie', title: 'The Matrix', coverUrl: 'https://img/603.jpg' } as Movie;

  it('snapshots the fields the poster and the route need', () => {
    expect(movieToFavorite(movie)).toEqual({
      tmdbId: 603,
      type: 'movie',
      title: 'The Matrix',
      coverUrl: 'https://img/603.jpg',
    });
  });

  it('refuses manual entries, which have no detail page', () => {
    expect(movieToFavorite({ ...movie, tmdbId: null } as Movie)).toBeNull();
  });
});

describe('normalizeFavorites', () => {
  it('returns an empty list for anything that is not an array', () => {
    expect(normalizeFavorites(null)).toEqual([]);
    expect(normalizeFavorites(undefined)).toEqual([]);
    expect(normalizeFavorites({ tmdbId: 1 })).toEqual([]);
  });

  it('drops entries missing a usable tmdb id or media type', () => {
    const raw = [fav(1), { tmdbId: '2', type: 'movie' }, { tmdbId: 3, type: 'book' }, { type: 'tv' }, null];
    expect(normalizeFavorites(raw).map((f) => f.tmdbId)).toEqual([1]);
  });

  it('coerces a missing title and empty cover to safe defaults', () => {
    expect(normalizeFavorites([{ tmdbId: 7, type: 'tv' }])).toEqual([
      { tmdbId: 7, type: 'tv', title: '', coverUrl: null },
    ]);
    expect(normalizeFavorites([{ tmdbId: 7, type: 'tv', title: 'X', coverUrl: '' }])[0].coverUrl).toBeNull();
  });

  it('dedupes by type+id and keeps the first occurrence', () => {
    const raw = [fav(1), { ...fav(1), title: 'Later' }, fav(1, 'tv')];
    expect(normalizeFavorites(raw)).toHaveLength(2);
    expect(normalizeFavorites(raw)[0].title).toBe('Title 1');
  });

  it('caps at the max even if the row holds more', () => {
    expect(normalizeFavorites([fav(1), fav(2), fav(3), fav(4), fav(5)])).toHaveLength(MAX_FAVORITES);
  });
});

describe('toggleFavorite', () => {
  it('appends so the newest pick lands in the last slot', () => {
    expect(toggleFavorite([fav(1)], fav(2)).map((f) => f.tmdbId)).toEqual([1, 2]);
  });

  it('removes a pick already in the list and closes the gap', () => {
    expect(toggleFavorite([fav(1), fav(2), fav(3)], fav(2)).map((f) => f.tmdbId)).toEqual([1, 3]);
  });

  it('returns the same list unchanged when full', () => {
    const full = [fav(1), fav(2), fav(3), fav(4)];
    expect(toggleFavorite(full, fav(5))).toBe(full);
  });

  it('still removes when full, so a swap is two taps', () => {
    const full = [fav(1), fav(2), fav(3), fav(4)];
    expect(toggleFavorite(full, fav(3)).map((f) => f.tmdbId)).toEqual([1, 2, 4]);
  });
});

describe('isFavorite', () => {
  it('matches on type as well as id', () => {
    expect(isFavorite([fav(1, 'movie')], { tmdbId: 1, type: 'movie' })).toBe(true);
    expect(isFavorite([fav(1, 'movie')], { tmdbId: 1, type: 'tv' })).toBe(false);
  });
});

describe('moveFavorite', () => {
  it('moves a pick to the target slot', () => {
    expect(moveFavorite([fav(1), fav(2), fav(3)], 2, 0).map((f) => f.tmdbId)).toEqual([3, 1, 2]);
  });

  it('is a no-op for out-of-range or identical indices', () => {
    const list = [fav(1), fav(2)];
    expect(moveFavorite(list, 0, 0)).toBe(list);
    expect(moveFavorite(list, -1, 1)).toBe(list);
    expect(moveFavorite(list, 0, 5)).toBe(list);
  });
});

describe('sortByRatingDesc', () => {
  const movie = (title: string, overall?: number, voteAverage = 0) =>
    ({ title, ratings: overall == null ? {} : { overall }, voteAverage }) as Movie;

  it('puts your highest-rated title first', () => {
    const sorted = sortByRatingDesc([movie('Low', 3), movie('High', 9), movie('Mid', 6)]);
    expect(sorted.map((m) => m.title)).toEqual(['High', 'Mid', 'Low']);
  });

  it('sorts unrated titles below anything you rated', () => {
    const sorted = sortByRatingDesc([movie('Unrated'), movie('Rated', 1)]);
    expect(sorted.map((m) => m.title)).toEqual(['Rated', 'Unrated']);
  });

  it('falls back to the TMDB score only among equally-rated titles', () => {
    const sorted = sortByRatingDesc([movie('Popular', undefined, 8), movie('Obscure', undefined, 4)]);
    expect(sorted.map((m) => m.title)).toEqual(['Popular', 'Obscure']);
  });

  it('breaks remaining ties on title so the order is stable', () => {
    const sorted = sortByRatingDesc([movie('Beta', 5, 7), movie('Alpha', 5, 7)]);
    expect(sorted.map((m) => m.title)).toEqual(['Alpha', 'Beta']);
  });

  it('does not mutate the input', () => {
    const input = [movie('Low', 1), movie('High', 9)];
    sortByRatingDesc(input);
    expect(input.map((m) => m.title)).toEqual(['Low', 'High']);
  });
});

describe('toFavoritesPayload', () => {
  it('writes only the four snapshot fields', () => {
    const extra = { ...fav(1), watched: true } as FavoriteItem & { watched: boolean };
    expect(Object.keys(toFavoritesPayload([extra])[0]).sort()).toEqual(['coverUrl', 'title', 'tmdbId', 'type']);
  });

  it('enforces the cap on write as well as on read', () => {
    expect(toFavoritesPayload([fav(1), fav(2), fav(3), fav(4), fav(5)])).toHaveLength(MAX_FAVORITES);
  });
});
