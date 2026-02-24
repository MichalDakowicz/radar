import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, Check, Save, Calculator, CheckCircle } from "lucide-react";
import { useMovies } from "../hooks/useMovies";
import { StarRating } from "../features/movies/StarRating";
import { normalizeServiceName } from "../lib/services";
import {
    searchMedia,
    fetchMediaMetadata,
    fetchSeasonDetails,
} from "../services/tmdb";
import { Navbar } from "../components/layout/Navbar";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import EditMovieHero from "../features/movies/edit/EditMovieHero";
import EditMovieMainTab from "../features/movies/edit/EditMovieMainTab";

export default function EditMovie() {
    const { movieId } = useParams();
    const navigate = useNavigate();
    const {
        movies,
        updateMovie,
        removeMovie,
        loading: moviesLoading,
    } = useMovies();
    const movie = movies.find((m) => m.id === movieId);

    const [activeTab, setActiveTab] = useState("main");
    const [availability, setAvailability] = useState([]);
    const [title, setTitle] = useState("");
    const [director, setDirector] = useState([]);
    const [directorInput, setDirectorInput] = useState("");
    const [coverUrl, setCoverUrl] = useState("");
    const [releaseDate, setReleaseDate] = useState("");
    const [status, setStatus] = useState("Watchlist");
    const [type, setType] = useState("movie");
    const [tmdbId, setTmdbId] = useState(null);
    const [imdbId, setImdbId] = useState("");
    const [voteAverage, setVoteAverage] = useState(0);
    const [tvStatus, setTvStatus] = useState("Watching");
    const [cast, setCast] = useState([]);
    const [genres, setGenres] = useState([]);
    const [runtime, setRuntime] = useState(0);
    const [overview, setOverview] = useState("");
    const [genreInput, setGenreInput] = useState("");
    const [castInput, setCastInput] = useState("");
    const [inWatchlist, setInWatchlist] = useState(true);
    const [timesWatched, setTimesWatched] = useState(0);
    const [storedTimesWatched, setStoredTimesWatched] = useState(1);
    const [inProgress, setInProgress] = useState(false);
    const [lastWatchedPosition, setLastWatchedPosition] = useState("");
    const [movieUrl, setMovieUrl] = useState("");
    const [notes, setNotes] = useState("");
    const [overallRating, setOverallRating] = useState(0);
    const [ratings, setRatings] = useState({
        story: 0,
        acting: 0,
        ending: 0,
        enjoyment: 0,
    });
    const [numberOfSeasons, setNumberOfSeasons] = useState(0);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [seasonData, setSeasonData] = useState(null);
    const [episodesWatched, setEpisodesWatched] = useState({});
    const [numberOfEpisodes, setNumberOfEpisodes] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const addGenre = () => {
        if (genreInput.trim()) {
            setGenres((p) => [...p, genreInput.trim()]);
            setGenreInput("");
        }
    };
    const removeGenre = (i) =>
        setGenres((p) => p.filter((_, idx) => idx !== i));
    const addCast = () => {
        if (castInput.trim()) {
            setCast((p) => [...p, castInput.trim()]);
            setCastInput("");
        }
    };
    const removeCast = (i) => setCast((p) => p.filter((_, idx) => idx !== i));

    useEffect(() => {
        if (movie) {
            setAvailability(
                Array.isArray(movie.availability)
                    ? Array.from(
                          new Set(
                              movie.availability
                                  .map(normalizeServiceName)
                                  .filter(Boolean),
                          ),
                      )
                    : movie.format
                    ? [normalizeServiceName(movie.format)]
                    : [],
            );
            setTitle(movie.title || "");
            setTmdbId(movie.tmdbId || null);
            setImdbId(movie.imdbId || "");
            setVoteAverage(movie.voteAverage || 0);
            setType(movie.type || "movie");
            setTvStatus(movie.type === "tv" ? movie.status : "Watching");
            setCast(movie.cast || []);
            setGenres(movie.genres || []);
            setRuntime(movie.runtime || 0);
            setOverview(movie.overview || "");
            setStatus(movie.status || "Watchlist");
            setInWatchlist(
                movie.inWatchlist !== undefined
                    ? movie.inWatchlist
                    : movie.status === "Watchlist",
            );
            setInProgress(movie.inProgress || false);
            setLastWatchedPosition(movie.lastWatchedPosition || "");
            const seenCount =
                movie.timesWatched ?? (movie.status === "Watched" ? 1 : 0);
            setTimesWatched(seenCount);
            setStoredTimesWatched(seenCount > 0 ? seenCount : 1);
            setMovieUrl(movie.url || "");
            if (Array.isArray(movie.director)) setDirector(movie.director);
            else if (typeof movie.director === "string")
                setDirector([movie.director]);
            else if (Array.isArray(movie.artist)) setDirector(movie.artist);
            else setDirector([]);
            setCoverUrl(movie.coverUrl || "");
            setReleaseDate(movie.releaseDate || "");
            setNotes(movie.notes || "");
            const r = movie.ratings || {};
            setOverallRating(r.overall || 0);
            setRatings({
                story: r.story || 0,
                acting: r.acting || 0,
                ending: r.ending || 0,
                enjoyment: r.enjoyment || 0,
            });
            setNumberOfSeasons(movie.number_of_seasons || 0);
            setNumberOfEpisodes(movie.number_of_episodes || 0);
            setEpisodesWatched(movie.episodesWatched || {});
        }
    }, [movie]);

    useEffect(() => {
        if (activeTab === "episodes" && type === "tv" && tmdbId) {
            setIsProcessing(true);
            fetchSeasonDetails(tmdbId, selectedSeason)
                .then((data) => {
                    if (data) setSeasonData(data);
                })
                .catch((err) => console.error(err))
                .finally(() => setIsProcessing(false));
        }
    }, [activeTab, selectedSeason, tmdbId, type]);

    const toggleEpisodeWatched = (seasonWithType, episodeNum) => {
        const key = `s${seasonWithType}e${episodeNum}`;
        setEpisodesWatched((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleMarkSeasonComplete = () => {
        if (!seasonData?.episodes) return;
        const newWatched = { ...episodesWatched };
        seasonData.episodes.forEach((ep) => {
            newWatched[`s${selectedSeason}e${ep.episode_number}`] = true;
        });
        setEpisodesWatched(newWatched);
    };

    const handleRecalculate = () => {
        const val = Object.values(ratings).filter((v) => v > 0);
        if (val.length > 0) {
            const avg = val.reduce((a, b) => a + b, 0) / val.length;
            setOverallRating(parseFloat(avg.toFixed(1)));
        }
    };

    const handleSmartFill = async () => {
        if (!title) return;
        setIsProcessing(true);
        try {
            let data = null;
            if (tmdbId) {
                data = await fetchMediaMetadata(tmdbId, type);
            } else {
                const results = await searchMedia(title);
                if (results && results.length > 0) {
                    const match =
                        results.find((r) => r.type === type) || results[0];
                    data = await fetchMediaMetadata(match.tmdbId, match.type);
                }
            }
            if (data) {
                setTmdbId(data.tmdbId);
                setImdbId(data.imdbId || "");
                setVoteAverage(data.voteAverage || 0);
                setTitle(data.title);
                setType(data.type);
                setCoverUrl(data.coverUrl || coverUrl);
                setReleaseDate(data.releaseDate || releaseDate);
                setGenres(data.genres || []);
                setCast(data.cast || []);
                setRuntime(data.runtime || 0);
                setOverview(data.overview || "");
                setAvailability(
                    data.availability
                        ? Array.from(
                              new Set(
                                  data.availability
                                      .map(normalizeServiceName)
                                      .filter(Boolean),
                              ),
                          )
                        : availability,
                );
                setNumberOfSeasons(data.numberOfSeasons || 0);
                setNumberOfEpisodes(data.numberOfEpisodes || 0);
                if (data.type === "movie" && data.director.length > 0)
                    setDirector(data.director);
            }
        } catch (err) {
            console.error("Auto-fill failed", err);
            alert("Failed to fetch details from TMDB.");
        } finally {
            setIsProcessing(false);
        }
    };

    const addDirector = () => {
        if (directorInput.trim()) {
            setDirector((prev) => [...prev, directorInput.trim()]);
            setDirectorInput("");
        }
    };

    const removeDirector = (index) =>
        setDirector((prev) => prev.filter((_, i) => i !== index));

    const toggleAvailability = (f) => {
        setAvailability((prev) => {
            const isSelected = prev.includes(f);
            return isSelected
                ? prev.filter((item) => item !== f)
                : [...prev, f];
        });
    };

    const handleSave = async () => {
        setIsProcessing(true);
        try {
            // Determine status flags based on watch state
            let statusFlags = {};
            let completedAt = movie.completedAt; // Preserve existing completedAt

            if (type === "tv") {
                // For TV shows, use tvStatus
                if (tvStatus === "Completed") {
                    statusFlags = {
                        inWatchlist: movie.inWatchlist || false, // Preserve watchlist status
                        inProgress: false,
                        watched: true,
                    };
                    // Set completedAt if not already set
                    if (!completedAt) {
                        completedAt = Date.now();
                    }
                } else if (tvStatus === "Watching") {
                    statusFlags = {
                        inWatchlist: false, // Only inProgress removes watchlist
                        inProgress: true,
                        watched: false, // Not completed if watching
                    };
                    // Clear completedAt when unwatching
                    completedAt = null;
                } else {
                    statusFlags = {
                        inWatchlist: true,
                        inProgress: false,
                        watched: false, // Not completed if in watchlist
                    };
                    // Clear completedAt when unwatching
                    completedAt = null;
                }
            } else {
                // For movies, use timesWatched and inProgress/inWatchlist
                if (timesWatched > 0) {
                    statusFlags = {
                        inWatchlist: movie.inWatchlist || false, // Preserve watchlist status
                        inProgress: false,
                        watched: true,
                    };
                    // Set completedAt if not already set
                    if (!completedAt) {
                        completedAt = Date.now();
                    }
                } else if (inProgress) {
                    statusFlags = {
                        inWatchlist: false, // Only inProgress removes watchlist
                        inProgress: true,
                        watched: false, // Not watched if timesWatched is 0
                    };
                    // Clear completedAt when unwatching
                    completedAt = null;
                } else {
                    statusFlags = {
                        inWatchlist: true,
                        inProgress: false,
                        watched: false, // Not watched if timesWatched is 0
                    };
                    // Clear completedAt when unwatching
                    completedAt = null;
                }
            }

            const updateData = {
                availability,
                title,
                director,
                coverUrl,
                releaseDate,
                url: movieUrl,
                status: statusFlags.watched
                    ? "Completed"
                    : statusFlags.inProgress
                    ? "Watching"
                    : "Watchlist", // Backward compatibility
                ...statusFlags,
                lastWatchedPosition,
                imdbId,
                voteAverage,
                timesWatched,
                tmdbId,
                type,
                cast,
                genres,
                runtime,
                overview,
                notes,
                ratings: { ...ratings, overall: overallRating },
                number_of_seasons: numberOfSeasons,
                number_of_episodes: numberOfEpisodes,
                episodesWatched,
                addedAt: movie.addedAt,
                updatedAt: Date.now(),
            };

            // Handle completedAt: set it when watched, remove it when unwatched
            if (completedAt !== undefined && completedAt !== null) {
                updateData.completedAt = completedAt;
            } else if (completedAt === null) {
                updateData.completedAt = null; // Explicitly remove from calendar
            }

            await updateMovie(movie.id, updateData);
            navigate(-1);
        } catch (e) {
            console.error("Failed to update movie", e);
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmDelete = async () => {
        setIsProcessing(true);
        try {
            await removeMovie(movie.id);
            navigate("/");
        } catch (error) {
            console.error("Delete failed", error);
            setIsProcessing(false);
        }
    };

    const handleDelete = () => setIsDeleteModalOpen(true);

    if (moviesLoading)
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                Loading...
            </div>
        );
    if (!movie)
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                Movie not found
            </div>
        );

    return (
        <div className="min-h-screen bg-black pb-32 font-sans text-neutral-200">
            <Navbar />
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Remove Movie"
                description={`Are you sure you want to remove "${title}" from your library? This action cannot be undone.`}
                confirmText="Remove"
                isDestructive={true}
                isLoading={isProcessing}
            />
            <EditMovieHero
                coverUrl={coverUrl}
                setCoverUrl={setCoverUrl}
                title={title}
                setTitle={setTitle}
                overview={overview}
                director={director}
                releaseDate={releaseDate}
                tmdbId={tmdbId}
            />
            <div className="w-full max-w-5xl mx-auto px-4 pt-6">
                <div className="flex bg-neutral-900/90 p-1 rounded-xl mb-6 sticky top-15 sm:top-2 z-30 backdrop-blur-md border border-neutral-800 shadow-xl overflow-x-auto">
                    {(type === "tv"
                        ? ["main", "episodes", "details", "rating"]
                        : ["main", "details", "rating"]
                    ).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 px-2 text-sm font-bold uppercase rounded-lg transition-all min-w-24 ${
                                activeTab === tab
                                    ? "bg-neutral-800 text-white shadow-sm"
                                    : "text-neutral-500 hover:text-neutral-300"
                            }`}
                        >
                            {tab === "main"
                                ? "Basic Info"
                                : tab === "rating"
                                ? "Ratings"
                                : tab === "episodes"
                                ? "Episodes"
                                : "Details"}
                        </button>
                    ))}
                </div>
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {activeTab === "main" && (
                        <EditMovieMainTab
                            tmdbId={tmdbId}
                            type={type}
                            imdbId={imdbId}
                            title={title}
                            handleSmartFill={handleSmartFill}
                            isProcessing={isProcessing}
                            releaseDate={releaseDate}
                            setReleaseDate={setReleaseDate}
                            runtime={runtime}
                            setRuntime={setRuntime}
                            setType={setType}
                            tvStatus={tvStatus}
                            setTvStatus={setTvStatus}
                            timesWatched={timesWatched}
                            voteAverage={voteAverage}
                            director={director}
                            directorInput={directorInput}
                            setDirectorInput={setDirectorInput}
                            addDirector={addDirector}
                            removeDirector={removeDirector}
                            cast={cast}
                            genres={genres}
                            availability={availability}
                            toggleAvailability={toggleAvailability}
                            inWatchlist={inWatchlist}
                            setInWatchlist={setInWatchlist}
                            setTimesWatched={setTimesWatched}
                            storedTimesWatched={storedTimesWatched}
                            setStoredTimesWatched={setStoredTimesWatched}
                            inProgress={inProgress}
                            setInProgress={setInProgress}
                            lastWatchedPosition={lastWatchedPosition}
                            setLastWatchedPosition={setLastWatchedPosition}
                            coverUrl={coverUrl}
                            setCoverUrl={setCoverUrl}
                            handleDelete={handleDelete}
                        />
                    )}
                    {activeTab === "details" && (
                        <div className="space-y-8 max-w-3xl mx-auto">
                            <div>
                                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                                    Internal ID
                                </label>
                                <div className="w-full bg-neutral-900/50 border border-neutral-800 text-neutral-500 px-4 py-3 rounded-xl text-sm font-mono select-all">
                                    {tmdbId || "N/A"}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                                    Genres
                                </label>
                                <div className="flex flex-wrap gap-2 mb-3 min-h-8">
                                    {genres.map((g, i) => (
                                        <span
                                            key={i}
                                            className="bg-neutral-800 text-neutral-300 text-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-neutral-700"
                                        >
                                            {g}
                                            {!tmdbId && (
                                                <button
                                                    onClick={() =>
                                                        removeGenre(i)
                                                    }
                                                    className="hover:text-red-400"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>
                                {!tmdbId && (
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                                            value={genreInput}
                                            onChange={(e) =>
                                                setGenreInput(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    addGenre();
                                                }
                                            }}
                                            placeholder="Add genre..."
                                        />
                                        <button
                                            type="button"
                                            onClick={addGenre}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 rounded-xl border border-neutral-800"
                                        >
                                            <Check size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                                    Cast
                                </label>
                                <div className="flex flex-wrap gap-2 mb-3 min-h-8">
                                    {cast.map((c, i) => (
                                        <span
                                            key={i}
                                            className="bg-neutral-800 text-neutral-300 text-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-neutral-700"
                                        >
                                            {c}
                                            {!tmdbId && (
                                                <button
                                                    onClick={() =>
                                                        removeCast(i)
                                                    }
                                                    className="hover:text-red-400"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>
                                {!tmdbId && (
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                                            value={castInput}
                                            onChange={(e) =>
                                                setCastInput(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    addCast();
                                                }
                                            }}
                                            placeholder="Add actor..."
                                        />
                                        <button
                                            type="button"
                                            onClick={addCast}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 rounded-xl border border-neutral-800"
                                        >
                                            <Check size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                                    Overview
                                </label>
                                {tmdbId ? (
                                    <div className="w-full bg-neutral-900/50 border border-neutral-800 text-white px-4 py-3 rounded-xl min-h-37.5 text-base leading-relaxed">
                                        {overview || "No overview available"}
                                    </div>
                                ) : (
                                    <textarea
                                        className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-37.5 text-base leading-relaxed"
                                        value={overview}
                                        onChange={(e) =>
                                            setOverview(e.target.value)
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === "rating" && (
                        <div className="space-y-8 max-w-3xl mx-auto">
                            <div>
                                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                                    Public Rating Score
                                </label>
                                <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 flex items-center gap-4">
                                    <div className="text-2xl font-bold font-mono text-white">
                                        {voteAverage > 0
                                            ? voteAverage.toFixed(1)
                                            : "N/A"}
                                    </div>
                                    <div className="text-sm text-neutral-500">
                                        Based on TMDb/IMDb votes (Read-only)
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                                    Overall Rating
                                </label>
                                <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800 flex items-center justify-between">
                                    <StarRating
                                        label=""
                                        value={overallRating}
                                        onChange={(val) => {
                                            setOverallRating(val);
                                            if (val === 0)
                                                setRatings((prev) =>
                                                    Object.keys(prev).reduce(
                                                        (acc, key) => ({
                                                            ...acc,
                                                            [key]: 0,
                                                        }),
                                                        {},
                                                    ),
                                                );
                                        }}
                                        showInput={true}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRecalculate}
                                        className="px-4 py-2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors active:scale-95 text-xs font-medium flex items-center gap-2"
                                    >
                                        <Calculator size={16} /> Auto-Calc
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                                    Category Breakdown
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.entries(ratings).map(
                                        ([key, val]) => (
                                            <div
                                                key={key}
                                                className="bg-neutral-900/30 p-4 rounded-xl border border-neutral-800"
                                            >
                                                <StarRating
                                                    label={key}
                                                    value={val}
                                                    onChange={(newVal) =>
                                                        setRatings((prev) => ({
                                                            ...prev,
                                                            [key]: newVal,
                                                        }))
                                                    }
                                                    showInput={false}
                                                />
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                                    Personal Notes
                                </label>
                                <textarea
                                    className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-50 text-base leading-relaxed placeholder:text-neutral-800"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Write your review or thoughts here..."
                                />
                            </div>
                        </div>
                    )}
                    {activeTab === "episodes" && type === "tv" && (
                        <div className="space-y-6 max-w-3xl mx-auto">
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 pl-1 no-scrollbar">
                                {Array.from(
                                    { length: numberOfSeasons || 1 },
                                    (_, i) => i + 1,
                                ).map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => setSelectedSeason(num)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-colors whitespace-nowrap ${
                                            selectedSeason === num
                                                ? "bg-blue-600 text-white"
                                                : "bg-neutral-800 text-neutral-400 hover:text-white"
                                        }`}
                                    >
                                        Season {num}
                                    </button>
                                ))}
                            </div>
                            {seasonData && seasonData.episodes && (
                                <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-neutral-400 uppercase font-medium">
                                                Season {selectedSeason} Progress
                                            </span>
                                            <span className="text-2xl font-bold text-white">
                                                {Math.round(
                                                    ((seasonData.episodes.filter(
                                                        (e) =>
                                                            episodesWatched[
                                                                `s${selectedSeason}e${e.episode_number}`
                                                            ],
                                                    )?.length || 0) /
                                                        (seasonData.episodes
                                                            .length || 1)) *
                                                        100,
                                                )}
                                                %
                                            </span>
                                        </div>
                                        <button
                                            onClick={handleMarkSeasonComplete}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium transition-colors border border-blue-500/20"
                                        >
                                            <CheckCircle size={14} />
                                            Mark Season Complete
                                        </button>
                                    </div>
                                    <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-500"
                                            style={{
                                                width: `${
                                                    ((seasonData.episodes.filter(
                                                        (e) =>
                                                            episodesWatched[
                                                                `s${selectedSeason}e${e.episode_number}`
                                                            ],
                                                    )?.length || 0) /
                                                        (seasonData.episodes
                                                            .length || 1)) *
                                                    100
                                                }%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                            {isProcessing ? (
                                <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
                                    <div className="animate-spin h-6 w-6 border-2 border-neutral-600 border-t-transparent rounded-full mb-2"></div>
                                    <span>Loading episodes...</span>
                                </div>
                            ) : seasonData?.episodes ? (
                                <div className="space-y-2">
                                    {seasonData.episodes.map((episode) => {
                                        const isWatched =
                                            episodesWatched[
                                                `s${selectedSeason}e${episode.episode_number}`
                                            ];
                                        return (
                                            <div
                                                key={episode.id}
                                                className={`p-4 rounded-xl border transition-all ${
                                                    isWatched
                                                        ? "bg-green-500/10 border-green-500/20"
                                                        : "bg-neutral-900/30 border-neutral-800"
                                                }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <button
                                                        onClick={() =>
                                                            toggleEpisodeWatched(
                                                                selectedSeason,
                                                                episode.episode_number,
                                                            )
                                                        }
                                                        className={`mt-1 shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                            isWatched
                                                                ? "bg-green-500 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                                                                : "border-neutral-600 hover:border-neutral-400 text-transparent"
                                                        }`}
                                                    >
                                                        <Check
                                                            size={14}
                                                            strokeWidth={4}
                                                        />
                                                    </button>
                                                    <div
                                                        className="flex-1 min-w-0 cursor-pointer"
                                                        onClick={() =>
                                                            toggleEpisodeWatched(
                                                                selectedSeason,
                                                                episode.episode_number,
                                                            )
                                                        }
                                                    >
                                                        <div className="flex justify-between items-start gap-4">
                                                            <h3
                                                                className={`font-medium truncate ${
                                                                    isWatched
                                                                        ? "text-green-400"
                                                                        : "text-white"
                                                                }`}
                                                            >
                                                                {
                                                                    episode.episode_number
                                                                }
                                                                . {episode.name}
                                                            </h3>
                                                            <span className="text-xs font-mono text-neutral-500 shrink-0">
                                                                {
                                                                    episode.air_date
                                                                }
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-neutral-400 mt-1 line-clamp-2">
                                                            {episode.overview}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-neutral-500 bg-neutral-900/30 rounded-xl border border-dashed border-neutral-800">
                                    No episode data. Try Auto-fill or ensure
                                    TMDB ID is correct.
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="fixed bottom-24 right-6 sm:bottom-6 z-50">
                    <button
                        onClick={handleSave}
                        disabled={isProcessing}
                        className="h-14 w-14 sm:h-16 sm:w-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-600/30 hover:scale-110 active:scale-95 transition-all text-xl disabled:opacity-50 disabled:scale-100"
                    >
                        {isProcessing ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={28} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
