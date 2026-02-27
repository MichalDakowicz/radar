const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const ACCESS_TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN;

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const IMAGE_ORIGINAL_URL = "https://image.tmdb.org/t/p/original";

const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    Accept: "application/json",
};

export async function searchMedia(query) {
    if (!query) return [];

    try {
        const res = await fetch(
            `${BASE_URL}/search/multi?query=${encodeURIComponent(query)}`,
            {
                headers,
            },
        );

        if (!res.ok) throw new Error("Failed to search media");
        const data = await res.json();

        // Filter for movies and tv shows only
        return data.results
            .filter(
                (item) =>
                    item.media_type === "movie" || item.media_type === "tv",
            )
            .slice(0, 10)
            .map((item) => ({
                tmdbId: item.id,
                type: item.media_type,
                title: item.title || item.name,
                // Director is not available in search results usually, leaving empty until detail fetch
                director: [],
                releaseDate: item.release_date || item.first_air_date,
                coverUrl: item.poster_path
                    ? `${IMAGE_BASE_URL}${item.poster_path}`
                    : null,
                overview: item.overview,
                voteAverage: item.vote_average,
            }));
    } catch (error) {
        console.error("TMDB Search Error:", error);
        throw error;
    }
}

// Deprecated: Alias for backward compatibility if needed, using searchMedia preferrably
export async function searchMovies(query) {
    return searchMedia(query);
}

export async function fetchMediaMetadata(tmdbId, type = "movie") {
    if (!tmdbId) return null;

    try {
        const endpoint = type === "tv" ? `tv/${tmdbId}` : `movie/${tmdbId}`;
        const res = await fetch(
            `${BASE_URL}/${endpoint}?append_to_response=credits,aggregate_credits,external_ids,watch/providers`,
            {
                headers,
            },
        );

        if (!res.ok) throw new Error("Failed to fetch media details");
        const data = await res.json();

        let directors = [];
        let cast = [];
        let availability = [];

        // Extract Watch Providers (US Default)
        if (
            data["watch/providers"] &&
            data["watch/providers"].results &&
            data["watch/providers"].results.US
        ) {
            const usProviders = data["watch/providers"].results.US;
            // Collect streaming services (flatrate)
            if (usProviders.flatrate) {
                availability = usProviders.flatrate.map((p) => p.provider_name);
            }
        }

        if (type === "movie") {
            directors =
                data.credits?.crew
                    ?.filter((person) => person.job === "Director")
                    .map((person) => ({ id: person.id, name: person.name })) ||
                [];
            cast = data.credits?.cast?.slice(0, 5).map((p) => p.name) || [];
        } else {
            // For TV, use created_by or explicit creators.
            // Note: TV shows might not have a "Director" per se for the whole show.
            // We can use 'created_by' as the primary attribution.
            directors =
                data.created_by?.map((p) => ({ id: p.id, name: p.name })) || [];

            // aggregate_credits is better for TV shows to get main cast across seasons
            const credits = data.aggregate_credits || data.credits;
            cast = credits?.cast?.slice(0, 5).map((p) => p.name) || [];
        }

        // Runtime logic
        let runtime = 0;
        if (type === "movie") {
            runtime = data.runtime || 0;
        } else {
            // TV shows give an array of runtimes usually
            if (data.episode_run_time?.length > 0) {
                runtime = Math.round(
                    data.episode_run_time.reduce((a, b) => a + b, 0) /
                        data.episode_run_time.length,
                );
            }
        }

        return {
            tmdbId: data.id,
            type: type,
            title: data.title || data.name,
            director: directors,
            releaseDate: data.release_date || data.first_air_date || null,
            coverUrl: data.poster_path
                ? `${IMAGE_BASE_URL}${data.poster_path}`
                : null,
            overview: data.overview || "",
            genres: data.genres ? data.genres.map((g) => g.name) : [],
            runtime: runtime,
            cast: cast,
            availability: availability,
            number_of_seasons: data.number_of_seasons || null,
            number_of_episodes: data.number_of_episodes || null,
            status: data.status || null,
            voteAverage: data.vote_average || 0,
            imdbId: data.external_ids?.imdb_id || null,
            budget: data.budget || 0,
            revenue: data.revenue || 0,
            tagline: data.tagline || "",
            productionCompanies: data.production_companies
                ? data.production_companies.map((c) => ({
                      name: c.name,
                      logo: c.logo_path
                          ? `${IMAGE_BASE_URL}${c.logo_path}`
                          : null,
                  }))
                : [],
            voteCount: data.vote_count || 0,
        };
    } catch (error) {
        console.error("TMDB Metadata Error:", error);
        throw error;
    }
}

export async function fetchSeasonDetails(tmdbId, seasonNumber) {
    if (!tmdbId) return null;
    try {
        const res = await fetch(
            `${BASE_URL}/tv/${tmdbId}/season/${seasonNumber}`,
            { headers },
        );
        if (!res.ok) throw new Error("Failed to fetch season details");
        const data = await res.json();
        return data;
    } catch (error) {
        console.warn("TMDB Season Fetch Error:", error);
        return null;
    }
}

