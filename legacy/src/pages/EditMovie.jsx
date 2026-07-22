import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, Check, Save, Calculator, CheckCircle } from "lucide-react";
import { useMovies } from "../hooks/useMovies";
import { useWatchProviderCountry } from "../hooks/useWatchProviderCountry";
import { normalizeServiceName } from "../lib/services";
import {
    searchMedia,
    fetchMediaMetadata,
    fetchSeasonDetails,
} from "../services/tmdb";
import { Navbar } from "../components/layout/Navbar";
import { setToWatchlist, setToInProgress } from "../lib/movieStatus";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import EditMovieHero from "../features/movies/edit/EditMovieHero";
import EditMovieMainTab from "../features/movies/edit/EditMovieMainTab";

function RatingSlider({ label, value, onChange, compact = false, step = 0.1 }) {
    const clampedValue = Math.max(0, Math.min(5, value || 0));
    const percent = (clampedValue / 5) * 100;

    return (
        <div className={compact ? "space-y-2 w-full" : "space-y-3 w-full"}>
            {label ? (
                <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        {label}
                    </span>
                </div>
            ) : null}
            <div className="relative h-6 w-full select-none">
                <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-zinc-900" />
                <div
                    className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-zinc-100 transition-all duration-150"
                    style={{ width: `${percent}%` }}
                />
                <div
                    className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-zinc-950 bg-zinc-50 shadow-lg shadow-black/40 transition-all duration-150"
                    style={{ left: `calc(${percent}% - 0.5rem)` }}
                />
                <input
                    type="range"
                    min="0"
                    max="5"
                    step={step}
                    value={clampedValue}
                    onInput={(e) => onChange(parseFloat(e.target.value))}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 z-10 h-6 w-full cursor-pointer opacity-0"
                    aria-label={label || "Rating"}
                />
            </div>
        </div>
    );
}

