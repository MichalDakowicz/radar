import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Plus, Check, Flame, X, Trash2, Star } from "lucide-react";
import { searchMedia, fetchMediaMetadata, getTrending } from "../services/tmdb";
import { useMovies } from "../hooks/useMovies";
import { useToast } from "../components/ui/Toast";
import { Navbar } from "../components/layout/Navbar";
import { BottomNav } from "../components/layout/BottomNav";

function MediaGrid({ items, onAdd, onRemove, onSelect, addingId, removingId, isAdded }) {
    if (!items || items.length === 0) return null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => {
                const added = isAdded(item.tmdbId);
                return (
                    <div 
                        key={item.tmdbId} 
                        onClick={() => onSelect(item)}
                        className={`group relative bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer ${added ? 'opacity-50 grayscale' : ''}`}
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
                                    <span className="text-xs text-center p-2">{item.title}</span>
                                </div>
                            )}

                            {/* Rating Badge */}
                            {item.voteAverage > 0 && (
                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded flex items-center gap-1 z-10">
                                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                    <span className="text-xs font-medium text-white">{item.voteAverage?.toFixed(1)}</span>
                                </div>
                            )}

                             {/* Mobile Actions (Visible on small screens) */}
                             <div className="absolute top-2 right-2 md:hidden z-10">
                                {added ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove(item);
                                        }}
                                        disabled={removingId === item.tmdbId}
                                        className="bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-full backdrop-blur-md transition-colors"
                                    >
                                        {removingId === item.tmdbId ? (
                                             <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAdd(item);
                                        }}
                                        disabled={addingId === item.tmdbId}
                                        className="bg-blue-600/80 hover:bg-blue-500 text-white p-1.5 rounded-full backdrop-blur-md transition-colors"
                                    >
                                        {addingId === item.tmdbId ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Plus size={16} />
                                        )}
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
                                        disabled={removingId === item.tmdbId}
                                        className="bg-red-500/20 hover:bg-red-500/40 text-red-500 px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md transition-all border border-red-500/30 hover:border-red-500/50"
                                    >
                                        {removingId === item.tmdbId ? (
                                             <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                        <span className="text-xs font-bold">Remove</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAdd(item);
                                        }}
                                        disabled={addingId === item.tmdbId}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {addingId === item.tmdbId ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Plus size={16} />
                                        )}
                                        <span className="text-sm font-bold">Add</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="p-3">
                            <h3 className="text-sm font-medium text-white line-clamp-1" title={item.title}>{item.title}</h3>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-neutral-500 uppercase">{item.type === 'movie' ? 'Movie' : 'TV Show'}</span>
                                <span className="text-xs text-neutral-500">{item.releaseDate?.substring(0, 4)}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function Browse() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(false);
    const [addingId, setAddingId] = useState(null); // ID of movie currently being added
    const [removingId, setRemovingId] = useState(null);
    const navigate = useNavigate();

    const { addMovie, removeMovie, movies } = useMovies();
    const { toast } = useToast();

    useEffect(() => {
        getTrending().then(setTrending).catch(console.error);
    }, []);

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
            toast({
                title: "Error",
                description: "Failed to search movies",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAdd = async (item) => {
        setAddingId(item.tmdbId);
        try {
            // Check if already in library
            const existing = movies.find(m => m.tmdbId === item.tmdbId);
            if (existing) {
                toast({
                    title: "Already in Library",
                    description: `"${item.title}" is already in your library.`,
                    variant: "default",
                });
                return;
            }

            const fullData = await fetchMediaMetadata(item.tmdbId, item.type);
            
            // Default data for quick add
            const movieData = {
                ...fullData,
                status: "Plan to Watch", // Default status
                inWatchlist: true,
                timesWatched: 0,
                addedAt: Date.now(),
                ratings: {
                    story: 0,
                    acting: 0,
                    ending: 0,
                    enjoyment: 0,
                    overall: 0
                }
            };

            await addMovie(movieData);
            
            toast({
                title: "Added to Library",
                description: `"${item.title}" added to your Plan to Watch list.`,
                variant: "success", // Assuming success variant exists, otherwise default
            });
        } catch (error) {
            console.error("Quick Add Error:", error);
            toast({
                title: "Error",
                description: "Failed to add movie to library",
                variant: "destructive",
            });
        } finally {
            setAddingId(null);
        }
    };

    const handleRemove = async (item) => {
        setRemovingId(item.tmdbId);
        try {
            const movieToRemove = movies.find(m => m.tmdbId === item.tmdbId);
            if (movieToRemove) {
                await removeMovie(movieToRemove.id);
                toast({
                    title: "Removed",
                    description: `"${item.title}" removed from your library.`,
                    variant: "default",
                });
            }
        } catch (error) {
           console.error("Remove Error:", error);
           toast({
               title: "Error",
               description: "Failed to remove movie",
               variant: "destructive",
           });
        } finally {
            setRemovingId(null);
        }
    };

    const isAdded = (tmdbId) => {
        return movies.some(m => m.tmdbId == tmdbId);
    };

    const handleViewDetails = (item) => {
        navigate(`/movie/${item.tmdbId}/${item.type}`);
    };

    return (
        <div className="min-h-screen bg-black pb-24">
            <Navbar />
            
            <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 space-y-6">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-white">Browse</h2>
                    <p className="text-neutral-400">Search for movies and TV shows to add to your library.</p>
                </div>

                <div className="relative max-w-xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
                    <input
                        className="w-full bg-neutral-900 border border-neutral-800 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-neutral-500"
                        placeholder="Search movies & TV shows..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    {loading && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader2 className="animate-spin text-neutral-400" size={20} />
                        </div>
                    )}
                </div>

                 {query.trim() ? (
                    <>
                        {results.length > 0 ? (
                            <MediaGrid 
                                items={results} 
                                onAdd={handleQuickAdd} 
                                onRemove={handleRemove}
                                onSelect={handleViewDetails}
                                addingId={addingId} 
                                removingId={removingId}
                                isAdded={isAdded} 
                            />
                        ) : !loading && (
                            <div className="text-center py-12 text-neutral-500">
                                No results found for "{query}"
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Flame className="text-orange-500" /> Trending This Week
                        </h3>
                        <MediaGrid 
                            items={trending} 
                            onAdd={handleQuickAdd} 
                            onRemove={handleRemove}
                            onSelect={handleViewDetails}
                            addingId={addingId} 
                            removingId={removingId}
                            isAdded={isAdded} 
                        />
                    </div>
                )}
            </div>
            
            <BottomNav />
        </div>
    );
}
