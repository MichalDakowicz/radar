import { Star, Heart, Clock, StickyNote, Play, Check, Clapperboard, Calendar, Star as StarIcon, X } from "lucide-react";
import { formatRelativeTime } from "../../lib/utils";

export default function MovieRow({ movie, onClick, isHighlighted, innerRef }) {

  const highlightedStyles = isHighlighted 
    ? "bg-neutral-800 border-l-4 border-l-blue-500" 
    : "bg-neutral-900 border-l-4 border-l-transparent hover:bg-neutral-800 hover:border-l-neutral-700";

  const getStatusIcon = (status) => {
        // TV / Mixed Statuses
        if (status === "Watching") return <Play size={14} className="text-green-500 fill-green-500" />;
        if (status === "Completed") return <Check size={14} className="text-blue-500" />;
        if (status === "Dropped") return <X size={14} className="text-red-500" />;
        if (status === "On Hold") return <Clock size={14} className="text-yellow-500" />;

        // Movie Statuses
        switch(status) {
            case 'Watchlist': return <Heart size={14} className="text-pink-500 fill-pink-500" />;
            case 'Watched': return <Check size={14} className="text-blue-500" />;
            default: return null;
        }
  };

  const directorName = Array.isArray(movie.director) 
    ? movie.director.join(", ") 
    : (movie.director || movie.artist || "");

  // Calculate rating (User rating takes precedence over TMDB if logic dictates, but here we prioritize user rating display like MovieCard)
  const userRating = (() => {
        if (movie.ratings && movie.ratings.overall > 0) return movie.ratings.overall.toFixed(1);
        if (!movie.ratings) return null;
        const { overall, ...subRatings } = movie.ratings;
        const subVals = Object.values(subRatings).filter(v => v > 0);
        if (subVals.length === 0) return null;
        return (subVals.reduce((a, b) => a + b, 0) / subVals.length).toFixed(1);
  })();

  const displayRating = userRating || (movie.voteAverage ? movie.voteAverage.toFixed(1) : null);
  const isUserRating = !!userRating;

  return (
    <div 
      ref={innerRef}
      onClick={onClick}
      className={`flex items-start gap-4 rounded-xl p-4 transition-all duration-200 group cursor-pointer ${highlightedStyles} ${movie.status === 'Watchlist' || movie.status === 'Plan to Watch' || movie.inWatchlist ? 'bg-neutral-950/50' : ''}`}
    >
      {/* Poster - Larger now */}
      <div className="h-32 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-800 relative shadow-lg border border-neutral-800">
        {movie.coverUrl ? (
            <img src={movie.coverUrl} alt="" className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${movie.status === 'Watchlist' || movie.status === 'Plan to Watch' || movie.inWatchlist ? 'grayscale opacity-70' : ''}`} />
        ) : (
            <div className="h-full w-full flex items-center justify-center text-neutral-600">
                <Clapperboard size={24} />
            </div>
        )}
        {isHighlighted && <div className="absolute inset-0 bg-blue-500/10" />}
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col h-32 justify-between py-1">
        <div>
           <div className="flex items-start justify-between gap-4">
               <div>
                    <h3 className={`text-lg font-bold transition-colors line-clamp-1 ${isHighlighted ? 'text-blue-400' : 'text-white group-hover:text-blue-300'}`}>{movie.title}</h3>
                    <div className="text-sm font-medium text-neutral-300 flex items-center gap-2 mt-1">
                        {directorName && <span>{directorName}</span>}
                        {directorName && movie.releaseDate && <span className="text-neutral-600">•</span>}
                        {movie.releaseDate && (
                            <span className="flex items-center gap-1 text-neutral-400">
                                <Calendar size={12} />
                                {movie.releaseDate.split('-')[0]}
                            </span>
                        )}
                    </div>
               </div>

                {/* Badges / Rating */}
                <div className="flex items-center gap-2 shrink-0">
                    {displayRating && (
                        <div className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded border ${isUserRating ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' : 'text-neutral-400 bg-neutral-800 border-neutral-700'}`}>
                            <StarIcon size={12} className={isUserRating ? "fill-yellow-500" : "fill-transparent"} />
                            <span className="text-xs">{displayRating}</span>
                        </div>
                    )}
                    {movie.notes && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 border border-neutral-700/50" title="Has notes">
                            <StickyNote size={12} className="text-neutral-400" />
                        </div>
                    )}
                     <div className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700/50">
                         {getStatusIcon(movie.status)}
                    </div>
                </div>
           </div>
           
           {/* Description */}
           <p className="text-sm text-neutral-400 mt-3 line-clamp-2 leading-relaxed">
               {movie.overview || "No description available."}
           </p>
        </div>
        
        {/* Footer Metadata */}
        <div className="flex items-center justify-between text-xs text-neutral-500 mt-2">
            <div className="flex items-center gap-3">
                 {movie.runtime > 0 && <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>}
            </div>

            {movie.lastWatched && (
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Watched {formatRelativeTime(movie.lastWatched)}</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
