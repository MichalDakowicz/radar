import type { FavoriteItem, MediaType, Movie } from '@/types/movie';

// Pure helpers behind the profile "top 4" (Letterboxd's favourite films).
// Everything here is React-free and jsonb-shaped, so the read boundary
// (normalizeFavorites) and the edit rules (toggleFavorite) are unit-testable
// without rendering — same split as normalizeMovie / movieStatus.

export const MAX_FAVORITES = 4;

/** Stable identity for a pinned title. tmdbId alone collides across movie/tv. */
export function favoriteKey(item: Pick<FavoriteItem, 'tmdbId' | 'type'>): string {
  return `${item.type}:${item.tmdbId}`;
}

/**
 * Snapshot a library entry. Manual entries have no tmdbId, so they can't be
 * pinned — there'd be no detail page to open and no poster to draw.
 */
export function movieToFavorite(movie: Movie): FavoriteItem | null {
  if (movie.tmdbId == null) return null;
  return { tmdbId: movie.tmdbId, type: movie.type, title: movie.title, coverUrl: movie.coverUrl };
}

function isMediaType(value: unknown): value is MediaType {
  return value === 'movie' || value === 'tv';
}

/**
 * Read boundary for profiles.favorites. The column is free-form jsonb written
 * by a client, so treat every row as untrusted: drop malformed entries, dedupe,
 * and cap at 4 rather than letting a bad row break the profile header.
 */
export function normalizeFavorites(raw: unknown): FavoriteItem[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const out: FavoriteItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const { tmdbId, type, title, coverUrl } = entry as Record<string, unknown>;
    if (typeof tmdbId !== 'number' || !Number.isFinite(tmdbId)) continue;
    if (!isMediaType(type)) continue;

    const item: FavoriteItem = {
      tmdbId,
      type,
      title: typeof title === 'string' ? title : '',
      coverUrl: typeof coverUrl === 'string' && coverUrl ? coverUrl : null,
    };

    const key = favoriteKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length === MAX_FAVORITES) break;
  }

  return out;
}

export function isFavorite(favorites: FavoriteItem[], item: Pick<FavoriteItem, 'tmdbId' | 'type'>): boolean {
  const key = favoriteKey(item);
  return favorites.some((f) => favoriteKey(f) === key);
}

/**
 * Add or remove a pick. Position is meaningful (slot 1 reads as the top one),
 * so adding appends and removing closes the gap — no null holes in the array.
 * Returns the list unchanged when adding past the cap, letting the caller tell
 * "already full" from "did something" by identity.
 */
export function toggleFavorite(favorites: FavoriteItem[], item: FavoriteItem): FavoriteItem[] {
  const key = favoriteKey(item);
  if (favorites.some((f) => favoriteKey(f) === key)) {
    return favorites.filter((f) => favoriteKey(f) !== key);
  }
  if (favorites.length >= MAX_FAVORITES) return favorites;
  return [...favorites, item];
}

/** Move a pick one slot toward the front / back, for reordering in the editor. */
export function moveFavorite(favorites: FavoriteItem[], from: number, to: number): FavoriteItem[] {
  if (from === to || from < 0 || to < 0 || from >= favorites.length || to >= favorites.length) {
    return favorites;
  }
  const next = [...favorites];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Best-first ordering for the picker: your own rating decides, TMDB's score
 * only breaks ties among titles you never rated, and title breaks the rest so
 * the list is stable between renders. Unrated titles sort below rated ones
 * rather than being treated as a 0 you disliked.
 */
export function sortByRatingDesc(movies: Movie[]): Movie[] {
  const mine = (m: Movie) => m.ratings?.overall ?? 0;
  return [...movies].sort((a, b) => {
    const byMine = mine(b) - mine(a);
    if (byMine !== 0) return byMine;
    const byTmdb = (b.voteAverage ?? 0) - (a.voteAverage ?? 0);
    if (byTmdb !== 0) return byTmdb;
    return a.title.localeCompare(b.title);
  });
}

/** Row shape written back to profiles.favorites (camelCase, matching the read). */
export function toFavoritesPayload(favorites: FavoriteItem[]): FavoriteItem[] {
  return favorites.slice(0, MAX_FAVORITES).map((f) => ({
    tmdbId: f.tmdbId,
    type: f.type,
    title: f.title,
    coverUrl: f.coverUrl,
  }));
}
