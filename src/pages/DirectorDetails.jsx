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
import { fetchDirectorDetails, fetchDirectorMovies } from "../services/tmdb";
import { useMovies } from "../hooks/useMovies";
import { Navbar } from "../components/layout/Navbar";
import { BottomNav } from "../components/layout/BottomNav";

export default function DirectorDetails() {
    const { directorId } = useParams();
    const navigate = useNavigate();
    const [director, setDirector] = useState(null);
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAllMovies, setShowAllMovies] = useState(false);
    const [showFullBio, setShowFullBio] = useState(false);
    const { movies: userMovies } = useMovies();

    useEffect(() => {
        async function loadDirector() {
            setLoading(true);
            try {
                const [directorData, moviesData] = await Promise.all([
                    fetchDirectorDetails(directorId),
                    fetchDirectorMovies(directorId),
                ]);
                setDirector(directorData);
                setMovies(moviesData);
            } catch (error) {
                console.error("Failed to load director details", error);
            } finally {
                setLoading(false);
            }
        }
        if (directorId) {
            loadDirector();
        }
    }, [directorId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={32} />
            </div>
        );
    }

    if (!director) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
                <p>Director not found</p>
                <button
                    onClick={() => navigate(-1)}
                    className="text-blue-500 hover:underline"
                >
                    Go Back
                </button>
            </div>
        );
    }

    // Sort movies by rating and get top rated
    const sortedMovies = [...movies].sort(
        (a, b) => b.voteAverage - a.voteAverage,
    );
    const topRatedMovies = sortedMovies.slice(0, 6);
    const displayedMovies = showAllMovies ? sortedMovies : topRatedMovies;

    // Calculate stats
    const userWatchedCount = userMovies.filter(
        (m) =>
            m.director &&
            Array.isArray(m.director) &&
            m.director.includes(director.name),
    ).length;

    return (
        <div className="min-h-screen bg-black pb-24">
            <Navbar />

            <div className="relative">
                {/* Back Button */}
                <div className="absolute top-4 left-4 z-20">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                </div>

                {/* Hero Section */}
                <div className="relative h-[40vh] sm:h-[50vh] w-full overflow-hidden">
                    {director.profileUrl ? (
                        <>
                            <div
                                className="absolute inset-0 bg-cover bg-center blur-xl opacity-30"
                                style={{
                                    backgroundImage: `url(${director.profileUrl})`,
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-neutral-900" />
                    )}

                    <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-end gap-6 z-10">
                        {/* Profile Image */}
                        <div className="w-32 sm:w-48 aspect-2/3 shrink-0 rounded-xl overflow-hidden border-2 border-neutral-800 shadow-2xl bg-neutral-800">
                            {director.profileUrl ? (
                                <img
                                    src={director.profileUrl}
                                    alt={director.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-neutral-500">
                                    <div className="text-4xl font-bold">
                                        {director.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .substring(0, 2)}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2 mb-2">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg">
                                {director.name}
                            </h1>

                            <div className="text-lg sm:text-xl text-neutral-300 drop-shadow-md flex flex-wrap items-center gap-3">
                                <span className="flex items-center gap-2">
                                    <Film size={20} className="text-blue-500" />
                                    {movies.length}{" "}
                                    {movies.length === 1 ? "Film" : "Films"}
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

                            {director.knownForDepartment && (
                                <div className="text-neutral-400">
                                    Known for {director.knownForDepartment}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
                    {/* Biography */}
                    {director.biography && (
                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-white">
                                Biography
                            </h3>
                            <div className="text-neutral-400 leading-relaxed text-lg">
                                <p
                                    className={
                                        showFullBio ? "" : "line-clamp-4"
                                    }
                                >
                                    {director.biography}
                                </p>
                                {director.biography.length > 300 && (
                                    <button
                                        onClick={() =>
                                            setShowFullBio(!showFullBio)
                                        }
                                        className="text-blue-500 hover:text-blue-400 text-sm mt-2 transition-colors"
                                    >
                                        {showFullBio
                                            ? "Show less"
                                            : "Read more"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Personal Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {director.birthday && (
                            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                                <div className="text-xs text-neutral-500 uppercase font-bold mb-1">
                                    Born
                                </div>
                                <div className="text-white">
                                    {new Date(
                                        director.birthday,
                                    ).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </div>
                            </div>
                        )}

                        {director.placeOfBirth && (
                            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                                <div className="text-xs text-neutral-500 uppercase font-bold mb-1">
                                    Birthplace
                                </div>
                                <div className="text-white">
                                    {director.placeOfBirth}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Top Rated Movies */}
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

                        {/* Show More/Less Button */}
                        {movies.length > 6 && (
                            <div className="flex justify-center pt-2">
                                <button
                                    onClick={() =>
                                        setShowAllMovies(!showAllMovies)
                                    }
                                    className="text-blue-500 hover:text-blue-400 text-sm transition-colors flex items-center gap-1"
                                >
                                    {showAllMovies ? (
                                        <>
                                            Show less
                                            <ChevronUp size={16} />
                                        </>
                                    ) : (
                                        <>
                                            View all {movies.length} films
                                            <ChevronDown size={16} />
                                        </>
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
