// StarRating Component
// Allows 0-5 stars with 0.5 granularity.
// Displays stars interactively.

import { Star, StarHalf, X } from "lucide-react";

export const StarRating = ({ value, onChange, label, showInput = false }) => {
    // value is 0-5
    const renderStars = () => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            const isFull = value >= i;
            const isHalf = value >= i - 0.5 && value < i;
            
            stars.push(
                <button
                    key={i}
                    type="button"
                    className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                    onClick={() => {
                        // Click logic: 
                        // If clicking explicitly on current value, maybe toggle?
                        // Simple 0.5 granularity logic:
                        // This UI is a bit tricky for half stars with just one button per star.
                        // Common pattern: Click once = full, Click again?
                        // Better: Two invisible tap zones or just simplified logic.
                        // Let's implement: Click sets to int(i). 
                        // To get 0.5, we might need a more complex UI or just let users click left/right half.
                        // For simplicity in this iteration: Left side of star = X.5, Right side = X.0
                        // Since we can't easily detect click coordinate inside the button without refs and rects, 
                        // let's try a simpler approach: 
                        // click -> sets to i. 
                        // if value is already i, set to i - 0.5.
                        // if value is already i - 0.5, set to 0 (or clear).
                        
                        if (value === i) {
                            onChange(i - 0.5);
                        } else if (value === i - 0.5) {
                            onChange(0); // Cycle to 0 or remove? maybe just 0
                        } else {
                            onChange(i);
                        }
                    }}
                >
                    <div className="relative">
                        <Star 
                            size={18} 
                            className={`
                                ${isFull ? "fill-amber-400 text-amber-400" : "text-neutral-600"}
                                ${(isHalf && !isFull) ? "text-amber-400" : ""}
                            `} 
                        />
                         {/* Half Star Overlay */}
                        {isHalf && (
                             <div className="absolute inset-0 overflow-hidden w-[50%]">
                                <Star size={18} className="fill-amber-400 text-amber-400" />
                             </div>
                        )}
                        {/* Empty star overlay for half to show the empty right side? 
                            Actually if isHalf is true, the base star is text-amber-400 (outline) 
                            and we overlay a filled half star.
                            Wait, `text-amber-400` is the outline color. `fill-amber-400` is fill.
                            
                            Let's refine:
                            Base: Empty Star (text-neutral-600)
                            If Full: Fill amber, Text amber.
                            If Half: Base is Empty. Overlay Left Half Filled.
                        */}
                    </div>
                </button>
            );
        }
        return stars;
    };

    return (
        <div className="flex items-center gap-3">
             <div className="w-20 text-xs text-neutral-400 capitalize truncate" title={label}>{label}</div>
             <div className="flex gap-1">
                 {(() => {
                    const stars = [];
                    for (let i = 1; i <= 5; i++) {
                        let fillPercentage = 0;
                        if (value >= i) {
                            fillPercentage = 100;
                        } else if (value > i - 1) {
                            fillPercentage = (value - (i - 1)) * 100;
                        }

                        stars.push(
                            <button
                                key={i}
                                type="button"
                                className="relative focus:outline-none transition-transform hover:scale-110 active:scale-90"
                                onClick={() => {
                                    // Click interactions still snap to .5 or Integer as per user preference (or we can just keep previous logic)
                                    // User said "user clicks can give every .5"
                                    if (value === i) onChange(i - 0.5);
                                    else if (value === i - 0.5) onChange(i);
                                    else onChange(i);
                                }}
                            >
                                {/* Background Star (Empty/Outline) */}
                                <Star size={20} className="text-neutral-700" />
                                
                                {/* Foreground Star (Filled, Clipped) */}
                                {fillPercentage > 0 && (
                                     <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercentage}%` }}>
                                         <Star size={20} className="fill-amber-400 text-amber-400" />
                                     </div>
                                )}
                            </button>
                        )
                    }
                    return stars;
                 })()}
             </div>
             {showInput && (
                 <input 
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={value === 0 ? "" : value}
                    onChange={(e) => {
                        let v = parseFloat(e.target.value);
                        if (isNaN(v)) v = 0;
                        if (v > 5) v = 5;
                        onChange(v);
                    }}
                    className="w-14 bg-neutral-800 border border-neutral-700 text-white text-xs px-2 py-1 rounded text-center focus:outline-none focus:border-amber-500/50"
                    placeholder="-"
                 />
             )}

             {value > 0 && (
                 <button
                    type="button"
                    onClick={() => onChange(0)}
                    className="p-1 text-neutral-500 hover:text-red-400 transition-colors focus:outline-none"
                    title="Clear rating"
                 >
                    <X size={16} />
                 </button>
             )}
        </div>
    )
}
