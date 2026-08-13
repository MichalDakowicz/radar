# 02 — Data Model

This doc documents the **current Firebase Realtime Database** shapes — the migration
_source_. The backend is moving to **Supabase/Postgres**; the relational **target
schema** (and the field-by-field mapping) is in
[11-supabase-migration.md](./11-supabase-migration.md#schema-mapping-rtdb-tree--postgres).
The object shapes the app code consumes stay close to what's described here (via
`normalizeMovie`), so this remains the reference for field meanings; only the storage
layer changes. The JSON export/import format is preserved for a lossless migration.

Source of truth for shapes: `src/hooks/useMovies.js`, `src/pages/EditMovie.jsx`
(`handleSave` builds the full write payload), `src/services/tmdb.js`
(`fetchMediaMetadata` builds the metadata half), `database.rules.json`.

## Top-level tree

```
usernames/<username>            -> uid            (uniqueness reservation)
userSearchIndex/<uid>           -> { username, displayName, pfp }
users/<uid>/
  profile        -> { username, displayName, pfp }
  movies/<movieId> -> Movie          (see below)
  activity/<pushId> -> ActivityEvent
  history/<pushId>  -> (watch history entries; private)
  settings/
    watchProviderCountry        -> "US" | "PL" | ...
    recentlyAddedDays           -> number (1..365, default 30)
    showRecentlyAddedSection    -> boolean (default true)
    privacy/friendsVisibility   -> "public" | "friends" | "noone"
    stats/streakThreshold       -> number (movies/week, default 2)
    stats/tvStreakThreshold     -> number (episodes/week, default 5)
  friends/<friendUid>           -> true
  friendRequests/<senderUid>    -> { ...request info }
```

