# 13 — Fix sweep: toast placement, stats drill-down, streak warning, type filter, cropped text, episode watch counts

Six fixes, agreed 2026-08-13. Each section states the symptom, the root cause with
file references, the fix, the files it touches, and what gets tested. Decisions taken
with the user are marked **Decision**; anything left to judgement is marked
**Assumption** so it can be argued with.

---

## 1. Toast sits under (and over) the nav islands

**Symptom.** The confirmation popup — "Added to library" after Quick Add, and every
other toast — overlaps the floating bottom nav.

**Root cause.** `ToastProvider` pins the toast at a hardcoded `bottom-10` (40 px):

- `src/components/ui/Toast.tsx:29` — `className="absolute bottom-10 left-4 right-4"`.
- The nav bar sits at `insets.bottom + NAV_ISLAND_GAP` and is `NAV_ISLAND_HEIGHT`
  (52) tall — `src/components/layout/NavIslands.tsx:101`, `src/hooks/useNavBarSpace.ts:4`.
  Its top edge is therefore ~`insets.bottom + 62`, well above the toast's 40 px.

Every scrolling body already reserves this space through `useNavBarSpace()`; the toast
is the one overlay that does not.

**Fix.** Have the toast read the same source of truth as the lists do:

```tsx
const navBarSpace = useNavBarSpace();   // insets.bottom + GAP*2 + HEIGHT
<View className="absolute left-4 right-4 items-center" style={{ bottom: navBarSpace + 8, pointerEvents: 'none' }}>
```

`ToastProvider` mounts above the router `Stack` but inside expo-router's own
`SafeAreaProvider`, so `useSafeAreaInsets` resolves there. If it turns out it does not,
the fallback is to lift the offset to a constant `NAV_ISLAND_*` sum plus a 24 px inset
guess — but only after the insets route is proven not to work on device.

**Not in scope.** Bottom sheets (`SheetPanel`, `QuickAddSheet`, `ConfirmDialog`) cover
the nav on purpose — they are modal, the nav is not reachable underneath them anyway.

**Files.** `src/components/ui/Toast.tsx`.

**Test.** No pure logic added; verified on device (add a title from Browse, watch the
toast clear the islands).

---

## 2. Stats drill through to a filtered view of _your_ library

**Symptom.** Tapping a director or a genre in Stats opens the TMDB page for that
director/genre — every film they made, most of which the user does not own. What the
user wants first is "which of _my_ titles is this stat made of".

Current behaviour: `src/components/stats/DirectorItem.tsx:31` pushes `/director/[id]`,
`src/components/stats/GenreTag.tsx:34` and `src/features/stats/StatsView.tsx:122` push
`/genre/[id]`. Decades, Content Mix, Status Breakdown and the remaining quick stats are
inert.

**Decision — new route, not the Library tab.** A dedicated screen at `/in-library`
rather than writing into the persisted library prefs and navigating to the Library tab.
Rationale: the Library tab's filters are durable user state (`src/store/libraryPrefs.ts`);
a stat tap must not silently overwrite what the user left set there.

```
/in-library?facet=director&value=Christopher+Nolan

┌────────────────────────────────┐
│ ‹ Back                         │
│ Christopher Nolan              │
│ 7 titles in your library       │
│ avg 4.6 · 14h                  │
│ [ Open director page ]         │
├────────────────────────────────┤
│ [poster][poster][poster]       │
└────────────────────────────────┘
```

**Route contract.**

| param    | values                                                                   | header title                           | external page button |
| -------- | ------------------------------------------------------------------------ | -------------------------------------- | -------------------- |
| `facet`  | `director`                                                               | director name                          | `/director/[id]`     |
|          | `genre`                                                                  | genre name + icon                      | `/genre/[id]`        |
|          | `year`                                                                   | `1999`                                 | —                    |
|          | `decade`                                                                 | `1990s`                                | —                    |
|          | `type`                                                                   | `Movies` / `TV Shows`                  | —                    |
|          | `status`                                                                 | `Watchlist` / `Watching` / `Completed` | —                    |
|          | `all`                                                                    | `Your library`                         | —                    |
| `value`  | the facet value (name, year, `movie`/`tv`, status key)                   |                                        |                      |
| `tmdbId` | optional, only for director/genre — what the external button routes with |                                        |                      |

