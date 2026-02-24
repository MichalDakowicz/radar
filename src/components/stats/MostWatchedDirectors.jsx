import { DirectorItem } from "./DirectorItem";

export function MostWatchedDirectors() {
    return (
        <section>
            <h3 className="text-2xl font-bold tracking-tight mb-8">
                Most Watched Directors
            </h3>
            <div className="flex flex-col gap-1">
                <DirectorItem name="Christopher Nolan" count={12} max={12} />
                <DirectorItem name="Quentin Tarantino" count={10} max={12} />
                <DirectorItem name="Martin Scorsese" count={9} max={12} />
                <DirectorItem name="Steven Spielberg" count={8} max={12} />
                <DirectorItem name="Denis Villeneuve" count={7} max={12} />
            </div>
        </section>
    );
}
