import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { useMovies } from "../../hooks/useMovies";

export function StreakCalendar({ weeklyCompletions, threshold, userId }) {
    const navigate = useNavigate();
    const { movies } = useMovies();

    const generateCalendar = () => {
        const today = new Date();
        const containerWidth =
            typeof window !== "undefined" ? window.innerWidth : 1920;
        // Account for padding, gaps, and day labels column
        const dayLabelsWidth = 80; // Approximate width of day labels
        const padding = 32; // Container padding
        const availableWidth = containerWidth - dayLabelsWidth - padding;
        const weekWidth = 56; // 48px week + 8px gap
        const weeksToShow = Math.max(
            12,
            Math.floor(availableWidth / weekWidth),
        );

        const weeks = [];
        const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

        // Show all calculated weeks
        for (let weekIndex = weeksToShow; weekIndex >= 0; weekIndex--) {
            const weekData = {
                days: [],
                label: "",
            };

            const targetDate = new Date(today);
            targetDate.setDate(targetDate.getDate() - weekIndex * 7);

            const weekStart = new Date(targetDate);
            const dayOfWeek = weekStart.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            weekStart.setDate(weekStart.getDate() - daysToMonday);
            weekStart.setHours(0, 0, 0, 0);

            if (weekStart.getDate() <= 7) {
                weekData.label = weekStart.toLocaleDateString("en-US", {
                    month: "short",
                });
            }

            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const date = new Date(weekStart);
                date.setDate(date.getDate() + dayIndex);

                const dateStr = `${date.getFullYear()}-${String(
                    date.getMonth() + 1,
                ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

                const completedOnDay = movies.filter((m) => {
                    if (!m.completedAt && !m.completionDates) return false;

                    // Support both old single date and new multiple dates
                    if (m.completionDates && Array.isArray(m.completionDates)) {
                        return m.completionDates.some((timestamp) => {
                            const completedDate = new Date(timestamp);
                            const completedStr = `${completedDate.getFullYear()}-${String(
                                completedDate.getMonth() + 1,
                            ).padStart(2, "0")}-${String(
                                completedDate.getDate(),
                            ).padStart(2, "0")}`;
                            return completedStr === dateStr;
                        });
                    }

                    // Fallback to old single date format
                    if (m.completedAt) {
                        const completedDate = new Date(
                            m.completedAt?.seconds
                                ? m.completedAt.seconds * 1000
                                : m.completedAt,
                        );
                        const completedStr = `${completedDate.getFullYear()}-${String(
                            completedDate.getMonth() + 1,
                        ).padStart(2, "0")}-${String(
                            completedDate.getDate(),
                        ).padStart(2, "0")}`;
                        return completedStr === dateStr;
                    }

                    return false;
                }).length;

                const todayStr = `${today.getFullYear()}-${String(
                    today.getMonth() + 1,
                ).padStart(2, "0")}-${String(today.getDate()).padStart(
                    2,
                    "0",
                )}`;
                const isToday = dateStr === todayStr;
                const isFuture = date > today;

                weekData.days.push({
                    date,
                    day: date.getDate(),
                    dateStr,
                    count: completedOnDay,
                    isToday,
                    isFuture,
                    dayOfWeek: weekDays[dayIndex],
                });
            }

            weeks.push(weekData);
        }

        return weeks;
    };

    const weeks = generateCalendar();
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const handleDayClick = (day) => {
        if (!userId || day.isFuture) return;
        const dateStr = `${day.date.getFullYear()}-${String(
            day.date.getMonth() + 1,
        ).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;
        navigate(`/manage-completions?date=${dateStr}`);
    };

    return (
        <div className="p-2 w-full overflow-x-auto">
            <div className="flex gap-3 w-full justify-end">
                <div className="flex flex-col gap-2 flex-1">
                    <div className="h-5" />
                    {weekDays.map((day) => (
                        <div
                            key={day}
                            className="h-12 flex items-center justify-end pr-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    {weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-2">
                            <div className="h-5 text-[11px] font-semibold text-zinc-400 text-center flex items-center justify-center">
                                {week.label}
                            </div>

                            {week.days.map((day, dayIdx) => (
                                <button
                                    key={dayIdx}
                                    onClick={() => handleDayClick(day)}
                                    disabled={!userId || day.isFuture}
                                    className={`w-12 h-12 rounded-md transition-all relative flex flex-col items-center justify-center ${
                                        day.isFuture
                                            ? "bg-zinc-900/30 cursor-default opacity-30 border border-zinc-800/30"
                                            : day.count > 0
                                            ? "bg-blue-500/30 hover:bg-blue-500/40 border border-blue-500/50"
                                            : "bg-zinc-800/30 hover:bg-zinc-800/50 border border-zinc-800/50"
                                    } ${
                                        day.isToday
                                            ? "ring-2 ring-blue-500/60"
                                            : ""
                                    } ${
                                        userId && !day.isFuture
                                            ? "cursor-pointer"
                                            : "cursor-default"
                                    }`}
                                    title={
                                        !day.isFuture
                                            ? `${day.dateStr}: ${day.count} ${
                                                  day.count === 1
                                                      ? "movie"
                                                      : "movies"
                                              }${
                                                  userId
                                                      ? " (Click to add)"
                                                      : ""
                                              }`
                                            : ""
                                    }
                                >
                                    <span
                                        className={`text-xs font-medium ${
                                            day.count > 0
                                                ? "text-white"
                                                : "text-zinc-500"
                                        }`}
                                    >
                                        {day.day}
                                    </span>

                                    {day.count > 0 && (
                                        <div className="flex gap-0.5 mt-1">
                                            {Array.from({
                                                length: Math.min(day.count, 3),
                                            }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="w-1.5 h-1.5 rounded-full bg-blue-400"
                                                />
                                            ))}
                                            {day.count > 3 && (
                                                <span className="text-[9px] text-blue-400 font-bold ml-0.5">
                                                    +{day.count - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
