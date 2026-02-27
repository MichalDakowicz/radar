import { Users, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { batchSearchDirectors } from "../../../hooks/useDirectorSearch";

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
                        {cast.map((actor, i) => (
                            <div
                                key={i}
                                className="bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 text-white flex items-center gap-2"
                            >
                                <span className="font-medium">{actor}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {genres.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-neutral-500 uppercase mb-3">
                        Genres
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {genres.map((g) => (
                            <span
                                key={g}
                                className="px-3 py-1 rounded-full bg-neutral-800 text-neutral-300 text-sm border border-neutral-700"
                            >
                                {g}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
