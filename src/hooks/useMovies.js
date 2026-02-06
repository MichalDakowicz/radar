import { useEffect, useState } from "react";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { db } from "../lib/firebase";
import { useAuth } from "../features/auth/AuthContext";

export function useMovies() {
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMovies([]);
      setLoading(false);
      return;
    }

    const moviesRef = ref(db, `users/${user.uid}/movies`);
    const unsubscribe = onValue(moviesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedMovies = Object.entries(data)
          .map(([key, value]) => ({
            id: key,
            ...value,
          }))
          .filter(movie => movie.title); // basic validation to filter out ghost nodes/corrupt data
        // Sort by addedAt desc by default
        loadedMovies.sort((a, b) => b.addedAt - a.addedAt);
        setMovies(loadedMovies);
      } else {
        setMovies([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addMovie = async (movieData) => {
    if (!user) return;
    const moviesRef = ref(db, `users/${user.uid}/movies`);
    const newMovieRef = push(moviesRef);
    await set(newMovieRef, {
      ...movieData,
      addedAt: movieData.addedAt || Date.now(),
    });
  };

  const updateMovie = async (movieId, updates) => {
    if (!user) return;
    const movieRef = ref(db, `users/${user.uid}/movies/${movieId}`);
    await update(movieRef, updates);
  };

  const removeMovie = async (movieId) => {
    if (!user) return;
    const movieRef = ref(db, `users/${user.uid}/movies/${movieId}`);
    await remove(movieRef);
  };

  return { movies, loading, addMovie, updateMovie, removeMovie };
}
