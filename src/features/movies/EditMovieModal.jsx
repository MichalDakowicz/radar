import { useState, useEffect } from "react";
import { X, Check, Link, Trash2, Library, Heart, Clapperboard, Monitor, Film, FileVideo, Disc, Disc3, Star, StarHalf, Calculator, Plus, Minus } from "lucide-react";
import { StarRating } from "./StarRating";
import { getServiceStyle } from "../../lib/services";

export default function EditMovieModal({ isOpen, onClose, movie, onUpdate, onDelete }) {
  const [activeTab, setActiveTab] = useState("main"); // "main" | "details"

  // -- Main Fields --
  const [availability, setAvailability] = useState([]);
  const [title, setTitle] = useState("");
  const [director, setDirector] = useState([]);
  const [directorInput, setDirectorInput] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  const [status, setStatus] = useState("Watchlist"); // Watchlist, Watched
  const [inWatchlist, setInWatchlist] = useState(true);
  const [timesWatched, setTimesWatched] = useState(0);
  const [storedTimesWatched, setStoredTimesWatched] = useState(1);
  const [movieUrl, setMovieUrl] = useState("");

  // -- Details Fields --
  const [notes, setNotes] = useState("");
  const [quotes, setQuotes] = useState(""); // formerly favoriteTracks
  // const [acquisitionDate, setAcquisitionDate] = useState(""); // Removed
  
  // -- Ratings --
  const [overallRating, setOverallRating] = useState(0);
  const [ratings, setRatings] = useState({
      story: 0,
      acting: 0,
      visuals: 0,
      audio: 0
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (movie) {
      setActiveTab("main");
      setAvailability(Array.isArray(movie.availability) ? movie.availability : (movie.format ? [movie.format] : []));
      setTitle(movie.title || "");
      // Status Logic
      setStatus(movie.status || "Watchlist");
      setInWatchlist(movie.inWatchlist !== undefined ? movie.inWatchlist : (movie.status === "Watchlist"));
      
      const seenCount = movie.timesWatched ?? (movie.status === "Watched" ? 1 : 0);
      setTimesWatched(seenCount);
      setStoredTimesWatched(seenCount > 0 ? seenCount : 1);
      
      setMovieUrl(movie.url || "");
      
      // Director Logic
      if (Array.isArray(movie.director)) {
          setDirector(movie.director);
      } else if (typeof movie.director === 'string') {
          // Legacy/Fallback
          setDirector([movie.director]);
      } else if (Array.isArray(movie.artist)) { // Fallback for old data
          setDirector(movie.artist);
      } else {
          setDirector([]);
      }

      setCoverUrl(movie.coverUrl || "");
      setReleaseDate(movie.releaseDate || "");

      // Details
      setNotes(movie.notes || "");
      setQuotes(movie.quotes || movie.favoriteTracks || "");
      // setAcquisitionDate(movie.acquisitionDate || "");
      
      const r = movie.ratings || {};
      setOverallRating(r.overall || 0);
      setRatings({
          story: r.story || 0,
          acting: r.acting || 0,
          visuals: r.visuals || 0,
          audio: r.audio || 0
      });
    }
  }, [movie]);

  const handleRecalculate = () => {
     const val = Object.values(ratings).filter(v => v > 0);
     if (val.length > 0) {
         const avg = val.reduce((a,b) => a+b, 0) / val.length;
         setOverallRating(parseFloat(avg.toFixed(1)));
     }
  };

  if (!isOpen || !movie) return null;

  const addDirector = () => {
      if (directorInput.trim()) {
          setDirector(prev => [...prev, directorInput.trim()]);
          setDirectorInput("");
      }
  };

  const removeDirector = (index) => {
      setDirector(prev => prev.filter((_, i) => i !== index));
  };

  const toggleAvailability = (f) => {
    setAvailability(prev => {
      const isSelected = prev.includes(f);
      if (isSelected) {
        return prev.filter(item => item !== f);
      } else {
        return [...prev, f];
      }
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdate(movie.id, { 
        availability,
        title,
        director,
        coverUrl,
        releaseDate,
        url: movieUrl,
        status: timesWatched > 0 ? "Watched" : "Watchlist", // Backward compatibility
        inWatchlist,
        timesWatched,
        // New Fields
        notes,
        quotes,
        // acquisitionDate,
        ratings: {
            ...ratings,
            overall: overallRating
        },
        // Keep old created at
        addedAt: movie.addedAt
      });
      onClose();
    } catch (e) {
      console.error("Failed to update movie", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to remove this movie?")) {
        setLoading(true);
        await onDelete(movie.id);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
           <h2 className="text-xl font-bold text-white">Edit Movie</h2>
           <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white">
             <X size={20} />
           </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-900 sticky top-0 z-10">
                <button 
                  onClick={() => setActiveTab("main")}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "main" ? "border-blue-500 text-blue-500 bg-blue-500/5" : "border-transparent text-neutral-400 hover:text-neutral-200"}`}
                >
                    Main Info
                </button>
                <button 
                  onClick={() => setActiveTab("details")}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "details" ? "border-blue-500 text-blue-500 bg-blue-500/5" : "border-transparent text-neutral-400 hover:text-neutral-200"}`}
                >
                    Details & Notes
                </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           {activeTab === "main" ? (
             <div className="space-y-4">
                {/* Title & Director */}
                <div>
                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Title</label>
                    <input 
                        className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Director(s)</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {director.map((d, i) => (
                            <span key={i} className="bg-neutral-800 text-neutral-300 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-neutral-700">
                                {d}
                                <button onClick={() => removeDirector(i)} className="hover:text-red-400"><X size={12} /></button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                            value={directorInput}
                            onChange={(e) => setDirectorInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {e.preventDefault(); addDirector();} 
                            }}
                            placeholder="Add director..."
                        />
                        <button type="button" onClick={addDirector} className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 rounded-lg border border-neutral-700"><Check size={16} /></button>
                    </div>
                </div>

                {/* Cover URL */}
                <div>
                     <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Cover URL</label>
                     <div className="flex gap-4">
                        <div className="h-20 w-14 bg-neutral-800 rounded overflow-hidden flex-shrink-0 border border-neutral-700">
                             {coverUrl ? <img src={coverUrl} className="w-full h-full object-cover" /> : null}
                        </div>
                        <input 
                            className="flex-1 h-10 bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-sm"
                            value={coverUrl}
                            onChange={(e) => setCoverUrl(e.target.value)}
                        />
                     </div>
                </div>

                {/* Status & Formats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-neutral-800">
                             <div>
                                <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Progress & Status</label>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg border border-neutral-700">
                                        <label className="text-sm font-medium text-white flex items-center gap-2 cursor-pointer select-none">
                                            <Library size={16} className={inWatchlist ? "text-blue-500" : "text-neutral-500"} />
                                            In Watchlist
                                        </label>
                                        <div 
                                            onClick={() => setInWatchlist(!inWatchlist)}
                                            className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${inWatchlist ? "bg-blue-500" : "bg-neutral-700"}`}
                                        >
                                            <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${inWatchlist ? "translate-x-5" : ""}`} />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-neutral-800 p-3 rounded-lg border border-neutral-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium text-white flex items-center gap-2 select-none">
                                                <Check size={16} className={timesWatched > 0 ? "text-blue-500" : "text-neutral-500"} />
                                                Watched
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (timesWatched > 0) {
                                                            setStoredTimesWatched(timesWatched);
                                                            setTimesWatched(0);
                                                        } else {
                                                            setTimesWatched(storedTimesWatched);
                                                        }
                                                    }}
                                                    className={`text-xs px-2 py-1 rounded border transition-colors ${timesWatched > 0 ? "bg-blue-500/20 text-blue-400 border-blue-500/40" : "bg-neutral-700 text-neutral-400 border-neutral-600"}`}
                                                >
                                                    {timesWatched > 0 ? "Watched" : "Not Watched"}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {timesWatched > 0 && (
                                            <div className="flex items-center justify-between mt-3 pl-6 border-t border-neutral-700/50 pt-2 animate-in fade-in slide-in-from-top-1">
                                                <span className="text-xs text-neutral-400">Times Watched:</span>
                                                <div className="flex items-center gap-3 bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            const newVal = Math.max(1, timesWatched - 1);
                                                            setTimesWatched(newVal);
                                                            setStoredTimesWatched(newVal);
                                                        }}
                                                        className="p-1 hover:text-white text-neutral-500 hover:bg-neutral-800 rounded"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="text-sm font-mono w-4 text-center">{timesWatched}</span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            const newVal = timesWatched + 1;
                                                            setTimesWatched(newVal);
                                                            setStoredTimesWatched(newVal);
                                                        }}
                                                        className="p-1 hover:text-white text-neutral-500 hover:bg-neutral-800 rounded"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                             </div>

                             <div>
                                <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Availability</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        'Netflix',
                                        'Prime Video',
                                        'Disney+',
                                        'Hulu',
                                        'Max',
                                        'Apple TV+'
                                    ].map(id => {
                                        const isSelected = availability.includes(id);
                                        const style = getServiceStyle(id);
                                        return (
                                            <button
                                              key={id}
                                              type="button"
                                              onClick={() => toggleAvailability(id)}
                                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${isSelected ? 'bg-neutral-100 text-neutral-900 border-white font-medium' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'}`}
                                            >
                                                <div 
                                                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm ${style.color}`}
                                                >
                                                    {style.short}
                                                </div>
                                                {id}
                                            </button>
                                        )
                                    })}
                                </div>
                             </div>
                </div>

             </div>
           ) : (
             <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Complex Rating Details</label>
                    
                    <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800 mb-4 flex items-center justify-between">
                        <StarRating 
                            label="Overall"
                            value={overallRating}
                            onChange={(val) => {
                                setOverallRating(val);
                                if (val === 0) {
                                    setRatings(prev => Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}));
                                }
                            }}
                            showInput={true}
                        />
                         <button
                            type="button"
                            onClick={handleRecalculate}
                            className="p-2 text-neutral-400 hover:text-white bg-neutral-700/50 hover:bg-neutral-700 rounded-lg transition-colors"
                            title="Recalculate from categories"
                        >
                            <Calculator size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 bg-neutral-800/50 p-4 rounded-xl border border-neutral-800">
                        {Object.entries(ratings).map(([key, val]) => (
                            <StarRating 
                                key={key}
                                label={key}
                                value={val}
                                onChange={(newVal) => setRatings(prev => ({ ...prev, [key]: newVal }))}
                                showInput={false}
                            />
                        ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Notes</label>
                    <textarea 
                        className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[100px]"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Quotes / Favorite Scenes</label>
                    <textarea 
                        className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[80px]"
                        value={quotes}
                        onChange={(e) => setQuotes(e.target.value)}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     {/* Placeholder for removed acquisition date */}
                </div>
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex justify-between items-center">
            <button 
                onClick={handleDelete}
                className="flex items-center gap-2 text-red-500 hover:text-red-400 px-2 py-1 rounded transition-colors text-sm"
            >
                <Trash2 size={16} /> Delete
            </button>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 text-neutral-400 hover:text-white font-medium transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">Save Changes</button>
            </div>
        </div>
      </div>
    </div>
  );
}
