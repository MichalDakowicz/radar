// The rules of a QR pairing, with no I/O: given a row and who is asking, what may
// happen next. index.ts does the fetching, hashing and writing; everything that
// decides lives here so it can be tested without Deno or a database.
//
// Plain TypeScript on purpose — no Deno globals, no jsr: imports — because Jest
// imports this file directly (supabase/functions/qr-login/logic.test.ts).

export type QrMode = 'web' | 'phone';
export type QrState = 'pending' | 'claimed' | 'approved' | 'denied' | 'consumed';

export type QrRow = {
  id: string;
  /** `web`: the signed-out side shows the code. `phone`: the signed-in side does. */
  mode: QrMode;
  state: QrState;
  /** Two digits both screens show, so a person can tell a pairing they started from one they were handed. */
  match_code: string;
  /** The signed-in side — the only one who may approve. Set at the scan (web) or the offer (phone). */
  user_id: string | null;
  /** SHA-256 of the verifier the signed-out side holds. Whoever can produce the verifier collects the token. */
  challenge: string | null;
  /** SHA-256 of the secret in a phone-mode code. */
  nonce_hash: string | null;
  /** What the requesting device calls itself. It chose this, so it is a claim. */
  requester_label: string | null;
  /** Two letters, from the connection the server saw. */
  requester_country: string | null;
  /** The connection that started the code, hashed with a secret — for rate limiting, never for reading. */
  requester_ip_hash: string | null;
  /** The one-time token, from approval until it is collected. */
  token_hash: string | null;
  created_at: string;
  expires_at: string;
};

export const TTL_MS = {
  /** A code on a screen, until someone scans it. */
  shown: 60_000,
  /** Once scanned, for a person to look at who is asking and decide. */
  deciding: 90_000,
  /** Once approved, for the requester to collect. */
  collecting: 30_000,
  /** However it keeps being extended, a pairing never outlives this. */
  lifetime: 5 * 60_000,
} as const;

/** New codes one connection may start in a minute. A person starts one every minute or so. */
export const START_LIMIT_PER_MINUTE = 10;

export type Failure = { ok: false; status: 400 | 403 | 404 | 409 | 410 | 429; error: string };
export type Allowed<T> = { ok: true; value: T; patch?: Partial<QrRow> };
export type Decision<T> = Allowed<T> | Failure;

const fail = (status: Failure['status'], error: string): Failure => ({ ok: false, status, error });

const SHA256_HEX = /^[0-9a-f]{64}$/;

export function isSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && SHA256_HEX.test(value);
}

export function isExpired(row: Pick<QrRow, 'expires_at'>, now: number): boolean {
  const end = Date.parse(row.expires_at);
  return Number.isNaN(end) || end <= now;
}

/** `now + ttl`, but never past the pairing's lifetime. */
export function extendedTo(row: Pick<QrRow, 'created_at'>, now: number, ttl: number): string {
  const ceiling = Date.parse(row.created_at) + TTL_MS.lifetime;
  return new Date(Math.min(now + ttl, Number.isNaN(ceiling) ? now + ttl : ceiling)).toISOString();
}

/** Two digits from a random number the caller supplies (0 up to, not including, 1). */
export function matchCodeFrom(random: number): string {
  return String(Math.floor(random * 100) % 100).padStart(2, '0');
}

/** `count` is how many this connection started in the last minute. */
export function tooManyStarts(count: number): boolean {
  return count >= START_LIMIT_PER_MINUTE;
}

const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g;
const LABEL_MAX = 120;

/** A device's own name for itself, made safe to store and show. Null when there is nothing left. */
export function cleanLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX).trim();
  return cleaned || null;
}

/** Two letters, and not the placeholders a CDN uses for "no idea". */
export function cleanCountry(raw: unknown): string | null {
  if (typeof raw !== 'string' || !/^[A-Za-z]{2}$/.test(raw)) return null;
  const code = raw.toUpperCase();
  return code === 'XX' ? null : code;
}

type Requester = { label: string | null; country: string | null };

function requesterOf(row: QrRow): Requester {
  return { label: row.requester_label, country: row.requester_country };
}

/**
 * A signed-in phone scans a code a browser is showing (mode `web`). It becomes the
 * approver — and the only one: a code that has been scanned once cannot be scanned
 * again, so a second person with a photo of it is turned away.
 */
export function decideClaim(
  row: QrRow,
  caller: string,
  now: number,
): Decision<{ match_code: string; requester: Requester; created_at: string; expires_at: string }> {
  if (row.mode !== 'web') return fail(400, 'That is not a browser code');
  if (isExpired(row, now)) return fail(410, 'This code has expired');
  if (row.state !== 'pending') return fail(409, 'This code has already been used');

  const expires_at = extendedTo(row, now, TTL_MS.deciding);
  return {
    ok: true,
    patch: { state: 'claimed', user_id: caller, expires_at },
    value: { match_code: row.match_code, requester: requesterOf(row), created_at: row.created_at, expires_at },
  };
}

