import { createMMKV } from 'react-native-mmkv';

// Device-local bookkeeping for the metadata refresh. Deliberately not in
// user_settings: this is per-install run state (is a sweep half-finished on
// *this* phone?), and the background task has to read it without a React tree
// or a network round-trip.
const storage = createMMKV({ id: 'radar-refresh' });

const FULL_REFRESH_SINCE = 'fullRefreshSince';
const LAST_RUN_AT = 'lastRunAt';
const LOCK_UNTIL = 'lockUntil';

// A run renews the lease as it goes, so a process killed mid-sweep frees the
// lock on its own rather than wedging every later run.
const LOCK_LEASE_MS = 60_000;

/** ISO start time of a manual full sweep still working through the library. */
export function getFullRefreshSince(): string | null {
  return storage.getString(FULL_REFRESH_SINCE) ?? null;
}

export function setFullRefreshSince(iso: string | null): void {
  if (iso) storage.set(FULL_REFRESH_SINCE, iso);
  else storage.remove(FULL_REFRESH_SINCE);
}

/** Epoch ms of the last completed pass, manual or background. */
export function getLastRunAt(): number | null {
  const value = storage.getNumber(LAST_RUN_AT);
  return typeof value === 'number' && value > 0 ? value : null;
}

export function setLastRunAt(ms: number): void {
  storage.set(LAST_RUN_AT, ms);
}

/** Returns false when another pass already holds the lease. */
export function acquireRefreshLock(now: number): boolean {
  const until = storage.getNumber(LOCK_UNTIL) ?? 0;
  if (until > now) return false;
  storage.set(LOCK_UNTIL, now + LOCK_LEASE_MS);
  return true;
}

export function renewRefreshLock(now: number): void {
  storage.set(LOCK_UNTIL, now + LOCK_LEASE_MS);
}

export function releaseRefreshLock(): void {
  storage.remove(LOCK_UNTIL);
}
