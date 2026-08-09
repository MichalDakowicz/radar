# Android build optimisation — proposals

Not a task list. Nothing here is implemented; this is what Play Console's **App
optimisation: Low** verdict actually refers to in this project, what each fix is
worth, and what it risks. Pick from it when there is time to test a release build
properly — every item below changes the *release* variant only, which is the one
variant that never runs during day-to-day development.

Baseline measured on **v2.9.0 (versionCode 16)**, AGP 8.12.0, Gradle 9.3.1,
Expo SDK 57 / RN 0.86, Hermes on, new architecture on.

| Artefact                     | Size   |
| ---------------------------- | ------ |
| `radar-v2.9.0.apk`           | 116 MB |
| `radar-v2.9.0.aab`           | 78 MB  |
| `classes*.dex` (5 files)     | ~49 MB uncompressed |
| `assets/index.android.bundle`| 6.4 MB |
| `lib/` — 4 ABIs shipped      | armeabi-v7a, arm64-v8a, x86, x86_64 |

---

## 1. What Play is actually complaining about

| Play line                | Reads as | Cause in this repo |
| ------------------------ | -------- | ------------------ |
| Optimisation percentage  | `-`      | R8 never ran, so there is nothing to score |
| Obfuscation percentage   | `1%`     | The 1% is libraries that shipped pre-obfuscated; our own code is untouched |
| Shrinking percentage     | `-`      | `shrinkResources` is off, and it cannot be on while minify is off |
| R8 configuration         | `-`      | Same root cause; the AGP 9.0 note is a separate, softer ask |

One root cause behind three of the four lines: **the release build does not run
R8.** `android/app/build.gradle` (prebuild output) reads

- `android.enableMinifyInReleaseBuilds` — defaults to `false`
- `android.enableShrinkResourcesInReleaseBuilds` — defaults to `'false'`

and neither is set in `android/gradle.properties`. That is the Expo default, not
something that was turned off here.

---

## 2. Proposal — turn on R8 minification

**Payoff: large.** ~49 MB of uncompressed dex across five files is the single
biggest thing in the artefact, and it is exactly what R8 exists to cut. A typical
RN app sheds 30–50% of its dex, and multidex may collapse to fewer files.
It also turns three red lines on the Play report green at once.

**How it should be done.** `android/` is prebuild output and gitignored, so
editing `gradle.properties` by hand does not survive `expo prebuild`. Two routes
that do survive:

- `expo-build-properties` in `app.json` plugins — the supported route, with
  `enableProguardInReleaseBuilds` / `enableShrinkResourcesInReleaseBuilds`.
- A local config plugin, the way `plugins/withUploadSigning.js` already patches
  the signing config. Only worth it if `expo-build-properties` cannot express
  what is needed.

**Risk: real, and it only bites in release.** R8 strips and renames anything it
cannot see being used, and anything reached by reflection is invisible to it. A
missing keep rule is a `ClassNotFoundException` or a silently empty screen in a
build that a debug run will never reproduce. Practical consequences here:

- Every native module in the dependency list ships consumer ProGuard rules, so
  the common cases are covered — but `android/app/proguard-rules.pro` currently
  only keeps Reanimated and TurboModules, and that file is our responsibility.
- The surfaces most likely to break are the reflective ones: the recap share
  canvas (`react-native-view-shot`), notification/background task entry points
  registered by name (`expo-task-manager`, `expo-notifications`), MMKV/JSI, and
  anything deserialised into a shape by `@supabase/supabase-js`.

**Test plan before it is trusted.** Build release with minify on, install on the
device, and walk: sign in → library → movie detail (cast row, similar row) →
add/remove → stats → open a monthly recap → open a yearly recap → share the
recap image → trigger a notification → background refresh. Watch
`adb logcat -s ReactNativeJS:* AndroidRuntime:E` throughout. Ship to Play as a
staged rollout, not 100%.

**Rollback:** flip the flag back and cut a new versionCode. Nothing about the
app's data or signing changes, so a bad build is recoverable in one release.

## 3. Proposal — resource shrinking

**Payoff: moderate.** Drops unreferenced drawables/strings, including ones pulled
in by libraries. Depends on proposal 2 — `shrinkResources` without `minifyEnabled`
is a build error, which is why the Play line reads `-`.

**Risk:** resources looked up by name (`getIdentifier`) get stripped. Worth
turning on in the same experiment as R8 but flipping *separately* so a failure is
attributable, and worth checking the adaptive icon, splash, and notification icons
specifically afterwards.

## 4. Proposal — audit and grow `proguard-rules.pro`

