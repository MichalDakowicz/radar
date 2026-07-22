import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "../lib/firebase";
import { useAuth } from "../features/auth/AuthContext";

const THEME_STORAGE_KEY = "radar_theme";
const DEFAULT_THEME = "dark";

const ThemeContext = createContext({
    theme: DEFAULT_THEME,
    setTheme: () => {},
    resolvedTheme: "dark",
});

function getSystemTheme() {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function resolveTheme(theme) {
    if (theme === "system") return getSystemTheme();
    return theme === "light" ? "light" : "dark";
}

function applyTheme(resolved) {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", resolved);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute(
            "content",
            resolved === "dark" ? "#0a0a0a" : "#fafafa",
        );
    }
}

export function ThemeProvider({ children }) {
    const { user } = useAuth();
    const [theme, setThemeState] = useState(() => {
        try {
            return (
                localStorage.getItem(THEME_STORAGE_KEY) ||
                DEFAULT_THEME
            );
        } catch {
            return DEFAULT_THEME;
        }
    });
    const resolvedTheme = resolveTheme(theme);

    useEffect(() => {
        applyTheme(resolvedTheme);
    }, [resolvedTheme]);

    useEffect(() => {
        if (theme !== "system") return;
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handle = () => applyTheme(getSystemTheme());
        mq.addEventListener("change", handle);
        return () => mq.removeEventListener("change", handle);
    }, [theme]);

    useEffect(() => {
        if (!user) return;
        const themeRef = ref(db, `users/${user.uid}/settings/theme`);
        const unsubscribe = onValue(themeRef, (snapshot) => {
            const value = snapshot.val();
            if (value && ["dark", "light", "system"].includes(value)) {
                setThemeState(value);
                try {
                    localStorage.setItem(THEME_STORAGE_KEY, value);
                } catch {}
            }
        });
        return () => unsubscribe();
    }, [user]);

    const setTheme = useCallback(
        async (newTheme) => {
            if (!["dark", "light", "system"].includes(newTheme)) return;
            setThemeState(newTheme);
            try {
                localStorage.setItem(THEME_STORAGE_KEY, newTheme);
            } catch {}
            applyTheme(resolveTheme(newTheme));
            if (user) {
                try {
                    await set(
                        ref(db, `users/${user.uid}/settings/theme`),
                        newTheme,
                    );
                } catch (e) {
                    console.error("Failed to save theme to Firebase", e);
                }
            }
        },
        [user],
    );

    return (
        <ThemeContext.Provider
            value={{
                theme,
                setTheme,
                resolvedTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        return {
            theme: DEFAULT_THEME,
            setTheme: () => {},
            resolvedTheme: "dark",
        };
    }
    return ctx;
}
