import {
    Film,
    Clock,
    CheckCircle2,
    Trophy,
    Star,
    BarChart3,
} from "lucide-react";
import { QuickStat } from "./QuickStat";

export function OverviewStats() {
    return (
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-y-10 gap-x-6 mb-16 border-y border-zinc-800/50 py-10">
            <QuickStat
                value="342"
                label="Total Items"
                icon={<Film className="w-4 h-4" />}
            />
            <QuickStat
                value="1,247h"
                label="Time Watched"
                icon={<Clock className="w-4 h-4" />}
            />
            <QuickStat
                value="218"
                label="Completed"
                icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <QuickStat
                value="Action"
                label="Top Genre"
                icon={<Trophy className="w-4 h-4" />}
            />
            <QuickStat
                value="4.2"
                label="Avg Rating"
                icon={<Star className="w-4 h-4" />}
                suffix="★"
            />
            <QuickStat
                value="87%"
                label="Completion"
                icon={<BarChart3 className="w-4 h-4" />}
            />
            <QuickStat
                value="12"
                label="Day Streak"
                icon={<Trophy className="w-4 h-4" />}
                suffix="🔥"
            />
        </section>
    );
}
