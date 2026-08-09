import { faces, heatmapWeeks, initials, ordinalWord, plinthHeight, podium, rank, ratioOf, typeWall } from '@/lib/recap';

describe('ratioOf', () => {
  it('is a share of the leader, clamped', () => {
    expect(ratioOf(5, 10)).toBe(0.5);
    expect(ratioOf(10, 10)).toBe(1);
    expect(ratioOf(3, 0)).toBe(0);
    expect(ratioOf(12, 10)).toBe(1);
  });
});

describe('rank', () => {
  it('sorts, limits and carries true ratios', () => {
    const ranked = rank(
      [
        { name: 'Thriller', count: 44 },
        { name: 'Drama', count: 61 },
        { name: 'Sci-Fi', count: 31, id: 878 },
      ],
      2,
    );
    expect(ranked.map((r) => r.name)).toEqual(['Drama', 'Thriller']);
    expect(ranked[0].ratio).toBe(1);
    expect(ranked[1].ratio).toBeCloseTo(44 / 61, 5);
  });

  it('keeps ids when they exist and nulls them when they do not', () => {
    const [item] = rank([{ name: 'Sci-Fi', count: 1, id: 878 }]);
    expect(item.id).toBe(878);
    expect(rank([{ name: 'X', count: 1 }])[0].id).toBeNull();
  });
});

describe('typeWall', () => {
  it('interpolates size from the ratio, not from the rank', () => {
    const wall = typeWall(rank([
      { name: 'A', count: 100 },
      { name: 'B', count: 50 },
      { name: 'C', count: 49 },
    ]), 52, 14);
    expect(wall[0].fontSize).toBe(52);
    expect(wall[1].fontSize).toBe(33);
    // B and C are one apart in the data, so they are ~one apart on screen —
    // which is the point of choosing the wall over ranked bars.
    expect(Math.abs(wall[1].fontSize - wall[2].fontSize)).toBeLessThanOrEqual(1);
  });
});

describe('podium', () => {
  it('reads 2 · 1 · 3', () => {
    const entries = podium(rank([
      { name: 'Denis Villeneuve', count: 9 },
      { name: 'Bong Joon-ho', count: 7 },
      { name: 'Greta Gerwig', count: 6 },
    ]));
    expect(entries.map((e) => e.place)).toEqual([2, 1, 3]);
    expect(entries.map((e) => e.initials)).toEqual(['BJ', 'DV', 'GG']);
  });

  it('survives a one- and two-entry year', () => {
    expect(podium(rank([{ name: 'Solo', count: 3 }])).map((e) => e.place)).toEqual([1]);
    expect(podium([]).length).toBe(0);
  });
});

describe('faces', () => {
  it('ranks people, keeps their headshots and gives everyone a monogram', () => {
    const ranked = faces(
      [
        { name: 'Tom Holland', count: 4, id: 1, image: 'https://img/th.jpg' },
        { name: 'Zendaya', count: 6, id: 2, image: null },
        { name: 'Jacob Batalon', count: 2, id: 3 },
      ],
      2,
    );

    expect(ranked.map((f) => f.name)).toEqual(['Zendaya', 'Tom Holland']);
    expect(ranked.map((f) => f.ratio)).toEqual([1, 4 / 6]);
    expect(ranked.map((f) => f.initials)).toEqual(['ZE', 'TH']);
    // A face with no stored photo is null, not undefined - the payload is jsonb.
    expect(ranked.map((f) => f.image)).toEqual([null, 'https://img/th.jpg']);
  });

  it('is empty for a period with no cast at all', () => {
    expect(faces([], 5)).toEqual([]);
  });
});

describe('plinthHeight', () => {
  it('is proportional, with a visible floor', () => {
    expect(plinthHeight(1, 170)).toBe(170);
    expect(plinthHeight(0.5, 170)).toBe(85);
    expect(plinthHeight(0, 170)).toBe(6);
  });
});

describe('heatmapWeeks', () => {
  it('covers the year in Monday-first columns and pads the edges', () => {
    const weeks = heatmapWeeks(2026, {}, {});
    expect(weeks.length).toBeGreaterThanOrEqual(52);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    // 1 January 2026 is a Thursday, so the first column starts on 29 December.
    expect(weeks[0].slice(0, 3)).toEqual([-1, -1, -1]);
    const cells = weeks.flat();
    expect(cells.filter((level) => level >= 0).length).toBe(365);
  });

  it('grades films over episodes and heavy over light', () => {
    const weeks = heatmapWeeks(2026, { '2026-01-02': 1, '2026-01-03': 3 }, { '2026-01-05': 1, '2026-01-06': 5 });
    const levels = weeks.flat();
    expect(levels).toContain(1);
    expect(levels).toContain(2);
    expect(levels).toContain(3);
    expect(levels).toContain(4);
  });
});

describe('labels', () => {
  it('initials both halves of a name', () => {
    expect(initials('Mara Kowalczyk')).toBe('MK');
    expect(initials('Bong Joon-ho')).toBe('BJ');
    expect(initials('you')).toBe('YO');
    expect(initials('   ')).toBe('??');
  });

  it('spells the small ordinals', () => {
    expect(ordinalWord(1)).toBe('first');
    expect(ordinalWord(3)).toBe('third');
    expect(ordinalWord(12)).toBe('12th');
  });
});
