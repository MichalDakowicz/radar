import { useState, useEffect } from "react";
import { ChevronRight, Play, Info, Plus, Check } from "lucide-react";
import { Link } from "react-router-dom";

export default function HeroCarousel({
    items,
    onInfoClick,
    onAdd,
    onRemove,
    isAdded,
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Auto-advance
    useEffect(() => {
        const timer = setInterval(() => {
            handleNext();
        }, 8000);
        return () => clearInterval(timer);
    }, [currentIndex, items]);

    const handleNext = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setTimeout(() => setIsAnimating(false), 500);
    };

    const handlePrev = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
        setTimeout(() => setIsAnimating(false), 500);
    };

    if (!items || items.length === 0)
        return (
            <div className="h-[50vh] bg-neutral-900 animate-pulse rounded-2xl mx-4 mt-4" />
        );

    const currentItem = items[currentIndex];

    return (
        <div className="relative w-full h-[550px] md:h-[650px] overflow-hidden group">
            {/* Background Images */}
            {items.map((item, index) => (
                <div
                    key={item.tmdbId}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                        index === currentIndex ? "opacity-100" : "opacity-0"
                    }`}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent z-10" />
                    <img
                        src={item.backdropUrl || item.coverUrl}
                        alt={item.title}
                        className="w-full h-full object-cover object-top"
                    />
                </div>
            ))}

            {/* Content */}
            <div className="absolute inset-0 z-20 container mx-auto px-4 md:px-16 flex items-end pb-12 md:pb-32">
                <div className="max-w-2xl space-y-3 md:space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-700">
                    <h1 className="text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-2xl">
                        {currentItem.title}
                    </h1>

                    <div className="flex items-center gap-4 text-sm md:text-base text-gray-200 font-medium">
                        <span className="text-green-400 font-bold">
                            {currentItem.voteAverage
                                ? Math.round(currentItem.voteAverage * 10)
                                : 0}
                            % Match
                        </span>
                        <span>{currentItem.releaseDate?.substring(0, 4)}</span>
                        {currentItem.type === "tv" ? (
                            <span className="border border-gray-500 px-1 rounded text-xs">
                                TV-MA
                            </span>
                        ) : (
                            <span className="border border-gray-500 px-1 rounded text-xs">
                                PG-13
                            </span>
                        )}
                        <span className="uppercase">{currentItem.type}</span>
                    </div>

                    <p className="text-base md:text-lg text-gray-300 line-clamp-2 md:line-clamp-4 max-w-xl shadow-black drop-shadow-md">
                        {currentItem.overview}
                    </p>

                    <div className="flex items-center gap-2 md:gap-4 pt-2 md:pt-4">
                        <a
                            href={
                                currentItem.type === "tv"
                                    ? `https://pstream.mov/media/tmdb-tv-${currentItem.tmdbId}`
                                    : `https://pstream.mov/media/tmdb-movie-${currentItem.tmdbId}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white text-black px-4 md:px-8 py-2 md:py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-neutral-200 transition-colors text-sm md:text-base"
                        >
                            <Play
                                size={18}
                                className="fill-black md:w-5 md:h-5"
                            />
                            <span className="hidden sm:inline">Play</span>
                        </a>
                        <button
                            onClick={() => {
                                if (isAdded && isAdded(currentItem.tmdbId)) {
                                    onRemove(currentItem);
                                } else {
                                    onAdd(currentItem);
                                }
                            }}
                            className="bg-neutral-500/50 backdrop-blur-md text-white px-4 md:px-8 py-2 md:py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-neutral-500/70 transition-colors text-sm md:text-base"
                        >
                            {isAdded && isAdded(currentItem.tmdbId) ? (
                                <>
                                    <Check
                                        size={18}
                                        className="md:w-5 md:h-5"
                                    />
                                    <span className="hidden sm:inline">
                                        Added
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Plus size={18} className="md:w-5 md:h-5" />
                                    <span className="hidden sm:inline">
                                        Watchlist
                                    </span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => onInfoClick(currentItem)}
                            className="bg-neutral-500/50 backdrop-blur-md text-white px-4 md:px-8 py-2 md:py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-neutral-500/70 transition-colors text-sm md:text-base"
                        >
                            <Info size={18} className="md:w-5 md:h-5" />
                            <span className="hidden sm:inline">More Info</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Indicators */}
            <div className="absolute right-4 md:right-16 bottom-1/3 z-30 flex flex-col gap-2">
                {items.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all ${
                            index === currentIndex
                                ? "bg-white scale-125"
                                : "bg-white/40 hover:bg-white/60"
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>

            {/* Gradient Bottom Fade for transition needed for sections below */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none" />
        </div>
    );
}
