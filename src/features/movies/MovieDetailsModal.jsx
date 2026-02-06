import { X, Calendar, Clapperboard, StickyNote, Quote, Monitor, ExternalLink, Star } from "lucide-react";
import { getServiceStyle } from "../../lib/services";

export default function MovieDetailsModal({ isOpen, onClose, movie }) {
  if (!isOpen || !movie) return null;

  // Normalize director
  const directors = Array.isArray(movie.director) 
      ? movie.director 
      : (Array.isArray(movie.artist) ? movie.artist : [movie.artist || movie.director]).filter(Boolean);

  const availability = Array.isArray(movie.availability) ? movie.availability : (movie.format ? [movie.format] : []);
  const quotes = movie.quotes || movie.favoriteTracks;
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
             <div className="absolute inset-0 bg-cover bg-center blur-xl opacity-50" style={{ backgroundImage: `url(${movie.coverUrl})` }} />
             <div className="absolute inset-0 bg-linear-to-t from-neutral-900 to-transparent" />
             </>
          ) : (
            <div className="absolute inset-0 bg-neutral-800" />
          )}
           
           <div className="absolute top-4 right-4 flex gap-2 z-10">
               <a 
                href={`https://www.imdb.com/find?q=${encodeURIComponent(movie.title)}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black transition-colors font-bold text-xs flex items-center gap-1"
                title="Search on IMDB"
               >
                   IMDb <ExternalLink size={12}/>
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
                    <img src={movie.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-neutral-500">
                        <Clapperboard size={24} />
                    </div>
                )}
            </div>
            <div className="mb-2 min-w-0 flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-white truncate leading-tight shadow-black drop-shadow-md">{movie.title}</h2>
                <div className="text-lg sm:text-xl text-neutral-300 truncate drop-shadow-md">
                    {directors.join(", ")}
                </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-800/10 rounded-lg p-3 border border-neutral-800">
                    <div className="text-xs text-neutral-500 uppercase font-bold mb-1">Release Date</div>
                    <div className="flex items-center gap-2 text-neutral-200">
                        <Calendar size={16} className="text-blue-500"/>
                        <span className="font-mono text-sm">{movie.releaseDate || 'Unknown'}</span>
                    </div>
                </div>
                <div className="bg-neutral-800/10 rounded-lg p-3 border border-neutral-800">
                    <div className="text-xs text-neutral-500 uppercase font-bold mb-1">Availability</div>
                     <div className="flex flex-wrap gap-1.5">
                        {availability.length > 0 ? availability.map((svc, i) => {
                             const style = getServiceStyle(svc);
                             return (
                                <span key={i} className="px-2 py-0.5 rounded text-xs bg-neutral-900 text-neutral-300 border border-neutral-700 font-medium flex items-center gap-2">
                                    <div 
                                        className={`h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-bold shadow-sm ${style.color}`}
                                    >
                                        {style.short}
                                    </div>
                                    {svc}
                                </span>
                             )
                        }) : (
                            <span className="text-neutral-500 text-sm">Unknown</span>
                        )}
                    </div>
                </div>

                 <div className="bg-neutral-800/10 rounded-lg p-3 border border-neutral-800 col-span-2">
                    <div className="text-xs text-neutral-500 uppercase font-bold mb-1">Genres</div>
                    <div className="flex flex-wrap gap-1">
                         {movie.genres && movie.genres.length > 0 ? (
                             movie.genres.map((g, i) => (
                                 <span key={i} className="text-sm text-neutral-300">
                                     {g}{i < movie.genres.length - 1 ? ", " : ""}
                                 </span>
                             ))
                         ) : (
                             <span className="text-neutral-500 italic text-sm">No genres listed</span>
                         )}
                    </div>
                </div>
            </div>
            
            {/* Ratings Section */}
            {(Object.keys(ratings).length > 0) && (
                 <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase flex items-center gap-2 tracking-wide">
                            <Star size={14} className="text-amber-500 fill-amber-500" /> Ratings
                        </h3>
                        {(() => {
                           // Calculate or use Overall
                           let displayRating = null;
                           if (ratings.overall > 0) {
                               displayRating = ratings.overall;
                           } else {
                               const { overall, ...sub } = ratings;
                               const values = Object.values(sub).filter(v => v > 0);
                               if (values.length > 0) {
                                   displayRating = values.reduce((a, b) => a + b, 0) / values.length;
                               }
                           }

                           if (!displayRating) return null;
                           const r = parseFloat(displayRating.toFixed(1));

                           return (
                               <div className="flex items-center gap-2 bg-neutral-800/50 px-2 py-1 rounded-lg">
                                 <div className="flex gap-0.5">
                                    {[1,2,3,4,5].map(i => {
                                        let fill = 0;
                                        if (r >= i) fill = 100;
                                        else if (r > i - 1) fill = (r - (i - 1)) * 100;
                                        
                                        return (
                                            <div key={i} className="relative">
                                                <Star size={12} className="text-neutral-700" />
                                                {fill > 0 && (
                                                    <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
                                                        <Star size={12} className="fill-amber-400 text-amber-400" />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                 </div>
                                 <span className="text-amber-400 font-bold font-mono text-sm">{r}</span>
                               </div>
                           );
                        })()}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         {Object.entries(ratings).filter(([k]) => k !== 'overall').map(([key, val]) => (
                             val > 0 && <div key={key} className="flex justify-between items-center bg-neutral-800/30 p-2 rounded">
                                 <span className="text-xs uppercase text-neutral-400 font-medium">{key}</span>
                                 <div className="flex items-center gap-2">
                                    <div className="flex gap-0.5">
                                        {[1,2,3,4,5].map(i => {
                                            let fill = 0;
                                            if (val >= i) fill = 100;
                                            else if (val > i - 1) fill = (val - (i - 1)) * 100;

                                            return (
                                                <div key={i} className="relative">
                                                    <Star size={8} className="text-neutral-700" />
                                                    {fill > 0 && (
                                                        <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
                                                            <Star size={8} className="fill-amber-400 text-amber-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <span className="text-xs font-bold text-white w-6 text-right">{val}</span>
                                 </div>
                             </div>
                         ))}
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

             {/* Quotes */}
            {quotes && (
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase flex items-center gap-2 tracking-wide">
                        <Quote size={14} /> Favorite Quotes / Scenes
                    </h3>
                    <div className="p-4 rounded-xl bg-neutral-800/30 border border-neutral-800/50 text-neutral-300 leading-relaxed whitespace-pre-wrap text-sm italic font-serif">
                        "{quotes}"
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
