# 03 — Feature Inventory (porting checklist)

Every screen and its behaviour, with source refs. Use as the parity checklist. Each
screen lists what to **keep**, what to **fix** (→ [04](./04-known-issues-and-fixes.md)),
and component-splitting guidance for the rewrite (per the "small files, separate
components" requirement).

Legend: 🟢 keep as-is · 🟡 keep but fix · 🔵 new/changed feature ([06](./06-new-features-spec.md)).

> **Cross-cutting:** every poster/list below must render through the **single unified
> `MovieCard` + `MediaGrid`/`MediaCarousel`** — no page re-implements card markup. See
> [12-ui-unification-and-add-flow.md](./12-ui-unification-and-add-flow.md#part-1--card--list-unification).
> The `SearchResultsGrid` (Browse), and the inline poster markup in Actor/Director/Genre/
> SharedShelf/MovieDetails/Manage\* pages, all collapse into it.

---

## Library / Home — `src/pages/Home.jsx` (⚠️ 1200 lines — must be split)

The main screen. Currently one massive file; the rewrite must decompose it.

**Behaviour:**
- 🟢 Search box (title/director/genre/year) — `movieMatchesSearchQuery`.
- 🟢 Filters: availability, director, year, genre, status, type, min-rating; sort;
  group-by (director/year/genre/availability/status). Filter UI in
  `src/components/FilterPanel.jsx` + `FilterCombobox.jsx`.
- 🟢 View modes: grid (3 sizes: compact/normal/large) & list.
- 🟢 Sections above the main grid: **Continue watching** (in-progress, max 15),
  **Recently added** (configurable days, toggleable), **Coming soon** (owned titles
  with a future release in next 6 months). Section items are de-duped out of the main
  grid.
- 🟢 Drag-to-reorder (custom order) — only when sort=custom, group=none, no
  filters/search active. Uses `@dnd-kit` → replace with RN reorderable list.
- 🟢 Random pick modal (`RandomPickModal.jsx`) — spins among watchlist (or filtered)
  items, highlights + scrolls to the result.
- 🟡 Filter/sort/group prefs persisted in **localStorage**; page state + scroll in
  **sessionStorage**. → collapse to one store ([05](./05-state-and-navigation.md)).
- 🟡 Tap active tab resets filters + scroll (`resetPage` event).
- 🔵 **Continue watching** should become a **horizontal carousel** like Browse rows
  ([06](./06-new-features-spec.md#1-in-progress-carousel)).

**Component split (rewrite):**
`LibraryScreen` → `LibraryToolbar` (search + filter/group/view buttons),
`LibraryFilterSheet`, `LibrarySection` (reused for Continue/Recently/Coming Soon),
`LibraryGrid` / `LibraryList`, `MovieCard`, `MovieRow`, `RandomPickSheet`,
`useLibraryFilters` hook (all the derive/memo logic), `useLibraryReorder` hook.
Target: no file > ~200 lines.

---

## Browse / Discover — `src/pages/Browse.jsx` (⚠️ 1000 lines — must be split)

**Behaviour:**
- 🟢 Hero carousel of featured items (`HeroCarousel.jsx`).
- 🟢 Movies / TV tab switch (sticky).
- 🟢 Discovery rows: Trending, Popular/Top-rated (movie or tv), user's favourite
  genres, "Discover <genre>" (unexplored genres), "Because you liked X" recs based on
  the user's 5★ titles (`ScrollingRow.jsx`).
- 🟢 Infinite scroll: `IntersectionObserver` loads more category rows.
- 🟢 Universal search (debounced 500ms): movies/TV/people/genres, with a result-type
  filter. Person → director/actor page; genre → genre page; owned movie → edit page;
  else → movie details. (`searchBrowse` in `tmdb.js`.)
- 🟢 Quick add/remove to library from any card.
- 🔴 **BUG:** `generateCategories()` uses `Math.random()`/`Date.now()` on every mount,
  so **content changes every visit** and scroll restore lands on different content.
  → [04](./04-known-issues-and-fixes.md#b-browse-content-reshuffles-every-visit) and
  [05](./05-state-and-navigation.md).
- 🔵 Genre service filter cleanup — restrict services
  ([06](./06-new-features-spec.md#2-better-service-filtering)).

**Component split (rewrite):**
`BrowseScreen` → `BrowseHero`, `BrowseTabs`, `BrowseSearchBar`,
`DiscoveryRow` (was ScrollingRow), `SearchResultsGrid`, `useDiscoveryFeed` hook
(fetch + **cache** categories), `useBrowseSearch` hook.

---

## Movie/Show Detail (not owned) — `src/pages/MovieDetails.jsx`

- 🟢 Fetches TMDB metadata for `:tmdbId/:type`, shows hero, overview, cast, similar,
  availability, add-to-library CTA.
- Split into `DetailHero`, `CastRow`, `SimilarRow`, `AvailabilityBadges`,
  `AddToLibraryButton`.

## Edit owned title — `src/pages/EditMovie.jsx` (⚠️ ~1400 lines — biggest offender)

Tabs: **Basic Info / Episodes (tv) / Details / Ratings**. Already partly componentized
under `src/features/movies/edit/*` (Hero, MainTab, WatchStatus, CastCrew, Metadata,
Availability, Links, Similar) — but the page still inlines the Ratings tab, the
RatingSlider, season logic, and `handleSave`.

- 🟢 Basic info, smart-fill from TMDB, availability toggles, watch status
  (movie toggles vs tv status dropdown — `EditMovieWatchStatus.jsx`).
- 🟢 Episode tracker: per-season episode checklist, "mark season complete", progress
  bar, watch dates (`EditMovie.jsx` episodes tab).
- 🟢 Ratings: overall + category sliders, auto-calc, per-season ratings for TV, notes.
- 🟢 Delete (confirmation modal). Unchecking watchlist on an unwatched movie = remove.
- 🔵 Rewatch UX: allow explicit watchlist+watched
  ([06](./06-new-features-spec.md#3-rewatch-state-watchlist--watched)).

**Component split (rewrite):** `EditScreen` (tab shell) → `EditBasicTab`,
`EditEpisodesTab`, `EditDetailsTab`, `EditRatingsTab`, `RatingSlider`, `SeasonRatings`,
`EpisodeList`, `useEditMovieForm` hook (all the useState + save payload build),
`buildMoviePayload(form)` pure fn (testable).

## Add title — `src/pages/AddMovie.jsx` + `AddMovieModal.jsx`

- 🔵 **Replaced by Quick-Add** (name → pick → status). The current heavy two-tab
  metadata form (`add/AddMovieHero`, `AddMovieMainTab`, `AddMovieDetailsTab`) is
  dropped; metadata is auto-filled from TMDB and deeper edits move to the Edit screen.
  Full spec: [12-ui-unification-and-add-flow.md](./12-ui-unification-and-add-flow.md#part-2--simplified-add-flow).

## Person/Genre pages

- `DirectorDetails.jsx` — bio + directed movies grid (`fetchDirectorDetails`,
  `fetchDirectorMovies`).
- `ActorDetails.jsx` — bio + filmography, paginated (`fetchActorDetails`,
  `fetchActorMovies`).
- `GenreDetails.jsx` — TMDB titles by genre, paginated (`fetchGenreMovies`).
- 🟢 All: card grid, tap → detail/edit, add/remove.

## Stats — `src/pages/Stats.jsx` (⚠️ large; sub-components exist)

Works for both own (`/stats`) and public (`/u/:id/stats`) via `userId` param.

- 🟢 Overview quick stats (`OverviewStats`, `QuickStat`).
- 🟢 Status breakdown (`StatusBreakdown`), content mix movie/tv (`ContentMix`).
- 🟢 Runtime totals, average rating.
- 🟢 Favourite genres (`FavoriteGenres`, `GenreTag`), release eras/decades
  (`ReleaseEras`, `SmoothDecadeBar`), most-watched directors (`MostWatchedDirectors`,
  `DirectorItem`) — resolves director ids via TMDB (`useDirectorSearch`).
- 🟢 Watch **streak calendars** for movies & TV (`StreakCalendar`, `TVStreakCalendar`)
  with configurable weekly thresholds (settings/stats).
- 🟢 Activity history pills (`HistoryPill`), `ManualCompletionModal` to backfill.
- 🔵 **Hall of Fame** section — 5★ titles
  ([06](./06-new-features-spec.md#4-hall-of-fame)).

Stats sub-components are already nicely separated in `src/components/stats/` — port
them as-is (chart rendering → RN, see [07](./07-rn-expo-stack.md)).

## Friends & Social

- `Friends.jsx` — friend list (`FriendCard`), incoming requests
  (`FriendRequestItem`), user search (`UserSearch`).
- `FriendRequestListener.jsx` — realtime toast on new requests (global).
- `SharedShelf.jsx` — public read-only library for `/u/:userId`.
- `PublicFriends.jsx` — public friend list.
- `PublicHeader` / `PublicBottomNav` — public chrome.
- 🟢 Visibility respected via rules + `useFriendVisibility`.

## Settings — `src/pages/Settings.jsx`

- 🟢 Theme (`ThemeContext`), watch-provider country, recently-added config
  (days + show toggle), privacy/visibility, streak thresholds.
- 🟢 **Refresh metadata** for whole library (`RefreshMetadataContext`) — sequential
  TMDB refetch with progress; runs in background.
- 🟢 Edit profile (`EditProfileModal` — username/displayName/pfp with image crop via
  `react-easy-crop` → replace with `expo-image-manipulator`).
- 🟢 Import/Export JSON (`ImportExportModal`).
- 🟢 Logout.

## Completion managers

- `ManageCompletions.jsx` — backfill movie `completedAt` dates (feeds streaks).
- `ManageTVCompletions.jsx` — backfill per-episode watch dates.
- `ManualCompletionModal.jsx` — the date-picker modal.

## Auth

- `Login.jsx` — Google sign-in. Native path uses Capacitor Google Auth today →
  replace with Expo auth ([09](./09-tmdb-and-firebase.md#auth)).
