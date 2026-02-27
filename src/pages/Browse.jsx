import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import {
    searchMedia,
    fetchMediaMetadata,
    getTrending,
    getMovies,
    getTVShows,
    getSimilarMovies,
    getMoviesByGenre,
} from "../services/tmdb";
import { useMovies } from "../hooks/useMovies";
import { useToast } from "../components/ui/Toast";
import { Navbar } from "../components/layout/Navbar";
import { BottomNav } from "../components/layout/BottomNav";
import HeroCarousel from "../features/movies/HeroCarousel";
import ScrollingRow from "../features/movies/ScrollingRow";
import { Plus, Trash2, Star } from "lucide-react";
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
    );

    // Data State
    const [heroContent, setHeroContent] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreContent, setHasMoreContent] = useState(true);

    const [addingId, setAddingId] = useState(null);
    const [removingId, setRemovingId] = useState(null);

    const navigate = useNavigate();
    const { addMovie, removeMovie, movies } = useMovies();
    const { toast } = useToast();

    // Get user's highly rated movies for recommendations
    const topRatedUserMovies = useMemo(() => {
        return movies
            .filter((m) => m.ratings?.overall >= 4 && m.watched)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
    }, [movies]);

    // Analyze user's favorite genres from their library
    const { userFavoriteGenres, allUserGenres } = useMemo(() => {
        const genreCount = {};

        movies.forEach((movie) => {
            if (movie.genres && Array.isArray(movie.genres)) {
                movie.genres.forEach((genre) => {
                    const genreId =
                        typeof genre === "object" ? genre.id : genre;
                    const genreName =
                        typeof genre === "object" ? genre.name : genre;

                    if (!genreCount[genreId]) {
                        genreCount[genreId] = {
                            id: genreId,
                            name: genreName,
                            count: 0,
                        };
                    }
                    genreCount[genreId].count++;
                });
            }
        });

        const sortedGenres = Object.values(genreCount).sort(
            (a, b) => b.count - a.count,
        );

        return {
            userFavoriteGenres: sortedGenres.slice(0, 5), // Top 5 for display
            allUserGenres: sortedGenres, // All genres with counts
        };
    }, [movies]);

    // Save scroll position continuously
    useSaveScrollPosition("browse");

    // All available genres with their IDs
    const allGenres = useMemo(
        () => [
            { id: 28, name: "Action", type: "movie" },
            { id: 12, name: "Adventure", type: "movie" },
            { id: 16, name: "Animation", type: "movie" },
            { id: 35, name: "Comedy", type: "movie" },
            { id: 80, name: "Crime", type: "movie" },
            { id: 99, name: "Documentary", type: "movie" },
            { id: 18, name: "Drama", type: "movie" },
            { id: 10751, name: "Family", type: "movie" },
            { id: 14, name: "Fantasy", type: "movie" },
            { id: 36, name: "History", type: "movie" },
            { id: 27, name: "Horror", type: "movie" },
            { id: 10402, name: "Music", type: "movie" },
            { id: 9648, name: "Mystery", type: "movie" },
            { id: 10749, name: "Romance", type: "movie" },
            { id: 878, name: "Sci-Fi", type: "movie" },
            { id: 878, name: "Science Fiction", type: "movie" }, // Alias
            { id: 53, name: "Thriller", type: "movie" },
            { id: 10752, name: "War", type: "movie" },
            { id: 37, name: "Western", type: "movie" },
            { id: 10759, name: "Action & Adventure", type: "tv" },
            { id: 16, name: "Animation", type: "tv" },
            { id: 35, name: "Comedy", type: "tv" },
            { id: 80, name: "Crime", type: "tv" },
            { id: 99, name: "Documentary", type: "tv" },
            { id: 18, name: "Drama", type: "tv" },
            { id: 10751, name: "Family", type: "tv" },
            { id: 10762, name: "Kids", type: "tv" },
            { id: 9648, name: "Mystery", type: "tv" },
            { id: 10765, name: "Sci-Fi & Fantasy", type: "tv" },
        ],
        [],
    );

    // Create a name-to-ID mapping for genres
    const genreNameToId = useMemo(() => {
        const map = {};
        allGenres.forEach((g) => {
            map[g.name.toLowerCase()] = g.id;
        });
        return map;
    }, [allGenres]);

    // Function to generate categories
    const generateCategories = async () => {
        const timestamp = Date.now();
        const random = Math.random();

        // Only include ONE of each base category type per page load
        const allBaseCategories = [
            {
                id: `trending_${timestamp}_${random}`,
                title: "Trending Now",
                fetch: () => getTrending(),
                filter: (items) =>
                    activeTab === "movies"
                        ? items.filter((i) => i.type === "movie")
                        : activeTab === "tv"
                        ? items.filter((i) => i.type === "tv")
                        : items,
            },
            {
                id: `top_rated_movies_${timestamp}_${random}`,
                title: "Top Rated Movies",
                fetch: () => getMovies("top_rated"),
                showIn: ["movies"],
            },
            {
                id: `popular_movies_${timestamp}_${random}`,
                title: "Popular Movies",
                fetch: () => getMovies("popular"),
                showIn: ["movies"],
            },
            {
                id: `tv_popular_${timestamp}_${random}`,
                title: "Popular TV Shows",
                fetch: () => getTVShows("popular"),
                showIn: ["tv"],
            },
            {
                id: `tv_top_rated_${timestamp}_${random}`,
                title: "Top Rated TV",
                fetch: () => getTVShows("top_rated"),
                showIn: ["tv"],
            },
            {
                id: `tv_airing_today_${timestamp}_${random}`,
                title: "Airing Today",
                fetch: () => getTVShows("airing_today"),
                showIn: ["tv"],
            },
            {
                id: `tv_on_air_${timestamp}_${random}`,
                title: "Currently Airing",
                fetch: () => getTVShows("on_the_air"),
                showIn: ["tv"],
            },
        ];

        // Filter base categories by tab and pick only ONE of each type
        const relevantBaseCategories = allBaseCategories.filter(
            (cat) => !cat.showIn || cat.showIn.includes(activeTab),
        );

        // Randomly select just ONE base category to include
        const baseCategories =
            relevantBaseCategories.length > 0
                ? [
                      relevantBaseCategories[
                          Math.floor(
                              Math.random() * relevantBaseCategories.length,
                          )
                      ],
                  ]
                : [];

        const genreCategories = [];
        const usedDiscoveryGenreIds = new Set();

        // Add user's favorite genres (NOT marked as discovery)
        console.log("User favorite genres:", userFavoriteGenres);
        console.log("Active tab:", activeTab);

        if (userFavoriteGenres.length > 0) {
            userFavoriteGenres.forEach((userGenre) => {
                const mediaType = activeTab === "tv" ? "tv" : "movie";

                // Convert genre name to ID if it's a string
                const genreId =
                    typeof userGenre.id === "string"
                        ? genreNameToId[userGenre.id.toLowerCase()]
                        : userGenre.id;

                // Find matching genres for the current tab
                const matchingGenres = allGenres.filter(
                    (g) => g.id === genreId && g.type === mediaType,
                );

                console.log(
                    `Checking genre ${userGenre.name} (${userGenre.id} -> ${genreId}):`,
                    matchingGenres.length > 0
                        ? `FOUND ${matchingGenres.length}`
                        : "NOT FOUND",
                );

                // Add each matching genre (could be both movie and TV for picks tab)
                matchingGenres.forEach((matchingGenre) => {
                    genreCategories.push({
                        id: `genre_fav_${matchingGenre.id}_${
                            matchingGenre.type
                        }_${timestamp}_${random}_${Math.random()}`,
                        title: `${matchingGenre.name} ${
                            matchingGenre.type === "tv" ? "Shows" : "Movies"
                        }`,
                        fetch: () =>
                            getMoviesByGenre(
                                matchingGenre.id,
                                matchingGenre.type,
                            ),
                        isUserPreference: true, // Regular genre, not discovery
                    });
                });
            });
        }

        console.log(
            "Genre categories after user favorites:",
            genreCategories.length,
        );

        const mediaType = activeTab === "tv" ? "tv" : "movie";

        // Get user's genres with 15+ movies - convert string IDs to numeric
        const significantUserGenreIds = allUserGenres
            .filter((g) => g.count >= 15)
            .map((g) => {
                // Convert string genre names to IDs
                return typeof g.id === "string"
                    ? genreNameToId[g.id.toLowerCase()]
                    : g.id;
            })
            .filter((id) => id !== undefined); // Remove any that couldn't be mapped

        console.log(
            "Significant user genre IDs (15+ movies):",
            significantUserGenreIds,
        );
        console.log("All user genres:", allUserGenres);

        // Filter for unexplored genres (for discovery only)
        const discoveryGenres = allGenres.filter((g) => {
            if (activeTab !== "picks" && g.type !== mediaType) return false;
            if (significantUserGenreIds.includes(g.id)) {
                console.log(
                    `Excluding ${g.name} (${g.id}) - significant genre`,
                );
                return false;
            }

            // Check if user has this genre (by ID or name)
            const userGenre = allUserGenres.find((ug) => {
                const ugId =
                    typeof ug.id === "string"
                        ? genreNameToId[ug.id.toLowerCase()]
                        : ug.id;
                return ugId === g.id;
            });

            const shouldInclude = !userGenre || userGenre.count < 10;

            if (!shouldInclude && userGenre) {
                console.log(
                    `Excluding ${g.name} (${g.id}) - user has ${userGenre.count} movies`,
                );
            }

            return shouldInclude;
        });

        console.log(
            "Discovery genres available:",
            discoveryGenres.map((g) => `${g.name} (${g.id})`),
        );

        const randomGenreCount = Math.floor(Math.random() * 2) + 2;
        const shuffledRandomGenres = [...discoveryGenres].sort(
            () => 0.5 - Math.random(),
        );

        shuffledRandomGenres.slice(0, randomGenreCount).forEach((genre) => {
            if (!usedDiscoveryGenreIds.has(genre.id)) {
                usedDiscoveryGenreIds.add(genre.id);
                genreCategories.push({
                    id: `genre_disc_${genre.id}_${
                        genre.type
                    }_${timestamp}_${Math.random()}`,
                    title: `Discover ${genre.name}`,
                    fetch: () => getMoviesByGenre(genre.id, genre.type),
                    isDiscovery: true, // Marked as discovery with green badge
                });
            }
        });

        const allCategories = [...baseCategories, ...genreCategories];

        // Don't filter by showIn again - we already did that for base categories
        // Just shuffle all categories together
        const shuffled = [...allCategories].sort(() => 0.5 - Math.random());

        const categoriesWithData = await Promise.all(
            shuffled.map(async (cat) => {
                try {
                    let items = await cat.fetch();
                    if (cat.filter) {
                        items = cat.filter(items);
                    }
                    return {
                        ...cat,
                        items: items.slice(0, 20),
                    };
                } catch (error) {
                    console.error(`Error fetching ${cat.title}:`, error);
                    return null;
                }
            }),
        );

        const validCategories = categoriesWithData.filter(
            (cat) => cat && cat.items.length > 0,
        );

        const categoriesWithRecommendations = [];
        let recommendationIndex = 0;

        for (let i = 0; i < validCategories.length; i++) {
            categoriesWithRecommendations.push(validCategories[i]);

            if (
                (i + 1) % (2 + Math.floor(Math.random() * 2)) === 0 &&
                recommendationIndex < topRatedUserMovies.length
            ) {
                const baseMovie = topRatedUserMovies[recommendationIndex];

                // Only show recommendations that match the current tab
                const shouldShowRecommendation =
                    (activeTab === "movies" && baseMovie.type === "movie") ||
                    (activeTab === "tv" && baseMovie.type === "tv");

                if (baseMovie && baseMovie.tmdbId && shouldShowRecommendation) {
                    try {
                        const similar = await getSimilarMovies(
                            baseMovie.tmdbId,
                            baseMovie.type || "movie",
                        );

                        // Filter similar items to match the active tab
                        const filteredSimilar = similar.filter((item) =>
                            activeTab === "movies"
                                ? item.type === "movie"
                                : item.type === "tv",
                        );

                        if (filteredSimilar && filteredSimilar.length > 0) {
                            categoriesWithRecommendations.push({
                                id: `similar_${
                                    baseMovie.tmdbId
                                }_${timestamp}_${Math.random()}`,
                                title: `Because you liked "${baseMovie.title}"`,
                                items: filteredSimilar.slice(0, 20),
                                isRecommendation: true,
                            });
                        }
                    } catch (error) {
                        console.error("Error fetching similar movies:", error);
                    }
                }
                recommendationIndex++;
            }
        }

        return categoriesWithRecommendations;
    };

    // Fetch Initial Data
    useEffect(() => {
        const loadDiscoverData = async () => {
            setLoadingCategories(true);
            setHasMoreContent(true);
            try {
                const newCategories = await generateCategories();
                setCategories(newCategories);

                if (newCategories.length > 0) {
                    setHeroContent(newCategories[0].items.slice(0, 6));
                }
            } catch (error) {
                console.error("Error loading discover data:", error);
            } finally {
                setLoadingCategories(false);
            }
        };

        loadDiscoverData();
    }, [activeTab]);

    // Load more categories
    const loadMoreCategories = async () => {
        if (loadingMore || !hasMoreContent || query.trim()) return;

        setLoadingMore(true);
        try {
            const newCategories = await generateCategories();
            setCategories((prev) => [...prev, ...newCategories]);
        } catch (error) {
            console.error("Error loading more categories:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    // Infinite scroll
    useEffect(() => {
        if (query.trim()) return;

        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;

            if (
                scrollTop + windowHeight >= documentHeight - 800 &&
                !loadingMore
            ) {
                loadMoreCategories();
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [query, loadingMore, hasMoreContent, categories]);

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

            const normalizedData = {
                ...fullData,
                director:
                    fullData.director?.map((d) =>
                        typeof d === "object" ? d.name : d,
                    ) || [],
            };

            // Remove any fields from TMDB that could conflict with our tracking fields
            delete normalizedData.status; // TMDB status (Released, etc.) conflicts with our watch status
            delete normalizedData.watched;
            delete normalizedData.timesWatched;
            delete normalizedData.completedAt;
            delete normalizedData.inWatchlist;
            delete normalizedData.inProgress;

            await addMovie({
                ...normalizedData,
                status: "Watchlist",
                inWatchlist: true,
                inProgress: false,
                watched: false,
                timesWatched: 0,
                completedAt: null, // Explicitly ensure no completion date for watchlist items
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
                description: "Added to Watchlist.",
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
            if (movieToRemove) {
                await removeMovie(movieToRemove.id);
                toast({
                    title: "Removed",
                    description: "Removed from your library.",
                    variant: "success",
                });
            } else {
                toast({
                    title: "Not Found",
                    description: "This item is not in your library.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error removing movie:", error);
            toast({
                title: "Error",
                description: "Failed to remove from library.",
                variant: "destructive",
            });
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

    useEffect(() => {
        if (restoredState?.scrollPosition) {
            setTimeout(() => {
                window.scrollTo(0, restoredState.scrollPosition);
            }, 100);
        }
    }, []);

    const renderTabContent = () => {
        if (loadingCategories) {
            return (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="animate-spin text-blue-500" size={48} />
                </div>
            );
        }

        return (
            <div className="animate-in fade-in duration-500 space-y-8">
                {categories.map((category) => (
                    <ScrollingRow
                        key={category.id}
                        title={category.title}
                        items={category.items}
                        onMovieClick={handleViewDetails}
                        onAdd={handleQuickAdd}
                        onRemove={handleRemove}
                        isAdded={isAdded}
                        highlight={category.isRecommendation}
                        isDiscovery={category.isDiscovery}
                    />
                ))}
                {loadingMore && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2
                            className="animate-spin text-blue-500"
                            size={36}
                        />
                        <span className="ml-3 text-neutral-400">
                            Loading more...
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-black pb-12 font-sans text-white">
            <Navbar />

            {!query.trim() && (
                <HeroCarousel
                    items={heroContent}
                    onInfoClick={handleViewDetails}
                    onAdd={handleQuickAdd}
                    onRemove={handleRemove}
                    isAdded={isAdded}
                />
            )}

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

            {!query.trim() && (
                <>
                    <div className="sticky top-15 z-40 bg-neutral-950/80 backdrop-blur-md py-2 border-b border-white/10 md:mt-0">
                        <div className="flex justify-center gap-6 md:gap-8">
                            {["movies", "tv"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`text-lg md:text-xl font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                                        activeTab === tab
                                            ? "text-white scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                            : "text-neutral-500 hover:text-neutral-300"
                                    }`}
                                >
                                    {tab === "movies" ? "Movies" : "TV Shows"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 -mt-10 md:mt-0 pb-12 bg-linear-to-t from-black via-black to-transparent">
                        {renderTabContent()}
                    </div>
                </>
            )}

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
