import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../lib/firebase";

// Global cache to persist data across component remounts
const globalPublicMoviesCache = new Map();

export function usePublicMovies(userId) {
  // Initialize from cache if available
  const [movies, setMovies] = useState(() => {
     return globalPublicMoviesCache.get(userId) || [];
  });
  
  // Only start loading if we didn't have data in cache
  const [loading, setLoading] = useState(() => {
      return !globalPublicMoviesCache.has(userId);
  });

  useEffect(() => {
    if (!userId) {
      setMovies([]);
      setLoading(false);
      return;
    }

    const moviesRef = ref(db, `users/${userId}/movies`);
    const unsubscribe = onValue(moviesRef, (snapshot) => {
      const data = snapshot.val();
      let loadedMovies = [];
      if (data) {
        loadedMovies = Object.entries(data)
          .map(([key, value]) => ({
            id: key,
            ...value,
          }))
          .filter(movie => movie.title); // basic validation
        // Sort by addedAt desc by default
        loadedMovies.sort((a, b) => b.addedAt - a.addedAt);
      } else {
        loadedMovies = [];
      }
      
      // Update cache
      globalPublicMoviesCache.set(userId, loadedMovies);
      
      setMovies(loadedMovies);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { movies, loading };
}
