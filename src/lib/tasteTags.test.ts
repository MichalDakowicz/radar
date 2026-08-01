import { sharedTasteTags } from './tasteTags';
import type { Movie } from '@/types/movie';

const movie = (title: string, genres: string[], directors: string[], watched = true): Movie =>
  ({
    id: title,
    title,
    type: 'movie',
    watched,
    inWatchlist: false,
    inProgress: false,
    genres: genres.map((name) => ({ name })),
    director: directors.map((name) => ({ name })),
  }) as Movie;

const many = (n: number, prefix: string, genres: string[], directors: string[], watched = true) =>
  Array.from({ length: n }, (_, i) => movie(`${prefix}${i}`, genres, directors, watched));

describe('sharedTasteTags', () => {
  it('returns tags you have both watched enough of', () => {
    const tags = sharedTasteTags(many(3, 'a', ['Sci-Fi'], ['Denis Villeneuve']), many(2, 'b', ['Sci-Fi'], ['Denis Villeneuve']));
    expect(tags.map((t) => t.label).sort()).toEqual(['Denis Villeneuve', 'Sci-Fi']);
  });

  it('scores a tag by the weaker side, not the total', () => {
    const [tag] = sharedTasteTags(many(20, 'a', ['Horror'], []), many(2, 'b', ['Horror'], []));
    expect(tag.shared).toBe(2);
  });

  it('drops a tag that is only one person’s taste', () => {
    expect(sharedTasteTags(many(9, 'a', ['Horror'], []), many(1, 'b', ['Horror'], []))).toEqual([]);
  });

  it('ignores titles neither of you has watched', () => {
    const yours = many(4, 'a', ['Drama'], [], false);
    const theirs = many(4, 'b', ['Drama'], [], false);
    expect(sharedTasteTags(yours, theirs)).toEqual([]);
  });

  it('credits every director on a co-directed title', () => {
    const yours = many(2, 'a', [], ['Joel Coen', 'Ethan Coen']);
    const theirs = many(2, 'b', [], ['Joel Coen', 'Ethan Coen']);
    expect(sharedTasteTags(yours, theirs).map((t) => t.label).sort()).toEqual(['Ethan Coen', 'Joel Coen']);
  });

  it('ranks by overlap and caps the list', () => {
    const yours = [...many(5, 'a', ['Sci-Fi'], []), ...many(2, 'b', ['Horror'], [])];
    const theirs = [...many(5, 'c', ['Sci-Fi'], []), ...many(2, 'd', ['Horror'], [])];
    const tags = sharedTasteTags(yours, theirs, 1);
    expect(tags).toHaveLength(1);
    expect(tags[0].label).toBe('Sci-Fi');
  });

  it('tags each result with what it is', () => {
    const tags = sharedTasteTags(many(2, 'a', ['Drama'], ['Celine Song']), many(2, 'b', ['Drama'], ['Celine Song']));
    expect(tags.find((t) => t.label === 'Drama')?.kind).toBe('genre');
    expect(tags.find((t) => t.label === 'Celine Song')?.kind).toBe('director');
  });
});
