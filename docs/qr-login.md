# QR login

Sign a signed-out device in from a signed-in one by scanning a code. Radar owns the
server half because the account is shared; every Ping app speaks to it the same way
(`PING.md` §9.14).

**What exists:** the pairing table (`supabase/qr-login.sql`), the `qr-login` edge
function (`supabase/functions/qr-login/`), the pure client protocol in every app
(`src/lib/qrLogin.ts`), and the screens that use it (see *The screens*). Nothing here is
reachable until the SQL is applied and the function is deployed, and neither is done by
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

## The screens

Identical in all five apps except `features/auth/qr/qrCopy.ts`, which is each app's own
voice. Shared files: `lib/qr{Answers,DeviceLabel,Flow,Matrix,Poll}.ts`, `components/qr/*`,
`features/auth/qr/**` and the two routes below.

| Where | What it does |
| --- | --- |
| Sign-in screen, phone | *Sign in with a QR code* opens `qr-scan`, which scans a code a signed-in phone is showing (`join`, then polls `redeem`) |
| Sign-in screen, web | *Sign in with your phone* opens a code of its own (`start`, then polls `redeem`) for a signed-in phone to scan. Nothing is created until the button is pressed |
| Settings → Other devices | *Sign in another device* opens `qr-show`; *Scan a code* opens `qr-scan` (phones only) |
| `qr-scan` | One camera, both meanings. Signed in, a browser's code becomes a request to approve (`claim`); signed out, a phone's code is a way in. A real Ping code meant for the other side gets a sentence, not silence |
| `qr-show` | Signed in only. `offer`, shows the code and match code, polls `status`, and when somebody joins shows the same approval card |

The approval card is the defence and has no shortcuts: the match code, what the requesting
device *says* it is, where the server *saw* it, and two buttons. Leaving either signed-in
screen while a code or a request is open declines it.

A code that runs out is replaced by a new pairing, up to four times (`MAX_RENEWALS` in
`lib/qrFlow`), then the screen offers a new one by hand. The signed-out side keeps its
verifier in memory only, and its poll never restarts while a pairing is live: a second
`redeem` racing the one that collects the token would find it gone.

Android needs `CAMERA`, which `expo-camera`'s plugin declares. Radar strips unused
permissions in `plugins/withTrimmedMediaPermissions.js` and no longer strips this one.
The scanner needs a real build — it does not run in Expo Go.

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
