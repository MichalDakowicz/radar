import { posterGridMetrics } from './posterGrid';

describe('posterGridMetrics', () => {
  it('fits three columns across a phone', () => {
    // 360dp screen less the page's 16dp gutters.
    const { columns, cardWidth } = posterGridMetrics(328);
    expect(columns).toBe(3);
    expect(cardWidth).toBe(102);
  });

  it('never returns a broken row before onLayout has measured', () => {
    expect(posterGridMetrics(0)).toEqual({ columns: 2, cardWidth: 96 });
    expect(posterGridMetrics(Number.NaN).columns).toBe(2);
  });

  it('adds columns rather than stretching posters on a wide column', () => {
    const wide = posterGridMetrics(1200);
    expect(wide.columns).toBe(8);
    expect(wide.cardWidth).toBeLessThanOrEqual(132);
  });

  it('keeps every row inside the available width', () => {
    for (const available of [200, 328, 420, 700, 1000, 1600]) {
      const { columns, cardWidth } = posterGridMetrics(available);
      expect(columns * cardWidth + (columns - 1) * 10).toBeLessThanOrEqual(available);
    }
  });
});
