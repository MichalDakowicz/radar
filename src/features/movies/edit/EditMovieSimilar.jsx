import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clapperboard, Loader2 } from "lucide-react";
import { fetchSimilarMedia } from "../../../services/tmdb";

export default function EditMovieSimilar({ tmdbId, type }) {
    const navigate = useNavigate();
    const [similarMovies, setSimilarMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSimilar() {
            if (!tmdbId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const similar = await fetchSimilarMedia(
                    tmdbId,
                    type || "movie",
                );
                setSimilarMovies(similar);
            } catch (error) {
                console.error("Failed to load similar movies", error);
            } finally {
                setLoading(false);
            }
        }

        loadSimilar();
    }, [tmdbId, type]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-neutral-500" size={24} />
            </div>
        );
    }

    if (similarMovies.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clapperboard className="text-blue-500" size={20} />
                Similar {type === "tv" ? "Shows" : "Movies"}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {similarMovies.map((similar) => (
                    <div
                        key={similar.tmdbId}
                        onClick={() =>
                            navigate(`/movie/${similar.tmdbId}/${similar.type}`)
                        }
                        className="group cursor-pointer"
                    >
                        <div className="aspect-2/3 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 group-hover:border-blue-500 transition-all group-hover:scale-105">
                            {similar.coverUrl ? (
                                <img
                                    src={similar.coverUrl}
                                    alt={similar.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                    <Clapperboard size={32} />
                                </div>
                            )}
                        </div>
                        <div className="mt-2 space-y-1">
                            <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
                                {similar.title}
                            </h4>
                            {similar.releaseDate && (
                                <p className="text-xs text-neutral-500">
                                    {similar.releaseDate.substring(0, 4)}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
