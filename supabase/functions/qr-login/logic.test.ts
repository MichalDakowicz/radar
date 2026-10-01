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
  extendedTo,
  isExpired,
  isSha256Hex,
  matchCodeFrom,
  START_LIMIT_PER_MINUTE,
  tooManyStarts,
  TTL_MS,
  type QrRow,
} from './logic';

const NOW = Date.parse('2026-10-01T12:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();

const CHALLENGE = 'a'.repeat(64);
const APPROVER = 'user-approver';
const STRANGER = 'user-stranger';

function row(overrides: Partial<QrRow> = {}): QrRow {
  return {
    id: '3f2b8c1e-9d4a-4e6b-8a17-0c5d2e9f7a31',
    mode: 'web',
    state: 'pending',
    match_code: '42',
    user_id: null,
    challenge: CHALLENGE,
    nonce_hash: null,
    requester_label: 'Chrome on Windows',
    requester_country: 'PL',
    requester_ip_hash: null,
    token_hash: null,
    created_at: iso(NOW - 10_000),
    expires_at: iso(NOW + 50_000),
    ...overrides,
  };
}

const claimed = (overrides: Partial<QrRow> = {}) => row({ state: 'claimed', user_id: APPROVER, ...overrides });
const approved = (overrides: Partial<QrRow> = {}) =>
  claimed({ state: 'approved', token_hash: 'tok', ...overrides });

function failed(decision: { ok: boolean }) {
  expect(decision.ok).toBe(false);
  return decision as { ok: false; status: number; error: string };
}

describe('clock', () => {
  it('treats a pairing as expired at, not after, its expiry', () => {
    expect(isExpired({ expires_at: iso(NOW) }, NOW)).toBe(true);
    expect(isExpired({ expires_at: iso(NOW + 1) }, NOW)).toBe(false);
  });

  it('treats an unreadable expiry as expired', () => {
    expect(isExpired({ expires_at: 'never' }, NOW)).toBe(true);
  });

  it('extends from now, but never past the lifetime', () => {
    const young = { created_at: iso(NOW - 1000) };
    expect(extendedTo(young, NOW, TTL_MS.deciding)).toBe(iso(NOW + TTL_MS.deciding));

    const old = { created_at: iso(NOW - TTL_MS.lifetime + 10_000) };
    expect(extendedTo(old, NOW, TTL_MS.deciding)).toBe(iso(NOW + 10_000));
  });
});

describe('claim — a signed-in phone scans a browser’s code', () => {
  it('makes the scanner the approver and gives it the details to judge', () => {
    const decision = decideClaim(row(), APPROVER, NOW);
    expect(decision).toMatchObject({
      ok: true,
      patch: { state: 'claimed', user_id: APPROVER },
      value: { match_code: '42', requester: { label: 'Chrome on Windows', country: 'PL' } },
    });
  });

  it('gives a scanned code more time to be decided on', () => {
    const decision = decideClaim(row(), APPROVER, NOW);
    expect(decision.ok && decision.patch?.expires_at).toBe(iso(NOW + TTL_MS.deciding));
  });

  it('turns away a second scan of the same code', () => {
    expect(failed(decideClaim(claimed(), STRANGER, NOW)).status).toBe(409);
  });

  it('refuses an expired code', () => {
    expect(failed(decideClaim(row({ expires_at: iso(NOW - 1) }), APPROVER, NOW)).status).toBe(410);
  });

  it('refuses a phone code, which is joined, not claimed', () => {
    expect(failed(decideClaim(row({ mode: 'phone' }), APPROVER, NOW)).status).toBe(400);
  });
});

describe('join — a signed-out device scans a phone’s code', () => {
  const offered = (overrides: Partial<QrRow> = {}) =>
    row({ mode: 'phone', user_id: APPROVER, challenge: null, nonce_hash: 'b'.repeat(64), ...overrides });
  const input = { nonceMatches: true, challenge: CHALLENGE, label: 'Pixel 8', country: 'pl' };

  it('records who joined and what it will use to collect the token', () => {
    const decision = decideJoin(offered(), input, NOW);
    expect(decision).toMatchObject({
      ok: true,
      patch: { state: 'claimed', challenge: CHALLENGE, requester_label: 'Pixel 8', requester_country: 'PL' },
      value: { match_code: '42' },
    });
  });

  it('does not change who the approver is — the phone that showed the code', () => {
    const decision = decideJoin(offered(), input, NOW);
    expect(decision.ok && decision.patch).not.toHaveProperty('user_id');
  });

  it('refuses a wrong secret', () => {
    expect(failed(decideJoin(offered(), { ...input, nonceMatches: false }, NOW)).status).toBe(403);
  });

  it('refuses a row that has no secret on file rather than waving everyone in', () => {
    expect(failed(decideJoin(offered({ nonce_hash: null }), input, NOW)).status).toBe(403);
  });

  it('turns away a second device, so a photographed code cannot be joined twice', () => {
    expect(failed(decideJoin(offered({ state: 'claimed' }), input, NOW)).status).toBe(409);
  });

  it('refuses an expired code', () => {
    expect(failed(decideJoin(offered({ expires_at: iso(NOW) }), input, NOW)).status).toBe(410);
  });

  it('refuses a browser code, which is claimed, not joined', () => {
    expect(failed(decideJoin(row(), input, NOW)).status).toBe(400);
  });

  it.each([['nothing', undefined], ['a short string', 'abc'], ['upper-case hex', 'A'.repeat(64)], ['a number', 7]])(
    'refuses %s as a challenge',
    (_name, challenge) => {
      expect(failed(decideJoin(offered(), { ...input, challenge }, NOW)).status).toBe(400);
    },
  );

  it('cleans what the device says about itself', () => {
    const decision = decideJoin(offered(), { ...input, label: 'Pixel\n8\u0000', country: 'ZZZ' }, NOW);
    expect(decision.ok && decision.patch).toMatchObject({ requester_label: 'Pixel 8', requester_country: null });
  });
});

describe('status — the approver looks', () => {
  it('tells the approver the state and, once someone has joined, who', () => {
    const decision = decideStatus(claimed(), APPROVER, NOW);
    expect(decision).toMatchObject({
      ok: true,
      value: { state: 'claimed', requester: { label: 'Chrome on Windows', country: 'PL' } },
    });
  });

  it('shows no requester before anyone has joined', () => {
    const decision = decideStatus(row({ mode: 'phone', user_id: APPROVER, challenge: null }), APPROVER, NOW);
    expect(decision.ok && decision.value.requester).toBeNull();
  });

  it('reports a lapsed pairing as expired whatever state it was in', () => {
    const decision = decideStatus(claimed({ expires_at: iso(NOW - 1) }), APPROVER, NOW);
    expect(decision.ok && decision.value.state).toBe('expired');
  });

  it('tells anyone else nothing', () => {
    expect(failed(decideStatus(claimed(), STRANGER, NOW)).status).toBe(403);
    expect(failed(decideStatus(row(), APPROVER, NOW)).status).toBe(403);
  });
});

describe('approve', () => {
  it('lets the approver say yes to a pairing someone has joined', () => {
    expect(decideApprove(claimed(), APPROVER, NOW)).toEqual({ ok: true, value: null });
  });

  it('refuses everyone but the approver', () => {
    expect(failed(decideApprove(claimed(), STRANGER, NOW)).status).toBe(403);
  });

  it('refuses a pairing nobody has joined yet', () => {
    expect(failed(decideApprove(row({ user_id: APPROVER }), APPROVER, NOW)).status).toBe(409);
  });

  it.each(['approved', 'denied', 'consumed'] as const)('refuses a pairing already %s', (state) => {
    expect(failed(decideApprove(claimed({ state }), APPROVER, NOW)).status).toBe(409);
  });

  it('refuses a pairing that ran out while the approver was deciding', () => {
    expect(failed(decideApprove(claimed({ expires_at: iso(NOW - 1) }), APPROVER, NOW)).status).toBe(410);
  });

  it('writes the token with a short window to collect it, inside the lifetime', () => {
    expect(approvedPatch({ created_at: iso(NOW - 1000) }, 'tok', NOW)).toEqual({
      state: 'approved',
      token_hash: 'tok',
      expires_at: iso(NOW + TTL_MS.collecting),
    });
  });
});

describe('deny', () => {
  it('lets the approver decline a pairing that has been joined, and drops any token', () => {
    expect(decideDeny(claimed(), APPROVER, NOW)).toEqual({
      ok: true,
      value: null,
      patch: { state: 'denied', token_hash: null },
    });
  });

  it('lets a phone withdraw a code it is still showing', () => {
    const shown = row({ mode: 'phone', user_id: APPROVER, challenge: null });
    expect(decideDeny(shown, APPROVER, NOW).ok).toBe(true);
  });

  it('refuses everyone but the approver', () => {
    expect(failed(decideDeny(claimed(), STRANGER, NOW)).status).toBe(403);
  });

  it('is too late once approved or used', () => {
    expect(failed(decideDeny(approved(), APPROVER, NOW)).status).toBe(409);
    expect(failed(decideDeny(claimed({ state: 'consumed' }), APPROVER, NOW)).status).toBe(409);
  });
});

describe('redeem — the signed-out side collects', () => {
  const match = { verifierMatches: true };

  it('reports a code still waiting, without anything to collect', () => {
    expect(decideRedeem(row(), match, NOW)).toEqual({
      ok: true,
      value: { state: 'pending', match_code: '42', expires_at: row().expires_at },
    });
  });

  it('reports a code someone has scanned, so the screen can ask for the phone', () => {
    const decision = decideRedeem(claimed(), match, NOW);
    expect(decision.ok && decision.value.state).toBe('claimed');
    expect(decision.ok && 'patch' in decision && decision.patch).toBeFalsy();
  });

  it('hands over the token once, and erases it in the same breath', () => {
    const decision = decideRedeem(approved(), match, NOW);
    expect(decision).toEqual({
      ok: true,
      value: { state: 'approved', token_hash: 'tok' },
      patch: { state: 'consumed', token_hash: null },
    });
  });

  it('will not hand it over a second time', () => {
    expect(failed(decideRedeem(approved({ state: 'consumed', token_hash: null }), match, NOW)).status).toBe(410);
  });

  it('reports a refusal, so the screen can say so', () => {
    expect(decideRedeem(claimed({ state: 'denied' }), match, NOW)).toEqual({ ok: true, value: { state: 'denied' } });
  });

  it('answers a wrong verifier exactly as it answers a code that does not exist', () => {
    const wrong = failed(decideRedeem(approved(), { verifierMatches: false }, NOW));
    expect(wrong).toEqual({ ok: false, status: 404, error: 'Unknown code' });
  });

  it('does not let a row with no challenge be collected by anyone', () => {
    expect(failed(decideRedeem(approved({ challenge: null }), match, NOW)).status).toBe(404);
  });

  it('will not hand over a token after its window has closed', () => {
    expect(failed(decideRedeem(approved({ expires_at: iso(NOW - 1) }), match, NOW)).status).toBe(410);
  });

  it('refuses an approved row that has lost its token rather than inventing one', () => {
    expect(failed(decideRedeem(approved({ token_hash: null }), match, NOW)).status).toBe(410);
  });
});

describe('the rest', () => {
  it('writes a match code as two digits', () => {
    expect(matchCodeFrom(0)).toBe('00');
    expect(matchCodeFrom(0.07)).toBe('07');
    expect(matchCodeFrom(0.999999)).toBe('99');
  });

  it('limits how many codes one connection can start a minute', () => {
    expect(tooManyStarts(START_LIMIT_PER_MINUTE - 1)).toBe(false);
    expect(tooManyStarts(START_LIMIT_PER_MINUTE)).toBe(true);
  });

  it('recognises a SHA-256 hex digest and nothing else', () => {
    expect(isSha256Hex('0'.repeat(64))).toBe(true);
    expect(isSha256Hex('0'.repeat(63))).toBe(false);
    expect(isSha256Hex('G'.repeat(64))).toBe(false);
    expect(isSha256Hex(undefined)).toBe(false);
  });

  it('cleans a label and limits its length', () => {
    expect(cleanLabel('  Chrome \n on\tWindows ')).toBe('Chrome on Windows');
    expect(cleanLabel('x'.repeat(500))).toHaveLength(120);
    expect(cleanLabel('   ')).toBeNull();
    expect(cleanLabel(12)).toBeNull();
  });

  it('keeps a country only when it is two letters and not a placeholder', () => {
    expect(cleanCountry('pl')).toBe('PL');
    expect(cleanCountry('XX')).toBeNull();
    expect(cleanCountry('T1')).toBeNull();
    expect(cleanCountry('POL')).toBeNull();
    expect(cleanCountry(null)).toBeNull();
  });
});
