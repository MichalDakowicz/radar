import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
    BarChart3,
    PieChart,
    Calendar,
    Trophy,
    Library,
    DollarSign,
    Tags,
    Store,
    TrendingUp,
    Clapperboard,
    Film,
    FileVideo,
    Clock,
    CheckCircle2,
    Activity,
    Monitor
} from "lucide-react";
import { useMovies } from "../hooks/useMovies";
import { usePublicMovies } from "../hooks/usePublicMovies";
import { useUserProfile } from "../hooks/useUserProfile";
import { useFriendVisibility } from "../hooks/useFriendVisibility";
import { Navbar } from "../components/layout/Navbar";
import { PublicBottomNav } from "../components/layout/PublicBottomNav";
import { PublicHeader } from "../components/layout/PublicHeader";
import { useAuth } from "../features/auth/AuthContext";
import { normalizeServiceName } from "../lib/services"; // Import normalize helper

export default function Stats() {
    const { userId } = useParams();
    const { user } = useAuth();


    const { movies: userMovies, loading: userLoading } = useMovies();
    const { movies: publicMovies, loading: publicLoading } =
        usePublicMovies(userId);
    const { profile, loading: profileLoading } = useUserProfile(userId);
    const { showFriends } = useFriendVisibility(userId);

    const movies = userId ? publicMovies : userMovies;
    const loading = userId ? publicLoading : userLoading;

    const stats = useMemo(() => {
        if (!movies || movies.length === 0) return null;
        
        const allMovies = movies; 
        const totalMovies = allMovies.length;

        // Status Breakdown
        const statusCounts = {
            "Watchlist": 0,
            "Watching": 0,
            "Completed": 0,
            "Dropped": 0,
            "Plan to Watch": 0,
            "On Hold": 0,
            "Watched": 0 // Legacy/Movie specific
        };
        
        // Type Breakdown
        const typeCounts = {
            "movie": 0,
            "tv": 0
        };

        let totalRuntimeMinutes = 0;
        let totalEpisodes = 0;

        // Availability (Streaming Services)
        const availabilityCounts = {};

        allMovies.forEach((movie) => {
             // Type
             const t = movie.type || "movie";
             typeCounts[t] = (typeCounts[t] || 0) + 1;

             // Status
             // Normalize status:
             // Movies often use 'status' as 'Watchlist' or 'Watched' or implicit from 'timesWatched'
             let s = movie.status;
             if (!s) {
                 s = movie.timesWatched > 0 ? "Completed" : "Watchlist";
             }
             // Map legacy/movie statuses to standard set
             if (s === "Watched") s = "Completed";
             
             statusCounts[s] = (statusCounts[s] || 0) + 1;

             // Runtime
             const runtime = movie.runtime || 0;
             if (t === 'movie') {
                if (movie.timesWatched > 0) {
                    totalRuntimeMinutes += runtime * movie.timesWatched;
                }
             } else if (t === 'tv') {
                 let minutes = 0;
                 // 1. Precise episode tracking
                 if (movie.episodesWatched) {
                     // Count true values
                     const count = Object.values(movie.episodesWatched).filter(Boolean).length;
                     minutes += count * runtime;
                 }
                 
                 // 2. Full rewatches (if marked)
                 if (movie.timesWatched > 0) {
                      // Estimate total duration
                      // Use number_of_episodes if known, else estimate 10 per season
                      const totalEps = movie.number_of_episodes || ((movie.number_of_seasons || 1) * 10);
                      minutes += (movie.timesWatched * totalEps * runtime);
                 }
                 
                 totalRuntimeMinutes += minutes;
             }

             // Availability
             if (Array.isArray(movie.availability)) {
                 const seenServices = new Set();
                 movie.availability.forEach(svc => {
                     const normalized = normalizeServiceName(svc);
                     if (normalized && !seenServices.has(normalized)) {
                        seenServices.add(normalized);
                        availabilityCounts[normalized] = (availabilityCounts[normalized] || 0) + 1;
                     }
                 });
             } else if (movie.format && !['Digital', 'Blu-ray', 'DVD', 'VHS', 'Physical'].includes(movie.format)) {
                 // Legacy format usage for streaming services?
                 availabilityCounts[movie.format] = (availabilityCounts[movie.format] || 0) + 1;
             }
        });

        const sortedStatus = Object.entries(statusCounts)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count, percent: Math.round((count / totalMovies) * 100) }));

        const sortedAvailability = Object.entries(availabilityCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count, percent: Math.round((count / totalMovies) * 100) }));
        
        const totalHours = Math.round(totalRuntimeMinutes / 60);

        // Formats Breakdown (Legacy Physical + Digital) - Keep as is but maybe rename to "Media Type" or "Source"?
        // Actually, let's keep the existing logic for Format if users still use it, but prioritize Availability if available.

        // Directors
        const directorCounts = {};
        allMovies.forEach((movie) => {
            // Directors
            const dirs = Array.isArray(movie.director) 
                ? movie.director 
                : (Array.isArray(movie.artist) ? movie.artist : [movie.artist || movie.director]); // Fallback
                
            dirs.forEach((d) => {
                if (d) {
                    const cleanName = String(d).trim();
                    if (cleanName) directorCounts[cleanName] = (directorCounts[cleanName] || 0) + 1;
                }
            });
        });
        const uniqueDirectorCount = Object.keys(directorCounts).length;

        const topDirectors = Object.entries(directorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // Decades
        const decadeCounts = {};
        allMovies.forEach((movie) => {
            if (movie.releaseDate && movie.releaseDate.length >= 4) {
                const year = parseInt(movie.releaseDate.substring(0, 4));
                if (!isNaN(year)) {
                    const decade = Math.floor(year / 10) * 10;
                    decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
                }
            }
        });
        const sortedDecades = Object.entries(decadeCounts)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([decade, count]) => ({ decade: `${decade}s`, count }));

        // Price & Value
        let totalValue = 0;
        const moviesWithPrice = [];
        allMovies.forEach((movie) => {
            const p = parseFloat(movie.pricePaid);
            if (!isNaN(p) && p > 0) {
                totalValue += p;
                moviesWithPrice.push({ ...movie, price: p });
            }
        });
        const mostExpensive = moviesWithPrice
            .sort((a, b) => b.price - a.price)
            .slice(0, 5);

        // Genres
        const genreCounts = {};
        allMovies.forEach((movie) => {
            if (movie.genres && Array.isArray(movie.genres)) {
                movie.genres.forEach((g) => {
                    const clean = g.trim();
                    if (clean)
                        genreCounts[clean] = (genreCounts[clean] || 0) + 1;
                });
            }
        });
        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({
                name,
                count,
                percent:
                    totalMovies > 0
                        ? Math.round((count / totalMovies) * 100)
                        : 0,
            }));

        // Stores
        const storeCounts = {};
        allMovies.forEach((movie) => {
            if (movie.storeName) {
                const clean = movie.storeName.trim();
                if (clean) storeCounts[clean] = (storeCounts[clean] || 0) + 1;
            }
        });
        const topStores = Object.entries(storeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        return {
            totalMovies,
            // sortedFormats, // Deprecated in favor of availability? Let's keep both if needed, but return new ones
            sortedStatus,
            sortedAvailability,
            totalHours,
            typeCounts,
            topDirectors,
            uniqueDirectorCount,
            sortedDecades,
            totalValue,
            mostExpensive,
            topGenres,
            topStores,
        };
    }, [movies]);

    if (loading)
        return (
            <div className="min-h-screen bg-neutral-950 text-white">
                {userId ? <PublicHeader /> : <Navbar />}
                <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 pt-6 pb-20 flex items-center justify-center">
                    <p>Loading stats...</p>
                </main>
                {userId && <PublicBottomNav />}
            </div>
        );
    
    if (!stats)
        return (
            <div className="min-h-screen bg-neutral-950 text-white">
                 {userId ? <PublicHeader /> : <Navbar />}
                 <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 pt-6 pb-20 flex flex-col items-center justify-center gap-4">
                    <p>No data available. Add some movies to your library!</p>
                    <Link to={userId ? `/u/${userId}` : "/"} className="text-blue-500 hover:underline">
                        {userId ? "Go to Shelf" : "Go to Library"}
                    </Link>
                </main>
                {userId && <PublicBottomNav />}
            </div>
        );

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {userId ? <PublicHeader /> : <Navbar />}
            <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 pt-6 pb-24 space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">

                    {/* Top Stats Cards */}
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-35">
                            <StatCard
                                label="Total Movies"
                                value={stats.totalMovies}
                                icon={<Library size={20} />}
                            />
                        </div>
                        {stats.totalValue > 0 && (
                            <div className="flex-1 min-w-35">
                                <StatCard
                                    label="Library Value"
                                    value={`$${stats.totalValue}`}
                                    icon={
                                        <DollarSign
                                            size={20}
                                            className="text-blue-500"
                                        />
                                    }
                                    subtext="Est. Cost"
                                />
                            </div>
                        )}
                        <div className="flex-1 min-w-35">
                            <StatCard
                                label="Total Watched"
                                value={`${stats.totalHours} hrs`}
                                icon={<Clock size={20} />}
                                subtext="Lifetime"
                            />
                        </div>
                        <div className="flex-1 min-w-35">
                            <StatCard
                                label="Completed"
                                value={stats.sortedStatus.find(s => s.name === 'Completed')?.count || 0}
                                icon={<CheckCircle2 size={20} />}
                            />
                        </div>
                        <div className="flex-1 min-w-35">
                            <StatCard
                                label="Unique Directors"
                                value={stats.uniqueDirectorCount}
                                icon={<Trophy size={20} />}
                            />
                        </div>
                        <div className="flex-1 min-w-35">
                            <StatCard
                                label="Top Genre"
                                value={stats.topGenres[0]?.name || "N/A"}
                                subtext={
                                    stats.topGenres[0] &&
                                    `${stats.topGenres[0].count} titles`
                                }
                                icon={<Tags size={20} />}
                            />
                        </div>
                        <div className="flex-1 min-w-35">
                            <StatCard
                                label="Top Decade"
                                value={
                                    stats.sortedDecades.sort(
                                        (a, b) => b.count - a.count,
                                    )[0]?.decade || "N/A"
                                }
                                icon={<Calendar size={20} />}
                            />
                        </div>
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Status Breakdown */}
                        <div className="bg-neutral-900/40 rounded-3xl p-6 border border-neutral-800/50 hover:border-neutral-700/50 transition-colors">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Activity size={20} className="text-green-500" />{" "}
                                Status Breakdown
                            </h3>
                            <div className="space-y-4">
                                {stats.sortedStatus.map((item) => (
                                    <div
                                        key={item.name}
                                        className="relative group"
                                    >
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-white font-medium">
                                                {item.name}
                                            </span>
                                            <span className="text-neutral-400 group-hover:text-white transition-colors">
                                                {item.count}
                                            </span>
                                        </div>
                                        <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)] ${
                                                    item.name === 'Completed' ? 'bg-green-500' :
                                                    item.name === 'Watching' ? 'bg-blue-500' :
                                                    item.name === 'Dropped' ? 'bg-red-500' :
                                                    'bg-neutral-500'
                                                }`}
                                                style={{
                                                    width: `${item.percent}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                         {/* Availability Breakdown */}
                         <div className="bg-neutral-900/40 rounded-3xl p-6 border border-neutral-800/50 hover:border-neutral-700/50 transition-colors">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Monitor size={20} className="text-purple-500" />{" "}
                                Streaming Availability
                            </h3>
                            {stats.sortedAvailability.length > 0 ? (
                                <div className="space-y-4">
                                    {stats.sortedAvailability.slice(0, 6).map((item) => (
                                        <div
                                            key={item.name}
                                            className="relative group"
                                        >
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-white font-medium">
                                                    {item.name}
                                                </span>
                                                <span className="text-neutral-400 group-hover:text-white transition-colors">
                                                    {item.count}
                                                </span>
                                            </div>
                                            <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-linear-to-r from-purple-600 to-purple-400 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                                    style={{
                                                        width: `${item.percent}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-neutral-500 gap-2">
                                    <Monitor size={32} opacity={0.5} />
                                    <span>No streaming data available</span>
                                </div>
                            )}
                        </div>


                        {/* Top Directors */}
                        <div className="bg-neutral-900/40 rounded-3xl p-6 border border-neutral-800/50 hover:border-neutral-700/50 transition-colors">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <BarChart3
                                    size={20}
                                    className="text-blue-500"
                                />{" "}
                                Top Directors
                            </h3>
                            <div className="space-y-4">
                                {stats.topDirectors.map((item, index) => {
                                    const max = stats.topDirectors[0].count;
                                    const percent = (item.count / max) * 100;
                                    return (
                                        <div
                                            key={item.name}
                                            className="relative group"
                                        >
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-white font-medium truncate pr-4 flex items-center gap-2">
                                                    <span
                                                        className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ${
                                                            index === 0
                                                                ? "bg-yellow-500/20 text-yellow-500"
                                                                : index === 1
                                                                ? "bg-slate-400/20 text-slate-300"
                                                                : index === 2
                                                                ? "bg-orange-500/20 text-orange-500"
                                                                : "bg-neutral-800 text-neutral-400"
                                                        }`}
                                                    >
                                                        {index + 1}
                                                    </span>
                                                    {item.name}
                                                </span>
                                                <span className="text-neutral-400 shrink-0 group-hover:text-white transition-colors">
                                                    {item.count}
                                                </span>
                                            </div>
                                            <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-linear-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                                    style={{
                                                        width: `${percent}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                         {/* Type Breakdown */}
                         <div className="bg-neutral-900/40 rounded-3xl p-6 border border-neutral-800/50 hover:border-neutral-700/50 transition-colors">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Film size={20} className="text-yellow-500" />{" "}
                                Type Breakdown
                            </h3>
                            <div className="space-y-4">
                                {Object.entries(stats.typeCounts).map(([type, count]) => {
                                    if(count === 0) return null;
                                    const percent = Math.round((count / stats.totalMovies) * 100);
                                    return (
                                        <div
                                            key={type}
                                            className="relative group"
                                        >
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-white font-medium capitalize">
                                                    {type === 'movie' ? 'Movies' : 'TV Shows'}
                                                </span>
                                                <span className="text-neutral-400 group-hover:text-white transition-colors">
                                                    {count}
                                                </span>
                                            </div>
                                            <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)] ${
                                                        type === 'movie' 
                                                        ? 'bg-linear-to-r from-pink-600 to-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.5)]' 
                                                        : 'bg-linear-to-r from-yellow-600 to-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                                                    }`}
                                                    style={{
                                                        width: `${percent}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Decades */}
                        <div
                            className={`bg-neutral-900/40 rounded-3xl p-6 border border-neutral-800/50 hover:border-neutral-700/50 transition-colors ${
                                stats.topGenres.length === 0
                                    ? "md:col-span-2"
                                    : ""
                            }`}
                        >
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Calendar
                                    size={20}
                                    className="text-purple-500"
                                />{" "}
                                By Decade
                            </h3>
                            <div className="flex items-end gap-3 h-56 pt-4 overflow-x-auto overflow-y-hidden custom-scrollbar pb-2">
                                {stats.sortedDecades.map((item) => {
                                    const max = Math.max(
                                        ...stats.sortedDecades.map(
                                            (d) => d.count,
                                        ),
                                        1,
                                    );
                                    const heightPercent =
                                        (item.count / max) * 100;

                                    return (
                                        <div
                                            key={item.decade}
                                            className="flex-1 flex flex-col items-center justify-end h-full gap-2 min-w-12 group cursor-default"
                                        >
                                            <div className="text-xs text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity mb-auto font-mono bg-neutral-800 px-2 py-1 rounded">
                                                {item.count}
                                            </div>
                                            <div
                                                className="w-full bg-neutral-800 hover:bg-purple-500 transition-all duration-300 rounded-t-lg shadow-none hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                                                style={{
                                                    height: `${
                                                        heightPercent || 2
                                                    }%`,
                                                }}
                                            ></div>
                                            <span className="text-xs font-bold text-neutral-400 group-hover:text-white transition-colors -rotate-45 origin-left translate-y-1">
                                                {item.decade}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Top Genres */}
                        {stats.topGenres.length > 0 && (
                            <div className="bg-neutral-900/40 rounded-3xl p-6 border border-neutral-800/50 hover:border-neutral-700/50 transition-colors">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Tags size={20} className="text-pink-500" />{" "}
                                    Top Genres
                                </h3>
                                <div className="space-y-4">
                                    {stats.topGenres.map((item) => (
                                        <div
                                            key={item.name}
                                            className="relative group"
                                        >
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-white font-medium capitalize">
                                                    {item.name}
                                                </span>
                                                <span className="text-neutral-400 group-hover:text-white transition-colors">
                                                    {item.count}
                                                </span>
                                            </div>
                                            <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-linear-to-r from-pink-600 to-pink-400 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                                                    style={{
                                                        width: `${item.percent}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Charts Row 3 */}
                    {(stats.topStores.length > 0 ||
                        stats.mostExpensive.length > 0) && (
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Top Stores */}
                            {stats.topStores.length > 0 && (
                                <div
                                    className={`bg-neutral-900/40 rounded-3xl p-6 border border-neutral-800/50 hover:border-neutral-700/50 transition-colors ${
                                        stats.mostExpensive.length === 0
                                            ? "md:col-span-2"
                                            : ""
                                    }`}
                                >
                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                        <Store
                                            size={20}
                                            className="text-orange-500"
                                        />{" "}
                                        Top Stores
                                    </h3>
                                    <div className="space-y-3">
                                        {stats.topStores.map((store, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-3 bg-neutral-800/30 rounded-lg hover:bg-neutral-800/50 transition-colors"
                                            >
                                                <span className="text-white font-medium">
                                                    {store.name}
                                                </span>
                                                <span className="bg-neutral-800 text-neutral-400 text-xs px-2 py-1 rounded-full font-mono">
                                                    {store.count}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Most Expensive */}
                            {stats.mostExpensive.length > 0 && (
                                <div
                                    className={`bg-neutral-900/40 rounded-3xl p-6 border border-neutral-800/50 hover:border-neutral-700/50 transition-colors ${
                                        stats.topStores.length === 0
                                            ? "md:col-span-2"
                                            : ""
                                    }`}
                                >
                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                        <TrendingUp
                                            size={20}
                                            className="text-blue-500"
                                        />{" "}
                                        Most Valuable
                                    </h3>
                                    <div className="space-y-3">
                                        {stats.mostExpensive.map((movie, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 p-2 bg-neutral-800/30 rounded-lg hover:bg-neutral-800/50 transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded overflow-hidden bg-neutral-900 shrink-0">
                                                    {movie.coverUrl ? (
                                                        <img
                                                            src={movie.coverUrl}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Clapperboard className="p-2 text-neutral-700" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-bold text-white truncate group-hover:text-blue-400 table-cell">
                                                        {movie.title}
                                                    </div>
                                                    <div className="text-xs text-neutral-400 truncate">
                                                        {Array.isArray(
                                                            movie.director,
                                                        )
                                                            ? movie.director.join(
                                                                  ", ",
                                                              )
                                                            : movie.director}
                                                    </div>
                                                </div>
                                                <div className="text-blue-400 font-mono font-bold">
                                                    ${movie.price.toFixed(2)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
            </main>
            {userId && <PublicBottomNav />}
        </div>
    );
}

function StatCard({ label, value, subtext, icon }) {

    return (
        <div className="h-full bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 flex flex-col items-center justify-center text-center hover:bg-neutral-800/60 transition-colors hover:scale-[1.02] duration-200 cursor-default">
            <div className="mb-3 text-neutral-400 bg-neutral-800/50 p-3 rounded-full">
                {icon}
            </div>
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                {label}
            </div>
            {subtext && (
                <div className="text-xs text-blue-400 mt-2 font-medium bg-blue-500/10 px-2 py-1 rounded-full">
                    {subtext}
                </div>
            )}
        </div>
    );
}
