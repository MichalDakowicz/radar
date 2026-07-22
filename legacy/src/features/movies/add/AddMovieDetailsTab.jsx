import { Calculator } from "lucide-react";
import { StarRating } from "../StarRating";

export default function AddMovieDetailsTab({
    type,
    numberOfSeasons,
    overallRating,
    setOverallRating,
    ratings,
    setRatings,
    seasonRatings,
    setSeasonRatings,
    notes,
    setNotes,
    voteAverage,
}) {
    const handleRecalculate = () => {
        if (type === "tv") {
            const val = Object.values(seasonRatings || {})
                .map((s) => (typeof s === "object" ? s.overall : s))
                .filter((v) => v > 0);
            if (val.length > 0) {
                const avg = val.reduce((a, b) => a + b, 0) / val.length;
                setOverallRating(parseFloat(avg.toFixed(1)));
            }
        } else {
            const val = Object.values(ratings).filter((v) => v > 0);
            if (val.length > 0) {
                const avg = val.reduce((a, b) => a + b, 0) / val.length;
                setOverallRating(parseFloat(avg.toFixed(1)));
            }
        }
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                    Public Rating Score
                </label>
                <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 flex items-center gap-4">
                    <div className="text-2xl font-bold font-mono text-white">
                        {voteAverage > 0 ? voteAverage.toFixed(1) : "N/A"}
                    </div>
                    <div className="text-sm text-neutral-500">
                        Based on TMDb/IMDb votes (Read-only)
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                    Overall Rating
                </label>
                <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800 flex items-center justify-between">
                    <StarRating
                        label=""
                        value={overallRating}
                        onChange={(val) => {
                            setOverallRating(val);
                            if (val === 0 && type !== "tv")
                                setRatings((prev) =>
                                    Object.keys(prev).reduce(
                                        (acc, key) => ({
                                            ...acc,
                                            [key]: 0,
                                        }),
                                        {},
                                    ),
                                );
                        }}
                        showInput={true}
                    />
                    <button
                        type="button"
                        onClick={handleRecalculate}
                        className="px-4 py-2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors active:scale-95 text-xs font-medium flex items-center gap-2"
                    >
                        <Calculator size={16} /> {type === "tv" ? "Avg Seasons" : "Auto-Calc"}
                    </button>
                </div>
            </div>

            {type === "tv" ? (
                <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                        Season Ratings
                    </label>
                    <div className="space-y-4">
                        {Array.from({ length: numberOfSeasons || 1 }, (_, i) => i + 1).map((seasonNum) => {
                            const sRating = (seasonRatings || {})[seasonNum] || { overall: 0, story: 0, acting: 0, ending: 0, enjoyment: 0 };
                            const handleSeasonCategoryChange = (cat, newVal) => {
                                setSeasonRatings((prev) => ({
                                    ...prev,
                                    [seasonNum]: { ...(prev[seasonNum] || { overall: 0, story: 0, acting: 0, ending: 0, enjoyment: 0 }), [cat]: newVal },
                                }));
                            };
                            const handleSeasonAutoCalc = () => {
                                const cats = [sRating.story, sRating.acting, sRating.ending, sRating.enjoyment].filter((v) => v > 0);
                                if (cats.length > 0) {
                                    const avg = parseFloat((cats.reduce((a, b) => a + b, 0) / cats.length).toFixed(1));
                                    setSeasonRatings((prev) => ({
                                        ...prev,
                                        [seasonNum]: { ...(prev[seasonNum] || {}), overall: avg },
                                    }));
                                }
                            };
                            return (
                                <div key={seasonNum} className="bg-neutral-900/30 rounded-xl border border-neutral-800 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/50">
                                        <span className="text-sm font-bold text-white uppercase tracking-wide">Season {seasonNum}</span>
                                        <button
                                            type="button"
                                            onClick={handleSeasonAutoCalc}
                                            className="px-3 py-1 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors active:scale-95 text-xs font-medium flex items-center gap-1.5"
                                        >
                                            <Calculator size={13} /> Auto-Calc
                                        </button>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="bg-neutral-900/50 p-3 rounded-xl border border-neutral-800">
                                            <StarRating
                                                label="Overall"
                                                value={sRating.overall || 0}
                                                onChange={(newVal) => handleSeasonCategoryChange("overall", newVal)}
                                                showInput={true}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {["story", "acting", "ending", "enjoyment"].map((cat) => (
                                                <div key={cat} className="bg-neutral-900/30 p-3 rounded-xl border border-neutral-800">
                                                    <StarRating
                                                        label={cat}
                                                        value={sRating[cat] || 0}
                                                        onChange={(newVal) => handleSeasonCategoryChange(cat, newVal)}
                                                        showInput={false}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                        Category Breakdown
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(ratings).map(([key, val]) => (
                            <div
                                key={key}
                                className="bg-neutral-900/30 p-4 rounded-xl border border-neutral-800"
                            >
                                <StarRating
                                    label={key}
                                    value={val}
                                    onChange={(newVal) =>
                                        setRatings((prev) => ({
                                            ...prev,
                                            [key]: newVal,
                                        }))
                                    }
                                    showInput={false}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                    Personal Notes
                </label>
                <textarea
                    className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-50 text-base leading-relaxed placeholder:text-neutral-800"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Write your review or thoughts here..."
                />
            </div>
        </div>
    );
}
