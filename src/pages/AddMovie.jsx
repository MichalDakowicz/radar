import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import { useMovies } from "../hooks/useMovies";
import { Navbar } from "../components/layout/Navbar";
import { searchMedia, fetchMediaMetadata } from "../services/tmdb";
import AddMovieHero from "../features/movies/add/AddMovieHero";
import AddMovieMainTab from "../features/movies/add/AddMovieMainTab";
import AddMovieDetailsTab from "../features/movies/add/AddMovieDetailsTab";

export default function AddMovie() {
    const navigate = useNavigate();
    const { addMovie } = useMovies();

    const [activeTab, setActiveTab] = useState("main");
    const [isProcessing, setIsProcessing] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Main fields
    const [type, setType] = useState("movie");
    const [title, setTitle] = useState("");
    const [director, setDirector] = useState([]);
    const [directorInput, setDirectorInput] = useState("");
    const [coverUrl, setCoverUrl] = useState("");
    const [releaseDate, setReleaseDate] = useState("");
    const [availability, setAvailability] = useState([]);
    const [tmdbId, setTmdbId] = useState(null);
    const [imdbId, setImdbId] = useState("");
    const [voteAverage, setVoteAverage] = useState(0);

    // Additional data
    const [cast, setCast] = useState([]);
    const [genres, setGenres] = useState([]);
    const [runtime, setRuntime] = useState(0);
    const [overview, setOverview] = useState("");

    // Status
    const [inWatchlist, setInWatchlist] = useState(true);
    const [timesWatched, setTimesWatched] = useState(0);
    const [storedTimesWatched, setStoredTimesWatched] = useState(1);
    const [inProgress, setInProgress] = useState(false);
    const [lastWatchedPosition, setLastWatchedPosition] = useState("");
    const [tvStatus, setTvStatus] = useState("Watching");
    const [numberOfSeasons, setNumberOfSeasons] = useState(0);
    const [numberOfEpisodes, setNumberOfEpisodes] = useState(0);

    // Details
    const [notes, setNotes] = useState("");
    const [overallRating, setOverallRating] = useState(0);
    const [ratings, setRatings] = useState({
        story: 0,
        acting: 0,
        ending: 0,
        enjoyment: 0,
    });

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim() && !tmdbId) {
                performSearch(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, tmdbId]);

    const performSearch = async (query) => {
        setIsSearching(true);
        try {
            const results = await searchMedia(query);
            setSearchResults(results || []);
        } catch (err) {
            console.error("Search failed", err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectMovie = async (item) => {
        setIsProcessing(true);
        try {
            const data = await fetchMediaMetadata(item.tmdbId, item.type);
            if (data) {
                setTmdbId(data.tmdbId);
                setImdbId(data.imdbId || "");
                setVoteAverage(data.voteAverage || 0);
                setTitle(data.title);
                setSearchQuery(data.title);
                setType(data.type);
                setCoverUrl(data.coverUrl || "");
                setReleaseDate(data.releaseDate || "");
                setGenres(data.genres || []);
                setCast(data.cast || []);
                setRuntime(data.runtime || 0);
                setOverview(data.overview || "");
                setNumberOfSeasons(data.numberOfSeasons || 0);
                setNumberOfEpisodes(data.numberOfEpisodes || 0);
                if (data.type === "movie" && data.director?.length > 0) {
                    // Normalize directors - extract names from objects if needed
                    const directorNames = data.director.map((d) =>
                        typeof d === "object" ? d.name : d,
                    );
                    setDirector(directorNames);
                }
                setSearchResults([]);
            }
        } catch (err) {
            console.error("Failed to fetch details", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleAvailability = (f) => {
        setAvailability((prev) => {
            const isSelected = prev.includes(f);
            return isSelected
                ? prev.filter((item) => item !== f)
                : [...prev, f];
        });
    };

    const handleSave = async () => {
        if (!title) return;

        setIsProcessing(true);
        try {
            await addMovie({
                imdbId,
                voteAverage,
                tmdbId,
                type,
                cast,
                genres,
                runtime,
                overview,
                title,
                director,
                coverUrl,
                releaseDate,
                availability,
                status:
                    type === "tv"
                        ? tvStatus
                        : timesWatched > 0
                        ? "Watched"
                        : "Watchlist",
                inWatchlist:
                    type === "tv" ? tvStatus === "Plan to Watch" : inWatchlist,
                inProgress,
                lastWatchedPosition,
                timesWatched,
                notes,
                number_of_episodes: numberOfEpisodes,
                number_of_seasons: numberOfSeasons,
                ratings: {
                    ...ratings,
                    overall: overallRating,
                },
                addedAt: Date.now(),
            });
            navigate("/");
        } catch (e) {
            console.error("Failed to add movie", e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-black pb-32 font-sans text-neutral-200">
            <Navbar />
            <AddMovieHero
                coverUrl={coverUrl}
                setCoverUrl={setCoverUrl}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                title={title}
                overview={overview}
                director={director}
                releaseDate={releaseDate}
                searchResults={searchResults}
                isSearching={isSearching}
                onSelectMovie={handleSelectMovie}
                tmdbId={tmdbId}
            />
            <div className="w-full max-w-5xl mx-auto px-4 pt-6">
                <div className="flex bg-neutral-900/90 p-1 rounded-xl mb-6 sticky top-15 sm:top-2 z-20 backdrop-blur-md border border-neutral-800 shadow-xl overflow-x-auto">
                    {["main", "details"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 px-2 text-sm font-bold uppercase rounded-lg transition-all min-w-24 ${
                                activeTab === tab
                                    ? "bg-neutral-800 text-white shadow-sm"
                                    : "text-neutral-500 hover:text-neutral-300"
                            }`}
                        >
                            {tab === "main" ? "Basic Info" : "Details & Rating"}
                        </button>
                    ))}
                </div>
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {activeTab === "main" && (
                        <AddMovieMainTab
                            type={type}
                            setType={setType}
                            releaseDate={releaseDate}
                            setReleaseDate={setReleaseDate}
                            runtime={runtime}
                            setRuntime={setRuntime}
                            tvStatus={tvStatus}
                            setTvStatus={setTvStatus}
                            timesWatched={timesWatched}
                            setTimesWatched={setTimesWatched}
                            storedTimesWatched={storedTimesWatched}
                            setStoredTimesWatched={setStoredTimesWatched}
                            inProgress={inProgress}
                            setInProgress={setInProgress}
                            lastWatchedPosition={lastWatchedPosition}
                            setLastWatchedPosition={setLastWatchedPosition}
                            director={director}
                            setDirector={setDirector}
                            directorInput={directorInput}
                            setDirectorInput={setDirectorInput}
                            availability={availability}
                            toggleAvailability={toggleAvailability}
                            inWatchlist={inWatchlist}
                            setInWatchlist={setInWatchlist}
                        />
                    )}
                    {activeTab === "details" && (
                        <AddMovieDetailsTab
                            overallRating={overallRating}
                            setOverallRating={setOverallRating}
                            ratings={ratings}
                            setRatings={setRatings}
                            notes={notes}
                            setNotes={setNotes}
                            voteAverage={voteAverage}
                        />
                    )}
                </div>
                <div className="fixed bottom-24 right-6 sm:bottom-6 z-50">
                    <button
                        onClick={handleSave}
                        disabled={isProcessing || !title}
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
