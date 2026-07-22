# 09 — TMDB & Firebase Integration Reference

External integrations to port verbatim (behaviour), retyped in TS.

> **TMDB** is unchanged and stays. **Firebase** is now the **migration source only** —
> the target backend is Supabase ([11](./11-supabase-migration.md)). The Firebase
> sections below document current behaviour so the migration and any parity checks are
> accurate; do not build new features on Firebase.

---

## TMDB

Source: `src/services/tmdb.js`. Base `https://api.themoviedb.org/3`, images
`https://image.tmdb.org/t/p/w500` (posters) and `/original` (backdrops). Auth via
**Bearer access token** header (`VITE_TMDB_ACCESS_TOKEN`); `VITE_TMDB_API_KEY` also
present. → move to `EXPO_PUBLIC_TMDB_ACCESS_TOKEN`.

### Endpoints used

| Function                                          | Endpoint                                                                                      | Used by                                                                                                         |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `searchMedia(q)`                                  | `/search/multi` (movie+tv, top 10)                                                            | Add/Edit search.                                                                                                |
| `searchBrowse(q)`                                 | `/search/multi` + `/genre/movie/list` (movies/tv/people/genres)                               | Browse universal search.                                                                                        |
| `fetchMediaMetadata(id,type,country)`             | `/{movie\|tv}/{id}?append_to_response=credits,aggregate_credits,external_ids,watch/providers` | Add/Edit/Detail/Refresh. Builds the full `Movie` metadata half — see [02](./02-data-model.md#the-movie-object). |
| `fetchSeasonDetails(id,season)`                   | `/tv/{id}/season/{n}`                                                                         | Episode tracker.                                                                                                |
| `getTrending()`                                   | `/trending/all/week`                                                                          | Browse.                                                                                                         |
| `getMovies(cat)`                                  | `/movie/{popular\|top_rated\|...}`                                                            | Browse.                                                                                                         |
| `getTVShows(cat)`                                 | `/tv/{popular\|top_rated\|airing_today\|on_the_air}`                                          | Browse.                                                                                                         |
| `getMoviesByGenre(id,type)`                       | `/discover/{movie\|tv}?with_genres=&sort_by=popularity.desc&vote_count.gte=100`               | Browse genre rows.                                                                                              |
| `fetchGenreMovies(id,page)`                       | `/discover/movie?...sort_by=vote_average.desc&vote_count.gte=100`                             | Genre page (paginated).                                                                                         |
| `getSimilarMovies` = `fetchSimilarMedia(id,type)` | `/{movie\|tv}/{id}/similar`                                                                   | "Because you liked" recs.                                                                                       |
| `fetchDirectorDetails/Movies(id)`                 | `/person/{id}` , `/person/{id}/movie_credits` (job=Director)                                  | Director page.                                                                                                  |
| `fetchActorDetails/Movies(id,page)`               | `/person/{id}` , `/person/{id}/movie_credits` (cast)                                          | Actor page.                                                                                                     |
| `searchDirectors(q)`                              | `/search/person` (dept=Directing)                                                             | Director autocomplete.                                                                                          |
| `getGenres(type)`                                 | `/genre/{movie\|tv}/list`                                                                     | genre id↔name.                                                                                                  |

### Notes for the rewrite

-   **Wrap all of these in react-query** (`queryKey` per call) — gives caching,
    dedupe, retries, and is the backbone of the Browse-stability fix
    ([05](./05-state-and-navigation.md)).
-   `fetchMediaMetadata` renames TMDB `status` → `tmdbStatus` to avoid colliding with the
    user watch status. **Keep this.**
-   Watch providers: reads `watch/providers.results[country] || US`, takes `flatrate`
    names. Country from `useWatchProviderCountry`. Feeds the service filter
    ([06](./06-new-features-spec.md#2-better-service-filtering)).
-   Genre id/name handling is duplicated (a hardcoded `allGenres` list in `Browse.jsx`
    _and_ `getMovieGenresCached` in `tmdb.js`). Consolidate into one cached genre source.
-   Director extraction differs movie (credits.crew job=Director) vs tv (`created_by`).
    Cast uses `aggregate_credits` for tv. Preserve.
-   TMDB genre cache TTL is 24h (`GENRE_CACHE_MS`). Keep; react-query `staleTime` can own
    this instead of module-level globals.

---

## Firebase

### Init

`src/lib/firebase.js` exports `auth`, `db` (RTDB), `googleProvider`. In RN with the JS
SDK, initialize auth with RN persistence:

```ts
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
});
```

(Or `@react-native-firebase` — trade-off in [07](./07-rn-expo-stack.md#firebase-js-sdk-vs-native).)

### Auth

Current `AuthContext.jsx`:

-   Native (Capacitor): `GoogleAuth.signIn()` → `GoogleAuthProvider.credential(idToken)`
    → `signInWithCredential`.
-   Web: `signInWithPopup`.
-   On first sign-in: generate unique `user<suffix>` username, write `profile`,
    `usernames/<name>`, `userSearchIndex/<uid>` in one multi-path `update`.

**Rewrite (now Supabase Auth — [11](./11-supabase-migration.md#auth)):**

-   Auth moves to Supabase with **more methods**: Google + email/password
    (Apple before iOS). Native Google via `@react-native-google-signin/google-signin` →
    `supabase.auth.signInWithIdToken`; web via `signInWithOAuth`.
-   The profile-bootstrap multi-path write is replaced by a **DB trigger**
    (`handle_new_user`) that seeds `profiles` + `user_settings`
    ([11](./11-supabase-migration.md#auto-create-profile-on-signup)).
-   Preserve "gate children until auth resolved" (Supabase `onAuthStateChange` +
    `getSession` at boot).

### Realtime Database subscriptions (source system)

Describes the **current** Firebase reads to replicate during migration. The target uses
Supabase Realtime instead ([11](./11-supabase-migration.md#realtime)):

-   Read via `onValue`; the current bespoke localStorage cache is dropped in favour of
    react-query ([05](./05-state-and-navigation.md#data-subscriptions)).
-   Current writes `stripUndefined()` payloads — RTDB rejects `undefined`
    ([04-I](./04-known-issues-and-fixes.md)); still useful for `jsonb` in Postgres.
-   Push IDs for `movies`/`activity`/`history` keys (time-sortable) → `uuid` PKs in Postgres.

### Security rules → RLS

The `database.rules.json` visibility model is **translated to Postgres RLS** in
[11](./11-supabase-migration.md#rls-policies) (`private.can_view()` helper + per-table
policies). Current rules, for reference during translation:

-   `usernames/*`, `userSearchIndex/*`, `profile`, `settings/privacy`, `settings/stats`
    are publicly readable (needed for public shelf + search).
-   `movies`, `activity`, `friends` readable by: owner, OR if
    `settings/privacy/friendsVisibility === 'public'`, OR if visibility ≠ `noone` **and**
    requester is in the owner's `friends`.
-   `history`, `settings` (except privacy/stats) owner-only.
-   Friend-request/accept write logic encodes the request handshake — read the rule for
    `friends/$friendUid` before touching the friend flow.

### Deep links

`AppUrlListener` (Capacitor) handles incoming URLs today (public shelf links). Replace
with **expo-linking** + Expo Router. Register scheme `radar://` and map web-style
`/u/:userId` paths.

---

## Env vars

| Current (`.env`, Vite)              | Rewrite (Expo)                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `VITE_TMDB_ACCESS_TOKEN`            | `EXPO_PUBLIC_TMDB_ACCESS_TOKEN`                                                         |
| `VITE_TMDB_API_KEY`                 | `EXPO_PUBLIC_TMDB_API_KEY` (if still needed)                                            |
| Firebase web config (`firebase.js`) | **`EXPO_PUBLIC_SUPABASE_URL`** + **`EXPO_PUBLIC_SUPABASE_ANON_KEY`** (publishable key)  |
| —                                   | Supabase `service_role` key → **server/migration script only**, never in the app bundle |

> Note: `EXPO_PUBLIC_*` vars are embedded in the bundle (not secret) — same exposure
> level as the current `VITE_*` web build, so no regression. A TMDB token and the
> Supabase anon/publishable key are meant to be public (RLS is what protects data). The
> `service_role` key must never ship in the client.