// Get trending movies and TV shows
export async function getTrending() {
    try {
        const res = await fetch(`${BASE_URL}/trending/all/week`, { headers });
        if (!res.ok) throw new Error("Failed to fetch trending");
        const data = await res.json();

        return data.results
            .filter(
                (item) =>
                    item.media_type === "movie" || item.media_type === "tv",
            )
            .map((item) => ({
                tmdbId: item.id,
                type: item.media_type,
                title: item.title || item.name,
                director: [],
                releaseDate: item.release_date || item.first_air_date,
                coverUrl: item.poster_path
                    ? `${IMAGE_BASE_URL}${item.poster_path}`
                    : null,
                backdropUrl: item.backdrop_path
                    ? `${IMAGE_ORIGINAL_URL}${item.backdrop_path}`
                    : null,
                overview: item.overview,
                voteAverage: item.vote_average,
                voteCount: item.vote_count,
            }));
    } catch (error) {
        console.error("TMDB Trending Error:", error);
        return [];
    }
}

export async function getMovies(category = "popular") {
    try {
        const res = await fetch(`${BASE_URL}/movie/${category}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch movies: ${category}`);
        const data = await res.json();

        return data.results.map((item) => ({
            tmdbId: item.id,
            type: "movie",
            title: item.title,
            releaseDate: item.release_date,
            coverUrl: item.poster_path
                ? `${IMAGE_BASE_URL}${item.poster_path}`
                : null,
            backdropUrl: item.backdrop_path
                ? `${IMAGE_ORIGINAL_URL}${item.backdrop_path}`
                : null,
            overview: item.overview,
            voteAverage: item.vote_average,
            voteCount: item.vote_count,
        }));
    } catch (error) {
        console.error(`TMDB Get Movies Error (${category}):`, error);
        return [];
    }
}

export async function getTVShows(category = "popular") {
    try {
        const res = await fetch(`${BASE_URL}/tv/${category}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch TV shows: ${category}`);
        const data = await res.json();

        return data.results.map((item) => ({
            tmdbId: item.id,
            type: "tv",
            title: item.name,
            releaseDate: item.first_air_date,
            coverUrl: item.poster_path
                ? `${IMAGE_BASE_URL}${item.poster_path}`
                : null,
            backdropUrl: item.backdrop_path
                ? `${IMAGE_ORIGINAL_URL}${item.backdrop_path}`
                : null,
            overview: item.overview,
            voteAverage: item.vote_average,
            voteCount: item.vote_count,
        }));
    } catch (error) {
        console.error(`TMDB Get TV Error (${category}):`, error);
        return [];
    }
}

export async function fetchMovieMetadata(tmdbId) {
    return fetchMediaMetadata(tmdbId, "movie");
}

// Fetch director/person details
export async function fetchDirectorDetails(personId) {
    if (!personId) return null;

    try {
        const res = await fetch(`${BASE_URL}/person/${personId}`, { headers });
        if (!res.ok) throw new Error("Failed to fetch director details");
        const data = await res.json();

        return {
            id: data.id,
            name: data.name,
            biography: data.biography || "",
            birthday: data.birthday || null,
            placeOfBirth: data.place_of_birth || null,
            profileUrl: data.profile_path
                ? `${IMAGE_BASE_URL}${data.profile_path}`
                : null,
            knownForDepartment: data.known_for_department || null,
            popularity: data.popularity || 0,
        };
    } catch (error) {
        console.error("TMDB Director Details Error:", error);
        throw error;
    }
}

// Fetch movies directed by a person
export async function fetchDirectorMovies(personId) {
    if (!personId) return [];

    try {
        const res = await fetch(
            `${BASE_URL}/person/${personId}/movie_credits`,
            { headers },
        );
        if (!res.ok) throw new Error("Failed to fetch director movies");
        const data = await res.json();

        // Filter for directing credits only
        const directedMovies =
            data.crew
                ?.filter((movie) => movie.job === "Director")
                .map((movie) => ({
                    tmdbId: movie.id,
                    type: "movie",
                    title: movie.title,
                    releaseDate: movie.release_date || null,
                    coverUrl: movie.poster_path
                        ? `${IMAGE_BASE_URL}${movie.poster_path}`
                        : null,
                    overview: movie.overview || "",
                    voteAverage: movie.vote_average || 0,
                    voteCount: movie.vote_count || 0,
                })) || [];

        return directedMovies;
    } catch (error) {
        console.error("TMDB Director Movies Error:", error);
        return [];
    }
}

// Search for directors/people
export async function searchDirectors(query) {
    if (!query) return [];

    try {
        const res = await fetch(
            `${BASE_URL}/search/person?query=${encodeURIComponent(query)}`,
            { headers },
        );
        if (!res.ok) throw new Error("Failed to search directors");
        const data = await res.json();

        return data.results
            .filter((person) => person.known_for_department === "Directing")
            .slice(0, 10)
            .map((person) => ({
                id: person.id,
                name: person.name,
                profileUrl: person.profile_path
                    ? `${IMAGE_BASE_URL}${person.profile_path}`
                    : null,
                knownForDepartment: person.known_for_department,
            }));
    } catch (error) {
        console.error("TMDB Search Directors Error:", error);
        return [];
    }
}
