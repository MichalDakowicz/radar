import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
import { useMovies } from "../../hooks/useMovies";
import AddMovieModal from "../../features/movies/AddMovieModal";
import { BottomNav } from "./BottomNav";

export function Navbar({ onPickRandom }) {
    const { user } = useAuth();
    const location = useLocation();
    const { toast } = useToast();
    const { addMovie } = useMovies();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

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
            <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4">
                <div className="mx-auto max-w-screen-2xl flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group">
                        <Logo className="h-8 w-8 text-blue-500 group-hover:scale-110 transition-transform" />
                        <h1 className="text-2xl font-bold tracking-tight text-white">
                            Radar
                        </h1>
                    </Link>

                    {user && (
                        <div className="flex items-center gap-2 sm:gap-4">
                            {onPickRandom && (
                                <button
                                    onClick={onPickRandom}
                                    className="flex items-center gap-2 rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-800 hover:text-blue-400 transition-colors cursor-pointer mr-2"
                                >
                                    <Shuffle size={16} />
                                    <span className="hidden min-[780px]:inline">
                                        Pick Random
                                    </span>
                                </button>
                            )}

                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-bold text-black hover:bg-neutral-200 transition-colors cursor-pointer mr-2"
                            >
                                <Plus size={16} />
                                <span className="hidden min-[780px]:inline">
                                    Add Movie
                                </span>
                            </button>

                            <Link
                                to="/"
                                className={`hidden min-[780px]:block p-2 rounded-md transition-colors ${
                                    isActive("/")
                                        ? "text-white bg-neutral-800"
                                        : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                }`}
                                title="Library"
                            >
                                <LayoutGrid size={20} />
                            </Link>
                            <Link
                                to="/browse"
                                className={`hidden min-[780px]:block p-2 rounded-md transition-colors ${
                                    isActive("/browse")
                                        ? "text-white bg-neutral-800"
                                        : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                }`}
                                title="Browse"
                            >
                                <Search size={20} />
                            </Link>
                            <Link
                                to="/stats"
                                className={`hidden min-[780px]:block p-2 rounded-md transition-colors ${
                                    isActive("/stats")
                                        ? "text-white bg-neutral-800"
                                        : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                }`}
                                title="Statistics"
                            >
                                <BarChart3 size={20} />
                            </Link>
                            <Link
                                to="/friends"
                                className={`hidden min-[780px]:block p-2 rounded-md transition-colors ${
                                    isActive("/friends")
                                        ? "text-white bg-neutral-800"
                                        : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                }`}
                                title="Friends"
                            >
                                <Users size={20} />
                            </Link>

                            <button
                                onClick={handleShareShelf}
                                className="rounded p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
                                title="Share Public Link"
                            >
                                <Share2 size={20} />
                            </button>

                            <div className="h-6 w-px bg-neutral-800 mx-2 hidden min-[780px]:block" />

                            <Link
                                to="/settings"
                                className={`hidden min-[780px]:block p-2 rounded-md transition-colors ${
                                    isActive("/settings")
                                        ? "text-white bg-neutral-800"
                                        : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                }`}
                                title="Settings"
                            >
                                <Settings size={20} />
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            <AddMovieModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={addMovie}
            />

            <BottomNav />
        </>
    );
}
