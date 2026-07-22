export function SmoothDecadeBar({ decade, count, max }) {
    const heightPercent = Math.max((count / max) * 100, 4);

    return (
        <div className="flex-1 flex flex-col items-center justify-end h-full gap-3 group">
            <div className="text-xs font-semibold text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-200">
                {count}
            </div>
            <div
                className="w-full max-w-[3rem] bg-zinc-900 rounded-t-xl overflow-hidden relative"
                style={{ height: "100%" }}
            >
                <div
                    className="absolute bottom-0 left-0 right-0 bg-zinc-300 rounded-t-xl transition-all duration-700 hover:bg-white"
                    style={{ height: `${heightPercent}%` }}
                />
            </div>
            <span className="text-xs text-zinc-500 font-semibold mt-1">
                {decade}
            </span>
        </div>
    );
}
