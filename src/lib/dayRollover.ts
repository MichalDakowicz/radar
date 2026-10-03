/**
 * Milliseconds from `now` to the first moment of the next local day, plus a
 * second of slack so a timer set for it fires after the clock has really turned
 * over rather than on the last tick of the old day.
 */
export function msUntilNextDay(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return next.getTime() - now.getTime();
}
