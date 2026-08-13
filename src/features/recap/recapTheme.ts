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

/**
 * Smallest line height a recap Text may set, as a multiple of its font size.
 *
 * Android lays a line out in exactly the `lineHeight` it is given and, when that
 * is shorter than the font's own ascent + descent (~1.18em for Roboto), it takes
 * the missing space off the *top* — which slices the caps off a display line.
 * The design's tight leading is what caused the cropped recap text, so no slide
 * sets a leading under this floor.
 */
export const MIN_LEADING = 1.18;

/** The design's wanted line height, raised to whatever the font actually needs. */
export function leading(size: number, wanted: number): number {
  return Math.max(wanted, size * MIN_LEADING);
}

/**
 * Negative margin that gives back the height `leading()` had to add, so a
 * display line keeps the design's tight composition without the glyphs being
 * cut. Worth applying on the big numbers, where the difference is 20-40 px;
 * below ~40 px type the slack is a few px and not worth the complication.
 */
export function leadingPull(size: number, wanted: number): number {
  return wanted - leading(size, wanted);
}

/** The label face — monospace, matching the design's ui-monospace runs. */
export const MONO = Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' });

/** Seconds a slide holds before autoplay advances. The design's default. */
export const SLIDE_SECONDS = 5.2;

/** Card-push timing: .55s on cubic-bezier(.65,0,.35,1). */
export const PUSH_MS = 550;
export const PUSH_EASING = [0.65, 0, 0.35, 1] as const;
