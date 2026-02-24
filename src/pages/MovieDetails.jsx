import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    X,
    Calendar,
    Clapperboard,
    StickyNote,
    Monitor,
    ExternalLink,
    Star,
    Clock,
    Play,
    ArrowLeft,
    Loader2,
    Plus,
    Check,
    Users,
    Building,
    Quote,
    Wallet,
    BarChart3,
} from "lucide-react";
import { useMovies } from "../hooks/useMovies";
import { fetchMediaMetadata } from "../services/tmdb";
import { Navbar } from "../components/layout/Navbar";
import { BottomNav } from "../components/layout/BottomNav";
import { useToast } from "../components/ui/Toast";
import { getServiceStyle } from "../lib/services";

export default function MovieDetails() {
    const { tmdbId, type } = useParams();
    const navigate = useNavigate();
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addMovie, removeMovie, movies } = useMovies(); // Access library functions
    const { toast } = useToast();
    const [adding, setAdding] = useState(false);
    const [removing, setRemoving] = useState(false);

    useEffect(() => {
        async function loadMovie() {
            setLoading(true);
            try {
                const data = await fetchMediaMetadata(tmdbId, type || "movie");
                setMovie(data);
            } catch (error) {
                console.error("Failed to load movie details", error);
            } finally {
                setLoading(false);
            }
        }
        if (tmdbId) {
            loadMovie();
        }
    }, [tmdbId, type]);

    const existingMovie = movies.find((m) => m.tmdbId === parseInt(tmdbId));
    const isAdded = !!existingMovie;

    const handleAdd = async () => {
        if (!movie) return;
        setAdding(true);
        try {
            // Default data - using new boolean flag system
            const movieData = {
                ...movie,
                status: "Watchlist", // Backward compatibility
                inWatchlist: true,
                inProgress: false,
                watched: false,
                timesWatched: 0,
                addedAt: Date.now(),
                ratings: {
                    story: 0,
                    acting: 0,
                    ending: 0,
                    enjoyment: 0,
                    overall: 0,
                },
            };

            await addMovie(movieData);
            toast({
                title: "Added to Library",
                description: `"${movie.title}" added to your Watchlist.`,
                variant: "success",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to add movie",
                variant: "destructive",
            });
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async () => {
        if (!existingMovie) return;
        setRemoving(true);
        try {
            await removeMovie(existingMovie.id);
            toast({
                title: "Removed",
                description: `"${movie.title}" removed from your library.`,
                variant: "default",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to remove movie",
                variant: "destructive",
            });
        } finally {
            setRemoving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={32} />
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
                <p>Movie not found</p>
                <button
                    onClick={() => navigate(-1)}
                    className="text-blue-500 hover:underline"
                >
                    Go Back
                </button>
            </div>
        );
    }

    // Normalize director
    const directors = Array.isArray(movie.director)
        ? movie.director
        : (Array.isArray(movie.artist)
              ? movie.artist
              : [movie.artist || movie.director]
          ).filter(Boolean);

    const availability = Array.isArray(movie.availability)
        ? movie.availability
        : movie.format
        ? [movie.format]
        : [];

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
                    {movie.coverUrl ? (
                        <>
                            <div
                                className="absolute inset-0 bg-cover bg-center blur-xl opacity-50"
                                style={{
                                    backgroundImage: `url(${movie.coverUrl})`,
                                }}
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-neutral-900" />
                    )}

                    <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-end gap-6 z-10">
                        {/* Poster */}
                        <div className="w-32 sm:w-48 aspect-2/3 shrink-0 rounded-xl overflow-hidden border-2 border-neutral-800 shadow-2xl bg-neutral-800 hidden sm:block">
                            {movie.coverUrl ? (
                                <img
                                    src={movie.coverUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-neutral-500">
                                    <Clapperboard size={32} />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2 mb-2 w-full">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg">
                                {movie.title}
                            </h1>

                            {movie.tagline && (
                                <p className="text-lg text-neutral-300 italic flex items-center gap-2">
                                    <Quote
                                        size={16}
                                        className="text-neutral-500 fill-neutral-500"
                                    />
                                    {movie.tagline}
                                </p>
                            )}

                            <div className="text-lg sm:text-xl text-neutral-300 drop-shadow-md flex flex-wrap items-center gap-2">
                                {directors.length > 0 && (
                                    <span>{directors.join(", ")}</span>
                                )}
                                {directors.length > 0 && movie.releaseDate && (
                                    <span>•</span>
                                )}
                                {movie.releaseDate && (
                                    <span>
                                        {movie.releaseDate.substring(0, 4)}
                                    </span>
                                )}
                            </div>

                            {/* Mobile Poster (Small) + Actions */}
                            <div className="flex items-center gap-4 mt-4 sm:hidden w-full">
                                <div className="w-24 aspect-2/3 shrink-0 rounded-lg overflow-hidden border border-neutral-800 shadow-lg bg-neutral-800">
                                    {movie.coverUrl ? (
                                        <img
                                            src={movie.coverUrl}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-neutral-500">
                                            <Clapperboard size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {isAdded ? (
                                        <button
                                            onClick={handleRemove}
                                            disabled={removing}
                                            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-500 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors border border-red-500/30"
                                        >
                                            {removing ? (
                                                <Loader2
                                                    className="animate-spin"
                                                    size={18}
                                                />
                                            ) : (
                                                <Check size={18} />
                                            )}
                                            {removing
                                                ? "Removing..."
                                                : "In Library"}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleAdd}
                                            disabled={adding}
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                                        >
                                            {adding ? (
                                                <Loader2
                                                    className="animate-spin"
                                                    size={18}
                                                />
                                            ) : (
                                                <Plus size={18} />
                                            )}
                                            Add to Library
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden sm:flex flex-col gap-3 shrink-0 mb-2">
                            {isAdded ? (
                                <button
                                    onClick={handleRemove}
                                    disabled={removing}
                                    className="px-6 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-500 font-bold flex items-center justify-center gap-2 transition-all border border-red-500/30 hover:scale-105 active:scale-95"
                                >
                                    {removing ? (
                                        <Loader2
                                            className="animate-spin"
                                            size={20}
                                        />
                                    ) : (
                                        <Check size={20} />
                                    )}
                                    {removing ? "Removing..." : "In Library"}
                                </button>
                            ) : (
                                <button
                                    onClick={handleAdd}
                                    disabled={adding}
                                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95"
                                >
                                    {adding ? (
                                        <Loader2
                                            className="animate-spin"
                                            size={20}
                                        />
                                    ) : (
                                        <Plus size={20} />
                                    )}
                                    Add to Library
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
                    {/* External Links */}
                    <div className="flex flex-wrap gap-3">
                        {movie.tmdbId && (
                            <a
                                href={
                                    movie.type === "tv"
                                        ? `https://pstream.mov/media/tmdb-tv-${movie.tmdbId}`
                                        : `https://pstream.mov/media/tmdb-movie-${movie.tmdbId}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-full px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white transition-colors border border-neutral-800"
                            >
                                <span className="text-xl">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="1em"
                                        height="1em"
                                        viewBox="0 0 20.927 20.927"
                                        preserveAspectRatio="xMidYMid meet"
                                    >
                                        <g
                                            transform="translate(0,20.927) scale(0.003333,-0.003333)"
                                            fill="currentColor"
                                            stroke="none"
                                        >
                                            <path d="M3910 5527 c-33 -4 -145 -17 -250 -28 -645 -73 -900 -187 -900 -405 l0 -89 154 -2 c209 -2 225 -17 381 -354 186 -399 337 -491 557 -341 103 70 176 67 252 -9 143 -142 -15 -342 -320 -404 l-123 -25 185 -393 c101 -217 189 -396 194 -398 6 -3 87 6 182 20 499 71 1160 -296 972 -541 -77 -101 -183 -100 -307 2 -186 154 -407 223 -610 188 -123 -21 -119 -9 -80 -274 40 -273 18 -701 -48 -916 -25 -82 252 -99 463 -28 655 220 1146 748 1330 1430 44 165 46 201 53 1206 l8 1035 -67 66 c-185 183 -1376 336 -2026 260z m1078 -1219 c118 -81 204 -84 312 -10 239 163 453 -73 240 -265 -241 -218 -703 -178 -832 71 -93 179 105 323 280 204z"></path>
                                            <path d="M2410 4591 c-950 -201 -2404 -1015 -2409 -1348 -1 -69 771 -1707 885 -1878 422 -633 1185 -984 1924 -886 221 29 293 68 482 264 575 594 727 1466 390 2232 -231 525 -749 1600 -785 1630 -57 48 -214 44 -487 -14z m579 -1122 c114 -54 145 -188 64 -281 -48 -56 -60 -58 -265 -47 -102 6 -177 -42 -229 -143 -95 -187 -339 -145 -339 57 0 291 482 550 769 414z m-1319 -630 c215 -106 85 -350 -173 -326 -144 13 -209 -21 -270 -140 -102 -197 -381 -119 -339 94 59 295 506 508 782 372z m1472 -577 c216 -217 -287 -789 -786 -895 -473 -100 -909 127 -654 341 71 60 93 62 226 22 348 -106 739 77 903 423 83 177 201 218 311 109z"></path>
                                        </g>
                                    </svg>
                                </span>
                                <span className="font-semibold">
                                    Watch on P-Stream
                                </span>
                            </a>
                        )}
                        <a
                            href={
                                movie.imdbId
                                    ? `https://www.imdb.com/title/${movie.imdbId}`
                                    : `https://www.imdb.com/find?q=${encodeURIComponent(
                                          movie.title,
                                      )}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black transition-colors font-bold flex items-center gap-2"
                            title="Open IMDb"
                        >
                            IMDb <ExternalLink size={14} />
                        </a>
                    </div>

                    {/* Meta Data Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                            <div className="text-xs text-neutral-500 uppercase font-bold mb-1">
                                Release Date
                            </div>
                            <div className="flex items-center gap-2 text-white">
                                <Calendar size={18} className="text-blue-500" />
                                <span>{movie.releaseDate || "Unknown"}</span>
                            </div>
                        </div>

                        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                            <div className="text-xs text-neutral-500 uppercase font-bold mb-1">
                                Runtime
                            </div>
                            <div className="flex items-center gap-2 text-white">
                                <Clock size={18} className="text-purple-500" />
                                <span className="font-mono">
                                    {movie.runtime
                                        ? `${Math.floor(movie.runtime / 60)}h ${
                                              movie.runtime % 60
                                          }m`
                                        : "N/A"}
                                </span>
                            </div>
                        </div>

                        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                            <div className="text-xs text-neutral-500 uppercase font-bold mb-1">
                                Status
                            </div>
                            <div className="flex items-center gap-2 text-white">
                                <Play size={18} className="text-green-500" />
                                <span>{movie.status || "Released"}</span>
                            </div>
                        </div>

                        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                            <div className="text-xs text-neutral-500 uppercase font-bold mb-1">
                                Type
                            </div>
                            <div className="flex items-center gap-2 text-white">
                                <Monitor
                                    size={18}
                                    className="text-orange-500"
                                />
                                <span className="capitalize">
                                    {movie.type === "tv" ? "TV Show" : "Movie"}
                                </span>
                            </div>
                        </div>

                        {movie.budget > 0 && (
                            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                                <div className="text-xs text-neutral-500 uppercase font-bold mb-1">
                                    Budget
                                </div>
                                <div className="flex items-center gap-2 text-white">
                                    <Wallet
                                        size={18}
                                        className="text-emerald-500"
                                    />
                                    <span className="font-mono">
                                        ${(movie.budget / 1000000).toFixed(1)}M
                                    </span>
                                </div>
                            </div>
                        )}

                        {movie.revenue > 0 && (
                            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                                <div className="text-xs text-neutral-500 uppercase font-bold mb-1">
                                    Revenue
                                </div>
                                <div className="flex items-center gap-2 text-white">
                                    <BarChart3
                                        size={18}
                                        className="text-indigo-500"
                                    />
                                    <span className="font-mono">
                                        ${(movie.revenue / 1000000).toFixed(1)}M
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Overview */}
                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                            <StickyNote className="text-yellow-500" />
                            Overview
                        </h3>
                        <p className="text-neutral-400 leading-relaxed text-lg">
                            {movie.overview || "No overview available."}
                        </p>
                    </div>

                    {/* Cast */}
                    {movie.cast && movie.cast.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Users className="text-pink-500" />
                                Cast
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {movie.cast.map((actor, i) => (
                                    <div
                                        key={i}
                                        className="bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 text-white flex items-center gap-2"
                                    >
                                        <span className="font-medium">
                                            {actor}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Production Companies */}
                    {movie.productionCompanies &&
                        movie.productionCompanies.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Building className="text-cyan-500" />
                                    Production
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {movie.productionCompanies.map(
                                        (company, i) => (
                                            <div
                                                key={i}
                                                className="bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 text-neutral-300 flex items-center gap-2"
                                            >
                                                <span className="font-medium text-sm">
                                                    {company.name}
                                                </span>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}

                    {/* Genres */}
                    {movie.genres && movie.genres.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-neutral-500 uppercase">
                                Genres
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {movie.genres.map((g) => (
                                    <span
                                        key={g}
                                        className="px-3 py-1 rounded-full bg-neutral-800 text-neutral-300 text-sm border border-neutral-700"
                                    >
                                        {g}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Availability */}
                    {availability.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-neutral-500 uppercase">
                                Available On
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {availability.map((service) => {
                                    const style = getServiceStyle(service);
                                    return (
                                        <div
                                            key={service}
                                            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 border ${style.bg} ${style.text} ${style.border}`}
                                        >
                                            {service}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <BottomNav />
        </div>
    );
}
