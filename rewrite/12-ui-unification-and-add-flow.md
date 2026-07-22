# 12 — UI Unification & Simplified Add Flow

Two client requests:

1. **Unify the components** — movie cards (and poster grids/rows) are re-implemented on
   almost every page and look different.
2. **Simplify Add** — the "Add" button opens a heavy metadata form; it should be as
   modern as the rest of the app and reduced to essentially _type a name → set status_.

---

## Part 1 — Card / list unification

### The problem (verified)

The same "poster card" is hand-written many times with divergent markup instead of
reusing one component:

| Where                          | How it renders today                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Library grid                   | `src/features/movies/MovieCard.jsx` (the "real" card — status icons, personal + TMDB rating, service logos, gradient, notes). |
| Library list                   | `src/features/movies/MovieRow.jsx` (separate layout).                                                                         |
| Browse rows                    | `ScrollingRow.jsx` → uses `MovieCard` ✅ (the one good reuse).                                                                |
| Browse search results          | `Browse.jsx` `SearchResultsGrid` — **its own inline card** (different badges, hover, add/remove).                             |
| Browse hero                    | `HeroCarousel.jsx` — bespoke.                                                                                                 |
| Actor / Director / Genre pages | `ActorDetails.jsx`, `DirectorDetails.jsx`, `GenreDetails.jsx` — **inline `aspect-2/3` poster markup**.                        |
| Public shelf                   | `SharedShelf.jsx` — inline markup.                                                                                            |
| Movie detail (similar/cast)    | `MovieDetails.jsx` — inline.                                                                                                  |
| Completion managers            | `ManageCompletions.jsx`, `ManageTVCompletions.jsx` — inline.                                                                  |

Result: inconsistent sizing, badges, hover/press states, rating display, and service
logos across pages; every fix has to be made in many places.

### The fix — one card, a few variants

Build **one** `MovieCard` (+ its list sibling) in `components/media/` and route
**every** poster through it. Model differences as **variants/props**, not new files.

```
components/media/
  MovieCard.tsx        # the single card; variant="poster" | "row" | "hero" | "compact"
  MediaCarousel.tsx    # horizontal list of MovieCards (Browse rows, Continue-watching, Hall of Fame)
  MediaGrid.tsx        # responsive grid of MovieCards (Library, search results, person/genre pages)
  ServiceBadges.tsx    # the streaming-logo cluster (one source of truth)
  RatingStars.tsx      # personal (amber) + TMDB (yellow) score chips
  StatusBadge.tsx      # watchlist / watching / completed / rewatch
```

**`MovieCard` props contract (draft):**

```ts
type MovieCardProps = {
    movie: Movie; // always a normalized Movie (doc 02 / doc 11)
    variant?: "poster" | "row" | "hero" | "compact"; // default 'poster'
    onPress?: (m: Movie) => void;
    // optional actions — presence toggles the affordance, so Browse/library/person
    // pages all share the same card:
    onAdd?: (m: Movie) => void;
    onRemove?: (m: Movie) => void;
    isAdded?: boolean;
    // display toggles:
    showStatus?: boolean; // status badge (library) vs hide (pure discovery)
    showRatings?: boolean;
    showServices?: boolean;
    highlighted?: boolean; // random-pick highlight
    readOnly?: boolean; // public shelf
};
```

Rules:

-   **No page renders poster markup directly** — it composes `MediaGrid`/`MediaCarousel`
    of `MovieCard`. Enforced by [10](./10-code-conventions.md) (features/pages don't
    re-implement UI).
