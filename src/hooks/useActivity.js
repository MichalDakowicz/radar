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

export function useActivity(limit = 20) {
    const { user } = useAuth();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

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
            } else {
                setActivities([]);
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
