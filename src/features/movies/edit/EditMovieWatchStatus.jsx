import { Library, Check, Minus, Plus, PlayCircle, Clock } from "lucide-react";

export default function EditMovieWatchStatus({
    type,
    inWatchlist,
    setInWatchlist,
    timesWatched,
    setTimesWatched,
    storedTimesWatched,
    setStoredTimesWatched,
    inProgress,
    setInProgress,
    lastWatchedPosition,
    setLastWatchedPosition,
    tvStatus,
    setTvStatus,
}) {
    if (type === "movie") {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div
                        onClick={() => setInWatchlist(!inWatchlist)}
                        className={`flex items-center justify-between p-4 rounded-xl border border-neutral-800 cursor-pointer transition-all ${
                            inWatchlist
                                ? "bg-blue-500/10 border-blue-500/30"
                                : "bg-neutral-900/50"
                        }`}
                    >
                        <label
                            className={`text-sm font-medium flex items-center gap-3 cursor-pointer select-none ${
                                inWatchlist ? "text-blue-400" : "text-white"
                            }`}
                        >
                            <Library size={18} />
                            In Watchlist
                        </label>
                        <div
                            className={`w-10 h-6 rounded-full relative transition-colors ${
                                inWatchlist ? "bg-blue-500" : "bg-neutral-700"
                            }`}
                        >
                            <div
                                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${
                                    inWatchlist ? "translate-x-4" : ""
                                }`}
                            />
                        </div>
                    </div>
                    <div
                        onClick={() => setInProgress(!inProgress)}
                        className={`flex items-center justify-between p-4 rounded-xl border border-neutral-800 cursor-pointer transition-all ${
                            inProgress
                                ? "bg-yellow-500/10 border-yellow-500/30"
                                : "bg-neutral-900/50"
                        }`}
                    >
                        <label
                            className={`text-sm font-medium flex items-center gap-3 cursor-pointer select-none ${
                                inProgress ? "text-yellow-400" : "text-white"
                            }`}
                        >
                            <PlayCircle size={18} />
                            In Progress
                        </label>
                        <div
                            className={`w-10 h-6 rounded-full relative transition-colors ${
                                inProgress ? "bg-yellow-500" : "bg-neutral-700"
                            }`}
                        >
                            <div
                                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${
                                    inProgress ? "translate-x-4" : ""
                                }`}
                            />
                        </div>
                    </div>
                    <div
                        className={`p-4 rounded-xl border border-neutral-800 transition-all ${
                            timesWatched > 0
                                ? "bg-green-500/10 border-green-500/30"
                                : "bg-neutral-900/50"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <label
                                className={`text-sm font-medium flex items-center gap-3 select-none ${
                                    timesWatched > 0
                                        ? "text-green-400"
                                        : "text-white"
                                }`}
                            >
                                <Check size={18} />
                                Watched
                            </label>

                            <div className="flex items-center gap-3">
                                {timesWatched > 0 && (
                                    <div className="flex items-center bg-black/40 rounded-lg p-1">
                                        <button
                                            onClick={() =>
                                                setTimesWatched(
                                                    Math.max(
                                                        1,
                                                        timesWatched - 1,
                                                    ),
                                                )
                                            }
                                            className="p-1 hover:text-white text-neutral-500"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-6 text-center font-mono text-sm">
                                            {timesWatched}
                                        </span>
                                        <button
                                            onClick={() =>
                                                setTimesWatched(
                                                    timesWatched + 1,
                                                )
                                            }
                                            className="p-1 hover:text-white text-neutral-500"
                                        >
                                            <Plus size={14} />
                                        </button>
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
                                    className={`text-xs px-2 py-1 rounded border ${
                                        timesWatched > 0
                                            ? "border-green-500/50 text-green-400"
                                            : "border-neutral-700 text-neutral-500"
                                    }`}
                                >
                                    {timesWatched > 0 ? "Yes" : "No"}
                                </button>
                            </div>
                        </div>
                    </div>
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
                            (e.g., 45:30 for 45 minutes 30 seconds)
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // TV Show
    return (
        <div className="space-y-4">
            <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                    TV Show Status
                </label>
                <select
                    value={tvStatus}
                    onChange={(e) => setTvStatus(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                >
                    <option value="Plan to Watch">Plan to Watch</option>
                    <option value="Watching">Watching</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Dropped">Dropped</option>
                </select>
            </div>

            <div className="p-4 rounded-xl border border-neutral-800 transition-all bg-neutral-900/50">
                <div className="flex items-center justify-between">
                    <label
                        className={`text-sm font-medium flex items-center gap-3 select-none ${
                            timesWatched > 0 ? "text-green-400" : "text-white"
                        }`}
                    >
                        <Check size={18} />
                        Full Series Watches
                    </label>
                    <div className="flex items-center gap-3">
                        {timesWatched > 0 && (
                            <div className="flex items-center bg-black/40 rounded-lg p-1">
                                <button
                                    onClick={() =>
                                        setTimesWatched(
                                            Math.max(1, timesWatched - 1),
                                        )
                                    }
                                    className="p-1 hover:text-white text-neutral-500"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="w-6 text-center font-mono text-sm">
                                    {timesWatched}
                                </span>
                                <button
                                    onClick={() =>
                                        setTimesWatched(timesWatched + 1)
                                    }
                                    className="p-1 hover:text-white text-neutral-500"
                                >
                                    <Plus size={14} />
                                </button>
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
                            className={`text-xs px-2 py-1 rounded border ${
                                timesWatched > 0
                                    ? "border-green-500/50 text-green-400"
                                    : "border-neutral-700 text-neutral-500"
                            }`}
                        >
                            {timesWatched > 0 ? "Yes" : "No"}
                        </button>
                    </div>
                </div>
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
                        onChange={(e) => setLastWatchedPosition(e.target.value)}
                        placeholder="e.g., S02E05 at 23:15"
                        className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-sm font-mono"
                    />
                    <p className="text-xs text-neutral-500 mt-2">
                        Enter where you stopped (e.g., "S02E05 at 23:15" or just
                        "S02E05")
                    </p>
                </div>
            )}
        </div>
    );
}
