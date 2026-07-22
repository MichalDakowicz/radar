import { Shuffle } from 'lucide-react-native';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MovieCard } from '@/components/media/MovieCard';
import { BottomSheetModal, Sheet } from '@/components/ui/Sheet';
import type { Movie } from '@/types/movie';

// Ported from legacy RandomPickModal.jsx - same spin algorithm (winner chosen
// up front, decelerating flips before landing on it).
type RandomPickSheetProps = {
  movies: Movie[];
  onSelect: (movie: Movie) => void;
};

export const RandomPickSheet = forwardRef<BottomSheetModal, RandomPickSheetProps>(function RandomPickSheet(
  { movies, onSelect },
  ref,
) {
  const [current, setCurrent] = useState<Movie | null>(null);
  const [winner, setWinner] = useState<Movie | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startSpin = useCallback(() => {
    if (movies.length === 0) return;
    setIsSpinning(true);
    setWinner(null);

    const winningMovie = movies[Math.floor(Math.random() * movies.length)];
    let speed = 50;
    let counter = 0;
    const maxSpins = 30;

    const spin = () => {
      setCurrent(movies[Math.floor(Math.random() * movies.length)]);
      counter++;
      if (counter < maxSpins) {
        if (counter > maxSpins - 10) speed *= 1.2;
        timeoutRef.current = setTimeout(spin, speed);
      } else {
        setCurrent(winningMovie);
        setWinner(winningMovie);
        setIsSpinning(false);
      }
    };
    spin();
  }, [movies]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <Sheet
      ref={ref}
      snapPoints={['70%']}
      onDismiss={() => clearTimeout(timeoutRef.current)}
      onChange={(index) => {
        if (index >= 0 && !winner && !isSpinning) startSpin();
      }}
    >
      <View className="flex-1 items-center gap-6 p-6">
        <View className="items-center gap-2">
          <Shuffle size={40} color="hsl(217 91% 60%)" />
          <Text className="text-xl font-bold text-foreground">{isSpinning ? 'Picking a movie…' : 'You should watch'}</Text>
        </View>

        <View
          className="w-56 overflow-hidden rounded-xl border-4"
          style={{ aspectRatio: 2 / 3, borderColor: isSpinning ? '#262626' : 'hsl(217 91% 60%)' }}
        >
          {current ? (
            <MovieCard movie={current} variant="poster" showStatus={false} showRatings={false} readOnly />
          ) : (
            <View className="flex-1 items-center justify-center bg-neutral-900">
              <Text className="text-neutral-500">No eligible titles</Text>
            </View>
          )}
        </View>

        {!isSpinning && winner && (
          <View className="w-full flex-row gap-3">
            <Pressable onPress={startSpin} className="flex-1 items-center rounded-full bg-secondary py-3 active:opacity-80">
              <Text className="font-medium text-foreground">Spin again</Text>
            </Pressable>
            <Pressable onPress={() => onSelect(winner)} className="flex-1 items-center rounded-full bg-primary py-3 active:opacity-80">
              <Text className="font-medium text-primary-foreground">Open</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Sheet>
  );
});
