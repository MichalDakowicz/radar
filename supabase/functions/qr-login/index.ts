// qr-login — signs a signed-out device in from a signed-in one, by QR code
// (PING.md §9.14, docs/qr-login.md).
//
// Two directions share one pairing row (public.qr_logins):
//   web    a signed-out browser shows the code; a signed-in phone scans it
//   phone  a signed-in phone shows the code; a signed-out device scans it
//
// Either way the signed-out side holds a verifier that never leaves it, and only
// the holder of that verifier can collect the one-time token the server mints once
// the signed-in person has looked at who is asking and approved. The code on the
// screen names a pairing; it is not a key.
//
// All the rules — who may do what, when, how many times — are in logic.ts, which
// is plain TypeScript and unit-tested. This file only fetches, hashes, writes and
// answers.
//
// Deploy:
//   npx supabase functions deploy qr-login --no-verify-jwt --project-ref <ref>
//
// --no-verify-jwt because half the actions are called by someone who is not signed
// in. The actions that need a person check the bearer themselves, against
// `/auth/v1/user`, which validates the signature *and* that the session behind the
// token still exists.
//
// Dependency-free, like sign-in-handoff and send-push: GoTrue and PostgREST are
// reachable with fetch.

// Types only — the edge runtime's own globals (Deno.env, Deno.serve). Excluded from
// the app's tsconfig, so this specifier is never resolved by `tsc`.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  approvedPatch,
  cleanCountry,
  cleanLabel,
  decideApprove,
  decideClaim,
  decideDeny,
  decideJoin,
  decideRedeem,
  decideStatus,
  isSha256Hex,
  matchCodeFrom,
  START_LIMIT_PER_MINUTE,
  TTL_MS,
  type Failure,
  type QrRow,
  type QrState,
} from './logic.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

/** Injected by the edge runtime. Reads and writes the pairing table, and mints tokens. */
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Injected by the edge runtime. The `apikey` a user token is presented with. */
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const REST = `${SUPABASE_URL}/rest/v1/qr_logins`;
const REST_HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

/** How long a finished pairing stays on file before it is swept. */
const KEEP_MS = 10 * 60_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NONCE = /^[A-Za-z0-9_-]{22,64}$/;
const VERIFIER = /^[A-Za-z0-9_-]{43,128}$/;

// Browsers call this from the web builds, so it answers preflight. Any origin may:
// nothing here rides on cookies — every action is guarded by a bearer or a secret
// the caller has to present.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

/** The answer for a refusal from logic.ts. */
function refuse(decision: Failure): Response {
  return json(decision.status, { error: decision.error });
}

// ---------------------------------------------------------------------------
// Hashing

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Compares two hex digests without stopping at the first difference. */
function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function randomBase64Url(byteCount: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function newMatchCode(): string {
  return matchCodeFrom(crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32);
}

// ---------------------------------------------------------------------------
// The pairing table. Always the service key; RLS leaves everyone else out.

async function rest(url: string, init: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`qr_logins ${init.method ?? 'GET'} failed: ${response.status} ${await response.text()}`);
  return response;
}

async function getRow(id: string): Promise<QrRow | null> {
  const response = await rest(`${REST}?id=eq.${id}&select=*`, { headers: REST_HEADERS });
  const rows = (await response.json()) as QrRow[];
  return rows[0] ?? null;
}

