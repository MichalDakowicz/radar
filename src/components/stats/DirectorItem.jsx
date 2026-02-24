export function DirectorItem({ name, count, max }) {
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2);
    const percent = (count / max) * 100;

    return (
        <div className="flex items-center gap-5 py-3 group cursor-default">
            <div className="w-12 h-12 shrink-0 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-900 group-hover:border-zinc-200 transition-all duration-300">
                {initials}
            </div>

            <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-zinc-200 font-semibold text-base group-hover:text-white transition-colors">
                        {name}
                    </span>
                    <span className="text-sm font-medium text-zinc-500">
                        {count}{" "}
                        <span className="text-zinc-600 text-xs uppercase tracking-wider ml-1">
                            titles
                        </span>
                    </span>
                </div>
                <div className="h-1 w-full bg-zinc-900/50 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-zinc-700 group-hover:bg-zinc-400 transition-all duration-500 rounded-full"
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
