# 06 — New Features Spec

Four additions requested by the client. Decisions confirmed up front are baked in.

---

## 1. In-Progress carousel

**Goal:** On Library/Home, turn the **"Continue watching"** section (currently a grid
of up to 15 in-progress items — `src/pages/Home.jsx` ~line 312, 868) into a **horizontal
carousel** like the Browse rows.

**Spec:**

-   Reuse the same horizontal row component as Browse (`DiscoveryRow`, ported from
    `ScrollingRow.jsx`) so the visual language matches.
-   Source: `movies.filter(isInProgress)` (keep the current derivation), no hard cap or a
    higher cap (e.g. 30) since a carousel scrolls; keep most-recent-first.
-   Card = the standard `MovieCard`; tap → `edit/[movieId]`.
-   Show a per-item progress hint when available (`lastWatchedPosition`, or TV episode
    progress from `episodesWatched`/`seasonEpisodeCounts`).
-   Respect the active library search filter (current `continueWatchingFiltered`).
-   Empty → render nothing (as today).

**Notes / consistency:** Consider making a **Coming soon**
carousel too, for a uniform home feed. → ❓ **Confirm** whether both become
carousels or only Continue watching.
-> Good idea to save space and unify the UI, have it for both.

**Files (rewrite):** `LibrarySection` variant `carousel`, shared `MediaCarousel`
component used by both Library and Browse.

---

## 2. Better service filtering

**Goal:** Filter the library by streaming service, restricted to a **fixed popular
set**, and cleaner than today's free-form availability filter.

**Confirmed service set (7):**
`Netflix`, `Disney+`, `Max`, `Prime Video`, `Apple TV+`, `Paramount+`, `Hulu`.

**Spec:**

-   Central list `POPULAR_SERVICES` (order above) in the ported `lib/services.ts`, each
    with `{ name, icon, color, short }` merged from the current `SERVICE_CONFIG`
    (`src/lib/services.js`) and the icon map hardcoded in `MovieCard.jsx` (unify them).
-   Library filter UI: replace the availability dropdown with a **multi-select row of
    service chips/logos** (from `POPULAR_SERVICES`). Selecting one or more filters to
    titles whose normalized `availability` includes any selected service (OR).
