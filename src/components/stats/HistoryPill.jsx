import {
    CheckCircle2,
    PlayCircle,
    Bookmark,
    Plus,
    Star,
    Trash2,
    Edit,
} from "lucide-react";
import { Link } from "react-router-dom";

export function HistoryPill({ data, userId }) {
    const getIcon = () => {
        switch (data.type) {
            case "added":
                return Plus;
            case "completed":
                return CheckCircle2;
            case "started_watching":
                return PlayCircle;
            case "added_to_watchlist":
                return Bookmark;
            case "rating_changed":
                return Star;
            case "removed":
                return Trash2;
            case "updated":
                return Edit;
            case "status_changed":
                if (data.newStatus === "Completed") return CheckCircle2;
                if (data.newStatus === "Watching") return PlayCircle;
                if (data.newStatus === "Watchlist") return Bookmark;
                return Edit;
            default:
                return Edit;
        }
    };

    const Icon = getIcon();

    const getAction = () => {
        switch (data.type) {
            case "added":
                return "Added to library";
            case "completed":
                return "Completed";
            case "started_watching":
                return "Started watching";
            case "added_to_watchlist":
                return "Added to watchlist";
            case "rating_changed":
                return `Rated ${data.rating}/5`;
            case "removed":
                return "Removed from library";
            case "updated":
                return "Updated details";
            case "status_changed":
                return `Changed to ${data.newStatus}`;
            default:
                return "Updated";
        }
    };

    const getTimeAgo = () => {
        if (!data.timestamp) return "";

        const timestamp = data.timestamp?.seconds
            ? data.timestamp.seconds * 1000
            : data.timestamp;

        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        if (days < 30) return `${Math.floor(days / 7)}w ago`;
        return `${Math.floor(days / 30)}mo ago`;
    };

    const detailsPath = userId
        ? `/u/${userId}/${data.mediaType || data.type}/${data.movieId}`
        : `/edit/${data.movieId}`;

    // Don't show link for removed items
    const isRemoved = data.type === "removed";

    const content = (
        <>
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                <Icon className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="flex flex-col justify-center">
                <span className="text-sm font-semibold text-zinc-100 leading-tight mb-0.5">
                    {data.movieTitle}
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-medium">
                        {getAction()}
                    </span>
                    <span className="text-xs text-zinc-600">•</span>
                    <span className="text-xs text-zinc-500">
                        {getTimeAgo()}
                    </span>
                </div>
            </div>
        </>
    );

    if (isRemoved) {
        return (
            <div className="shrink-0 flex items-center gap-4 bg-zinc-900/60 border border-zinc-800/60 rounded-full pr-8 pl-2 py-2 opacity-60">
                {content}
            </div>
        );
    }

    return (
        <Link
            to={detailsPath}
            className="shrink-0 flex items-center gap-4 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 rounded-full pr-8 pl-2 py-2 transition-colors cursor-pointer group"
        >
            {content}
        </Link>
    );
}