Header line 2 is always `<n> titles in your library`; line 3 is a small stat strip
(avg rating where ratings exist, hours watched, completed count). The external-page
button only renders when `tmdbId` is present, so the year/decade/type/status variants
simply omit it.

**Decision — what becomes tappable** (all four groups the user picked):

- **Directors** — `DirectorItem` rows → `facet=director` (carries `tmdbId` when the
  credit has an id, so the "Open director page" button survives).
- **Genres** — `GenreTag` chips and the Top Genre quick stat → `facet=genre`.
- **Release eras** — `DecadeBars` columns → `facet=decade`.
- **Content mix** — the Movies and TV Shows numbers → `facet=type`.
- **Status breakdown** — the three `ThinProgressBar` rows → `facet=status`.
- **Quick stats** — Total Items → `facet=all`; Completed → `facet=status&value=completed`.
  Avg Rating and Time Watched stay inert: neither maps to a library filter, and a
  pressable that leads somewhere arbitrary is worse than a plain number.

`DecadeBars`, `ContentMix` and `ThinProgressBar` are currently pure presentational
Views; they gain an optional `onPress`-per-item prop rather than importing the router
themselves, so the public-shelf render path (`StatsView` without navigation props) can
keep them inert.

**Assumption — period scope.** Stats can be scoped to a period
(`src/lib/statsPeriod.ts`, the nav-bar picker). The filtered view is **all-time**: it
is a view of the library, and the library has no period. So tapping "Sci-Fi (4)" inside
a 30-day window can list more than 4 titles. The header says "in your library" rather
than repeating the stat's count, so the two numbers never look like they contradict
each other. Say the word if the period should ride along instead.

**Implementation shape** (code conventions doc 10 — screen composes, logic in lib):

- `src/lib/libraryFacetView.ts` — pure: `facetTitle(facet, value)`,
  `selectFacetMovies(movies, facet, value)`, `facetSummary(movies)` returning
  `{ count, avgRating, hours, completed }`. Reuses the existing predicates
  (`matchesGenreFilter`, `movieDirectors`, `movieYear`, `isWatched`, …) instead of a
  second copy of the matching rules.
- `src/features/library/FacetLibraryHeader.tsx` — the header block.
- `src/app/in-library.tsx` — reads params, `useMovies()`, renders `MediaGrid` with the
  header, taps open `/edit/[movieId]` like the Library tab does.
- Stats components gain optional press callbacks; `StatsView` wires them (own screen
  only — the public shelf leaves them undefined and nothing becomes pressable).

**Files.** new: `src/app/in-library.tsx`, `src/features/library/FacetLibraryHeader.tsx`,
`src/lib/libraryFacetView.ts`, `src/lib/libraryFacetView.test.ts`. Edited:
`src/features/stats/StatsView.tsx`, `src/components/stats/{DirectorItem,GenreTag,DecadeBars,ContentMix,ThinProgressBar}.tsx`.

**Test.** `libraryFacetView.test.ts` — selection per facet (genre OR-matching, director
name normalisation via `directorToDisplayString`, decade bucketing, `type`, each
status), summary maths with and without ratings, and unknown-facet fallback.

---

## 3. Streak warning fires on any quiet day, not on a threatened streak

**Symptom.** The 8pm streak notification arrives whenever nothing was logged that day,
even when the streak is in no danger.

**Root cause.** The generator's only risk test is "no activity today" —
`supabase/notifications.sql:554-593`:

```sql
and s.current_streak >= 2
and s.streak_updated_at > now() - interval '36 hours'
and private.local_hour(s.timezone) = 20
and not exists (select 1 from public.activity a where … = private.local_date(s.timezone))
```

