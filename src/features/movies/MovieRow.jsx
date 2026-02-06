import { Star, Heart, Clock, StickyNote, Play, Check, Clapperboard } from "lucide-react";
import { formatRelativeTime } from "../../lib/utils";

export default function MovieRow({ movie, onClick, isHighlighted, innerRef }) {

  const highlightedStyles = isHighlighted 
    ? "bg-neutral-800 border-l-4 border-l-blue-500" 
    : "bg-neutral-900 border-l-4 border-l-transparent hover:bg-neutral-800 hover:border-l-neutral-700";

  const getStatusIcon = (status) => {
      switch(status) {
          case 'Watchlist': return <Heart size={12} className="text-pink-500 fill-pink-500" />;
          case 'Watched': return <Check size={12} className="text-blue-500" />;
          default: return null;
      }
  };

  const directorName = Array.isArray(movie.director) 
    ? movie.director.join(", ") 
    : (movie.director || movie.artist || "");

  return (
    <div 
      ref={innerRef}
      onClick={onClick}
      className={`flex items-center gap-4 rounded-md p-3 transition-all duration-200 group cursor-pointer ${highlightedStyles} ${movie.status === 'Watchlist' ? 'bg-neutral-950/50' : ''}`}
    >
      <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-neutral-800 relative">
        {movie.coverUrl ? (
            <img src={movie.coverUrl} alt="" className={`h-full w-full object-cover ${movie.status === 'Watchlist' ? 'grayscale opacity-70' : ''}`} />
        ) : (
            <div className="h-full w-full flex items-center justify-center text-neutral-600">
                <Clapperboard size={16} />
            </div>
        )}
        {isHighlighted && <div className="absolute inset-0 bg-blue-500/10" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
           <h3 className={`truncate font-bold transition-colors ${isHighlighted ? 'text-blue-400' : 'text-white group-hover:text-blue-300'}`}>{movie.title}</h3>
           
           {/* Badges */}
           <div className="flex items-center gap-1">
                {movie.notes && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700" title="Has notes">
                        <StickyNote size={10} className="text-neutral-400" />
                    </div>
                )}
                <div className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700">
                     {getStatusIcon(movie.status)}
                </div>
           </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
            <span className="truncate max-w-[150px] font-medium text-neutral-300">{directorName}</span>
            <span>•</span>
            <span>{movie.releaseDate?.split('-')[0]}</span>
             <span>•</span>
             <span className="text-neutral-500">{Array.isArray(movie.format) ? movie.format[0] : (movie.format || 'Digital')}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {movie.lastWatched && (
              <div className="text-[10px] text-neutral-500 text-right hidden sm:block">
                  <div>Last watched</div>
                  <div className="text-neutral-400">{formatRelativeTime(movie.lastWatched)}</div>
              </div>
          )}
      </div>
    </div>
  );
}
