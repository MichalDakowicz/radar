# Update notes schema

Rules for writing `UPDATE.md`. Read this before editing that file.

## What UPDATE.md is for

`UPDATE.md` is the running draft of user-facing release notes. Every user-visible
change gets a line there **as it lands**, not reconstructed from git log at release time.

At release, the top section's body is pasted into the GitHub release body. The app
fetches that body from the releases API and renders it in the "Update available"
popup (`src/features/updates/UpdateNotice.tsx` via `ReleaseNotes.tsx`). So these notes
are shipped UI, not internal bookkeeping — the schema below is bound by what that
renderer supports and by how much fits on a phone screen.

## File layout

One section per version, newest first. The top section is always the unreleased one.

```
## 2.2.0 — Unreleased

### Added
- ...

## 2.1.0 — 2026-08-04

### Added
- ...
```

Version heading: `## <version> — <YYYY-MM-DD>`, or `## <version> — Unreleased` while in
progress. Version matches `expo.version` in `app.json` and the git tag `v<version>`.

## Categories

Use only these, in this order. Omit any that are empty — never leave an empty heading.

| Heading      | For                                                              |
| ------------ | ---------------------------------------------------------------- |
| `### Added`  | New capability the user did not have before                       |
| `### Changed`| Existing behaviour that now works differently                     |
| `### Fixed`  | Something that was broken and now is not                          |
| `### Removed`| Capability that is gone                                           |

## Entry rules

- One `- ` bullet per change. One change per bullet — split "and also" lines.
- Write for a user of the app, not a reviewer of the diff. Say what they can now do,
  not which files moved.
- Present tense, no trailing period, sentence case.
- Name the surface when it helps locate the change: Library, Browse, Stats, Friends,
  Settings, movie/show detail.
- Keep a bullet to roughly one phone line (~90 chars). Longer detail belongs on the
  GitHub release page, not in the popup.
- **Skip internal-only work**: refactors, dependency bumps, tests, CI, lint config,
  build tooling, type fixes with no behaviour change. If a user cannot notice it, it is
  not an update note.

Good:

```
- Settings shows the installed version and offers the new APK when one is out
- Browse loads instantly on first open instead of showing a spinner
```

Bad:

```
- Added useAppUpdate hook and UpdateNotice component      (implementation, not user value)
- Fixed stuff                                             (says nothing)
- Refactored ContentShell to share layout logic           (invisible to users)
```

## Markup the popup can render

Supported — safe to use:

- `### Headings` (all heading levels render identically: bold, one line)
- Bullets: `-`, `*`, or `1.`
- `**bold**`
- `` `code` ``
- `[link text](https://…)` and bare `https://…` URLs (rendered tappable, scheme stripped)

Not supported — avoid, they degrade:

- Nested/indented bullets — flattened to top level, the nesting is lost
- Code fences, tables, images, blockquotes, raw HTML — rendered as plain paragraphs
- Horizontal rules (`---`) and blank lines — dropped

## Length budget

The popup renders the **first 14 blocks** and drops the rest; a heading and a bullet each
count as one block. The notes sit in a 200px scroll box.

Keep a release to about 12 lines total including category headings. If a release has more
than that, keep the entries a user cares about most at the top — that is what fits on
screen before they scroll.

## Release checklist

1. Change the top heading from `— Unreleased` to `— YYYY-MM-DD`.
2. Set `expo.version` in `app.json` to that version (`android/` is gitignored prebuild
   output, so app.json is the only place it lives).
3. Build the APK and name it `radar-v<version>.apk`.
4. Create the GitHub release tagged `v<version>`, attach the APK, and paste that
   section's **body** — the category headings and bullets, not the version heading —
   as the release body.
5. Add a fresh `## <next version> — Unreleased` section at the top of `UPDATE.md`.

The in-app notice compares the release tag against `expo.version`, so a release whose tag
is not above the shipped app version will never surface (see `src/lib/appUpdate.ts`).
