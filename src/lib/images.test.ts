import { highResImageUrl, posterFileName } from './images';

describe('highResImageUrl', () => {
  it('upgrades a w500 poster to the original rendition', () => {
    expect(highResImageUrl('https://image.tmdb.org/t/p/w500/abc.jpg')).toBe(
      'https://image.tmdb.org/t/p/original/abc.jpg',
    );
  });

  it('leaves an already-original URL alone', () => {
    const url = 'https://image.tmdb.org/t/p/original/abc.jpg';
    expect(highResImageUrl(url)).toBe(url);
  });

  it('upgrades height-constrained renditions too', () => {
    expect(highResImageUrl('https://image.tmdb.org/t/p/h632/abc.jpg')).toBe(
      'https://image.tmdb.org/t/p/original/abc.jpg',
    );
  });

  it('passes non-TMDB URLs through untouched', () => {
    const url = 'https://example.com/poster.png';
    expect(highResImageUrl(url)).toBe(url);
  });

  it('returns null for empty input', () => {
    expect(highResImageUrl(null)).toBeNull();
    expect(highResImageUrl(undefined)).toBeNull();
    expect(highResImageUrl('')).toBeNull();
  });
});

describe('posterFileName', () => {
  it('slugs the title and keeps the URL extension', () => {
    expect(posterFileName('Blade Runner 2049', 'https://image.tmdb.org/t/p/original/x.png')).toBe(
      'blade-runner-2049.png',
    );
  });

  it('defaults to jpg when the URL has no recognisable extension', () => {
    expect(posterFileName('Dune', 'https://image.tmdb.org/t/p/original/x')).toBe('dune.jpg');
    expect(posterFileName('Dune', null)).toBe('dune.jpg');
  });

  it('ignores a query string after the extension', () => {
    expect(posterFileName('Arrival', 'https://cdn.test/a.webp?w=500')).toBe('arrival.webp');
  });

  it('collapses punctuation and trims stray dashes', () => {
    expect(posterFileName('Spider-Man: No Way Home!', 'a.jpg')).toBe('spider-man-no-way-home.jpg');
  });

  it('falls back to "poster" when the title slugs to nothing', () => {
    expect(posterFileName('!!!', 'a.jpg')).toBe('poster.jpg');
  });
});
