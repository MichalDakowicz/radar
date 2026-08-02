// Geometry for a border that only draws part of the way around a card. An SVG
// rounded rect is stroked with a dash pattern whose first segment is the filled
// portion and whose gap covers the rest, so the dash lengths have to be derived
// from the real perimeter - corners are quarter-circles, not right angles.

/** Perimeter of a rounded rectangle: the four straight runs plus one full circle of corners. */
export function roundedRectPerimeter(width: number, height: number, radius: number): number {
  if (width <= 0 || height <= 0) return 0;
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  const straight = 2 * (width - 2 * r) + 2 * (height - 2 * r);
  return straight + 2 * Math.PI * r;
}

/** `[filled, gap]` dash lengths for a 0-1 progress along a path of that perimeter. */
export function progressDash(perimeter: number, progress: number): [number, number] {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const filled = perimeter * clamped;
  return [filled, perimeter - filled];
}

/**
 * A rounded rect traced from the middle of the bottom edge, heading left: down the
 * bottom-left corner, up the left side, across the top, down the right side and back
 * along the bottom to where it started. A partial dash therefore grows out of the
 * bottom centre in one direction, which reads as a gauge rather than a stroke that
 * happens to begin in a corner. An SVG `Rect` always starts top-left, hence the
 * explicit path.
 */
export function roundedRectPathFromBottom(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  if (width <= 0 || height <= 0) return '';
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  const x2 = x + width;
  const y2 = y + height;
  const midX = x + width / 2;
  // Sweep flag 1 turns each corner the short way round for a clockwise loop.
  const arc = (ex: number, ey: number) => `A ${r} ${r} 0 0 1 ${ex} ${ey}`;
  return [
    `M ${midX} ${y2}`,
    `L ${x + r} ${y2}`,
    arc(x, y2 - r),
    `L ${x} ${y + r}`,
    arc(x + r, y),
    `L ${x2 - r} ${y}`,
    arc(x2, y + r),
    `L ${x2} ${y2 - r}`,
    arc(x2 - r, y2),
    `L ${midX} ${y2}`,
    'Z',
  ].join(' ');
}

/** A 0-10 score (TMDB's scale) as a 0-1 fraction. */
export function scoreToProgress(score: number, max = 10): number {
  if (!Number.isFinite(score) || max <= 0) return 0;
  return Math.max(0, Math.min(1, score / max));
}
