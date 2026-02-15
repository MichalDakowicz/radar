import { getServiceStyle } from "../../../lib/services";

const ServiceIcon = ({ id }) => {
    const map = {
        Netflix: "/icons/netflix.svg",
        "Prime Video": "/icons/primevideo.svg",
        "Disney+": "/icons/disneyplus.svg",
        Hulu: "/icons/hulu.svg",
        Max: "/icons/max.svg",
        "Apple TV+": "/icons/appletv.svg",
        "Paramount+": "/icons/paramountplus.svg",
        Fubo: "/icons/fubo.svg",
        "Criterion Channel": "/icons/criterion.svg",
    };
    const src = map[id];
    if (!src)
        return (
            <div className="h-6 w-6 rounded-full bg-neutral-700 font-bold text-[10px] flex items-center justify-center text-white">
                {id.substring(0, 2)}
            </div>
        );
    return (
        <img src={src} className="h-6 w-6 rounded-full object-cover" alt={id} />
    );
};

export default function EditMovieAvailability({
    availability,
    toggleAvailability,
}) {
    const services = [
        "Netflix",
        "Prime Video",
        "Disney+",
        "Hulu",
        "Max",
        "Apple TV+",
        "Paramount+",
        "Fubo",
        "Criterion Channel",
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-neutral-500 uppercase">
                Available On
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {services.map((id) => {
                    const isSelected = availability.includes(id);
                    const style = getServiceStyle(id);
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => toggleAvailability(id)}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl border text-sm transition-all text-left ${
                                isSelected
                                    ? `${style.bg} ${style.text} ${style.border}`
                                    : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                            }`}
                        >
                            <ServiceIcon id={id} />
                            <span className="font-medium truncate">{id}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
