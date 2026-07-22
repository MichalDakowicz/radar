import { useState, useEffect } from "react";
import { searchDirectors } from "../services/tmdb";

// Cache for director searches to avoid repeated API calls
const directorCache = new Map();

export function useDirectorSearch(directorName) {
    const [directorId, setDirectorId] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!directorName) {
            setDirectorId(null);
            return;
        }

        // Check cache first
        if (directorCache.has(directorName)) {
            setDirectorId(directorCache.get(directorName));
            return;
        }

        async function fetchDirectorId() {
            setLoading(true);
            try {
                const results = await searchDirectors(directorName);
                if (results.length > 0) {
                    const id = results[0].id;
                    directorCache.set(directorName, id);
                    setDirectorId(id);
                } else {
                    setDirectorId(null);
                }
            } catch (error) {
                console.error("Failed to search for director:", error);
                setDirectorId(null);
            } finally {
                setLoading(false);
            }
        }

        fetchDirectorId();
    }, [directorName]);

    return { directorId, loading };
}

// Batch search for multiple directors
export async function batchSearchDirectors(directorNames) {
    const results = {};

    for (const name of directorNames) {
        if (directorCache.has(name)) {
            results[name] = directorCache.get(name);
        } else {
            try {
                const searchResults = await searchDirectors(name);
                if (searchResults.length > 0) {
                    const id = searchResults[0].id;
                    directorCache.set(name, id);
                    results[name] = id;
                }
            } catch (error) {
                console.error(`Failed to search for director ${name}:`, error);
            }
        }
    }

    return results;
}
