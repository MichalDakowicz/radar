import { Platform } from 'react-native';

// The recap player is always dark, whatever the app theme is: it is a story
// surface that gets screenshotted and shared, and a light version of it would
// read as a different product. These are the design's own values, kept in one
// place so no slide has to guess at "the blue".

export const RECAP = {
  bg: '#0a0a0a',
  sheet: '#141414',
  ink: '#fafafa',
  muted: '#a3a3a3',
  faint: '#525252',
  line: '#262626',
  /** Movies. Same blue the Stats screen uses for the movie series. */
  movie: '#3b82f6',
  movieSoft: '#60a5fa',
  /** TV. Same purple. */
  tv: '#a855f7',
  tvSoft: '#c084fc',
  star: '#fbbf24',
  up: '#22c55e',
} as const;

/** Heatmap fills, indexed by lib/recap HeatLevel (-1 padding handled by callers). */
export const HEAT_COLORS: readonly string[] = [
  'rgba(255,255,255,.07)',
  'rgba(59,130,246,.55)',
  RECAP.movie,
  'rgba(168,85,247,.55)',
  RECAP.tv,
] as const;

/** The label face — monospace, matching the design's ui-monospace runs. */
export const MONO = Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' });

/** Seconds a slide holds before autoplay advances. The design's default. */
export const SLIDE_SECONDS = 5.2;

/** Card-push timing: .55s on cubic-bezier(.65,0,.35,1). */
export const PUSH_MS = 550;
export const PUSH_EASING = [0.65, 0, 0.35, 1] as const;