-   Normalize every title's `availability` through `normalizeServiceName` in
    `normalizeMovie()` so matching is reliable
    ([02](./02-data-model.md#normalization-recommendations-for-the-rewrite)).
-   Titles with a provider **not** in the popular set: keep them; they simply won't match
    a popular-service filter. Optionally an "Other" chip. → ❓ **Confirm** if an "Other"
    bucket is wanted.
    -> Have an "Other" chip to show titles with providers outside the popular set. On movie pages allow to expamnd the other providers list to see all providers for that title.
-   Availability itself is country-specific (`useWatchProviderCountry`); the filter list
    stays the same 7 but the underlying `availability` reflects the user's country.

**Also applies to Browse** genre/discovery? The current Browse genre logic is unrelated
to services; this change is about the **library** filter. Leave Browse discovery as-is.

**Files:** `ServiceFilterChips` component, `POPULAR_SERVICES` constant, update
`useLibraryFilters` to filter by selected services.

---

## 3. Rewatch state (Watchlist + Watched)

**Goal:** A user can mark a title **watched** _and_ keep it in the **watchlist**
simultaneously — "I've seen it and I want to (re)watch it." Confirmed behaviour:
**"Want to rewatch"** — appears in _both_ Watched and Watchlist filters, badged
`Rewatch`.

**Good news:** the data model **already allows** `watched=true` + `inWatchlist=true`
(`src/lib/movieStatus.js` header comment: _"A movie can be both watched=true and
inWatchlist=true (for rewatching)"_). The gap is **UX + filtering**, not storage.

**Spec:**

-   **Edit screen:** the Watchlist toggle and the Watched counter are independent
    controls (they already are for movies — `EditMovieWatchStatus.jsx`). Ensure toggling
    Watchlist ON does **not** clear `watched`, and marking watched does **not** clear
    `inWatchlist`. (Movies: `inProgress` still clears `inWatchlist`; that mutual exclusion
    stays.) For **TV**, the `tvStatus` model needs a way to be `Completed` _and_ keep it
    in the watchlist — add a "Keep in watchlist (rewatch)" checkbox that sets
    `inWatchlist=true` while `watched=true`. → ❓ **Confirm** TV rewatch UI.
    -> For TV, add a "Keep in watchlist (rewatch)" checkbox on the Edit screen that allows users to mark a show as completed while keeping it in the watchlist.
-   **Display:** when `watched && inWatchlist`, show a `Rewatch` badge on the card
    (`MovieCard`) — distinct from the plain Watched check and Watchlist styling.
-   **Filters (`useLibraryFilters`):**
    -   `Watchlist` filter → `isInWatchlist(m)` (already true for rewatch items).
    -   `Watched` filter → `isWatched(m)` (already true).
    -   So a rewatch item naturally shows in both — verify the current filter code uses the
        boolean helpers, not the single `status` string (Home currently mixes: `Watchlist`
        → `isInWatchlist`, `Watched` → `isWatched`, else `getDisplayStatus`). Keep the
        boolean paths.
    -   Optional dedicated **"Rewatch"** filter option = `isWatched(m) && isInWatchlist(m)`.
-   **Continue-watching / random pick:** rewatch items are watchlist items, so they're
    eligible for random pick (matches current `validPickMovies` = watchlist when no
    status filter).
-   **Activity:** re-adding to watchlist a watched title logs `added_to_watchlist`
    (existing `updateMovie` logic) — fine.

**Files:** update `MovieCard` badge logic, `useLibraryFilters`,
`EditBasicTab`/`EditMovieWatchStatus`, optionally add "Rewatch" to the status filter
list.

---

## 4. Hall of Fame

**Goal:** A Stats section showcasing the user's **perfect-score** movies & shows.
Confirmed criterion: **`ratings.overall === 5`**.

**Spec:**

-   New Stats section (e.g. titled **"Hall of Fame"** with a trophy icon — Lucide
    `Trophy`, already imported in `Stats.jsx`).
-   Source: `movies.filter(m => m.ratings?.overall === 5)`.
    -   ❓ **Confirm** exact match `=== 5` vs `>= 5` (overall is clamped 0–5, so equivalent,
        but auto-calc can produce 4.9/5.0 — use `>= 5` to be safe, or round). Recommend
        `Math.round(overall * 10) / 10 >= 5` i.e. treat 5.0 only.
        -> only 5.0 overall counts, not 4.9 or 5.1 (rounding issues).
-   Present as a **horizontal carousel** of poster cards (consistent with feature #1),
    split into Movies and TV, or a single mixed row with type badges. → ❓ **Confirm**
    split vs mixed.
    -> Mixed row with type badges is simpler and more compact.
-   Each card taps through to `edit/[movieId]`.
-   Empty state: "No perfect scores yet — rate something 5/5 to induct it."
-   Works in **public** stats too (respects the same `movies` source that Stats already
    switches between own/public via `userId`).
-   Sort: by `completedAt` desc (most recently perfected first) or `title` — ❓ confirm;
    default `completedAt` desc, fallback `addedAt`.
    -> Sort by `completedAt` desc, fallback `addedAt` asc.

**Files:** `HallOfFame` component under `components/stats/`, add to `StatsScreen`,
`useHallOfFame(movies)` selector.

---

## Cross-cutting

-   All four use a shared **`MediaCarousel`** + **`MovieCard`** — build these first
    ([08](./08-migration-plan.md) Phase 2).
-   All respect `normalizeMovie()` so status/ratings/availability are consistent.
-   Keep everything backward-compatible with the existing Firebase shape — no schema
    changes are required for any of the four (rewatch and hall-of-fame both read existing
    fields).
