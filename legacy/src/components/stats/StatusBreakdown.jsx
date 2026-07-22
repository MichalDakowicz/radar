import { ThinProgressBar } from "./ThinProgressBar";

export function StatusBreakdown() {
    return (
        <section>
            <h3 className="text-2xl font-bold tracking-tight mb-8">
                Status Breakdown
            </h3>
            <div className="space-y-6">
                <ThinProgressBar label="Completed" value={218} max={342} />
                <ThinProgressBar label="Watching" value={45} max={342} />
                <ThinProgressBar label="Watchlist" value={79} max={342} />
            </div>
        </section>
    );
}
