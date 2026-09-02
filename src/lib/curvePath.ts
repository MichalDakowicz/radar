// Catmull-Rom through a series of points, emitted as an SVG cubic path.
//
// A polyline through fifty points reads as a saw even when the data underneath
// is smooth, and react-native-svg has no spline primitive - so the control
// points are derived here: each segment borrows the slope of its neighbours,
// which is what makes the joins invisible.
//
// Pure (doc 10) - the component measures itself and hands the geometry over.

export type CurvePoint = { x: number; y: number };

/** How far a control point reaches along the neighbouring slope. 1 = Catmull-Rom. */
const TENSION = 1;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * `d` for a smooth open curve through every point, in order.
 *
 * `clampY` holds the curve inside its box: a spline through a spike overshoots
 * past the points it interpolates, and an overshoot below the baseline draws a
 * distribution going negative.
 */
export function smoothPath(points: CurvePoint[], clampY?: [number, number]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${round(points[0].x)} ${round(points[0].y)}`;

  const clamp = (y: number) => (clampY ? Math.min(clampY[1], Math.max(clampY[0], y)) : y);
  const at = (i: number) => points[Math.min(points.length - 1, Math.max(0, i))];

  let d = `M ${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const previous = at(i - 1);
    const start = at(i);
    const end = at(i + 1);
    const next = at(i + 2);

    const c1 = { x: start.x + ((end.x - previous.x) / 6) * TENSION, y: start.y + ((end.y - previous.y) / 6) * TENSION };
    const c2 = { x: end.x - ((next.x - start.x) / 6) * TENSION, y: end.y - ((next.y - start.y) / 6) * TENSION };

    d += ` C ${round(c1.x)} ${round(clamp(c1.y))}, ${round(c2.x)} ${round(clamp(c2.y))}, ${round(end.x)} ${round(end.y)}`;
  }
  return d;
}
