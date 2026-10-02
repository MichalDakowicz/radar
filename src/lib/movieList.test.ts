import { removeMovieById, upsertMovie } from './movieList';
import type { Movie } from '@/types/movie';

const movie = (id: string, addedAt: string, title = id): Movie => ({ id, addedAt, title }) as Movie;

describe('upsertMovie', () => {
  const list = [movie('c', '2026-03-01'), movie('b', '2026-02-01'), movie('a', '2026-01-01')];

  it('replaces an existing row in place without reordering', () => {
    const next = upsertMovie(list, movie('b', '2026-02-01', 'renamed'));
    expect(next.map((m) => m.id)).toEqual(['c', 'b', 'a']);
    expect(next[1].title).toBe('renamed');
  });

  it('does not mutate the list it was given', () => {
    upsertMovie(list, movie('b', '2026-02-01', 'renamed'));
    expect(list[1].title).toBe('b');
  });

  it('puts a new row where its added_at belongs', () => {
    expect(upsertMovie(list, movie('d', '2026-04-01')).map((m) => m.id)).toEqual(['d', 'c', 'b', 'a']);
    expect(upsertMovie(list, movie('x', '2026-02-15')).map((m) => m.id)).toEqual(['c', 'x', 'b', 'a']);
    expect(upsertMovie(list, movie('z', '2025-12-01')).map((m) => m.id)).toEqual(['c', 'b', 'a', 'z']);
  });

  it('seeds an empty list', () => {
    expect(upsertMovie([], movie('a', '2026-01-01')).map((m) => m.id)).toEqual(['a']);
  });
});

describe('removeMovieById', () => {
  const list = [movie('b', '2026-02-01'), movie('a', '2026-01-01')];

  it('drops the row', () => {
    expect(removeMovieById(list, 'b').map((m) => m.id)).toEqual(['a']);
  });

  it('returns the same array when nothing matched', () => {
    expect(removeMovieById(list, 'nope')).toBe(list);
  });
});