`movieId` and activity/history keys are Firebase **push IDs** (chronologically
sortable). See `database.rules.json` for read/write authorization (summarized in
[09-tmdb-and-firebase.md](./09-tmdb-and-firebase.md#security-rules)).

## The `Movie` object

A movie/show node combines **TMDB metadata** with **user tracking fields**. Not every
field is always present (older records, manually-added items). The rewrite should treat
all tracking fields as optional and normalize on read.

### Identity & metadata (from TMDB)

| Field                                      | Type              | Notes                                                                                                                                                               |
| ------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                       | string            | Firebase key (added on read in `useMovies`, not stored).                                                                                                            |
| `tmdbId`                                   | number            | TMDB id. Null for purely manual entries.                                                                                                                            |
| `imdbId`                                   | string            | From TMDB `external_ids`.                                                                                                                                           |
| `type`                                     | `"movie" \| "tv"` | Legacy values `"TV Show"` also appear — normalize.                                                                                                                  |
| `title`                                    | string            | `title` (movie) or `name` (tv).                                                                                                                                     |
| `director`                                 | array             | For movies: `[{id,name}]` directors. For TV: `created_by`. May be legacy `string` or `string[]`; `directorToDisplayString()` normalizes.                            |
| `cast`                                     | array             | `[{id,name}]`, up to 15.                                                                                                                                            |
| `genres`                                   | array             | `[{id,name}]` (newer) or `string[]` (legacy). Both handled throughout.                                                                                              |
| `releaseDate`                              | string            | `YYYY-MM-DD` (movie `release_date` / tv `first_air_date`).                                                                                                          |
| `coverUrl`                                 | string            | Full TMDB poster URL (`w500`).                                                                                                                                      |
| `overview`                                 | string            |                                                                                                                                                                     |
| `runtime`                                  | number            | Minutes (movie) or avg episode runtime (tv).                                                                                                                        |
| `voteAverage` / `voteCount`                | number            | TMDB public score.                                                                                                                                                  |
| `tagline`, `budget`, `revenue`             |                   | Movie extras.                                                                                                                                                       |
| `productionCompanies`                      | `[{name,logo}]`   |                                                                                                                                                                     |
| `number_of_seasons` / `number_of_episodes` | number            | TV.                                                                                                                                                                 |
| `tmdbStatus`                               | string            | TMDB production status (e.g. "Released"). **Renamed from `status`** to avoid colliding with the user watch status — see the delete-list in `Browse.handleQuickAdd`. |
| `availability`                             | `string[]`        | Streaming providers (flatrate) for the user's country, normalized names.                                                                                            |

### User tracking fields

| Field                 | Type               | Notes                                                                                                                                                                     |
| --------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`              | string             | **Legacy** watch status string (`"Watchlist"`, `"Watching"`, `"Completed"`, `"Watched"`, `"Plan to Watch"`, `"On Hold"`, `"Dropped"`). Still written for backward compat. |
| `inWatchlist`         | boolean            | New model.                                                                                                                                                                |
| `inProgress`          | boolean            | New model.                                                                                                                                                                |
| `watched`             | boolean            | New model (watched ≥ once).                                                                                                                                               |
| `timesWatched`        | number             | Rewatch counter.                                                                                                                                                          |
| `completedAt`         | number(ms) \| null | When first completed (drives streak calendars).                                                                                                                           |
| `lastWatchedPosition` | string             | Free text (e.g. `"45:30"` or `"S02E05 at 23:15"`).                                                                                                                        |
| `ratings`             | object             | See below.                                                                                                                                                                |
| `notes`               | string             | Personal review.                                                                                                                                                          |
| `url`                 | string             | External watch link.                                                                                                                                                      |
| `customOrder`         | number             | Manual reorder key (Library drag & drop).                                                                                                                                 |
| `addedAt`             | number(ms)         | Add timestamp; default library sort.                                                                                                                                      |
| `updatedAt`           | number(ms)         | Last edit.                                                                                                                                                                |
| TV episode tracking   |                    | `episodesWatched`, `episodeWatchDates`, `seasonEpisodeCounts` — see below.                                                                                                |

### `ratings` object

```jsonc
// Movie
{ "story": 0-5, "acting": 0-5, "ending": 0-5, "enjoyment": 0-5, "overall": 0-5 }

// TV
{ "overall": 0-5, "seasons": { "1": { overall, story, acting, ending, enjoyment }, ... } }
```

-   Sliders step by 0.5 (categories) / 0.1 (overall auto-calc) — `EditMovie.jsx`.
-   **`overall` is the canonical single score.** MovieCard shows `overall` if > 0, else
    the average of the sub-ratings (`src/features/movies/MovieCard.jsx` `ratingScore`).
-   Legacy season format `{ "1": 4.5 }` (flat number) is auto-upgraded to the object
    form on load (`EditMovie.jsx` ~line 189).
-   **New "Hall of Fame"** keys off `ratings.overall === 5` — see
    [06](./06-new-features-spec.md#4-hall-of-fame).

### TV episode tracking

| Field                 | Shape                        | Notes                                                                          |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| `episodesWatched`     | `{ "s<season>e<ep>": true }` | Key format `s1e1`. Derived mirror of the log below — the friend-shelf query reads this column directly. |
| `episodeWatchDates`   | `{ "s1e1": [<iso>, <iso>] }` | The watch log and the source of truth: one stamp per watch, so a rewatched episode keeps every date. `count(key) = dates.length`, `watched(key) = count > 0`. Pre-2.12.0 rows hold one bare stamp (or epoch ms) per key and are coerced on read by `src/lib/episodes.ts`. |
| `seasonEpisodeCounts` | `{ "<season>": <count> }`    | Cached episode counts per season so "next episode" logic can roll to S(n+1)E1. |

`timesWatched` is the **total** watches, and the dated records are a subset of it
(`src/lib/watchCounts.ts`):

```
timesWatched = datedPasses + undatedWatches
datedPasses    tv -> showWatchCount(log)      movie -> completedAt ? 1 : 0
```

A series' dated count is the minimum watch count across every episode TMDB lists
(`showWatchCount`), so all 62 episodes at 2 means two dated passes and any episode
at 0 means no complete dated pass. The remainder is `undatedWatches` — watches with
no day behind them, which count towards hours and the watch count and are invisible
to every calendar and streak. That is how "I saw it years ago and never logged it"
is recorded without moving a streak, and how a pre-2.12.0 row carrying
`times_watched: 5` with no episode data keeps its five.

Season details themselves are fetched on demand from TMDB
(`fetchSeasonDetails(tmdbId, season)`), not stored.

## The status model (important)

Defined in `src/lib/movieStatus.js`. The app is **mid-migration** from a single
`status` string to three booleans. The rewrite should standardize on the booleans and
keep writing `status` only for backward/export compat.

**Rules (current):**

-   `inWatchlist` and `inProgress` are **mutually exclusive**.
-   `watched` is **independent** — a title can be `watched=true` **and**
    `inWatchlist=true` (the "want to rewatch" case). This is already legal in the model;
    the rewrite makes it a first-class UX (see
    [06](./06-new-features-spec.md#3-rewatch-state-watchlist--watched)).
-   Default new item: `inWatchlist=true, inProgress=false, watched=false`.

**Helpers to port 1:1** (with tests): `migrateStatus`, `getDisplayStatus`,
`isInWatchlist`, `isInProgress`, `isWatched`, `setToWatchlist`, `setToInProgress`,
`setToWatched`, `getStatusIcon`.

`getDisplayStatus` priority: `inProgress → "Watching"`, else `inWatchlist →
"Watchlist"`, else `watched → "Completed"`, else `"Watchlist"`.

> ⚠️ **Movies vs TV diverge in EditMovie.** Movies derive status from
> `timesWatched > 0` / `inProgress` / `inWatchlist` toggles. TV derives from a
> `tvStatus` string (`Plan to Watch`/`Watching`/`Completed`/`On Hold`/`Dropped`). Keep
> both paths; unify the _stored_ booleans on save (see `EditMovie.handleSave`).

## `ActivityEvent`

Written by `useMovies.logActivity` on every mutation. Shape:

```jsonc
{
  "movieId": "<pushId>",
  "movieTitle": "…",
  "type": "added" | "completed" | "started_watching" | "added_to_watchlist"
        | "status_changed" | "rating_changed" | "updated" | "removed",
  "timestamp": <ms>,
  "mediaType": "movie" | "tv",
  // plus type-specific: timesWatched, oldStatus, newStatus, rating, status
}
```

`undefined` values are stripped before write (Firebase rejects them) — see
`logActivity` and `stripUndefined` in `RefreshMetadataContext.jsx`. **Port this
guard** — a very common source of write failures.

## Profile & social

-   `profile`: `{ username, displayName, pfp }`. Auto-created on first sign-in with a
    random `user<suffix>` username (`AuthContext.jsx`).
-   `userSearchIndex/<uid>`: denormalized copy for friend search (`UserSearch`).
-   `friends/<friendUid> = true`; friend requests under `friendRequests`.
-   Visibility: `settings/privacy/friendsVisibility` gates read access to
    `movies`/`activity`/`friends` in the security rules.

## Import/Export format

`src/features/settings/ImportExportModal.jsx` reads/writes the movies collection as
JSON. **Confirm exact shape before porting** so exports remain cross-compatible.

> ❓ **Confirm:** Should export include settings/activity or only `movies`? (Current
> behaviour to be verified in `ImportExportModal.jsx`.)
-> Only `movies` (settings and activity are private, not portable).

## Normalization recommendations for the rewrite

Create a single `normalizeMovie(raw)` used at the read boundary so screens never
branch on legacy shapes:

-   `type`: map `"TV Show"` → `"tv"`.
-   `director`/`genres`/`cast`: coerce to arrays of `{id?,name}`.
-   Ensure boolean status flags exist (run `migrateStatus`).
-   `availability`: map through `normalizeServiceName`, dedupe.
-   Provide computed `displayRating` (overall-or-average) once, not per-card.
