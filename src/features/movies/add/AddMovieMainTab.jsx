import {
    Plus,
    X,
    Check,
    Library,
    Minus,
    PlayCircle,
    Clock,
} from "lucide-react";

export default function AddMovieMainTab({
    type,
    setType,
    releaseDate,
    setReleaseDate,
    runtime,
    setRuntime,
    tvStatus,
    setTvStatus,
    timesWatched,
    setTimesWatched,
    storedTimesWatched,
    setStoredTimesWatched,
    inProgress,
    setInProgress,
    lastWatchedPosition,
    setLastWatchedPosition,
    director,
    setDirector,
    directorInput,
    setDirectorInput,
    availability,
    toggleAvailability,
    inWatchlist,
    setInWatchlist,
}) {
    const addDirector = () => {
        if (directorInput.trim()) {
            setDirector((prev) => [...prev, directorInput.trim()]);
            setDirectorInput("");
        }
    };

    const removeDirector = (index) =>
        setDirector((prev) => prev.filter((_, i) => i !== index));

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            {/* Basic Info */}
            <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                    Release Date
                </label>
                <input
                    type="date"
                    className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                    Runtime (minutes)
                </label>
                <input
                    type="number"
                    className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                    value={runtime}
                    onChange={(e) => setRuntime(parseInt(e.target.value) || 0)}
                />
            </div>

            {/* Type & Status */}
            <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                    Type
                </label>
                <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                    {["movie", "tv"].map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            className={`flex-1 py-2 text-sm font-bold uppercase rounded-lg transition-colors ${
                                type === t
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-neutral-500 hover:text-neutral-300"
                            }`}
                        >
                            {t === "movie" ? "Movie" : "TV Show"}
                        </button>
                    ))}
                </div>
            </div>

            {type === "movie" ? (
                <>
                    <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-white flex items-center gap-2">
                                <Library
                                    size={16}
                                    className={
                                        inWatchlist
                                            ? "text-blue-500"
                                            : "text-neutral-500"
                                    }
                                />
                                In Watchlist
                            </label>
                            <div
                                onClick={() => setInWatchlist(!inWatchlist)}
                                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${
                                    inWatchlist
                                        ? "bg-blue-500"
                                        : "bg-neutral-700"
                                }`}
                            >
                                <div
                                    className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${
                                        inWatchlist ? "translate-x-5" : ""
                                    }`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-white flex items-center gap-2">
                                <PlayCircle
                                    size={16}
                                    className={
                                        inProgress
                                            ? "text-yellow-500"
                                            : "text-neutral-500"
                                    }
                                />
                                In Progress
                            </label>
                            <div
                                onClick={() => setInProgress(!inProgress)}
                                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${
                                    inProgress
                                        ? "bg-yellow-500"
                                        : "bg-neutral-700"
                                }`}
                            >
                                <div
                                    className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${
                                        inProgress ? "translate-x-5" : ""
                                    }`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-white flex items-center gap-2">
                                <Check
                                    size={16}
                                    className={
                                        timesWatched > 0
                                            ? "text-blue-500"
                                            : "text-neutral-500"
                                    }
                                />
                                Watched
                            </label>
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
                                className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                                    timesWatched > 0
                                        ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                                        : "bg-neutral-700 text-neutral-400 border-neutral-600"
                                }`}
                            >
                                {timesWatched > 0 ? "Watched" : "Not Watched"}
                            </button>
                        </div>

                        {timesWatched > 0 && (
                            <div className="flex items-center justify-between mt-3 pl-6 border-t border-neutral-700/50 pt-3">
                                <span className="text-xs text-neutral-400">
                                    Times Watched:
                                </span>
                                <div className="flex items-center gap-3 bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newVal = Math.max(
                                                1,
                                                timesWatched - 1,
                                            );
                                            setTimesWatched(newVal);
                                            setStoredTimesWatched(newVal);
                                        }}
                                        className="p-1 hover:text-white text-neutral-500 hover:bg-neutral-800 rounded"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="text-sm font-mono w-6 text-center">
                                        {timesWatched}
                                    </span>
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

                    {inProgress && (
                        <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
                            <label className="text-xs font-medium text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Clock size={14} />
                                Last Watched Position
                            </label>
                            <input
                                type="text"
                                value={lastWatchedPosition}
                                onChange={(e) =>
                                    setLastWatchedPosition(e.target.value)
                                }
                                placeholder="e.g., 45:30 or 1:23:45"
                                className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-sm font-mono"
                            />
                            <p className="text-xs text-neutral-500 mt-2">
                                Enter the timestamp where you stopped watching
                            </p>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                            TV Show Status
                        </label>
                        <select
                            className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                            value={tvStatus}
                            onChange={(e) => setTvStatus(e.target.value)}
                        >
                            <option value="Plan to Watch">Plan to Watch</option>
                            <option value="Watching">Watching</option>
                            <option value="Completed">Completed</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Dropped">Dropped</option>
                        </select>
                    </div>

                    {tvStatus === "Watching" && (
                        <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
                            <label className="text-xs font-medium text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Clock size={14} />
                                Last Watched Position
                            </label>
                            <input
                                type="text"
                                value={lastWatchedPosition}
                                onChange={(e) =>
                                    setLastWatchedPosition(e.target.value)
                                }
                                placeholder="e.g., S02E05 at 23:15"
                                className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-sm font-mono"
                            />
                            <p className="text-xs text-neutral-500 mt-2">
                                Enter where you stopped (e.g., "S02E05 at
                                23:15")
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Director */}
            {type === "movie" && (
                <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                        Director(s)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3 min-h-8">
                        {director.map((d, i) => (
                            <span
                                key={i}
                                className="bg-neutral-800 text-neutral-300 text-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-neutral-700"
                            >
                                {d}
                                <button
                                    onClick={() => removeDirector(i)}
                                    className="hover:text-red-400"
                                >
                                    <X size={14} />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                            value={directorInput}
                            onChange={(e) => setDirectorInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addDirector();
                                }
                            }}
                            placeholder="Add director..."
                        />
                        <button
                            type="button"
                            onClick={addDirector}
                            className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 rounded-xl border border-neutral-800"
                        >
                            <Check size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Availability */}
            <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                    Streaming Availability
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                        "Netflix",
                        "Prime Video",
                        "Disney+",
                        "Hulu",
                        "Max",
                        "Apple TV+",
                        "Paramount+",
                        "Fubo",
                    ].map((svc) => {
                        const isSelected = availability.includes(svc);
                        const iconMap = {
                            Netflix: "/icons/netflix.svg",
                            "Prime Video": "/icons/primevideo.svg",
                            "Disney+": "/icons/disneyplus.svg",
                            Hulu: "/icons/hulu.svg",
                            Max: "/icons/max.svg",
                            "Apple TV+": "/icons/appletv.svg",
                            "Paramount+": "/icons/paramountplus.svg",
                            Fubo: "/icons/fubo.svg",
                        };
                        const icon = iconMap[svc];
                        return (
                            <button
                                key={svc}
                                type="button"
                                onClick={() => toggleAvailability(svc)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                                    isSelected
                                        ? "bg-neutral-100 text-neutral-900 border-white font-medium"
                                        : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                                }`}
                            >
                                {icon && (
                                    <img
                                        src={icon}
                                        className="h-4 w-4 rounded-full object-cover"
                                        alt=""
                                    />
                                )}
                                <span className="truncate">{svc}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
