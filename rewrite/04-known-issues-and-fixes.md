# 04 — Known Issues & Fixes

Concrete problems in the current app and the intended fix in the rewrite. The scroll/
state and Browse issues are the ones the client explicitly called out; they get a full
treatment in [05-state-and-navigation.md](./05-state-and-navigation.md).

---

## A. Scroll position must be "re-scrolled" after switching pages

**Symptom:** Navigating away and back to Library/Browse doesn't reliably restore where
you were; the page jumps and has to settle.

**Root cause:** Scroll restoration is hand-rolled on top of a WebView + single scroll
container:

-   `src/hooks/usePageState.js` saves `window.scrollY` to `sessionStorage` on a throttled
    scroll listener and on unmount (`useSaveScrollPosition`).
-   On mount, the page waits for `loading=false` then does a
    `requestAnimationFrame(requestAnimationFrame(() => window.scrollTo(0, target)))`
    double-rAF hack (`Home.jsx` ~line 700, `Browse.jsx` ~line 766).
-   This races with: async data load, image layout shifts, and (on Browse) **different
    content** being rendered than when the scroll was saved (see B). The target offset is
    meaningless if the content above it changed height.

**Fix (rewrite):** Native navigation + virtualized lists restore scroll **by default**.

-   Use a **stack/tab navigator** (Expo Router) that keeps the previous screen mounted
    when you push a detail screen, so returning preserves scroll with zero code.
-   Render the library/browse with **FlashList** (or FlatList) whose scroll offset is
    retained across navigation while mounted; for tab switches, keep tab screens mounted
    (`unmountOnBlur: false`).
-   Delete `usePageState.js` entirely. Persist only _filter/sort_ preferences (durable),
    not scroll offsets.
-   Full design: [05](./05-state-and-navigation.md).

---

## B. Browse content reshuffles every visit

**Symptom:** Browse shows different rows/order each time you open it; combined with (A),
scroll restore lands in the wrong place.

**Root cause:** `Browse.generateCategories()` calls `Math.random()` and `Date.now()`
to pick and shuffle categories on **every mount** (`src/pages/Browse.jsx` ~lines
291–456). There is no caching of the discovery feed; `useEffect([activeTab])` refetches
on every entry.

**Fix (rewrite):**

-   Move the discovery feed into **react-query** with a stable `queryKey`
    (`['discovery', tab, country]`) and a long `staleTime` (e.g. 30–60 min) so revisiting
    the tab returns the **same cached rows** instantly.
