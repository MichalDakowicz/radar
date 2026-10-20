import { webcrypto } from 'node:crypto';

import type { QrRow } from './logic';

jest.mock('jsr:@supabase/functions-js/edge-runtime.d.ts', () => ({}), { virtual: true });

let handler: (request: Request) => Promise<Response>;
let rows: QrRow[];
const fetchMock = jest.fn();
const CODE = 'ABCDEFGHJKLMNPQR';
const ID = '6f1c1f43-6a52-4a0f-9d0e-2f2d3b6a8c11';
const USER = '6f1c1f43-6a52-4a0f-9d0e-2f2d3b6a8c12';

async function digest(value: string) {
  return Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(value))).toString('hex');
}

beforeAll(async () => {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  Object.assign(globalThis, {
    Deno: {
      env: { get: (name: string) => name === 'SUPABASE_URL' ? 'https://test.supabase.co' : 'test-key' },
      serve: (callback: typeof handler) => { handler = callback; },
    },
    fetch: fetchMock,
  });
  jest.requireActual('./index');
});

beforeEach(async () => {
  fetchMock.mockReset();
  rows = [{
    id: ID, mode: 'phone', state: 'pending', user_id: USER, code_hash: await digest(CODE),
    match_code: '42', nonce_hash: await digest('AAAAAAAAAAAAAAAAAAAAAA'), challenge: null,
    token_hash: null, requester_label: null, requester_country: null, requester_ip_hash: null,
    created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60_000).toISOString(),
  }];
  fetchMock.mockImplementation(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    if (url.pathname === '/auth/v1/user') return Response.json({ id: USER, email: 'test@example.com' });
    if (url.pathname === '/auth/v1/admin/generate_link') return Response.json({ hashed_token: 'one-time-token' });
    if (init.method === 'POST') {
      const row = { ...rows[0], ...JSON.parse(String(init.body)), id: webcrypto.randomUUID() } as QrRow;
      rows.push(row);
      return Response.json([row]);
    }
    const selected = rows.filter(row =>
      (!url.searchParams.has('id') || url.searchParams.get('id') === `eq.${row.id}`) &&
      (!url.searchParams.has('code_hash') || url.searchParams.get('code_hash') === `eq.${row.code_hash}`) &&
      (!url.searchParams.has('state') || url.searchParams.get('state') === `eq.${row.state}`));
    if (init.method === 'PATCH') {
      const changes = JSON.parse(String(init.body)) as Partial<QrRow>;
      selected.forEach(row => Object.assign(row, changes));
      return Response.json(selected.map(row => ({ id: row.id })));
    }
    return Response.json(selected);
  });
});

async function call(action: string, extra: Record<string, unknown> = {}, signedIn = false) {
  return handler(new Request('https://test.supabase.co/functions/v1/qr-login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(signedIn ? { Authorization: 'Bearer signed-in' } : {}) },
    body: JSON.stringify({ action, ...extra }),
  }));
}

it('mints separate manual and QR secrets, stores only hashes and keeps QR joins compatible', async () => {
  const offered = await (await call('offer', {}, true)).json();
  const stored = rows.find(row => row.id === offered.id)!;
  expect(offered.sign_in_code).toMatch(/^[A-HJ-NP-Z2-9]{16}$/);
  expect(stored.code_hash).toBe(await digest(offered.sign_in_code));
  expect(stored.nonce_hash).toBe(await digest(offered.nonce));
  expect(stored).not.toHaveProperty('sign_in_code');
  expect((await call('join', { id: offered.id, nonce: offered.nonce, challenge: 'c'.repeat(64) })).status).toBe(200);
  const started = await (await call('start', { challenge: 'd'.repeat(64), label: 'Browser' })).json();
  expect(started.sign_in_code).toMatch(/^[A-HJ-NP-Z2-9]{16}$/);
  expect(rows.find(row => row.id === started.id)?.code_hash).toBe(await digest(started.sign_in_code));
});

it('joins by typed code, requires approval and allows only the verifier holder to redeem once', async () => {
  const verifier = 'A'.repeat(43);
  const joined = await call('join-code', { code: 'abcd-efgh-jklm-npqr', challenge: await digest(verifier), label: 'Phone' });
  expect(joined.status).toBe(200);
  expect(await joined.json()).toMatchObject({ id: ID, match_code: '42' });
  expect(rows[0].state).toBe('claimed');
  expect(await (await call('redeem', { id: ID, verifier })).json()).not.toHaveProperty('token_hash');
  expect((await call('approve', { id: ID })).status).toBe(401);
  expect((await call('approve', { id: ID }, true)).status).toBe(200);
  expect((await call('redeem', { id: ID, verifier: 'B'.repeat(43) })).status).toBe(404);
  expect(await (await call('redeem', { id: ID, verifier })).json()).toMatchObject({ token_hash: 'one-time-token' });
  expect(rows[0].token_hash).toBeNull();
  expect((await call('redeem', { id: ID, verifier })).status).toBe(410);
  expect((await call('join-code', { code: CODE, challenge: await digest(verifier) })).status).toBe(409);
});

it('requires authentication to claim a browser code and keeps the original approval rules', async () => {
  rows[0].mode = 'web';
  rows[0].user_id = null;
  rows[0].challenge = 'a'.repeat(64);
  expect((await call('claim-code', { code: CODE })).status).toBe(401);
  expect((await call('join-code', { code: CODE, challenge: 'b'.repeat(64) })).status).toBe(400);
  expect(await (await call('claim-code', { code: CODE }, true)).json()).toMatchObject({ id: ID, match_code: '42' });
  expect(rows[0].state).toBe('claimed');
});

it('rejects malformed, unknown, expired and reused codes without changing a pairing', async () => {
  for (const code of ['42', 'Z'.repeat(16), 'A'.repeat(65)]) {
    expect((await call('join-code', { code, challenge: 'a'.repeat(64) })).status).toBe(404);
  }
  expect(rows[0].state).toBe('pending');
  rows[0].expires_at = new Date(Date.now() - 1).toISOString();
  expect((await call('join-code', { code: CODE, challenge: 'a'.repeat(64) })).status).toBe(410);
  rows[0].expires_at = new Date(Date.now() + 60_000).toISOString();
  rows[0].state = 'claimed';
  expect((await call('join-code', { code: CODE, challenge: 'a'.repeat(64) })).status).toBe(409);
});

it('arbitrates concurrent joins atomically so only one verifier wins', async () => {
  const answers = await Promise.all(['a', 'b'].map(char => call('join-code', { code: CODE, challenge: char.repeat(64) })));
  expect(answers.map(answer => answer.status).sort()).toEqual([200, 409]);
});