But a streak in this app is **weekly-threshold** based, not daily
(`src/lib/stats.ts:75-98`): an empty day does not break the streak as long as its week
meets `streakThreshold` completions, and the _current_ week qualifies on any activity at
all. So a user who watched 4 films on Monday with a threshold of 2 is safe all week and
still gets warned every evening. That is the "notify daily" behaviour the user saw.

**Decision — keep the daily check, suppress it when the streak cannot break.** Warn at
20:00 local only when this week is still short of the threshold (and nothing was logged
today, as now). The week's maths stays on the client, where the threshold rules already
live.

**Fix.**

1. Snapshot the week, not only the streak. `user_settings` gains
   `streak_week_start date` and `streak_week_needed int` (0 = safe this week) alongside
   the existing `current_streak` / `streak_updated_at`.
2. `src/lib/streakSnapshot.ts` grows `weekShortfall(dailyCompletions, threshold, now)`
   → `{ weekStart, needed }` using the existing `weekStart` / `countInWeek` helpers from
   `src/lib/stats.ts`, and `shouldSyncStreak` also re-syncs when the week rolls over or
   the shortfall changes (a snapshot describing last week is useless tonight).
3. `src/features/notifications/StreakSnapshot.tsx` writes the three fields together.
4. `private.generate_streak_notifications()` adds
   `and s.streak_week_needed > 0 and s.streak_week_start = date_trunc('week', private.local_date(s.timezone))::date`,
   and the body names the gap: `'2 more this week to keep it alive'`.
5. Dedupe key stays `streak_risk:<local date>` — one warning a day at most, and now
   only on days where the streak is genuinely on the line.

**Assumption — snapshot freshness.** Unchanged contract: the client refreshes on
library load, and the generator ignores anything older than 36 h. A user who has not
opened the app since the week rolled over gets no warning rather than a wrong one.

**Assumption — TV streak.** The generator only ever considered the movie streak; that
stays true. The TV streak (`tvStreakThreshold`, `currentTVStreak`) is not wired into
notifications and is out of scope here.

**Files.** `supabase/notifications.sql`, `src/lib/streakSnapshot.ts`,
`src/lib/streakSnapshot.test.ts`, `src/lib/userSettings.ts` (+ `.test.ts`),
`src/features/notifications/StreakSnapshot.tsx`.

**Test.** `streakSnapshot.test.ts` — shortfall zero when the week is met, positive when
short, week-rollover forces a re-sync, threshold change forces a re-sync. The SQL change
is exercised through `supabase/notifications-test.sql`.

**Manual step.** The `alter table … add column if not exists` lines are idempotent, but
`supabase/notifications.sql` still has to be re-run in the SQL editor for the new
columns and the new generator body to exist. Called out at hand-off, not automated.

---

## 4. Movies / TV shows filter is missing from the library filters

**Symptom.** The library can be narrowed by status, service, genre, director and year,
but not to movies-only or shows-only.

**Root cause.** It was never built in the rewrite — `git log -S typeFilter -- src`
returns nothing. `src/store/libraryPrefs.ts:17-39` has no media-type field, and
`useLibraryFilters` (`src/features/library/useLibraryFilters.ts:98-107`) applies five
predicates, none of them on `movie.type`.

**Fix.** A `typeFilter: 'all' | 'movie' | 'tv'` dimension, following the shape the
status filter already uses (single-select chips, not a facet list):

- `src/store/libraryPrefs.ts` — field + `setTypeFilter`, included in `resetFilters`,
  persist `version` 3 → 4 with a migration that defaults `typeFilter` to `'all'` for
  existing installs.
- `src/lib/libraryFacets.ts` — `matchesTypeFilter(movie, filter)` (`'all'` passes
  everything; `tv` is `movie.type === 'tv'`, everything else is a movie, matching how
  `computeStats` buckets types at `src/lib/stats.ts:155`).
- `src/features/library/useLibraryFilters.ts` — one more predicate in the chain, and
  `typeFilter` added to the input type, the memo deps and the sections' search string.