-   Compute the "random" selection **once per session/day** using a seed stored with the
    cache, not `Math.random()` per render. (A seeded shuffle keyed by day gives "fresh
    daily, stable within the day".)
-   Keep an explicit **pull-to-refresh** / "shuffle" affordance for when the user
    _wants_ new rows.
-   With stable content, native scroll restoration (A) just works.

---

## C. Three overlapping persistence layers

**Symptom:** State logic is spread across localStorage, sessionStorage, and Firebase;
hard to reason about, subtle bugs (e.g. the merge-write dance in `Home.jsx` ~line 654
to avoid clobbering scroll position saved elsewhere).

**Fix:** Collapse to a clear hierarchy — see
[05](./05-state-and-navigation.md#the-three-tiers-of-state).

---

## D. Status model is half-migrated

**Symptom:** Both a legacy `status` string and the `inWatchlist/inProgress/watched`
booleans exist; movies and TV take different code paths; filters check a mix.

**Fix:** Standardize on booleans internally via a single `normalizeMovie()` at the read
boundary ([02](./02-data-model.md#normalization-recommendations-for-the-rewrite)); keep
writing `status` only for export/back-compat. Port `movieStatus.js` helpers with unit
tests.

---

## E. Giant page files

**Symptom:** `Home.jsx` (~1200), `Browse.jsx` (~1000), `EditMovie.jsx` (~1400) mix
data logic, derived state, and huge JSX. Hard to maintain and review.

**Fix:** Enforce component/hook separation and a soft ~200-line file cap — see
[10-code-conventions.md](./10-code-conventions.md) and the per-screen split guidance in
[03](./03-feature-inventory.md).

---

## F. Global window listeners for navigation & storage

**Symptom:** `SwipeNavigator` attaches raw `window` touch listeners and manually
excludes `[data-scrollable]`; `usePersistedState` dispatches custom
`localStorageChange` window events to sync same-page state.

**Fix:** Use the native tab navigator's built-in swipe (material top tabs / gestures)
and a real state store (react-query + a small global store) instead of window events.
Delete both mechanisms.

---

## G. `Math.random()` used for logic in several places

Besides Browse: `topRatedUserMovies` sample (`Browse.jsx` line ~204), username
generation (`AuthContext.jsx`). Fine for username; for feed logic prefer a seed so
results are reproducible within a session (helps A/B and scroll restore).

---

## H. Availability names inconsistent

**Symptom:** Provider names come from TMDB in many forms; normalized via
`normalizeServiceName` (`src/lib/services.js`) in _some_ read paths but raw elsewhere.
Card icon map in `MovieCard.jsx` is a separate hardcoded map.

**Fix:** Normalize `availability` once in `normalizeMovie()`; keep a single
`SERVICE_CONFIG` (name → {icon, color, short}) as the one source. Ties into the new
service filter ([06](./06-new-features-spec.md#2-better-service-filtering)).

---

## I. Undefined values break Firebase writes

Already defended in `logActivity` and `RefreshMetadataContext.stripUndefined`. **Port a
single shared `stripUndefined()` helper** and run it on every write payload — don't
scatter the guard.

---

## J. Images not optimized

Web uses `<img loading="lazy">`. In RN use a caching image component
(`expo-image`) with placeholders — critical for the poster-heavy grids/carousels.

---

## K. No error/empty/loading component system

Loading states are ad-hoc strings ("Loading collection…"). Rewrite should have shared
`LoadingState`, `EmptyState`, `ErrorState` components + react-query error boundaries.

---

## L. Horizontal scroll rows conflict with the global swipe navigator (client-reported)

**Symptoms (reported):**

-   Scrolling **film lists inside Browse categories** side-to-side is fixed, **but on
    those cards you can't scroll up/down** — vertical scroll feels broken while a finger
    is over a horizontal row.
-   **Stats "history badges"** (and other horizontal rows in Stats): dragging sideways
    **changes the page** instead of scrolling the row, and scrolling "breaks the site".

**Root cause:** `SwipeNavigator.jsx` attaches **global `window` touch listeners**
(`touchstart/move/end`) that convert horizontal swipes into route changes. It tries to
avoid stealing gestures from scrollers by bailing only when the touch target is inside
`[data-scrollable="true"]`:

-   Browse rows set `data-scrollable="true"` (`ScrollingRow.jsx` line ~124) → sideways
    works there. **But** `onTouchStart` then sets `isScrolling = true` and `return`s,
    which also suppresses the navigator for the _vertical_ direction — and the
    interaction between the window listener and the row's own scroll makes **up/down feel
    broken** on those cards.
-   **Stats history/badge rows are NOT tagged** `data-scrollable="true"` → the window
    listener treats a sideways drag as a tab swipe → **navigates away / breaks scroll**.

So it's two faces of one flaw: a global gesture recognizer racing nested scroll
containers, made worse by an opt-in tag that some rows have and others don't.

**Fix (rewrite):** delete the global window swipe listener entirely. In React Native:

-   **Nested scrolling is native**: a horizontal `FlashList`/`ScrollView` inside a
    vertical one is handled by `react-native-gesture-handler` — sideways scrolls the row,
    up/down scrolls the page, with no manual tagging and no `[data-scrollable]` opt-in.
-   If swipe-between-tabs is kept ([05](./05-state-and-navigation.md#proposed-expo-router-tree)),
    use the **tab navigator's own gesture** (material top tabs), which cooperates with
    gesture-handler scrollviews — it won't hijack a horizontal row's scroll.
-   Every horizontal row (Browse categories, Stats badges/history, the new
    Continue-watching & Hall-of-Fame carousels) uses the **same `MediaCarousel` /
    horizontal-list primitive**, so scroll behaviour is uniform — no per-row tagging that
    can be forgotten (which is exactly why Stats broke).

This makes issue **F** concrete; both are resolved by the same removal.
