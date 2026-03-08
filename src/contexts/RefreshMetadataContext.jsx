import {
    createContext,
    useContext,
    useState,
    useCallback,
} from "react";
import { ref, update } from "firebase/database";
import { db } from "../lib/firebase";
import { fetchMediaMetadata } from "../services/tmdb";
import { useAuth } from "../features/auth/AuthContext";
import { useMovies } from "../hooks/useMovies";
import { useWatchProviderCountry } from "../hooks/useWatchProviderCountry";
import { useToast } from "../components/ui/Toast";

const RefreshMetadataContext = createContext({
    isRefreshing: false,
    progress: { current: 0, total: 0 },
    startRefreshMetadata: () => {},
});

function stripUndefined(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj))
        return obj.filter((v) => v !== undefined).map(stripUndefined);
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, stripUndefined(v)]),
    );
}

export function RefreshMetadataProvider({ children }) {
    const { user } = useAuth();
    const { movies } = useMovies();
    const watchProviderCountry = useWatchProviderCountry();
    const { toast } = useToast();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const startRefreshMetadata = useCallback(async () => {
        if (!user || !movies.length) {
            toast({
                title: "No Movies",
                description: "You don't have any movies to refresh.",
                variant: "destructive",
            });
            return;
        }

        const confirmed = window.confirm(
            `This will refresh metadata for all ${movies.length} movies in your library from TMDB. This may take a few minutes. You can leave this page and it will continue in the background. Continue?`,
        );

        if (!confirmed) return;

        const movieList = [...movies];
        const total = movieList.length;
        setIsRefreshing(true);
        setProgress({ current: 0, total });

        let successCount = 0;
        let errorCount = 0;

        try {
            for (let i = 0; i < movieList.length; i++) {
                const movie = movieList[i];
                setProgress({ current: i + 1, total });

                try {
                    const freshData = await fetchMediaMetadata(
                        movie.tmdbId,
                        movie.type || "movie",
                        watchProviderCountry,
                    );

                    if (freshData) {
                        const updatedMovie = {
                            ...movie,
                            title: freshData.title,
                            coverUrl: freshData.coverUrl || movie.coverUrl,
                            releaseDate: freshData.releaseDate || movie.releaseDate,
                            genres: freshData.genres,
                            director: freshData.director,
                            cast: freshData.cast,
                            overview: freshData.overview,
                            runtime: freshData.runtime,
                            voteAverage: freshData.voteAverage,
                            voteCount: freshData.voteCount,
                            imdbId: freshData.imdbId || movie.imdbId,
                            number_of_seasons:
                                freshData.number_of_seasons ?? movie.number_of_seasons,
                            number_of_episodes:
                                freshData.number_of_episodes ?? movie.number_of_episodes,
                            tagline: freshData.tagline || movie.tagline,
                            budget: freshData.budget ?? movie.budget,
                            revenue: freshData.revenue ?? movie.revenue,
                            productionCompanies:
                                freshData.productionCompanies || movie.productionCompanies,
                            availability: freshData.availability?.length
                                ? freshData.availability
                                : movie.availability,
                            ratings: movie.ratings,
                            watched: movie.watched,
                            inWatchlist: movie.inWatchlist,
                            inProgress: movie.inProgress,
                            timesWatched: movie.timesWatched,
                            addedAt: movie.addedAt,
                            watchedAt: movie.watchedAt,
                            notes: movie.notes,
                        };

                        const payload = stripUndefined(updatedMovie);

                        await update(
                            ref(db, `users/${user.uid}/movies/${movie.id}`),
                            payload,
                        );

                        successCount++;
                    }
                } catch (error) {
                    console.error(`Error refreshing ${movie.title}:`, error);
                    errorCount++;
                }

                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            toast({
                title: "Metadata Refresh Complete",
                description: `Successfully refreshed ${successCount} movies.${
                    errorCount > 0 ? ` ${errorCount} failed.` : ""
                }`,
                variant: errorCount > 0 ? "default" : "success",
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "Refresh Failed",
                description: e.message,
                variant: "destructive",
            });
        } finally {
            setIsRefreshing(false);
            setProgress({ current: 0, total: 0 });
        }
    }, [user, movies, watchProviderCountry, toast]);

    return (
        <RefreshMetadataContext.Provider
            value={{
                isRefreshing,
                progress,
                startRefreshMetadata,
            }}
        >
            {children}
        </RefreshMetadataContext.Provider>
    );
}

export function useRefreshMetadata() {
    const ctx = useContext(RefreshMetadataContext);
    if (!ctx) {
        return {
            isRefreshing: false,
            progress: { current: 0, total: 0 },
            startRefreshMetadata: () => {},
        };
    }
    return ctx;
}
