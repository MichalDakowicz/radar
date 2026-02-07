import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useMovies } from "../hooks/useMovies";
import { useToast } from "../components/ui/Toast";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import MovieCard from "../features/movies/MovieCard";
import MovieRow from "../features/movies/MovieRow";
import RandomPickModal from "../features/movies/RandomPickModal";
import { FilterPanel } from "../components/FilterPanel";
import { Navbar } from "../components/layout/Navbar";
import {
    LayoutGrid,
    List as ListIcon,
    Search,
    Layers,
} from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableMovie({ movie, viewMode, innerRef, disabled, ...props }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: movie.id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
        opacity: isDragging ? 0.5 : 1,
    };

    const Wrapper = "div";
    const Component = viewMode === "grid" ? MovieCard : MovieRow;

    return (
        <Wrapper
            ref={(node) => {
                setNodeRef(node);
                if (innerRef) innerRef(node);
            }}
            style={style}
            {...attributes}
            {...listeners}
            className={
                viewMode === "list"
                    ? "w-full touch-manipulation"
                    : "h-full touch-manipulation"
            }
        >
            <Component movie={movie} {...props} />
        </Wrapper>
    );
}

// Hook for persisted state
function usePersistedState(key, defaultValue) {
    const [state, setState] = useState(() => {
        try {
            const storedValue = localStorage.getItem(key);
            return storedValue !== null
                ? JSON.parse(storedValue)
                : defaultValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, state]);

    return [state, setState];
}

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { movies, loading, addMovie, updateMovie, removeMovie } = useMovies();
    const { toast } = useToast();

    const [viewMode, setViewMode] = usePersistedState("mt_viewMode", "grid");
    const [gridSize] = usePersistedState("mt_gridSize", "normal");
    const [groupBy, setGroupBy] = usePersistedState("mt_groupBy", "none");
    const [isPickModalOpen, setIsPickModalOpen] = useState(false);

    const gridClasses = useMemo(() => {
        switch (gridSize) {
            case "compact":
                return "grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 p-2";
            case "large":
                return "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 p-2";
            default:
                return "grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 p-2";
        }
    }, [gridSize]);
    const [searchQuery, setSearchQuery] = useState("");

    const [filterAvailability, setFilterAvailability] = usePersistedState(
        "mt_filterAvailability",
        "All",
    );
    const [filterDirector, setFilterDirector] = usePersistedState(
        "mt_filterDirector",
        "All",
    );
    const [filterYear, setFilterYear] = usePersistedState(
        "mt_filterYear",
        "All",
    );
    const [filterGenre, setFilterGenre] = usePersistedState(
        "mt_filterGenre",
        "All",
    );
    const [filterStatus, setFilterStatus] = usePersistedState(
        "mt_filterStatus_v2",
        "All",
    );
    const [sortBy, setSortBy] = usePersistedState("mt_sortBy", "custom");

    const [highlightedMovieId, setHighlightedMovieId] = useState(null);

    // Dnd States
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    // Map to store refs of movie elements for scrolling
    const itemsRef = useRef(new Map());

    // Extract unique directors, years, and genres for filters
    const { uniqueDirectors, uniqueYears, uniqueGenres } = useMemo(() => {
        const directors = new Set();
        const years = new Set();
        const genres = new Set();

        movies.forEach((movie) => {
            // Normalize to array
            let movieDirectors = [];
            if (Array.isArray(movie.director)) {
                movieDirectors = movie.director;
            } else if (typeof movie.director === "string") {
                if (movie.director.includes(",")) {
                    movieDirectors = movie.director.split(",").map((d) => d.trim());
                } else if (movie.director.includes(";")) {
                    movieDirectors = movie.director.split(";").map((d) => d.trim());
                } else {
                    movieDirectors = [movie.director];
                }
            }

            movieDirectors.forEach((p) => {
                if (p && p.trim()) directors.add(p.trim());
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

    // Derived state for filtered movies
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
                return avail.flat().includes(filterAvailability);
            });
        }

        // Filter by Status
        if (filterStatus !== "All") {
            if (filterStatus === "Watchlist") {
                result = result.filter((m) => m.inWatchlist === true || (m.status || "Watchlist") === "Watchlist");
            } else if (filterStatus === "Watched") {
                result = result.filter((m) => (m.timesWatched > 0) || (m.status === "Watched"));
            } else {
                result = result.filter((m) => (m.status || "Watchlist") === filterStatus);
            }
        }

        // Filter by Director
        if (filterDirector !== "All") {
            result = result.filter((m) => {
                let movieDirectors = [];
                if (Array.isArray(m.director)) {
                    movieDirectors = m.director;
                } else if (typeof m.director === "string") {
                    if (m.director.includes(",")) {
                        movieDirectors = m.director.split(",").map((d) => d.trim());
                    } else if (m.director.includes(";")) {
                        movieDirectors = m.director.split(";").map((d) => d.trim());
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
            if (sortBy === "rating") {
                const getRating = (m) => {
                    if (m.ratings) {
                        const vals = Object.values(m.ratings).filter(v => v > 0);
                        if (vals.length > 0) return vals.reduce((x, y) => x + y, 0) / vals.length;
                    }
                    return m.rating || 0;
                };
                return getRating(b) - getRating(a);
            }
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

    // Movies eligible for random spin
    const validPickMovies = useMemo(() => {
        if (filterStatus !== "All") {
             return filteredMovies;
        }
        return filteredMovies.filter(m => !m.status || m.status === 'Watchlist');
    }, [filteredMovies, filterStatus]);

    // Derived state for grouped movies
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
                 key = (movie.genres && movie.genres.length > 0) ? movie.genres[0] : "No Genre";
            } else if (groupBy === "availability") {
                 const avail = Array.isArray(movie.availability) ? movie.availability : (movie.format ? [movie.format] : []);
                 key = (avail.length > 0 ? avail[0] : "Unknown");
            } else if (groupBy === "status") {
                 key = movie.status || "Collection";
            }

            if (!groups[key]) groups[key] = [];
            groups[key].push(movie);
        });

        // Sort keys
        let sortedKeys = Object.keys(groups).sort();
        
        // Reverse sort for years (newest first)
        if (groupBy === "year") {
            sortedKeys = sortedKeys.reverse();
        }

        return sortedKeys.map((key) => ({
            title: key,
            movies: groups[key],
        }));
    }, [filteredMovies, groupBy]);

    const isReorderEnabled =
        sortBy === "custom" &&
        groupBy === "none" &&
        !searchQuery &&
        filterAvailability === "All" &&
        filterDirector === "All" &&
        filterYear === "All" &&
        filterGenre === "All";

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (active.id !== over.id) {
            const oldIndex = filteredMovies.findIndex(
                (item) => item.id === active.id,
            );
            const newIndex = filteredMovies.findIndex(
                (item) => item.id === over.id,
            );

            if (oldIndex !== -1 && newIndex !== -1) {
                const newItems = arrayMove(filteredMovies, oldIndex, newIndex);
                const prevItem = newItems[newIndex - 1];
                const nextItem = newItems[newIndex + 1];

                const getOrder = (a) =>
                    a.customOrder !== undefined ? a.customOrder : -a.addedAt;

                let newOrder;
                
                if (!prevItem) {
                    newOrder = getOrder(nextItem) - 100000;
                } else if (!nextItem) {
                    newOrder = getOrder(prevItem) + 100000;
                } else {
                    newOrder = (getOrder(prevItem) + getOrder(nextItem)) / 2;
                }

                updateMovie(active.id, { customOrder: newOrder });
            }
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    // Effect to handle scrolling when highlightedMovieId changes
    useEffect(() => {
        if (highlightedMovieId) {
            const node = itemsRef.current.get(highlightedMovieId);
            if (node) {
                node.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }, [highlightedMovieId]);

    const handleRandomPick = () => {
        if (validPickMovies.length === 0) {
             toast({ 
                title: "No Movies to Pick", 
                description: "No movies match your current filters.", 
                variant: "destructive" 
             });
             return;
        }
        setIsPickModalOpen(true);
    };

    const handleClearFilters = () => {
        setFilterFormat("All");
        setFilterDirector("All");
        setFilterYear("All");
        setFilterGenre("All");
        setFilterStatus("All");
        setSearchQuery("");
    };

    return (
        <div
            className="min-h-screen bg-neutral-950 text-neutral-200"
            onClick={() => setHighlightedMovieId(null)}
        >
            <Navbar onPickRandom={handleRandomPick} />

            <main
                className="mx-auto max-w-screen-2xl px-4 sm:px-6 pt-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Toolbar */}
                <div className="mb-4 flex flex-row items-center justify-between gap-3 sm:gap-4">
                    <div className="relative flex-1 min-w-0">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search library..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 rounded-lg bg-neutral-900 border border-neutral-800 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                    <button className={`flex items-center gap-2 rounded px-2 py-1 text-sm font-medium transition-colors cursor-pointer ${
                                        groupBy !== "none" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                                    }`}>
                                        <Layers size={16} />
                                        <span className="hidden sm:inline">Group</span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2 bg-neutral-900 border-neutral-800" align="end">
                                    <div className="grid gap-1">
                                        <h4 className="font-medium text-xs text-neutral-500 mb-2 px-2 uppercase">Group By</h4>
                                        {["none", "director", "year", "genre", "availability", "status"].map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => setGroupBy(opt)}
                                                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                                                    groupBy === opt ? "bg-blue-500/10 text-blue-500" : "text-neutral-300 hover:bg-neutral-800"
                                                }`}
                                            >
                                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex h-10 items-center rounded-lg border border-neutral-800 bg-neutral-900 p-1 shrink-0">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`rounded p-1.5 transition-colors cursor-pointer ${viewMode === "grid" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"}`}
                                title="Grid View"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`rounded p-1.5 transition-colors cursor-pointer ${viewMode === "list" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"}`}
                                title="List View"
                            >
                                <ListIcon size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    {loading ? (
                        <div className="flex h-64 items-center justify-center text-neutral-500">
                            Loading collection...
                        </div>
                    ) : filteredMovies.length === 0 ? (
                        <div className="flex h-64 flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/50 text-neutral-500">
                            <p className="mb-4">No movies found.</p>
                            <p className="text-sm">Use the "Add Movie" button in the header to get started.</p>
                        </div>
                    ) : groupedMovies ? (
                        <div className="flex flex-col gap-8 pb-20">
                            {groupedMovies.map((group) => (
                                <div key={group.title}>
                                    <h2 className="text-xl font-bold text-white mb-4 pl-2 flex items-center gap-2">
                                        <div className="h-5 w-1 bg-blue-500 rounded-full" />
                                        {group.title}
                                        <span className="text-sm font-normal text-neutral-500">
                                            ({group.movies.length})
                                        </span>
                                    </h2>
                                    {viewMode === "grid" ? (
                                        <div className={gridClasses}>
                                            {group.movies.map((movie) => (
                                                <MovieCard
                                                    key={movie.id}
                                                    movie={movie}
                                                    onClick={() =>
                                                        navigate("/edit/" + movie.id)
                                                    }
                                                    isHighlighted={
                                                        highlightedMovieId ===
                                                        movie.id
                                                    }
                                                    innerRef={(node) => {
                                                        const map =
                                                            itemsRef.current;
                                                        if (node)
                                                            map.set(
                                                                movie.id,
                                                                node,
                                                            );
                                                        else
                                                            map.delete(
                                                                movie.id,
                                                            );
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {group.movies.map((movie) => (
                                                <MovieRow
                                                    key={movie.id}
                                                    movie={movie}
                                                    onClick={() =>
                                                        navigate("/edit/" + movie.id)
                                                    }
                                                    isHighlighted={
                                                        highlightedMovieId ===
                                                        movie.id
                                                    }
                                                    innerRef={(node) => {
                                                        const map =
                                                            itemsRef.current;
                                                        if (node)
                                                            map.set(
                                                                movie.id,
                                                                node,
                                                            );
                                                        else
                                                            map.delete(
                                                                movie.id,
                                                            );
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <SortableContext
                            items={filteredMovies.map((m) => m.id)}
                            strategy={
                                viewMode === "grid"
                                    ? rectSortingStrategy
                                    : verticalListSortingStrategy
                            }
                            disabled={!isReorderEnabled}
                        >
                            {viewMode === "grid" ? (
                                <div className={`${gridClasses} pb-20`}>
                                    {filteredMovies.map((movie) => (
                                        <SortableMovie
                                            key={movie.id}
                                            movie={movie}
                                            viewMode="grid"
                                            onClick={() =>
                                                navigate("/edit/" + movie.id)
                                            }
                                            isHighlighted={
                                                highlightedMovieId === movie.id
                                            }
                                            innerRef={(node) => {
                                                const map = itemsRef.current;
                                                if (node) {
                                                    map.set(movie.id, node);
                                                } else {
                                                    map.delete(movie.id);
                                                }
                                            }}
                                            disabled={!isReorderEnabled}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 pb-20">
                                    {filteredMovies.map((movie) => (
                                        <SortableMovie
                                            key={movie.id}
                                            movie={movie}
                                            viewMode="list"
                                            onClick={() =>
                                                navigate("/edit/" + movie.id)
                                            }
                                            isHighlighted={
                                                highlightedMovieId === movie.id
                                            }
                                            innerRef={(node) => {
                                                const map = itemsRef.current;
                                                if (node) {
                                                    map.set(movie.id, node);
                                                } else {
                                                    map.delete(movie.id);
                                                }
                                            }}
                                            disabled={!isReorderEnabled}
                                        />
                                    ))}
                                </div>
                            )}
                        </SortableContext>
                    )}

                    <DragOverlay adjustScale={true}>
                        {activeId
                            ? (() => {
                                  const movie = movies.find(
                                      (m) => m.id === activeId,
                                  );
                                  if (!movie) return null;
                                  return viewMode === "grid" ? (
                                      <div className="h-full touch-manipulation">
                                          <MovieCard
                                              movie={movie}
                                              isHighlighted={true}
                                              readOnly
                                          />
                                      </div>
                                  ) : (
                                      <div className="w-full touch-manipulation">
                                          <MovieRow
                                              movie={movie}
                                              isHighlighted={true}
                                          />
                                      </div>
                                  );
                              })()
                            : null}
                    </DragOverlay>
                </DndContext>
            </main>

            <RandomPickModal
                isOpen={isPickModalOpen}
                onClose={() => setIsPickModalOpen(false)}
                movies={validPickMovies}
                onSelect={(id) => {
                    setHighlightedMovieId(id);
                }}
            />
        </div>
    );
}