- `src/features/library/LibraryFilterSheet.tsx` — a "Type" `FilterRow` above Status:
  All / Movies / TV Shows.
- `src/features/library/LibraryToolbar.tsx` — count it in `activeFilterCount`.
- `src/app/(tabs)/index.tsx` — pass it through, and add it to the
  `useScrollToTopOnChange` key so the grid returns to the top when it changes.

**Files.** as listed above.

**Test.** `src/lib/libraryFacets.test.ts` — `matchesTypeFilter` across `all` / `movie` /
`tv` including a title with no `type` set.

---

## 5. Cropped / off-centre text in filter inputs and on recap slides

### 5a. Filter search inputs

**Symptom.** Placeholder and typed text in the filter search boxes sit low in the field
and have their descenders clipped.

**Root cause.** `SearchInput` already drops Android's font padding and centres text
vertically (`src/components/ui/SearchInput.tsx:13`), which fixed the "sitting low" half.
What is left is the line height: the fields are styled with NativeWind's `text-sm`,
which emits `fontSize: 14` **and** `lineHeight: 20`. On Android an explicit `lineHeight`
on a `TextInput` combined with `includeFontPadding: false` clips glyphs that overflow
the line box, and the clipping is worst in the shortest field —
`h-9` (36 px) in `src/features/library/FacetFilterRow.tsx:57`, vs `h-10` in the toolbar
(`src/features/library/LibraryToolbar.tsx:51`).

**Fix.**

- Drop the class-supplied line height inside `SearchInput` on Android by applying
  `fontSize` from the class and `lineHeight: undefined`, plus `paddingVertical: 0`, so
  the glyph box is the field's box.
- Standardise the facet search box on `h-10` to match the toolbar — one search-field
  height in the app, which is also what makes the 44 px-ish touch target reasonable.
- Verify on device before and after; if the clipping survives the line-height removal,
  the next step is dropping the fixed height for symmetric `py-2` padding, which lets
  the field grow with the font instead of cropping it.

**Files.** `src/components/ui/SearchInput.tsx`, `src/features/library/FacetFilterRow.tsx`.

### 5b. Recap slides

**Symptom.** Some recap text is cropped. The user was not sure which slides, so this is
an audit, not a targeted fix.

**Plan.** Sweep every recap surface for the two things that crop text — a fixed height
or `overflow-hidden` around a text block, and `numberOfLines` set tighter than the
content needs:

- `src/features/recap/parts/` — `SlideHeadline`, `SlideBody`, `SlideLabel`, `LeaderRow`,
  `RecapPoster`, `FaceAvatar`.
- `src/features/recap/slides/` — all 15 slides, year and month.
- `src/features/recap/{RecapSlideCard,RecapTile,RecapPlayer,ShareCard}.tsx` and
  `src/features/recap/parts/ShareCardCanvas.tsx`.

Long titles and long people-names are the realistic worst case, so the audit checks each
slide against a long-string case rather than the user's own data alone. Findings and the
fix applied to each get appended to this section as they land, so the sweep is
auditable rather than "tidied some text".

**Files.** whichever of the above turn out to be at fault.

**Test.** Presentational only — no pure logic to unit test. Verified on device across a
month recap and a year recap, plus a share-card export.

#### Findings — leading, not clipping containers

The sweep found one cause behind every cropped slide, and it is not `overflow-hidden`
or `numberOfLines`. Android lays a line out in exactly the `lineHeight` it is given, and
when that is shorter than the font's own ascent + descent (~1.18 em for Roboto) it takes
the shortfall **off the top of the line** — so a display line loses the caps of its
glyphs. The recap design leads its display type tight on purpose, and 11 of those
leadings were under the floor:

