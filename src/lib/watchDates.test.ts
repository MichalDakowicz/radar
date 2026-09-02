import {
  latestWatch,
  logWatch,
  normalizeWatchDates,
  resizeWatchLog,
  unlogWatch,
  watchesOnDay,
} from './watchDates';

const ISO = '2026-08-01T20:00:00.000Z';
const LATER = '2026-08-13T21:00:00.000Z';
const LATEST = '2026-09-02T18:00:00.000Z';

describe('normalizeWatchDates', () => {
  it('sorts the log oldest first', () => {
    expect(normalizeWatchDates([LATER, ISO])).toEqual([ISO, LATER]);
  });

  it('reads a row written before the log existed off its one date', () => {
    expect(normalizeWatchDates(null, ISO)).toEqual([ISO]);
    expect(normalizeWatchDates([], ISO)).toEqual([ISO]);
  });

  it('prefers the log over the single date, which is only its latest', () => {
    expect(normalizeWatchDates([ISO, LATER], LATER)).toEqual([ISO, LATER]);
  });

  it('is empty when nothing is dated', () => {
    expect(normalizeWatchDates(null, null)).toEqual([]);
    expect(normalizeWatchDates(undefined)).toEqual([]);
  });

  it('drops what it cannot read and coerces an epoch number', () => {
    expect(normalizeWatchDates(['nonsense', ISO, null])).toEqual([ISO]);
    expect(normalizeWatchDates([Date.parse(ISO)])).toEqual([ISO]);
  });
});

describe('latestWatch', () => {
  it('is the newest stamp, which is what completedAt carries', () => {
    expect(latestWatch([ISO, LATER])).toBe(LATER);
  });

  it('is null for an empty log, so a film with no watches carries no date', () => {
    expect(latestWatch([])).toBeNull();
  });
});

describe('logWatch / unlogWatch', () => {
  it('appends a watch in date order', () => {
    expect(logWatch([LATER], ISO)).toEqual([ISO, LATER]);
  });

  it('ignores a stamp it cannot parse', () => {
    expect(logWatch([ISO], 'whenever')).toEqual([ISO]);
  });

  it('drops the newest watch when none is named', () => {
    expect(unlogWatch([ISO, LATER])).toEqual([ISO]);
  });

  it('drops the named watch and leaves the others dated', () => {
    // The bug this exists for: removing one watch used to clear the only date,
    // which left every other watch on the row reading as undated.
    expect(unlogWatch([ISO, LATER, LATEST], LATER)).toEqual([ISO, LATEST]);
  });

  it('leaves a log alone when the stamp is not in it', () => {
    expect(unlogWatch([ISO], LATER)).toEqual([ISO]);
    expect(unlogWatch([], ISO)).toEqual([]);
  });
});

describe('watchesOnDay', () => {
  const keyOf = (iso: string) => iso.slice(0, 10);

  it('picks out every watch logged on that day', () => {
    const twiceOnADay = [ISO, '2026-08-01T23:30:00.000Z', LATER];
    expect(watchesOnDay(twiceOnADay, '2026-08-01', keyOf)).toHaveLength(2);
  });

  it('is empty for a day with nothing on it', () => {
    expect(watchesOnDay([ISO], '2026-08-02', keyOf)).toEqual([]);
  });
});

describe('resizeWatchLog', () => {
  it('stamps now for a watch the count gained', () => {
    const grown = resizeWatchLog([ISO], 2, LATEST);
    expect(grown).toEqual([ISO, LATEST]);
  });

  it('takes the newest date off a watch the count lost', () => {
    expect(resizeWatchLog([ISO, LATER], 1, LATEST)).toEqual([ISO]);
  });

  it('leaves the log untouched when nothing changed, so no save re-dates it', () => {
    const log = [ISO, LATER];
    expect(resizeWatchLog(log, 2, LATEST)).toBe(log);
  });

  it('empties the log when no watch carries a date any more', () => {
    expect(resizeWatchLog([ISO, LATER], 0, LATEST)).toEqual([]);
    expect(resizeWatchLog([ISO], -3, LATEST)).toEqual([]);
  });
});
