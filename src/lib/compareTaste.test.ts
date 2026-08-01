import { compareHeadline, compareSubtitle, compareTaste, titleKey, type RatedTitle } from './compareTaste';

const rated = (title: string, score: number, tmdbId: number | null = null): RatedTitle => ({
  key: titleKey(tmdbId, 'movie', title),
  title,
  coverUrl: `https://img/${title}`,
  tmdbId,
  type: 'movie',
  score,
});

describe('titleKey', () => {
  it('keys on the TMDB id when there is one', () => {
    expect(titleKey(693134, 'movie', 'Dune: Part Two')).toBe('movie:693134');
  });

  it('separates the same id across media types', () => {
    expect(titleKey(1, 'movie', 'X')).not.toBe(titleKey(1, 'tv', 'X'));
  });

  it('falls back to a normalised title for manual entries', () => {
    expect(titleKey(null, 'movie', '  Dune  ')).toBe(titleKey(null, 'movie', 'dune'));
  });
});

describe('compareTaste', () => {
  it('splits shared titles by how far apart the scores are', () => {
    const result = compareTaste(
      [rated('Dune', 5, 1), rated('Past Lives', 5, 2), rated('The Substance', 2, 3)],
      [rated('Dune', 4.5, 1), rated('Past Lives', 3, 2), rated('The Substance', 4.5, 3)],
    );

    expect(result.sharedCount).toBe(3);
    expect(result.closeCount).toBe(1);
    expect(result.overlapPct).toBe(33);
    expect(result.agree.map((r) => r.title)).toEqual(['Dune']);
    expect(result.split.map((r) => r.title)).toEqual(['The Substance', 'Past Lives']);
  });

  it('leaves a middling gap out of both lists', () => {
    // 1.0 apart: past "close", short of "split".
    const result = compareTaste([rated('Flow', 4, 1)], [rated('Flow', 3, 1)]);
    expect(result.sharedCount).toBe(1);
    expect(result.agree).toHaveLength(0);
    expect(result.split).toHaveLength(0);
  });

  it('surfaces only their highly rated titles you have not rated', () => {
    const result = compareTaste(
      [rated('Dune', 5, 1)],
      [rated('Dune', 5, 1), rated('Aftersun', 4.5, 2), rated('Poor Things', 2, 3)],
    );
    expect(result.gaps.map((g) => g.title)).toEqual(['Aftersun']);
    expect(result.gaps[0].theirs).toBe(4.5);
  });

  it('orders agreement by the shared enthusiasm and splits by the gap', () => {
    const result = compareTaste(
      [rated('Low', 2, 1), rated('High', 5, 2), rated('Wide', 5, 3), rated('Wider', 5, 4)],
      [rated('Low', 2, 1), rated('High', 5, 2), rated('Wide', 3.5, 3), rated('Wider', 1, 4)],
    );
    expect(result.agree.map((r) => r.title)).toEqual(['High', 'Low']);
    expect(result.split.map((r) => r.title)).toEqual(['Wider', 'Wide']);
  });

  it('caps every list', () => {
    const theirs = Array.from({ length: 9 }, (_, i) => rated(`T${i}`, 5, i));
    const result = compareTaste([], theirs, 4);
    expect(result.gaps).toHaveLength(4);
  });

  it('reports zero overlap rather than dividing by nothing', () => {
    const result = compareTaste([rated('Dune', 5, 1)], [rated('Flow', 5, 2)]);
    expect(result.sharedCount).toBe(0);
    expect(result.overlapPct).toBe(0);
  });

  it('takes a cover from whichever side has one', () => {
    const theirs: RatedTitle = { ...rated('Dune', 4, 1), coverUrl: null };
    const result = compareTaste([rated('Dune', 4, 1)], [theirs]);
    expect(result.agree[0].coverUrl).toBe('https://img/Dune');
  });
});

describe('compareHeadline', () => {
  const at = (overlapPct: number, sharedCount = 10) =>
    ({ overlapPct, sharedCount, closeCount: 0, agree: [], split: [], gaps: [] });

  it('commits above the threshold and hedges below it', () => {
    expect(compareHeadline('Anna', at(71))).toBe('You and Anna mostly agree');
    expect(compareHeadline('Anna', at(48))).toBe('You and Anna are a coin flip');
  });

  it('says so when there is no overlap at all', () => {
    expect(compareHeadline('Anna', at(0, 0))).toBe('You and Anna have not rated the same title yet');
  });
});

describe('compareSubtitle', () => {
  it('counts the close calls', () => {
    expect(compareSubtitle({ overlapPct: 50, sharedCount: 8, closeCount: 4, agree: [], split: [], gaps: [] })).toBe(
      '4 of 8 shared titles land within half a star.',
    );
  });

  it('singularises one shared title, verb included', () => {
    expect(compareSubtitle({ overlapPct: 100, sharedCount: 1, closeCount: 1, agree: [], split: [], gaps: [] })).toBe(
      '1 of 1 shared title lands within half a star.',
    );
  });

  it('prompts when nothing is shared', () => {
    expect(compareSubtitle({ overlapPct: 0, sharedCount: 0, closeCount: 0, agree: [], split: [], gaps: [] })).toMatch(
      /Rate a title/,
    );
  });
});
