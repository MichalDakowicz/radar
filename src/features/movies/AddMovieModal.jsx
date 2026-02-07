import { useState, useEffect } from "react";
import { X, Search, Loader2, Plus, Minus, PenLine, Link, Check, Clapperboard, Heart, Clock, Disc, Disc3, Monitor, FileVideo, Film, Library, Calculator } from "lucide-react";
import { StarRating } from "./StarRating";
import { fetchMediaMetadata, searchMedia } from "../../services/tmdb";
import { getServiceStyle } from "../../lib/services";

export default function AddMovieModal({ isOpen, onClose, onAdd }) {
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  
  // Tab State
  const [activeTab, setActiveTab] = useState("main"); // "main" | "details"

  // Editable fields state
  // -- Main --
  const [type, setType] = useState("movie"); // "movie" | "tv"
  const [title, setTitle] = useState("");
  const [director, setDirector] = useState([]);
  const [coverUrl, setCoverUrl] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [availability, setAvailability] = useState([]); // Replaces formats
  const [directorInput, setDirectorInput] = useState("");
  const [tmdbId, setTmdbId] = useState(null);
  const [imdbId, setImdbId] = useState("");
  const [voteAverage, setVoteAverage] = useState(0);
  
  // Additional Data
  const [cast, setCast] = useState([]);
  const [genres, setGenres] = useState([]);
  const [runtime, setRuntime] = useState(0);
  const [overview, setOverview] = useState("");
  
  // Status State
  const [inWatchlist, setInWatchlist] = useState(true);
  const [timesWatched, setTimesWatched] = useState(0);
  const [storedTimesWatched, setStoredTimesWatched] = useState(1);
  const [tvStatus, setTvStatus] = useState("Watching"); 
  const [numberOfSeasons, setNumberOfSeasons] = useState(0);
  const [numberOfEpisodes, setNumberOfEpisodes] = useState(0);

  // -- Details --
  const [notes, setNotes] = useState("");
  // const [acquisitionDate, setAcquisitionDate] = useState(""); // Removed

  // -- Ratings --
  const [overallRating, setOverallRating] = useState(0);
  const [ratings, setRatings] = useState({
      story: 0,
      acting: 0,
      ending: 0,
      enjoyment: 0
  });
  
  const [error, setError] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    // UI Reset
    setActiveTab("main");
    setInputVal("");
    setDirectorInput("");
    setPreview(null);
    setSearchResults([]);
    setError("");

    // Data Reset
    setType("movie");
    setTitle("");
    setDirector([]);
    setCoverUrl("");
    setReleaseDate("");
    setTmdbId(null);
    setImdbId("");
    setVoteAverage(0);
    setAvailability([]);
    
    setCast([]);
    setGenres([]);
    setRuntime(0);
    setOverview("");
    
    setInWatchlist(true);
    setTimesWatched(0);
    setStoredTimesWatched(1);
    setTvStatus("Watching");
    setNumberOfSeasons(0);
    setNumberOfEpisodes(0);
            
    // Reset details
    setNotes("");
    
    setOverallRating(0);
    setRatings({
        story: 0,
        acting: 0,
        ending: 0,
        enjoyment: 0
    });
  };

  // Sync state when preview changes
  useEffect(() => {
    if (preview) {
      setImdbId(preview.imdbId || "");
      setVoteAverage(preview.voteAverage || 0);
      setTmdbId(preview.tmdbId);
      setTitle(preview.title || "");
      setType(preview.type || "movie");
      if (Array.isArray(preview.director)) {
          setDirector(preview.director);
      } else {
          setDirector([]);
      }
      setCoverUrl(preview.coverUrl || "");
      setReleaseDate(preview.releaseDate || "");
      setCast(preview.cast || []);
      setGenres(preview.genres || []);
      setRuntime(preview.runtime || 0);
      setOverview(preview.overview || "");
      setAvailability(preview.availability || []);
      setNumberOfSeasons(preview.numberOfSeasons || 0);
      setNumberOfEpisodes(preview.numberOfEpisodes || 0);
    }
  }, [preview]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputVal.trim()) {
        performSearch(inputVal);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputVal]);

  const performSearch = async (val) => {
    setLoading(true);
    setError("");
    
    try {
      const results = await searchMedia(val);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
      // Silent error for search
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMovie = async (item) => {
    setLoading(true);
    try {
        const fullData = await fetchMediaMetadata(item.tmdbId, item.type);
        setPreview(fullData);
        setSearchResults([]);
        setInputVal(""); // Clear search input
    } catch (err) {
        setError("Failed to fetch details.");
    } finally {
        setLoading(false);
    }
  };

  const handleRecalculate = () => {
     const val = Object.values(ratings).filter(v => v > 0);
     if (val.length > 0) {
         const avg = val.reduce((a,b) => a+b, 0) / val.length;
         setOverallRating(parseFloat(avg.toFixed(1)));
     }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) return;

    // Merge director input if present
    const finalDirectors = [...director];
    if (directorInput.trim()) {
       finalDirectors.push(directorInput.trim());
    }

    onAdd({
      imdbId,
      voteAverage,
      tmdbId,
      type,
      cast,
      genres,
      runtime,
      overview,
      title,
      director: finalDirectors,
      coverUrl,
      releaseDate,
      availability,
      status: type === 'tv' ? tvStatus : (timesWatched > 0 ? "Watched" : "Watchlist"),
      inWatchlist,
      timesWatched,
      notes,
      number_of_episodes: numberOfEpisodes,
      number_of_seasons: numberOfSeasons,
      ratings: {
          ...ratings,
          overall: overallRating
      },
      addedAt: Date.now(),
    });
    onClose();
  };

  const toggleAvailability = (svc) => {
    setAvailability(prev => {
        if (prev.includes(svc)) {
            return prev.filter(f => f !== svc);
        }
        return [...prev, svc];
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <Plus className="text-blue-500" />
             Add Movie
           </h2>
           <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white">
             <X size={20} />
           </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-900 sticky top-0 z-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input
              autoFocus
              className="w-full bg-neutral-800/50 border border-neutral-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-neutral-500"
              placeholder="Search by title..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-neutral-400" size={18} />}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto divide-y divide-neutral-700/50">
                  {searchResults.map((item) => (
                      <button
                          key={item.tmdbId}
                          onClick={() => handleSelectMovie(item)}
                          className="w-full text-left p-3 hover:bg-neutral-700/50 transition-colors flex items-center gap-3 group"
                      >
                          {item.coverUrl ? (
                              <img src={item.coverUrl} alt="" className="w-10 h-14 object-cover rounded shadow-md group-hover:scale-105 transition-transform" />
                          ) : (
                              <div className="w-10 h-14 bg-neutral-700 rounded flex items-center justify-center">
                                  <Film size={16} className="text-neutral-500" />
                              </div>
                          )}
                          <div>
                              <div className="font-medium text-white group-hover:text-blue-400 transition-colors">{item.title}</div>
                              <div className="text-xs text-neutral-400">{item.releaseDate?.substring(0,4)}</div>
                          </div>
                      </button>
                  ))}
              </div>
          )}
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-y-auto">
            {/* Tabs Header */}
            <div className="flex border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
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

            <div className="p-6 space-y-6">
                {activeTab === "main" ? (
                    <>
                        <div className="flex flex-col sm:flex-row gap-6">
                            {/* Cover Preview */}
                            <div className="w-32 sm:w-40 shrink-0 mx-auto sm:mx-0">
                                <div className="aspect-2/3 bg-neutral-800 rounded-lg overflow-hidden shadow-lg border border-neutral-700 relative group">
                                    {coverUrl ? (
                                        <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 p-4 text-center">
                                            <Film size={32} className="mb-2 opacity-50" />
                                            <span className="text-xs">No Cover</span>
                                        </div>
                                    )}
                                    <button 
                                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium"
                                      onClick={() => {
                                          const url = prompt("Enter Image URL:", coverUrl);
                                          if(url !== null) setCoverUrl(url);
                                      }}
                                    >
                                        Change URL
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Title</label>
                                    <input 
                                        className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Movie Title"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Director(s)</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {director.map((d, i) => (
                                            <span key={i} className="bg-neutral-800 text-neutral-300 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-neutral-700">
                                                {d}
                                                <button onClick={() => setDirector(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-400"><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            className="flex-1 bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                                            value={directorInput}
                                            onChange={(e) => setDirectorInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && directorInput.trim()) {
                                                    e.preventDefault();
                                                    setDirector(prev => [...prev, directorInput.trim()]);
                                                    setDirectorInput("");
                                                }
                                            }}
                                            placeholder="Add director..."
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                if (directorInput.trim()) {
                                                    setDirector(prev => [...prev, directorInput.trim()]);
                                                    setDirectorInput("");
                                                }
                                            }}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 rounded-lg border border-neutral-700"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Release Date</label>
                                    <input 
                                        type="date"
                                        className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={releaseDate}
                                        onChange={(e) => setReleaseDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status & Availability */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-neutral-800">
                             <div>
                                <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Progress & Status</label>
                                    <div className="space-y-3">
                                        <div className="flex bg-neutral-800 p-1 rounded-lg border border-neutral-700">
                                            {['movie', 'tv'].map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setType(t)}
                                                    className={`flex-1 py-1.5 text-xs font-bold uppercase rounded transition-colors ${type === t ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                                                >
                                                    {t === 'movie' ? 'Movie' : 'TV Show'}
                                                </button>
                                            ))}
                                        </div>

                                        {type === 'movie' ? (
                                        <>
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
                                        </>
                                        ) : (
                                            <div className="bg-neutral-800 p-3 rounded-lg border border-neutral-700 space-y-3">
                                                 <div className="flex flex-col gap-2">
                                                    <label className="text-xs font-bold text-neutral-400 uppercase">Status</label>
                                                    <select 
                                                        className="bg-neutral-900 border border-neutral-700 text-white p-2 rounded text-sm focus:outline-none focus:border-blue-500"
                                                        value={tvStatus}
                                                        onChange={(e) => setTvStatus(e.target.value)}
                                                    >
                                                        <option value="Watching">Watching</option>
                                                        <option value="Plan to Watch">Plan to Watch</option>
                                                        <option value="Completed">Completed</option>
                                                        <option value="Dropped">Dropped</option>
                                                        <option value="On Hold">On Hold</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
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
                                        'Apple TV+',
                                        'Paramount+',
                                        'Fubo'
                                    ].map(id => {
                                        const isSelected = availability.includes(id);
                                        const map = {
                                            'Netflix': '/icons/netflix.svg',
                                            'Prime Video': '/icons/primevideo.svg',
                                            'Disney+': '/icons/disneyplus.svg',
                                            'Hulu': '/icons/hulu.svg',
                                            'Max': '/icons/max.svg',
                                            'Apple TV+': '/icons/appletv.svg',
                                            'Paramount+': '/icons/paramountplus.svg',
                                            'Fubo': '/icons/fubo.svg'
                                        };
                                        const src = map[id];
                                        return (
                                            <button
                                              key={id}
                                              type="button"
                                              onClick={() => toggleAvailability(id)}
                                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${isSelected ? 'bg-neutral-100 text-neutral-900 border-white font-medium' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'}`}
                                            >
                                                {src ? <img src={src} className="h-5 w-5 rounded-full object-cover" /> : <div className="h-5 w-5 rounded-full bg-neutral-700 flex items-center justify-center text-[8px] text-white font-bold">{id.substring(0,2)}</div>}
                                                {id}
                                            </button>
                                        )
                                    })}
                                </div>
                             </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-6">
                        {/* Ratings */}
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

                        {/* Overview & Metadata */}
                        <div className="space-y-4">
                             <div>
                                <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Metadata</label>
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Runtime (mins)</label>
                                        <input 
                                            type="number"
                                            className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            value={runtime}
                                            onChange={(e) => setRuntime(parseInt(e.target.value) || 0)}
                                        />
                                     </div>
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">IMDb ID</label>
                                    <div className="relative">
                                        <input 
                                            className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-mono placeholder:text-neutral-600 pr-10"
                                            value={imdbId}
                                            onChange={(e) => setImdbId(e.target.value)}
                                            placeholder="tt1234567"
                                        />
                                        {imdbId && (
                                            <a 
                                                href={`https://www.imdb.com/title/${imdbId}/`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-1"
                                            >
                                                <Link size={16} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Public Rating</label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        max="10"
                                        className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-mono"
                                        value={voteAverage}
                                        onChange={(e) => setVoteAverage(parseFloat(e.target.value))}
                                    />
                                </div>
                             </div>
                             
                             </div>
                             
                             <div>
                                <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Overview</label>
                                <textarea 
                                    className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-25 text-sm"
                                    value={overview}
                                    onChange={(e) => setOverview(e.target.value)}
                                    placeholder="Plot summary..."
                                />
                             </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Personal Notes</label>
                            <textarea 
                                className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-20"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Personal thoughts..."
                            />
                        </div>
                         
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                {/* Placeholder for other fields if needed */}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-neutral-400 hover:text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!title}
            className="px-6 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/50 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed mx-2"
          >
            Add Movie
          </button>
        </div>
      </div>
    </div>
  );
}
