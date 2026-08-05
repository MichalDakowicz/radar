# Radar — Google Play initial release

Everything Play Console asks for on a first submission, with the answer to give. Copy the
blocks verbatim; the character limits are Play's own.

## 1. Artifact

| Field        | Value                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| Bundle       | `android/app/build/outputs/bundle/release/radar-v2.8.0.aab`                     |
| Package name | `com.michaldakowicz.radar`                                                      |
| Version name | `2.8.0`                                                                         |
| Version code | `14`                                                                            |
| Signing      | Play App Signing, upload key `radar-upload` (`credentials/upload-keystore.jks`) |

Version code 14 is the first code Play will see. Every later upload must be higher, so keep
bumping `expo.android.versionCode` in `app.json` exactly as before.

**"No deobfuscation file associated with this App Bundle" is expected.** R8 is off
(`android.enableMinifyInReleaseBuilds` is unset), so nothing is obfuscated and release
stack traces already carry real class names — there is no mapping file to upload. Play
shows this on every non-minified bundle. Turning R8 on would shave single-digit MB off the
bundle at most, because the size is native `.so` per ABI plus Hermes plus the JS bundle,
not Java bytecode — and it risks release-only crashes wherever React Native or an Expo
module resolves a class by reflection. Left off deliberately; revisit with a device test
pass, not on a release day.

## 2. Store listing

**App name** (30 chars max)

```
Radar
```

**Short description** (80 chars max)

```
Track every film and show you watch, and see what your friends are watching.
```

**Full description** (4000 chars max)

```
Radar is a watchlist that remembers. Add a film or a show, and Radar pulls the poster, the cast, the runtime and the release date from TMDB so you never type metadata by hand.

KEEP ONE LIBRARY
Everything you own or mean to watch lives in one place, whatever the format — digital, DVD, Blu-ray or VHS. Filter and group by director, genre, year, format or status, and find anything in a couple of taps.

LOG WHAT YOU WATCH
Mark a film watched, tick episodes off a season, and Radar keeps the history. Streaks show the days you kept going.

SEE YOUR HABITS
Stats turns your history into something readable: hours watched, genre spread, your most-watched directors, library value, and how the last 30 days compare to the year.

RADAR RECAP
At the end of every month and every year, Radar builds you a recap — your hours, your top films, your genres as a type wall, your directors on a podium, your year as a day-by-day heatmap. Swipe through it like a story and share the final card as an image.

WATCH WITH FRIENDS
Add friends, see what they finished today, compare your rankings, and browse their public shelves. Or share a read-only link so anyone can see your library without an account.

DISCOVER
Browse what's popular, what's coming, and what's on the services you actually pay for. Radar can also just pick something for you at random.

NOTIFICATIONS THAT EARN THEIR PLACE
A heads-up before a watchlist title comes out and again on release day, a nudge when today would break your streak, and friend activity — all filtered by settings you control, with quiet hours overnight.

YOUR DATA STAYS YOURS
Export the whole library to JSON whenever you like, and import it back. Nothing is locked in.

Radar uses the TMDB API but is not endorsed or certified by TMDB.
```

**Category / tags**