| Surface | Leading was | Ratio |
| --- | --- | --- |
| `parts/SlideHeadline` | `size × 1.02` — every slide's headline | 1.02 |
| `MonthCoverSlide` month name / year | 64 and 68 on 74 | 0.87 / 0.92 |
| `MonthHoursSlide` hours number | 92 on 100 | 0.92 |
| `YearCoverSlide` "Annual Report" / year | 42 on 44, 92 on 112 | 0.95 / 0.82 |
| `YearTotalsSlide` total / split | 40 on 38, 36 on 34 | 1.05 / 1.06 |
| `YearRewatchSlide` title / classification | 26 on 24, 32 on 30 | 1.08 / 1.07 |
| `MonthFilmSlide` film title | 28 on 26 | 1.08 |
| `YearMasterpiecesSlide` title | 27 on 24 | 1.13 |
| `YearGenresSlide` genre words | `size × 1.06` | 1.06 |
| `ShareCard` headline (the exported image) | 42 on 46 | 0.91 |

**Fixed** with `leading(size, wanted)` in `recapTheme.ts` — the design's number, raised
to the floor when it is under it — so the rule lives in one place instead of 11 magic
numbers. Lines now stand a little taller than the design drew them.

A first attempt also clawed that height back with a negative margin (`leadingPull`), on
the theory that the glyphs had only been cropped, not moved. On device the big numbers
then overlapped the label above them: the crop had been *hiding* the overlap, and giving
the caps back their pixels while pulling the box up puts them straight under the line
above. The negative margin is gone — the extra height is the room the glyphs need.

`YearDecadesSlide` also pinned its column row to `TRACK + 46` = 216 px for ~214 px of
content, so the count above each bar dropped out the moment Android's font scale went
above 1. The fixed height is gone — the columns align at the foot on their own.

**Not at fault.** `numberOfLines` on names and titles (`LeaderRow`, `RecapTile`,
`YearDirectorsSlide`, `ShareCard` cells) truncates with an ellipsis, which is the
intended behaviour for a long name, not a crop. The `overflow-hidden` uses are all on
progress tracks and rounded posters.

---

## 6. Episodes get watch counts; a rewatched episode can be logged again

**Symptom.** An episode watched a second time cannot be logged. The episode tracker is a
tick-box, and the backfill screen greys out anything already watched
(`src/app/manage-tv-completions.tsx:52`, `disabled={alreadyWatched}`). So a rewatch is
invisible to the TV streak, to hours watched, and to recaps — and TV tracking does not
match how movies work, where a rewatch is just a counter.

**Root cause — the data model, not the UI.** `src/types/movie.ts:67-70`:

```ts
episodesWatched: Record<string, boolean>; // s1e1 -> true
episodeWatchDates: Record<string, string>; // s1e1 -> one ISO stamp
```

One boolean and one date per episode. There is nowhere to put a second watch.

**Decision — a date log per episode.** `episode_watch_dates` becomes an array of stamps:

```jsonc
episode_watch_dates: {
  "s1e1": ["2026-08-01T20:00:00Z", "2026-08-13T21:00:00Z"],   // watched twice
  "s1e2": ["2026-08-02T20:00:00Z"]
}
episodes_watched: { "s1e1": true, "s1e2": true }   // derived mirror, kept
```

The log is the single source of truth: `count(key) = dates.length`,
`watched(key) = count > 0`. Every rewatch keeps its own date, which is exactly what the
TV streak calendar and the recaps read. `episodes_watched` stays as a **derived mirror**
written on every save — the friend-shelf query selects that column directly
(`src/features/social/useFriendActivity.ts:62`), and old app builds and old rows still
understand it.

**Back-compat.** `normalizeMovie` coerces at the read boundary: a bare string becomes
`[string]`, a missing key becomes `[]`, so existing rows keep working with no migration
step. New helpers in `src/lib/episodes.ts` mean no surface reads the raw jsonb shape:

```ts
episodeWatchCount(movie, key): number
episodeWatchLog(movie, key): string[]              // sorted, oldest first
totalEpisodeWatches(movie): number                 // sum over all keys
watchedEpisodeCount(movie): number                 // keys with count > 0
showWatchCount(movie): number                      // see below
logEpisodeWatch(log, key, iso): Log                // append
unlogEpisodeWatch(log, key, iso?): Log             // drop one stamp (latest by default)
episodesWatchedMirror(log): Record<string, boolean>
```

