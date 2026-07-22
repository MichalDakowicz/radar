import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Search, Check, Calendar, Tv, Trash, X } from "lucide-react";
import { ref, update } from "firebase/database";
import { db } from "../lib/firebase";
import { useMovies } from "../hooks/useMovies";
import { Navbar } from "../components/layout/Navbar";
import { BottomNav } from "../components/layout/BottomNav";
import { useAuth } from "../features/auth/AuthContext";
import { fetchSeasonDetails } from "../services/tmdb";

export default function ManageTVCompletions() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const dateParam = searchParams.get("date");
    const selectedDate = dateParam ? new Date(dateParam) : new Date();

    const { movies } = useMovies();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedShow, setSelectedShow] = useState(null);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [seasonData, setSeasonData] = useState(null);
    const [selectedEpisodes, setSelectedEpisodes] = useState([]);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [loadingSeasons, setLoadingSeasons] = useState(false);

    const dateStr = `${selectedDate.getFullYear()}-${String(
        selectedDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

    // Get episodes watched on this day
    const episodesOnThisDay = movies
        .filter((m) => m.type === "tv")
        .flatMap((tvShow) => {
            if (!tvShow.episodeWatchDates) return [];

            return Object.entries(tvShow.episodeWatchDates)
                .filter(([episodeKey, timestamp]) => {
                    const watchedDate = new Date(timestamp);
                    const watchedStr = `${watchedDate.getFullYear()}-${String(
                        watchedDate.getMonth() + 1,
                    ).padStart(2, "0")}-${String(
                        watchedDate.getDate(),
                    ).padStart(2, "0")}`;
                    return watchedStr === dateStr;
                })
                .map(([episodeKey]) => ({
                    showId: tvShow.id,
                    showTitle: tvShow.title,
                    episodeKey,
                    coverUrl: tvShow.coverUrl,
                }));
        });

    const tvShows = movies.filter((m) => m.type === "tv");

    const filteredShows = searchQuery
        ? tvShows.filter((m) =>
              m.title.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : [];

    // Load season data when show is selected
    useEffect(() => {
        if (selectedShow && selectedShow.tmdbId) {
            setLoadingSeasons(true);
            fetchSeasonDetails(selectedShow.tmdbId, selectedSeason)
                .then((data) => {
                    if (data) setSeasonData(data);
                })
                .catch((err) => console.error(err))
                .finally(() => setLoadingSeasons(false));
        }
    }, [selectedShow, selectedSeason]);

    const handleAddEpisodes = async () => {
        if (selectedEpisodes.length === 0 || !user || !selectedShow) return;

        setSaving(true);
        try {
            const watchTimestamp = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                12,
                0,
                0,
            ).getTime();

            const show = movies.find((m) => m.id === selectedShow.id);
            const episodesWatched = show.episodesWatched || {};
            const episodeWatchDates = show.episodeWatchDates || {};

            // Add selected episodes
            selectedEpisodes.forEach((episodeKey) => {
                episodesWatched[episodeKey] = true;
                episodeWatchDates[episodeKey] = watchTimestamp;
            });

            await update(
                ref(db, `users/${user.uid}/movies/${selectedShow.id}`),
                {
                    episodesWatched,
                    episodeWatchDates,
                    updatedAt: Date.now(),
                },
            );

            setSelectedEpisodes([]);
            setSelectedShow(null);
            setSeasonData(null);
        } catch (error) {
            console.error("Error adding episodes:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveEpisode = async (showId, episodeKey) => {
        if (!user) return;

        setRemoving(true);
        try {
            const show = movies.find((m) => m.id === showId);
            const episodeWatchDates = { ...show.episodeWatchDates };
            delete episodeWatchDates[episodeKey];

            await update(ref(db, `users/${user.uid}/movies/${showId}`), {
                episodeWatchDates,
                updatedAt: Date.now(),
            });
        } catch (error) {
            console.error("Error removing episode:", error);
        } finally {
            setRemoving(false);
        }
    };

    const toggleEpisodeSelection = (episodeKey) => {
        setSelectedEpisodes((prev) =>
            prev.includes(episodeKey)
                ? prev.filter((k) => k !== episodeKey)
                : [...prev, episodeKey],
        );
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100">
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-6 pb-24">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">
                            Manage TV Episodes
                        </h1>
                        <p className="text-sm text-zinc-400 flex items-center gap-2 mt-1">
                            <Calendar className="w-4 h-4" />
                            {selectedDate.toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </div>
                </div>

                {/* Episodes on this day */}
                {episodesOnThisDay.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4">
                            Episodes Watched ({episodesOnThisDay.length})
                        </h2>
                        <div className="space-y-2">
                            {episodesOnThisDay.map((item, idx) => {
                                const [, season, episode] =
                                    item.episodeKey.match(/s(\d+)e(\d+)/) || [];
                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800"
                                    >
                                        {item.coverUrl && (
                                            <img
                                                src={item.coverUrl}
                                                alt={item.showTitle}
                                                className="w-12 h-16 object-cover rounded"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <h3 className="font-medium">
                                                {item.showTitle}
                                            </h3>
                                            <p className="text-sm text-zinc-400">
                                                Season {season}, Episode{" "}
                                                {episode}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                handleRemoveEpisode(
                                                    item.showId,
                                                    item.episodeKey,
                                                )
                                            }
                                            disabled={removing}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Add episodes */}
                <div>
                    <h2 className="text-lg font-semibold mb-4">
                        Add Episodes to This Day
                    </h2>

                    {!selectedShow ? (
                        <>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    placeholder="Search TV shows..."
                                    className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            {searchQuery && (
                                <div className="space-y-2">
                                    {filteredShows.map((show) => (
                                        <button
                                            key={show.id}
                                            onClick={() =>
                                                setSelectedShow(show)
                                            }
                                            className="w-full flex items-center gap-4 p-4 bg-zinc-900/50 hover:bg-zinc-800/50 rounded-xl border border-zinc-800 transition-colors text-left"
                                        >
                                            {show.coverUrl && (
                                                <img
                                                    src={show.coverUrl}
                                                    alt={show.title}
                                                    className="w-12 h-16 object-cover rounded"
                                                />
                                            )}
                                            <div>
                                                <h3 className="font-medium">
                                                    {show.title}
                                                </h3>
                                                <p className="text-sm text-zinc-400">
                                                    {show.number_of_seasons ||
                                                        0}{" "}
                                                    seasons
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                                {selectedShow.coverUrl && (
                                    <img
                                        src={selectedShow.coverUrl}
                                        alt={selectedShow.title}
                                        className="w-12 h-16 object-cover rounded"
                                    />
                                )}
                                <div className="flex-1">
                                    <h3 className="font-medium">
                                        {selectedShow.title}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedShow(null);
                                        setSeasonData(null);
                                        setSelectedEpisodes([]);
                                    }}
                                    className="text-zinc-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Season selector */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                {Array.from(
                                    {
                                        length:
                                            selectedShow.number_of_seasons || 1,
                                    },
                                    (_, i) => i + 1,
                                ).map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => setSelectedSeason(num)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-colors ${
                                            selectedSeason === num
                                                ? "bg-purple-600 text-white"
                                                : "bg-zinc-800 text-zinc-400 hover:text-white"
                                        }`}
                                    >
                                        Season {num}
                                    </button>
                                ))}
                            </div>

                            {/* Episode list */}
                            {loadingSeasons ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                                </div>
                            ) : seasonData?.episodes ? (
                                <div className="space-y-2">
                                    {seasonData.episodes.map((episode) => {
                                        const episodeKey = `s${selectedSeason}e${episode.episode_number}`;
                                        const isSelected =
                                            selectedEpisodes.includes(
                                                episodeKey,
                                            );
                                        const isAlreadyWatched =
                                            selectedShow.episodesWatched?.[
                                                episodeKey
                                            ];

                                        return (
                                            <button
                                                key={episode.id}
                                                onClick={() =>
                                                    toggleEpisodeSelection(
                                                        episodeKey,
                                                    )
                                                }
                                                className={`w-full p-4 rounded-xl border transition-all text-left ${
                                                    isSelected
                                                        ? "bg-purple-500/20 border-purple-500/50"
                                                        : isAlreadyWatched
                                                        ? "bg-green-500/10 border-green-500/30 hover:border-green-500/50"
                                                        : "bg-zinc-900/30 border-zinc-800 hover:border-zinc-700"
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={`mt-1 h-5 w-5 rounded border-2 flex items-center justify-center ${
                                                            isSelected
                                                                ? "bg-purple-500 border-purple-500"
                                                                : isAlreadyWatched
                                                                ? "border-green-500"
                                                                : "border-zinc-600"
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <Check
                                                                size={14}
                                                                className="text-white"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <h4
                                                                className={`font-medium ${
                                                                    isAlreadyWatched
                                                                        ? "text-green-400"
                                                                        : "text-white"
                                                                }`}
                                                            >
                                                                {
                                                                    episode.episode_number
                                                                }
                                                                . {episode.name}
                                                            </h4>
                                                        </div>
                                                        <p className="text-sm text-zinc-400 mt-1">
                                                            {episode.overview}
                                                        </p>
                                                        {isAlreadyWatched && (
                                                            <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                                                                <Check
                                                                    size={12}
                                                                />
                                                                Previously
                                                                watched (click
                                                                to rewatch)
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-zinc-500 py-8">
                                    No episodes found
                                </p>
                            )}

                            {selectedEpisodes.length > 0 && (
                                <button
                                    onClick={handleAddEpisodes}
                                    disabled={saving}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl font-medium transition-colors"
                                >
                                    {saving
                                        ? "Adding..."
                                        : `Add ${
                                              selectedEpisodes.length
                                          } Episode${
                                              selectedEpisodes.length > 1
                                                  ? "s"
                                                  : ""
                                          }`}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>
            <BottomNav />
        </div>
    );
}
