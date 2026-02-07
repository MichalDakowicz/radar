import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, Check, Trash2, Library, Play, Minus, Plus, DownloadCloud, ArrowLeft, Save, Calculator, Monitor, Clapperboard, Film, FileVideo, Disc, Disc3, ExternalLink, List, CheckCircle } from "lucide-react";
import { useMovies } from "../hooks/useMovies";
import { StarRating } from "../features/movies/StarRating";
import { getServiceStyle, normalizeServiceName } from "../lib/services";
import { searchMedia, fetchMediaMetadata, fetchSeasonDetails } from "../services/tmdb";
import { Navbar } from "../components/layout/Navbar";
import SwipeNavigator from "../components/layout/SwipeNavigator";

export default function EditMovie() {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const { movies, updateMovie, removeMovie, loading: moviesLoading } = useMovies();
  
  const movie = movies.find(m => m.id === movieId);
  
  const [activeTab, setActiveTab] = useState("main"); // "main" | "details" | "rating"

  // -- Main Fields --
  const [availability, setAvailability] = useState([]);
  const [title, setTitle] = useState("");
  const [director, setDirector] = useState([]);
  const [directorInput, setDirectorInput] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  const [status, setStatus] = useState("Watchlist"); // Watchlist, Watched
  const [type, setType] = useState("movie");
  const [tmdbId, setTmdbId] = useState(null);
  const [imdbId, setImdbId] = useState("");
  const [voteAverage, setVoteAverage] = useState(0); // Public Rating
  const [tvStatus, setTvStatus] = useState("Watching");
  
  const [cast, setCast] = useState([]);
  const [genres, setGenres] = useState([]);
  const [runtime, setRuntime] = useState(0);
  const [overview, setOverview] = useState("");
  
  // Helpers for tags
  const [genreInput, setGenreInput] = useState("");
  const [castInput, setCastInput] = useState("");
  
  const addGenre = () => { if(genreInput.trim()) { setGenres(p => [...p, genreInput.trim()]); setGenreInput(""); } }
  const removeGenre = (i) => { setGenres(p => p.filter((_, idx) => idx !== i)); }
  
  const addCast = () => { if(castInput.trim()) { setCast(p => [...p, castInput.trim()]); setCastInput(""); } }
  const removeCast = (i) => { setCast(p => p.filter((_, idx) => idx !== i)); }

  const [inWatchlist, setInWatchlist] = useState(true);
  const [timesWatched, setTimesWatched] = useState(0);
  const [storedTimesWatched, setStoredTimesWatched] = useState(1);
  const [movieUrl, setMovieUrl] = useState("");

  // -- Details Fields --
  const [notes, setNotes] = useState("");
  
  // -- Ratings --
  const [overallRating, setOverallRating] = useState(0);
  const [ratings, setRatings] = useState({
      story: 0,
      acting: 0,
      ending: 0,
      enjoyment: 0
  });

  // -- Episode Tracking --
  const [numberOfSeasons, setNumberOfSeasons] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonData, setSeasonData] = useState(null); 
  const [episodesWatched, setEpisodesWatched] = useState({}); // keys like "s1e1"
  const [numberOfEpisodes, setNumberOfEpisodes] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (movie) {
      setAvailability(Array.isArray(movie.availability) 
        ? Array.from(new Set(movie.availability.map(normalizeServiceName).filter(Boolean))) 
        : (movie.format ? [normalizeServiceName(movie.format)] : []));
      setTitle(movie.title || "");
      setTmdbId(movie.tmdbId || null);
      setImdbId(movie.imdbId || "");
      setVoteAverage(movie.voteAverage || 0);
      setType(movie.type || "movie");
      setTvStatus(movie.type === 'tv' ? movie.status : "Watching");
      setCast(movie.cast || []);
      setGenres(movie.genres || []);
      setRuntime(movie.runtime || 0);
      setOverview(movie.overview || "");
      
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
          setDirector([movie.director]);
      } else if (Array.isArray(movie.artist)) { 
          setDirector(movie.artist);
      } else {
          setDirector([]);
      }

      setCoverUrl(movie.coverUrl || "");
      setReleaseDate(movie.releaseDate || "");

      setNotes(movie.notes || "");
      
      const r = movie.ratings || {};
      setOverallRating(r.overall || 0);
      setRatings({
          story: r.story || 0,
          acting: r.acting || 0,
          ending: r.ending || 0,
          enjoyment: r.enjoyment || 0
      });

      setNumberOfSeasons(movie.number_of_seasons || 0);
      setNumberOfEpisodes(movie.number_of_episodes || 0);
      setEpisodesWatched(movie.episodesWatched || {});
    }
  }, [movie]);

  // Load season data when tab/season changes
  useEffect(() => {
      if (activeTab === 'episodes' && type === 'tv' && tmdbId) {
          setIsProcessing(true);
          fetchSeasonDetails(tmdbId, selectedSeason)
            .then(data => {
                if(data) setSeasonData(data);
            })
            .catch(err => console.error(err))
            .finally(() => setIsProcessing(false));
      }
  }, [activeTab, selectedSeason, tmdbId, type]);

  const toggleEpisodeWatched = (seasonWithType, episodeNum) => {
      // Key format: s1e1
      const key = `s${seasonWithType}e${episodeNum}`;
      setEpisodesWatched(prev => ({
          ...prev,
          [key]: !prev[key]
      }));
  };

  const handleMarkSeasonComplete = () => {
      if (!seasonData?.episodes) return;
      
      const newWatched = { ...episodesWatched };
      seasonData.episodes.forEach(ep => {
          newWatched[`s${selectedSeason}e${ep.episode_number}`] = true;
      });
      setEpisodesWatched(newWatched);
  };

  const handleRecalculate = () => {
     const val = Object.values(ratings).filter(v => v > 0);
     if (val.length > 0) {
         const avg = val.reduce((a,b) => a+b, 0) / val.length;
         setOverallRating(parseFloat(avg.toFixed(1)));
     }
  };

  const handleSmartFill = async () => {
      if (!title) return;
      setIsProcessing(true);
      try {
        let data = null;
        if (tmdbId) {
            data = await fetchMediaMetadata(tmdbId, type);
        } else {
            const results = await searchMedia(title);
            if (results && results.length > 0) {
                 const match = results.find(r => r.type === type) || results[0];
                 data = await fetchMediaMetadata(match.tmdbId, match.type);
            }
        }

        if (data) {
            setTmdbId(data.tmdbId);
            setImdbId(data.imdbId || "");
            setVoteAverage(data.voteAverage || 0);
            setTitle(data.title);
            setType(data.type);
            setCoverUrl(data.coverUrl || coverUrl);
            setReleaseDate(data.releaseDate || releaseDate);
            setGenres(data.genres || []);
            setCast(data.cast || []);
            setRuntime(data.runtime || 0);
            setOverview(data.overview || "");
            setAvailability(data.availability ? Array.from(new Set(data.availability.map(normalizeServiceName).filter(Boolean))) : availability);
            setNumberOfSeasons(data.numberOfSeasons || 0);
            setNumberOfEpisodes(data.numberOfEpisodes || 0);
            
            if (data.type === 'movie' && data.director.length > 0) {
                setDirector(data.director);
            }
        }
      } catch (err) {
          console.error("Auto-fill failed", err);
          alert("Failed to fetch details from TMDB.");
      } finally {
          setIsProcessing(false);
      }
  };

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
    setIsProcessing(true);
    try {
      await updateMovie(movie.id, { 
        availability,
        title,
        director,
        coverUrl,
        releaseDate,
        url: movieUrl,
        status: type === 'tv' ? tvStatus : (timesWatched > 0 ? "Watched" : "Watchlist"),
        inWatchlist,
        imdbId,
        voteAverage,
        timesWatched,
        tmdbId,
        type,
        cast,
        genres,
        runtime,
        overview,
        notes,
        ratings: {
            ...ratings,
            overall: overallRating
        },
        number_of_seasons: numberOfSeasons,
        number_of_episodes: numberOfEpisodes,
        episodesWatched,
        addedAt: movie.addedAt
      });
      navigate(-1);
    } catch (e) {
      console.error("Failed to update movie", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to remove this movie?")) {
        setIsProcessing(true);
        await removeMovie(movie.id);
        navigate("/");
    }
  };

  if (moviesLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  if (!movie) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Movie not found</div>;

  const ServiceIcon = ({ id }) => {
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
      if (!src) return <div className="h-6 w-6 rounded-full bg-neutral-700 font-bold text-[10px] flex items-center justify-center text-white">{id.substring(0,2)}</div>;
      return <img src={src} className="h-6 w-6 rounded-full object-cover" />;
  };

  return (
    <div className="min-h-screen bg-black pb-32 font-sans text-neutral-200">
      <Navbar /> 
      
      <div className="w-full max-w-5xl mx-auto px-4 pt-1">
        {/* Tabs */}
        <div className="flex bg-neutral-900/90 p-1 rounded-xl mb-6 sticky top-[60px] sm:top-2 z-30 backdrop-blur-md border border-neutral-800 shadow-xl overflow-x-auto">
            {(type === 'tv' ? ['main', 'episodes', 'details', 'rating'] : ['main', 'details', 'rating']).map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 px-2 text-sm font-bold uppercase rounded-lg transition-all min-w-24 ${activeTab === tab ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    {tab === 'main' ? 'Basic Info' : tab === 'rating' ? 'Ratings' : tab === 'episodes' ? 'Episodes' : 'Details'}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
           {activeTab === "main" && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    {/* Cover Art */}
                     <div className="relative group rounded-xl overflow-hidden shadow-2xl border border-neutral-800 aspect-2/3">
                        {coverUrl ? (
                            <img src={coverUrl} className="w-full h-full object-cover" alt="Cover" />
                        ) : (
                            <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-neutral-600">
                                <Film size={48} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                             <input 
                                className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg text-xs"
                                value={coverUrl}
                                onChange={(e) => setCoverUrl(e.target.value)}
                                placeholder="Cover URL..."
                                onClick={(e) => e.stopPropagation()}
                             />
                        </div>
                     </div>
                     
                     {/* Auto Fill */}
                     <button
                        type="button"
                        onClick={handleSmartFill}
                        disabled={isProcessing || !title}
                        className="w-full text-xs flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors px-4 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20 font-medium"
                    >
                        <DownloadCloud size={16} /> Auto-fill from TMDB
                    </button>

                    {tmdbId && (
                        <a
                            href={type === 'tv' ? `https://pstream.mov/media/tmdb-tv-${tmdbId}` : `https://pstream.mov/media/tmdb-movie-${tmdbId}`}
                            target="_blank"
                            rel="noreferrer"
                             className="w-full text-xs flex items-center justify-center gap-2 text-white hover:text-white/80 transition-colors px-4 py-3 bg-neutral-800 rounded-xl border border-neutral-700 font-medium"
                        >
                            <span className="text-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20.927 20.927" preserveAspectRatio="xMidYMid meet"><g transform="translate(0,20.927) scale(0.003333,-0.003333)" fill="currentColor" stroke="none"><path d="M3910 5527 c-33 -4 -145 -17 -250 -28 -645 -73 -900 -187 -900 -405 l0 -89 154 -2 c209 -2 225 -17 381 -354 186 -399 337 -491 557 -341 103 70 176 67 252 -9 143 -142 -15 -342 -320 -404 l-123 -25 185 -393 c101 -217 189 -396 194 -398 6 -3 87 6 182 20 499 71 1160 -296 972 -541 -77 -101 -183 -100 -307 2 -186 154 -407 223 -610 188 -123 -21 -119 -9 -80 -274 40 -273 18 -701 -48 -916 -25 -82 252 -99 463 -28 655 220 1146 748 1330 1430 44 165 46 201 53 1206 l8 1035 -67 66 c-185 183 -1376 336 -2026 260z m1078 -1219 c118 -81 204 -84 312 -10 239 163 453 -73 240 -265 -241 -218 -703 -178 -832 71 -93 179 105 323 280 204z"></path><path d="M2410 4591 c-950 -201 -2404 -1015 -2409 -1348 -1 -69 771 -1707 885 -1878 422 -633 1185 -984 1924 -886 221 29 293 68 482 264 575 594 727 1466 390 2232 -231 525 -749 1600 -785 1630 -57 48 -214 44 -487 -14z m579 -1122 c114 -54 145 -188 64 -281 -48 -56 -60 -58 -265 -47 -102 6 -177 -42 -229 -143 -95 -187 -339 -145 -339 57 0 291 482 550 769 414z m-1319 -630 c215 -106 85 -350 -173 -326 -144 13 -209 -21 -270 -140 -102 -197 -381 -119 -339 94 59 295 506 508 782 372z m1472 -577 c216 -217 -287 -789 -786 -895 -473 -100 -909 127 -654 341 71 60 93 62 226 22 348 -106 739 77 903 423 83 177 201 218 311 109z"></path></g></svg>
                             </span>
                             <span>Watch on P-Stream</span>
                        </a>
                    )}
                    
                    {/* Runtime & IMDb moved here */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-2">Runtime</label>
                             <div className="relative">
                                    <input 
                                        type="number"
                                        className="w-full bg-neutral-900 border border-neutral-800 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-mono"
                                        value={runtime}
                                        onChange={(e) => setRuntime(parseInt(e.target.value) || 0)}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 text-[10px]">
                                        min
                                    </span>
                             </div>
                        </div>
                         <div>
                             <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-2">IMDb</label>
                             <div className="relative">
                                     <input 
                                        className="w-full bg-neutral-900 border border-neutral-800 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-mono placeholder:text-neutral-700 pr-9"
                                        value={imdbId}
                                        onChange={(e) => setImdbId(e.target.value)}
                                        placeholder="tt..."
                                    />
                                    {imdbId && (
                                        <a 
                                            href={`https://www.imdb.com/title/${imdbId}/`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-blue-400 p-1 transition-colors"
                                            title="Open styles in IMDb"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                    )}
                             </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Title</label>
                        <input 
                            className="w-full bg-transparent border-b border-neutral-800 text-white px-0 py-2 focus:outline-none focus:border-blue-500 text-3xl font-bold placeholder:text-neutral-800 transition-colors"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Movie Title"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Release Date</label>
                            <input 
                                type="date"
                                className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={releaseDate}
                                onChange={(e) => setReleaseDate(e.target.value)}
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Director</label>
                             <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    {director.map((d, i) => (
                                        <span key={i} className="bg-neutral-800 text-neutral-300 text-xs px-2 py-1 rounded-lg flex items-center gap-2 border border-neutral-700">
                                            {d}
                                            <button onClick={() => removeDirector(i)} className="hover:text-red-400"><X size={12} /></button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        className="w-full bg-neutral-900 border border-neutral-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm min-w-0"
                                        value={directorInput}
                                        onChange={(e) => setDirectorInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {e.preventDefault(); addDirector();} 
                                        }}
                                        placeholder="Add director..."
                                    />
                                    <button type="button" onClick={addDirector} className="shrink-0 bg-neutral-800 hover:bg-neutral-700 text-white px-3 rounded-xl border border-neutral-800"><Check size={16} /></button>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Status & Progress */}
                    <div className="pt-6 border-t border-neutral-800 space-y-6">
                         <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800 w-full sm:w-64">
                            {['movie', 'tv'].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`flex-1 py-2 text-sm font-bold uppercase rounded-lg transition-all ${type === t ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 hover:text-neutral-300'}`}
                                >
                                    {t === 'movie' ? 'Movie' : 'TV Show'}
                                </button>
                            ))}
                        </div>

                        {type === 'movie' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div 
                                    onClick={() => setInWatchlist(!inWatchlist)}
                                    className={`flex items-center justify-between p-4 rounded-xl border border-neutral-800 cursor-pointer transition-all ${inWatchlist ? "bg-blue-500/10 border-blue-500/30" : "bg-neutral-900/50"}`}
                                >
                                    <label className={`text-sm font-medium flex items-center gap-3 cursor-pointer select-none ${inWatchlist ? "text-blue-400" : "text-white"}`}>
                                        <Library size={18} />
                                        In Watchlist
                                    </label>
                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${inWatchlist ? "bg-blue-500" : "bg-neutral-700"}`}>
                                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${inWatchlist ? "translate-x-4" : ""}`} />
                                    </div>
                                </div>
                                <div className={`p-4 rounded-xl border border-neutral-800 transition-all ${timesWatched > 0 ? "bg-green-500/10 border-green-500/30" : "bg-neutral-900/50"}`}>
                                    <div className="flex items-center justify-between">
                                        <label className={`text-sm font-medium flex items-center gap-3 select-none ${timesWatched > 0 ? "text-green-400" : "text-white"}`}>
                                            <Check size={18} />
                                            Watched
                                        </label>
                                        
                                        <div className="flex items-center gap-3">
                                            {timesWatched > 0 && (
                                                <div className="flex items-center bg-black/40 rounded-lg p-1">
                                                    <button onClick={() => setTimesWatched(Math.max(1, timesWatched - 1))} className="p-1 hover:text-white text-neutral-500"><Minus size={14}/></button>
                                                    <span className="w-6 text-center font-mono text-sm">{timesWatched}</span>
                                                    <button onClick={() => setTimesWatched(timesWatched + 1)} className="p-1 hover:text-white text-neutral-500"><Plus size={14}/></button>
                                                </div>
                                            )}
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
                                                className={`text-xs px-2 py-1 rounded border ${timesWatched > 0 ? "border-green-500/50 text-green-400" : "border-neutral-700 text-neutral-500"}`}
                                            >
                                                {timesWatched > 0 ? "Yes" : "No"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                                    <label className="text-xs font-medium text-neutral-500 uppercase block mb-2">Status</label>
                                    <select 
                                        className="w-full bg-black border border-neutral-700 text-white p-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 appearance-none"
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
                                <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 flex items-center justify-between">
                                    <label className="text-xs font-medium text-neutral-500 uppercase">Full Rewatches</label>
                                    <div className="flex items-center gap-3 bg-black rounded-lg p-1 border border-neutral-800">
                                        <button onClick={() => setTimesWatched(Math.max(0, timesWatched - 1))} className="p-1.5 hover:text-white text-neutral-500"><Minus size={16} /></button>
                                        <span className="text-base font-mono w-6 text-center font-bold text-white">{timesWatched}</span>
                                        <button onClick={() => setTimesWatched(timesWatched + 1)} className="p-1.5 hover:text-white text-neutral-500"><Plus size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Availability */}
                     <div className="pt-6 border-t border-neutral-800">
                        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-4">Availability</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                                return (
                                    <button
                                      key={id}
                                      type="button"
                                      onClick={() => toggleAvailability(id)}
                                      className={`flex items-center gap-3 px-3 py-3 rounded-xl border text-sm transition-all text-left ${isSelected ? 'bg-white/10 text-white border-white/40' : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}
                                    >
                                        <ServiceIcon id={id} />
                                        <span className="font-medium truncate">{id}</span>
                                    </button>
                                )
                            })}
                        </div>
                     </div>

                     <div className="pt-8 border-t border-neutral-800">
                        <button 
                            onClick={handleDelete}
                            className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-400 hover:bg-red-500/5 py-4 rounded-xl transition-all font-medium border border-neutral-800 hover:border-red-500/20"
                        >
                            <Trash2 size={20} /> Remove from Library
                        </button>
                     </div>
                </div>
             </div>
           )}

           {activeTab === "details" && (
                <div className="space-y-8 max-w-3xl mx-auto">
                    {/* Internal ID */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Internal ID</label>
                        <div className="w-full bg-neutral-900/50 border border-neutral-800 text-neutral-500 px-4 py-3 rounded-xl text-sm font-mono select-all">
                            {tmdbId || 'N/A'}
                        </div>
                     </div>

                    {/* Genres */}
                     <div>
                         <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Genres</label>
                         <div className="flex flex-wrap gap-2 mb-3 min-h-8">
                            {genres.map((g, i) => (
                                <span key={i} className="bg-neutral-800 text-neutral-300 text-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-neutral-700">
                                    {g}
                                    <button onClick={() => removeGenre(i)} className="hover:text-red-400"><X size={14} /></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                                value={genreInput}
                                onChange={(e) => setGenreInput(e.target.value)}
                                onKeyDown={(e) => {if (e.key === "Enter") {e.preventDefault(); addGenre();}}}
                                placeholder="Add genre..."
                            />
                            <button type="button" onClick={addGenre} className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 rounded-xl border border-neutral-800"><Check size={20} /></button>
                        </div>
                    </div>

                    {/* Cast */}
                     <div>
                         <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Cast</label>
                         <div className="flex flex-wrap gap-2 mb-3 min-h-8">
                            {cast.map((c, i) => (
                                <span key={i} className="bg-neutral-800 text-neutral-300 text-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-neutral-700">
                                    {c}
                                    <button onClick={() => removeCast(i)} className="hover:text-red-400"><X size={14} /></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                                value={castInput}
                                onChange={(e) => setCastInput(e.target.value)}
                                onKeyDown={(e) => {if (e.key === "Enter") {e.preventDefault(); addCast();}}}
                                placeholder="Add actor..."
                            />
                            <button type="button" onClick={addCast} className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 rounded-xl border border-neutral-800"><Check size={20} /></button>
                        </div>
                    </div>

                    {/* Overview */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Overview</label>
                        <textarea 
                            className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-37.5 text-base leading-relaxed"
                            value={overview}
                            onChange={(e) => setOverview(e.target.value)}
                        />
                    </div>
                </div>
           )}

           {activeTab === "rating" && (
             <div className="space-y-8 max-w-3xl mx-auto">
                 <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Public Rating Score</label>
                    <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 flex items-center gap-4">
                        <div className="text-2xl font-bold font-mono text-white">{voteAverage > 0 ? voteAverage.toFixed(1) : "N/A"}</div>
                        <div className="text-sm text-neutral-500">Based on TMDb/IMDb votes (Read-only)</div>
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Overall Rating</label>
                    <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800 flex items-center justify-between">
                        <StarRating 
                            label=""
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
                            className="px-4 py-2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors active:scale-95 text-xs font-medium flex items-center gap-2"
                        >
                            <Calculator size={16} /> Auto-Calc
                        </button>
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Category Breakdown</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(ratings).map(([key, val]) => (
                            <div key={key} className="bg-neutral-900/30 p-4 rounded-xl border border-neutral-800">
                                 <StarRating 
                                    label={key}
                                    value={val}
                                    onChange={(newVal) => setRatings(prev => ({ ...prev, [key]: newVal }))}
                                    showInput={false}
                                />
                            </div>
                        ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Personal Notes</label>
                    <textarea 
                        className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-50 text-base leading-relaxed placeholder:text-neutral-800"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Write your review or thoughts here..."
                    />
                 </div>
                 
                 <div className="pt-12 border-t border-neutral-800">
                    <button 
                        onClick={handleDelete}
                        className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-400 hover:bg-red-500/5 py-4 rounded-xl transition-all font-medium border border-neutral-800 hover:border-red-500/20"
                    >
                        <Trash2 size={20} /> Delete Movie
                    </button>
                 </div>
             </div>
           )}
           {activeTab === "episodes" && type === 'tv' && (
               <div className="space-y-6 max-w-3xl mx-auto">
                    {/* Season Selector */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 pl-1 no-scrollbar">
                        {Array.from({ length: numberOfSeasons || 1 }, (_, i) => i + 1).map(num => (
                             <button
                                key={num}
                                onClick={() => setSelectedSeason(num)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-colors whitespace-nowrap ${
                                    selectedSeason === num 
                                    ? "bg-blue-600 text-white" 
                                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                                }`}
                             >
                                 Season {num}
                             </button>
                        ))}
                    </div>
                    
                    {/* Progress for this season */}
                    {seasonData && seasonData.episodes && (
                        <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                             <div className="flex justify-between items-center mb-3">
                                <div className="flex flex-col">
                                    <span className="text-xs text-neutral-400 uppercase font-medium">Season {selectedSeason} Progress</span>
                                    <span className="text-2xl font-bold text-white">
                                        {Math.round((seasonData.episodes.filter(e => episodesWatched[`s${selectedSeason}e${e.episode_number}`])?.length || 0) / (seasonData.episodes.length || 1) * 100)}%
                                    </span>
                                </div>
                                <button 
                                    onClick={handleMarkSeasonComplete}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium transition-colors border border-blue-500/20"
                                >
                                    <CheckCircle size={14} />
                                    Mark Season Complete
                                </button>
                             </div>
                             <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 transition-all duration-500" style={{
                                      width: `${((seasonData.episodes.filter(e => episodesWatched[`s${selectedSeason}e${e.episode_number}`])?.length || 0) / (seasonData.episodes.length || 1) * 100)}%`
                                  }} />
                             </div>
                        </div>
                    )}

                    {/* Episodes List */}
                    {isProcessing ? (
                         <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
                             <div className="animate-spin h-6 w-6 border-2 border-neutral-600 border-t-transparent rounded-full mb-2"></div>
                             <span>Loading episodes...</span>
                         </div>
                    ) : seasonData?.episodes ? (
                        <div className="space-y-2">
                             {seasonData.episodes.map(episode => {
                                 const isWatched = episodesWatched[`s${selectedSeason}e${episode.episode_number}`];
                                 return (
                                     <div key={episode.id} className={`p-4 rounded-xl border transition-all ${isWatched ? "bg-green-500/10 border-green-500/20" : "bg-neutral-900/30 border-neutral-800"}`}>
                                         <div className="flex items-start gap-4">
                                              <button 
                                                onClick={() => toggleEpisodeWatched(selectedSeason, episode.episode_number)}
                                                className={`mt-1 shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${isWatched ? "bg-green-500 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]" : "border-neutral-600 hover:border-neutral-400 text-transparent"}`}
                                              >
                                                  <Check size={14} strokeWidth={4} />
                                              </button>
                                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleEpisodeWatched(selectedSeason, episode.episode_number)}>
                                                  <div className="flex justify-between items-start gap-4">
                                                      <h3 className={`font-medium truncate ${isWatched ? "text-green-400" : "text-white"}`}>
                                                          {episode.episode_number}. {episode.name}
                                                      </h3>
                                                      <span className="text-xs font-mono text-neutral-500 shrink-0">{episode.air_date}</span>
                                                  </div>
                                                  <p className="text-sm text-neutral-400 mt-1 line-clamp-2">{episode.overview}</p>
                                              </div>
                                         </div>
                                     </div>
                                 )
                             })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-neutral-500 bg-neutral-900/30 rounded-xl border border-dashed border-neutral-800">
                            No episode data. Try Auto-fill or ensure TMDB ID is correct.
                        </div>
                    )}
               </div>
           )}
        </div>
        
        {/* Floating Save Button */}
        <div className="fixed bottom-24 right-6 sm:bottom-6 z-50">
             <button 
                onClick={handleSave} 
                disabled={isProcessing}
                className="h-14 w-14 sm:h-16 sm:w-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-600/30 hover:scale-110 active:scale-95 transition-all text-xl disabled:opacity-50 disabled:scale-100"
             >
                 {isProcessing ? (
                     <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 ) : (
                     <Save size={28} />
                 )}
             </button>
        </div>
      </div>
    </div>
  );
}
