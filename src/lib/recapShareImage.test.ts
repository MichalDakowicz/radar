import { recapImageName } from '@/lib/recapShareImage';
import type { MonthlyRecap, Recap, YearlyRecap } from '@/lib/recap';

const month = { kind: 'month', key: '2026-07' } as MonthlyRecap;
const year = { kind: 'year', key: '2026' } as YearlyRecap;

describe('recapImageName', () => {
  it('names a monthly card after its period', () => {
    expect(recapImageName(month as Recap)).toBe('radar-recap-2026-07.png');
  });

  it('names a yearly card after its year', () => {
    expect(recapImageName(year as Recap)).toBe('radar-recap-2026.png');
  });
});