/**
 * A signed-out device scans a code a signed-in phone is showing (mode `phone`). The
 * secret in the code is what lets it in, and what it hands over is its challenge:
 * the verifier it keeps is what will later collect the token.
 *
 * `nonceMatches` is index.ts's constant-time comparison of the secret it was given
 * with the hash stored at the offer.
 */
export function decideJoin(
  row: QrRow,
  input: { nonceMatches: boolean; challenge: unknown; label: unknown; country: unknown },
  now: number,
): Decision<{ match_code: string; expires_at: string }> {
  if (row.mode !== 'phone') return fail(400, 'That is not a phone code');
  if (isExpired(row, now)) return fail(410, 'This code has expired');
  if (row.state !== 'pending') return fail(409, 'This code has already been used');
  if (!row.nonce_hash || !input.nonceMatches) return fail(403, 'This code is not valid');
  if (!isSha256Hex(input.challenge)) return fail(400, 'Missing challenge');

  const expires_at = extendedTo(row, now, TTL_MS.deciding);
  return {
    ok: true,
    patch: {
      state: 'claimed',
      challenge: input.challenge,
      requester_label: cleanLabel(input.label),
      requester_country: cleanCountry(input.country),
      expires_at,
    },
    value: { match_code: row.match_code, expires_at },
  };
}

/**
 * What the signed-in side sees while it waits and while it decides. Only the
 * approver may look; anyone else is told nothing, not even that the row exists.
 */
export function decideStatus(
  row: QrRow,
  caller: string,
  now: number,
): Decision<{ state: QrState | 'expired'; match_code: string; requester: Requester | null; expires_at: string }> {
  if (row.user_id !== caller) return fail(403, 'Not yours');
  const expired = isExpired(row, now);
  return {
    ok: true,
    value: {
      state: expired ? 'expired' : row.state,
      match_code: row.match_code,
      requester: row.state === 'claimed' && !expired ? requesterOf(row) : null,
      expires_at: row.expires_at,
    },
  };
}

/**
 * The approver says yes. Allowed only for the person who scanned (or showed) the
 * code, only once somebody has joined it, and only while the clock is still
 * running. index.ts mints the token after this says yes and writes it with
 * `approvedPatch`, conditional on the row still being `claimed`.
 */
export function decideApprove(row: QrRow, caller: string, now: number): Decision<null> {
  if (row.user_id !== caller) return fail(403, 'Not yours');
  if (isExpired(row, now)) return fail(410, 'This code has expired');
  if (row.state !== 'claimed') return fail(409, 'Nothing to approve');
  return { ok: true, value: null };
}

export function approvedPatch(row: Pick<QrRow, 'created_at'>, tokenHash: string, now: number): Partial<QrRow> {
  return { state: 'approved', token_hash: tokenHash, expires_at: extendedTo(row, now, TTL_MS.collecting) };
}

/** The approver says no — or withdraws a code they were showing. The token, if any, goes with it. */
export function decideDeny(row: QrRow, caller: string, now: number): Decision<null> {
  if (row.user_id !== caller) return fail(403, 'Not yours');
  if (isExpired(row, now)) return fail(410, 'This code has expired');
  if (row.state !== 'pending' && row.state !== 'claimed') return fail(409, 'Too late to decline');
  return { ok: true, value: null, patch: { state: 'denied', token_hash: null } };
}

export type RedeemValue =
  | { state: 'pending' | 'claimed'; match_code: string; expires_at: string }
  | { state: 'denied' }
  | { state: 'approved'; token_hash: string };

/**
 * The signed-out side asks what became of its code, with the verifier. Anything it
 * cannot prove — no challenge yet, a verifier that does not match — is "unknown",
 * the same answer as a code that never existed, so this cannot be used to probe.
 *
 * The one place the token leaves the server, and it leaves once: the patch marks
 * the row consumed and erases it, and index.ts writes that conditional on the row
 * still being `approved`, so two collectors cannot both get it.
 */
export function decideRedeem(row: QrRow, input: { verifierMatches: boolean }, now: number): Decision<RedeemValue> {
  if (!row.challenge || !input.verifierMatches) return fail(404, 'Unknown code');
  if (isExpired(row, now)) return fail(410, 'This code has expired');

  switch (row.state) {
    case 'pending':
    case 'claimed':
      return { ok: true, value: { state: row.state, match_code: row.match_code, expires_at: row.expires_at } };
    case 'denied':
      return { ok: true, value: { state: 'denied' } };
    case 'approved':
      if (!row.token_hash) return fail(410, 'This code has expired');
      return {
        ok: true,
        value: { state: 'approved', token_hash: row.token_hash },
        patch: { state: 'consumed', token_hash: null },
      };
    default:
      return fail(410, 'This code has already been used');
  }
}
