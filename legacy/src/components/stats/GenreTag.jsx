import { useNavigate } from "react-router-dom";

const GENRE_IDS = {
    Action: 28,
    Adventure: 12,
    Animation: 16,
    Comedy: 35,
    Crime: 80,
    Documentary: 99,
    Drama: 18,
    Family: 10751,
    Fantasy: 14,
    History: 36,
    Horror: 27,
    Music: 10402,
    Mystery: 9648,
    Romance: 10749,
    "Science Fiction": 878,
    "TV Movie": 10770,
    Thriller: 53,
    War: 10752,
    Western: 37,
};

export function GenreTag({ name, count, rank }) {
    const navigate = useNavigate();

    const styles = {
        top: "border-zinc-400 bg-zinc-800/30 text-zinc-100",
        high: "border-zinc-700 bg-transparent text-zinc-300",
        mid: "border-zinc-800 bg-transparent text-zinc-400",
        low: "border-zinc-900 bg-transparent text-zinc-600",
    };

    const genreId = GENRE_IDS[name];
    const handleClick = () => {
        if (genreId) {
            navigate(`/genre/${genreId}`);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full border ${
                styles[rank]
            } hover:border-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/50 transition-all ${
                genreId ? "cursor-pointer" : "cursor-default"
            }`}
        >
            <span className="font-medium text-sm">{name}</span>
            <div className="w-1 h-1 rounded-full bg-current opacity-30" />
            <span className="text-xs font-semibold opacity-70">{count}</span>
        </div>
    );
}
