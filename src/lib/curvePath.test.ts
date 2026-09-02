import { smoothPath } from './curvePath';

describe('smoothPath', () => {
  it('is empty with nothing to draw', () => {
    expect(smoothPath([])).toBe('');
  });

  it('is a bare move for a single point', () => {
    expect(smoothPath([{ x: 1, y: 2 }])).toBe('M 1 2');
  });

  it('emits one cubic per segment, ending on every point', () => {
    const d = smoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]);
    expect(d.startsWith('M 0 0')).toBe(true);
    expect(d.match(/C /g)).toHaveLength(2);
    expect(d.endsWith('20 0')).toBe(true);
  });

  it('holds its control points inside the box it is given', () => {
    // A spike overshoots when interpolated; unclamped it would draw the curve
    // out through the top of its band.
    const spike = [
      { x: 0, y: 100 },
      { x: 10, y: 100 },
      { x: 20, y: 0 },
      { x: 30, y: 100 },
      { x: 40, y: 100 },
    ];
    const ys = smoothPath(spike, [0, 100])
      .split(/[ ,]+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n))
      .filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
  });
});
