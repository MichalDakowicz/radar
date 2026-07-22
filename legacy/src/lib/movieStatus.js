/**
 * Movie Status Management Utility
 *
 * This utility manages movie status using boolean flags instead of string statuses.
 *
 * Status Flags:
 * - inWatchlist: Movie is in the watchlist
 * - inProgress: Movie is currently being watched
 * - watched: Movie has been completed at least once
 *
 * Rules:
 * - ONLY inProgress and inWatchlist are mutually exclusive
 * - Setting inProgress to true will set inWatchlist to false
 * - Setting inWatchlist to true will set inProgress to false
 * - watched status is independent and preserved across all changes
 * - A movie can be both watched=true and inWatchlist=true (for rewatching)
 * - Default state: inWatchlist = true, inProgress = false, watched = false
 */

/**
 * Migrate old status string to new boolean flags
 * @param {object} movie - The movie object
 * @param {boolean} force - Force migration from status field even if flags exist
 */
export function migrateStatus(movie, force = false) {
    // If force is false and already using new system, ensure consistency
    if (
        !force &&
        movie.inWatchlist !== undefined &&
        movie.inProgress !== undefined &&
        movie.watched !== undefined
    ) {
        const inWatchlist = movie.inWatchlist || false;
        const inProgress = movie.inProgress || false;
        const watched = movie.watched || false;

        // Ensure inProgress and inWatchlist are mutually exclusive
        if (inProgress && inWatchlist) {
            // If both are true, prioritize inProgress
            return { inWatchlist: false, inProgress: true, watched };
        }

        return { inWatchlist, inProgress, watched };
    }

    // Migrate from old status string (or force re-migration)
    const status = movie.status || "Watchlist";
    const timesWatched = movie.timesWatched || 0;

    // Map old statuses - status takes priority
    switch (status) {
        case "Completed":
        case "Watched":
            // Always mark as watched if status says so
            return { inWatchlist: false, inProgress: false, watched: true };

        case "Watching":
            // If watching, it's in progress (not in watchlist)
            // Check if they've watched it before (rewatching)
            const hasWatchedBefore = timesWatched > 0;
            return {
                inWatchlist: false,
                inProgress: true,
                watched: hasWatchedBefore,
            };

        case "Watchlist":
        case "Plan to Watch":
        default:
            // In watchlist, not in progress
            // Check if they've watched it before (want to rewatch)
            let watched = timesWatched > 0;

            // For TV shows, check if it's completed based on episodes
            if (movie.type === "tv" && !watched) {
                const totalEpisodes = movie.number_of_episodes || 0;
                const watchedEpisodes = movie.episodesWatched
                    ? Object.values(movie.episodesWatched).filter(Boolean)
                          .length
                    : 0;

                if (totalEpisodes > 0 && watchedEpisodes >= totalEpisodes) {
                    watched = true;
                }
            }

            return { inWatchlist: true, inProgress: false, watched };
    }
}

/**
 * Get display status string from boolean flags
 * Priority: inProgress > inWatchlist > watched
 */
export function getDisplayStatus(movie) {
    // Check current state first (inProgress and inWatchlist are mutually exclusive)
    if (movie.inProgress) return "Watching";
    if (movie.inWatchlist) return "Watchlist";
    // If neither inProgress nor inWatchlist, check if watched
    if (movie.watched) return "Completed";
    return "Watchlist"; // Default
}

/**
 * Get status for filtering
 */
export function getFilterStatus(movie) {
    return getDisplayStatus(movie);
}

/**
 * Check if movie is in watchlist
 */
export function isInWatchlist(movie) {
    if (movie.inWatchlist !== undefined) return movie.inWatchlist;
    const status = movie.status || "Watchlist";
    return status === "Watchlist" || status === "Plan to Watch";
}

/**
 * Check if movie is in progress
 */
export function isInProgress(movie) {
    if (movie.inProgress !== undefined) return movie.inProgress;
    return movie.status === "Watching";
}

/**
 * Check if movie is watched/completed (at least once)
 */
export function isWatched(movie) {
    if (movie.watched !== undefined) return movie.watched;
    const status = movie.status || "Watchlist";
    return (
        status === "Completed" ||
        status === "Watched" ||
        (movie.timesWatched || 0) > 0
    );
}

/**
 * Set movie to watchlist (keeps watched status if already watched)
 */
export function setToWatchlist(movie = {}) {
    return {
        inWatchlist: true,
        inProgress: false, // Only inProgress is mutually exclusive with watchlist
        watched: movie.watched || false, // Preserve watched status
        status: "Watchlist", // Keep for backward compatibility during migration
    };
}

/**
 * Set movie to in progress (removes watchlist, keeps watched status)
 */
export function setToInProgress(movie = {}) {
    return {
        inWatchlist: false, // Only inProgress removes watchlist
        inProgress: true,
        watched: movie.watched || false, // Preserve watched status
        status: "Watching", // Keep for backward compatibility during migration
    };
}

/**
 * Set movie to watched/completed (preserves watchlist status)
 */
export function setToWatched(movie = {}, timesWatched = 1) {
    return {
        inWatchlist: movie.inWatchlist || false, // Preserve watchlist status
        inProgress: false,
        watched: true,
        timesWatched,
        status: "Completed", // Keep for backward compatibility during migration
    };
}

/**
 * Get status icon name
 */
export function getStatusIcon(movie) {
    if (isInProgress(movie)) return "watching";
    if (isInWatchlist(movie)) return "watchlist";
    if (isWatched(movie)) return "completed";
    return "watchlist";
}
