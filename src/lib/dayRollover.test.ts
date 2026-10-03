import { msUntilNextDay } from './dayRollover';

describe('msUntilNextDay', () => {
  it('counts to the start of the next local day, plus a second', () => {
    const noon = new Date(2026, 9, 3, 12, 0, 0);
    expect(msUntilNextDay(noon)).toBe(12 * 60 * 60 * 1000 + 1000);
  });

  it('is one second just before midnight', () => {
    expect(msUntilNextDay(new Date(2026, 9, 3, 23, 59, 59))).toBe(2000);
  });

  it('rolls over a month end', () => {
    const lastDay = new Date(2026, 9, 31, 18, 0, 0);
    expect(msUntilNextDay(lastDay)).toBe(6 * 60 * 60 * 1000 + 1000);
  });

  it('is never zero or negative', () => {
    expect(msUntilNextDay(new Date(2026, 9, 4, 0, 0, 0))).toBe(24 * 60 * 60 * 1000 + 1000);
  });
});
