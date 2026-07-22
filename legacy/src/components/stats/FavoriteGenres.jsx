import { GenreTag } from "./GenreTag";

export function FavoriteGenres() {
    return (
        <section>
            <h3 className="text-2xl font-bold tracking-tight mb-8">
                Favorite Genres
            </h3>
            <div className="flex flex-wrap gap-3">
                <GenreTag name="Action & Adventure" count={89} rank="top" />
                <GenreTag name="Psychological Drama" count={76} rank="top" />
                <GenreTag name="Dark Comedy" count={54} rank="high" />
                <GenreTag name="Mystery Thriller" count={43} rank="high" />
                <GenreTag name="Science Fiction" count={38} rank="mid" />
                <GenreTag name="Documentary" count={24} rank="mid" />
                <GenreTag name="Horror" count={19} rank="low" />
                <GenreTag name="Romance" count={12} rank="low" />
                <GenreTag name="Animation" count={8} rank="low" />
            </div>
        </section>
    );
}
