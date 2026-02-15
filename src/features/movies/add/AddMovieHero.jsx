import { Clapperboard, Quote, Loader2, Film } from "lucide-react";

export default function AddMovieHero({
    coverUrl,
    setCoverUrl,
    searchQuery,
    setSearchQuery,
    title,
    overview,
    director,
    releaseDate,
    searchResults,
    isSearching,
    onSelectMovie,
    tmdbId,
}) {
    return (
        <div className="relative z-40">
            <div className="relative h-[30vh] sm:h-[35vh] w-full overflow-visible">
                {coverUrl ? (
                    <>
                        <div
                            className="absolute inset-0 bg-cover bg-center blur-xl opacity-50"
                            style={{ backgroundImage: `url(${coverUrl})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-neutral-900" />
                )}

                <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 flex flex-row items-start sm:items-end gap-4 sm:gap-6 z-50 max-w-7xl mx-auto">
                    {/* Poster - Large screens */}
                    <div className="w-32 sm:w-48 aspect-2/3 shrink-0 rounded-xl overflow-hidden border-2 border-neutral-800 shadow-2xl bg-neutral-800 hidden sm:block group relative">
                        {coverUrl ? (
                            <img
                                src={coverUrl}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-neutral-500">
                                <Clapperboard size={32} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                            <input
                                className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg text-xs"
                                value={coverUrl}
                                onChange={(e) => setCoverUrl(e.target.value)}
                                placeholder="Cover URL..."
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Poster - Mobile (smaller, left side) */}
                    <div className="w-20 aspect-2/3 shrink-0 rounded-lg overflow-hidden border border-neutral-800 shadow-lg bg-neutral-800 sm:hidden group relative">
                        {coverUrl ? (
                            <img
                                src={coverUrl}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-neutral-500">
                                <Clapperboard size={20} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                            <input
                                className="w-full bg-neutral-800 border border-neutral-700 text-white px-2 py-1 rounded text-xs"
                                value={coverUrl}
                                onChange={(e) => setCoverUrl(e.target.value)}
                                placeholder="URL..."
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2 mb-2 w-full relative">
                        <div className="relative">
                            <input
                                className="w-full bg-transparent border-b-2 border-neutral-700 focus:border-blue-500 text-white px-0 py-2 focus:outline-none text-3xl sm:text-4xl md:text-5xl font-bold placeholder:text-neutral-800 transition-colors"
                                value={tmdbId ? title : searchQuery}
                                onChange={(e) =>
                                    !tmdbId && setSearchQuery(e.target.value)
                                }
                                placeholder="Search for a movie or TV show..."
                                disabled={!!tmdbId}
                            />
                            {isSearching && (
                                <Loader2
                                    className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-blue-400"
                                    size={24}
                                />
                            )}

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && !tmdbId && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-[100] max-h-96 overflow-y-auto">
                                    {searchResults.map((item) => (
                                        <button
                                            key={item.tmdbId}
                                            onClick={() => onSelectMovie(item)}
                                            className="w-full text-left p-4 hover:bg-neutral-800 transition-colors flex items-center gap-4 border-b border-neutral-800 last:border-b-0 group"
                                        >
                                            {item.coverUrl ? (
                                                <img
                                                    src={item.coverUrl}
                                                    alt=""
                                                    className="w-12 h-18 object-cover rounded shadow-md group-hover:scale-105 transition-transform"
                                                />
                                            ) : (
                                                <div className="w-12 h-18 bg-neutral-800 rounded flex items-center justify-center">
                                                    <Film
                                                        size={20}
                                                        className="text-neutral-600"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-white group-hover:text-blue-400 transition-colors text-lg truncate">
                                                    {item.title}
                                                </div>
                                                <div className="text-sm text-neutral-400 flex items-center gap-2">
                                                    <span>
                                                        {item.releaseDate?.substring(
                                                            0,
                                                            4,
                                                        ) || "N/A"}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="capitalize">
                                                        {item.type}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {overview && (
                            <p className="text-sm sm:text-base text-neutral-300 italic flex items-start gap-2 line-clamp-2">
                                <Quote
                                    size={16}
                                    className="text-neutral-500 fill-neutral-500 shrink-0 mt-0.5"
                                />
                                <span className="line-clamp-2">{overview}</span>
                            </p>
                        )}

                        <div className="text-base sm:text-lg text-neutral-300 drop-shadow-md flex flex-wrap items-center gap-2">
                            {director.length > 0 && (
                                <span>{director.join(", ")}</span>
                            )}
                            {director.length > 0 && releaseDate && (
                                <span>•</span>
                            )}
                            {releaseDate && (
                                <span>{releaseDate.substring(0, 4)}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
