import { ExternalLink, DownloadCloud } from "lucide-react";
import {
    getCinebyPlayUrl,
    getNextEpisode,
    CINEBY_LOGO_URL,
} from "../../../lib/cineby";

export default function EditMovieLinks({
    tmdbId,
    type,
    imdbId,
    title,
    handleSmartFill,
    isProcessing,
    episodesWatched = {},
    number_of_seasons = null,
    seasonEpisodeCounts = null,
}) {
    const playMovie = tmdbId
        ? {
              tmdbId,
              type,
              episodesWatched,
              number_of_seasons,
              seasonEpisodeCounts,
          }
        : null;
    const playUrl = playMovie ? getCinebyPlayUrl(playMovie) : null;
    const isTv = type === "tv";
    const nextEp =
        isTv &&
        playUrl &&
        getNextEpisode(
            episodesWatched,
            number_of_seasons,
            seasonEpisodeCounts,
        );
    const playLabel = isTv
        ? nextEp
            ? `Play episode S${nextEp.season}E${nextEp.episode}`
            : "Play episode"
        : "Play on Cineby";

    return (
        <div className="flex flex-wrap gap-3">
            {playUrl && (
                <a
                    href={playUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-full px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white transition-colors border border-neutral-800"
                >
                    <img
                        src={CINEBY_LOGO_URL}
                        alt=""
                        className="h-[18px] w-auto shrink-0"
                    />
                    <span className="font-semibold">{playLabel}</span>
                </a>
            )}
            <a
                href={
                    imdbId
                        ? `https://www.imdb.com/title/${imdbId}`
                        : `https://www.imdb.com/find?q=${encodeURIComponent(
                              title,
                          )}`
                }
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black transition-colors font-bold flex items-center gap-2"
                title="Open IMDb"
            >
                IMDb <ExternalLink size={14} />
            </a>
            <button
                type="button"
                onClick={handleSmartFill}
                disabled={isProcessing || !title}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20 font-medium disabled:opacity-50"
            >
                <DownloadCloud size={16} /> Auto-fill from TMDB
            </button>
        </div>
    );
}
