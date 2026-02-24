import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Search, Check } from "lucide-react";
import { ref, update } from "firebase/database";
import { db } from "../lib/firebase";
import { useMovies } from "../hooks/useMovies";
import { isWatched } from "../lib/movieStatus";
import { Navbar } from "../components/layout/Navbar";
import { useAuth } from "../features/auth/AuthContext";

export default function ManageCompletions() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const dateParam = searchParams.get("date");
    const selectedDate = dateParam ? new Date(dateParam) : new Date();

    const { movies } = useMovies();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMovies, setSelectedMovies] = useState([]);
    const [saving, setSaving] = useState(false);
    const [movieToRemove, setMovieToRemove] = useState(null);
    const [removing, setRemoving] = useState(false);

    const dateStr = `${selectedDate.getFullYear()}-${String(
        selectedDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

    const moviesOnThisDay = movies.filter((m) => {
        if (!m.completedAt && !m.completionDates) return false;

        // Support both old single date and new multiple dates
        if (m.completionDates && Array.isArray(m.completionDates)) {
            return m.completionDates.some((timestamp) => {
                const completedDate = new Date(timestamp);
                const completedStr = `${completedDate.getFullYear()}-${String(
                    completedDate.getMonth() + 1,
                ).padStart(2, "0")}-${String(completedDate.getDate()).padStart(
                    2,
                    "0",
                )}`;
                return completedStr === dateStr;
            });
        }

        // Fallback to old single date format
        if (m.completedAt) {
            const completedDate = new Date(
                m.completedAt?.seconds
                    ? m.completedAt.seconds * 1000
                    : m.completedAt,
            );
            const completedStr = `${completedDate.getFullYear()}-${String(
                completedDate.getMonth() + 1,
            ).padStart(2, "0")}-${String(completedDate.getDate()).padStart(
                2,
                "0",
            )}`;
            return completedStr === dateStr;
        }

        return false;
    });

    const watchedMovies = movies.filter((m) => isWatched(m));

    const filteredMovies = searchQuery
        ? watchedMovies.filter((m) =>
              m.title.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : [];

    const handleAddMovies = async () => {
        if (selectedMovies.length === 0 || !user) return;

        setSaving(true);
        try {
            const completedAtTimestamp = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                12,
                0,
                0,
            ).getTime();

            const updates = {};

            for (const movieId of selectedMovies) {
                const movie = movies.find((m) => m.id === movieId);

                // Get existing completion dates or create new array
                let completionDates = [];
                if (
                    movie.completionDates &&
                    Array.isArray(movie.completionDates)
                ) {
                    completionDates = [...movie.completionDates];
                } else if (movie.completedAt) {
                    // Migrate old single date to array
                    const oldDate = movie.completedAt?.seconds
                        ? movie.completedAt.seconds * 1000
                        : movie.completedAt;
                    completionDates = [oldDate];
                }

                // Add new date if not already present
                if (!completionDates.includes(completedAtTimestamp)) {
                    completionDates.push(completedAtTimestamp);
                }

                // Sort dates in descending order (newest first)
                completionDates.sort((a, b) => b - a);

                updates[`users/${user.uid}/movies/${movieId}/completionDates`] =
                    completionDates;
                updates[`users/${user.uid}/movies/${movieId}/completedAt`] =
                    completionDates[0]; // Keep most recent for backward compatibility
                updates[`users/${user.uid}/movies/${movieId}/updatedAt`] =
                    Date.now();
            }

            await update(ref(db), updates);

            setSelectedMovies([]);
            setSearchQuery("");
        } catch (error) {
            console.error("Failed to update completion dates:", error);
            alert("Failed to update completion dates");
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveMovie = async (movieId) => {
        if (!user) return;

        setRemoving(true);
        try {
            const completedAtTimestamp = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                12,
                0,
                0,
            ).getTime();

            const movie = movies.find((m) => m.id === movieId);
            const updates = {};

            if (movie.completionDates && Array.isArray(movie.completionDates)) {
                // Remove this specific date from the array
                const updatedDates = movie.completionDates.filter(
                    (date) => date !== completedAtTimestamp,
                );

                if (updatedDates.length > 0) {
                    // Still has other completion dates
                    updates[
                        `users/${user.uid}/movies/${movieId}/completionDates`
                    ] = updatedDates;
                    updates[`users/${user.uid}/movies/${movieId}/completedAt`] =
                        updatedDates[0]; // Most recent
                } else {
                    // No more completion dates, remove both fields
                    updates[
                        `users/${user.uid}/movies/${movieId}/completionDates`
                    ] = null;
                    updates[`users/${user.uid}/movies/${movieId}/completedAt`] =
                        null;
                }
            } else {
                // Old format - just remove completedAt
                updates[`users/${user.uid}/movies/${movieId}/completedAt`] =
                    null;
            }

            updates[`users/${user.uid}/movies/${movieId}/updatedAt`] =
                Date.now();

            await update(ref(db), updates);
            setMovieToRemove(null);
        } catch (error) {
            console.error("Failed to remove completion date:", error);
            alert("Failed to remove completion date");
        } finally {
            setRemoving(false);
        }
    };

    const toggleMovieSelection = (movieId) => {
        setSelectedMovies((prev) =>
            prev.includes(movieId)
                ? prev.filter((id) => id !== movieId)
                : [...prev, movieId],
        );
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100">
            <Navbar />

            <main className="mx-auto max-w-screen-xl px-4 sm:px-6 pt-6 pb-24">
                <div className="mb-6">
                    <button
                        onClick={() => navigate("/stats")}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <p className="text-zinc-400">
                            {selectedDate.toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </button>
                </div>

                {/* Movies on this day */}
                {moviesOnThisDay.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-xl font-semibold mb-4">
                            Movies on this day ({moviesOnThisDay.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {moviesOnThisDay.map((movie) => (
                                <div
                                    key={movie.id}
                                    className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-colors group"
                                >
                                    <Link
                                        to={`/edit/${movie.id}`}
                                        className="block"
                                    >
                                        <div className="aspect-[2/3] bg-zinc-800 relative">
                                            {movie.coverUrl ? (
                                                <img
                                                    src={movie.coverUrl}
                                                    alt={movie.title}
                                                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                    No poster
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                    <div className="p-4">
                                        <Link
                                            to={`/edit/${movie.id}`}
                                            className="block mb-3 hover:text-blue-400 transition-colors"
                                        >
                                            <h3 className="font-semibold text-white mb-1 truncate">
                                                {movie.title}
                                            </h3>
                                            <p className="text-sm text-zinc-500">
                                                {movie.releaseDate?.substring(
                                                    0,
                                                    4,
                                                ) || "N/A"}{" "}
                                                •{" "}
                                                {movie.type === "tv"
                                                    ? "TV Show"
                                                    : "Movie"}
                                            </p>
                                        </Link>
                                        <button
                                            onClick={() =>
                                                setMovieToRemove(movie)
                                            }
                                            className="w-full px-3 py-2 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md transition-colors"
                                        >
                                            Remove from this date
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Add movies section */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">
                        Add Movies to this Date
                    </h2>

                    <div className="mb-6 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search your watched movies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 text-white pl-12 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {selectedMovies.length > 0 && (
                        <div className="mb-6 flex items-center justify-between bg-emerald-600/10 border border-emerald-600/30 rounded-lg p-4">
                            <span className="text-emerald-400">
                                {selectedMovies.length} movie
                                {selectedMovies.length !== 1 ? "s" : ""}{" "}
                                selected
                            </span>
                            <button
                                onClick={handleAddMovies}
                                disabled={saving}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                {saving ? "Adding..." : "Add to Date"}
                            </button>
                        </div>
                    )}

                    {searchQuery && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMovies.length === 0 ? (
                                <p className="text-zinc-500 col-span-full text-center py-8">
                                    No movies found
                                </p>
                            ) : (
                                filteredMovies.slice(0, 50).map((movie) => {
                                    const isSelected = selectedMovies.includes(
                                        movie.id,
                                    );
                                    const isOnThisDay = moviesOnThisDay.some(
                                        (m) => m.id === movie.id,
                                    );

                                    return (
                                        <button
                                            key={movie.id}
                                            onClick={() =>
                                                !isOnThisDay &&
                                                toggleMovieSelection(movie.id)
                                            }
                                            disabled={isOnThisDay}
                                            className={`bg-zinc-900 border rounded-lg overflow-hidden text-left transition-all ${
                                                isOnThisDay
                                                    ? "border-zinc-800 opacity-50 cursor-not-allowed"
                                                    : isSelected
                                                    ? "border-emerald-600 ring-2 ring-emerald-600/50"
                                                    : "border-zinc-800 hover:border-zinc-700"
                                            }`}
                                        >
                                            <div className="aspect-[2/3] bg-zinc-800 relative">
                                                {movie.coverUrl ? (
                                                    <img
                                                        src={movie.coverUrl}
                                                        alt={movie.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                        No poster
                                                    </div>
                                                )}
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                                                        <Check className="w-5 h-5 text-white" />
                                                    </div>
                                                )}
                                                {isOnThisDay && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                        <span className="text-white text-sm font-medium">
                                                            Already added
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <h3 className="font-semibold text-white text-sm mb-1 truncate">
                                                    {movie.title}
                                                </h3>
                                                <p className="text-xs text-zinc-500">
                                                    {movie.releaseDate?.substring(
                                                        0,
                                                        4,
                                                    ) || "N/A"}{" "}
                                                    •{" "}
                                                    {movie.type === "tv"
                                                        ? "TV"
                                                        : "Movie"}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {!searchQuery && (
                        <div className="text-center py-12 text-zinc-500">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Search for movies to add to this date</p>
                        </div>
                    )}
                </section>
            </main>

            {/* Remove Confirmation Modal */}
            {movieToRemove && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-white mb-2">
                            Remove Movie?
                        </h3>
                        <p className="text-sm text-zinc-400 mb-6">
                            Are you sure you want to remove "
                            {movieToRemove.title}" from{" "}
                            {selectedDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            })}
                            ?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setMovieToRemove(null)}
                                disabled={removing}
                                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() =>
                                    handleRemoveMovie(movieToRemove.id)
                                }
                                disabled={removing}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                            >
                                {removing ? "Removing..." : "Remove"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