**Decision — the show-level watch counter is derived for TV, not typed in.** For a
series, `timesWatched` stops being a free-standing number the user steps up and down:

> `showWatchCount = min over every episode TMDB knows about of that episode's count`

All 62 episodes at 2 → the show is watched twice. Any episode at 1 → the show is watched
once. Any episode at 0 → not fully watched (and `watched` stays false, which is the rule
`episodesComplete` already implements). Episodes TMDB lists but the log has no key for
count as 0, so a partial rewatch never inflates the figure. Consequences:

- `StatusPicker`'s − N + stepper is **movie-only**. For TV it renders the derived count
  read-only, with a line saying it comes from the episode tracker — no more typing "3"
  into a show whose episodes say otherwise.
- `buildMoviePayload` computes `timesWatched` from the log for `type === 'tv'` rather
  than trusting `form.status.timesWatched`.
- A show whose episode counts are uneven still reads as watched once, which is the
  honest answer.

**Decision — episode row UI.** Mirrors the movie Watched box: tap an unwatched row to log
the first watch, and a compact `− N +` stepper appears on watched rows. `−` at 1 removes
the last stamp and unwatches the episode. `+` appends a stamp for now.

```
┌────────────────────────────────────┐
│ ● 1. Pilot              ┌───────┐  │
│   2008-01-20            │ − 2 + │  │
│                         └───────┘  │
├────────────────────────────────────┤
│ ○ 2. Cat's in the Bag              │
└────────────────────────────────────┘
```

**Decision — season buttons.** "Mark complete" fills the gaps only: episodes at 0 get
one stamp, episodes already watched keep their counts and dates. Because the show counter
is derived, raising a whole season by one needs its own action, so the season header gains
**"Rewatch season"** — `+1` to every episode in that season. That is the sanctioned way to
say "I watched it again" without tapping 13 rows, and it keeps the counter honest since it
moves the underlying episodes.

**Decision — rewatches count toward streaks and hours.**

- TV streak: `dailyEpisodes` buckets **every** stamp in the log, so a rewatch marks the
  day it happened (`src/lib/stats.ts:260-267` iterates one stamp per key today).
- Hours watched: `runtime × totalEpisodeWatches(movie)` replaces
  `runtime × max(watchedEps, timesWatched × totalEps)` (`src/lib/stats.ts:162-174`). The
  old formula existed to stop a finished series being billed twice for its ticks _and_
  its watch count; with one source of truth that double-count cannot happen. Existing
  libraries will see Time Watched change — usually not at all, upward only where a
  rewatch was previously flattened.

**Relogging on the backfill screen.** `manage-tv-completions` stops disabling watched
episodes: picking one adds another stamp on the selected day. The "Episodes Watched"
list for a day shows one row per **stamp** (an episode watched twice on the same day
appears twice), and Remove drops that one stamp rather than the whole key.

**Ripple — every reader of the two fields.** All of these move onto the helpers:

