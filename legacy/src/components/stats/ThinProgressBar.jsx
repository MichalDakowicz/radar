export function ThinProgressBar({ label, value, max }) {
    const percent = Math.round((value / max) * 100);

    return (
        <div className="group">
            <div className="flex justify-between items-end mb-3">
                <span className="text-zinc-200 font-semibold">{label}</span>
                <span className="text-sm text-zinc-500 font-medium">
                    {value} items{" "}
                    <span className="text-zinc-600 ml-1">({percent}%)</span>
                </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div
                    className="h-full bg-zinc-200 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
