import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, BarChart3, Clock, Users, Settings } from "lucide-react";

export function BottomNav() {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-950/90 backdrop-blur-lg min-[780px]:hidden pb-safe">
            <div className="flex items-center justify-around p-2">
                <Link
                    to="/"
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                        isActive("/") ? "text-blue-500" : "text-neutral-400 hover:text-blue-500"
                    }`}
                >
                    <LayoutGrid size={24} />
                    <span className="text-[10px] font-medium">Library</span>
                </Link>

                <Link
                    to="/stats"
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                        isActive("/stats") ? "text-blue-500" : "text-neutral-400 hover:text-blue-500"
                    }`}
                >
                    <BarChart3 size={24} />
                    <span className="text-[10px] font-medium">Stats</span>
                </Link>

                <Link
                    to="/friends"
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                        isActive("/friends") ? "text-blue-500" : "text-neutral-400 hover:text-blue-500"
                    }`}
                >
                    <Users size={24} />
                    <span className="text-[10px] font-medium">Friends</span>
                </Link>
                
                 <Link
                    to="/settings"
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
