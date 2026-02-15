import { ExternalLink, DownloadCloud } from "lucide-react";

export default function EditMovieLinks({
    tmdbId,
    type,
    imdbId,
    title,
    handleSmartFill,
    isProcessing,
}) {
    return (
        <div className="flex flex-wrap gap-3">
            {tmdbId && (
                <a
                    href={
                        type === "tv"
                            ? `https://pstream.mov/media/tmdb-tv-${tmdbId}`
                            : `https://pstream.mov/media/tmdb-movie-${tmdbId}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-full px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white transition-colors border border-neutral-800"
                >
                    <span className="text-xl">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="1em"
                            height="1em"
                            viewBox="0 0 20.927 20.927"
                            preserveAspectRatio="xMidYMid meet"
                        >
                            <g
                                transform="translate(0,20.927) scale(0.003333,-0.003333)"
                                fill="currentColor"
                                stroke="none"
                            >
                                <path d="M3910 5527 c-33 -4 -145 -17 -250 -28 -645 -73 -900 -187 -900 -405 l0 -89 154 -2 c209 -2 225 -17 381 -354 186 -399 337 -491 557 -341 103 70 176 67 252 -9 143 -142 -15 -342 -320 -404 l-123 -25 185 -393 c101 -217 189 -396 194 -398 6 -3 87 6 182 20 499 71 1160 -296 972 -541 -77 -101 -183 -100 -307 2 -186 154 -407 223 -610 188 -123 -21 -119 -9 -80 -274 40 -273 18 -701 -48 -916 -25 -82 252 -99 463 -28 655 220 1146 748 1330 1430 44 165 46 201 53 1206 l8 1035 -67 66 c-185 183 -1376 336 -2026 260z m1078 -1219 c118 -81 204 -84 312 -10 239 163 453 -73 240 -265 -241 -218 -703 -178 -832 71 -93 179 105 323 280 204z"></path>
                                <path d="M2410 4591 c-950 -201 -2404 -1015 -2409 -1348 -1 -69 771 -1707 885 -1878 422 -633 1185 -984 1924 -886 221 29 293 68 482 264 575 594 727 1466 390 2232 -231 525 -749 1600 -785 1630 -57 48 -214 44 -487 -14z m579 -1122 c114 -54 145 -188 64 -281 -48 -56 -60 -58 -265 -47 -102 6 -177 -42 -229 -143 -95 -187 -339 -145 -339 57 0 291 482 550 769 414z m-1319 -630 c215 -106 85 -350 -173 -326 -144 13 -209 -21 -270 -140 -102 -197 -381 -119 -339 94 59 295 506 508 782 372z m1472 -577 c216 -217 -287 -789 -786 -895 -473 -100 -909 127 -654 341 71 60 93 62 226 22 348 -106 739 77 903 423 83 177 201 218 311 109z"></path>
                            </g>
                        </svg>
                    </span>
                    <span className="font-semibold">Watch on P-Stream</span>
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
