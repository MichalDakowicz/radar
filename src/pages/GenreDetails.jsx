import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Loader2,
    Film,
    Star,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { fetchGenreMovies } from "../services/tmdb";
import { useMovies } from "../hooks/useMovies";
import { Navbar } from "../components/layout/Navbar";
import { BottomNav } from "../components/layout/BottomNav";

const GENRE_NAMES = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Science Fiction",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western",
};

export default function GenreDetails() {
    const { genreId } = useParams();
    const navigate = useNavigate();
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAllMovies, setShowAllMovies] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const { movies: userMovies } = useMovies();

    const genreName = GENRE_NAMES[genreId] || "Unknown Genre";

    useEffect(() => {
        async function loadGenreMovies() {
            setLoading(true);
            try {
                const moviesData = await fetchGenreMovies(genreId, 1);
                setMovies(moviesData.movies);
                setTotalPages(moviesData.totalPages);
                setTotalCount(moviesData.totalCount);
                setCurrentPage(1);
            } catch (error) {
                console.error("Failed to load genre movies", error);
            } finally {
                setLoading(false);
            }
        }
        if (genreId) {
            loadGenreMovies();
        }
    }, [genreId]);

    const loadMoreMovies = async () => {
        if (currentPage >= totalPages || loadingMore) return;

        setLoadingMore(true);
        try {
            const nextPage = currentPage + 1;
            const moviesData = await fetchGenreMovies(genreId, nextPage);
            setMovies((prev) => [...prev, ...moviesData.movies]);
            setCurrentPage(nextPage);
        } catch (error) {
            console.error("Failed to load more movies", error);
        } finally {
            setLoadingMore(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={32} />
            </div>
        );
    }

    const sortedMovies = [...movies].sort(
        (a, b) => b.voteAverage - a.voteAverage,
    );
    const topRatedMovies = sortedMovies.slice(0, 12);
    const displayedMovies = showAllMovies ? movies : topRatedMovies;

    const userWatchedCount = userMovies.filter(
        (m) => m.genres && m.genres.includes(genreName),
    ).length;

    return (
        <div className="min-h-screen bg-black pb-24">
            <Navbar />

            <div className="relative">
                <div className="absolute top-4 left-4 z-20">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                </div>

                <div className="relative h-[30vh] w-full overflow-hidden bg-gradient-to-br from-neutral-900 via-black to-black">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

                    <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 z-10">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight drop-shadow-lg">
                            {genreName}
                        </h1>

                        <div className="text-lg sm:text-xl text-neutral-300 drop-shadow-md flex flex-wrap items-center gap-3 mt-2">
                            <span className="flex items-center gap-2">
                                <Film size={20} className="text-blue-500" />
                                {totalCount}{" "}
                                {totalCount === 1 ? "Film" : "Films"}
                            </span>
                            {userWatchedCount > 0 && (
                                <>
                                    <span>•</span>
                                    <span className="text-green-400">
                                        {userWatchedCount} in your library
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-white">
                            {showAllMovies ? "All Films" : "Top Rated Films"}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {displayedMovies.map((movie) => (
                                <div
                                    key={movie.tmdbId}
                                    onClick={() =>
                                        navigate(
                                            `/movie/${movie.tmdbId}/${movie.type}`,
                                        )
                                    }
                                    className="group relative bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer hover:scale-105"
                                >
                                    <div className="aspect-2/3 relative">
                                        {movie.coverUrl ? (
                                            <img
                                                src={movie.coverUrl}
                                                alt={movie.title}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-600">
                                                <span className="text-xs text-center p-2">
                                                    {movie.title}
                                                </span>
                                            </div>
                                        )}

                                        {movie.voteAverage > 0 && (
                                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Star
                                                    size={12}
                                                    className="text-yellow-500 fill-yellow-500"
                                                />
                                                <span className="text-xs font-medium text-white">
                                                    {movie.voteAverage?.toFixed(
                                                        1,
                                                    )}
                                                </span>
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-xs font-semibold line-clamp-2">
                                                {movie.title}
                                            </p>
                                            {movie.releaseDate && (
                                                <p className="text-xs text-neutral-400">
                                                    {movie.releaseDate.substring(
                                                        0,
                                                        4,
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {movies.length > 12 && (
                            <div className="flex justify-center pt-2">
                                {showAllMovies ? (
                                    <button
                                        onClick={() => setShowAllMovies(false)}
                                        className="text-blue-500 hover:text-blue-400 text-sm transition-colors flex items-center gap-1"
                                    >
                                        Show less
                                        <ChevronUp size={16} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowAllMovies(true)}
                                        className="text-blue-500 hover:text-blue-400 text-sm transition-colors flex items-center gap-1"
                                    >
                                        View all {totalCount} films
                                        <ChevronDown size={16} />
                                    </button>
                                )}
                            </div>
                        )}

                        {showAllMovies && currentPage < totalPages && (
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={loadMoreMovies}
                                    disabled={loadingMore}
                                    className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loadingMore ? (
                                        <>
                                            <Loader2
                                                className="animate-spin"
                                                size={18}
                                            />
                                            Loading...
                                        </>
                                    ) : (
                                        `Load More (${movies.length} of ${totalCount})`
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <BottomNav />
        </div>
    );
}
