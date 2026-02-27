import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Search, Check, Calendar, Film, Trash } from "lucide-react";
import { ref, update } from "firebase/database";
import { db } from "../lib/firebase";
import { useMovies } from "../hooks/useMovies";
import { isWatched } from "../lib/movieStatus";
import { Navbar } from "../components/layout/Navbar";
import { BottomNav } from "../components/layout/BottomNav";
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
        <div className="min-h-screen bg-black pb-24">
            <Navbar />

            <div className="relative">
                {/* Back Button */}
                <div className="absolute top-4 right-4 z-20">
                    <button
                        onClick={() => navigate("/stats")}
                        className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                </div>

                {/* Hero Section */}
                <div className="relative h-[10vh] w-full overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6 z-10">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex items-center gap-3 mb-1">
                                <Calendar className="text-blue-500" size={28} />
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight drop-shadow-lg">
                                    {selectedDate.toLocaleDateString("en-US", {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </h1>
                            </div>
                            <p className="text-base text-neutral-300 drop-shadow-md flex items-center gap-2">
                                <Film size={18} className="text-neutral-400" />
                                {moviesOnThisDay.length}{" "}
                                {moviesOnThisDay.length === 1
                                    ? "movie"
                                    : "movies"}{" "}
                                watched
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
                    {/* Movies on this day */}
                    {moviesOnThisDay.length > 0 && (
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">
                                Movies Watched
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {moviesOnThisDay.map((movie) => (
                                    <div
                                        key={movie.id}
                                        className="group relative bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 hover:border-neutral-700 transition-all"
                                    >
                                        <Link
                                            to={`/edit/${movie.id}`}
                                            className="block"
                                        >
                                            <div className="aspect-2/3 bg-neutral-800 relative">
                                                {movie.coverUrl ? (
                                                    <img
                                                        src={movie.coverUrl}
                                                        alt={movie.title}
                                                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                                        <span className="text-xs text-center p-2">
                                                            {movie.title}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 opacity-100" />

                                                <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 opacity-100">
                                                    <p className="text-xs font-semibold line-clamp-2">
                                                        {movie.title}
                                                    </p>
                                                    {movie.releaseDate && (
                                                        <p className="text-xs text-neutral-400">
                                                            {movie.releaseDate.substring(
                                                                0,
                                                                4,
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                        <button
                                            onClick={() =>
                                                setMovieToRemove(movie)
                                            }
                                            className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors opacity-100 group-hover:opacity-100 z-10 md:opacity-0"
                                            title="Remove from this date"
                                        >
                                            <Trash
                                                size={14}
                                            />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Add movies section */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">
                            Add Movies to This Date
                        </h2>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                            <input
                                type="text"
                                placeholder="Search your watched movies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>

                        {selectedMovies.length > 0 && (
                            <div className="flex items-center justify-between bg-blue-600/10 border border-blue-600/30 rounded-xl p-4">
                                <span className="text-blue-400 font-medium">
                                    {selectedMovies.length} movie
                                    {selectedMovies.length !== 1
                                        ? "s"
                                        : ""}{" "}
                                    selected
                                </span>
                                <button
                                    onClick={handleAddMovies}
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-blue-500/20"
                                >
                                    {saving ? "Adding..." : "Add to Date"}
                                </button>
                            </div>
                        )}

                        {searchQuery && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {filteredMovies.length === 0 ? (
                                    <p className="text-neutral-500 col-span-full text-center py-8">
                                        No movies found
                                    </p>
                                ) : (
                                    filteredMovies.slice(0, 50).map((movie) => {
                                        const isSelected =
                                            selectedMovies.includes(movie.id);
                                        const isOnThisDay =
                                            moviesOnThisDay.some(
                                                (m) => m.id === movie.id,
                                            );

                                        return (
                                            <button
                                                key={movie.id}
                                                onClick={() =>
                                                    !isOnThisDay &&
                                                    toggleMovieSelection(
                                                        movie.id,
                                                    )
                                                }
                                                disabled={isOnThisDay}
                                                className={`bg-neutral-900 border rounded-lg overflow-hidden text-left transition-all ${
                                                    isOnThisDay
                                                        ? "border-neutral-800 opacity-50 cursor-not-allowed"
                                                        : isSelected
                                                        ? "border-blue-600 ring-2 ring-blue-600/50"
                                                        : "border-neutral-800 hover:border-neutral-700 hover:scale-105"
                                                }`}
                                            >
                                                <div className="aspect-2/3 bg-neutral-800 relative">
                                                    {movie.coverUrl ? (
                                                        <img
                                                            src={movie.coverUrl}
                                                            alt={movie.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                                            <span className="text-xs text-center p-2">
                                                                {movie.title}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
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
                                                <div className="p-2">
                                                    <h3 className="font-semibold text-white text-xs mb-1 truncate">
                                                        {movie.title}
                                                    </h3>
                                                    <p className="text-xs text-neutral-500">
                                                        {movie.releaseDate?.substring(
                                                            0,
                                                            4,
                                                        ) || "N/A"}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {!searchQuery && (
                            <div className="text-center py-12 text-neutral-500">
                                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Search for movies to add to this date</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
            <BottomNav />

            {/* Remove Confirmation Modal */}
            {movieToRemove && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-2">
                            Remove Movie?
                        </h3>
                        <p className="text-sm text-neutral-400 mb-6">
                            Remove "{movieToRemove.title}" from{" "}
                            {selectedDate.toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                            })}
                            ?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setMovieToRemove(null)}
                                disabled={removing}
                                className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors disabled:opacity-50 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() =>
                                    handleRemoveMovie(movieToRemove.id)
                                }
                                disabled={removing}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors disabled:opacity-50 font-semibold shadow-lg shadow-red-500/20"
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