-   Card consumes a **normalized `Movie`** so it never branches on legacy shapes
    ([02](./02-data-model.md#normalization-recommendations-for-the-rewrite)).
-   **Single sources of truth**: `ServiceBadges` owns the service→logo map (today it's
    duplicated between `MovieCard.jsx` and `lib/services.js`); `RatingStars` owns the
    overall-or-average logic (today inline in `MovieCard.jsx` `ratingScore`).
-   `variant="hero"` replaces `HeroCarousel`'s bespoke card; the carousel container can
    stay separate but the item is a `MovieCard`.
-   The new features all consume these: In-Progress carousel, Hall of Fame
    ([06](./06-new-features-spec.md)) = `MediaCarousel`; service chips reuse
    `ServiceBadges` styling.

### Also unify the surrounding chrome

While unifying cards, also converge:

-   **Grids**: one `MediaGrid` with the 3 size presets from `Home.jsx` (`gridClasses`) —
    Library, search results, person/genre pages all use it.
-   **Empty / loading / error** states → shared components
    ([04-K](./04-known-issues-and-fixes.md)).
-   **Section header** (the blue-bar + title + count used in Home sections) → one
    `SectionHeader`.

---

## Part 2 — Simplified Add flow

### The problem

`src/pages/AddMovie.jsx` (+ `AddMovieHero`, `AddMovieMainTab`, `AddMovieDetailsTab`) is a
full **two-tab metadata editor** (Basic Info + Details & Rating): director, availability,
runtime, cast, genres, ratings, notes, seasons — all up front. Heavy for the common case
("I just want to add this and mark it"). It also feels less polished than Browse.

### The fix — quick add: name → pick → status → done

Replace the page with a **modal/bottom sheet** ("Quick Add") reachable from the Add
button and from Browse cards. Flow:

1. **Type a name.** Debounced TMDB `searchMedia` (already exists) → results list with
   poster + year + type (rendered with the unified `MovieCard variant="row"`).
2. **Pick a result.** Metadata auto-fills silently via `fetchMediaMetadata` (director,
   genres, poster, availability, runtime, seasons) — user doesn't see/edit it.
3. **Set status** with three clear choices — **Watchlist / Watching / Watched** — plus
   the rewatch option ([06](./06-new-features-spec.md#3-rewatch-state-watchlist--watched)).
    - For TV, same three mapped to the `tvStatus` model.
    - `Watched` optionally reveals a tiny "times watched" stepper (default 1); can skip.
4. **Add.** Writes via `addMovie` with the correct status flags + `completedAt`
   (reuse the `buildMoviePayload` pure fn — [03](./03-feature-inventory.md#edit-owned-title--srcpageseditmoviejsx)).

That's the whole default path — two taps after choosing. **No manual metadata**, no
tabs, no ratings.

### Manual / advanced still available

-   **"Add manually"** link in the sheet for a title TMDB can't find → minimal form
    (title + type + status; everything else optional), same as today's non-TMDB path.
-   **Rating, notes, availability edits, episode tracking** move entirely to the **Edit
    screen** (open it after adding if the user wants to go deeper). Add ≠ Edit.

### Component shape

```
features/movies/add/
  QuickAddSheet.tsx        # the bottom sheet: search + results + status picker
  AddSearchResults.tsx     # list of MovieCard(variant="row")
  StatusPicker.tsx         # Watchlist / Watching / Watched (+ rewatch, +times) — reused in Edit basic tab
  useQuickAdd.ts           # search (debounced) + select + build payload + addMovie
```

-   `StatusPicker` is **shared** with the Edit screen's basic tab so status UI is
    identical everywhere (ties into unification).
-   Reuse `useQuickAdd` from Browse's quick-add buttons so "add from Browse" and "add from
    the + button" are the same code path and same result (Watchlist by default there).

### Open questions

> ❓ **Confirm:** After Quick Add, stay on the current screen (toast "Added") or jump
> into the Edit screen for that title? Recommend: **stay + toast**, with an "Edit"
> action in the toast.
-> Stay on the current screen, toast "Added" with an "Edit" action.
>
> ❓ **Confirm:** Should Quick Add default the status to **Watchlist** (matches Browse
> quick-add today) or ask every time? Recommend: default Watchlist, one tap to change.
-> Default to Watchlist, one tap to change. Keep the option to add times watched.

---

## Impact on other docs

-   [03](./03-feature-inventory.md): the per-screen component splits should consume
    `MovieCard`/`MediaGrid`/`MediaCarousel` — the Add page entry is superseded by
    QuickAddSheet.
-   [06](./06-new-features-spec.md): carousels + rewatch reuse these unified components and
    `StatusPicker`.
-   [08](./08-migration-plan.md): **Phase 2 (shared UI kit)** now explicitly must produce
    the single `MovieCard` + `MediaGrid` + `MediaCarousel` + `StatusPicker` before any
    screen is built, and **Phase 5** builds QuickAddSheet instead of porting the old
    two-tab Add page.
-   [10](./10-code-conventions.md): "reuse `MovieCard`/`MediaCarousel` everywhere" is now a
    hard rule — no inline poster markup in any page/feature.
