import { Users, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { batchSearchDirectors } from "../../../hooks/useDirectorSearch";

const GENRE_IDS = {
    Action: 28,
    Adventure: 12,
    Animation: 16,
    Comedy: 35,
    Crime: 80,
    Documentary: 99,
    Drama: 18,
    Family: 10751,
    Fantasy: 14,
    History: 36,
    Horror: 27,
    Music: 10402,
    Mystery: 9648,
    Romance: 10749,
    "Science Fiction": 878,
    "TV Movie": 10770,
    Thriller: 53,
    War: 10752,
    Western: 37,
};

export default function EditMovieCastCrew({
    director,
    directorInput,
    setDirectorInput,
    addDirector,
    removeDirector,
    cast,
    genres,
    tmdbId,
}) {
    const navigate = useNavigate();
    const [directorIds, setDirectorIds] = useState({});

    // Fetch director IDs for linking
    useEffect(() => {
        async function fetchIds() {
            if (director.length === 0) return;

            const directorNames = director.map((d) =>
                typeof d === "object" ? d.name : d,
            );
            const ids = await batchSearchDirectors(directorNames);
            setDirectorIds(ids);
        }

        fetchIds();
    }, [director]);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                    <Users className="text-pink-500" />
                    Director
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                    {director.map((d, i) => {
                        const dirName = typeof d === "object" ? d.name : d;
                        const dirId = directorIds[dirName];

                        return (
                            <div
                                key={i}
                                className="bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 text-white flex items-center gap-2 group"
                            >
                                {dirId ? (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigate(`/director/${dirId}`);
                                        }}
                                        className="font-medium hover:text-blue-400 transition-colors"
                                    >
                                        {dirName}
                                    </button>
                                ) : (
                                    <span className="font-medium">
                                        {dirName}
                                    </span>
                                )}
                                {!tmdbId && (
                                    <button
                                        onClick={() => removeDirector(i)}
                                        className="hover:text-red-400"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
                {!tmdbId && (
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
                )}
            </div>

            {cast.length > 0 && (
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                        <Users className="text-pink-500" />
                        Cast
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {cast.map((actor, i) => {
                            const actorName =
                                typeof actor === "object" ? actor.name : actor;
                            const actorId =
                                typeof actor === "object" ? actor.id : null;

                            return (
                                <div
                                    key={i}
                                    onClick={() =>
                                        actorId && navigate(`/actor/${actorId}`)
                                    }
                                    className={`bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 text-white flex items-center gap-2 ${
                                        actorId
                                            ? "cursor-pointer hover:bg-neutral-800 hover:border-neutral-700 transition-all"
                                            : ""
                                    }`}
                                >
                                    <span className="font-medium">
                                        {actorName}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {genres.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-neutral-500 uppercase mb-3">
                        Genres
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {genres.map((g) => {
                            const genreName =
                                typeof g === "object" ? g.name : g;
                            const genreId =
                                typeof g === "object" ? g.id : GENRE_IDS[g];

                            return (
                                <span
                                    key={genreId || genreName}
                                    onClick={() =>
                                        genreId && navigate(`/genre/${genreId}`)
                                    }
                                    className={`px-3 py-1 rounded-full bg-neutral-800 text-neutral-300 text-sm border border-neutral-700 ${
                                        genreId
                                            ? "cursor-pointer hover:bg-neutral-700 hover:border-neutral-600 transition-all"
                                            : ""
                                    }`}
                                >
                                    {genreName}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
