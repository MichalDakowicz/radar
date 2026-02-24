export function ContentMix() {
    return (
        <section>
            <h3 className="text-2xl font-bold tracking-tight mb-8">
                Content Mix
            </h3>
            <div className="flex flex-col">
                {/* Large Typography Legend */}
                <div className="flex gap-8 md:gap-12 mb-6">
                    <div className="flex flex-col group cursor-default">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-200 group-hover:scale-125 transition-transform" />
                            <span className="text-sm font-semibold text-zinc-400">
                                Movies
                            </span>
                        </div>
                        <span className="text-4xl font-light text-zinc-100 tracking-tight">
                            234
                        </span>
                    </div>
                    <div className="flex flex-col group cursor-default">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-600 group-hover:scale-125 transition-transform" />
                            <span className="text-sm font-semibold text-zinc-400">
                                TV Shows
                            </span>
                        </div>
                        <span className="text-4xl font-light text-zinc-300 tracking-tight">
                            95
                        </span>
                    </div>
                    <div className="flex flex-col group cursor-default">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-800 group-hover:scale-125 transition-transform" />
                            <span className="text-sm font-semibold text-zinc-400">
                                Shorts / Docs
                            </span>
                        </div>
                        <span className="text-4xl font-light text-zinc-500 tracking-tight">
                            13
                        </span>
                    </div>
                </div>

                {/* Continuous Segmented Bar */}
                <div className="h-2 w-full flex rounded-full overflow-hidden gap-1">
                    <div
                        className="bg-zinc-200 w-[68%] hover:opacity-80 transition-opacity"
                        title="Movies: 68%"
                    />
                    <div
                        className="bg-zinc-600 w-[28%] hover:opacity-80 transition-opacity"
                        title="TV Shows: 28%"
                    />
                    <div
                        className="bg-zinc-800 w-[4%] hover:opacity-80 transition-opacity"
                        title="Shorts/Docs: 4%"
                    />
                </div>
            </div>
        </section>
    );
}
