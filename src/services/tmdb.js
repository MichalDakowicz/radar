// const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
// const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

// MOCK DATA for when TMDB is unavailable
const MOCK_MOVIES = [
  {
    id: 11,
    title: "Star Wars",
    poster_path: "/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
    overview: "Princess Leia is captured and held hostage by the evil Imperial forces in their effort to take over the galactic Empire. Venturesome Luke Skywalker and dashing captain Han Solo team together with the loveable robot duo R2-D2 and C-3PO to rescue the beautiful princess and restore peace and justice in the Empire.",
    release_date: "1977-05-25",
    director: "George Lucas",
    genres: [{name: "Adventure"}, {name: "Action"}, {name: "Science Fiction"}],
    runtime: 121
  },
  {
    id: 27205,
    title: "Inception",
    poster_path: "/8Z8dptZQl1q54ULlGe11JGa3cFO.jpg",
    overview: "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life as payment for a task considered to be impossible: \"inception\", the implantation of another person's idea into a target's subconscious.",
    release_date: "2010-07-15",
    director: "Christopher Nolan",
    genres: [{name: "Action"}, {name: "Science Fiction"}, {name: "Adventure"}],
    runtime: 148
  },
  {
      id: 155,
      title: "The Dark Knight",
      poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      overview: "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets. The partnership proves to be effective, but they soon find themselves prey to a reign of chaos unleashed by a rising criminal mastermind known to the terrified citizens of Gotham as the Joker.",
      release_date: "2008-07-14",
      director: "Christopher Nolan",
      genres: [{name: "Drama"}, {name: "Action"}, {name: "Crime"}, {name: "Thriller"}],
      runtime: 152
  },
  {
    id: 122,
    title: "The Lord of the Rings: The Return of the King", 
    poster_path: "/rCzpDGLbOoPwLjy3OAm5NUPOznC.jpg",
    overview: "Aragorn is revealed as the heir to the ancient kings as he, Gandalf and the other members of the broken fellowship struggle to save Gondor from Sauron's forces. Meanwhile, Frodo and Sam bring the ring closer to the heart of Mordor, the dark lord's realm.",
    release_date: "2003-12-01",
    director: "Peter Jackson",
    genres: [{name: "Adventure"}, {name: "Fantasy"}, {name: "Action"}],
    runtime: 201
  },
   {
    id: 238,
    title: "The Godfather",
    poster_path: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    overview: "Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family. When organized crime family patriarch, Vito Corleone barely survives an attempt on his life, his youngest son, Michael steps in to take care of the would-be killers, launching a campaign of bloody revenge.",
    release_date: "1972-03-14",
    director: "Francis Ford Coppola",
    genres: [{name: "Drama"}, {name: "Crime"}],
    runtime: 175
  },
    {
    id: 13,
    title: "Forrest Gump",
    poster_path: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
    overview: "A man with a low IQ has accomplished great things in his life and been present during significant historical events—in each case, far exceeding what anyone imagined he could do. But despite all he has achieved, his one true love eludes him.",
    release_date: "1994-06-23",
    director: "Robert Zemeckis",
    genres: [{name: "Comedy"}, {name: "Drama"}, {name: "Romance"}],
    runtime: 142
  }
];

export async function searchMovies(query) {
  console.log("Using Mock TMDB Service for:", query);
  await new Promise(resolve => setTimeout(resolve, 300)); // Network delay simulation

  if (!query) return [];
  const lowerQuery = query.toLowerCase();

  const results = MOCK_MOVIES.filter(m => m.title.toLowerCase().includes(lowerQuery));
  
  return results.slice(0, 5).map(item => ({
    tmdbId: item.id,
    title: item.title,
    director: [item.director], // Mock data has it
    releaseDate: item.release_date,
    coverUrl: item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : null,
    overview: item.overview,
  }));
}

export async function fetchMovieMetadata(tmdbId) {
  console.log("Using Mock TMDB Service for ID:", tmdbId);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (!tmdbId) return null;
  
  const movie = MOCK_MOVIES.find(m => m.id == tmdbId);

  if (!movie) {
      console.warn("Mock movie not found for ID:", tmdbId);
      throw new Error("Movie not found");
  }

    return {
      tmdbId: movie.id,
      title: movie.title,
      director: [movie.director],
      releaseDate: movie.release_date,
      coverUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : null,
      overview: movie.overview,
      genres: movie.genres ? movie.genres.map(g => g.name) : [],
      runtime: movie.runtime,
    };
}

/* 
// ORIGINAL IMPLEMENTATION (Disabled due to TMDB issues)
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";
// const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"; 

export async function searchMovies(query) {
  if (!query) return [];
  // Warning if no key, but don't crash
  if (!API_KEY) {
      console.warn("VITE_TMDB_API_KEY is missing in .env");
  }

  try {
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
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
    // Return empty vs throw - keeping consistent with old behavior which propagated error or handled it?
    // The old one threw error.
    throw error;
  }
}

export async function fetchMovieMetadata(tmdbId) {
  if (!tmdbId) return null;
  if (!API_KEY) {
     console.warn("VITE_TMDB_API_KEY is missing in .env");
  }

  try {
    const res = await fetch(`${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&append_to_response=credits`);

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
*/
