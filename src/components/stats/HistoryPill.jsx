import { CheckCircle2, PlayCircle, Bookmark } from "lucide-react";
import { Link } from "react-router-dom";

export function HistoryPill({ data, userId }) {
    const getIcon = () => {
        if (data.status === "Completed") return CheckCircle2;
        if (data.status === "Watching") return PlayCircle;
        if (data.status === "Watchlist") return Bookmark;
        return PlayCircle;
    };

    const Icon = getIcon();

    const getAction = () => {
        if (data.status === "Completed") return "Finished watching";
        if (data.status === "Watching") return "Currently watching";
        if (data.status === "Watchlist") return "Added to watchlist";
        if (data.status === "Dropped") return "Dropped";
        if (data.status === "On Hold") return "Put on hold";
        return "Updated";
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
        ? `/u/${userId}/${data.type}/${data.id}`
        : `/edit/${data.id}`;

    return (
        <Link
            to={detailsPath}
            className="shrink-0 flex items-center gap-4 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 rounded-full pr-8 pl-2 py-2 transition-colors cursor-pointer group"
        >
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                <Icon className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="flex flex-col justify-center">
                <span className="text-sm font-semibold text-zinc-100 leading-tight mb-0.5">
                    {data.title}
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
        </Link>
    );
}
