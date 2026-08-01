# Radar update notes

Written per `UPDATE-schema.md`. Newest version first.

## 2.4.0 — Unreleased

### Added

- Settings has My services, where you pick the streaming services you subscribe to
- Library filters gain a My services chip that narrows the grid to what you already pay for

### Fixed

- Double-pressing the Library tab clears its filters too, not just search and scroll

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