async function insertRow(values: Partial<QrRow>): Promise<QrRow> {
  const response = await rest(REST, {
    method: 'POST',
    headers: { ...REST_HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify(values),
  });
  return ((await response.json()) as QrRow[])[0];
}

/**
 * Writes `patch` only if the row is still in `expected`. This is what keeps two
 * scanners, or two collectors, from both winning: the second finds no row in that
 * state and gets nothing.
 */
async function updateIf(id: string, expected: QrState, patch: Partial<QrRow>): Promise<boolean> {
  const response = await rest(`${REST}?id=eq.${id}&state=eq.${expected}`, {
    method: 'PATCH',
    headers: { ...REST_HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  return ((await response.json()) as QrRow[]).length === 1;
}

/** Whether this connection has already started as many codes in the last minute as it may. */
async function startedTooMany(ipHash: string): Promise<boolean> {
  const since = encodeURIComponent(new Date(Date.now() - 60_000).toISOString());
  const response = await rest(
    `${REST}?requester_ip_hash=eq.${ipHash}&created_at=gte.${since}&select=id&limit=${START_LIMIT_PER_MINUTE}`,
    { headers: REST_HEADERS },
  );
  return ((await response.json()) as unknown[]).length >= START_LIMIT_PER_MINUTE;
}

/** Sweeps what has been dead a while. Best effort: a failure here must never fail a request. */
function sweep(): void {
  const cutoff = encodeURIComponent(new Date(Date.now() - KEEP_MS).toISOString());
  rest(`${REST}?expires_at=lt.${cutoff}`, { method: 'DELETE', headers: REST_HEADERS }).catch((error) =>
    console.error('qr-login sweep:', error),
  );
}

// ---------------------------------------------------------------------------
// Who is asking

type GoTrueUser = { id: string; email?: string | null };

/** The caller's user, if the bearer is a live session. Null for anything else, the anon key included. */
async function callerOf(authorization: string | null): Promise<GoTrueUser | null> {
  if (!authorization?.startsWith('Bearer ')) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: authorization },
  });
  if (!response.ok) return null;
  return (await response.json()) as GoTrueUser;
}

/**
 * A magic-link token for `email`. The admin endpoint only *generates* the link —
 * nothing is emailed — and the token is single-use. It is held here, never sent to
 * the approver, and handed only to whoever presents the verifier.
 */
async function magicLinkToken(email: string): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  if (!response.ok) throw new Error(`generate_link failed: ${response.status} ${await response.text()}`);
  const link = (await response.json()) as { hashed_token?: string };
  if (!link.hashed_token) throw new Error('generate_link returned no hashed_token');
  return link.hashed_token;
}

/** The connection, for rate limiting. Hashed with a secret, so the table never holds an address. */
async function connectionHash(request: Request): Promise<string> {
  const ip =
    request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  return sha256Hex(`${ip}|${SERVICE_KEY}`);
}

// ---------------------------------------------------------------------------
// Actions

type Body = Record<string, unknown>;

const text = (body: Body, key: string): string | null => (typeof body[key] === 'string' ? (body[key] as string) : null);

async function rowFor(body: Body): Promise<QrRow | null> {
  const id = text(body, 'id');
  return id && UUID.test(id) ? getRow(id) : null;
}

const unknownCode = () => json(404, { error: 'Unknown code' });

async function start(request: Request, body: Body): Promise<Response> {
  const challenge = body.challenge;
  if (!isSha256Hex(challenge)) return json(400, { error: 'Missing challenge' });

  const ipHash = await connectionHash(request);
  if (await startedTooMany(ipHash)) return json(429, { error: 'Too many codes — wait a minute' });
  sweep();

  const row = await insertRow({
    mode: 'web',
    state: 'pending',
    match_code: newMatchCode(),
    challenge,
    requester_label: cleanLabel(body.label),
    requester_country: cleanCountry(request.headers.get('cf-ipcountry')),
    requester_ip_hash: ipHash,
    expires_at: new Date(Date.now() + TTL_MS.shown).toISOString(),
  });
  return json(200, { id: row.id, match_code: row.match_code, expires_at: row.expires_at });
}

async function offer(request: Request, user: GoTrueUser): Promise<Response> {
  const ipHash = await connectionHash(request);
  if (await startedTooMany(ipHash)) return json(429, { error: 'Too many codes — wait a minute' });
  sweep();

  const nonce = randomBase64Url(16);
  const row = await insertRow({
    mode: 'phone',
    state: 'pending',
    match_code: newMatchCode(),
    user_id: user.id,
    nonce_hash: await sha256Hex(nonce),
    requester_ip_hash: ipHash,
    expires_at: new Date(Date.now() + TTL_MS.shown).toISOString(),
  });
  return json(200, { id: row.id, nonce, match_code: row.match_code, expires_at: row.expires_at });
}

async function claim(body: Body, user: GoTrueUser): Promise<Response> {
  const row = await rowFor(body);
  if (!row) return unknownCode();
  const decision = decideClaim(row, user.id, Date.now());
  if (!decision.ok) return refuse(decision);
  if (!(await updateIf(row.id, 'pending', decision.patch!))) return json(409, { error: 'This code has already been used' });
  return json(200, decision.value);
}

