import {
  buildLeavingTitles,
  daysUntil,
  filterLeaving,
  groupByHorizon,
  needsSubscription,
  serviceCounts,
  splitLeaving,
  todayKey,
  urgency,
  urgencyLabel,
} from './leaving';
import type { Expiration } from './leaving';
import type { Movie } from '@/types/movie';

const TODAY = '2026-09-10';

const exp = (over: Partial<Expiration> = {}): Expiration => ({
  serviceName: 'Netflix',
  tmdbId: 1,
  mediaType: 'movie',
  expiresOn: '2026-09-20',
  title: 'Heat',
  posterUrl: null,
  releaseYear: 1995,
  link: null,
  ...over,
});

const movie = (over: Partial<Movie> = {}): Movie =>
  ({
    id: 'm1',
    tmdbId: 1,
    type: 'movie',
    title: 'Heat',
    availability: [],
    watched: false,
    ...over,
  }) as Movie;

describe('daysUntil', () => {
  it('counts calendar days forward and back', () => {
    expect(daysUntil('2026-09-20', TODAY)).toBe(10);
    expect(daysUntil('2026-09-10', TODAY)).toBe(0);
    expect(daysUntil('2026-09-09', TODAY)).toBe(-1);
  });

  it('is unaffected by a month boundary', () => {
    expect(daysUntil('2026-10-01', '2026-09-30')).toBe(1);
  });

  it('returns 0 for an unparseable date rather than NaN', () => {
    expect(daysUntil('not-a-date', TODAY)).toBe(0);
  });
});

describe('todayKey', () => {
  it('uses the local calendar date, not the UTC one', () => {
    // 23:30 local on the 10th is already the 11th in UTC for a positive offset;
    // "leaves today" has to agree with the wall clock, so local wins.
    const late = new Date(2026, 8, 10, 23, 30);
    expect(todayKey(late)).toBe('2026-09-10');
  });
});

describe('urgencyLabel', () => {
  it('names the near dates and rounds the far ones', () => {
    expect(urgencyLabel(0)).toBe('Last day');
    expect(urgencyLabel(-1)).toBe('Last day');
    expect(urgencyLabel(1)).toBe('Tomorrow');
    expect(urgencyLabel(3)).toBe('3 days');
    expect(urgencyLabel(9)).toBe('Next week');
    expect(urgencyLabel(21)).toBe('3 weeks');
  });
});

