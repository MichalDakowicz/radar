import { useMemo, useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
    Star,
    History,
    Film,
    Clock,
    Trophy,
    BarChart3,
    CheckCircle2,
    Flame,
} from "lucide-react";
import { useMovies } from "../hooks/useMovies";
import { usePublicMovies } from "../hooks/usePublicMovies";
import { useUserProfile } from "../hooks/useUserProfile";
import { useFriendVisibility } from "../hooks/useFriendVisibility";
import { useActivity, usePublicActivity } from "../hooks/useActivity";
import { batchSearchDirectors } from "../hooks/useDirectorSearch";
import { Navbar } from "../components/layout/Navbar";
import { PublicBottomNav } from "../components/layout/PublicBottomNav";
import { PublicHeader } from "../components/layout/PublicHeader";
import { useAuth } from "../features/auth/AuthContext";
import { ref, get } from "firebase/database";
import { db } from "../lib/firebase";
import { getDisplayStatus, isWatched } from "../lib/movieStatus";
import { HistoryPill } from "../components/stats/HistoryPill";
import { QuickStat } from "../components/stats/QuickStat";
import { StreakCalendar } from "../components/stats/StreakCalendar";
import { TVStreakCalendar } from "../components/stats/TVStreakCalendar";
import { ThinProgressBar } from "../components/stats/ThinProgressBar";
import { SmoothDecadeBar } from "../components/stats/SmoothDecadeBar";
import { DirectorItem } from "../components/stats/DirectorItem";
import { GenreTag } from "../components/stats/GenreTag";

