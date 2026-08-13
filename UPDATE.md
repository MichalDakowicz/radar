# Radar update notes

Written per `UPDATE-schema.md`. Newest version first.

## 2.12.0 — Unreleased

### Added

- Episodes count every watch, so a rewatched episode is logged again instead of staying ticked
- A watched episode carries a − N + counter, and a season header can rewatch the whole season
- The day view behind the TV calendar can log an episode you already watched
- That day view groups an episode's watches with their times, and can clear a whole day

### Changed

- A show's watch count is read from its episodes instead of typed into the status box
- Time watched counts every episode watch, so TV rewatches finally show up in your hours
- A show watched several times with no episodes tracked still counts all of those hours

### Fixed

- The evening streak warning only arrives when the week can still break your streak
- It names how many more you need this week instead of just saying to log something
- Rewatching a season asks first, so one stray tap no longer logs the whole season again

## 2.11.0 — 2026-08-13

### Added

- Library filters can narrow to movies only or TV shows only
- Tapping a director, genre, era, type or status in Stats lists your own titles behind it
- That view keeps a button through to the full director or genre page on TMDB

## 2.10.1 — 2026-08-13

### Fixed

- Confirmation popups sit above the floating nav bar instead of behind it
- Search boxes in the library filters no longer clip the text you type
- Recap headlines and big numbers keep their tops instead of being cut off

## 2.10.0 — 2026-08-09

### Added

- Profile ranks every film and show you rated by its release year, best first
- The current year gets its own card, with the rest of the years one tap behind it
- Settings can merge a title held twice into one entry, keeping every rating and watch

### Fixed

- A series finished by ticking its last episode now counts as watched everywhere
- Stats no longer double-count a finished series against your hours

## 2.9.0 — 2026-08-09

### Added

- Recaps rank the actors you watched most, counted from the top billing of every title
- The yearly report gives them a page of five faces, the monthly reel a page of three

### Changed

- Cast on a movie or show is a row of faces you scroll sideways, each with the role played
- Picking a profile picture no longer asks for access to your photos, just the photo picker
- Radar no longer requests camera, microphone or media access it never used

## 2.8.0 — 2026-08-03

### Added

- Radar Recap — your month as a four page story, your year as a nine page report
- A recap arrives once its period ends: July's on 1 August, the year's on 1 January
- Your recaps sit on Profile as a shelf of cover tiles, under what you are watching
- The monthly recap covers hours watched, how you rank among friends, and the film of the month
- The month closes on its best titles in order, not on what you left in the watchlist
- The yearly report opens on an archive cover and closes on a card you share as an image
- Genres in the yearly report are a type wall, sized by how much you actually watched them
- Directors get a podium, with bars scaled to the real gap between first and third
- The year day by day, as a heatmap of films and episodes with your longest streak named
- Tap right to move on, left to go back, hold to pause, swipe sideways, drag down to close
- Going back holds the story where it is until you tap forward again
- The archive shows every recap Radar still holds as its own shareable card

## 2.7.0 — 2026-08-02

### Added

- Notifications for friend activity, releases, streaks and suggestions, with a full inbox
- Inbox replaces the friend requests screen, so requests and everything else share one place
- Settings choose what friends' watching notifies you about: nothing, your titles, or everything
- A heads-up before a watchlist title comes out, and again on release day
- A warning in the evening when today would break your watching streak
- The occasional suggestion to pick something back up after a few quiet days
- Quiet hours hold banners overnight without keeping anything out of the inbox
- Tapping a notification opens the title, friend or screen it is about and marks it read
- Friend activity opens the event's own page, from the notification or the feed card
- The inbox badge lights up as a notification arrives and on app open, not on inbox open

### Changed

- The nav bar's inbox button counts unread notifications as well as pending friend requests

## 2.6.1 — 2026-08-02

### Removed

- The time period pill is gone from Stats — the nav bar button still opens the picker

## 2.6.0 — 2026-08-02

### Added

- Stats has a time period picker, so every number can read the last 30 or 90 days or this year
- Profile offers to pick something at random, either on your services or from the whole library

### Changed

- Navigation is a floating glass bar: the page's one action, the five destinations, your avatar
- The top bar is gone, so every screen starts with its own content
- Add a title, Search, Friend requests and Settings moved onto the nav bar's left button
- The nav bar's marker slides between destinations instead of jumping
- The nav bar stays on screen in Settings and the friend requests inbox

