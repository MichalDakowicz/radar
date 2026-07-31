import { genreIconKey } from './genreIcons';

describe('genreIconKey', () => {
  it('maps the plain TMDB movie genres', () => {
    expect(genreIconKey('Action')).toBe('action');
    expect(genreIconKey('Comedy')).toBe('comedy');
    expect(genreIconKey('Horror')).toBe('horror');
    expect(genreIconKey('Documentary')).toBe('documentary');
    expect(genreIconKey('Western')).toBe('western');
  });

  it('folds the TV wordings onto the same icons', () => {
    expect(genreIconKey('Sci-Fi & Fantasy')).toBe(genreIconKey('Science Fiction'));
    expect(genreIconKey('Action & Adventure')).toBe(genreIconKey('Action'));
    expect(genreIconKey('Soap')).toBe(genreIconKey('Romance'));
  });

  it('prefers the more specific combined genre over a word it contains', () => {
    // "Sci-Fi & Fantasy" contains "Fantasy", and "War & Politics" is war, not
    // whatever "politics" would otherwise fall through to.
    expect(genreIconKey('Sci-Fi & Fantasy')).toBe('scifi');
    expect(genreIconKey('War & Politics')).toBe('war');
    expect(genreIconKey('Action & Adventure')).toBe('action');
  });

  it('ignores case and surrounding whitespace', () => {
    expect(genreIconKey('  ROMANCE ')).toBe('romance');
    expect(genreIconKey('science fiction')).toBe('scifi');
  });

  it('handles the singular/plural wordings TMDB uses', () => {
    expect(genreIconKey('Mystery')).toBe('mystery');
    expect(genreIconKey('History')).toBe('history');
    expect(genreIconKey('Historical')).toBe('history');
  });

  it('falls back to the default key for anything unrecognised', () => {
    expect(genreIconKey('Telenovela')).toBe('default');
    expect(genreIconKey('')).toBe('default');
  });
});
