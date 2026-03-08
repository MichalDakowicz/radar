import { useState, useEffect } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "../lib/firebase";
import { useAuth } from "../features/auth/AuthContext";

const DEFAULT_DAYS = 30;
const DEFAULT_SHOW = true;

export function useRecentlyAddedSettings() {
    const { user } = useAuth();
    const [recentlyAddedDays, setRecentlyAddedDaysState] = useState(
        DEFAULT_DAYS,
    );
    const [showRecentlyAddedSection, setShowRecentlyAddedSectionState] =
        useState(DEFAULT_SHOW);

    useEffect(() => {
        if (!user) {
            setRecentlyAddedDaysState(DEFAULT_DAYS);
            setShowRecentlyAddedSectionState(DEFAULT_SHOW);
            return;
        }
        const daysRef = ref(
            db,
            `users/${user.uid}/settings/recentlyAddedDays`,
        );
        const showRef = ref(
            db,
            `users/${user.uid}/settings/showRecentlyAddedSection`,
        );
        const unsubDays = onValue(daysRef, (snapshot) => {
            const val = snapshot.val();
            if (typeof val === "number" && val >= 1 && val <= 365) {
                setRecentlyAddedDaysState(val);
            }
        });
        const unsubShow = onValue(showRef, (snapshot) => {
            const val = snapshot.val();
            if (typeof val === "boolean") {
                setShowRecentlyAddedSectionState(val);
            }
        });
        return () => {
            unsubDays();
            unsubShow();
        };
    }, [user]);

    const setRecentlyAddedDays = async (days) => {
        const n = Math.max(1, Math.min(365, Number(days)));
        setRecentlyAddedDaysState(n);
        if (user) {
            try {
                await set(
                    ref(db, `users/${user.uid}/settings/recentlyAddedDays`),
                    n,
                );
            } catch (e) {
                console.error(e);
            }
        }
    };

    const setShowRecentlyAddedSection = async (show) => {
        setShowRecentlyAddedSectionState(show);
        if (user) {
            try {
                await set(
                    ref(db, `users/${user.uid}/settings/showRecentlyAddedSection`),
                    show,
                );
            } catch (e) {
                console.error(e);
            }
        }
    };

    return {
        recentlyAddedDays,
        setRecentlyAddedDays,
        showRecentlyAddedSection,
        setShowRecentlyAddedSection,
    };
}