export default function EditMovie() {
    const { movieId } = useParams();
    const navigate = useNavigate();

    // Scroll to top on mount — SPA navigation carries over the previous page's scroll position
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const {
        movies,
        updateMovie,
        removeMovie,
        loading: moviesLoading,
    } = useMovies();
    const watchProviderCountry = useWatchProviderCountry();
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
    const [seasonRatings, setSeasonRatings] = useState({});
    const [episodesWatched, setEpisodesWatched] = useState({});
    const [episodeWatchDates, setEpisodeWatchDates] = useState({});
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
            // Upgrade old flat-number format { 1: 4.5 } to object format
            const rawSeasons = r.seasons || {};
            const upgradedSeasons = Object.fromEntries(
                Object.entries(rawSeasons).map(([k, v]) => [
                    k,
                    typeof v === "object"
                        ? v
                        : {
                              overall: v,
                              story: 0,
                              acting: 0,
                              ending: 0,
                              enjoyment: 0,
                          },
                ]),
            );
            setSeasonRatings(upgradedSeasons);
            setNumberOfSeasons(movie.number_of_seasons || 0);
            setNumberOfEpisodes(movie.number_of_episodes || 0);
            setEpisodesWatched(movie.episodesWatched || {});
            setEpisodeWatchDates(movie.episodeWatchDates || {});
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

    // Persist season episode count so "next episode" can roll to S(n+1)E1
    useEffect(() => {
        if (!movieId || !seasonData?.episodes?.length || selectedSeason == null)
            return;
        const count = seasonData.episodes.length;
        const current = movie?.seasonEpisodeCounts || {};
        if (current[selectedSeason] === count) return;
        updateMovie(movieId, {
            seasonEpisodeCounts: {
                ...current,
                [selectedSeason]: count,
            },
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- updateMovie is stable
    }, [seasonData, selectedSeason, movieId, movie?.seasonEpisodeCounts]);

    const toggleEpisodeWatched = (seasonWithType, episodeNum) => {
        const key = `s${seasonWithType}e${episodeNum}`;
        setEpisodesWatched((prev) => {
            const newWatched = { ...prev, [key]: !prev[key] };

            // Update watch dates
            setEpisodeWatchDates((prevDates) => {
                const newDates = { ...prevDates };
                if (newWatched[key]) {
                    // Episode is now watched, set current timestamp
                    newDates[key] = Date.now();
                } else {
                    // Episode is unwatched, remove the date
                    delete newDates[key];
                }
                return newDates;
            });

            return newWatched;
        });
    };

    const handleMarkSeasonComplete = () => {
        if (!seasonData?.episodes) return;
        const newWatched = { ...episodesWatched };
        const newDates = { ...episodeWatchDates };
        const currentTimestamp = Date.now();

        seasonData.episodes.forEach((ep) => {
            const key = `s${selectedSeason}e${ep.episode_number}`;
            newWatched[key] = true;
            // Only set date if not already watched
            if (!episodesWatched[key]) {
                newDates[key] = currentTimestamp;
            }
        });

        setEpisodesWatched(newWatched);
        setEpisodeWatchDates(newDates);
    };

    const handleRecalculate = () => {
        if (type === "tv") {
            const val = Object.values(seasonRatings)
                .map((s) => (typeof s === "object" ? s.overall : s))
                .filter((v) => v > 0);
            if (val.length > 0) {
                const avg = val.reduce((a, b) => a + b, 0) / val.length;
                setOverallRating(parseFloat(avg.toFixed(1)));
            }
        } else {
            const val = Object.values(ratings).filter((v) => v > 0);
            if (val.length > 0) {
                const avg = val.reduce((a, b) => a + b, 0) / val.length;
                setOverallRating(parseFloat(avg.toFixed(1)));
            }
        }
    };

    const handleSmartFill = async () => {
        if (!title) return;
        setIsProcessing(true);
        try {
            let data = null;
            if (tmdbId) {
                data = await fetchMediaMetadata(
                    tmdbId,
                    type,
                    watchProviderCountry,
                );
            } else {
                const results = await searchMedia(title);
                if (results && results.length > 0) {
                    const match =
                        results.find((r) => r.type === type) || results[0];
                    data = await fetchMediaMetadata(
                        match.tmdbId,
                        match.type,
                        watchProviderCountry,
                    );
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
                setNumberOfSeasons(data.number_of_seasons || 0);
                setNumberOfEpisodes(data.number_of_episodes || 0);
                if (data.director?.length > 0) {
                    // Keep directors as objects with IDs for linking
                    setDirector(data.director);
                }
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

    // Persist watchlist/progress toggles immediately
    const handleToggleWatchlist = async (newVal) => {
        // Only update local UI state here. Persist on explicit Save.
        setInWatchlist(newVal);
    };

    const handleToggleProgress = async (newVal) => {
        setInProgress(newVal);
        if (!movie) return;
        try {
            const updates = { inProgress: newVal, updatedAt: Date.now() };
            if (newVal) {
                updates.inWatchlist = false;
                updates.status = "Watching";
            } else {
                // Turning off progress: set status based on watched or existing watchlist
                if (movie.watched) updates.status = "Completed";
                else if (movie.inWatchlist) updates.status = "Watchlist";
                else updates.status = null;
            }
            await updateMovie(movie.id, updates);
        } catch (err) {
            console.error("Failed to persist progress toggle", err);
        }
    };

    const handleSave = async () => {
        setIsProcessing(true);
        try {
            // If user unchecked Watchlist for an unwatched, not-in-progress movie,
            // treat this as a removal from the library, but only after Save.
            if (
                type === "movie" &&
                !inWatchlist &&
                !inProgress &&
                (timesWatched === 0 || !timesWatched)
            ) {
                // Remove and navigate away
                await removeMovie(movie.id);
                navigate("/");
                return;
            }
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
                        inWatchlist: inWatchlist, // Use current state
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
                        inWatchlist: inWatchlist, // Use current state, not forced to true
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
                ratings:
                    type === "tv"
                        ? { overall: overallRating, seasons: seasonRatings }
                        : { ...ratings, overall: overallRating },
                number_of_seasons: numberOfSeasons,
                number_of_episodes: numberOfEpisodes,
                episodesWatched,
                episodeWatchDates,
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

    const ratingCategories = [
        { key: "story", label: "Story" },
        { key: "acting", label: "Acting" },
        { key: "ending", label: "Ending" },
        { key: "enjoyment", label: "Enjoyment" },
    ];

    const ratingPercent = (value) =>
        Math.max(0, Math.min(100, (value / 5) * 100));

    const ratingDisplay = (value) => (value > 0 ? value.toFixed(1) : "0.0");
    const publicRatingDisplay =
        voteAverage > 0 ? voteAverage.toFixed(1) : "N/A";
    const publicRatingPercent =
        voteAverage > 0
            ? Math.max(0, Math.min(100, (voteAverage / 10) * 100))
            : 0;

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
                            episodesWatched={episodesWatched}
                            number_of_seasons={numberOfSeasons}
                            seasonEpisodeCounts={movie?.seasonEpisodeCounts}
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
                            onToggleWatchlist={handleToggleWatchlist}
                            onToggleProgress={handleToggleProgress}
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
                                    Genres
                                </label>
                                <div className="flex flex-wrap gap-2 mb-3 min-h-8">
                                    {genres.map((g, i) => {
                                        const genreName =
                                            typeof g === "object" ? g.name : g;
                                        const genreId =
                                            typeof g === "object" ? g.id : null;

                                        return (
                                            <span
                                                key={i}
                                                onClick={() =>
                                                    genreId &&
                                                    navigate(
                                                        `/genre/${genreId}`,
                                                    )
                                                }
                                                className={`bg-neutral-800 text-neutral-300 text-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-neutral-700 ${
                                                    genreId
                                                        ? "cursor-pointer hover:bg-neutral-700 hover:border-neutral-600"
                                                        : ""
                                                }`}
                                            >
                                                {genreName}
                                                {!tmdbId && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeGenre(i);
                                                        }}
                                                        className="hover:text-red-400"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </span>
                                        );
                                    })}
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
                                    {cast.map((c, i) => {
                                        const actorName =
                                            typeof c === "object" ? c.name : c;
                                        const actorId =
                                            typeof c === "object" ? c.id : null;

                                        return (
                                            <span
                                                key={i}
                                                onClick={() =>
                                                    actorId &&
                                                    navigate(
                                                        `/actor/${actorId}`,
                                                    )
                                                }
                                                className={`bg-neutral-800 text-neutral-300 text-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-neutral-700 ${
                                                    actorId
                                                        ? "cursor-pointer hover:bg-neutral-700 hover:border-neutral-600"
                                                        : ""
                                                }`}
                                            >
                                                {actorName}
                                                {!tmdbId && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeCast(i);
                                                        }}
                                                        className="hover:text-red-400"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </span>
                                        );
                                    })}
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
                        <div className="max-w-6xl mx-auto space-y-6">
                            <div className="grid grid-cols-12 gap-6">
                                <section className="col-span-12 lg:col-span-3">
                                    <div className="flex flex-col items-center justify-between min-h-35 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm h-full">
                                        <h3 className="w-full text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                                            Public Score
                                        </h3>
                                        <div
                                            className="relative flex h-24 w-24 items-center justify-center rounded-full mt-2"
                                            style={{
                                                background: `conic-gradient(rgb(244 244 245) ${publicRatingPercent}%, rgb(39 39 42) 0)`,
                                            }}
                                        >
                                            <div className="absolute inset-2 rounded-full bg-zinc-900/95" />
                                            <span className="relative text-2xl font-bold tracking-tight text-zinc-50">
                                                {publicRatingDisplay}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-center text-xs text-zinc-500 w-full">
                                            TMDb rating and vote average
                                        </p>
                                    </div>
                                </section>

                                <section className="col-span-12 lg:col-span-9 space-y-6">
                                    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 min-h-35 shadow-2xl shadow-black/20 backdrop-blur-sm">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                                                    User Rating
                                                </h3>
                                                <div className="gap-5 flex items-center">
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            handleRecalculate
                                                        }
                                                        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white active:scale-95"
                                                    >
                                                        <Calculator size={15} />
                                                        {type === "tv"
                                                            ? "Avg Seasons"
                                                            : "Auto-Calc"}
                                                    </button>
                                                    <span className="text-md font-semibold text-zinc-200">
                                                        {ratingDisplay(
                                                            overallRating,
                                                        )}{" "}
                                                        / 5
                                                    </span>
                                                    
                                                </div>
                                            </div>
                                            <div className="min-w-0 w-full max-w-none">
                                                <RatingSlider
                                                    label=""
                                                    value={overallRating}
                                                    onChange={(val) => {
                                                        setOverallRating(val);
                                                        if (
                                                            val === 0 &&
                                                            type !== "tv"
                                                        ) {
                                                            setRatings((prev) =>
                                                                Object.keys(
                                                                    prev,
                                                                ).reduce(
                                                                    (
                                                                        acc,
                                                                        key,
                                                                    ) => ({
                                                                        ...acc,
                                                                        [key]: 0,
                                                                    }),
                                                                    {},
                                                                ),
                                                            );
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm">
                                        <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                                            Category Breakdown
                                        </h3>
                                        {type === "tv" ? (
                                            <div className="space-y-4">
                                                {Array.from(
                                                    {
                                                        length:
                                                            numberOfSeasons ||
                                                            1,
                                                    },
                                                    (_, i) => i + 1,
                                                ).map((seasonNum) => {
                                                    const sRating =
                                                        seasonRatings[
                                                            seasonNum
                                                        ] || {
                                                            overall: 0,
                                                            story: 0,
                                                            acting: 0,
                                                            ending: 0,
                                                            enjoyment: 0,
                                                        };
                                                    const handleSeasonCategoryChange =
                                                        (cat, newVal) => {
                                                            setSeasonRatings(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [seasonNum]:
                                                                        {
                                                                            ...(prev[
                                                                                seasonNum
                                                                            ] || {
                                                                                overall: 0,
                                                                                story: 0,
                                                                                acting: 0,
                                                                                ending: 0,
                                                                                enjoyment: 0,
                                                                            }),
                                                                            [cat]: newVal,
                                                                        },
                                                                }),
                                                            );
                                                        };
                                                    const handleSeasonAutoCalc =
                                                        () => {
                                                            const cats = [
                                                                sRating.story,
                                                                sRating.acting,
                                                                sRating.ending,
                                                                sRating.enjoyment,
                                                            ].filter(
                                                                (v) => v > 0,
                                                            );
                                                            if (
                                                                cats.length > 0
                                                            ) {
                                                                const avg =
                                                                    parseFloat(
                                                                        (
                                                                            cats.reduce(
                                                                                (
                                                                                    a,
                                                                                    b,
                                                                                ) =>
                                                                                    a +
                                                                                    b,
                                                                                0,
                                                                            ) /
                                                                            cats.length
                                                                        ).toFixed(
                                                                            1,
                                                                        ),
                                                                    );
                                                                setSeasonRatings(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [seasonNum]:
                                                                            {
                                                                                ...(prev[
                                                                                    seasonNum
                                                                                ] ||
                                                                                    {}),
                                                                                overall:
                                                                                    avg,
                                                                            },
                                                                    }),
                                                                );
                                                            }
                                                        };

                                                    return (
                                                        <div
                                                            key={seasonNum}
                                                            className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50"
                                                        >
                                                            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
                                                                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">
                                                                    Season{" "}
                                                                    {seasonNum}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        handleSeasonAutoCalc
                                                                    }
                                                                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white active:scale-95"
                                                                >
                                                                    <Calculator
                                                                        size={
                                                                            13
                                                                        }
                                                                    />
                                                                    Auto-Calc
                                                                </button>
                                                            </div>
                                                            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)]">
                                                                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                                                                    <div className="mb-3 flex items-center justify-between">
                                                                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                                                            Overall
                                                                        </span>
                                                                        <span className="text-sm font-semibold text-zinc-200">
                                                                            {ratingDisplay(
                                                                                sRating.overall ||
                                                                                    0,
                                                                            )}{" "}
                                                                            / 5
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-4">
                                                                        <RatingSlider
                                                                            label=""
                                                                            value={
                                                                                sRating.overall ||
                                                                                0
                                                                            }
                                                                            onChange={(
                                                                                newVal,
                                                                            ) =>
                                                                                handleSeasonCategoryChange(
                                                                                    "overall",
                                                                                    newVal,
                                                                                )
                                                                            }
                                                                            compact={
                                                                                true
                                                                            }
                                                                            step={
                                                                                0.5
                                                                            }
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="grid gap-3 sm:grid-cols-2">
                                                                    {ratingCategories.map(
                                                                        ({
                                                                            key,
                                                                            label,
                                                                        }) => {
                                                                            const value =
                                                                                sRating[
                                                                                    key
                                                                                ] ||
                                                                                0;
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        key
                                                                                    }
                                                                                    className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4"
                                                                                >
                                                                                    <div className="mb-3 flex items-center justify-between gap-3">
                                                                                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                                                                            {
                                                                                                label
                                                                                            }
                                                                                        </span>
                                                                                        <span className="text-sm font-semibold text-zinc-200">
                                                                                            {ratingDisplay(
                                                                                                value,
                                                                                            )}{" "}
                                                                                            /
                                                                                            5
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="mt-4">
                                                                                        <RatingSlider
                                                                                            label=""
                                                                                            value={
                                                                                                value
                                                                                            }
                                                                                            onChange={(
                                                                                                newVal,
                                                                                            ) =>
                                                                                                handleSeasonCategoryChange(
                                                                                                    key,
                                                                                                    newVal,
                                                                                                )
                                                                                            }
                                                                                            compact={
                                                                                                true
                                                                                            }
                                                                                            step={
                                                                                                0.5
                                                                                            }
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        },
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {ratingCategories.map(
                                                    ({ key, label }) => {
                                                        const value =
                                                            ratings[key] || 0;
                                                        return (
                                                            <div
                                                                key={key}
                                                                className="rounded-2xl p-2 transition-colors"
                                                            >
                                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                                                        {label}
                                                                    </span>
                                                                    <span className="text-sm font-semibold text-zinc-200">
                                                                        {ratingDisplay(
                                                                            value,
                                                                        )}{" "}
                                                                        / 5
                                                                    </span>
                                                                </div>
                                                                <div className="mt-4">
                                                                    <RatingSlider
                                                                        label=""
                                                                        value={
                                                                            value
                                                                        }
                                                                        onChange={(
                                                                            newVal,
                                                                        ) =>
                                                                            setRatings(
                                                                                (
                                                                                    prev,
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [key]: newVal,
                                                                                }),
                                                                            )
                                                                        }
                                                                        compact={
                                                                            true
                                                                        }
                                                                        step={
                                                                            0.5
                                                                        }
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    
                                </section>
                                
                            </div>
                            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm w-full">
                                        <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                                            Personal Notes
                                        </h3>
                                        <textarea
                                            className="min-h-32 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-0"
                                            value={notes}
                                            onChange={(e) =>
                                                setNotes(e.target.value)
                                            }
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
