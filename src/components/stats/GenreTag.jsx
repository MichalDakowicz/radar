export function GenreTag({ name, count, rank }) {
    const styles = {
        top: "border-zinc-400 bg-zinc-800/30 text-zinc-100",
        high: "border-zinc-700 bg-transparent text-zinc-300",
        mid: "border-zinc-800 bg-transparent text-zinc-400",
        low: "border-zinc-900 bg-transparent text-zinc-600",
    };

    return (
        <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full border ${styles[rank]} hover:border-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/50 transition-all cursor-default`}
        >
            <span className="font-medium text-sm">{name}</span>
            <div className="w-1 h-1 rounded-full bg-current opacity-30" />
            <span className="text-xs font-semibold opacity-70">{count}</span>
        </div>
    );
}