- App category: **Entertainment**
- Tags: Movies & TV, Media & Video, Lifestyle (pick up to 5 from Play's list)

**Contact details**

- Email: `michal.dakowicz2007@gmail.com`
- Website: the Firebase Hosting URL for the web build
- Phone: optional, leave blank

## 3. Graphics you still need to make

Play will not let the listing save without these. Only the icon exists today.

| Asset             | Spec                                             | Status                                                       |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| App icon          | 512×512 PNG, 32-bit, no alpha                    | derive from `assets/images/icon.png`                         |
| Feature graphic   | 1024×500 PNG/JPG, no alpha                       | **missing** — needs designing                                |
| Phone screenshots | 2–8, 16:9 or 9:16, min 1080 px on the short side | **missing** — capture Library, Browse, Stats, Recap, Friends |
| 7" tablet shots   | optional unless you declare tablet support       | skip                                                         |

Screenshots are easiest from the connected device:

```sh
adb exec-out screencap -p > screenshot.png
```

## 4. Release notes (what's new)

500 chars max per locale. For an initial release keep it a description, not a changelog:

```
First release on Google Play. Track your films and shows, log what you watch, follow friends, read your monthly and yearly Radar Recap, and see your habits in Stats.
```

## 5. App content declarations

| Question                    | Answer                                                                                                                                                                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy policy              | `https://radar-watchlist.web.app/privacy`                                                                                                                                                                                                    |
| Delete account URL          | `https://radar-watchlist.web.app/delete-account` — Data safety → Data deletion                                                                                                                                                               |
| App access                  | All functionality requires an account → provide demo credentials                                                                                                                                                                             |
| Ads                         | No ads                                                                                                                                                                                                                                       |
| Content rating              | Complete the questionnaire; Radar is a catalogue app — no violence, no sex, no gambling. Answer "no" throughout, expect PEGI 3 / ESRB Everyone. User-generated content: **yes**, because friends see each other's libraries and profile text |
| Target audience             | 13+ (account, social features). Not designed for children                                                                                                                                                                                    |
| News app                    | No                                                                                                                                                                                                                                           |
| COVID-19 contact tracing    | No                                                                                                                                                                                                                                           |
| Data safety                 | See §6                                                                                                                                                                                                                                       |
| Government app              | No                                                                                                                                                                                                                                           |
| Financial features          | None                                                                                                                                                                                                                                         |
| Health                      | None                                                                                                                                                                                                                                         |
| Photo and video permissions | Radar declares `READ_MEDIA_IMAGES` via `expo-image-picker` for avatars. Play needs a justification video/text, or drop the permission and use the system photo picker — see §7                                                               |

**App access — demo account**

Play reviewers cannot sign up with a real address, so create a throwaway Supabase account
with a seeded library and give it in the App access form:

```
Email: <demo account email>
Password: <demo account password>
Instructions: Sign in on the first screen. Library, Browse, Stats, Friends and Profile
are all reachable from the bottom bar. Recap tiles are on Profile.
```

## 6. Data safety form

Radar's backend is Supabase (Postgres + Auth) and FCM for push. All of it is collected,
all of it is tied to the account, none of it is sold, and everything is encrypted in
transit (HTTPS/TLS).

| Data type                                                          | Collected | Linked to user | Purpose                           | Optional |
| ------------------------------------------------------------------ | --------- | -------------- | --------------------------------- | -------- |
| Email address                                                      | Yes       | Yes            | Account management                | No       |
| Name / username                                                    | Yes       | Yes            | Account management, social        | No       |
| Photos (avatar)                                                    | Yes       | Yes            | Account management, social        | Yes      |
| App activity (library, watch history, ratings)                     | Yes       | Yes            | App functionality, social         | No       |
| App interactions / other user content (friend links, public shelf) | Yes       | Yes            | App functionality, social         | Yes      |
| Device or other IDs (FCM token)                                    | Yes       | Yes            | App functionality (notifications) | Yes      |

Answers to the standing questions:

- Is data encrypted in transit? **Yes**
- Can users request deletion? **Yes**, via
  `https://radar-watchlist.web.app/delete-account`. That page commits to deletion within 30
  days of a verified email request — there is no in-app deletion flow, so honouring it means
  deleting the rows in Supabase by hand
- Do you collect data for advertising? **No**
- Do you share data with third parties? **No**. TMDB is queried for metadata — that is a
  request out, not user data shared
- Data collection required or optional? Account data required, avatar and notifications
  optional

## 7. Decide this before you create the app in Play Console

Play App Signing means Google holds the key the installed app is signed with. That key is
not the upload key, and it is not the debug keystore the GitHub-release APKs have always
used — so a Play install and a sideloaded `radar-v*.apk` will refuse to upgrade over each
other, and anyone already running a sideloaded Radar has to uninstall before installing
from Play. Two ways out, and the choice is only offered while setting the app up:

- **Let Google generate the app signing key** (the default). Simplest, safest, and the
  sideload/Play split above is permanent.
- **Upload your own app signing key.** Sign the GitHub APKs with the same key and both
  channels upgrade over each other. Costs you the responsibility of keeping that key
  forever — Google cannot re-issue it.

Pick the default unless keeping the GitHub sideload channel upgradeable matters to you.

**Either way, `public/.well-known/assetlinks.json` needs updating after the first upload.**
It currently lists one SHA-256 fingerprint, the debug keystore's, so Android App Links only
verify for sideloaded builds. Once the app exists in Play Console, copy the app signing
certificate's SHA-256 from Setup → App integrity and add it to the
`sha256_cert_fingerprints` array — the field takes a list, so both can sit there and both
channels keep working. Then `npm run deploy:web` to publish it.

## 8. Blockers before you can submit

1. ~~**Privacy policy URL.**~~ Done — `public/privacy.html`, served at `/privacy` via a
   Firebase rewrite. It is a static file rather than an Expo Router route so no auth gate,
   no JS and no app shell stands between Play's reviewer and the text. Keep the data safety
   answers in §6 matching it; if one changes, change both.
2. **Photo and video permissions.** `expo-image-picker` pulls in `READ_MEDIA_IMAGES`,
   `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO` and `RECORD_AUDIO`. Play requires a written
   justification for the media permissions, and `RECORD_AUDIO` on a watchlist app invites
   a rejection. Either strip the unused ones from the merged manifest with a
   `tools:node="remove"` config plugin, or move avatar picking to the system photo picker
   so no media permission is needed at all.

## 9. Release track for a first ship

Do not go straight to production. Play holds new personal developer accounts to a closed
testing requirement anyway.

1. **Internal testing** — upload the AAB, add your own address as a tester, install from
   the Play link, confirm the Play-signed build runs. This is the only way to catch an
   upload-key or Play-App-Signing mistake before it matters.
2. **Closed testing** — if the account is a personal (non-organisation) one opened after
   November 2023, Play requires 12 testers opted in for 14 continuous days before
   production access unlocks.
3. **Production** — same AAB, promoted. Roll out at 20% first if you want a safety net.
