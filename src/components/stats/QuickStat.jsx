export function QuickStat({ value, label, icon, suffix = "" }) {
    return (
        <div className="flex flex-col group">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
                {icon}
                <span className="text-xs uppercase tracking-widest font-semibold">
                    {label}
                </span>
            </div>
            <div className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-100 flex items-baseline gap-1">
                {value}
                {suffix && (
                    <span className="text-lg text-zinc-500">{suffix}</span>
                )}
            </div>
        </div>
    );
}
