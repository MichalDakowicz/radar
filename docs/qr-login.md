# QR login

Sign a signed-out device in from a signed-in one by scanning a code. Radar owns the
server half because the account is shared; every Ping app speaks to it the same way
(`PING.md` §9.14).

**What exists:** the pairing table (`supabase/qr-login.sql`), the `qr-login` edge
function (`supabase/functions/qr-login/`), and the pure client protocol in every app
(`src/lib/qrLogin.ts`). **What does not yet:** the screens — the QR to show, the
scanner, the approval sheet, the web login page. Nothing here is reachable from the
apps until the SQL is applied and the function is deployed, and neither is done by
any commit: both are applied by hand.

## Two directions, one pairing

|                  | `web`                              | `phone`                                    |
| ---------------- | ---------------------------------- | ------------------------------------------ |
| Shows the code   | a signed-out browser               | a signed-in phone                          |
| Scans the code   | a signed-in phone (the approver)   | a signed-out device (the requester)        |
| Code carries     | the pairing id                     | the pairing id and a one-time secret       |

In both, the **signed-out side holds a verifier** — 32 random bytes, base64url — that
never leaves it. It sends the server `challenge = hex(sha256(verifier as UTF-8))` when
it joins the pairing, and later proves it holds the verifier to collect the token. A
code, or a photo of one, therefore names a pairing but opens nothing: a person on the
signed-in side still has to say yes.

## The actions

One endpoint, `POST /functions/v1/qr-login`, JSON in and out, `{ "action": … }`.

| Action    | Who                      | Body                              | Answer                                         |
| --------- | ------------------------ | --------------------------------- | ---------------------------------------------- |
| `start`   | signed-out (web)         | `challenge`, `label`              | `id`, `match_code`, `expires_at`               |
| `offer`   | signed-in (phone)        | —                                 | `id`, `nonce`, `match_code`, `expires_at`      |
| `claim`   | signed-in, scanned web   | `id`                              | `match_code`, `requester`, `expires_at`        |
| `join`    | signed-out, scanned phone| `id`, `nonce`, `challenge`, `label` | `match_code`, `expires_at`                   |
| `status`  | the approver             | `id`                              | `state`, `match_code`, `requester`, `expires_at` |
| `approve` | the approver             | `id`                              | `ok`                                           |
| `deny`    | the approver             | `id`                              | `ok`                                           |
| `redeem`  | signed-out               | `id`, `verifier`                  | `state`, and once, `token_hash`                |

The signed-in actions need `Authorization: Bearer <session access token>`. The code on
screen is `ping-login:1:w:<id>` (web) or `ping-login:1:p:<id>.<nonce>` (phone);
`readQrPayload` is the only thing that should ever turn scanned text into a request.

The signed-out side polls `redeem` until it sees `approved`, then redeems the token
with `auth.verifyOtp({ token_hash, type: 'email' })` — the same call the sibling
sign-in handoff ends in. `PairView` in `lib/qrLogin` maps the server's states to what
a screen shows.

## What it defends against, and what it does not

- **A photographed or shared code.** Web codes carry no secret and can be scanned once;
  phone codes can be joined once. A second scanner is turned away (`409`).
- **Someone showing you *their* code to scan** (QR login hijacking). This is the real
  one, and no protocol removes it: the approving phone shows a two-digit **match code**
  that must equal the one on the screen being signed in, plus the requester's device
  label and the **country the server saw**. The label is the device's own claim and is
  presented as one; the country is observed.
- **A stolen token.** The token never reaches the approver, lives on the server for at
  most 30 seconds after approval, and is handed only to whoever presents the verifier,
  exactly once (the row flips to `consumed` in the same conditional write that returns
  it).
- **Guessing.** Pairing ids are random UUIDs; the verifier and the phone secret are 256
  and 128 bits. A wrong verifier gets the same `404` as a code that never existed.
- **Flooding.** One connection may start 10 codes a minute.

Not defended: a person who approves without looking. The match code and the country are
there to make looking worth it, not to make it unnecessary.

Lifetimes (`TTL_MS` in `logic.ts`): a code on screen lasts 60 seconds; once scanned, 90
seconds to decide; once approved, 30 seconds to collect; and nothing outlives five
minutes from creation. Finished pairings are swept ten minutes after they expire.

## Applying it

Both steps are by hand and neither is part of any app release.

1. **Table.** Supabase Dashboard → SQL Editor → paste `supabase/qr-login.sql` → Run.
   Run `schema.sql` first. Re-running is safe.
2. **Function.**

   ```sh
   npx supabase functions deploy qr-login --no-verify-jwt --project-ref <ref>
   ```

   `--no-verify-jwt` because `start`, `join` and `redeem` are called by someone who is
   not signed in. The signed-in actions verify the bearer themselves against
   `/auth/v1/user`, which also checks that the session still exists.

The function uses only the environment the edge runtime already injects
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`). It reads the
connecting country from the CDN's `cf-ipcountry` header; if that is ever absent the
approving screen simply has no country to show.

## Tests

`supabase/functions/qr-login/logic.test.ts` covers every transition — claim, join,
status, approve, deny, redeem — including the replays and races that matter (a second
scanner, a second collector, a wrong verifier, a token after its window, an approval
after expiry). It runs with the app's `npm test`. `index.ts` is the thin layer around
it and is not run by Jest; it is type-checked against the Deno runtime when deployed.