### Removed

- Pick Random is no longer in the Library top bar — it lives on Profile now

## 2.5.1 — 2026-08-02

### Changed

- The public score ring on a movie or show fills out of the bottom centre instead of a corner

### Fixed

- In progress on a shelf no longer lists titles you have already finished
- Social drops a started watching entry once that title has been finished
- Saving a title you had already watched no longer marks today on the streak calendar
- Continue watching keeps every title when you add one, instead of showing only the new one
- The top bar is the same height on every tab, so Social and Profile no longer sit lower

### Removed

- Open your library button on your own Profile, which the Library tab already covers

## 2.5.0 — 2026-08-02

### Added

- Radar re-fetches stale posters, cast and streaming availability on its own in the background
- A progress notification tracks a metadata refresh, so you can close Radar while it runs
- Stop a running refresh from Settings or straight from its notification

### Changed

- Refresh all metadata resumes where it stopped instead of restarting, and shows when it last ran

## 2.4.0 — 2026-08-01

### Added

- Settings has My services, where you pick the streaming services you subscribe to
- Library filters gain a My services chip that narrows the grid to what you already pay for

### Fixed

- Double-pressing the Library tab clears its filters too, not just search and scroll
- Library jumps back to the top when you search, filter or re-sort instead of landing mid-list
- Browse search results start at the top on a new query or result-type filter

## 2.3.0 — 2026-08-01

### Added

- Social opens on a feed of what your friends have rated, finished and queued up
- A rail of friends tops the feed, ringed when they log something while you are away
- Filter the feed to one friend, or to ratings, watches, in progress and watchlist adds
- This week shows who logged the most, and leads into comparing taste with them
- React with an emoji or leave a comment on anything in the feed
- A friend's shelf leads with their totals, what they are watching and what you both like
- Compare taste scores your overlap and can add their picks to your watchlist
- Watch together lists what is on both your watchlists and picks one for tonight
- Friend requests now have their own inbox, reached from the bell on Social
- Profile is a tab of its own, showing your totals, top 4, in progress and recent logs

### Changed

- Settings moved behind the gear on Profile instead of taking up a tab
- The Friends tab is now Social, with a per-friend menu and a confirm before removing one

## 2.2.2 — 2026-08-01

### Fixed

- The public score border on movie and show detail fills anticlockwise, not clockwise

## 2.2.1 — 31.07.2026

### Added

- Filter Library by genre, director or release year, alongside status and service
- Each filter chip shows how many of your titles it covers

### Changed

- The Library arrows button now flips sort direction, with the live arrow drawn bold
- Each sort starts in its natural order, and Library now leads with date added

### Fixed

- Coming soon lists every unreleased title you are waiting for, not only the next 6 months
- A title releasing today stays in Coming soon for the whole day
- The random picker spins real posters and never lands on the title it just showed
- Text sits centred in every search box instead of riding low in it

### Removed

- Drag-to-reorder in Library, which the arrows button used to toggle
- Custom order sort and Group by, whose views are covered by the new filters

## 2.2.0 — 31.07.2026

### Added

- Tap the poster on a title to see it full size, then save it to your gallery or copy it

### Changed

- Movie and show detail leads with a bigger poster on the right of the header
- Title, cast, genres and overview are read-only on detail; rating and notes stay editable
- Removing a title leaves you on its page, so you can add it straight back if it was a slip
- Titles in your library show the same cast, studios and score as ones you have not added
- Genre chips carry an icon for the genre, on detail and everywhere they appear
- The public score card traces its border as far round as the score, so 7.9 fills 79%

## 2.1.0 — 31.07.2026

### Added

- Pin a top 4 of favourite movies and shows to your profile from Settings › Account
- A shelf you visit leads with that person's top 4, above their collection
- Radar tells you when a newer version is out and downloads the APK from GitHub for you
- Settings › About shows the installed version and checks for a new build on demand
- On the web build, `1`–`9` jump between tabs, `n` opens Add, and `/` focuses search

### Changed

- Browse opens straight into the discovery feed instead of loading it on first visit
- Wide screens keep content centred and readable instead of stretching edge to edge
- TMDB requests back off and retry when rate-limited, so posters and cast load more reliably