| File                                                                                | What changes                                                          |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/lib/normalizeMovie.ts`                                                         | coerce string→`[string]`; write the derived mirror                    |
| `src/lib/episodes.ts` (new)                                                         | the helpers above                                                     |
| `src/lib/stats.ts`                                                                  | `dailyEpisodes` over all stamps; hours from total watches             |
| `src/lib/movieStatus.ts`                                                            | `watchProgressPercent`, `deriveStatusFlags` use `watchedEpisodeCount` |
| `src/lib/statsPeriod.ts`                                                            | scope per stamp, not per key (a key can straddle the window)          |
| `src/lib/recapPeriod.ts`                                                            | collect all stamps                                                    |
| `src/lib/duplicates.ts`                                                             | merge = union of stamp lists per key, deduped                         |
| `src/lib/shelfSummary.ts`                                                           | episode counts via helper                                             |
| `src/features/movies/edit/editForm.ts`                                              | log in the form; derived `timesWatched` for TV                        |
| `src/features/movies/edit/{EpisodeList,EditEpisodesTab}.tsx`, `useEditMovieForm.ts` | stepper, rewatch-season, log mutations                                |
| `src/components/media/StatusPicker.tsx`                                             | read-only derived count for TV                                        |
| `src/app/manage-tv-completions.tsx`                                                 | relog + per-stamp remove                                              |
| `src/features/social/useFriendActivity.ts`                                          | unchanged — still reads the mirror                                    |
| `src/features/settings/dataTransfer.ts`                                             | export/import round-trips the log shape                               |
| `supabase/schema.sql`, `rewrite/02-data-model.md`                                   | document the array shape                                              |
| `scripts/seed-test-recap.ts`                                                        | shift every stamp in the log                                          |

No SQL migration is required — the column is already `jsonb`; only the comment and the
docs change.

**Test.** New `src/lib/episodes.test.ts`: string→array coercion, count/log/total helpers,
`showWatchCount` (all-at-2, one-at-1, a missing key, `numberOfEpisodes` unknown),
log/unlog (including unlog at 1 clearing the key), mirror generation. Updated:
`stats.test.ts` (rewatch marks a second streak day; hours from total watches),
`statsPeriod.test.ts` (per-stamp scoping), `movieStatus.test.ts`, `duplicates.test.ts`
(stamp-list union), `editForm.test.ts` (derived TV `timesWatched`).

**Assumption.** The `s<season>e<episode>` key format is unchanged, and
`seasonEpisodeCounts` keeps doing its "next episode" job untouched.

---

## Sequencing — three releases, not one pile

Shipped as three small releases rather than a single stack of notes. Version numbering
follows the working agreement (patch = fixes only, minor = new capability), so the
already-open `2.11.0` section is retargeted to `2.10.1` and the minor bump moves to the
batch that actually adds capability.

### Release 1 — `2.10.1`, versionCode 18 · fixes only

| §   | Work                                                      |
| --- | --------------------------------------------------------- |
| §1  | Toast clears the nav islands                              |
| §5a | Filter search fields: text centred, no clipped descenders |
| §5b | Recap slide audit — whatever cropping the sweep turns up  |

Notes budget: ~3 lines. Nothing here changes data or adds a surface, so it is a safe
first ship and it puts the smallest change through the whole build/deploy loop first.

### Release 2 — `2.11.0`, versionCode 19 · library and stats navigation

| §   | Work                                                                 |
| --- | -------------------------------------------------------------------- |
| §4  | Movies / TV shows filter back in the library filters                 |
| §2  | Stats tap through to a filtered view of your library (`/in-library`) |

Both are new capability, hence the minor bump. They ship together because §2's Content
Mix drill-down (`facet=type`) is the same narrowing §4 adds to the Library tab — shipping
one without the other would read as half a feature.

### Release 3 — `2.12.0`, versionCode 20 · episode watch counts and the streak warning

| §   | Work                                                                  |
| --- | --------------------------------------------------------------------- |
| §6  | Per-episode watch counters, relogging a rewatch, derived show counter |
| §3  | Streak warning only when the streak can actually break                |

§3 rides with §6 deliberately: §6 changes what `dailyEpisodes` holds, and §3's snapshot is
computed from those same buckets — splitting them would ship a warning built on numbers
about to change. This release also carries the one manual step in the whole sweep:
re-running `supabase/notifications.sql` in the SQL editor.

### Per-release ritual

Each release, in order: branch → commits per section (`npm test`, `npm run lint`,
`npx tsc --noEmit` clean before each) → notes into that release's `## <version> —
Unreleased` section as the work lands → PR → phone build + launch → `npm run deploy:web`
→ `gh release create v<version>` with the APK → open the next `— Unreleased` section.

Branches: `fix/nav-toast-and-cropped-text`, `feat/library-type-filter-and-stats-drilldown`,
`feat/episode-watch-counts`.

§5b's audit gets an update note only if a user-visible crop was actually fixed.
