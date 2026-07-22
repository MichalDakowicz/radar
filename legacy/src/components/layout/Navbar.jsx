import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../ui/Logo";
import {
    BarChart3,
    Clock,
    LayoutGrid,
    Plus,
    Share2,
    Shuffle,
    Settings,
    Users,
    Search,
} from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { useToast } from "../ui/Toast";
import { useRefreshMetadata } from "../../contexts/RefreshMetadataContext";
import { BottomNav } from "./BottomNav";

const HOME_LOCALSTORAGE_KEYS = [
    "mt_filterAvailability",
    "mt_filterDirector",
    "mt_filterYear",
    "mt_filterGenre",
    "mt_filterStatus_v2",
    "mt_sortBy",
    "mt_groupBy",
];

function resetPage(path) {
    if (path === "/") {
        sessionStorage.removeItem("pageState_home");
        HOME_LOCALSTORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
        window.dispatchEvent(new CustomEvent("resetPage", { detail: { page: "home" } }));
    } else if (path === "/browse") {
        sessionStorage.removeItem("pageState_browse");
        window.dispatchEvent(new CustomEvent("resetPage", { detail: { page: "browse" } }));
    } else {
        window.scrollTo(0, 0);
    }
}

export function Navbar({ onPickRandom }) {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { isRefreshing: metadataRefreshing, progress: metadataProgress } =
        useRefreshMetadata();

    const isActive = (path) => location.pathname === path;

    const handleNavClick = (e, path) => {
        if (location.pathname === path) {
            e.preventDefault();
            resetPage(path);
        }
    };

    const handleShareShelf = () => {
        if (!user) return;
        const url = `https://radar-watchlist.web.app/u/${user.uid}`; // Assuming Radar usage, or generic
        navigator.clipboard.writeText(url);
        toast({
            title: "Link Copied!",
            description: "Public shelf link copied to your clipboard.",
            variant: "default",
        });
    };

    return (
        <>
            <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4">
                <div className="mx-auto max-w-screen-2xl flex items-center justify-between">
                    <Link to="/" onClick={(e) => handleNavClick(e, "/")} className="flex items-center gap-3 group">
                        <Logo className="h-8 w-8 text-blue-500 group-hover:scale-110 transition-transform" />
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Radar
                        </h1>
                        {metadataRefreshing && metadataProgress.total > 0 && (
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded hidden sm:inline">
                                Refreshing {metadataProgress.current}/{metadataProgress.total}
                            </span>
                        )}
                    </Link>

                    {user && (
                        <div className="flex items-center gap-2 sm:gap-4">
                            {onPickRandom && (
                                <button
                                    onClick={onPickRandom}
                                    className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted hover:text-primary transition-colors transition-colors cursor-pointer mr-2"
                                >
                                    <Shuffle size={16} />
                                    <span className="hidden min-[780px]:inline">
                                        Pick Random
                                    </span>
                                </button>
                            )}

                            <button
                                onClick={() => navigate("/add")}
                                className="flex items-center gap-2 rounded-full bg-blue-500 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-bold text-primary-foreground hover:opacity-90 transition-colors cursor-pointer mr-2"
                            >
                                <Plus size={16} />
                                <span className="hidden min-[780px]:inline">
                                    Add Movie
                                </span>
                            </button>

                            <Link
                                to="/"
                                onClick={(e) => handleNavClick(e, "/")}
                                className={`hidden min-[780px]:block p-2 rounded-md transition-colors ${
                                    isActive("/")
                                        ? "text-foreground bg-muted"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                }`}
                                title="Library"
                            >
                                <LayoutGrid size={20} />
                            </Link>
                            <Link
                                to="/browse"
                                onClick={(e) => handleNavClick(e, "/browse")}
                                className={`hidden min-[780px]:block p-2 rounded-md transition-colors ${
                                    isActive("/browse")
                                        ? "text-foreground bg-muted"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                }`}
                                title="Browse"
                            >
                                <Search size={20} />
                            </Link>
                            <Link
                                to="/stats"
                                onClick={(e) => handleNavClick(e, "/stats")}
                                className={`hidden min-[780px]:block p-2 rounded-md transition-colors ${
                                    isActive("/stats")
                                        ? "text-foreground bg-muted"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                }`}
                                title="Statistics"
                            >
                                <BarChart3 size={20} />
                            </Link>
                            <Link
                                to="/friends"
                                onClick={(e) => handleNavClick(e, "/friends")}
                                className={`hidden min-[780px]:block p-2 rounded-md transition-colors ${
                                    isActive("/friends")
                                        ? "text-foreground bg-muted"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                }`}
                                title="Friends"
                            >
                                <Users size={20} />
                            </Link>

                            <button
                                onClick={handleShareShelf}
                                className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                                title="Share Public Link"
                            >
                                <Share2 size={20} />
                            </button>

                            <div className="h-6 w-px bg-border mx-2 hidden min-[780px]:block" />

                            <Link
                                to="/settings"
                                onClick={(e) => handleNavClick(e, "/settings")}
                                className={`hidden min-[780px]:block p-2 rounded-md transition-colors ${
                                    isActive("/settings")
                                        ? "text-foreground bg-muted"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                }`}
                                title="Settings"
                            >
                                <Settings size={20} />
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            <BottomNav />
        </>
    );
}
