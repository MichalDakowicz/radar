import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Logo from "../components/ui/Logo";
import { usePublicMovies } from "../hooks/usePublicMovies";
import { PublicBottomNav } from "../components/layout/PublicBottomNav";
import { PublicHeader } from "../components/layout/PublicHeader";
import MovieCard from "../features/movies/MovieCard";
import MovieRow from "../features/movies/MovieRow";
import MovieDetailsModal from "../features/movies/MovieDetailsModal";
import { FilterPanel } from "../components/FilterPanel";
import { useRestoredState, useSaveScrollPosition } from "../hooks/usePageState";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../components/ui/popover";
import {
    LayoutGrid,
    List as ListIcon,
    Search,
    Loader2,
    Layers,
} from "lucide-react";
import { getDisplayStatus } from "../lib/movieStatus";


export default function SharedShelf() {
    const { userId } = useParams();
    const { movies, loading } = usePublicMovies(userId);

    // Restore state from navigation
    const restoredState = useRestoredState(`sharedShelf_${userId}`, null);

    const [viewMode, setViewMode] = useState(restoredState?.viewMode || "grid"); // "grid" | "list"
    const [searchQuery, setSearchQuery] = useState(
        restoredState?.searchQuery || "",
    );
    const [selectedMovie, setSelectedMovie] = useState(null);

    // Filters & Sorting State
    const [filterAvailability, setFilterAvailability] = useState(
        restoredState?.filterAvailability || "All",
    );
    const [filterDirector, setFilterDirector] = useState(
        restoredState?.filterDirector || "All",
    );
    const [filterYear, setFilterYear] = useState(
        restoredState?.filterYear || "All",
    );
    const [filterGenre, setFilterGenre] = useState(
        restoredState?.filterGenre || "All",
    );
    const [filterStatus, setFilterStatus] = useState(
        restoredState?.filterStatus || "All",
    );
    const [sortBy, setSortBy] = useState(restoredState?.sortBy || "custom");
    const [groupBy, setGroupBy] = useState(restoredState?.groupBy || "none");

    // Save scroll position continuously
    useSaveScrollPosition(`sharedShelf_${userId}`);

    // Extract unique values for filters
    const { uniqueDirectors, uniqueYears, uniqueGenres } = useMemo(() => {
        const directors = new Set();
        const years = new Set();
        const genres = new Set();

        movies.forEach((movie) => {
            // Normalize director
            let movieDirectors = [];
            if (Array.isArray(movie.director)) {
                movieDirectors = movie.director;
            } else if (typeof movie.director === "string") {
                if (movie.director.includes(",")) {
                    movieDirectors = movie.director
                        .split(",")
                        .map((d) => d.trim());
                } else if (movie.director.includes(";")) {
                    movieDirectors = movie.director
                        .split(";")
                        .map((d) => d.trim());
                } else {
                    movieDirectors = [movie.director];
                }
            }

            movieDirectors.forEach((d) => {
                if (d && d.trim()) directors.add(d.trim());
            });

            if (movie.releaseDate) {
                const y = movie.releaseDate.substring(0, 4);
                if (y) years.add(y);
            }

            if (movie.genres && Array.isArray(movie.genres)) {
                movie.genres.forEach((g) => genres.add(g));
            }
        });

        return {
            uniqueDirectors: Array.from(directors).sort(),
            uniqueYears: Array.from(years).sort((a, b) => b - a),
            uniqueGenres: Array.from(genres).sort(),
        };
    }, [movies]);

    // Filtering & Sorting Logic
    const filteredMovies = useMemo(() => {
        let result = [...movies];

        // Filter by Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter((m) => {
                const titleMatch = m.title.toLowerCase().includes(q);
                const dirs = Array.isArray(m.director)
                    ? m.director.join(" ").toLowerCase()
                    : (m.director || "").toLowerCase();
                const dirMatch = dirs.includes(q);
                return titleMatch || dirMatch;
            });
        }

        // Filter by Availability
        if (filterAvailability !== "All") {
            result = result.filter((m) => {
                const avail = Array.isArray(m.availability)
                    ? m.availability
                    : [m.availability || (m.format ? m.format : "Unknown")];
                // Flatten and check inclusion
                return avail.flat().includes(filterAvailability);
            });
        }

        // Filter by Status
        if (filterStatus !== "All") {
            result = result.filter(
                (m) => getDisplayStatus(m) === filterStatus,
            );
        }

        // Filter by Director
        if (filterDirector !== "All") {
            result = result.filter((m) => {
                let movieDirectors = [];
                if (Array.isArray(m.director)) {
                    movieDirectors = m.director;
                } else if (typeof m.director === "string") {
                    if (m.director.includes(",")) {
                        movieDirectors = m.director
                            .split(",")
                            .map((d) => d.trim());
                    } else if (m.director.includes(";")) {
                        movieDirectors = m.director
                            .split(";")
                            .map((d) => d.trim());
                    } else {
                        movieDirectors = [m.director];
                    }
                }
                return movieDirectors.includes(filterDirector);
            });
        }

        // Filter by Year
        if (filterYear !== "All") {
            result = result.filter(
                (m) => m.releaseDate && m.releaseDate.startsWith(filterYear),
            );
        }

        // Filter by Genre
        if (filterGenre !== "All") {
            result = result.filter(
                (m) => m.genres && m.genres.includes(filterGenre),
            );
        }

        // Sort
        result.sort((a, b) => {
            if (sortBy === "custom") {
                const orderA =
                    a.customOrder !== undefined ? a.customOrder : -a.addedAt;
                const orderB =
                    b.customOrder !== undefined ? b.customOrder : -b.addedAt;
                return orderA - orderB;
            }
            if (sortBy === "addedAt") return b.addedAt - a.addedAt;
            if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
            if (sortBy === "releaseDate")
                return (
                    new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)
                );
            if (sortBy === "director") {
                const dirA = Array.isArray(a.director)
                    ? a.director[0]
                    : a.director;
                const dirB = Array.isArray(b.director)
                    ? b.director[0]
                    : b.director;
                return (dirA || "").localeCompare(dirB || "");
            }
            if (sortBy === "title") return a.title.localeCompare(b.title);
            return 0;
        });

        return result;
    }, [
        movies,
        searchQuery,
        filterAvailability,
        filterDirector,
        filterYear,
        filterGenre,
        filterStatus,
        sortBy,
    ]);

    // Grouping Logic
    const groupedMovies = useMemo(() => {
        if (groupBy === "none") return null;

        const groups = {};

        filteredMovies.forEach((movie) => {
            let key = "Other";

            if (groupBy === "director") {
                const primary = Array.isArray(movie.director)
                    ? movie.director[0]
                    : movie.director;
                key = primary || "Unknown Director";
            } else if (groupBy === "year") {
                key = movie.releaseDate
                    ? movie.releaseDate.substring(0, 4)
                    : "Unknown Year";
            } else if (groupBy === "genre") {
                key =
                    movie.genres && movie.genres.length > 0
                        ? movie.genres[0]
                        : "No Genre";
            } else if (groupBy === "format") {
                key =
                    (Array.isArray(movie.format)
                        ? movie.format[0]
                        : movie.format) || "Digital";
            } else if (groupBy === "status") {
                key = movie.status || "Collection";
            }

            if (!groups[key]) groups[key] = [];
            groups[key].push(movie);
        });

        // Sort keys
        let sortedKeys = Object.keys(groups).sort();
        if (groupBy === "year") {
            sortedKeys = sortedKeys.reverse();
        }

        return sortedKeys.map((key) => ({
            title: key,
            movies: groups[key],
        }));
    }, [filteredMovies, groupBy]);

    const handleClearFilters = () => {
        setFilterAvailability("All");
        setFilterDirector("All");
        setFilterYear("All");
        setFilterGenre("All");
        setFilterStatus("All");
        setSearchQuery("");
    };

    // Save current state to sessionStorage
    useEffect(() => {
        const currentState = {
            viewMode,
            searchQuery,
            filterAvailability,
            filterDirector,
            filterYear,
            filterGenre,
            filterStatus,
            sortBy,
            groupBy,
            scrollPosition: window.scrollY,
        };

        try {
            sessionStorage.setItem(
                `pageState_sharedShelf_${userId}`,
                JSON.stringify(currentState),
            );
        } catch (error) {
            console.warn("Error saving page state:", error);
        }
    }, [
        viewMode,
        searchQuery,
        filterAvailability,
        filterDirector,
        filterYear,
        filterGenre,
        filterStatus,
        sortBy,
        groupBy,
        userId,
    ]);

    // Restore scroll position on mount if we have restored state
    useEffect(() => {
        if (restoredState?.scrollPosition) {
            setTimeout(() => {
                window.scrollTo(0, restoredState.scrollPosition);
            }, 100);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black text-blue-500">
                <Loader2 size={48} className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200">
            <MovieDetailsModal
                isOpen={!!selectedMovie}
                movie={selectedMovie}
                onClose={() => setSelectedMovie(null)}
                readOnly={true}
            />

            <PublicHeader />

            <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 pt-6 pb-24">
                {/* Toolbar */}
                <div className="mb-4 flex flex-row items-center justify-between gap-3 sm:gap-4">
                    <div className="relative flex-1 min-w-0">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search this collection..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 rounded-lg bg-neutral-900 border border-neutral-800 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex h-10 items-center rounded-lg border border-neutral-800 bg-neutral-900 p-1 shrink-0">
                            <FilterPanel
                                filterAvailability={filterAvailability}
                                setFilterAvailability={setFilterAvailability}
                                filterDirector={filterDirector}
                                setFilterDirector={setFilterDirector}
                                filterGenre={filterGenre}
                                setFilterGenre={setFilterGenre}
                                filterYear={filterYear}
                                setFilterYear={setFilterYear}
                                filterStatus={filterStatus}
                                setFilterStatus={setFilterStatus}
                                sortBy={sortBy}
                                setSortBy={setSortBy}
                                uniqueDirectors={uniqueDirectors}
                                uniqueGenres={uniqueGenres}
                                uniqueYears={uniqueYears}
                                onClearAll={handleClearFilters}
                                isMovieMode={true}
                            />
                        </div>

                        <div className="flex h-10 items-center rounded-lg border border-neutral-800 bg-neutral-900 p-1 shrink-0">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        className={`flex items-center gap-2 rounded px-2 py-1 text-sm font-medium transition-colors cursor-pointer ${
                                            groupBy !== "none"
                                                ? "bg-neutral-800 text-white"
                                                : "text-neutral-500 hover:text-neutral-300"
                                        }`}
                                    >
                                        <Layers size={16} />
                                        <span className="hidden sm:inline">
                                            Group
                                        </span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-48 p-2 bg-neutral-900 border-neutral-800"
                                    align="end"
                                >
                                    <div className="grid gap-1">
                                        <h4 className="font-medium text-xs text-neutral-500 mb-2 px-2 uppercase">
                                            Group By
                                        </h4>
                                        {[
                                            "none",
                                            "director",
                                            "year",
                                            "genre",
                                            "format",
                                            "status",
                                        ].map((opt) => (
                                            <button
                                                key={opt}
                                                onClick={() => setGroupBy(opt)}
                                                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                                                    groupBy === opt
                                                        ? "bg-blue-500/10 text-blue-500"
                                                        : "text-neutral-300 hover:bg-neutral-800"
                                                }`}
                                            >
                                                {opt.charAt(0).toUpperCase() +
                                                    opt.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex h-10 items-center rounded-lg border border-neutral-800 bg-neutral-900 p-1 shrink-0">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`rounded p-1.5 transition-colors cursor-pointer ${
                                    viewMode === "grid"
                                        ? "bg-neutral-800 text-white"
                                        : "text-neutral-500 hover:text-neutral-300"
                                }`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`rounded p-1.5 transition-colors cursor-pointer ${
                                    viewMode === "list"
                                        ? "bg-neutral-800 text-white"
                                        : "text-neutral-500 hover:text-neutral-300"
                                }`}
                            >
                                <ListIcon size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {filteredMovies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
                        <Logo className="h-12 w-12 mb-4 opacity-20" />
                        <p>No movies found in this collection.</p>
                        {(searchQuery ||
                            filterAvailability !== "All" ||
                            filterDirector !== "All") && (
                            <button
                                onClick={handleClearFilters}
                                className="mt-4 text-blue-500 hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {groupBy === "none" ? (
                            // Flat View
                            viewMode === "grid" ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6 p-2">
                                    {filteredMovies.map((movie) => (
                                        <MovieCard
                                            key={movie.id}
                                            movie={movie}
                                            onClick={() =>
                                                setSelectedMovie(movie)
                                            }
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredMovies.map((movie) => (
                                        <MovieRow
                                            key={movie.id}
                                            movie={movie}
                                            onClick={() =>
                                                setSelectedMovie(movie)
                                            }
                                        />
                                    ))}
                                </div>
                            )
                        ) : (
                            // Grouped View
                            <div className="flex flex-col gap-8">
                                {groupedMovies.map((group) => (
                                    <div key={group.title}>
                                        <h3 className="text-xl font-bold text-blue-500 mb-4 px-2 border-b border-blue-500/20 pb-2">
                                            {group.title}
                                            <span className="text-sm font-normal text-neutral-500 ml-2">
                                                ({group.movies.length})
                                            </span>
                                        </h3>
                                        {viewMode === "grid" ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6 p-2">
                                                {group.movies.map((movie) => (
                                                    <MovieCard
                                                        key={movie.id}
                                                        movie={movie}
                                                        onClick={() =>
                                                            setSelectedMovie(
                                                                movie,
                                                            )
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {group.movies.map((movie) => (
                                                    <MovieRow
                                                        key={movie.id}
                                                        movie={movie}
                                                        onClick={() =>
                                                            setSelectedMovie(
                                                                movie,
                                                            )
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            <PublicBottomNav />
        </div>
    );
}
