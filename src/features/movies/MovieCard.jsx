import { Heart, Clock, StickyNote, Play, Clapperboard, Check, Star } from "lucide-react";
import Logo from "../../components/ui/Logo"; // Assuming Logo is generic
import { getServiceStyle } from "../../lib/services";

export default function MovieCard({
    movie,
    onClick,
    isHighlighted,
    innerRef,
    readOnly = false,
}) {
    const highlightedStyles = isHighlighted
        ? "ring-2 ring-blue-500 scale-105 z-20 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
        : "hover:scale-105 hover:z-20 hover:shadow-2xl hover:shadow-black/50";

    const getStatusIcon = (status) => {
        switch (status) {
            case "Watchlist":
                return null; // No icon for default
            case "Watched":
                return <Check size={14} className="text-blue-500" />;
            default:
                return null;
        }
    };

    const directorName = Array.isArray(movie.director)
        ? movie.director.join(", ")
        : (movie.director || movie.artist || ""); // Fallback
        
    const availabilityList = Array.isArray(movie.availability) ? movie.availability : [];
    // const availabilityText = availabilityList.length > 0 ? `${availabilityList.length} Service${availabilityList.length > 1 ? 's' : ''}` : "Unavailable";
    
    // Calculate rating on the fly since we store ratings object
    // Prefer overall if explicitly set (and non-zero? or always?). Logic in modal sets overall.
    const ratingScore = (() => {
        if (movie.ratings && movie.ratings.overall > 0) return movie.ratings.overall.toFixed(1);
        if (!movie.ratings) return null;
        
        const vals = Object.values(movie.ratings).filter(v => v > 0);
        // Exclude 'overall' key if it exists in iteration (though Object.values does include it if it's there)
        // Wait, Object.entries in EditModal sets everything
        // But here we are reading raw object. 
        // If overall is 0/undefined, we calc average of others.
        // Actually, if I saved 'overall' in the database, it should be used.
        // But for backward compat or if user fills categories but clears overall (which modal logic prevents usually),
        // let's stick to: Use overall if > 0. Else calculate.
        
        // Remove 'overall' from calculations to avoid double counting or self-referencing if structure is flat
        const { overall, ...subRatings } = movie.ratings;
        const subVals = Object.values(subRatings).filter(v => v > 0);
        
        if (subVals.length === 0) return null;
        return (subVals.reduce((a, b) => a + b, 0) / subVals.length).toFixed(1);
    })();

    const releaseYear = movie.releaseDate
        ? movie.releaseDate.split("-")[0]
        : "";

    return (
        <div
            ref={innerRef}
            onClick={onClick}
            className={`group relative aspect-[2/3] rounded-md overflow-hidden bg-neutral-900 transition-all duration-300 cursor-pointer ${highlightedStyles}`}
        >
            {/* Background Image */}
            {movie.coverUrl ? (
                <img
                    src={movie.coverUrl}
                    alt={movie.title}
                    className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${
                        isHighlighted ? "scale-110" : "group-hover:scale-110"
                    } ${movie.status === 'Watchlist' ? 'grayscale opacity-70' : ''}`}
                    loading="lazy"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-800 text-neutral-600">
                    <Clapperboard size={32} />
                </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90" />

            {/* Content */}
            <div className="absolute inset-0 p-3 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                     {/* Status Icons */}
                     <div className="flex gap-1">
                        {getStatusIcon(movie.status)}
                     </div>

                     {/* Highlight Indicator */}
                    {isHighlighted ? (
                        <div className="bg-blue-500 h-2 w-2 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
                    ) : (
                        ratingScore && (
                            <div className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-amber-500/30 text-amber-400 text-[10px] font-bold shadow-lg flex items-center gap-1">
                                <div className="flex gap-[1px]">
                                    {[1,2,3,4,5].map(i => {
                                        const score = parseFloat(ratingScore);
                                        let fill = 0;
                                        if (score >= i) fill = 100;
                                        else if (score > i - 1) fill = (score - (i - 1)) * 100;
                                        
                                        return (
                                            <div key={i} className="relative">
                                                <Star size={6} className="text-neutral-600" />
                                                {fill > 0 && (
                                                    <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
                                                        <Star size={6} className="fill-amber-400 text-amber-400" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <span className="translate-y-[0.5px]">{ratingScore}</span>
                            </div>
                        )
                    )}
                </div>

                <div className="space-y-1">
                    <h3 className="font-bold text-white text-sm line-clamp-2 leading-tight drop-shadow-md">
                        {movie.title}
                    </h3>
                    <p className="text-xs text-neutral-300 truncate drop-shadow-md font-medium">
                        {directorName}
                    </p>
                    <div className="flex justify-between items-center pt-1 mt-auto">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/90 backdrop-blur-sm border border-white/10 shadow-sm">
                            {releaseYear}
                        </span>
                        
                        <div className="flex items-center -space-x-1.5 hover:space-x-0.5 transition-all group/avail">
                             {availabilityList.length > 0 ? (
                                availabilityList.map((svc, i) => {
                                    const style = getServiceStyle(svc);
                                    const isHidden = i >= 3;
                                    return (
                                        <div 
                                            key={svc} 
                                            // z-index: stack left-on-top so the sequence looks cleaner
                                            style={{ zIndex: 30 - i }} 
                                            className={`
                                                h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-md border border-white/10 
                                                ${style.color}
                                                ${isHidden ? 'hidden group-hover/avail:flex' : 'flex'}
                                            `}
                                            title={svc}
                                        >
                                            {style.short}
                                        </div>
                                    )
                                })
                             ) : null}
                             {availabilityList.length > 3 && (
                                 <div 
                                    className="h-5 w-5 rounded-full bg-neutral-800 text-white flex items-center justify-center text-[8px] font-bold shadow-md border border-white/10 group-hover/avail:hidden"
                                    style={{ zIndex: 30 - 3 }} 
                                 >
                                     +{availabilityList.length - 3}
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions (Hover) - Only if not readonly */}
            {!readOnly && (
                <div className="absolute top-2 right-2 translate-x-10 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 flex flex-col gap-2">
                    {/* Log Watch Removed */}
                    {movie.notes && (
                         <div className="p-2 rounded-full bg-neutral-800 text-neutral-300 shadow-lg" title="Has Notes">
                            <StickyNote size={14} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
