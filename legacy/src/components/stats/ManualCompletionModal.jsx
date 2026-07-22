import { useState } from "react";
import { X } from "lucide-react";
import { ref, update } from "firebase/database";
import { db } from "../../lib/firebase";
import { useMovies } from "../../hooks/useMovies";
import { isWatched } from "../../lib/movieStatus";

export function ManualCompletionModal({
    isOpen,
    onClose,
    selectedDate,
    userId,
    onUpdate,
}) {
    const { movies } = useMovies();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMovies, setSelectedMovies] = useState([]);
    const [saving, setSaving] = useState(false);

    const dateStr = `${selectedDate.getFullYear()}-${String(
        selectedDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

    const moviesOnThisDay = movies.filter((m) => {
        if (!m.completedAt) return false;
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
    });

    const watchedMovies = movies.filter((m) => isWatched(m));

    const filteredMovies = searchQuery
        ? watchedMovies.filter((m) =>
              m.title.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : watchedMovies;

    const handleAddMovies = async () => {
        if (selectedMovies.length === 0) return;

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
            selectedMovies.forEach((movieId) => {
                updates[`users/${userId}/movies/${movieId}/completedAt`] =
                    completedAtTimestamp;
                updates[`users/${userId}/movies/${movieId}/updatedAt`] =
                    Date.now();
            });

            await update(ref(db), updates);

            setSelectedMovies([]);
            setSearchQuery("");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to update completion dates:", error);
            alert("Failed to update completion dates");
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveMovie = async (movieId) => {
        if (!confirm("Remove this movie from this date?")) return;

        try {
            await update(ref(db), {
                [`users/${userId}/movies/${movieId}/completedAt`]: null,
                [`users/${userId}/movies/${movieId}/updatedAt`]: Date.now(),
            });

            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to remove completion date:", error);
            alert("Failed to remove completion date");
        }
    };

    const toggleMovieSelection = (movieId) => {
        setSelectedMovies((prev) =>
            prev.includes(movieId)
                ? prev.filter((id) => id !== movieId)
                : [...prev, movieId],
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                            Manage Completions
                        </h3>
                        <p className="text-sm text-zinc-400">
                            {selectedDate.toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {moviesOnThisDay.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-zinc-300 mb-3">
                                Movies on this day ({moviesOnThisDay.length})
                            </h4>
                            <div className="space-y-2">
                                {moviesOnThisDay.map((movie) => (
                                    <div
                                        key={movie.id}
                                        className="flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 hover:bg-zinc-800 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">
                                                {movie.title}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {movie.releaseDate?.substring(
                                                    0,
                                                    4,
                                                ) || "N/A"}{" "}
                                                •{" "}
                                                {movie.type === "tv"
                                                    ? "TV Show"
                                                    : "Movie"}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                handleRemoveMovie(movie.id)
                                            }
                                            className="ml-3 px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-3">
                            Add Movies
                        </h4>

                        <div className="mb-3">
                            <input
                                type="text"
                                placeholder="Search watched movies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                            />
                        </div>

                        {selectedMovies.length > 0 && (
                            <div className="mb-3 text-xs text-emerald-400">
                                {selectedMovies.length} movie
                                {selectedMovies.length !== 1 ? "s" : ""}{" "}
                                selected
                            </div>
                        )}

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {filteredMovies.length === 0 ? (
                                <p className="text-sm text-zinc-500 text-center py-4">
                                    {searchQuery
                                        ? "No movies found"
                                        : "No watched movies available"}
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
                                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                                isOnThisDay
                                                    ? "bg-zinc-800/30 border-zinc-800 opacity-50 cursor-not-allowed"
                                                    : isSelected
                                                    ? "bg-emerald-600/20 border-emerald-600/50 hover:bg-emerald-600/30"
                                                    : "bg-zinc-800/30 border-zinc-700/50 hover:bg-zinc-800/50"
                                            }`}
                                        >
                                            <div
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                                                    isSelected
                                                        ? "bg-emerald-600 border-emerald-600"
                                                        : "border-zinc-600"
                                                }`}
                                            >
                                                {isSelected && (
                                                    <svg
                                                        className="w-3 h-3 text-white"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={3}
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">
                                                    {movie.title}
                                                </p>
                                                <p className="text-xs text-zinc-500">
                                                    {movie.releaseDate?.substring(
                                                        0,
                                                        4,
                                                    ) || "N/A"}{" "}
                                                    •{" "}
                                                    {movie.type === "tv"
                                                        ? "TV Show"
                                                        : "Movie"}
                                                    {isOnThisDay &&
                                                        " • Already on this day"}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 p-6 border-t border-zinc-800">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-medium"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleAddMovies}
                        disabled={selectedMovies.length === 0 || saving}
                        className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {saving
                            ? "Adding..."
                            : `Add ${selectedMovies.length || ""} Movie${
                                  selectedMovies.length !== 1 ? "s" : ""
                              }`}
                    </button>
                </div>
            </div>
        </div>
    );
}
