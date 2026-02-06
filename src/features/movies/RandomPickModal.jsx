import { useState, useEffect, useRef } from "react";
import { X, Play, Clapperboard, Shuffle } from "lucide-react";
import Logo from "../../components/ui/Logo";

export default function RandomPickModal({ isOpen, onClose, movies, onSelect }) {
  const [currentMovie, setCurrentMovie] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    if (isOpen && movies.length > 0) {
      startSpin();
    } else {
        // Reset when closed
        setWinner(null);
        setIsSpinning(false);
    }
  }, [isOpen]);

  const startSpin = () => {
    setIsSpinning(true);
    setWinner(null);
    
    // Pick winner immediately but don't show yet
    const winningIndex = Math.floor(Math.random() * movies.length);
    const winningMovie = movies[winningIndex];

    let speed = 50;
    let counter = 0;
    const maxSpins = 30; // How many flips before stopping
    
    const spin = () => {
      // Show random movie while spinning
      const randomIndex = Math.floor(Math.random() * movies.length);
      setCurrentMovie(movies[randomIndex]);

      counter++;
      
      if (counter < maxSpins) {
        // Slow down exponentially at the end
        if (counter > maxSpins - 10) {
            speed *= 1.2;
        }
        setTimeout(spin, speed);
      } else {
        // Stop on winner
        setCurrentMovie(winningMovie);
        setWinner(winningMovie);
        setIsSpinning(false);
      }
    };
    
    spin();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
       <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
       >
         <X size={24} />
       </button>

       <div className="flex flex-col items-center justify-center w-full max-w-md p-6 space-y-8">
            <div className="text-center space-y-2">
                <Shuffle size={48} className={`mx-auto text-blue-500 mb-4 ${isSpinning ? 'animate-spin-slow' : ''}`} />
                <h2 className="text-2xl font-bold text-white">
                    {isSpinning ? "Picking a movie..." : "You should watch"}
                </h2>
            </div>
            
            {/* Card Container */}
            <div className={`relative aspect-[2/3] w-64 bg-neutral-900 rounded-xl shadow-2xl overflow-hidden border-4 ${isSpinning ? 'border-neutral-800' : 'border-blue-500 shadow-[0_0_50px_rgba(16,185,129,0.4)]'} transition-all duration-300`}>
                {currentMovie ? (
                    <>
                        {currentMovie.coverUrl ? (
                            <img src={currentMovie.coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-700">
                                <Clapperboard size={64} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent opacity-90" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="text-xl font-bold text-white leading-tight drop-shadow-md">{currentMovie.title}</h3>
                            <p className="text-blue-400 font-medium truncate drop-shadow-md">
                                {Array.isArray(currentMovie.director) ? currentMovie.director.join(", ") : currentMovie.director || currentMovie.artist}
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-neutral-500">
                        No movies found
                    </div>
                )}
            </div>

            {!isSpinning && winner && (
                <div className="flex gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
                     <button
                        onClick={startSpin}
                        className="px-6 py-3 rounded-full bg-neutral-800 text-white font-medium hover:bg-neutral-700 transition-colors"
                     >
                        Spin Again
                     </button>
                </div>
            )}
       </div>
    </div>
  );
}
