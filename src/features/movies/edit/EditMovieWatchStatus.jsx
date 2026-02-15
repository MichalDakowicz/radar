import { Library, Check, Minus, Plus } from "lucide-react";

export default function EditMovieWatchStatus({
    type,
    inWatchlist,
    setInWatchlist,
    timesWatched,
    setTimesWatched,
    storedTimesWatched,
    setStoredTimesWatched,
}) {
    if (type === "movie") {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
        );
    }

    // TV Show
    return (
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
    );
}
