import { SmoothDecadeBar } from "./SmoothDecadeBar";

export function ReleaseEras() {
    return (
        <section>
            <h3 className="text-2xl font-bold tracking-tight mb-8">
                Release Eras
            </h3>
            <div className="flex items-end justify-between h-48 gap-2 mt-4 px-2">
                <SmoothDecadeBar decade="1980s" count={23} max={89} />
                <SmoothDecadeBar decade="1990s" count={45} max={89} />
                <SmoothDecadeBar decade="2000s" count={78} max={89} />
                <SmoothDecadeBar decade="2010s" count={89} max={89} />
                <SmoothDecadeBar decade="2020s" count={67} max={89} />
            </div>
        </section>
    );
}
