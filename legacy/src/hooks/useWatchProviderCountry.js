import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../lib/firebase";
import { useAuth } from "../features/auth/AuthContext";

const DEFAULT_COUNTRY = "US";

export function useWatchProviderCountry() {
    const { user } = useAuth();
    const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY);

    useEffect(() => {
        if (!user) {
            setCountryCode(DEFAULT_COUNTRY);
            return;
        }
        const settingsRef = ref(
            db,
            `users/${user.uid}/settings/watchProviderCountry`,
        );
        const unsubscribe = onValue(settingsRef, (snapshot) => {
            const value = snapshot.val();
            setCountryCode(
                value && typeof value === "string" ? value : DEFAULT_COUNTRY,
            );
        });
        return () => unsubscribe();
    }, [user]);

    return countryCode;
}
