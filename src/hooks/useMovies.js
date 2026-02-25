import { useEffect, useState } from "react";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { db } from "../lib/firebase";
import { useAuth } from "../features/auth/AuthContext";
import { migrateStatus } from "../lib/movieStatus";

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
                    .map(([key, value]) => {
                        // Migrate old status to new boolean flags
                        const statusFlags = migrateStatus(value);
                        return {
                            id: key,
                            ...value,
                            ...statusFlags,
                        };
                    })
                    .filter((movie) => movie.title); // basic validation to filter out ghost nodes/corrupt data
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

    const logActivity = async (
        movieId,
        movieTitle,
        activityType,
        details = {},
    ) => {
        if (!user) return;
        const activityRef = ref(db, `users/${user.uid}/activity`);
        const newActivityRef = push(activityRef);
        await set(newActivityRef, {
            movieId,
            movieTitle,
            type: activityType, // 'added', 'updated', 'status_changed', 'rating_changed', 'removed'
            timestamp: Date.now(),
            ...details,
        });
    };

    const addMovie = async (movieData) => {
        if (!user) return;
        const moviesRef = ref(db, `users/${user.uid}/movies`);
        const newMovieRef = push(moviesRef);
        const movieId = newMovieRef.key;

        await set(newMovieRef, {
            ...movieData,
            addedAt: movieData.addedAt || Date.now(),
        });

        // Log activity
        await logActivity(movieId, movieData.title, "added", {
            mediaType: movieData.type || "movie",
            status: movieData.status || "Watchlist",
        });
    };

    const updateMovie = async (movieId, updates) => {
        if (!user) return;

        // Get current movie data to compare changes
        const currentMovie = movies.find((m) => m.id === movieId);

        const movieRef = ref(db, `users/${user.uid}/movies/${movieId}`);
        await update(movieRef, {
            ...updates,
            updatedAt: Date.now(),
        });

        // Determine what changed and log appropriate activity
        if (currentMovie) {
            const activityDetails = {
                mediaType: currentMovie.type || "movie",
            };

            let activityLogged = false;

            // Priority 1: Check if movie was completed (watched flag changed to true)
            const oldWatched = currentMovie.watched;
            const newWatched = updates.watched;
            if (
                newWatched !== undefined &&
                newWatched === true &&
                !oldWatched
            ) {
                await logActivity(movieId, currentMovie.title, "completed", {
                    ...activityDetails,
                    timesWatched: updates.timesWatched || 1,
                });
                activityLogged = true;
            }

            // Priority 2: Check if started watching (inProgress changed to true)
            const oldInProgress = currentMovie.inProgress;
            const newInProgress = updates.inProgress;
            if (
                !activityLogged &&
                newInProgress !== undefined &&
                newInProgress === true &&
                !oldInProgress
            ) {
                await logActivity(
                    movieId,
                    currentMovie.title,
                    "started_watching",
                    activityDetails,
                );
                activityLogged = true;
            }

            // Priority 3: Check if added to watchlist (inWatchlist changed to true)
            const oldInWatchlist = currentMovie.inWatchlist;
            const newInWatchlist = updates.inWatchlist;
            if (
                !activityLogged &&
                newInWatchlist !== undefined &&
                newInWatchlist === true &&
                !oldInWatchlist
            ) {
                await logActivity(
                    movieId,
                    currentMovie.title,
                    "added_to_watchlist",
                    activityDetails,
                );
                activityLogged = true;
            }

            // Priority 4: Check for status string changes (backward compatibility)
            const oldStatus = currentMovie.status;
            const newStatus = updates.status;
            if (!activityLogged && newStatus && newStatus !== oldStatus) {
                await logActivity(
                    movieId,
                    currentMovie.title,
                    "status_changed",
                    {
                        ...activityDetails,
                        oldStatus,
                        newStatus,
                    },
                );
                activityLogged = true;
            }

            // Priority 5: Check for rating changes (can happen alongside other changes)
            if (
                updates.ratings &&
                updates.ratings.overall &&
                updates.ratings.overall > 0 &&
                updates.ratings.overall !== currentMovie.ratings?.overall
            ) {
                await logActivity(
                    movieId,
                    currentMovie.title,
                    "rating_changed",
                    {
                        ...activityDetails,
                        rating: updates.ratings.overall,
                    },
                );
                activityLogged = true;
            }

            // If nothing specific was logged but there were updates, log a generic update
            if (!activityLogged && Object.keys(updates).length > 1) {
                // More than just updatedAt
                await logActivity(
                    movieId,
                    currentMovie.title,
                    "updated",
                    activityDetails,
                );
            }
        }
    };

    const removeMovie = async (movieId) => {
        if (!user) return;

        // Get movie title before removing
        const movie = movies.find((m) => m.id === movieId);

        const movieRef = ref(db, `users/${user.uid}/movies/${movieId}`);
        await remove(movieRef);

        // Log activity
        if (movie) {
            await logActivity(movieId, movie.title, "removed", {
                mediaType: movie.type || "movie",
            });
        }
    };

    return { movies, loading, addMovie, updateMovie, removeMovie };
}
