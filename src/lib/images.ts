// Poster URL helpers. TMDB serves the same artwork at several widths under
// `/t/p/<size>/`; list and detail rows request `w500`, which is plenty at card
// size but visibly soft once the poster fills the screen in the image viewer.

const TMDB_SIZED_PATH = /\/t\/p\/(w\d+|h\d+|original)\//;

/** Upgrades a TMDB image URL to the original (full-resolution) rendition. */
export function highResImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(TMDB_SIZED_PATH, '/t/p/original/');
}

/** Filename for a saved poster: `blade-runner-2049.jpg`, extension from the URL. */
export function posterFileName(title: string, url: string | null | undefined): string {
  const match = url?.match(/\.(jpe?g|png|webp|avif)(?:\?|$)/i);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'poster'}.${ext}`;
}
