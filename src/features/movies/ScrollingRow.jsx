import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";

export default function ScrollingRow({
    title,
    items,
    onMovieClick,
    onAdd,
    onRemove,
    isAdded,
    highlight = false,
    isDiscovery = false,
}) {
    const rowRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    const checkScroll = () => {
        if (rowRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
            const canScrollLeft = scrollLeft > 5;
            const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5;

            setShowLeftArrow(canScrollLeft);
            setShowRightArrow(canScrollRight);
        }
    };

    useEffect(() => {
        const el = rowRef.current;
        if (!el) return;

        let ticking = false;

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    checkScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };

        // FIX 1: Added { passive: true } to tell the browser this listener 
        // won't prevent scrolling, allowing the page to scroll smoothly.
        el.addEventListener("scroll", onScroll, { passive: true });

        const timer = setTimeout(checkScroll, 100);

        const resizeObserver = new ResizeObserver(() => {
            setTimeout(checkScroll, 50);
        });
        resizeObserver.observe(el);

        return () => {
            el.removeEventListener("scroll", onScroll);
            clearTimeout(timer);
            resizeObserver.disconnect();
        };
    }, [items]);

    const scroll = (direction) => {
        if (rowRef.current) {
            const { clientWidth, scrollLeft } = rowRef.current;
            const scrollTo =
                direction === "left"
                    ? scrollLeft - clientWidth * 0.75
                    : scrollLeft + clientWidth * 0.75;

            rowRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
        }
    };

    if (!items || items.length === 0) return null;

    return (
        <div
            className={`space-y-3 my-8 w-full group/row pt-6`}
        >
            <h2
                className={`text-xl md:text-2xl font-semibold transition-colors cursor-pointer inline-flex items-center gap-2 pl-6 md:pl-16 ${highlight
                    ? "text-blue-400 hover:text-blue-300"
                    : isDiscovery
                        ? "text-green-400 hover:text-green-300"
                        : "text-white/90 hover:text-white group-hover:text-blue-400"
                    }`}
            >
                {title}
                {highlight && (
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                        For You
                    </span>
                )}
                {isDiscovery && (
                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                        New for You
                    </span>
                )}
            </h2>

            <div className="relative w-full">
                <div
                    className="absolute left-0 top-0 bottom-0 z-30 w-12 md:w-20 bg-linear-to-r from-black/80 to-transparent flex items-center justify-center transition-opacity duration-300 pointer-events-none"
                    style={{
                        opacity: showLeftArrow ? 1 : 0,
                    }}
                >
                    <button
                        onClick={() => scroll("left")}
                        disabled={!showLeftArrow}
                        className="hover:scale-125 transition-transform bg-black/60 rounded-full p-2 md:bg-transparent md:p-0 pointer-events-auto disabled:cursor-default"
                    >
                        <ChevronLeft
                            className="text-white drop-shadow-lg"
                            size={32}
                        />
                    </button>
                </div>

                <div
                    ref={rowRef}
                    data-scrollable="true"
                    className="flex gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide px-6 md:px-16 pb-4 pt-4 w-full touch-pan-x touch-pan-y"
                    style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                    }}
                >
                    {items.map((movie) => (
                        <div
                            key={movie.tmdbId}
                            className="w-35 md:w-50 flex-none transition-transform duration-300 hover:z-20"
                        >
                            <MovieCard
                                movie={movie}
                                onClick={() => onMovieClick(movie)}
                                onAdd={onAdd ? () => onAdd(movie) : null}
                                onRemove={
                                    onRemove ? () => onRemove(movie) : null
                                }
                                isAdded={
                                    isAdded ? isAdded(movie.tmdbId) : false
                                }
                            />
                        </div>
                    ))}
                    <div className="w-8 flex-none" />
                </div>

                <div
                    className="absolute right-0 top-0 bottom-0 z-30 w-12 md:w-16 bg-linear-to-l from-black/80 to-transparent flex items-center justify-center transition-opacity duration-300 pointer-events-none"
                    style={{
                        opacity: showRightArrow ? 1 : 0,
                    }}
                >
                    <button
                        onClick={() => scroll("right")}
                        disabled={!showRightArrow}
                        className="hover:scale-125 transition-transform bg-black/60 rounded-full p-2 md:bg-transparent md:p-0 pointer-events-auto disabled:cursor-default"
                    >
                        <ChevronRight
                            className="text-white drop-shadow-lg"
                            size={32}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
}