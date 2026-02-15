import { Clapperboard, Quote } from "lucide-react";

export default function EditMovieHero({
    coverUrl,
    setCoverUrl,
    title,
    setTitle,
    overview,
    director,
    releaseDate,
    tmdbId,
}) {
    return (
        <div className="relative">
            <div className="relative h-[30vh] sm:h-[35vh] w-full overflow-hidden">
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

                <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 flex flex-row items-start sm:items-end gap-4 sm:gap-6 z-10 max-w-7xl mx-auto">
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
                        {!tmdbId && (
                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                <input
                                    className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg text-xs"
                                    value={coverUrl}
                                    onChange={(e) =>
                                        setCoverUrl(e.target.value)
                                    }
                                    placeholder="Cover URL..."
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
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
                        {!tmdbId && (
                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                <input
                                    className="w-full bg-neutral-800 border border-neutral-700 text-white px-2 py-1 rounded text-xs"
                                    value={coverUrl}
                                    onChange={(e) =>
                                        setCoverUrl(e.target.value)
                                    }
                                    placeholder="URL..."
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2 mb-2 w-full">
                        {tmdbId ? (
                            <h1 className="w-full text-white px-0 py-2 text-3xl sm:text-4xl md:text-5xl font-bold">
                                {title}
                            </h1>
                        ) : (
                            <input
                                className="w-full bg-transparent border-b-2 border-neutral-700 focus:border-blue-500 text-white px-0 py-2 focus:outline-none text-3xl sm:text-4xl md:text-5xl font-bold placeholder:text-neutral-800 transition-colors"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Movie Title"
                            />
                        )}

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
