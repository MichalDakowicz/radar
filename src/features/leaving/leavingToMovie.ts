import type { LeavingTitle } from '@/lib/leaving';
import type { Movie } from '@/types/movie';

const EPOCH = new Date(0).toISOString();

// Same trick as browse/toDiscoveryMovie: the shared MovieCard only speaks Movie,
// and a leaving-soon entry is not a library row. Display-only, never written,
// and `id` is a synthetic key so nothing mistakes it for a row id.
//
// A title the user already tracks keeps its real library id, so the card's
// add/remove state and the tap-through both land on the row they already have.
export function leavingToMovie(entry: LeavingTitle): Movie {
  return {
    id: entry.movieId ?? `leaving-${entry.mediaType}-${entry.tmdbId}`,
    userId: '',
    tmdbId: entry.tmdbId,
    imdbId: null,
    type: entry.mediaType,
    title: entry.title,
    director: [],
    cast: [],
    genres: [],
    releaseDate: entry.releaseYear ? `${entry.releaseYear}-01-01` : null,
    coverUrl: entry.posterUrl,
    backdropUrl: null,
    overview: '',
    runtime: 0,
    voteAverage: 0,
    voteCount: 0,
    tagline: '',
    budget: 0,
    revenue: 0,
    productionCompanies: [],
    numberOfSeasons: null,
    numberOfEpisodes: null,
    tmdbStatus: null,
    // The services it is leaving are not the services it is on — by the time
    // this matters they are the same set, but availability means "watch it
    // here" and would render as a recommendation. Left empty on purpose.
    availability: [],
    status: null,
    inWatchlist: false,
    inProgress: false,
    watched: entry.watched,
    timesWatched: 0,
    watchDates: [],
    completedAt: null,
    lastWatchedPosition: null,
    ratings: {},
    notes: '',
    url: '',
    addedAt: EPOCH,
    updatedAt: EPOCH,
    episodesWatched: {},
    episodeWatchDates: {},
    seasonEpisodeCounts: {},
  };
}
