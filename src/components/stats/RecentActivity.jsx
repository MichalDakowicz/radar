import { History } from "lucide-react";
import { HistoryPill } from "./HistoryPill";

export function RecentActivity({ activityHistory }) {
    return (
        <section className="mb-16">
            <div className="flex items-center gap-2 mb-5">
                <History className="w-5 h-5 text-zinc-500" />
                <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
                    Recent Activity
                </h2>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {activityHistory.map((item) => (
                    <HistoryPill key={item.id} data={item} />
                ))}
            </div>
        </section>
    );
}
