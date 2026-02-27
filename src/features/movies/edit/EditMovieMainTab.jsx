import { Trash2, Clapperboard } from "lucide-react";
import EditMovieLinks from "./EditMovieLinks";
import EditMovieMetadata from "./EditMovieMetadata";
import EditMovieCastCrew from "./EditMovieCastCrew";
import EditMovieAvailability from "./EditMovieAvailability";
import EditMovieWatchStatus from "./EditMovieWatchStatus";
import EditMovieSimilar from "./EditMovieSimilar";

export default function EditMovieMainTab({
    tmdbId,
    type,
    imdbId,
    title,
    handleSmartFill,
    isProcessing,
    releaseDate,
    setReleaseDate,
    runtime,
    setRuntime,
    setType,
    tvStatus,
    setTvStatus,
    timesWatched,
    voteAverage,
    director,
    directorInput,
    setDirectorInput,
    addDirector,
    removeDirector,
    cast,
    genres,
    availability,
    toggleAvailability,
    inWatchlist,
    setInWatchlist,
    setTimesWatched,
    storedTimesWatched,
    setStoredTimesWatched,
    inProgress,
    setInProgress,
    lastWatchedPosition,
    setLastWatchedPosition,
    handleDelete,
}) {
    return (
        <div className="space-y-8">
            {/* Quick Actions */}
            <EditMovieLinks
                tmdbId={tmdbId}
                type={type}
                imdbId={imdbId}
                title={title}
                handleSmartFill={handleSmartFill}
                isProcessing={isProcessing}
            />
            {/* Watch Status - TOP PRIORITY */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Clapperboard className="text-blue-500" size={20} />
                    Watch Status
                </h3>
                <EditMovieWatchStatus
                    type={type}
                    inWatchlist={inWatchlist}
                    setInWatchlist={setInWatchlist}
                    timesWatched={timesWatched}
                    setTimesWatched={setTimesWatched}
                    storedTimesWatched={storedTimesWatched}
                    setStoredTimesWatched={setStoredTimesWatched}
                    inProgress={inProgress}
                    setInProgress={setInProgress}
                    lastWatchedPosition={lastWatchedPosition}
                    setLastWatchedPosition={setLastWatchedPosition}
                    tvStatus={tvStatus}
                    setTvStatus={setTvStatus}
                />
            </div>

            {/* Metadata */}
            <EditMovieMetadata
                releaseDate={releaseDate}
                setReleaseDate={setReleaseDate}
                runtime={runtime}
                setRuntime={setRuntime}
                type={type}
                setType={setType}
                tvStatus={tvStatus}
                setTvStatus={setTvStatus}
                timesWatched={timesWatched}
                voteAverage={voteAverage}
                tmdbId={tmdbId}
            />

            {/* Cast & Crew */}
            <EditMovieCastCrew
                director={director}
                directorInput={directorInput}
                setDirectorInput={setDirectorInput}
                addDirector={addDirector}
                removeDirector={removeDirector}
                cast={cast}
                genres={genres}
                tmdbId={tmdbId}
            />

            {/* Availability */}
            <EditMovieAvailability
                availability={availability}
                toggleAvailability={toggleAvailability}
            />

            {/* Similar Movies/Shows */}
            {tmdbId && <EditMovieSimilar tmdbId={tmdbId} type={type} />}

            {/* Delete Button */}
            <div className="pt-8 border-t border-neutral-800">
                <button
                    onClick={handleDelete}
                    className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-400 hover:bg-red-500/5 py-4 rounded-xl transition-all font-medium border border-neutral-800 hover:border-red-500/20"
                >
                    <Trash2 size={20} /> Remove from Library
                </button>
            </div>
        </div>
    );
}
