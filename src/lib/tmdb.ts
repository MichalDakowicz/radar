// Ported from the current app's src/services/tmdb.js (doc 09), typed.
import type { CastMember, MediaType, NamedRef, ProductionCompany } from '@/types/movie';

const ACCESS_TOKEN = process.env.EXPO_PUBLIC_TMDB_ACCESS_TOKEN;

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const IMAGE_ORIGINAL_URL = 'https://image.tmdb.org/t/p/original';

const headers = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  Accept: 'application/json',
};

// A single Browse batch fans out ~8 category rows, and every row then fetches
// credits per item (withDirectors) - well over a hundred requests in flight at
// once, which TMDB answers with 429s. The callers all swallow failures into an
// empty list, so the only symptom was rows silently vanishing from the feed with
// a "Failed to fetch …" log. One process-wide gate plus a bounded retry keeps
// the burst inside TMDB's budget instead.
const MAX_IN_FLIGHT = 10;
const MAX_ATTEMPTS = 3;

let inFlight = 0;
const waiting: (() => void)[] = [];

function acquireSlot(): Promise<void> {
  if (inFlight < MAX_IN_FLIGHT) {
    inFlight++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}

function releaseSlot(): void {
  const next = waiting.shift();
  // Hand the slot straight to the next waiter rather than decrementing, so the
  // in-flight count can't dip below the cap while requests are still queued.
  if (next) next();
  else inFlight--;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get('Retry-After'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  return 250 * 2 ** attempt;
}

/**
 * Every TMDB request in this module goes through here. Holds one of the
 * MAX_IN_FLIGHT slots for the whole attempt chain (including backoff waits), so
 * a rate-limited burst throttles itself instead of retrying into the same wall.
 */
async function tmdbFetch(url: string, init?: RequestInit): Promise<Response> {
  await acquireSlot();
  try {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(url, init);
      const retriable = response.status === 429 || response.status >= 500;
      if (!retriable || attempt >= MAX_ATTEMPTS - 1) return response;
      await wait(retryDelayMs(response, attempt));
    }
  } finally {
    releaseSlot();
  }
}

export type MediaSummary = {
  tmdbId: number;
  type: MediaType;
  title: string;
  director: NamedRef[];
  releaseDate: string | null;
  coverUrl: string | null;
  overview: string;
  voteAverage: number;
};

export type CatalogItem = MediaSummary & {
  backdropUrl: string | null;
  voteCount: number;
};

function posterUrl(path: string | null): string | null {
  return path ? `${IMAGE_BASE_URL}${path}` : null;
}

function backdropUrl(path: string | null): string | null {
  return path ? `${IMAGE_ORIGINAL_URL}${path}` : null;
}

// Billing order is TMDB's own, so the first entries are the leads - both the
// cast row and the recap's actor count rely on that ordering. Shows answer with
// `aggregate_credits`, where a person carries a list of roles across seasons
// rather than one character; the first is the one they are known for.
function toCastMember(person: any): CastMember {
  const character = person.character ?? person.roles?.[0]?.character ?? null;
  return {
    id: person.id,
    name: person.name,
    character: character || null,
    profileUrl: posterUrl(person.profile_path ?? null),
  };
}

function toMediaSummary(item: any): MediaSummary {
  return {
    tmdbId: item.id,
    type: item.media_type,
    title: item.title || item.name,
    director: [],
    releaseDate: item.release_date || item.first_air_date || null,
    coverUrl: posterUrl(item.poster_path),
    overview: item.overview,
    voteAverage: item.vote_average,
  };
}

// Search/discover/similar list endpoints don't return crew, only the detail
// endpoint does - fetched per-item so browse results and similar rows can
// show a director without pulling in full metadata for every card.
async function fetchDirectorsFor(tmdbId: number, type: MediaType): Promise<NamedRef[]> {
  try {
    if (type === 'tv') {
      const res = await tmdbFetch(`${BASE_URL}/tv/${tmdbId}`, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return data.created_by?.map((p: any) => ({ id: p.id, name: p.name })) || [];
    }
    const res = await tmdbFetch(`${BASE_URL}/movie/${tmdbId}/credits`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.crew?.filter((p: any) => p.job === 'Director').map((p: any) => ({ id: p.id, name: p.name })) || [];
  } catch {
    return [];
  }
}

async function withDirectors<T extends { tmdbId: number; type: MediaType; director: NamedRef[] }>(items: T[]): Promise<T[]> {
  await Promise.all(
    items.map(async (item) => {
      item.director = await fetchDirectorsFor(item.tmdbId, item.type);
    }),
  );
  return items;
}

export async function searchMedia(query: string): Promise<MediaSummary[]> {
  if (!query) return [];

  try {
    const res = await tmdbFetch(`${BASE_URL}/search/multi?query=${encodeURIComponent(query)}`, { headers });
    if (!res.ok) throw new Error('Failed to search media');
    const data = await res.json();

    return (data.results as any[])
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 10)
      .map(toMediaSummary);
  } catch (error) {
    console.error('TMDB Search Error:', error);
    throw error;
  }
}

let cachedMovieGenres: { id: number; name: string }[] | null = null;
let cachedMovieGenresAt = 0;
const GENRE_CACHE_MS = 1000 * 60 * 60 * 24;

async function getMovieGenresCached() {
  const now = Date.now();
  if (cachedMovieGenres && now - cachedMovieGenresAt < GENRE_CACHE_MS) {
    return cachedMovieGenres;
  }
  const res = await tmdbFetch(`${BASE_URL}/genre/movie/list`, { headers });
  if (!res.ok) throw new Error('Failed to fetch movie genres');
  const data = await res.json();
  cachedMovieGenres = data.genres || [];
  cachedMovieGenresAt = now;
  return cachedMovieGenres;
}

export type BrowseSearchResult =
  | (MediaSummary & { resultKey: string; resultType: 'movie' | 'tv' })
  | {
      resultKey: string;
      resultType: 'person';
      personId: number;
      title: string;
      knownForDepartment: string;
      subtitle: string;
      coverUrl: string | null;
    }
  | { resultKey: string; resultType: 'genre'; genreId: number; title: string; subtitle: string };

/**
 * Browse-only search: movies, TV, people, and movie genres (name substring
 * match). Does not replace searchMedia (Add/Edit flows stay movie/TV-only).
 */
export async function searchBrowse(query: string): Promise<BrowseSearchResult[]> {
  if (!query?.trim()) return [];

  const q = query.trim();
  const qLower = q.toLowerCase();

  try {
    const [multiRes, movieGenres] = await Promise.all([
      tmdbFetch(`${BASE_URL}/search/multi?query=${encodeURIComponent(q)}`, { headers }),
      getMovieGenresCached(),
    ]);

    if (!multiRes.ok) throw new Error('Failed to search browse');
    const data = await multiRes.json();

    const out: BrowseSearchResult[] = [];
    let movieTvCount = 0;
    let personCount = 0;

    for (const item of data.results || []) {
      if (item.media_type === 'movie' || item.media_type === 'tv') {
        if (movieTvCount >= 18) continue;
        movieTvCount++;
        out.push({
          resultKey: `${item.media_type}-${item.id}`,
          resultType: item.media_type,
          ...toMediaSummary(item),
          voteAverage: item.vote_average ?? 0,
        });
      } else if (item.media_type === 'person') {
        const dept = item.known_for_department || '';
        if (dept !== 'Directing' && dept !== 'Acting') continue;
        if (personCount >= 8) continue;
        personCount++;
        out.push({
          resultKey: `person-${item.id}`,
          resultType: 'person',
          personId: item.id,
          title: item.name,
          knownForDepartment: dept,
          subtitle: dept || 'Person',
          coverUrl: posterUrl(item.profile_path),
        });
      }
    }

    const seenGenreIds = new Set<number>();
    const genreMatches = (movieGenres || [])
      .filter((g) => g?.name && g.name.toLowerCase().includes(qLower))
      .sort((a, b) => {
        const aExact = a.name.toLowerCase() === qLower ? 0 : 1;
        const bExact = b.name.toLowerCase() === qLower ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8);

    for (const g of genreMatches) {
      if (seenGenreIds.has(g.id)) continue;
      seenGenreIds.add(g.id);
      out.push({ resultKey: `genre-${g.id}`, resultType: 'genre', genreId: g.id, title: g.name, subtitle: 'Genre' });
    }

    const mediaResults = out.filter(
      (item): item is Extract<BrowseSearchResult, { resultType: 'movie' | 'tv' }> =>
        item.resultType === 'movie' || item.resultType === 'tv',
    );
    await withDirectors(mediaResults);

    return out;
  } catch (error) {
    console.error('TMDB Browse Search Error:', error);
    throw error;
  }
}

/** How deep the stored billing goes - the row scrolls, so it can afford 20. */
const CAST_LIMIT = 20;

export type MediaMetadata = {
  tmdbId: number;
  type: MediaType;
  title: string;
  director: NamedRef[];
  releaseDate: string | null;
  coverUrl: string | null;
  overview: string;
  genres: NamedRef[];
  runtime: number;
  cast: CastMember[];
  availability: string[];
  number_of_seasons: number | null;
  number_of_episodes: number | null;
  tmdbStatus: string | null;
  voteAverage: number;
  imdbId: string | null;
  budget: number;
  revenue: number;
  tagline: string;
  productionCompanies: ProductionCompany[];
  voteCount: number;
};

export async function fetchMediaMetadata(
  tmdbId: number,
  type: MediaType = 'movie',
  countryCode = 'US',
): Promise<MediaMetadata | null> {
  if (!tmdbId) return null;

  try {
    const endpoint = type === 'tv' ? `tv/${tmdbId}` : `movie/${tmdbId}`;
    const res = await tmdbFetch(
      `${BASE_URL}/${endpoint}?append_to_response=credits,aggregate_credits,external_ids,watch/providers`,
      { headers },
    );
    if (!res.ok) throw new Error('Failed to fetch media details');
    const data = await res.json();

    let directors: NamedRef[] = [];
    let cast: CastMember[] = [];
    let availability: string[] = [];

    const results = data['watch/providers']?.results || {};
    const countryProviders = results[countryCode] || results.US;
    if (countryProviders?.flatrate) {
      availability = countryProviders.flatrate.map((p: any) => p.provider_name);
    }

    if (type === 'movie') {
      directors =
        data.credits?.crew
          ?.filter((person: any) => person.job === 'Director')
          .map((person: any) => ({ id: person.id, name: person.name })) || [];
      cast = data.credits?.cast?.slice(0, CAST_LIMIT).map(toCastMember) || [];
    } else {
      directors = data.created_by?.map((p: any) => ({ id: p.id, name: p.name })) || [];
      const credits = data.aggregate_credits || data.credits;
      cast = credits?.cast?.slice(0, CAST_LIMIT).map(toCastMember) || [];
    }

    let runtime = 0;
    if (type === 'movie') {
      runtime = data.runtime || 0;
    } else if (data.episode_run_time?.length > 0) {
      runtime = Math.round(
        data.episode_run_time.reduce((a: number, b: number) => a + b, 0) / data.episode_run_time.length,
      );
    }

    return {
      tmdbId: data.id,
      type,
      title: data.title || data.name,
      director: directors,
      releaseDate: data.release_date || data.first_air_date || null,
      coverUrl: posterUrl(data.poster_path),
      overview: data.overview || '',
      genres: data.genres ? data.genres.map((g: any) => ({ id: g.id, name: g.name })) : [],
      runtime,
      cast,
      availability,
      number_of_seasons: data.number_of_seasons || null,
      number_of_episodes: data.number_of_episodes || null,
      tmdbStatus: data.status || null,
      voteAverage: data.vote_average || 0,
      imdbId: data.external_ids?.imdb_id || null,
      budget: data.budget || 0,
      revenue: data.revenue || 0,
      tagline: data.tagline || '',
      productionCompanies: data.production_companies
        ? data.production_companies.map((c: any) => ({ id: c.id, name: c.name, logo: posterUrl(c.logo_path) }))
        : [],
      voteCount: data.vote_count || 0,
    };
  } catch (error) {
    console.error('TMDB Metadata Error:', error);
    throw error;
  }
}

export async function fetchMovieMetadata(tmdbId: number) {
  return fetchMediaMetadata(tmdbId, 'movie');
}

export async function fetchSeasonDetails(tmdbId: number, seasonNumber: number): Promise<any | null> {
  if (!tmdbId) return null;
  try {
    const res = await tmdbFetch(`${BASE_URL}/tv/${tmdbId}/season/${seasonNumber}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch season details');
    return await res.json();
  } catch (error) {
    console.warn('TMDB Season Fetch Error:', error);
    return null;
  }
}

export async function getTrending(): Promise<CatalogItem[]> {
  try {
    const res = await tmdbFetch(`${BASE_URL}/trending/all/week`, { headers });
    if (!res.ok) throw new Error('Failed to fetch trending');
    const data = await res.json();

    const items = (data.results as any[])
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item) => ({
        ...toMediaSummary(item),
        backdropUrl: backdropUrl(item.backdrop_path),
        voteCount: item.vote_count,
      }));
    await withDirectors(items);
    return items;
  } catch (error) {
    console.error('TMDB Trending Error:', error);
    return [];
  }
}

export async function getMovies(category = 'popular'): Promise<CatalogItem[]> {
  try {
    const res = await tmdbFetch(`${BASE_URL}/movie/${category}`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch movies: ${category}`);
    const data = await res.json();

    const items = (data.results as any[]).map((item) => ({
      tmdbId: item.id,
      type: 'movie' as const,
      title: item.title,
      director: [] as NamedRef[],
      releaseDate: item.release_date,
      coverUrl: posterUrl(item.poster_path),
      backdropUrl: backdropUrl(item.backdrop_path),
      overview: item.overview,
      voteAverage: item.vote_average,
      voteCount: item.vote_count,
    }));
    await withDirectors(items);
    return items;
  } catch (error) {
    console.error(`TMDB Get Movies Error (${category}):`, error);
    return [];
  }
}

export async function getTVShows(category = 'popular'): Promise<CatalogItem[]> {
  try {
    const res = await tmdbFetch(`${BASE_URL}/tv/${category}`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch TV shows: ${category}`);
    const data = await res.json();

    const items = (data.results as any[]).map((item) => ({
      tmdbId: item.id,
      type: 'tv' as const,
      title: item.name,
      director: [] as NamedRef[],
      releaseDate: item.first_air_date,
      coverUrl: posterUrl(item.poster_path),
      backdropUrl: backdropUrl(item.backdrop_path),
      overview: item.overview,
      voteAverage: item.vote_average,
      voteCount: item.vote_count,
    }));
    await withDirectors(items);
    return items;
  } catch (error) {
    console.error(`TMDB Get TV Error (${category}):`, error);
    return [];
  }
}

export type CalendarRelease = MediaSummary & { popularity: number };

// One page of the release calendar (US theatrical + limited, most popular first).
async function fetchCalendarPage(region: string, gte: string, lte: string, page: number) {
  const params = new URLSearchParams({
    include_adult: 'false',
    include_video: 'false',
    language: 'en-US',
    region,
    sort_by: 'popularity.desc',
    with_release_type: '2|3',
    'release_date.gte': gte,
    'release_date.lte': lte,
    page: String(page),
  });
  const res = await tmdbFetch(`${BASE_URL}/discover/movie?${params.toString()}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch release calendar');
  return res.json();
}

/**
 * Dated movie releases in a `[gte, lte]` window (YYYY-MM-DD), region-scoped and
 * sorted by popularity. Backs both the month grid and the whole-year "most
 * anticipated" rail. Capped at 5 pages (~100 titles) per window.
 */
export async function getMovieReleaseRange(gte: string, lte: string, region = 'US'): Promise<CalendarRelease[]> {
  try {
    const first = await fetchCalendarPage(region, gte, lte, 1);
    let results: any[] = first.results ?? [];
    const totalPages = Math.min(first.total_pages ?? 1, 5);
    if (totalPages > 1) {
      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) => fetchCalendarPage(region, gte, lte, i + 2)),
      );
      results = results.concat(...rest.map((r) => r.results ?? []));
    }

    const seen = new Set<number>();
    return results
      .filter((item) => {
        if (!item.release_date || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .map((item) => ({
        ...toMediaSummary({ ...item, media_type: 'movie' }),
        popularity: item.popularity ?? 0,
      }));
  } catch (error) {
    console.error('TMDB Release Range Error:', error);
    return [];
  }
}

// Release calendar for a single month (`month` is 1-12).
export function getMovieReleaseCalendar(year: number, month: number, region = 'US'): Promise<CalendarRelease[]> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return getMovieReleaseRange(`${year}-${pad(month)}-01`, `${year}-${pad(month)}-${pad(lastDay)}`, region);
}

export type PersonDetails = {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  placeOfBirth: string | null;
  profileUrl: string | null;
  knownForDepartment: string | null;
  popularity: number;
};

async function fetchPersonDetails(personId: number, label: string): Promise<PersonDetails | null> {
  if (!personId) return null;
  try {
    const res = await tmdbFetch(`${BASE_URL}/person/${personId}`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch ${label} details`);
    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      biography: data.biography || '',
      birthday: data.birthday || null,
      placeOfBirth: data.place_of_birth || null,
      profileUrl: posterUrl(data.profile_path),
      knownForDepartment: data.known_for_department || null,
      popularity: data.popularity || 0,
    };
  } catch (error) {
    console.error(`TMDB ${label} Details Error:`, error);
    throw error;
  }
}

export async function fetchDirectorDetails(personId: number) {
  return fetchPersonDetails(personId, 'director');
}

export async function fetchActorDetails(personId: number) {
  return fetchPersonDetails(personId, 'actor');
}

/**
 * Headshots for a handful of people at once, keyed by id. A person TMDB has no
 * photo for - or that the request failed on - comes back null rather than
 * throwing: the caller draws a monogram instead, and one dead lookup must not
 * cost the other four.
 */
export async function fetchPersonImages(personIds: number[]): Promise<Record<number, string | null>> {
  const unique = [...new Set(personIds.filter((id) => !!id))];
  const found = await Promise.all(
    unique.map(async (id) => {
      try {
        const person = await fetchPersonDetails(id, 'actor');
        return [id, person?.profileUrl ?? null] as const;
      } catch {
        return [id, null] as const;
      }
    }),
  );
  return Object.fromEntries(found);
}

export type CreditItem = {
  tmdbId: number;
  type: 'movie';
  title: string;
  releaseDate: string | null;
  coverUrl: string | null;
  overview: string;
  voteAverage: number;
  voteCount: number;
};

export async function fetchDirectorMovies(personId: number): Promise<CreditItem[]> {
  if (!personId) return [];
  try {
    const res = await tmdbFetch(`${BASE_URL}/person/${personId}/movie_credits`, { headers });
    if (!res.ok) throw new Error('Failed to fetch director movies');
    const data = await res.json();

    return (
      data.crew
        ?.filter((movie: any) => movie.job === 'Director')
        .map((movie: any) => ({
          tmdbId: movie.id,
          type: 'movie' as const,
          title: movie.title,
          releaseDate: movie.release_date || null,
          coverUrl: posterUrl(movie.poster_path),
          overview: movie.overview || '',
          voteAverage: movie.vote_average || 0,
          voteCount: movie.vote_count || 0,
        })) || []
    );
  } catch (error) {
    console.error('TMDB Director Movies Error:', error);
    return [];
  }
}

export async function searchDirectors(query: string) {
  if (!query) return [];
  try {
    const res = await tmdbFetch(`${BASE_URL}/search/person?query=${encodeURIComponent(query)}`, { headers });
    if (!res.ok) throw new Error('Failed to search directors');
    const data = await res.json();

    return (data.results as any[])
      .filter((person) => person.known_for_department === 'Directing')
      .slice(0, 10)
      .map((person) => ({
        id: person.id,
        name: person.name,
        profileUrl: posterUrl(person.profile_path),
        knownForDepartment: person.known_for_department,
      }));
  } catch (error) {
    console.error('TMDB Search Directors Error:', error);
    return [];
  }
}

export type PaginatedCredits = { movies: (CreditItem & { character?: string; popularity?: number })[]; totalPages: number; totalCount: number };

export async function fetchActorMovies(personId: number, page = 1): Promise<PaginatedCredits> {
  if (!personId) return { movies: [], totalPages: 1, totalCount: 0 };
  try {
    const res = await tmdbFetch(`${BASE_URL}/person/${personId}/movie_credits`, { headers });
    if (!res.ok) throw new Error('Failed to fetch actor movies');
    const data = await res.json();

    const allMovies = (
      data.cast?.map((movie: any) => ({
        tmdbId: movie.id,
        type: 'movie' as const,
        title: movie.title,
        releaseDate: movie.release_date || null,
        coverUrl: posterUrl(movie.poster_path),
        overview: movie.overview || '',
        voteAverage: movie.vote_average || 0,
        voteCount: movie.vote_count || 0,
        character: movie.character || '',
        popularity: movie.popularity || 0,
      })) || []
    ).sort((a: any, b: any) => b.popularity - a.popularity);

    const pageSize = 20;
    const totalPages = Math.ceil(allMovies.length / pageSize);
    const startIndex = (page - 1) * pageSize;
    const movies = allMovies.slice(startIndex, startIndex + pageSize);

    return { movies, totalPages, totalCount: allMovies.length };
  } catch (error) {
    console.error('TMDB Actor Movies Error:', error);
    return { movies: [], totalPages: 1, totalCount: 0 };
  }
}

export type GenreMoviesResult = { movies: CreditItem[]; totalPages: number; totalCount: number };

export async function fetchGenreMovies(genreId: number, page = 1): Promise<GenreMoviesResult> {
  if (!genreId) return { movies: [], totalPages: 1, totalCount: 0 };
  try {
    const res = await tmdbFetch(
      `${BASE_URL}/discover/movie?with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=100&page=${page}`,
      { headers },
    );
    if (!res.ok) throw new Error('Failed to fetch genre movies');
    const data = await res.json();

    const movies = (data.results as any[]).map((movie) => ({
      tmdbId: movie.id,
      type: 'movie' as const,
      title: movie.title,
      releaseDate: movie.release_date || null,
      coverUrl: posterUrl(movie.poster_path),
      overview: movie.overview || '',
      voteAverage: movie.vote_average || 0,
      voteCount: movie.vote_count || 0,
    }));

    return { movies, totalPages: data.total_pages, totalCount: data.total_results };
  } catch (error) {
    console.error('TMDB Genre Movies Error:', error);
    return { movies: [], totalPages: 1, totalCount: 0 };
  }
}

export type CompanyDetails = { id: number; name: string; logoUrl: string | null };

export async function fetchCompanyDetails(companyId: number): Promise<CompanyDetails | null> {
  if (!companyId) return null;
  try {
    const res = await tmdbFetch(`${BASE_URL}/company/${companyId}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch company');
    const data = await res.json();
    return { id: data.id, name: data.name, logoUrl: posterUrl(data.logo_path) };
  } catch (error) {
    console.error('TMDB Company Details Error:', error);
    return null;
  }
}

// Titles produced by one studio (mirrors fetchGenreMovies, discover by company).
export async function fetchCompanyMovies(companyId: number, page = 1): Promise<GenreMoviesResult> {
  if (!companyId) return { movies: [], totalPages: 1, totalCount: 0 };
  try {
    const res = await tmdbFetch(
      `${BASE_URL}/discover/movie?with_companies=${companyId}&sort_by=vote_average.desc&vote_count.gte=100&page=${page}`,
      { headers },
    );
    if (!res.ok) throw new Error('Failed to fetch company movies');
    const data = await res.json();

    const movies = (data.results as any[]).map((movie) => ({
      tmdbId: movie.id,
      type: 'movie' as const,
      title: movie.title,
      releaseDate: movie.release_date || null,
      coverUrl: posterUrl(movie.poster_path),
      overview: movie.overview || '',
      voteAverage: movie.vote_average || 0,
      voteCount: movie.vote_count || 0,
    }));

    return { movies, totalPages: data.total_pages, totalCount: data.total_results };
  } catch (error) {
    console.error('TMDB Company Movies Error:', error);
    return { movies: [], totalPages: 1, totalCount: 0 };
  }
}

export async function fetchSimilarMedia(tmdbId: number, type: MediaType = 'movie'): Promise<MediaSummary[]> {
  if (!tmdbId) return [];
  try {
    const endpoint = type === 'tv' ? `tv/${tmdbId}/similar` : `movie/${tmdbId}/similar`;
    const res = await tmdbFetch(`${BASE_URL}/${endpoint}`, { headers });
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error('Failed to fetch similar media');
    }
    const data = await res.json();

    const items = (data.results as any[]).slice(0, 12).map((item) => ({
      tmdbId: item.id,
      type,
      title: item.title || item.name,
      director: [] as NamedRef[],
      releaseDate: item.release_date || item.first_air_date || null,
      coverUrl: posterUrl(item.poster_path),
      overview: item.overview || '',
      voteAverage: item.vote_average || 0,
    }));
    await withDirectors(items);
    return items;
  } catch (error) {
    console.error('TMDB Similar Media Error:', error);
    return [];
  }
}

export const getSimilarMovies = fetchSimilarMedia;

export async function getMoviesByGenre(genreId: number, type: MediaType = 'movie'): Promise<CatalogItem[]> {
  if (!genreId) return [];
  try {
    const endpoint = type === 'tv' ? 'discover/tv' : 'discover/movie';
    const res = await tmdbFetch(`${BASE_URL}/${endpoint}?with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=100`, {
      headers,
    });
    if (!res.ok) throw new Error('Failed to fetch genre movies');
    const data = await res.json();

    const items = (data.results as any[]).slice(0, 20).map((item) => ({
      tmdbId: item.id,
      type,
      title: item.title || item.name,
      director: [] as NamedRef[],
      releaseDate: item.release_date || item.first_air_date || null,
      coverUrl: posterUrl(item.poster_path),
      backdropUrl: backdropUrl(item.backdrop_path),
      overview: item.overview || '',
      voteAverage: item.vote_average || 0,
      voteCount: item.vote_count || 0,
    }));
    await withDirectors(items);
    return items;
  } catch (error) {
    console.error('TMDB Genre Movies Error:', error);
    return [];
  }
}

export type Genre = { id: number; name: string };

export async function getGenres(type: MediaType = 'movie'): Promise<Genre[]> {
  try {
    const endpoint = type === 'tv' ? 'genre/tv/list' : 'genre/movie/list';
    const res = await tmdbFetch(`${BASE_URL}/${endpoint}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch genres');
    const data = await res.json();
    return data.genres;
  } catch (error) {
    console.error('TMDB Genres Error:', error);
    return [];
  }
}
