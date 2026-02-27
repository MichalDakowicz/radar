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
} from "lucide-react";
import { getServiceStyle } from "../../lib/services";
import { useNavigate } from "react-router-dom";

const GENRE_IDS = {
    Action: 28,
    Adventure: 12,
    Animation: 16,
    Comedy: 35,
    Crime: 80,
    Documentary: 99,
    Drama: 18,
    Family: 10751,
    Fantasy: 14,
    History: 36,
    Horror: 27,
    Music: 10402,
    Mystery: 9648,
    Romance: 10749,
    "Science Fiction": 878,
    "TV Movie": 10770,
    Thriller: 53,
    War: 10752,
    Western: 37,
};

export default function MovieDetailsModal({ isOpen, onClose, movie }) {
    const navigate = useNavigate();

    if (!isOpen || !movie) return null;

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
    const ratings = movie.ratings || {};

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Image Background */}
                <div className="relative h-48 w-full shrink-0 overflow-hidden">
                    {movie.coverUrl ? (
                        <>
                            <div
                                className="absolute inset-0 bg-cover bg-center blur-xl opacity-50"
                                style={{
                                    backgroundImage: `url(${movie.coverUrl})`,
                                }}
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-neutral-900 to-transparent" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-neutral-800" />
                    )}

                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                        {movie.tmdbId && (
                            <a
                                href={
                                    movie.type === "tv"
                                        ? `https://pstream.mov/media/tmdb-tv-${movie.tmdbId}`
                                        : `https://pstream.mov/media/tmdb-movie-${movie.tmdbId}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur-lg bg-black/50 hover:bg-black/70 text-white transition-colors border border-white/10"
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
                                <span className="font-semibold text-white">
                                    P-Stream
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
                            className="p-2 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black transition-colors font-bold text-xs flex items-center gap-1"
                            title="Open IMDb"
                        >
                            IMDb <ExternalLink size={12} />
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="absolute bottom-0 left-0 p-6 flex items-end gap-6 w-full">
                        <div className="h-32 w-20 sm:w-28 shrink-0 overflow-hidden rounded-lg border-2 border-neutral-800 shadow-xl bg-neutral-800">
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
                        <div className="mb-2 min-w-0 flex-1">
                            <h2 className="text-2xl sm:text-3xl font-bold text-white truncate leading-tight shadow-black drop-shadow-md">
                                {movie.title}
                            </h2>
                            <div className="text-lg sm:text-xl text-neutral-300 truncate drop-shadow-md">
                                {directors.join(", ")}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Grid for runtime/date/availability/type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-neutral-800/10 rounded-lg p-3 border border-neutral-800">
                            <div className="text-xs text-neutral-500 uppercase font-bold mb-1">
                                Release Date
                            </div>
                            <div className="flex items-center gap-3 text-neutral-200">
                                <div className="flex items-center gap-2">
                                    <Calendar
                                        size={16}
                                        className="text-blue-500"
                                    />
                                    <span className="font-mono text-sm">
                                        {movie.releaseDate || "Unknown"}
                                    </span>
                                </div>
                                {movie.runtime > 0 && (
                                    <div className="flex items-center gap-1.5 pl-3 border-l border-neutral-700">
                                        <Clock
                                            size={14}
                                            className="text-neutral-500"
                                        />
                                        <span className="font-mono text-xs text-neutral-400">
                                            {movie.runtime}m
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-neutral-800/10 rounded-lg p-3 border border-neutral-800">
                            <div className="text-xs text-neutral-500 uppercase font-bold mb-1">
                                Availability
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {availability.length > 0 ? (
                                    availability.map((svc, i) => {
                                        const style = getServiceStyle(svc);
                                        return (
                                            <span
                                                key={i}
                                                className="px-2 py-0.5 rounded text-xs bg-neutral-900 text-neutral-300 border border-neutral-700 font-medium flex items-center gap-2"
                                            >
                                                <div
                                                    className={`h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-bold shadow-sm ${style.color}`}
                                                >
                                                    {style.short}
                                                </div>
                                                {svc}
                                            </span>
                                        );
                                    })
                                ) : (
                                    <span className="text-neutral-500 text-sm">
                                        Unknown
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Removed separate runtime block */}

                        <div className="bg-neutral-800/10 rounded-lg p-3 border border-neutral-800">
                            <div className="text-xs text-neutral-500 uppercase font-bold mb-1">
                                Type
                            </div>
                            <div className="flex items-center gap-2 text-neutral-200">
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                                    {movie.type === "tv" ? "TV Show" : "Movie"}
                                </span>
                                {movie.type === "tv" && movie.status && (
                                    <span className="text-xs text-neutral-400 border-l border-neutral-700 pl-2 ml-1">
                                        {movie.status}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="bg-neutral-800/10 rounded-lg p-3 border border-neutral-800 col-span-2">
                            <div className="text-xs text-neutral-500 uppercase font-bold mb-1">
                                Genres
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {movie.genres && movie.genres.length > 0 ? (
                                    movie.genres.map((g, i) => {
                                        const genreName =
                                            typeof g === "object" ? g.name : g;
                                        const genreId =
                                            typeof g === "object"
                                                ? g.id
                                                : GENRE_IDS[g];

                                        return (
                                            <span
                                                key={i}
                                                onClick={(e) => {
                                                    if (genreId) {
                                                        e.stopPropagation();
                                                        onClose();
                                                        navigate(
                                                            `/genre/${genreId}`,
                                                        );
                                                    }
                                                }}
                                                className={`text-sm text-neutral-300 ${
                                                    genreId
                                                        ? "cursor-pointer hover:text-white underline"
                                                        : ""
                                                }`}
                                            >
                                                {genreName}
                                                {i < movie.genres.length - 1
                                                    ? ", "
                                                    : ""}
                                            </span>
                                        );
                                    })
                                ) : (
                                    <span className="text-neutral-500 italic text-sm">
                                        No genres listed
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="bg-neutral-800/10 rounded-lg p-3 border border-neutral-800 col-span-2">
                            <div className="text-xs text-neutral-500 uppercase font-bold mb-1">
                                Cast
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {movie.cast && movie.cast.length > 0 ? (
                                    movie.cast.map((c, i) => {
                                        const actorName =
                                            typeof c === "object" ? c.name : c;
                                        const actorId =
                                            typeof c === "object" ? c.id : null;

                                        return (
                                            <span
                                                key={i}
                                                onClick={(e) => {
                                                    if (actorId) {
                                                        e.stopPropagation();
                                                        onClose();
                                                        navigate(
                                                            `/actor/${actorId}`,
                                                        );
                                                    }
                                                }}
                                                className={`text-xs px-2 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 ${
                                                    actorId
                                                        ? "cursor-pointer hover:bg-neutral-700 hover:border-neutral-600"
                                                        : ""
                                                }`}
                                            >
                                                {actorName}
                                            </span>
                                        );
                                    })
                                ) : (
                                    <span className="text-neutral-500 italic text-sm">
                                        No cast listed
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Ratings Section */}
                    {Object.keys(ratings).length > 0 && (
                        <div className="space-y-2 pt-2">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-bold text-neutral-400 uppercase flex items-center gap-2 tracking-wide">
                                    <Star
                                        size={14}
                                        className="text-amber-500 fill-amber-500"
                                    />{" "}
                                    Ratings
                                </h3>
                                <div className="flex items-center gap-3">
                                    {movie.voteAverage > 0 && (
                                        <div className="text-xs font-bold text-neutral-400 bg-neutral-800/50 px-2 py-1 rounded border border-neutral-700/50 flex items-center gap-1">
                                            <span className="text-yellow-500">
                                                IMDb
                                            </span>{" "}
                                            {movie.voteAverage.toFixed(1)}
                                        </div>
                                    )}
                                    {(() => {
                                        // Calculate or use Overall
                                        let displayRating = null;
                                        if (ratings.overall > 0) {
                                            displayRating = ratings.overall;
                                        } else {
                                            const { overall, ...sub } = ratings;
                                            const values = Object.values(
                                                sub,
                                            ).filter((v) => v > 0);
                                            if (values.length > 0) {
                                                displayRating =
                                                    values.reduce(
                                                        (a, b) => a + b,
                                                        0,
                                                    ) / values.length;
                                            }
                                        }

                                        if (!displayRating) return null;
                                        const r = parseFloat(
                                            displayRating.toFixed(1),
                                        );

                                        return (
                                            <div className="flex items-center gap-2 bg-neutral-800/50 px-2 py-1 rounded-lg">
                                                <div className="flex gap-0.5">
                                                    {[1, 2, 3, 4, 5].map(
                                                        (i) => {
                                                            let fill = 0;
                                                            if (r >= i)
                                                                fill = 100;
                                                            else if (r > i - 1)
                                                                fill =
                                                                    (r -
                                                                        (i -
                                                                            1)) *
                                                                    100;

                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className="relative"
                                                                >
                                                                    <Star
                                                                        size={
                                                                            12
                                                                        }
                                                                        className="text-neutral-700"
                                                                    />
                                                                    {fill >
                                                                        0 && (
                                                                        <div
                                                                            className="absolute inset-0 overflow-hidden"
                                                                            style={{
                                                                                width: `${fill}%`,
                                                                            }}
                                                                        >
                                                                            <Star
                                                                                size={
                                                                                    12
                                                                                }
                                                                                className="fill-amber-400 text-amber-400"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                                <span className="text-amber-400 font-bold font-mono text-sm">
                                                    {r}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(ratings)
                                    .filter(([k]) =>
                                        [
                                            "story",
                                            "acting",
                                            "ending",
                                            "enjoyment",
                                        ].includes(k),
                                    )
                                    .map(
                                        ([key, val]) =>
                                            val > 0 && (
                                                <div
                                                    key={key}
                                                    className="flex justify-between items-center bg-neutral-800/30 p-2 rounded"
                                                >
                                                    <span className="text-xs uppercase text-neutral-400 font-medium">
                                                        {key}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex gap-0.5">
                                                            {[
                                                                1, 2, 3, 4, 5,
                                                            ].map((i) => {
                                                                let fill = 0;
                                                                if (val >= i)
                                                                    fill = 100;
                                                                else if (
                                                                    val >
                                                                    i - 1
                                                                )
                                                                    fill =
                                                                        (val -
                                                                            (i -
                                                                                1)) *
                                                                        100;

                                                                return (
                                                                    <div
                                                                        key={i}
                                                                        className="relative"
                                                                    >
                                                                        <Star
                                                                            size={
                                                                                8
                                                                            }
                                                                            className="text-neutral-700"
                                                                        />
                                                                        {fill >
                                                                            0 && (
                                                                            <div
                                                                                className="absolute inset-0 overflow-hidden"
                                                                                style={{
                                                                                    width: `${fill}%`,
                                                                                }}
                                                                            >
                                                                                <Star
                                                                                    size={
                                                                                        8
                                                                                    }
                                                                                    className="fill-amber-400 text-amber-400"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <span className="text-xs font-bold text-white w-6 text-right">
                                                            {val}
                                                        </span>
                                                    </div>
                                                </div>
                                            ),
                                    )}
                            </div>
                        </div>
                    )}

                    {/* Overview */}
                    {movie.overview && (
                        <div className="space-y-2 pt-2">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase flex items-center gap-2 tracking-wide">
                                Overview
                            </h3>
                            <div className="text-sm text-neutral-300 leading-relaxed">
                                {movie.overview}
                            </div>
                        </div>
                    )}

                    {/* Notes Section */}
                    {movie.notes && (
                        <div className="space-y-2 pt-2">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase flex items-center gap-2 tracking-wide">
                                <StickyNote size={14} /> Personal Notes
                            </h3>
                            <div className="p-4 rounded-xl bg-neutral-800/30 border border-neutral-800/50 text-neutral-300 leading-relaxed whitespace-pre-wrap text-sm">
                                {movie.notes}
                            </div>
                        </div>
                    )}

                    {/* Acquisition Date Only */}
                    {movie.acquisitionDate && (
                        <div className="pt-4 border-t border-neutral-800">
                            <div className="text-xs text-right text-neutral-500">
                                Added on {movie.acquisitionDate}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
