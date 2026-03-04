import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Hook to preserve and restore page state when navigating
 * Saves state to sessionStorage and restores it on back navigation
 */
export function usePageState(pageKey, state) {
    const location = useLocation();
    const navigate = useNavigate();
    const isRestoringRef = useRef(false);
    const stateKey = `pageState_${pageKey}`;

    // Restore state from location.state or sessionStorage on mount
    useEffect(() => {
        if (isRestoringRef.current) return;

        // Check if we have state from navigation (back button)
        const navigationState = location.state?.[stateKey];

        if (navigationState) {
            isRestoringRef.current = true;
            return navigationState;
        }

        // Otherwise check sessionStorage
        try {
            const savedState = sessionStorage.getItem(stateKey);
            if (savedState) {
                isRestoringRef.current = true;
                return JSON.parse(savedState);
            }
        } catch (error) {
            console.warn("Error restoring page state:", error);
        }

        return null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save state to sessionStorage whenever it changes
    useEffect(() => {
        if (isRestoringRef.current) {
            isRestoringRef.current = false;
            return;
        }

        try {
            sessionStorage.setItem(stateKey, JSON.stringify(state));
        } catch (error) {
            console.warn("Error saving page state:", error);
        }
    }, [stateKey, state]);

    // Enhanced navigate function that preserves current page state
    const navigateWithState = (to, options = {}) => {
        const currentState = {
            [stateKey]: state,
            ...location.state,
        };

        navigate(to, {
            ...options,
            state: currentState,
        });
    };

    return {
        navigateWithState,
        savedState: location.state?.[stateKey],
    };
}

/**
 * Hook to get saved state from sessionStorage
 */
export function useRestoredState(pageKey, defaultState) {
    const location = useLocation();
    const stateKey = `pageState_${pageKey}`;

    // Try to get state from location first (from back navigation)
    const navigationState = location.state?.[stateKey];
    if (navigationState) {
        return navigationState;
    }

    // Otherwise try sessionStorage
    try {
        const savedState = sessionStorage.getItem(stateKey);
        if (savedState) {
            return JSON.parse(savedState);
        }
    } catch (error) {
        console.warn("Error restoring state:", error);
    }

    return defaultState;
}

/**
 * Hook to save scroll position continuously
 */
export function useSaveScrollPosition(pageKey) {
    const stateKey = `pageState_${pageKey}`;

    const savePosition = (source) => {
        try {
            const currentState = sessionStorage.getItem(stateKey);
            const state = currentState ? JSON.parse(currentState) : {};
            state.scrollPosition = window.scrollY;
            sessionStorage.setItem(stateKey, JSON.stringify(state));
            console.log(`%c[ScrollSave:${source}] scrollY: ${window.scrollY}px`, "color: #f59e0b;");
        } catch (error) {
            console.warn("Error saving scroll position:", error);
        }
    };

    // useLayoutEffect cleanup fires synchronously during React's commit phase —
    // BEFORE the browser auto-scrolls to any focused element in the incoming page
    // and before passive effects of the new page run. This guarantees we capture
    // the true scroll position the user was at, not a post-mount-scroll value.
    useLayoutEffect(() => {
        return () => {
            savePosition("unmount");
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stateKey]);

    // Separate effect for the live scroll listener (doesn't need to be layout)
    useEffect(() => {
        let timeoutId;
        const throttledScroll = () => {
            if (timeoutId) return;
            timeoutId = setTimeout(() => {
                savePosition("event");
                timeoutId = null;
            }, 200);
        };

        window.addEventListener("scroll", throttledScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", throttledScroll);
            if (timeoutId) clearTimeout(timeoutId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stateKey]);
}