export default function Stats() {
    const { userId } = useParams();
    const { user } = useAuth();

    const { movies: userMovies, loading: userLoading } = useMovies();
    const { movies: publicMovies, loading: publicLoading } =
        usePublicMovies(userId);
    const { profile, loading: profileLoading } = useUserProfile(userId);
    const { showFriends } = useFriendVisibility(userId);

    // Fetch activity data
    const { activities: userActivities, loading: userActivityLoading } =
        useActivity(20);
    const { activities: publicActivities, loading: publicActivityLoading } =
        usePublicActivity(userId, 20);

    const movies = userId ? publicMovies : userMovies;
    const loading = userId ? publicLoading : userLoading;
    const activities = userId ? publicActivities : userActivities;
    const activityLoading = userId
        ? publicActivityLoading
        : userActivityLoading;

    // Streak settings
    const [streakThreshold, setStreakThreshold] = useState(2); // Default: 2 movies per week
    const [tvStreakThreshold, setTvStreakThreshold] = useState(5); // Default: 5 episodes per week
    const [directorIds, setDirectorIds] = useState({});
    const [calendarView, setCalendarView] = useState("movies"); // "movies" or "tv"

    useEffect(() => {
        const fetchStreakSettings = async () => {
            if (!user && !userId) return;
            const targetUserId = userId || user.uid;

            const movieStreakRef = ref(
                db,
                `users/${targetUserId}/settings/stats/streakThreshold`,
            );
            const movieSnapshot = await get(movieStreakRef);
            if (movieSnapshot.exists()) {
                setStreakThreshold(movieSnapshot.val());
            }

            const tvStreakRef = ref(
                db,
                `users/${targetUserId}/settings/stats/tvStreakThreshold`,
            );
            const tvSnapshot = await get(tvStreakRef);
            if (tvSnapshot.exists()) {
                setTvStreakThreshold(tvSnapshot.val());
            }
        };
        fetchStreakSettings();
    }, [user, userId]);

    const stats = useMemo(() => {
        if (!movies || movies.length === 0) return null;

        const allMovies = movies;
        const totalMovies = allMovies.length;

        // Status Breakdown
        const statusCounts = {
            Watchlist: 0,
            Watching: 0,
            Completed: 0,
            Dropped: 0,
            "Plan to Watch": 0,
            "On Hold": 0,
            Watched: 0,
        };

        // Type Breakdown
        const typeCounts = {
            movie: 0,
            tv: 0,
        };

        let totalRuntimeMinutes = 0;
        let totalRatings = 0;
        let ratingSum = 0;

        // Directors
        const directorCounts = {};

        // Genres
        const genreCounts = {};

        // Decades
        const decadeCounts = {};

        allMovies.forEach((movie) => {
            // Type
            const t = movie.type || "movie";
            typeCounts[t] = (typeCounts[t] || 0) + 1;

            // Status - use new system
            const s = getDisplayStatus(movie);
            statusCounts[s] = (statusCounts[s] || 0) + 1;

            // Runtime
            const runtime = movie.runtime || 0;
            if (t === "movie") {
                if (movie.timesWatched > 0) {
                    totalRuntimeMinutes += runtime * movie.timesWatched;
                }
            } else if (t === "tv") {
                let minutes = 0;
                if (movie.episodesWatched) {
                    const count = Object.values(movie.episodesWatched).filter(
                        Boolean,
                    ).length;
                    minutes += count * runtime;
                }
                if (movie.timesWatched > 0) {
                    const totalEps =
                        movie.number_of_episodes ||
                        (movie.number_of_seasons || 1) * 10;
                    minutes += movie.timesWatched * totalEps * runtime;
                }
                totalRuntimeMinutes += minutes;
            }

            // Rating - check both rating and ratings object
            if (
                movie.ratings &&
                movie.ratings.overall &&
                movie.ratings.overall > 0
            ) {
                ratingSum += movie.ratings.overall;
                totalRatings++;
            } else if (movie.rating && movie.rating > 0) {
                ratingSum += movie.rating;
                totalRatings++;
            }

            // Directors
            const dirs = Array.isArray(movie.director)
                ? movie.director
                : Array.isArray(movie.artist)
                ? movie.artist
                : [movie.artist || movie.director];
            dirs.forEach((d) => {
                if (d) {
                    const cleanName = String(d).trim();
                    if (cleanName)
                        directorCounts[cleanName] =
                            (directorCounts[cleanName] || 0) + 1;
                }
            });

            // Genres
            if (movie.genres && Array.isArray(movie.genres)) {
                movie.genres.forEach((g) => {
                    const clean = g.trim();
                    if (clean)
                        genreCounts[clean] = (genreCounts[clean] || 0) + 1;
                });
            }

            // Decades
            if (movie.releaseDate && movie.releaseDate.length >= 4) {
                const year = parseInt(movie.releaseDate.substring(0, 4));
                if (!isNaN(year)) {
                    const decade = Math.floor(year / 10) * 10;
                    decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
                }
            }
        });

        // Sort and format data
        const sortedStatus = Object.entries(statusCounts)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({
                name,
                count,
                percent: Math.round((count / totalMovies) * 100),
            }));

        const totalHours = Math.round(totalRuntimeMinutes / 60);
        const avgRating =
            totalRatings > 0 ? (ratingSum / totalRatings).toFixed(1) : 0;

        const topDirectors = Object.entries(directorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({
                name,
                count,
                percent:
                    totalMovies > 0
                        ? Math.round((count / totalMovies) * 100)
                        : 0,
            }));

        const sortedDecades = Object.entries(decadeCounts)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([decade, count]) => ({ decade: `${decade}s`, count }));

        // Calculate completion rate
        const completionRate =
            totalMovies > 0
                ? Math.round((statusCounts["Completed"] / totalMovies) * 100)
                : 0;

        // Calculate streak based on consecutive days with movies watched
        const completedMovies = allMovies
            .filter((m) => isWatched(m) && m.completedAt)
            .map((m) => ({
                id: m.id,
                completedAt: m.completedAt,
            }));

        // Group by date (not week)
        const dailyCompletions = {};
        completedMovies.forEach((movie) => {
            const timestamp = movie.completedAt?.seconds
                ? movie.completedAt.seconds * 1000
                : movie.completedAt;
            const date = new Date(timestamp);
            const dateKey = `${date.getFullYear()}-${String(
                date.getMonth() + 1,
            ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            dailyCompletions[dateKey] = (dailyCompletions[dateKey] || 0) + 1;
        });

        // Calculate current and longest streak based on weekly milestones
        let currentStreak = 0;
        let longestStreak = 0;

        // Get today's date and current week info
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(
            today.getMonth() + 1,
        ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        // Get start of current week (Monday)
        const currentWeekStart = new Date(today);
        const dayOfWeek = currentWeekStart.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday);
        currentWeekStart.setHours(0, 0, 0, 0);

        // Helper function to get week start (Monday) for any date
        const getWeekStart = (date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = day === 0 ? 6 : day - 1;
            d.setDate(d.getDate() - diff);
            d.setHours(0, 0, 0, 0);
            return d;
        };

        // Helper function to count movies in a week
        const getMoviesInWeek = (weekStart) => {
            let count = 0;
            for (let i = 0; i < 7; i++) {
                const checkDate = new Date(weekStart);
                checkDate.setDate(checkDate.getDate() + i);
                const checkKey = `${checkDate.getFullYear()}-${String(
                    checkDate.getMonth() + 1,
                ).padStart(2, "0")}-${String(checkDate.getDate()).padStart(
                    2,
                    "0",
                )}`;
                count += dailyCompletions[checkKey] || 0;
            }
            return count;
        };

        // Count current streak (count days with movies, but allow gaps in weeks that meet milestone)
        if (Object.keys(dailyCompletions).length > 0) {
            let checkDate = new Date(today);
            let streakActive = true;
            let lastWeekWithMovies = null;

            while (streakActive) {
                const checkKey = `${checkDate.getFullYear()}-${String(
                    checkDate.getMonth() + 1,
                ).padStart(2, "0")}-${String(checkDate.getDate()).padStart(
                    2,
                    "0",
                )}`;

                const weekStart = getWeekStart(checkDate);
                const moviesThisWeek = getMoviesInWeek(weekStart);
                const isCurrentWeek =
                    weekStart.getTime() === currentWeekStart.getTime();

                // Check if this day has movies
                if (dailyCompletions[checkKey] > 0) {
                    // Only count if this week meets the milestone OR it's the current week
                    if (
                        moviesThisWeek >= 3 ||
                        (isCurrentWeek && moviesThisWeek > 0)
                    ) {
                        currentStreak++;
                        lastWeekWithMovies = weekStart.getTime();
                    }
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    if (
                        moviesThisWeek >= 3 ||
                        (isCurrentWeek && moviesThisWeek > 0)
                    ) {
                        checkDate.setDate(checkDate.getDate() - 1);
                    } else {
                        // Week doesn't meet criteria, end streak
                        streakActive = false;
                    }
                }
            }

        }

        // Calculate longest streak using same logic as current streak
        if (Object.keys(dailyCompletions).length > 0) {
            const sortedDates = Object.keys(dailyCompletions).sort();
            const oldestDate = new Date(sortedDates[0]);
            const newestDate = new Date(sortedDates[sortedDates.length - 1]);

            const getWeekStart = (date) => {
                const d = new Date(date);
                const day = d.getDay();
                const diff = day === 0 ? 6 : day - 1;
                d.setDate(d.getDate() - diff);
                d.setHours(0, 0, 0, 0);
                return d;
            };

            const getMoviesInWeek = (weekStart) => {
                let count = 0;
                for (let i = 0; i < 7; i++) {
                    const checkDate = new Date(weekStart);
                    checkDate.setDate(checkDate.getDate() + i);
                    const checkKey = `${checkDate.getFullYear()}-${String(
                        checkDate.getMonth() + 1,
                    ).padStart(2, "0")}-${String(checkDate.getDate()).padStart(
                        2,
                        "0",
                    )}`;
                    count += dailyCompletions[checkKey] || 0;
                }
                return count;
            };

            let checkDate = new Date(oldestDate);
            let tempStreak = 0;

            while (checkDate <= newestDate) {
                const checkKey = `${checkDate.getFullYear()}-${String(
                    checkDate.getMonth() + 1,
                ).padStart(2, "0")}-${String(checkDate.getDate()).padStart(
                    2,
                    "0",
                )}`;

                const weekStart = getWeekStart(checkDate);
                const moviesThisWeek = getMoviesInWeek(weekStart);

                if (dailyCompletions[checkKey] > 0) {
                    if (moviesThisWeek >= streakThreshold) {
                        tempStreak++;
                        longestStreak = Math.max(longestStreak, tempStreak);
                    }
                } else {
                    if (moviesThisWeek >= streakThreshold) {
                        // Continue streak even without movies this day if week meets threshold
                    } else {
                        // Week doesn't meet threshold, reset streak
                        tempStreak = 0;
                    }
                }

                checkDate.setDate(checkDate.getDate() + 1);
            }
        }

        // Group by week for calendar display
        const getWeekKey = (date) => {
            const d = new Date(date);
            const weekStart = new Date(d);
            weekStart.setDate(
                weekStart.getDate() - ((weekStart.getDay() + 6) % 7),
            ); // Get Monday
            const year = weekStart.getFullYear();
            const weekNum = Math.ceil(
                ((weekStart - new Date(year, 0, 1)) / 86400000 + 1) / 7,
            );
            return `${year}-W${weekNum.toString().padStart(2, "0")}`;
        };

        const weeklyCompletions = {};
        completedMovies.forEach((movie) => {
            const timestamp = movie.completedAt?.seconds
                ? movie.completedAt.seconds * 1000
                : movie.completedAt;
            const weekKey = getWeekKey(timestamp);
            weeklyCompletions[weekKey] = (weeklyCompletions[weekKey] || 0) + 1;
        });

        // Calculate TV show streak based on episodes watched per week
        const tvShows = allMovies.filter((m) => m.type === "tv");
        const dailyEpisodes = {};

        tvShows.forEach((show) => {
            if (show.episodeWatchDates) {
                Object.entries(show.episodeWatchDates).forEach(
                    ([episodeKey, timestamp]) => {
                        const date = new Date(timestamp);
                        const dateKey = `${date.getFullYear()}-${String(
                            date.getMonth() + 1,
                        ).padStart(2, "0")}-${String(date.getDate()).padStart(
                            2,
                            "0",
                        )}`;
                        dailyEpisodes[dateKey] =
                            (dailyEpisodes[dateKey] || 0) + 1;
                    },
                );
            }
        });

        // Calculate TV current streak
        let currentTVStreak = 0;
        let longestTVStreak = 0;

        if (Object.keys(dailyEpisodes).length > 0) {
            let checkDate = new Date(today);
            let streakActive = true;

            const getWeekStart = (date) => {
                const d = new Date(date);
                const day = d.getDay();
                const diff = day === 0 ? 6 : day - 1;
                d.setDate(d.getDate() - diff);
                d.setHours(0, 0, 0, 0);
                return d;
            };

            const getEpisodesInWeek = (weekStart) => {
                let count = 0;
                for (let i = 0; i < 7; i++) {
                    const checkDate = new Date(weekStart);
                    checkDate.setDate(checkDate.getDate() + i);
                    const checkKey = `${checkDate.getFullYear()}-${String(
                        checkDate.getMonth() + 1,
                    ).padStart(2, "0")}-${String(checkDate.getDate()).padStart(
                        2,
                        "0",
                    )}`;
                    count += dailyEpisodes[checkKey] || 0;
                }
                return count;
            };

            const currentWeekStart = new Date(today);
            const dayOfWeek = currentWeekStart.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday);
            currentWeekStart.setHours(0, 0, 0, 0);

            while (streakActive) {
                const checkKey = `${checkDate.getFullYear()}-${String(
                    checkDate.getMonth() + 1,
                ).padStart(2, "0")}-${String(checkDate.getDate()).padStart(
                    2,
                    "0",
                )}`;

                const weekStart = getWeekStart(checkDate);
                const episodesThisWeek = getEpisodesInWeek(weekStart);
                const isCurrentWeek =
                    weekStart.getTime() === currentWeekStart.getTime();

                if (dailyEpisodes[checkKey] > 0) {
                    if (
                        episodesThisWeek >= tvStreakThreshold ||
                        (isCurrentWeek && episodesThisWeek > 0)
                    ) {
                        currentTVStreak++;
                    }
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    if (
                        episodesThisWeek >= tvStreakThreshold ||
                        (isCurrentWeek && episodesThisWeek > 0)
                    ) {
                        checkDate.setDate(checkDate.getDate() - 1);
                    } else {
                        streakActive = false;
                    }
                }
            }
        }

        // Calculate longest TV streak
        let tempTVStreak = 0;
        if (Object.keys(dailyEpisodes).length > 0) {
            const sortedDates = Object.keys(dailyEpisodes).sort();
            const oldestDate = new Date(sortedDates[0]);
            const newestDate = new Date(sortedDates[sortedDates.length - 1]);

            let checkDate = new Date(oldestDate);
            tempTVStreak = 0;

            while (checkDate <= newestDate) {
                const checkKey = `${checkDate.getFullYear()}-${String(
                    checkDate.getMonth() + 1,
                ).padStart(2, "0")}-${String(checkDate.getDate()).padStart(
                    2,
                    "0",
                )}`;

                if (dailyEpisodes[checkKey] > 0) {
                    tempTVStreak++;
                    longestTVStreak = Math.max(longestTVStreak, tempTVStreak);
                } else {
                    tempTVStreak = 0;
                }

                checkDate.setDate(checkDate.getDate() + 1);
            }
        }

        const weeklyTVCompletions = {};
        tvShows.forEach((show) => {
            if (show.episodeWatchDates) {
                Object.entries(show.episodeWatchDates).forEach(
                    ([episodeKey, timestamp]) => {
                        const weekKey = getWeekKey(timestamp);
                        weeklyTVCompletions[weekKey] =
                            (weeklyTVCompletions[weekKey] || 0) + 1;
                    },
                );
            }
        });

        return {
            totalMovies,
            sortedStatus,
            totalHours,
            avgRating,
            typeCounts,
            topDirectors,
            topGenres,
            sortedDecades,
            completionRate,
            currentStreak,
            longestStreak,
            weeklyCompletions,
            currentTVStreak,
            longestTVStreak,
            weeklyTVCompletions,
        };
    }, [movies, streakThreshold, tvStreakThreshold]);

    // Fetch director IDs when stats are calculated
    useEffect(() => {
        async function fetchDirectorIds() {
            if (
                !stats ||
                !stats.topDirectors ||
                stats.topDirectors.length === 0
            )
                return;

            const directorNames = stats.topDirectors.map((d) => d.name);
            const ids = await batchSearchDirectors(directorNames);
            setDirectorIds(ids);
        }

        fetchDirectorIds();
    }, [stats]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] text-zinc-100">
                {userId ? <PublicHeader /> : <Navbar />}
                <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 pt-6 pb-20 flex items-center justify-center">
                    <p>Loading stats...</p>
                </main>
                {userId && <PublicBottomNav />}
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-[#09090b] text-zinc-100">
                {userId ? <PublicHeader /> : <Navbar />}
                <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 pt-6 pb-20 flex flex-col items-center justify-center gap-4">
                    <p>No data available. Add some movies to your library!</p>
                    <Link
                        to={userId ? `/u/${userId}` : "/"}
                        className="text-blue-500 hover:underline"
                    >
                        {userId ? "Go to Shelf" : "Go to Library"}
                    </Link>
                </main>
                {userId && <PublicBottomNav />}
            </div>
        );
    }

    const topGenre = stats.topGenres[0]?.name || "N/A";
    const maxDirectorCount = stats.topDirectors[0]?.count || 1;
    const maxDecadeCount = Math.max(
        ...stats.sortedDecades.map((d) => d.count),
        1,
    );

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-800">
            {userId ? <PublicHeader /> : <Navbar />}

            <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 pt-10 pb-24">
                {/* Top Panel: Scrollable History */}
                {!activityLoading && activities.length > 0 && (
                    <section className="mb-8">
                        <div className="flex items-center gap-2 mb-5">
                            <History className="w-5 h-5 text-zinc-500" />
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
                                Recent Activity
                            </h2>
                        </div>

                        <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {activities.map((item) => (
                                <HistoryPill
                                    key={item.id}
                                    data={item}
                                    userId={userId}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Fluid Overview Stats */}
                <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-y-10 gap-x-6 mb-8 border-y border-zinc-800/50 py-10">
                    <QuickStat
                        value={stats.totalMovies}
                        label="Total Items"
                        icon={<Film className="w-4 h-4" />}
                    />
                    <QuickStat
                        value={`${stats.totalHours}h`}
                        label="Time Watched"
                        icon={<Clock className="w-4 h-4" />}
                    />
                    <QuickStat
                        value={
                            stats.sortedStatus.find(
                                (s) => s.name === "Completed",
                            )?.count || 0
                        }
                        label="Completed"
                        icon={<CheckCircle2 className="w-4 h-4" />}
                    />
                    <QuickStat
                        value={topGenre}
                        label="Top Genre"
                        icon={<Trophy className="w-4 h-4" />}
                    />
                    <QuickStat
                        value={stats.avgRating}
                        label="Avg Rating"
                        icon={<Star className="w-4 h-4" />}
                        suffix="★"
                    />
                    <QuickStat
                        value={`${stats.completionRate}%`}
                        label="Completion"
                        icon={<BarChart3 className="w-4 h-4" />}
                    />
                    <QuickStat
                        value={stats.currentStreak || 0}
                        label="Movie Streak"
                        icon={<Flame className="w-4 h-4" />}
                    />
                    <QuickStat
                        value={stats.currentTVStreak || 0}
                        label="TV Streak"
                        icon={<Flame className="w-4 h-4" />}
                    />
                </section>

                <section className="mb-16">
                    <div className="flex items-center justify-between gap-4">
                        {/* Mobile: Toggle buttons */}
                        <div className="lg:hidden flex gap-2">
                            <button
                                onClick={() => setCalendarView("movies")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    calendarView === "movies"
                                        ? "bg-blue-600 text-white"
                                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                                }`}
                            >
                                Movies
                            </button>
                            <button
                                onClick={() => setCalendarView("tv")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    calendarView === "tv"
                                        ? "bg-purple-600 text-white"
                                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                                }`}
                            >
                                TV Shows
                            </button>
                        </div>
                        <div className="text-xs text-zinc-500 flex items-center gap-1 lg:hidden">
                            {calendarView === "movies" ? (
                                <>
                                    Current streak: {stats.currentStreak} days
                                    <Flame className="w-3.5 h-3.5 text-blue-500" />
                                    <span className="mx-1">•</span>
                                    Longest: {stats.longestStreak}
                                </>
                            ) : (
                                <>
                                    Current streak: {stats.currentTVStreak} days
                                    <Flame className="w-3.5 h-3.5 text-purple-500" />
                                    <span className="mx-1">•</span>
                                    Longest: {stats.longestTVStreak}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Desktop: Side by side calendars */}
                    <div className="hidden lg:grid lg:grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-zinc-400">
                                    Movies
                                </h3>
                                <div className="text-xs text-zinc-500 flex items-center gap-1">
                                    {stats.currentStreak} days
                                    <Flame className="w-3 h-3 text-blue-500" />
                                    <span className="mx-1">•</span>
                                    Longest: {stats.longestStreak}
                                </div>
                            </div>
                            <StreakCalendar
                                weeklyCompletions={stats.weeklyCompletions}
                                threshold={streakThreshold}
                                userId={!userId ? user?.uid : null}
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-zinc-400">
                                    Episodes
                                </h3>
                                <div className="text-xs text-zinc-500 flex items-center gap-1">
                                    {stats.currentTVStreak} days
                                    <Flame className="w-3 h-3 text-purple-500" />
                                    <span className="mx-1">•</span>
                                    Longest: {stats.longestTVStreak}
                                </div>
                            </div>
                            <TVStreakCalendar
                                weeklyCompletions={stats.weeklyTVCompletions}
                                threshold={tvStreakThreshold}
                                userId={!userId ? user?.uid : null}
                            />
                        </div>
                    </div>

                    {/* Mobile: Single calendar with toggle */}
                    <div className="lg:hidden">
                        {calendarView === "movies" ? (
                            <div>
                                <StreakCalendar
                                    weeklyCompletions={stats.weeklyCompletions}
                                    threshold={streakThreshold}
                                    userId={!userId ? user?.uid : null}
                                />
                            </div>
                        ) : (
                            <div>
                                <TVStreakCalendar
                                    weeklyCompletions={
                                        stats.weeklyTVCompletions
                                    }
                                    threshold={tvStreakThreshold}
                                    userId={!userId ? user?.uid : null}
                                />
                            </div>
                        )}
                    </div>
                </section>

                {/* Main Content Layout */}
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
                    {/* Left Column: Analytics */}
                    <div className="lg:col-span-7 space-y-20">
                        {/* Status Breakdown */}
                        <section>
                            <h3 className="text-2xl font-bold tracking-tight mb-8">
                                Status Breakdown
                            </h3>
                            <div className="space-y-6">
                                {stats.sortedStatus
                                    .slice(0, 3)
                                    .map((status) => (
                                        <ThinProgressBar
                                            key={status.name}
                                            label={status.name}
                                            value={status.count}
                                            max={stats.totalMovies}
                                        />
                                    ))}
                            </div>
                        </section>

                        {/* Content Mix (Segmented Ratio Bar) */}
                        <section>
                            <h3 className="text-2xl font-bold tracking-tight mb-8">
                                Content Mix
                            </h3>
                            <div className="flex flex-col">
                                <div className="flex gap-8 md:gap-12 mb-6">
                                    <div className="flex flex-col group cursor-default">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-200 group-hover:scale-125 transition-transform" />
                                            <span className="text-sm font-semibold text-zinc-400">
                                                Movies
                                            </span>
                                        </div>
                                        <span className="text-4xl font-light text-zinc-100 tracking-tight">
                                            {stats.typeCounts.movie || 0}
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
                                            {stats.typeCounts.tv || 0}
                                        </span>
                                    </div>
                                </div>

                                <div className="h-2 w-full flex rounded-full overflow-hidden gap-1">
                                    <div
                                        className="bg-zinc-200 hover:opacity-80 transition-opacity"
                                        style={{
                                            width: `${Math.round(
                                                (stats.typeCounts.movie /
                                                    stats.totalMovies) *
                                                    100,
                                            )}%`,
                                        }}
                                        title={`Movies: ${Math.round(
                                            (stats.typeCounts.movie /
                                                stats.totalMovies) *
                                                100,
                                        )}%`}
                                    />
                                    <div
                                        className="bg-zinc-600 hover:opacity-80 transition-opacity"
                                        style={{
                                            width: `${Math.round(
                                                (stats.typeCounts.tv /
                                                    stats.totalMovies) *
                                                    100,
                                            )}%`,
                                        }}
                                        title={`TV Shows: ${Math.round(
                                            (stats.typeCounts.tv /
                                                stats.totalMovies) *
                                                100,
                                        )}%`}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Era / Decade Chart */}
                        {stats.sortedDecades.length > 0 && (
                            <section>
                                <h3 className="text-2xl font-bold tracking-tight mb-8">
                                    Release Eras
                                </h3>
                                <div className="flex items-end justify-between h-48 gap-2 mt-4 px-2">
                                    {stats.sortedDecades.map((item) => (
                                        <SmoothDecadeBar
                                            key={item.decade}
                                            decade={item.decade}
                                            count={item.count}
                                            max={maxDecadeCount}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Right Column: Top Lists */}
                    <div className="lg:col-span-5 space-y-20">
                        {/* Top Directors */}
                        {stats.topDirectors.length > 0 && (
                            <section>
                                <h3 className="text-2xl font-bold tracking-tight mb-8">
                                    Most Watched Directors
                                </h3>
                                <div className="flex flex-col gap-1">
                                    {stats.topDirectors.map((director) => (
                                        <DirectorItem
                                            key={director.name}
                                            name={director.name}
                                            count={director.count}
                                            max={maxDirectorCount}
                                            directorId={
                                                directorIds[director.name]
                                            }
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Favorite Genres */}
                        {stats.topGenres.length > 0 && (
                            <section>
                                <h3 className="text-2xl font-bold tracking-tight mb-8">
                                    Favorite Genres
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {stats.topGenres.map((genre, index) => {
                                        let rank = "low";
                                        if (index === 0 || index === 1)
                                            rank = "top";
                                        else if (index === 2 || index === 3)
                                            rank = "high";
                                        else if (index < 6) rank = "mid";

                                        return (
                                            <GenreTag
                                                key={genre.name}
                                                name={genre.name}
                                                count={genre.count}
                                                rank={rank}
                                            />
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </main>

            {userId && <PublicBottomNav />}
        </div>
    );
}
