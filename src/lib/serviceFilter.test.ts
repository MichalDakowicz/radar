import { effectiveServiceSelection, matchesServiceFilter, MY_SERVICES_KEY } from './serviceFilter';
import { OTHER_SERVICE_KEY } from './services';
import type { Movie } from '@/types/movie';

const movie = (availability: string[]): Movie =>
  ({
    id: 'a',
    title: 'Title',
    type: 'movie',
    availability,
  }) as Movie;

describe('matchesServiceFilter', () => {
  it('keeps everything when nothing is selected', () => {
    expect(matchesServiceFilter(movie([]), [], ['Netflix'])).toBe(true);
  });

  it('matches a named service through the normalizer', () => {
    expect(matchesServiceFilter(movie(['Netflix basic with Ads']), ['Netflix'])).toBe(true);
    expect(matchesServiceFilter(movie(['Hulu']), ['Netflix'])).toBe(false);
  });

  it('matches the Other bucket only for services outside the popular set', () => {
    expect(matchesServiceFilter(movie(['Shudder']), [OTHER_SERVICE_KEY])).toBe(true);
    expect(matchesServiceFilter(movie(['Netflix']), [OTHER_SERVICE_KEY])).toBe(false);
  });

  it('matches My services against the owned list', () => {
    expect(matchesServiceFilter(movie(['Max']), [MY_SERVICES_KEY], ['Netflix', 'Max'])).toBe(true);
    expect(matchesServiceFilter(movie(['Hulu']), [MY_SERVICES_KEY], ['Netflix', 'Max'])).toBe(false);
  });

  it('never matches My services when no services are owned', () => {
    expect(matchesServiceFilter(movie(['Netflix']), [MY_SERVICES_KEY], [])).toBe(false);
  });

  it('ORs My services with named chips', () => {
    expect(matchesServiceFilter(movie(['Hulu']), [MY_SERVICES_KEY, 'Hulu'], ['Netflix'])).toBe(true);
  });

  it('ignores availability that is missing or not an array', () => {
    expect(matchesServiceFilter({ id: 'a' } as Movie, ['Netflix'])).toBe(false);
  });
});

describe('effectiveServiceSelection', () => {
  it('leaves the selection alone when services are owned', () => {
    expect(effectiveServiceSelection([MY_SERVICES_KEY, 'Hulu'], ['Netflix'])).toEqual([MY_SERVICES_KEY, 'Hulu']);
  });

  it('drops a stale My services chip when nothing is owned', () => {
    expect(effectiveServiceSelection([MY_SERVICES_KEY], [])).toEqual([]);
    expect(effectiveServiceSelection([MY_SERVICES_KEY, 'Hulu'], [])).toEqual(['Hulu']);
  });
});
