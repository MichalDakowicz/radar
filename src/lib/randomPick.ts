// Random-pick reel (features/library/RandomPickSheet). The spin used to draw a
// fresh random title every 50ms straight from the library, so every frame was a
// cache miss and the reel flicked through blank cards until the deceleration
// gave the network time to catch up. Building the whole reel up front means its
// posters can be prefetched before the first flip.

import type { Movie } from '@/types/movie';

/** Frames in one spin, last of them the winner. */
export const SPIN_FRAMES = 30;

/** How many closing frames ease out instead of running at full speed. */
export const SPIN_SLOW_FRAMES = 10;

export const SPIN_START_SPEED_MS = 50;
export const SPIN_SPEED_FACTOR = 1.2;

/** Longest wait for posters to warm before spinning anyway. */
export const SPIN_WARMUP_TIMEOUT_MS = 1200;

export function pickWinner(movies: Movie[], rand: () => number = Math.random): Movie | null {
  if (movies.length === 0) return null;
  return movies[Math.min(movies.length - 1, Math.floor(rand() * movies.length))];
}

/**
 * The exact titles the reel will show, winner last. Consecutive frames never
 * repeat a title, so every flip is visible.
 */
export function buildSpinReel(movies: Movie[], winner: Movie, frames = SPIN_FRAMES, rand: () => number = Math.random): Movie[] {
  if (frames <= 1 || movies.length <= 1) return [winner];

  const reel: Movie[] = [];
  for (let i = 0; i < frames - 1; i++) {
    const previousId = reel.length > 0 ? reel[reel.length - 1].id : null;
    // The frame just before the winner must differ from it too, or the reel
    // looks like it stopped one flip early.
    const winnerComesNext = i === frames - 2;
    // Draw from an exclusion pool rather than retrying a random pick, so a
    // small or repetitive library can't produce a frame that doesn't change.
    const candidates = movies.filter((m) => m.id !== previousId && !(winnerComesNext && m.id === winner.id));
    const pool = candidates.length > 0 ? candidates : movies;
    reel.push(pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]);
  }
  reel.push(winner);
  return reel;
}

/** Unique poster URLs to prefetch for a reel. */
export function reelPosterUrls(reel: Movie[]): string[] {
  const urls = reel.map((m) => m.coverUrl).filter((url): url is string => !!url);
  return Array.from(new Set(urls));
}

/** Delay before the next flip: constant, then easing out over the closing frames. */
export function frameDelayMs(frameIndex: number, frames = SPIN_FRAMES): number {
  const easeOutFrom = Math.max(0, frames - SPIN_SLOW_FRAMES);
  const slowed = Math.max(0, frameIndex - easeOutFrom);
  return SPIN_START_SPEED_MS * SPIN_SPEED_FACTOR ** slowed;
}
