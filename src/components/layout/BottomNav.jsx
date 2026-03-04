import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, BarChart3, Clock, Users, Settings, Search } from "lucide-react";

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

export function BottomNav() {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const handleNavClick = (e, path) => {
        if (location.pathname === path) {
            e.preventDefault();
            resetPage(path);
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-950/90 backdrop-blur-lg min-[780px]:hidden pb-safe">
            <div className="flex items-center justify-around p-2">
                <Link
                    to="/"
                    onClick={(e) => handleNavClick(e, "/")}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                        isActive("/") ? "text-blue-500" : "text-neutral-400 hover:text-blue-500"
                    }`}
                >
                    <LayoutGrid size={24} />
                    <span className="text-[10px] font-medium">Library</span>
                </Link>

                <Link
                    to="/browse"
                    onClick={(e) => handleNavClick(e, "/browse")}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                        isActive("/browse") ? "text-blue-500" : "text-neutral-400 hover:text-blue-500"
                    }`}
                >
                    <Search size={24} />
                    <span className="text-[10px] font-medium">Browse</span>
                </Link>

                <Link
                    to="/stats"
                    onClick={(e) => handleNavClick(e, "/stats")}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                        isActive("/stats") ? "text-blue-500" : "text-neutral-400 hover:text-blue-500"
                    }`}
                >
                    <BarChart3 size={24} />
                    <span className="text-[10px] font-medium">Stats</span>
                </Link>

                <Link
                    to="/friends"
                    onClick={(e) => handleNavClick(e, "/friends")}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                        isActive("/friends") ? "text-blue-500" : "text-neutral-400 hover:text-blue-500"
                    }`}
                >
                    <Users size={24} />
                    <span className="text-[10px] font-medium">Friends</span>
                </Link>
                
                 <Link
                    to="/settings"
                    onClick={(e) => handleNavClick(e, "/settings")}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                        isActive("/settings") ? "text-blue-500" : "text-neutral-400 hover:text-blue-500"
                    }`}
                >
                    <Settings size={24} />
                    <span className="text-[10px] font-medium">Settings</span>
                </Link>
            </div>
        </nav>
    );
}
