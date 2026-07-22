# 08 — Migration Plan

A phased, always-buildable path from an empty Expo app to full parity + the four new
features. Each phase ends with something runnable on device.

Ground rules (from the client):

-   **Full rewrite** — new Expo project, not a port of the WebView build.
-   **Styling ported in every phase** — screens land looking right, not bare.
-   **Small files, separated components** — see
    [10-code-conventions.md](./10-code-conventions.md); no giant page files this time.
-   **Backward-compatible with the existing Firebase data** — a current user's data opens
    in the new app unchanged.

---

## Phase 0 — Scaffold

-   New Expo + TypeScript app, Expo Router, NativeWind, react-query, MMKV, Reanimated,
    gesture-handler, safe-area, expo-image, FlashList, lucide-react-native,
    **@supabase/supabase-js**.
-   Theme tokens mirroring `ThemeContext`; dark default.
-   **Supabase project**: create it, apply the schema + RLS + auth-trigger from
    [11](./11-supabase-migration.md); enable Google + email/password
    providers. `lib/supabase.ts` (client + RN session persistence). `.env`/`EXPO_PUBLIC_*`
    for TMDB + Supabase URL/anon key.
-   Root `_layout.tsx` provider stack (Query → Auth → Theme → Toast → RefreshMetadata),
    gated on auth-resolved (mirror `AuthProvider` behaviour).
-   **Deliverable:** app boots to a Login screen; theme works.

## Phase 1 — Auth + data spine

