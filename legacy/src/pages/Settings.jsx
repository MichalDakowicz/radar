import { useState, useEffect } from "react";
import { Navbar } from "../components/layout/Navbar";
import { useAuth } from "../features/auth/AuthContext";
import { useMovies } from "../hooks/useMovies";
import { useUserProfile } from "../hooks/useUserProfile";
import ImportExportModal from "../features/settings/ImportExportModal";
import EditProfileModal from "../features/settings/EditProfileModal";
import { useToast } from "../components/ui/Toast";
import {
    LogOut,
    Database,
    Share2,
    User,
    Settings as SettingsIcon,
    Edit2,
    RotateCw,
    Globe,
    Users,
    Lock,
    Monitor,
    LayoutGrid,
    BarChart3,
    RefreshCw,
    Download,
} from "lucide-react";
import { ref, update, get, set } from "firebase/database";
import { db } from "../lib/firebase";
import { migrateUserMovies } from "../lib/migrateDatabase";
import { useWatchProviderCountry } from "../hooks/useWatchProviderCountry";
import { useRecentlyAddedSettings } from "../hooks/useRecentlyAddedSettings";
import { useTheme } from "../contexts/ThemeContext";
import { useRefreshMetadata } from "../contexts/RefreshMetadataContext";

export default function Settings() {
    const { user, logout } = useAuth();
    const { profile } = useUserProfile(user?.uid);
    const { movies, addMovie, removeMovie } = useMovies();
    const watchProviderCountry = useWatchProviderCountry();
    const { theme, setTheme } = useTheme();
    const {
        recentlyAddedDays,
        setRecentlyAddedDays,
        showRecentlyAddedSection,
        setShowRecentlyAddedSection,
    } = useRecentlyAddedSettings();
    const { toast } = useToast();
    const {
        isRefreshing: refreshingMetadata,
        progress: metadataProgress,
        startRefreshMetadata,
    } = useRefreshMetadata();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [migrating, setMigrating] = useState(false);

    const [friendsVisibility, setFriendsVisibility] = useState("friends");
    const [loadingPrivacy, setLoadingPrivacy] = useState(true);

    const [gridSize, setGridSize] = useState(() => {
        try {
            const saved = localStorage.getItem("mt_gridSize");
            return saved ? JSON.parse(saved) : "normal";
        } catch (e) {
            return "normal";
        }
    });

    const [streakThreshold, setStreakThreshold] = useState(2);
    const [tvStreakThreshold, setTvStreakThreshold] = useState(5);
    const [loadingStats, setLoadingStats] = useState(true);

    const handleGridSizeChange = (newSize) => {
        setGridSize(newSize);
        localStorage.setItem("mt_gridSize", JSON.stringify(newSize));
        window.dispatchEvent(
            new CustomEvent("localStorageChange", {
                detail: { key: "mt_gridSize", value: newSize },
            }),
        );
        toast({
            title: "Grid Size Updated",
            description: `Layout set to ${newSize} mode.`,
        });
    };

    useEffect(() => {
        if (!user) return;
        const fetchPrivacy = async () => {
            const snap = await get(
                ref(db, `users/${user.uid}/settings/privacy`),
            );
            if (snap.exists()) {
                setFriendsVisibility(snap.val().friendsVisibility || "friends");
            }
            setLoadingPrivacy(false);
        };
        fetchPrivacy();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const fetchStats = async () => {
            const movieSnap = await get(
                ref(db, `users/${user.uid}/settings/stats/streakThreshold`),
            );
            if (movieSnap.exists()) {
                setStreakThreshold(movieSnap.val());
            }

            const tvSnap = await get(
                ref(db, `users/${user.uid}/settings/stats/tvStreakThreshold`),
            );
            if (tvSnap.exists()) {
                setTvStreakThreshold(tvSnap.val());
            }

            setLoadingStats(false);
        };
        fetchStats();
    }, [user]);

    const handlePrivacyChange = async (newVal) => {
        if (newVal === friendsVisibility) return;
        const oldVal = friendsVisibility;
        setFriendsVisibility(newVal);
        try {
            await set(
                ref(db, `users/${user.uid}/settings/privacy/friendsVisibility`),
                newVal,
            );
            toast({
                title: "Privacy Updated",
                description: `Visibility set to: ${
                    newVal === "public"
                        ? "Public"
                        : newVal === "friends"
                        ? "Friends Only"
                        : "Only Me"
                }`,
            });
        } catch (e) {
            console.error(e);
            setFriendsVisibility(oldVal);
            toast({
                title: "Update Failed",
                variant: "destructive",
            });
        }
    };

    const handleStreakThresholdChange = async (newVal) => {
        if (newVal === streakThreshold) return;
        const oldVal = streakThreshold;
        setStreakThreshold(newVal);
        try {
            await set(
                ref(db, `users/${user.uid}/settings/stats/streakThreshold`),
                newVal,
            );
            toast({
                title: "Streak Settings Updated",
                description: `Streak threshold set to ${newVal} movies per week`,
            });
        } catch (e) {
            console.error(e);
            setStreakThreshold(oldVal);
            toast({
                title: "Update Failed",
                variant: "destructive",
            });
        }
    };

    const handleTvStreakThresholdChange = async (newVal) => {
        if (newVal === tvStreakThreshold) return;
        const oldVal = tvStreakThreshold;
        setTvStreakThreshold(newVal);
        try {
            await set(
                ref(db, `users/${user.uid}/settings/stats/tvStreakThreshold`),
                newVal,
            );
            toast({
                title: "TV Streak Settings Updated",
                description: `TV streak threshold set to ${newVal} episodes per week`,
            });
        } catch (e) {
            console.error(e);
            setTvStreakThreshold(oldVal);
            toast({
                title: "Update Failed",
                variant: "destructive",
            });
        }
    };

    const handleWatchProviderCountryChange = async (newCountry) => {
        if (!user || newCountry === watchProviderCountry) return;
        try {
            await set(
                ref(db, `users/${user.uid}/settings/watchProviderCountry`),
                newCountry,
            );
            toast({
                title: "Region Updated",
                description:
                    "Streaming availability will use this region for new metadata.",
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "Update Failed",
                variant: "destructive",
            });
        }
    };

    const displayPfp = profile?.pfp || user?.photoURL;
    const displayUsername = profile?.username || user?.displayName || "User";
    const displayName = profile?.displayName || user?.displayName || "User";

    const handleShareShelf = () => {
        if (!user) return;
        const url = `https://radar-watchlist.web.app/u/${user.uid}`;
        navigator.clipboard.writeText(url);
        toast({
            title: "Link Copied!",
            description: "Public shelf link copied to your clipboard.",
            variant: "default",
        });
    };

    const handleRepairSearch = async () => {
        if (!user || !profile) return;
        setRefreshing(true);
        try {
            const updates = {};
            const indexData = {
                username: profile.username,
                displayName: profile.displayName || user.displayName || "User",
                pfp: profile.pfp || "",
            };
            updates[`userSearchIndex/${user.uid}`] = indexData;

            if (profile.username) {
                updates[`usernames/${profile.username}`] = user.uid;
            }

            await update(ref(db), updates);
            toast({
                title: "Search Index Repaired",
                description: "Your profile should now be discoverable.",
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "Repair Failed",
                description: e.message,
                variant: "destructive",
            });
        } finally {
            setRefreshing(false);
        }
    };

    const handleMigrateDatabase = async () => {
        if (!user) return;
        setMigrating(true);
        try {
            const result = await migrateUserMovies(user.uid);
            toast({
                title: result.success
                    ? "Migration Complete"
                    : "Migration Failed",
                description: result.message,
                variant: result.success ? "default" : "destructive",
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "Migration Failed",
                description: e.message,
                variant: "destructive",
            });
        } finally {
            setMigrating(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-muted">
            <Navbar />

            <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 pt-10 pb-24">
                <EditProfileModal
                    isOpen={isEditProfileOpen}
                    onClose={() => setIsEditProfileOpen(false)}
                />

                {/* Profile Header */}
                <section className="mb-16 border-b border-border pb-10">
                    <div className="flex items-center gap-2 mb-6">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                            Account
                        </h2>
                    </div>

                    <div className="flex items-center gap-6 mb-8">
                        {displayPfp ? (
                            <img
                                src={displayPfp}
                                alt={displayUsername}
                                className="w-20 h-20 rounded-full border-2 border-border object-cover"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-muted border-2 border-border flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                                {displayUsername?.[0] || "?"}
                            </div>
                        )}
                        <div>
                            <p className="text-3xl font-bold tracking-tight text-foreground mb-1">
                                {displayName}
                            </p>
                            <p className="text-sm text-muted-foreground font-medium">
                                @{displayUsername}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                {user?.email}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                            onClick={() => setIsEditProfileOpen(true)}
                            className="flex items-center gap-3 px-5 py-4 rounded-lg bg-card border border-border hover:border-border hover:bg-muted/80 transition-all text-left group"
                        >
                            <Edit2 className="w-5 h-5 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                            <span className="text-sm font-semibold text-foreground">
                                Edit Profile
                            </span>
                        </button>

                        <button
                            onClick={handleShareShelf}
                            className="flex items-center gap-3 px-5 py-4 rounded-lg bg-card border border-border hover:border-border hover:bg-muted/80 transition-all text-left group"
                        >
                            <Share2 className="w-5 h-5 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                            <span className="text-sm font-semibold text-foreground">
                                Share Public Shelf
                            </span>
                        </button>

                        <button
                            onClick={handleRepairSearch}
                            disabled={refreshing}
                            className="flex items-center gap-3 px-5 py-4 rounded-lg bg-card border border-border hover:border-border hover:bg-muted/80 transition-all text-left group disabled:opacity-50"
                        >
                            <RotateCw
                                className={`w-5 h-5 text-muted-foreground group-hover:text-blue-400 transition-colors ${
                                    refreshing ? "animate-spin" : ""
                                }`}
                            />
                            <span className="text-sm font-semibold text-foreground">
                                Repair Account Visibility
                            </span>
                        </button>

                        <button
                            onClick={handleMigrateDatabase}
                            disabled={migrating}
                            className="flex items-center gap-3 px-5 py-4 rounded-lg bg-card border border-border hover:border-border hover:bg-muted/80 transition-all text-left group disabled:opacity-50"
                        >
                            <RefreshCw
                                className={`w-5 h-5 text-muted-foreground group-hover:text-green-400 transition-colors ${
                                    migrating ? "animate-spin" : ""
                                }`}
                            />
                            <span className="text-sm font-semibold text-foreground">
                                Migrate Database
                            </span>
                        </button>
                    </div>

                    <button
                        onClick={logout}
                        className="mt-3 w-full flex items-center justify-center gap-3 px-5 py-4 rounded-lg bg-card border border-border hover:border-red-500/50 hover:bg-red-950/30 transition-all group"
                    >
                        <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-red-400 transition-colors" />
                        <span className="text-sm font-semibold text-foreground group-hover:text-red-400 transition-colors">
                            Sign Out
                        </span>
                    </button>
                </section>

                {/* Main Settings Grid */}
                <div className="grid lg:grid-cols-2 gap-16 lg:gap-20">
                    {/* Left Column */}
                    <div className="space-y-16">
                        {/* Privacy */}
                        <section>
                            <div className="flex items-center gap-2 mb-6">
                                <Globe className="w-5 h-5 text-muted-foreground" />
                                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                    Privacy
                                </h2>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
                                    Friends List Visibility
                                </h3>
                                <p className="text-sm text-muted-foreground font-medium">
                                    Control who can see your friends on your
                                    public profile
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => handlePrivacyChange("noone")}
                                    disabled={loadingPrivacy}
                                    className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all ${
                                        friendsVisibility === "noone"
                                            ? "bg-red-500/20 border-red-500/50 text-foreground"
                                            : "bg-card border-border text-muted-foreground hover:border-border hover:text-foreground"
                                    }`}
                                >
                                    <Lock className="w-6 h-6 mb-2" />
                                    <span className="text-sm font-bold">
                                        Only Me
                                    </span>
                                </button>

                                <button
                                    onClick={() =>
                                        handlePrivacyChange("friends")
                                    }
                                    disabled={loadingPrivacy}
                                    className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all ${
                                        friendsVisibility === "friends"
                                            ? "bg-blue-500/20 border-blue-500/50 text-foreground"
                                            : "bg-card border-border text-muted-foreground hover:border-border hover:text-foreground"
                                    }`}
                                >
                                    <Users className="w-6 h-6 mb-2" />
                                    <span className="text-sm font-bold">
                                        Friends
                                    </span>
                                </button>

                                <button
                                    onClick={() =>
                                        handlePrivacyChange("public")
                                    }
                                    disabled={loadingPrivacy}
                                    className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all ${
                                        friendsVisibility === "public"
                                            ? "bg-blue-500/20 border-blue-500/50 text-foreground"
                                            : "bg-card border-border text-muted-foreground hover:border-border hover:text-foreground"
                                    }`}
                                >
                                    <Globe className="w-6 h-6 mb-2" />
                                    <span className="text-sm font-bold">
                                        Public
                                    </span>
                                </button>
                            </div>
                        </section>

                        {/* Appearance */}
                        <section>
                            <div className="flex items-center gap-2 mb-6">
                                <Monitor className="w-5 h-5 text-muted-foreground" />
                                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                    Appearance
                                </h2>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
                                    Theme
                                </h3>
                                <p className="text-sm text-muted-foreground font-medium mb-3">
                                    Dark, light, or follow system
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        {
                                            value: "dark",
                                            label: "Dark",
                                        },
                                        {
                                            value: "light",
                                            label: "Light",
                                        },
                                        {
                                            value: "system",
                                            label: "System",
                                        },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setTheme(opt.value)}
                                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                                                theme === opt.value
                                                    ? "bg-blue-500/20 border-blue-500/50 text-foreground"
                                                    : "bg-card border-border text-muted-foreground hover:border-border hover:text-foreground"
                                            }`}
                                        >
                                            <span className="text-sm font-bold">
                                                {opt.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
                                    Grid Size
                                </h3>
                                <p className="text-sm text-muted-foreground font-medium">
                                    Adjust the size of cards in the grid view
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() =>
                                        handleGridSizeChange("compact")
                                    }
                                    className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all ${
                                        gridSize === "compact"
                                            ? "bg-blue-500/20 border-blue-500/50 text-foreground"
                                            : "bg-card border-border text-muted-foreground hover:border-border hover:text-foreground"
                                    }`}
                                >
                                    <LayoutGrid className="w-6 h-6 mb-2 scale-75" />
                                    <span className="text-sm font-bold">
                                        Compact
                                    </span>
                                </button>

                                <button
                                    onClick={() =>
                                        handleGridSizeChange("normal")
                                    }
                                    className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all ${
                                        gridSize === "normal"
                                            ? "bg-blue-500/20 border-blue-500/50 text-foreground"
                                            : "bg-card border-border text-muted-foreground hover:border-border hover:text-foreground"
                                    }`}
                                >
                                    <LayoutGrid className="w-6 h-6 mb-2" />
                                    <span className="text-sm font-bold">
                                        Normal
                                    </span>
                                </button>

                                <button
                                    onClick={() =>
                                        handleGridSizeChange("large")
                                    }
                                    className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all ${
                                        gridSize === "large"
                                            ? "bg-blue-500/20 border-blue-500/50 text-foreground"
                                            : "bg-card border-border text-muted-foreground hover:border-border hover:text-foreground"
                                    }`}
                                >
                                    <LayoutGrid className="w-6 h-6 mb-2 scale-125" />
                                    <span className="text-sm font-bold">
                                        Large
                                    </span>
                                </button>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
                                    Recently Added Section
                                </h3>
                                <p className="text-sm text-muted-foreground font-medium mb-3">
                                    Show a "Recently added" block on Home and how many days to include
                                </p>
                                <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showRecentlyAddedSection}
                                            onChange={(e) =>
                                                setShowRecentlyAddedSection(
                                                    e.target.checked,
                                                )
                                            }
                                            className="rounded border-border bg-card text-primary focus:ring-blue-500/50"
                                        />
                                        <span className="text-sm text-foreground">
                                            Show recently added section
                                        </span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Period:</span>
                                        <select
                                            value={recentlyAddedDays}
                                            onChange={(e) =>
                                                setRecentlyAddedDays(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="bg-card border border-border text-foreground px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        >
                                            <option value={7}>7 days</option>
                                            <option value={14}>14 days</option>
                                            <option value={30}>30 days</option>
                                            <option value={90}>90 days</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-16">
                        {/* Stats */}
                        <section>
                            <div className="flex items-center gap-2 mb-6">
                                <BarChart3 className="w-5 h-5 text-muted-foreground" />
                                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                    Stats
                                </h2>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
                                        Movie Streak Threshold
                                    </h3>
                                    <p className="text-sm text-muted-foreground font-medium mb-4">
                                        Set how many movies per week to maintain
                                        your streak
                                    </p>

                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={streakThreshold}
                                            onChange={(e) => {
                                                const val =
                                                    parseInt(e.target.value) ||
                                                    1;
                                                if (val >= 1 && val <= 50) {
                                                    handleStreakThresholdChange(
                                                        val,
                                                    );
                                                }
                                            }}
                                            disabled={loadingStats}
                                            className="w-24 px-4 py-3 bg-card border-2 border-border rounded-lg text-foreground text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        />
                                        <span className="text-sm text-muted-foreground font-semibold">
                                            movies per week
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
                                        TV Show Streak Threshold
                                    </h3>
                                    <p className="text-sm text-muted-foreground font-medium mb-4">
                                        Set how many episodes per week to
                                        maintain your TV streak
                                    </p>

                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={tvStreakThreshold}
                                            onChange={(e) => {
                                                const val =
                                                    parseInt(e.target.value) ||
                                                    1;
                                                if (val >= 1 && val <= 100) {
                                                    handleTvStreakThresholdChange(
                                                        val,
                                                    );
                                                }
                                            }}
                                            disabled={loadingStats}
                                            className="w-24 px-4 py-3 bg-card border-2 border-border rounded-lg text-foreground text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                        />
                                        <span className="text-sm text-muted-foreground font-semibold">
                                            episodes per week
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Data & Privacy */}
                        <section>
                            <div className="flex items-center gap-2 mb-6">
                                <Database className="w-5 h-5 text-muted-foreground" />
                                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                    Data Management
                                </h2>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
                                    Where to Watch Region
                                </h3>
                                <p className="text-sm text-muted-foreground font-medium mb-3">
                                    Country used when fetching streaming
                                    availability from TMDB (for new adds and
                                    refresh).
                                </p>
                                <select
                                    value={watchProviderCountry}
                                    onChange={(e) =>
                                        handleWatchProviderCountryChange(
                                            e.target.value,
                                        )
                                    }
                                    className="w-full max-w-xs bg-card border border-border text-foreground px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                                >
                                    <option value="US">United States</option>
                                    <option value="GB">United Kingdom</option>
                                    <option value="CA">Canada</option>
                                    <option value="DE">Germany</option>
                                    <option value="FR">France</option>
                                    <option value="ES">Spain</option>
                                    <option value="IT">Italy</option>
                                    <option value="AU">Australia</option>
                                    <option value="BR">Brazil</option>
                                    <option value="MX">Mexico</option>
                                    <option value="NL">Netherlands</option>
                                    <option value="PL">Poland</option>
                                    <option value="JP">Japan</option>
                                    <option value="KR">South Korea</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={startRefreshMetadata}
                                    disabled={refreshingMetadata}
                                    className="w-full flex items-center justify-between px-5 py-4 rounded-lg bg-card border border-border hover:border-border hover:bg-muted/80 transition-all text-left group disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <Download
                                            className={`w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors ${
                                                refreshingMetadata
                                                    ? "animate-bounce"
                                                    : ""
                                            }`}
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">
                                                Refresh All Metadata
                                            </p>
                                            <p className="text-xs text-muted-foreground font-medium">
                                                {refreshingMetadata
                                                    ? `${metadataProgress.current} of ${metadataProgress.total}`
                                                    : "Update from TMDB"}
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="w-full flex items-center justify-between px-5 py-4 rounded-lg bg-card border border-border hover:border-border hover:bg-muted/80 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Database className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">
                                                Import / Export Data
                                            </p>
                                            <p className="text-xs text-muted-foreground font-medium">
                                                Backup or restore library
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            <ImportExportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                user={user}
                movies={movies}
                addMovie={addMovie}
                removeMovie={removeMovie}
            />
        </div>
    );
}
