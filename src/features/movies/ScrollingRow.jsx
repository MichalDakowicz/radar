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

    const handleTouchStart = () => {
        // Simple touch start handler for potential future use
    };

    const handleTouchEnd = () => {
        // Simple touch end handler for potential future use
    };

    const handleWheel = (e) => {
        // If scrolling horizontally, prevent page scroll
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            e.stopPropagation();
        }
    };

    useEffect(() => {
        const el = rowRef.current;
        if (el) {
            el.addEventListener("scroll", checkScroll);

            // Initial check after a short delay to ensure content is loaded
            const timer = setTimeout(checkScroll, 100);

            // Also check when the element resizes (content loads)
            const resizeObserver = new ResizeObserver(() => {
                setTimeout(checkScroll, 50);
            });
            resizeObserver.observe(el);

            return () => {
                el.removeEventListener("scroll", checkScroll);
                clearTimeout(timer);
                resizeObserver.disconnect();
            };
        }
    }, [items]); // Re-run when items change

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
        <div className="space-y-3 my-8 w-full group/row pt-6">
            <h2 className="text-xl md:text-2xl font-semibold text-white/90 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-2 group-hover:text-blue-400 pl-6 md:pl-16">
                {title}
            </h2>

            <div className="relative w-full">
                <div
                    className={`absolute left-0 top-0 bottom-0 z-30 w-12 md:w-20 bg-gradient-to-r from-black/80 to-transparent flex items-center justify-center transition-opacity duration-300`}
                    style={{
                        opacity: showLeftArrow ? 1 : 0,
                        pointerEvents: showLeftArrow ? "auto" : "none",
                    }}
                >
                    <button
                        onClick={() => scroll("left")}
                        className="hover:scale-125 transition-transform bg-black/60 rounded-full p-2 md:bg-transparent md:p-0"
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
                    className="flex gap-4 overflow-x-auto scrollbar-hide px-6 md:px-16 pb-4 pt-4 snap-x snap-mandatory w-full"
                    style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                        touchAction: "pan-y pan-x", // Allow both horizontal and vertical panning
                        WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
                        overscrollBehavior: "contain", // Prevent scroll chaining
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    onWheel={handleWheel}
                >
                    {items.map((movie) => (
                        <div
                            key={movie.tmdbId}
                            className="w-35 md:w-[200px] flex-none snap-start transition-transform duration-300 hover:z-20"
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
                    className="absolute right-0 top-0 bottom-0 z-30 w-12 md:w-16 bg-gradient-to-l from-black/80 to-transparent flex items-center justify-center transition-opacity duration-300"
                    style={{
                        opacity: showRightArrow ? 1 : 0,
                        pointerEvents: showRightArrow ? "auto" : "none",
                    }}
                >
                    <button
                        onClick={() => scroll("right")}
                        className="hover:scale-125 transition-transform bg-black/60 rounded-full p-2 md:bg-transparent md:p-0"
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