-   **Supabase Auth**: Google + email/password
    ([11](./11-supabase-migration.md#auth)); profile auto-created by the DB trigger.
-   `lib/tmdb.ts` ported from `src/services/tmdb.js` (typed).
-   `lib/movieStatus.ts` ported with **unit tests**.
-   `normalizeMovie()` (maps Postgres row ⇄ app `Movie`, incl. `cast_members`→`cast`) +
    `stripUndefined()` shared helpers ([02](./02-data-model.md), [11](./11-supabase-migration.md#app-side-changes-vs-today)).
-   `useMovies` → `supabase.from('movies').select()` + Realtime channel feeding react-query
    cache; `addMovie/updateMovie/removeMovie` (RLS-guarded) with activity logging.
-   **Deliverable:** sign in via all three methods; movies load into cache.

## Phase 2 — Shared UI kit (build once, use everywhere)

-   **The single `MovieCard`** (`variant='poster'|'row'|'hero'|'compact'`) that every
    screen uses — no per-page card markup ([12](./12-ui-unification-and-add-flow.md#part-1--card--list-unification)).
-   `MediaGrid` (3 size presets) + `MediaCarousel` (port `ScrollingRow.jsx`; native
    scroll) — the only poster containers.
-   Single-source subcomponents: `ServiceBadges`, `RatingStars`, `StatusBadge`,
    `StatusPicker` (shared by Quick-Add and Edit), `SectionHeader`.
-   `LoadingState`, `EmptyState`, `ErrorState`.
-   `ServiceFilterChips` + unified `POPULAR_SERVICES`
    ([06](./06-new-features-spec.md#2-better-service-filtering)).
-   Bottom-sheet primitives (filter sheet, pickers).
-   **Deliverable:** a component gallery screen; all core cards render from real data via
    one component.

## Phase 3 — Library (Home)

-   `(tabs)/index.tsx` + `LibraryToolbar`, `LibraryFilterSheet`, `LibrarySection`,
    `LibraryGrid`/`LibraryList`, `useLibraryFilters`, `useLibraryReorder`.
-   Filters/sort/group/view in zustand+MMKV (no sessionStorage).
-   Sections: **Continue watching (carousel — new #1)**, Recently added, Coming soon.
-   Reorder (draggable list) when eligible; random pick sheet.
-   Service filter chips (new #2).
-   **Deliverable:** full Library with native scroll retention (validates the [05](./05-state-and-navigation.md) fix).

## Phase 4 — Browse (with stability fix)

-   `(tabs)/browse.tsx` + `BrowseHero`, `BrowseTabs`, `BrowseSearchBar`, `DiscoveryRow`,
    `SearchResultsGrid`.
-   `useDiscoveryFeed` via react-query with **seeded, cached** categories + pull-to-
    refresh ([04-B](./04-known-issues-and-fixes.md#b-browse-content-reshuffles-every-visit),
    [05](./05-state-and-navigation.md#why-browse-changes-content--and-the-fix)).
-   Universal search (debounced), result-type filter, quick add/remove.
-   **Deliverable:** Browse content stable across visits; scroll restored on return.

## Phase 5 — Detail / Quick-Add / Edit

-   `movie/[tmdbId]/[type]`, `edit/[movieId]` (stack screens).
-   **Quick-Add sheet** (replaces the old two-tab Add page): `QuickAddSheet`,
    `AddSearchResults` (uses `MovieCard variant='row'`), `StatusPicker`, `useQuickAdd`
    ([12](./12-ui-unification-and-add-flow.md#part-2--simplified-add-flow)). Same code path
    as Browse quick-add.
-   Edit split: `EditBasicTab` (reuses `StatusPicker`), `EditEpisodesTab`,
    `EditDetailsTab`, `EditRatingsTab`, `RatingSlider`, `SeasonRatings`, `EpisodeList`,
    `useEditMovieForm`, `buildMoviePayload` (pure, tested).
-   Rewatch UX (new #3) in `StatusPicker` + card badge.
-   Smart-fill, availability toggles, delete.
-   **Deliverable:** Quick-Add (name→pick→status) and full Edit round-trip write correct,
    back-compatible payloads.

## Phase 6 — Person / Genre

-   `director/[id]`, `actor/[id]`, `genre/[id]` with paginated grids.
-   **Deliverable:** navigation from cast/genre chips works end-to-end.

## Phase 7 — Stats (+ Hall of Fame)

-   `(tabs)/stats.tsx` + port `components/stats/*` (charts → react-native-svg).
-   Streak calendars (movie + TV), overview, breakdowns, genres, eras, directors,
    history.
-   **Hall of Fame** section (new #4).
-   Completion managers (`manage-completions`, `manage-tv-completions`).
-   **Deliverable:** stats parity + hall of fame.

## Phase 8 — Social

-   `(tabs)/friends.tsx`, `FriendRequestListener`, user search, requests, friend list.
-   Public shelf: `u/[userId]/*` (library/stats/friends) + public chrome.
-   **Deliverable:** friend flow + public links (also verify on Expo Web).

## Phase 9 — Settings & data

-   Theme, watch-provider country, recently-added config, privacy, streak thresholds.
-   Refresh metadata (port `RefreshMetadataContext`; background-safe with progress).
-   Edit profile with `expo-image-manipulator` crop; Import/Export JSON.
-   **Deliverable:** settings parity.

## Phase 10 — Platform polish & release

-   Deep links (`radar://`, public-shelf URLs), splash/icon, safe areas, keyboard.
-   Expo Web pass (public shelf must work).
-   Performance pass: FlashList tuning, image cache, memoized selectors.
-   EAS builds for Android + iOS; web deploy.
-   **Deliverable:** shippable builds on all three targets.

---

## Data migration (RTDB → Postgres)

Runs in parallel with the build; final cutover at the end. Full script design in
[11-supabase-migration.md](./11-supabase-migration.md#data-migration-rtdb--postgres).

-   **Early (after Phase 1):** migrate **your own** account into a dev Supabase project so
    every screen is built against real data, not fixtures.
-   **Iterate:** re-run the transform as `normalizeMovie` evolves; verify a full library
    round-trips (field-by-field diff vs the RTDB export).
-   **Cutover (Phase 10):** freeze Firebase writes → final export → re-run migration →
    point the app at the production Supabase project. Keep Firebase read-only as backup.
-   **Fallback:** the JSON export/import feature can move the primary user's library if
    UID remapping is troublesome.

## Testing checkpoints

-   **Migration fidelity:** migrate a real account RTDB→Postgres; verify every field
    renders and edits write back correctly (field-by-field diff of the RTDB export vs the
    Postgres rows).
-   **Scroll restoration:** scroll Library/Browse deep, open a detail, back → same spot.
-   **Browse stability:** open Browse twice in a session → identical rows/order.
-   **Status matrix:** movie & TV across watchlist/in-progress/watched/rewatch; filters
    show each correctly.
-   Port `movieStatus` + `buildMoviePayload` unit tests first — they catch the subtle
    status bugs.
