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

/** A 0-10 score (TMDB's scale) as a 0-1 fraction. */
export function scoreToProgress(score: number, max = 10): number {
  if (!Number.isFinite(score) || max <= 0) return 0;
  return Math.max(0, Math.min(1, score / max));
}
