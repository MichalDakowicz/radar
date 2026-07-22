# 05 — State & Navigation (the core fix)

This is the doc for the client's #1 complaint: **pages have to be re-scrolled after
switching**, and **Browse changes its content**. Both come from fighting the browser in
a WebView. Native navigation solves most of it for free — the job is to _stop
hand-rolling_ it.

---

## The three tiers of state

Classify every piece of state and store it in exactly one place:

| Tier                          | What                                                                   | Where (rewrite)                                                         | Lifetime                 |
| ----------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------ |
| **Server data**               | movies, activity, profile, friends, settings, TMDB responses           | **react-query** (cache) backed by Firebase subscriptions / fetches      | cached, revalidated      |
| **Durable prefs**             | view mode, grid size, filters, sort, group-by, last tab                | **MMKV** (fast native key-value) via a small store                      | persists across launches |
| **Ephemeral UI + scroll/nav** | scroll offset, which detail is open, modal open, in-flight search text | **the navigator itself** (screens stay mounted) + local component state | lives with the screen    |

Today all three are smeared across localStorage + sessionStorage + Firebase. Collapsing
them removes the merge-write hacks (`Home.jsx` ~line 654), the custom
`localStorageChange` events, and all of `usePageState.js`.

---

## Why native fixes scroll restoration

In the current web app there is **one scroll container** (`window`) shared by all
routes; navigating replaces the DOM, so scroll must be manually saved and re-applied
after async content settles — a race it often loses.

In React Native with a stack/tab navigator:

-   Each screen has its **own** scroll view/list.
-   Pushing a detail screen **keeps the list screen mounted underneath**; popping back
    shows it exactly as left — **scroll offset preserved, no code**.
-   Tab screens can be kept mounted (`unmountOnBlur: false`), so switching tabs and
    returning preserves scroll.
-   Lists (FlashList/FlatList) retain their offset while mounted and support
    `maintainVisibleContentPosition` for prepend-safe scrolling.

**Net effect:** delete `useSaveScrollPosition`, the double-rAF `window.scrollTo`, and
the sessionStorage scroll keys. Restoration becomes a property of the navigator.

> Edge case: if you _must_ restore scroll after a full unmount (deep link straight into
> a scrolled list), store an item **id/index anchor**, not a pixel offset, and use
> `FlashList`'s `initialScrollIndex`. Pixel offsets are meaningless when content height
> varies (exactly the Browse bug).

---

## Why Browse "changes content" — and the fix

`generateCategories()` shuffles with `Math.random()` and stamps `Date.now()` on every
mount (`src/pages/Browse.jsx`). Every visit = new feed = restoring an old scroll offset
lands on unrelated rows.

**Fix:**

1. Fetch the discovery feed through **react-query** with a stable key and long
   `staleTime`:
    ```ts
    useQuery({
        queryKey: ["discovery", tab, country, daySeed],
        queryFn: () => buildDiscoveryFeed(tab, country, daySeed),
        staleTime: 60 * 60 * 1000, // stable for an hour
        gcTime: 24 * 60 * 60 * 1000,
    });
    ```
2. Replace per-render randomness with a **seed** (`daySeed`) computed once (e.g. from
   the calendar day, passed in — remember scripts can't call `Date.now()` but the app
   can). Same seed → same shuffle → stable feed within the window.
3. Provide **pull-to-refresh** to intentionally re-roll (bump the seed / invalidate).
4. Because content is now stable, returning to Browse shows the identical list at the
   identical offset.

---

## Proposed Expo Router tree

```
app/
  _layout.tsx                # providers: QueryClient, Auth, Theme, Toast, RefreshMetadata
  login.tsx
  (tabs)/
    _layout.tsx              # bottom tab navigator (Library/Browse/Stats/Friends/Settings)
    index.tsx                # Library      (was Home)
    browse.tsx               # Browse
    stats.tsx                # Stats (own)
    friends.tsx              # Friends
    settings.tsx             # Settings
  movie/[tmdbId]/[type].tsx  # MovieDetails (not owned)
  edit/[movieId].tsx         # EditMovie
  add.tsx                    # AddMovie
  director/[id].tsx
  actor/[id].tsx
  genre/[id].tsx
  manage-completions.tsx
  manage-tv-completions.tsx
  u/[userId]/
    _layout.tsx              # public shelf tabs (Library/Stats/Friends)
    index.tsx                # SharedShelf
    stats.tsx                # Stats (public — same component, reads userId)
    friends.tsx              # PublicFriends
```

Notes:

-   Detail/edit/add/person/genre are **pushed screens** (stack), so the tab underneath
    stays mounted → scroll preserved on back.
-   Tab bar replaces `BottomNav`; its built-in "tap active tab" behaviour replaces the
    manual `resetPage` (configure it to pop-to-top / scroll-to-top).
-   Swipe-between-tabs (replacing `SwipeNavigator`) via material top tabs _or_ accept the
    standard bottom-tab behaviour — **confirm** whether horizontal swipe navigation is a
    must-keep.

> ❓ **Confirm:** Keep the swipe-between-main-tabs gesture? Native bottom tabs don't
> swipe by default. Options: (a) drop it (most native), (b) add
> `@react-navigation/material-top-tabs` for swipeable tabs.
-> Keep swipe gesture, but only on the main tabs (Library/Browse/Stats/Friends/Settings).

---

## Filters/sort/group state

-   Store in a tiny global store (Zustand) persisted to **MMKV**, keyed per screen
    (`library.filters`, `browse.tab`).
-   The "reset on active-tab tap" becomes: navigator's tab-press listener → call
    `resetLibraryFilters()` + `scrollToTop()`.
-   Because filters are durable and separate from scroll, there's no more merge-write
    dance.

---

## Data subscriptions

`useMovies` currently opens a raw Firebase `onValue` subscription and hand-rolls a
localStorage+in-memory cache. In the rewrite (now on **Supabase** — [11](./11-supabase-migration.md)):

-   Initial read via `supabase.from('movies').select()` cached in **react-query**
    (`['movies', uid]`).
-   A **Supabase Realtime** channel on `movies` (filtered `user_id=eq.<uid>`) invalidates
    / patches that query on change — replacing `onValue` and the bespoke localStorage
    cache. Same pattern for `activity` and `friend_requests`
    ([11](./11-supabase-migration.md#realtime)).
-   Keep the activity logging on mutations (port `logActivity` → an `insert` into
    `activity`).

---

## Summary of deletions

Once the above is in place, **delete**:

-   `src/hooks/usePageState.js` (all 3 hooks)
-   the inline `usePersistedState` in `Home.jsx` (→ MMKV store)
-   `SwipeNavigator.jsx` (→ navigator gestures, if kept)
-   the `resetPage` window-event system in `BottomNav.jsx`
-   all `sessionStorage`/`localStorage` scroll & page-state keys
