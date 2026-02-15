import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import {
    searchMedia,
    fetchMediaMetadata,
    getTrending,
    getMovies,
    getTVShows,
} from "../services/tmdb";
import { useMovies } from "../hooks/useMovies";
import { useToast } from "../components/ui/Toast";
import { Navbar } from "../components/layout/Navbar";
import { BottomNav } from "../components/layout/BottomNav";
import HeroCarousel from "../features/movies/HeroCarousel";
import ScrollingRow from "../features/movies/ScrollingRow";
import { Plus, Trash2, Star, Check } from "lucide-react";
import { useRestoredState, useSaveScrollPosition } from "../hooks/usePageState";

function SearchResultsGrid({
    items,
    onAdd,
    onRemove,
    onSelect,
    addingId,
    removingId,
    isAdded,
}) {
    if (!items || items.length === 0) return null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4 md:px-12 pt-8">
            {items.map((item) => {
                const added = isAdded(item.tmdbId);
                return (
                    <div
                        key={item.tmdbId}
                        onClick={() => onSelect(item)}
                        className={`group relative bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer ${
                            added ? "opacity-50 grayscale" : ""
                        }`}
                    >
                        <div className="aspect-2/3 relative">
                            {item.coverUrl ? (
                                <img
                                    src={item.coverUrl}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-600">
                                    <span className="text-xs text-center p-2">
                                        {item.title}
                                    </span>
                                </div>
                            )}

                            {item.voteAverage > 0 && (
                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded flex items-center gap-1 z-10">
                                    <Star
                                        size={12}
                                        className="text-yellow-500 fill-yellow-500"
                                    />
                                    <span className="text-xs font-medium text-white">
                                        {item.voteAverage?.toFixed(1)}
                                    </span>
                                </div>
                            )}

                            <div className="absolute top-2 right-2 md:hidden z-10">
                                {added ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove(item);
                                        }}
                                        disabled={removingId === item.tmdbId}
                                        className="bg-red-500/80 text-white p-1.5 rounded-full"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAdd(item);
                                        }}
                                        disabled={addingId === item.tmdbId}
                                        className="bg-blue-600/80 text-white p-1.5 rounded-full"
                                    >
                                        <Plus size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center gap-2">
                                {added ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove(item);
                                        }}
                                        className="bg-red-500/80 p-2 rounded-full"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAdd(item);
                                        }}
                                        className="bg-blue-600 p-2 rounded-full"
                                    >
                                        <Plus size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="p-3">
                            <h3 className="text-sm font-medium text-white line-clamp-1">
                                {item.title}
                            </h3>
                            <span className="text-xs text-neutral-500">
                                {item.releaseDate?.substring(0, 4)}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function Browse() {
    const restoredState = useRestoredState("browse", null);

    const [query, setQuery] = useState(restoredState?.query || "");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState(
        restoredState?.activeTab || "movies",
    ); // 'movies', 'tv', 'picks'

    // Data State
    const [heroContent, setHeroContent] = useState([]);
    const [trending, setTrending] = useState([]); // Used for rows
    const [upcoming, setUpcoming] = useState([]);
    const [topRated, setTopRated] = useState([]);
    const [tvPopular, setTvPopular] = useState([]);
    const [tvTopRated, setTvTopRated] = useState([]);

    const [addingId, setAddingId] = useState(null);
    const [removingId, setRemovingId] = useState(null);

    const navigate = useNavigate();
    const { addMovie, removeMovie, movies } = useMovies();
    const { toast } = useToast();

    // Save scroll position continuously
    useSaveScrollPosition("browse");

    // Fetch Initial Data
    useEffect(() => {
        const loadDiscoverData = async () => {
            // Parallel fetching for speed
            const [trend, upc, top, tvPop, tvTop] = await Promise.all([
                getTrending(),
                getMovies("upcoming"),
                getMovies("top_rated"),
                getTVShows("popular"),
                getTVShows("top_rated"),
            ]);

            setTrending(trend);
            setUpcoming(upc);
            setTopRated(top);
            setTvPopular(tvPop);
            setTvTopRated(tvTop);

            // Set Hero Content initially to Trending (or mix)
            setHeroContent(trend.slice(0, 8));
        };
        loadDiscoverData();
    }, []);

    // Update Hero based on Tab
    useEffect(() => {
        if (activeTab === "movies") {
            setHeroContent(
                trending.filter((i) => i.type === "movie").slice(0, 6),
            );
        } else if (activeTab === "tv") {
            setHeroContent(tvPopular.slice(0, 6));
        } else {
            // Editor Picks -> Maybe Top Rated Mixed
            setHeroContent(
                [...topRated, ...tvTopRated]
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 6),
            );
        }
    }, [activeTab, trending, tvPopular, topRated, tvTopRated]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                handleSearch(query);
            } else {
                setResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSearch = async (searchQuery) => {
        setLoading(true);
        try {
            const data = await searchMedia(searchQuery);
            setResults(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAdd = async (item) => {
        setAddingId(item.tmdbId);
        try {
            const existing = movies.find((m) => m.tmdbId === item.tmdbId);
            if (existing) {
                toast({
                    title: "Already in Library",
                    description: "This item is already in your library.",
                });
                return;
            }
            const fullData = await fetchMediaMetadata(item.tmdbId, item.type);
            await addMovie({
                ...fullData,
                status: "Plan to Watch",
                inWatchlist: true,
                timesWatched: 0,
                addedAt: Date.now(),
                ratings: {
                    story: 0,
                    acting: 0,
                    ending: 0,
                    enjoyment: 0,
                    overall: 0,
                },
            });
            toast({
                title: "Added",
                description: "Added to Plan to Watch.",
                variant: "success",
            });
        } catch {
            toast({
                title: "Error",
                description: "Failed to add.",
                variant: "destructive",
            });
        } finally {
            setAddingId(null);
        }
    };

    const handleRemove = async (item) => {
        setRemovingId(item.tmdbId);
        try {
            const movieToRemove = movies.find((m) => m.tmdbId === item.tmdbId);
            if (movieToRemove) await removeMovie(movieToRemove.id);
        } finally {
            setRemovingId(null);
        }
    };

    const handleViewDetails = (item) => {
        const existingMovie = movies.find((m) => m.tmdbId === item.tmdbId);
        if (existingMovie) {
            navigate(`/edit/${existingMovie.id}`);
        } else {
            navigate(`/movie/${item.tmdbId}/${item.type}`);
        }
    };

    const isAdded = (tmdbId) => movies.some((m) => m.tmdbId == tmdbId);

    // Save current state to sessionStorage
    useEffect(() => {
        const currentState = {
            query,
            activeTab,
            scrollPosition: window.scrollY,
        };

        try {
            sessionStorage.setItem(
                "pageState_browse",
                JSON.stringify(currentState),
            );
        } catch (error) {
            console.warn("Error saving page state:", error);
        }
    }, [query, activeTab]);

    // Restore scroll position on mount if we have restored state
    useEffect(() => {
        if (restoredState?.scrollPosition) {
            setTimeout(() => {
                window.scrollTo(0, restoredState.scrollPosition);
            }, 100);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Render Content based on Tab
    const renderTabContent = () => {
        if (activeTab === "movies") {
            return (
                <div className="animate-in fade-in duration-500">
                    <ScrollingRow
                        title="Trending Now"
                        items={trending.filter((i) => i.type === "movie")}
                        onMovieClick={handleViewDetails}
                        onAdd={handleQuickAdd}
                        isAdded={isAdded}
                    />
                    <ScrollingRow
                        title="Top Rated Movies"
                        items={topRated}
                        onMovieClick={handleViewDetails}
                        onAdd={handleQuickAdd}
                        isAdded={isAdded}
                    />
                </div>
            );
        } else if (activeTab === "tv") {
            return (
                <div className="animate-in fade-in duration-500">
                    <ScrollingRow
                        title="Popular TV Shows"
                        items={tvPopular}
                        onMovieClick={handleViewDetails}
                        onAdd={handleQuickAdd}
                        isAdded={isAdded}
                    />
                    <ScrollingRow
                        title="Top Rated TV"
                        items={tvTopRated}
                        onMovieClick={handleViewDetails}
                        onAdd={handleQuickAdd}
                        isAdded={isAdded}
                    />
                    <ScrollingRow
                        title="Trending This Week"
                        items={trending.filter((i) => i.type === "tv")}
                        onMovieClick={handleViewDetails}
                        onAdd={handleQuickAdd}
                        isAdded={isAdded}
                    />
                </div>
            );
        } else {
            return (
                <div className="animate-in fade-in duration-500">
                    <ScrollingRow
                        title="Critically Acclaimed"
                        items={[...topRated, ...tvTopRated]
                            .sort((a, b) => b.voteAverage - a.voteAverage)
                            .slice(0, 15)}
                        onMovieClick={handleViewDetails}
                        onAdd={handleQuickAdd}
                        isAdded={isAdded}
                    />
                    <ScrollingRow
                        title="Hidden Gems"
                        items={[...upcoming, ...trending]
                            .sort(() => 0.5 - Math.random())
                            .slice(0, 15)}
                        onMovieClick={handleViewDetails}
                        onAdd={handleQuickAdd}
                        isAdded={isAdded}
                    />
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-black pb-12 font-sans text-white">
            <Navbar />

            {/* Hero Section - only show when not searching */}
            {!query.trim() && (
                <HeroCarousel
                    items={heroContent}
                    onInfoClick={handleViewDetails}
                    onAdd={handleQuickAdd}
                    isAdded={isAdded}
                />
            )}

            {/* Search Bar - always visible */}
            <div className="px-4 md:px-12 relative z-10 pt-8">
                <div className="relative max-w-xl mx-auto">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                        size={18}
                    />
                    <input
                        type="text"
                        className="w-full h-10 rounded-lg bg-neutral-900 border border-neutral-800 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Find movies & TV shows..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {loading && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader2
                                className="animate-spin text-neutral-400"
                                size={18}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Content Container - if query exists, hide discover view */}
            {!query.trim() && (
                <>
                    {/* Tabs */}
                    <div className="sticky top-15 z-40 bg-black/80 backdrop-blur-md py-2 border-b border-white/10 md:mt-0">
                        <div className="flex justify-center gap-6 md:gap-8">
                            {["movies", "tv", "picks"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`text-lg md:text-xl font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                                        activeTab === tab
                                            ? "text-white scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                            : "text-neutral-500 hover:text-neutral-300"
                                    }`}
                                >
                                    {tab === "movies"
                                        ? "Movies"
                                        : tab === "tv"
                                        ? "TV Shows"
                                        : "Editor Picks"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="relative z-10 -mt-10 md:mt-0 pb-12 bg-linear-to-t from-black via-black to-transparent">
                        {renderTabContent()}
                    </div>
                </>
            )}

            {/* Search Results Overlay */}
            {query.trim() && (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-300">
                    {results.length > 0 ? (
                        <SearchResultsGrid
                            items={results}
                            onAdd={handleQuickAdd}
                            onRemove={handleRemove}
                            onSelect={handleViewDetails}
                            addingId={addingId}
                            removingId={removingId}
                            isAdded={isAdded}
                        />
                    ) : (
                        !loading && (
                            <div className="text-center py-24 text-neutral-500">
                                <Search
                                    size={48}
                                    className="mx-auto mb-4 opacity-50"
                                />
                                <p>No results found for "{query}"</p>
                            </div>
                        )
                    )}
                </div>
            )}

            <BottomNav />
        </div>
    );
}