async function join(request: Request, body: Body): Promise<Response> {
  const row = await rowFor(body);
  const nonce = text(body, 'nonce');
  if (!row || !nonce || !NONCE.test(nonce)) return unknownCode();

  const nonceMatches = row.nonce_hash ? sameHex(await sha256Hex(nonce), row.nonce_hash) : false;
  const decision = decideJoin(
    row,
    { nonceMatches, challenge: body.challenge, label: body.label, country: request.headers.get('cf-ipcountry') },
    Date.now(),
  );
  if (!decision.ok) return refuse(decision);
  if (!(await updateIf(row.id, 'pending', decision.patch!))) return json(409, { error: 'This code has already been used' });
  return json(200, decision.value);
}

async function status(body: Body, user: GoTrueUser): Promise<Response> {
  const row = await rowFor(body);
  if (!row) return unknownCode();
  const decision = decideStatus(row, user.id, Date.now());
  return decision.ok ? json(200, decision.value) : refuse(decision);
}

async function approve(body: Body, user: GoTrueUser): Promise<Response> {
  const row = await rowFor(body);
  if (!row) return unknownCode();
  const decision = decideApprove(row, user.id, Date.now());
  if (!decision.ok) return refuse(decision);

  // Every account on this project has an email today — Google and email/password
  // both carry one — but a phone-only account would have nothing to mint for.
  if (!user.email) return json(422, { error: 'This account has no email to sign in with' });

  const tokenHash = await magicLinkToken(user.email);
  if (!(await updateIf(row.id, 'claimed', approvedPatch(row, tokenHash, Date.now())))) {
    return json(409, { error: 'Nothing to approve' });
  }
  return json(200, { ok: true });
}

async function deny(body: Body, user: GoTrueUser): Promise<Response> {
  const row = await rowFor(body);
  if (!row) return unknownCode();
  const decision = decideDeny(row, user.id, Date.now());
  if (!decision.ok) return refuse(decision);
  if (!(await updateIf(row.id, row.state, decision.patch!))) return json(409, { error: 'Too late to decline' });
  return json(200, { ok: true });
}

async function redeem(body: Body): Promise<Response> {
  const row = await rowFor(body);
  const verifier = text(body, 'verifier');
  if (!row || !verifier || !VERIFIER.test(verifier)) return unknownCode();

  const verifierMatches = row.challenge ? sameHex(await sha256Hex(verifier), row.challenge) : false;
  const decision = decideRedeem(row, { verifierMatches }, Date.now());
  if (!decision.ok) return refuse(decision);

  // The token leaves only if this request is the one that flips the row to
  // consumed. A second collector, or a retry, finds it gone.
  if (decision.patch && !(await updateIf(row.id, 'approved', decision.patch))) {
    return json(409, { error: 'This code has already been used' });
  }
  return json(200, decision.value);
}

// ---------------------------------------------------------------------------

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { error: 'Bad request' });
  const action = text(body, 'action');

  try {
    // Called by someone who is not signed in. Each is guarded by what only the
    // right party holds: the challenge they hash, the secret in the code, the verifier.
    if (action === 'start') return await start(request, body);
    if (action === 'join') return await join(request, body);
    if (action === 'redeem') return await redeem(body);

    // Called by the signed-in side.
    if (action === 'offer' || action === 'claim' || action === 'status' || action === 'approve' || action === 'deny') {
      const user = await callerOf(request.headers.get('Authorization'));
      if (!user) return json(401, { error: 'Sign in first' });
      try {
        if (action === 'offer') return await offer(request, user);
        if (action === 'claim') return await claim(body, user);
        if (action === 'status') return await status(body, user);
        if (action === 'approve') return await approve(body, user);
        return await deny(body, user);
      } catch (error) {
        // The user id, never the email: logs are readable by anyone on the project.
        console.error(`qr-login ${action} for ${user.id}:`, error);
        return json(502, { error: 'Could not complete that' });
      }
    }

    return json(400, { error: 'Unknown action' });
  } catch (error) {
    console.error(`qr-login ${action}:`, error);
    return json(502, { error: 'Could not complete that' });
  }
});
