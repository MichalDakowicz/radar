import { Image } from 'expo-image';
import { Shuffle } from 'lucide-react-native';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { MovieCard } from '@/components/media/MovieCard';
import { BottomSheetModal, Sheet } from '@/components/ui/Sheet';
import {
  SPIN_FRAMES,
  SPIN_WARMUP_TIMEOUT_MS,
  buildSpinReel,
  frameDelayMs,
  pickWinner,
  reelPosterUrls,
} from '@/lib/randomPick';
import type { Movie } from '@/types/movie';

// Ported from legacy RandomPickModal.jsx - same spin algorithm (winner chosen up
// front, decelerating flips before landing on it). The reel is now built and its
// posters prefetched before the first flip, because a 50ms flip is far too short
// for a cold TMDB image to arrive and the reel just span blank cards.
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
  const [isWarming, setIsWarming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Bumped on every start/dismiss so a warm-up that resolves late can't drive a
  // spin the user has already cancelled or restarted.
  const spinIdRef = useRef(0);

  const stopSpin = useCallback(() => {
    spinIdRef.current += 1;
    clearTimeout(timeoutRef.current);
    setIsSpinning(false);
    setIsWarming(false);
  }, []);

  const startSpin = useCallback(() => {
    const winningMovie = pickWinner(movies);
    if (!winningMovie) return;

    spinIdRef.current += 1;
    const spinId = spinIdRef.current;
    clearTimeout(timeoutRef.current);
    setWinner(null);
    setIsSpinning(true);
    setIsWarming(true);

    const reel = buildSpinReel(movies, winningMovie, SPIN_FRAMES);

    const runReel = () => {
      if (spinIdRef.current !== spinId) return;
      setIsWarming(false);

      let frame = 0;
      const showFrame = () => {
        if (spinIdRef.current !== spinId) return;
        setCurrent(reel[frame]);
        frame++;
        if (frame < reel.length) {
          timeoutRef.current = setTimeout(showFrame, frameDelayMs(frame, reel.length));
        } else {
          setWinner(winningMovie);
          setIsSpinning(false);
        }
      };
      showFrame();
    };

    const posters = reelPosterUrls(reel);
    if (posters.length === 0) {
      runReel();
      return;
    }

    // Whichever comes first: every poster in the reel cached, or the timeout -
    // a slow connection delays the spin, it never blocks it.
    const warmed = Image.prefetch(posters, { cachePolicy: 'memory-disk' });
    const timedOut = new Promise((resolve) => setTimeout(resolve, SPIN_WARMUP_TIMEOUT_MS));
    void Promise.race([warmed, timedOut]).then(runReel, runReel);
  }, [movies]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <Sheet
      ref={ref}
      snapPoints={['70%']}
      onDismiss={stopSpin}
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
          {isWarming ? (
            <View className="flex-1 items-center justify-center bg-neutral-900">
              <ActivityIndicator color="hsl(217 91% 60%)" />
            </View>
          ) : current ? (
            // No crossfade while spinning: a 200ms fade over a 50ms flip never
            // finishes, which is the other half of why the reel looked blank.
            <MovieCard
              movie={current}
              variant="poster"
              showStatus={false}
              showRatings={false}
              readOnly
              posterTransitionMs={isSpinning ? 0 : 200}
            />
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
