import { Calendar, Clock, Play, Monitor, Star } from "lucide-react";

export default function EditMovieMetadata({
    releaseDate,
    setReleaseDate,
    runtime,
    setRuntime,
    type,
    setType,
    tvStatus,
    setTvStatus,
    timesWatched,
    voteAverage,
}) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                <div className="text-xs text-neutral-500 uppercase font-bold mb-2">
                    Release Date
                </div>
                <input
                    type="date"
                    className="w-full bg-transparent border-none text-white focus:outline-none text-sm"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                />
            </div>

            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                <div className="text-xs text-neutral-500 uppercase font-bold mb-2">
                    Runtime
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={18} className="text-purple-500" />
                    <input
                        type="number"
                        className="w-full bg-transparent border-none text-white focus:outline-none font-mono text-sm"
                        value={runtime}
                        onChange={(e) =>
                            setRuntime(parseInt(e.target.value) || 0)
                        }
                        placeholder="0"
                    />
                    <span className="text-neutral-600 text-xs">min</span>
                </div>
            </div>

            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                <div className="text-xs text-neutral-500 uppercase font-bold mb-2">
                    Status
                </div>
                <div className="flex items-center gap-2 text-white">
                    <Play size={18} className="text-green-500" />
                    {type === "tv" ? (
                        <select
                            className="w-full bg-transparent border-none text-white focus:outline-none text-sm appearance-none"
                            value={tvStatus}
                            onChange={(e) => setTvStatus(e.target.value)}
                        >
                            <option value="Watching" className="bg-neutral-900">
                                Watching
                            </option>
                            <option
                                value="Plan to Watch"
                                className="bg-neutral-900"
                            >
                                Plan to Watch
                            </option>
                            <option
                                value="Completed"
                                className="bg-neutral-900"
                            >
                                Completed
                            </option>
                            <option value="Dropped" className="bg-neutral-900">
                                Dropped
                            </option>
                            <option value="On Hold" className="bg-neutral-900">
                                On Hold
                            </option>
                        </select>
                    ) : (
                        <span className="text-sm">
                            {timesWatched > 0 ? "Watched" : "Watchlist"}
                        </span>
                    )}
                </div>
            </div>

            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                <div className="text-xs text-neutral-500 uppercase font-bold mb-2">
                    Type
                </div>
                <div className="flex items-center gap-2 text-white">
                    <Monitor size={18} className="text-orange-500" />
                    <select
                        className="w-full bg-transparent border-none text-white focus:outline-none text-sm appearance-none capitalize"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                    >
                        <option value="movie" className="bg-neutral-900">
                            Movie
                        </option>
                        <option value="tv" className="bg-neutral-900">
                            TV Show
                        </option>
                    </select>
                </div>
            </div>

            {voteAverage > 0 && (
                <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                    <div className="text-xs text-neutral-500 uppercase font-bold mb-2">
                        IMDb Rating
                    </div>
                    <div className="flex items-center gap-2 text-white">
                        <Star
                            size={18}
                            className="text-yellow-500 fill-yellow-500"
                        />
                        <span className="font-mono text-sm">
                            {voteAverage.toFixed(1)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