Independent of when R8 goes on, and cheap to prepare in advance: read the consumer
rules the dependencies ship (`node_modules/*/android/proguard-rules.pro`), then
write our own keeps for what is ours and reflective. The current file is four
lines and predates most of the stack — it does not mention view-shot, MMKV,
notifications, task-manager, SVG, or Nitro modules.

Keep this file lean and commented: every rule should say *why*, or the next
person cannot tell a load-bearing keep from a superstitious one.

## 5. Proposal — AGP 9.0 (the R8 configuration line)

Play asks for AGP 9.0. We are on 8.12.0, and AGP is not ours to choose: it comes
from `expo-root-project` on SDK 57, and `android/build.gradle` deliberately
declares `classpath('com.android.tools.build:gradle')` without a version.

**Recommendation: do not force it.** Pinning a newer AGP than the Expo SDK was
tested against risks Kotlin/Gradle mismatches across every autolinked module for
a score line that is worth far less than proposal 2. Revisit when the next Expo
SDK ships with AGP 9 — the R8 lines will go green from minification alone before
then.

## 6. Proposal — trim the shipped ABIs

`reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64` builds four copies of
every native library. `libreactnative.so` alone is ~7 MB per ABI, and x86/x86_64
exist for emulators.

- For the **AAB**, Play already splits by ABI, so the download a user gets is
  unaffected — but the upload, the build time, and CI storage all shrink.
- For the **APK** attached to GitHub releases, this is the difference between a
  116 MB and a ~70 MB download for a phone that can only use one ABI.

**Risk:** x86_64 covers Chromebooks and some emulator-based installs. If the
GitHub APK is ever installed on one, dropping it breaks that. Sideloading is a
phone workflow here, so the risk is small but should be a decision, not a
side effect. An alternative that keeps everything working: leave the AAB at four
ABIs and generate per-ABI APK splits for the GitHub release.

## 7. Proposal — startup profile / baseline profile

Play's optimisation score also reads startup performance, and this is the part
minification does not fix. `androidx.profileinstaller` with a generated baseline
profile is the standard answer, and it measurably improves cold start on the RN
new architecture. Bigger job than the rest — needs a macrobenchmark module and a
device run to generate the profile — so it belongs after proposals 2–3, if the
score still reads Low.

## 8. Proposal — put the JS bundle on a diet

6.4 MB of Hermes bytecode is independent of everything above; R8 does not touch
it. Before guessing, measure: export with source maps and read the treemap
(`expo export` + `source-map-explorer` or `react-native-bundle-visualizer`).

Specific things worth checking once there is a treemap:

- `lucide-react-native` — icon libraries are notorious for pulling the whole set
  in when imported as a namespace rather than per-icon.
- `expo-dev-client` sits in `dependencies`. Confirm whether it is contributing to
  the release variant at all; if it is, it belongs in `devDependencies`.
- `@expo/ui`, `expo-glass-effect`, `expo-symbols` — check they are actually used
  on the Android path and not just imported.
- `react-dom` / `react-native-web` should be resolved out of the Android bundle by
  Metro's platform resolution. Worth confirming rather than assuming.

## 9. Proposal — measure every release, not just this one

None of the above is worth doing twice because nobody wrote the number down. A
one-line size record per release — APK, AAB, dex total, bundle — kept next to the
release notes makes a regression obvious the moment it lands, and turns "the app
feels big" into a number. `apkanalyzer apk file-size` / `apkanalyzer dex packages`
and the Play Console app size report are the tools; the discipline is the point.

---

## Suggested order

1. **Proposal 4** — write the keep rules first. Cheap, safe, and it is the
   groundwork that makes proposal 2 survivable.
2. **Proposal 2** — R8 on, with the full device walk-through and a staged
   rollout. This is where nearly all the size and nearly all the Play score is.
3. **Proposal 3** — resource shrinking, flipped separately so a break is
   attributable.
4. **Proposal 6** — ABI decision for the GitHub APK.
5. **Proposal 8** — bundle treemap, then act on what it shows.
6. **Proposal 7** — baseline profile, only if the score is still Low.
7. **Proposal 5** — AGP 9, when Expo ships it.

## Explicitly not worth doing

- Forcing AGP 9.0 ahead of the Expo SDK (see proposal 5).
- Chasing the obfuscation percentage for its own sake. Radar is open source and
  the APK is published on GitHub; obfuscation here is a side effect of R8 doing
  size work, not a security measure, and nothing should be designed around it.
- `enablePngCrunchInReleaseBuilds` / packaging flags. Already at sensible
  defaults, and the assets folder totals ~275 KB — there is nothing there to win.
