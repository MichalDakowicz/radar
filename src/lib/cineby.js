/**
 * Cineby play URLs and next-episode logic for TV shows.
 * Movie: https://www.cineby.gd/movie/{tmdbId}
 * TV:    https://www.cineby.gd/tv/{tmdbId}/{season}/{episode}?play=true
 */

export const CINEBY_LOGO_URL = "https://www.cineby.gd/logo.png";

/**
 * Parse episodesWatched keys (e.g. s1e1, s2e3) and return the next unwatched
 * season and episode. If no progress, returns { season: 1, episode: 1 }.
 * @param {Record<string, boolean>} episodesWatched - e.g. { s1e1: true, s1e2: true }
 * @param {number | null} number_of_seasons - max seasons (optional)
 * @returns {{ season: number, episode: number }}
 */
export function getNextEpisode(episodesWatched, number_of_seasons = null) {
    if (!episodesWatched || typeof episodesWatched !== "object") {
        return { season: 1, episode: 1 };
    }

    const watched = [];
    for (const key of Object.keys(episodesWatched)) {
        if (!episodesWatched[key]) continue;
        const match = key.match(/^s(\d+)e(\d+)$/i);
        if (match) {
            watched.push({
                season: parseInt(match[1], 10),
                episode: parseInt(match[2], 10),
            });
        }
    }

    if (watched.length === 0) return { season: 1, episode: 1 };

    // Sort by season then episode, take the highest
    watched.sort((a, b) => {
        if (a.season !== b.season) return a.season - b.season;
        return a.episode - b.episode;
    });
    const last = watched[watched.length - 1];

    // Next is same season next episode, or next season episode 1
    const nextEpisode = last.episode + 1;
    const nextSeason = last.season;

    // If we don't have season episode counts, assume next is next episode (could be same season or we'd need API)
    return { season: nextSeason, episode: nextEpisode };
}

/**
 * Build Cineby play URL for a movie or TV show.
 * For TV, uses next episode from episodesWatched when available; otherwise S1E1.
 * @param {{ type?: string, tmdbId?: number, episodesWatched?: Record<string, boolean>, number_of_seasons?: number }} movie
 * @returns {string | null} URL or null if no tmdbId
 */
export function getCinebyPlayUrl(movie) {
    if (!movie?.tmdbId) return null;
    const base = "https://www.cineby.gd";
    if (movie.type === "tv") {
        const { season, episode } = getNextEpisode(
            movie.episodesWatched,
            movie.number_of_seasons,
        );
        return `${base}/tv/${movie.tmdbId}/${season}/${episode}?play=true`;
    }
    return `${base}/movie/${movie.tmdbId}`;
}