describe('buildLeavingTitles', () => {
  it('keeps services the user does not subscribe to, unscoped', () => {
    const rows = [exp({ serviceName: 'Hulu' })];
    const [title] = buildLeavingTitles(rows, [], ['Netflix'], TODAY);
    expect(title.services).toEqual(['Hulu']);
    expect(title.ownedServices).toEqual([]);
    expect(needsSubscription(title)).toBe(true);
  });

  it('drops services the user does not subscribe to when scoped', () => {
    const rows = [exp({ serviceName: 'Hulu' })];
    expect(buildLeavingTitles(rows, [], ['Netflix'], TODAY, { onlyOwned: true })).toEqual([]);
  });

  it('marks the services the user does have', () => {
    const rows = [
      exp({ serviceName: 'Netflix', expiresOn: '2026-09-12' }),
      exp({ serviceName: 'Hulu', expiresOn: '2026-09-14' }),
    ];
    const [title] = buildLeavingTitles(rows, [], ['Netflix'], TODAY);
    expect(title.ownedServices).toEqual(['Netflix']);
    expect(needsSubscription(title)).toBe(false);
  });

  it('treats an empty owned list as "all services"', () => {
    const rows = [exp({ serviceName: 'Hulu' })];
    expect(buildLeavingTitles(rows, [], [], TODAY)).toHaveLength(1);
  });

  it('uses the LAST date across owned services, not the first', () => {
    // On Netflix until the 12th and Max until the 30th: access ends the 30th.
    const rows = [
      exp({ serviceName: 'Netflix', expiresOn: '2026-09-12' }),
      exp({ serviceName: 'Max', expiresOn: '2026-09-30' }),
    ];
    const [title] = buildLeavingTitles(rows, [], ['Netflix', 'Max'], TODAY);
    expect(title.expiresOn).toBe('2026-09-30');
    expect(title.daysLeft).toBe(20);
    expect(title.services).toEqual(['Netflix', 'Max']);
  });

  it('ignores a later date on an unowned service when scoped', () => {
    const rows = [
      exp({ serviceName: 'Netflix', expiresOn: '2026-09-12' }),
      exp({ serviceName: 'Hulu', expiresOn: '2026-09-30' }),
    ];
    const [title] = buildLeavingTitles(rows, [], ['Netflix'], TODAY, { onlyOwned: true });
    expect(title.expiresOn).toBe('2026-09-12');
    expect(title.services).toEqual(['Netflix']);
  });

  it('counts the unowned service unscoped, where the date is when it is gone everywhere', () => {
    const rows = [
      exp({ serviceName: 'Netflix', expiresOn: '2026-09-12' }),
      exp({ serviceName: 'Hulu', expiresOn: '2026-09-30' }),
    ];
    const [title] = buildLeavingTitles(rows, [], ['Netflix'], TODAY);
    expect(title.expiresOn).toBe('2026-09-30');
    expect(title.services).toEqual(['Netflix', 'Hulu']);
  });

  it('stays quiet when an owned service still carries it and is not expiring', () => {
    const rows = [exp({ serviceName: 'Netflix', expiresOn: '2026-09-12' })];
    const tracked = movie({ availability: ['Netflix', 'Max'] });
    expect(buildLeavingTitles(rows, [tracked], ['Netflix', 'Max'], TODAY, { onlyOwned: true })).toEqual([]);
  });

  it('still lists it unscoped, where leaving Netflix is news regardless', () => {
    const rows = [exp({ serviceName: 'Netflix', expiresOn: '2026-09-12' })];
    const tracked = movie({ availability: ['Netflix', 'Max'] });
    expect(buildLeavingTitles(rows, [tracked], ['Netflix', 'Max'], TODAY)).toHaveLength(1);
  });

  it('still reports when the only other carrier is a service you do not own', () => {
    const rows = [exp({ serviceName: 'Netflix', expiresOn: '2026-09-12' })];
    const tracked = movie({ availability: ['Netflix', 'Hulu'] });
    expect(
      buildLeavingTitles(rows, [tracked], ['Netflix', 'Max'], TODAY, { onlyOwned: true }),
    ).toHaveLength(1);
  });

  it('reports when every owned carrier is expiring', () => {
    const rows = [
      exp({ serviceName: 'Netflix', expiresOn: '2026-09-12' }),
      exp({ serviceName: 'Max', expiresOn: '2026-09-14' }),
    ];
    const tracked = movie({ availability: ['Netflix', 'Max'] });
    const [title] = buildLeavingTitles(rows, [tracked], ['Netflix', 'Max'], TODAY, { onlyOwned: true });
    expect(title.expiresOn).toBe('2026-09-14');
  });

  it('matches the library on media type as well as id', () => {
    const rows = [exp({ mediaType: 'tv', tmdbId: 1 })];
    const filmWithSameId = movie({ tmdbId: 1, type: 'movie', id: 'film' });
    const [title] = buildLeavingTitles(rows, [filmWithSameId], ['Netflix'], TODAY);
    expect(title.movieId).toBeNull();
  });

  it('prefers the library row for title and poster', () => {
    const rows = [exp({ title: 'HEAT (1995)', posterUrl: 'motn.jpg' })];
    const tracked = movie({ title: 'Heat', coverUrl: 'tmdb.jpg' });
    const [title] = buildLeavingTitles(rows, [tracked], ['Netflix'], TODAY);
    expect(title.title).toBe('Heat');
    expect(title.posterUrl).toBe('tmdb.jpg');
    expect(title.movieId).toBe('m1');
  });

  it('sorts by date then title', () => {
    const rows = [
      exp({ tmdbId: 2, title: 'Zodiac', expiresOn: '2026-09-20' }),
      exp({ tmdbId: 3, title: 'Alien', expiresOn: '2026-09-20' }),
      exp({ tmdbId: 4, title: 'Ronin', expiresOn: '2026-09-11' }),
    ];
    const titles = buildLeavingTitles(rows, [], ['Netflix'], TODAY);
    expect(titles.map((t) => t.title)).toEqual(['Ronin', 'Alien', 'Zodiac']);
  });
});

describe('splitLeaving', () => {
  it('separates tracked from undiscovered and drops what is watched', () => {
    const rows = [
      exp({ tmdbId: 1, title: 'Tracked' }),
      exp({ tmdbId: 2, title: 'Unknown' }),
      exp({ tmdbId: 3, title: 'Seen' }),
    ];
    const library = [
      movie({ id: 'm1', tmdbId: 1, title: 'Tracked' }),
      movie({ id: 'm3', tmdbId: 3, title: 'Seen', watched: true }),
    ];
    const { tracked, discover } = splitLeaving(buildLeavingTitles(rows, library, ['Netflix'], TODAY));
    expect(tracked.map((t) => t.title)).toEqual(['Tracked']);
    expect(discover.map((t) => t.title)).toEqual(['Unknown']);
  });
});

