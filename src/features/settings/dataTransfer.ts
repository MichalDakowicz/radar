import { mergeEpisodeMirror, normalizeEpisodeWatchDates } from '@/lib/episodes';
import { normalizeWatchDates } from '@/lib/watchDates';
import type { MediaType, Movie } from '@/types/movie';

// Stable import/export format (doc 03 Settings "Import/Export JSON (stable
// format)"). The payload is versioned so future shape changes stay
// backwards-readable; movies are exported as the app-level `Movie` shape
// (camelCase) minus the per-user identity fields `id`/`userId`, which are
// re-assigned on import by useMovies.addMovie.

export const EXPORT_VERSION = 1;

export type PortableMovie = Omit<Partial<Movie>, 'id' | 'userId'> & { title: string; type: MediaType };

export type ExportPayload = {
  version: number;
  exportedAt: string;
  count: number;
  movies: PortableMovie[];
};

function toPortable(movie: Movie): PortableMovie {
  // Drop id/userId - they're re-minted per target account on import.
  const { id: _id, userId: _userId, ...rest } = movie;
  return rest as PortableMovie;
}

export function buildExportPayload(movies: Movie[], exportedAt: string): ExportPayload {
  return {
    version: EXPORT_VERSION,
    exportedAt,
    count: movies.length,
    movies: movies.map(toPortable),
  };
}

export function serializeExport(movies: Movie[], exportedAt: string): string {
  return JSON.stringify(buildExportPayload(movies, exportedAt), null, 2);
}

export type ParseResult = {
  movies: PortableMovie[];
  errors: string[];
};

function coerceType(raw: unknown): MediaType {
  return raw === 'tv' ? 'tv' : 'movie';
}

function coerceItem(item: Record<string, unknown>, index: number, errors: string[]): PortableMovie | null {
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  if (!title) {
    errors.push(`Item ${index + 1}: missing title, skipped`);
    return null;
  }
  const coerced: Record<string, unknown> = { ...item, title, type: coerceType(item.type) };

  // An export taken before 2.12.0 carries one bare stamp per episode; imports go
  // straight to the write path, which never sees normalizeMovie (lib/episodes).
  if (item.episodeWatchDates || item.episodesWatched) {
    const log = normalizeEpisodeWatchDates(item.episodeWatchDates);
    coerced.episodeWatchDates = log;
    coerced.episodesWatched = mergeEpisodeMirror(item.episodesWatched as Record<string, boolean> | null, log);
  }

  // An export taken before the film log existed carries only completedAt, so the
  // one date it holds becomes that film's first logged watch (lib/watchDates).
  if (coerced.type !== 'tv') {
    coerced.watchDates = normalizeWatchDates(item.watchDates, item.completedAt as string | null);
  }

  return coerced as PortableMovie;
}

// Accepts either a Radar export object ({ version, movies: [...] }) or a bare
// array of movie-like objects. Line/CSV text is intentionally unsupported here
// (the rewrite standardises on JSON); the UI keeps a paste box for JSON only.
export function parseImport(text: string): ParseResult {
  const errors: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) return { movies: [], errors: ['Nothing to import — paste or pick a JSON file first.'] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { movies: [], errors: ['Invalid JSON — expected a Radar export file or an array of titles.'] };
  }

  let rawList: unknown[];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as ExportPayload).movies)) {
    rawList = (parsed as ExportPayload).movies;
  } else {
    return { movies: [], errors: ['Unrecognised JSON shape — expected a Radar export or an array.'] };
  }

  const movies: PortableMovie[] = [];
  rawList.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') {
      errors.push(`Item ${i + 1}: not an object, skipped`);
      return;
    }
    const coerced = coerceItem(raw as Record<string, unknown>, i, errors);
    if (coerced) movies.push(coerced);
  });

  return { movies, errors };
}

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase();
}

// A candidate is a duplicate of an existing library item when they share a
// tmdbId, or (lacking one) a case-insensitive title match.
export function isDuplicate(candidate: PortableMovie, existing: Movie[]): boolean {
  return existing.some((m) => {
    if (candidate.tmdbId != null && m.tmdbId != null) return candidate.tmdbId === m.tmdbId;
    return normalizeTitle(m.title) === normalizeTitle(candidate.title);
  });
}
