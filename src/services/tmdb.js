const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const ACCESS_TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN;

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

const headers = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  Accept: "application/json",
};

export async function searchMovies(query) {
  if (!query) return [];

  try {
    const res = await fetch(`${BASE_URL}/search/movie?query=${encodeURIComponent(query)}`, {
      headers,
    });
    
    if (!res.ok) throw new Error("Failed to search movies");
    const data = await res.json();
    
    return data.results.slice(0, 5).map(item => ({
      tmdbId: item.id,
      title: item.title,
      // Director is not available in search results usually, leaving empty until detail fetch
      director: [],
      releaseDate: item.release_date,
      coverUrl: item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : null,
      overview: item.overview,
    }));
  } catch (error) {
    console.error("TMDB Search Error:", error);
    throw error;
  }
}

export async function fetchMovieMetadata(tmdbId) {
  if (!tmdbId) return null;

  try {
    const res = await fetch(`${BASE_URL}/movie/${tmdbId}?append_to_response=credits`, {
      headers,
    });

    if (!res.ok) throw new Error("Failed to fetch movie details");
    const data = await res.json();

    // specific logic to extract Director(s)
    const directors = data.credits?.crew
        ?.filter(person => person.job === "Director")
        .map(person => person.name) || [];

    return {
      tmdbId: data.id,
      title: data.title,
      director: directors,
      releaseDate: data.release_date,
      coverUrl: data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : null,
      overview: data.overview,
      genres: data.genres ? data.genres.map(g => g.name) : [],
      runtime: data.runtime,
    };
  } catch (error) {
    console.error("TMDB Metadata Error:", error);
    throw error;
  }
}
