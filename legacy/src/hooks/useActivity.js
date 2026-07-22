import { useEffect, useState } from "react";
import {
    ref,
    onValue,
    query,
    orderByChild,
    limitToLast,
} from "firebase/database";
import { db } from "../lib/firebase";
import { useAuth } from "../features/auth/AuthContext";

const ACTIVITY_CACHE_PREFIX = "radar_activity_";
// In-memory cache so re-mounting components skip localStorage parsing
const globalActivityCache = new Map();

function readActivityCache(uid) {
    if (globalActivityCache.has(uid)) return globalActivityCache.get(uid);
    try {
        const raw = localStorage.getItem(ACTIVITY_CACHE_PREFIX + uid);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed) globalActivityCache.set(uid, parsed);
        return parsed;
    } catch {
        return null;
    }
}

function writeActivityCache(uid, activities) {
    globalActivityCache.set(uid, activities);
    try {
        localStorage.setItem(ACTIVITY_CACHE_PREFIX + uid, JSON.stringify(activities));
    } catch {
        // Storage quota exceeded or unavailable — silently ignore
    }
}

export function useActivity(limit = 20) {
    const { user } = useAuth();

    // Initialise synchronously from cache — user is already resolved by AuthProvider.
    const [activities, setActivities] = useState(() => {
        if (!user) return [];
        return readActivityCache(user.uid) || [];
    });
    const [loading, setLoading] = useState(() => {
        if (!user) return false;
        const cached = readActivityCache(user.uid);
        return !cached || cached.length === 0;
    });

    useEffect(() => {
        if (!user) {
            setActivities([]);
            setLoading(false);
            return;
        }

        const activityRef = ref(db, `users/${user.uid}/activity`);
        const activityQuery = query(
            activityRef,
            orderByChild("timestamp"),
            limitToLast(limit),
        );

        const unsubscribe = onValue(activityQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedActivities = Object.entries(data)
                    .map(([key, value]) => ({
                        id: key,
                        ...value,
                    }))
                    .sort((a, b) => b.timestamp - a.timestamp);
                setActivities(loadedActivities);
                writeActivityCache(user.uid, loadedActivities);
            } else {
                setActivities([]);
                writeActivityCache(user.uid, []);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, limit]);

    return { activities, loading };
}

export function usePublicActivity(userId, limit = 20) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setActivities([]);
            setLoading(false);
            return;
        }

        const activityRef = ref(db, `users/${userId}/activity`);
        const activityQuery = query(
            activityRef,
            orderByChild("timestamp"),
            limitToLast(limit),
        );

        const unsubscribe = onValue(activityQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedActivities = Object.entries(data)
                    .map(([key, value]) => ({
                        id: key,
                        ...value,
                    }))
                    .sort((a, b) => b.timestamp - a.timestamp);
                setActivities(loadedActivities);
            } else {
                setActivities([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, limit]);

    return { activities, loading };
}