describe('groupByHorizon', () => {
  it('buckets by horizon and drops days already gone', () => {
    const rows = [
      exp({ tmdbId: 1, expiresOn: '2026-09-12' }),
      exp({ tmdbId: 2, expiresOn: '2026-09-20' }),
      exp({ tmdbId: 3, expiresOn: '2026-10-30' }),
      exp({ tmdbId: 4, expiresOn: '2026-09-09' }),
    ];
    const buckets = groupByHorizon(buildLeavingTitles(rows, [], [], TODAY));
    expect(buckets.map((b) => b.key)).toEqual(['week', 'fortnight', 'later']);
    expect(buckets.flatMap((b) => b.titles)).toHaveLength(3);
  });

  it('drops empty buckets rather than rendering an empty heading', () => {
    const rows = [exp({ tmdbId: 1, expiresOn: '2026-09-11' })];
    const buckets = groupByHorizon(buildLeavingTitles(rows, [], [], TODAY));
    expect(buckets.map((b) => b.key)).toEqual(['week']);
  });

  it('orders by date even when a later one is on a service you already have', () => {
    const rows = [
      exp({ tmdbId: 1, title: 'Sooner, needs a sub', serviceName: 'Hulu', expiresOn: '2026-09-11' }),
      exp({ tmdbId: 2, title: 'Later, already have it', serviceName: 'Netflix', expiresOn: '2026-09-12' }),
    ];
    const [week] = groupByHorizon(buildLeavingTitles(rows, [], ['Netflix'], TODAY));
    expect(week.titles.map((t) => t.title)).toEqual(['Sooner, needs a sub', 'Later, already have it']);
  });

  it('orders by date inside a bucket', () => {
    const rows = [
      exp({ tmdbId: 1, title: 'Later', expiresOn: '2026-09-15' }),
      exp({ tmdbId: 2, title: 'Sooner', expiresOn: '2026-09-12' }),
    ];
    const [week] = groupByHorizon(buildLeavingTitles(rows, [], [], TODAY));
    expect(week.titles.map((t) => t.title)).toEqual(['Sooner', 'Later']);
  });
});

describe('urgency', () => {
  it('always carries a readable label, never colour alone', () => {
    for (const days of [-3, 0, 1, 2, 5, 9, 30]) {
      expect(urgency(days).label).toMatch(/\w/);
    }
  });

  it('names the near dates and shortens the far ones', () => {
    expect(urgency(0).label).toBe('Today');
    expect(urgency(1).label).toBe('1 day');
    expect(urgency(5).label).toBe('5 days');
    expect(urgency(28).label).toBe('4 wks');
  });

  it('returns hex colours, which are the only ones RN inline styles parse', () => {
    for (const days of [0, 2, 6, 20]) {
      const { bg, fg } = urgency(days);
      expect(bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(fg).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('escalates the closer the date is', () => {
    expect(urgency(0).bg).not.toBe(urgency(1).bg);
    expect(urgency(1).bg).not.toBe(urgency(5).bg);
  });
});

describe('serviceCounts', () => {
  it('counts each service and puts the biggest first', () => {
    const rows = [
      exp({ tmdbId: 1, serviceName: 'Netflix' }),
      exp({ tmdbId: 2, serviceName: 'Netflix' }),
      exp({ tmdbId: 3, serviceName: 'Max' }),
    ];
    expect(serviceCounts(buildLeavingTitles(rows, [], [], TODAY))).toEqual([
      { service: 'Netflix', count: 2 },
      { service: 'Max', count: 1 },
    ]);
  });

  it('counts a title once per service it is leaving', () => {
    const rows = [
      exp({ tmdbId: 1, serviceName: 'Netflix' }),
      exp({ tmdbId: 1, serviceName: 'Max' }),
    ];
    expect(serviceCounts(buildLeavingTitles(rows, [], [], TODAY))).toHaveLength(2);
  });
});

describe('filterLeaving', () => {
  const titles = () =>
    buildLeavingTitles(
      [
        exp({ tmdbId: 1, title: 'Film', serviceName: 'Netflix', mediaType: 'movie' }),
        exp({ tmdbId: 2, title: 'Series', serviceName: 'Max', mediaType: 'tv' }),
      ],
      [],
      [],
      TODAY,
    );

  it('keeps everything when nothing is selected', () => {
    expect(filterLeaving(titles(), {})).toHaveLength(2);
    expect(filterLeaving(titles(), { services: [], mediaType: null })).toHaveLength(2);
  });

  it('narrows by service', () => {
    expect(filterLeaving(titles(), { services: ['Max'] }).map((t) => t.title)).toEqual(['Series']);
  });

  it('narrows by media type', () => {
    expect(filterLeaving(titles(), { mediaType: 'movie' }).map((t) => t.title)).toEqual(['Film']);
  });

  it('ANDs the two dimensions', () => {
    expect(filterLeaving(titles(), { services: ['Max'], mediaType: 'movie' })).toEqual([]);
  });
});
