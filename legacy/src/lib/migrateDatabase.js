/**
 * Database Migration Utility
 *
 * This script migrates old status strings to new boolean flag system
 */

import { ref, get, update } from "firebase/database";
import { db } from "./firebase";
import { migrateStatus } from "./movieStatus";

/**
 * Migrate all movies for a user from old status system to new boolean flags
 * @param {string} userId - The user ID
 * @param {boolean} force - Force re-migration even if already migrated
 */
export async function migrateUserMovies(userId, force = true) {
    try {
        const moviesRef = ref(db, `users/${userId}/movies`);
        const snapshot = await get(moviesRef);

        if (!snapshot.exists()) {
            return {
                success: true,
                migrated: 0,
                message: "No movies to migrate",
            };
        }

        const movies = snapshot.val();
        const updates = {};
        let migratedCount = 0;

        Object.entries(movies).forEach(([movieId, movieData]) => {
            // Always re-migrate if force is true (default)
            // This fixes any previous incorrect migrations

            // Migrate this movie using the ORIGINAL status field
            const statusFlags = migrateStatus(movieData, true); // Force migration from status field

            // Add updatedAt timestamp
            const updatedAt = Date.now();

            // Prepare updates
            updates[`users/${userId}/movies/${movieId}/inWatchlist`] =
                statusFlags.inWatchlist;
            updates[`users/${userId}/movies/${movieId}/inProgress`] =
                statusFlags.inProgress;
            updates[`users/${userId}/movies/${movieId}/watched`] =
                statusFlags.watched;
            updates[`users/${userId}/movies/${movieId}/updatedAt`] = updatedAt;

            // Update status string for backward compatibility
            // Priority: inProgress > inWatchlist > watched
            const newStatus = statusFlags.inProgress
                ? "Watching"
                : statusFlags.inWatchlist
                ? "Watchlist"
                : statusFlags.watched
                ? "Completed"
                : "Watchlist";
            updates[`users/${userId}/movies/${movieId}/status`] = newStatus;

            migratedCount++;
        });

        if (migratedCount === 0) {
            return {
                success: true,
                migrated: 0,
                message: "No movies found",
            };
        }

        // Apply all updates at once
        await update(ref(db), updates);

        return {
            success: true,
            migrated: migratedCount,
            message: `Successfully migrated ${migratedCount} movie${
                migratedCount !== 1 ? "s" : ""
            }`,
        };
    } catch (error) {
        console.error("Migration error:", error);
        return {
            success: false,
            migrated: 0,
            message: `Migration failed: ${error.message}`,
        };
    }
}
