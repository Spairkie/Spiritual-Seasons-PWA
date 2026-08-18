# Rebuild Progress

Tracking doc for the from-scratch rebuild on `rebuild/v2`. Full rationale
and design spec live in `docs/rebuild-plan/00-MASTER-PLAN.md` (merged via
PR #17); this file tracks what's actually built, not what's planned.

## Why this branch exists

The commissioned redesign on `claude/design-access-check-6ju2af` (PR #16)
was rejected by the user after review. Rather than keep patching a vanilla-JS
codebase where cascade bugs kept masking fixes across review rounds (see
master plan §2 for the root-cause writeup), the user authorized a full
rebuild: new stack, same IndexedDB data so existing users keep their
journal/progress/streaks, built on a long-lived branch in this same repo.

## Stack decisions (research-backed, see master plan §10 for the options considered)

| Decision | Choice | Why |
|---|---|---|
| Component framework | Preact 10 + TypeScript + JSX | 3KB, far larger ecosystem than SolidJS (18.2M vs 2.2M weekly downloads), fixes the "which module owns this DOM node" ambiguity that caused several legacy bugs |
| CSS | Tailwind v4 (`@theme`, Lightning CSS, first-party Vite plugin) | Design tokens as real CSS custom properties (still overridable per-season/per-theme), zero-config content detection, no more "which of 8 CSS files wins" cascade bugs |
| Build | Vite 8 + `vite-plugin-pwa` (`injectManifest`, hand-written `src/sw.ts`) | Replaces the hand-maintained `STATIC_ASSETS` cache-list; HMR for dev. Started as `generateSW` (bundled Workbox runtime) but that fails ServiceWorker script evaluation outright under Vite 8 — switched to injectManifest with our own SW once that was diagnosed, see the PWA entry below |
| Data | `idb` + IndexedDB, same DB name/version/schema as legacy | Zero migration needed — existing users' data reads straight through |
| Routing | Custom typed hash router (not `preact-iso`) | Exact control over the legacy app's URL scheme; works unmodified on static hosts |
| CSP | Netlify `_headers` file, not a `<meta>` tag | Decouples dev-server flexibility from the production policy |
| Where it lives | `rebuild/v2` branch, same repo; old app moved to `legacy/` | Avoids new-repo credential/scope friction; `legacy/` stays as the compatibility reference while porting the store layer |

## Status

- [x] Repo restructure: old app → `legacy/`, static assets → `public/`
      (full history preserved via `git mv`)
- [x] Vite + Preact + TS scaffold (`package.json`, `tsconfig*.json`,
      `vite.config.ts`) — builds, typechecks, and boots cleanly
- [x] Design tokens ported to Tailwind v4 `@theme` (`src/styles/main.css`),
      fonts self-hosted (`src/styles/fonts.css`, WOFF2, subsetted)
- [x] Content types (`src/types/book.ts`, `src/types/quiz.ts`) — verified
      against the live `public/content/*.json`, not just the docs' summary
- [x] Store schema types (`src/types/store.ts`) — verified line-by-line
      against `legacy/js/store.js`; a few docs inaccuracies caught and
      corrected in the process (quiz questions are plain strings, not
      `{id,text}`; favorites use `addedAt` not `savedAt`; USER store holds
      multiple keyed sub-records, not one blob)
- [x] Store layer implementation (`src/store/*.ts`) — one module per
      domain (user, journal, progress, favorites, settings, audioNotes,
      weeklyReflections, streaks, dataTransfer), composed in
      `src/store/index.ts`. 15 Vitest tests passing against
      `fake-indexeddb`, covering CRUD, the streak-calculation algorithm
      (including the DST-safe day-diff logic), and a full
      export → reset → import round trip.
- [x] Content loader (`src/content/content.ts`) — fetches/caches
      `book.json`/`quiz.json`, typed lookups (`getSeasonForDay`,
      `getDayEntry`, etc.) verified against the real 1-120 day layout
      (four contiguous 30-day seasons), plus a `useContent()` hook
- [x] Router (`src/router/router.ts`) — typed hash router on
      `@preact/signals`, same URL shape as the legacy app
      (`#read/42?query=…`) so old habits/bookmarks still resolve sensibly.
      13 more Vitest tests (28 total) covering hash parsing/serialization
      and the content day→season lookups
- [x] Core UI primitives (`src/components/ui/`) — Button, Card, ListRow,
      Toggle, Badge, NavItem, Sheet, ProgressRing. Sheet is a real
      accessible dialog: focus trap, Escape-to-close, focus restored to
      the trigger on close, bottom sheet on mobile / centered modal on
      desktop from the same component. Visually verified at mobile and
      desktop widths in headless Chromium (screenshots + a live focus-trap
      exercise), zero console errors.
- [x] App shell (`src/app-shell/`) — sticky header, desktop sidebar /
      mobile bottom nav (same five destinations, one shared `NAV_ENTRIES`
      config), streak indicator, and theming wired end to end: settings
      load into a reactive signal (`src/state/settings.ts`) and
      `applyTheme()` sets `data-theme`/`data-season` on the document root.
      Verified in headless Chromium at mobile and desktop widths — nav
      clicks update the route/title/hash, dark mode and all four season
      accents render correctly, zero console errors.
- [x] Quiz + intro pages (`src/pages/QuizPage.tsx`, `IntroPage.tsx`) —
      real scoring logic (`src/content/quizLogic.ts`, 5 more tests) against
      the actual quiz.json (16 questions, 4 per season, highest-total
      wins, ties prompt the user to choose per `rules.tieBehavior`).
      First-launch users are redirected to onboarding automatically;
      completing it saves quiz results, sets the current season, and
      jumps to the season's first day only on a true first-ever
      completion (retaking the quiz later doesn't discard progress).
      Onboarding renders full-screen, outside the nav shell.

      Caught and fixed a real race condition here: the settings signal is
      a module-level singleton that survives across AppShell mounts, so
      the *stale* snapshot from the pre-onboarding redirect at boot was
      winning a race against the fresh reload on the next mount and
      bouncing the user straight back to onboarding right after they
      finished it. Fixed by gating the redirect on a mount-local
      "settings loaded" flag instead of "settings is non-null". Caught by
      an actual end-to-end run of the flow in headless Chromium
      (quiz → result → home), not just unit tests — a good reminder that
      the interaction tests are pulling real weight here.
- [x] Home page (`src/pages/HomePage.tsx`) — today's scripture reference
      and text, season badge, day-within-season count, overall progress
      ring, and streak, in a 2-column layout at desktop (single column on
      mobile). Verified visually at both widths with seeded progress/
      streak data: correct season theming, correct "Continue reading" vs
      "Read again" state, and the CTA navigates to the right day.
- [x] Devotional (Read) page (`src/pages/ReadPage.tsx`) — the core screen:
      scripture + prompt, prev/next day nav, mark complete/incomplete,
      favourite toggle, and a journaling textarea with debounced autosave
      (2s, matching the legacy `AUTOSAVE_DELAY_MS`) or a manual Save
      button when the user has autosave off in Settings. 2-column at
      desktop, single column on mobile.

      Caught two real bugs via end-to-end interaction testing (typing,
      waiting out the autosave debounce, then reading IndexedDB directly
      to confirm the write): (1) a leftover "skip the first autosave"
      guard was silently eating every day's actual first keystroke —
      removed, since setting a controlled `value` prop never fires
      `input` events in the first place, so the guard was solving a
      problem that didn't exist; (2) the favourited heart icon's red
      tint was losing to the button's own `text-ink` class — Tailwind's
      cascade is resolved by stylesheet order, not DOM class-attribute
      order, so appending a class last in JSX doesn't guarantee it wins.
      Fixed with `!text-danger`. Both confirmed fixed by re-running the
      same interaction test against the built page, not just re-reading
      the code.
- [x] Contents page (`src/pages/ContentsPage.tsx`) — all 120 days grouped
      by season, with completion checkmarks and favourite hearts, plus
      the "All days / Favourites" segmented filter that replaces a
      separate Favourites page per the master plan's simplified IA
      (§5/decision 2). Loads all progress/favourites once (two queries)
      rather than per-row, and skips a season's whole section when it
      has no favourites in that filter. Verified visually with seeded
      data: filter switches correctly, tapping a day navigates to that
      exact Read page.

      Also deduplicated `SEASON_LABELS` (winter/spring/summer/autumn →
      display name), which had been copy-pasted into both QuizPage and
      HomePage already — moved into `src/content/content.ts` as the one
      shared copy. Caught in the process: the copy I was about to
      duplicate a third time assumed season titles split on " – " (en
      dash), but the real content uses an em dash, so that string split
      would have silently produced full untrimmed titles instead of
      "Winter"/"Spring"/etc. — checked the actual JSON instead of
      trusting the assumption.
- [x] Progress page (`src/pages/ProgressPage.tsx`) — overall progress ring,
      current/longest streak, journal entry count, and a per-season
      breakdown with individual progress bars. 2-column at desktop,
      single column on mobile. Verified visually at both widths with
      seeded data (8 winter + 5 spring days complete, 8-day streak, 8
      journal entries) — every number on screen matched the seed exactly.
- [x] Settings page (`src/pages/SettingsPage.tsx`) — appearance (dark
      mode, season colour, text size, line spacing) via a shared
      Sheet-based picker for all four enum settings; journaling
      (autosave, keyboard shortcuts) and reminders (daily reminder +
      time) as toggles; quick links back into the quiz/intro flows; and
      Data & Privacy folded in per the master plan (§5/decision 2) —
      export (real file download), import (file picker → validate →
      merge), and a confirm-gated full reset.

      Corrected one thing while porting the legacy privacy copy: it
      claimed audio notes are stored "as encrypted blobs," which isn't
      true (they're plain Blobs in IndexedDB, encrypted only to whatever
      degree the OS/browser profile already provides) — dropped the
      false claim rather than carry it into the rebuild.

      Verified end-to-end in headless Chromium: the appearance sheet
      actually changes `data-theme` live, toggling notifications reveals
      the time picker, Export triggers a real file download with the
      correct name, and Reset shows the confirm dialog, wipes the store,
      and correctly lands back on onboarding.

This completes all five main destinations — someone can now go through
the full loop: onboard → quiz → read a day → journal → mark complete →
favourite → see it reflected in Contents/Progress → adjust appearance
in Settings.
- [x] Wellness features — all four, none needing bundled audio assets:
      - **TTS** (`src/lib/tts.ts`): a "Listen" link on the Read page reads
        the day's scripture aloud via the Web Speech API, respecting the
        user's saved reading speed.
      - **Meditation timer** (`MeditationTimer.tsx`): 1/3/5/10-minute
        presets, a progress ring, and a two-tone bell chime
        (`src/lib/chime.ts`, synthesized via Web Audio — no asset file)
        on completion.
      - **Guided breathing** (`BreathingExercise.tsx`): box breathing
        (4-4-4-4), an animated circle synced to the phase.
      - **Ambient sound** (`src/lib/ambientSound.ts`): rain, ocean, and
        white noise, all procedurally generated from filtered/modulated
        noise buffers via the Web Audio API — deliberately trimmed from
        the legacy app's ten thinner oscillator-based presets to three
        well-executed ones, rather than reproduce all ten at lower
        quality. Also added as a default-preset picker + reading-speed
        slider in Settings.

      All three interactive tools live in one `WellnessSheet`, opened
      from the Read page, so there's no new nav destination for
      something people reach for occasionally rather than every visit.
      Verified end-to-end in headless Chromium: timer counts down for
      real, breathing phase label updates, ambient sound's play/stop
      state toggles correctly, zero console errors throughout.
- [x] Search — a search box on the Contents page matches scripture
      reference, scripture text, prompt text, or day number, across all
      seasons, overriding the All/Favourites filter rather than combining
      with it. No new nav destination.
- [x] Sharing — a share button on the Read page uses the Web Share API
      where available, falling back to clipboard copy everywhere else
      (verified via `navigator.share` being genuinely `undefined` in the
      test browser, confirming the fallback path actually ran, not just
      the happy path).
- [x] PWA / service worker — found and fixed a real, non-obvious bug: the
      app was not actually installable as a working offline PWA.
      `vite-plugin-pwa`'s default `generateSW` strategy (Workbox 7.4,
      bundled via vite-plugin-pwa 1.3.0) fails **ServiceWorker script
      evaluation outright** under this project's Vite 8 toolchain — a
      genuine version incompatibility, not a config mistake. Diagnosed by
      isolating a hand-written minimal service worker (which installed
      and cached correctly in the exact same environment) against the
      generated one (which didn't), ruling out the environment/Cache API
      itself as the cause before concluding it was the generated runtime.

      Fixed by switching to vite-plugin-pwa's `injectManifest` strategy
      with a fully hand-written service worker (`src/sw.ts`, ~100 lines,
      no Workbox dependency) — only the precache file list is injected
      at build time; everything else is plain Cache API. Two more real
      bugs surfaced and fixed while building and verifying *that*:
      1. The precache manifest can list the same file twice (once by
         content hash from the JS bundle, once via `includeAssets`) —
         `Cache.addAll()` rejects outright on duplicate requests, so the
         whole install was silently failing (worker went straight to
         `redundant`, no error surfaced anywhere a normal dev workflow
         would see it). Fixed by deduping the URL list before `addAll()`.
      2. Once installs succeeded, `crossorigin` `<script>`/`<link>`
         requests (the app's own JS/CSS bundle) still 404'd offline
         because the dev/preview server sends `Vary: Origin`, and the
         install-time same-origin caching request carried no Origin
         header while the runtime CORS request did — a spec-correct
         Vary check treating them as different cache entries despite an
         identical URL. Fixed with `{ ignoreVary: true }` on every
         `caches.match()` call.

      All three of these were invisible to `npm run build` and to normal
      dev-server browsing — they only show up if you actually register
      the built service worker, wait for it to finish installing, force
      the browser offline, and try to load the app for real, which is
      what finally caught them. Verified end-to-end: `precache-v1` holds
      all 18 unique deduped assets, a fully offline page reload renders
      the real app (not a browser error page), and `/content/book.json`
      still resolves via the NetworkFirst content cache while offline.
      `tsconfig.sw.json` gives `src/sw.ts` its own project reference
      (WebWorker lib types conflict with the main app's DOM lib in one
      shared program) so it's still typechecked, just not bundled
      through the app's own build path.
- [x] Accessibility pass — automated WCAG 2A/2AA/2.1A/2.1AA audit
      (`axe-core` against every page) rather than a manual eyeball pass,
      swept across all 7 pages × all 4 season accents × both color
      schemes (56 combinations). Found and fixed three real, previously
      invisible violations, all at the design-token level so the fix
      applies everywhere at once instead of per-component:
      1. `--color-ink-3` (light mode) — the "muted secondary text" token
         used pervasively (nav labels, list-row subtitles, captions) was
         only 3.5–3.7:1 against paper/surface, failing the 4.5:1 minimum
         for normal-sized text. Darkened `#8B857B` → `#6E6860` (~5.2–5.5:1).
      2. `--color-ink-3` (dark mode) passed against the plain surface but
         not against `--color-surface-2` (4.24:1) — the segmented-filter-
         tab background on Contents. Lightened `#8B8579` → `#9C9689`.
      3. Spring's and summer's `--color-accent` (white text on top, for
         the primary button and other text-on-accent surfaces) were only
         3.7:1 and 3.4:1 — winter and autumn happened to pass by
         accident of hue, spring/summer didn't. Darkened both
         (`#6D8E4E`→`#59743F`, `#B5822B`→`#8D6521`) to ~5.2:1.
      4. The reminder-time `<input type="time">` in Settings had no
         accessible name (a `title=` on its parent `ListRow` isn't
         programmatically associated with the input) — added
         `aria-label="Reminder time"`.

      Also verified keyboard-only navigation end to end (Tab through the
      sidebar in logical order, Enter activates a nav item and routes
      correctly) and re-confirmed the Sheet dialog's focus trap /
      Escape-to-close (built and verified back in task #17, re-checked
      here as part of the same pass). Final sweep: 0 violations across
      all 56 page/season/theme combinations.

## Real-device notes

Everything above was verified in headless Chromium (desktop + mobile
viewport emulation) — that's real coverage for layout, interaction, and
automated accessibility checks, but it is not a substitute for actually
running on physical hardware before shipping. Specifically still worth
checking on real devices before release, none of which headless Chromium
can meaningfully stand in for:
- **iOS Safari**: PWA install behavior, `100dvh`/safe-area-inset handling
  on notched devices, and the Web Speech API / SpeechSynthesis voice list
  (Safari's TTS voice availability differs meaningfully from Chrome's).
- **Actual offline installs**: this session verified offline behavior via
  `vite preview` + Playwright's simulated offline mode, which is a real
  service-worker/Cache-Storage test — but a true "install to home screen,
  kill the network, relaunch from the icon" pass on a real phone is the
  final word, since it also exercises OS-level PWA chrome the simulated
  test doesn't touch.
- **Touch target sizing**: the design uses 44px-ish tap targets
  throughout, but that's worth a real-thumb check, especially the
  day-navigation chevrons on the Read page and the Sheet's close button.
- **Screen readers**: the axe-core audit catches programmatic
  issues (contrast, missing labels, ARIA misuse) very well, but doesn't
  replace an actual VoiceOver/TalkBack pass through the quiz flow and the
  journal textarea, where the experience is more about announcement
  timing and flow than static markup correctness.
- **Reduced-motion / reduced-data**: `prefers-reduced-motion` is handled
  in `main.css`'s base layer, but hasn't been checked on a device with
  that setting actually enabled.

## Beyond the master plan's 27 tasks: legacy feature parity

The master plan's task list covered the core rebuild; once all 27 were done
the app was feature-complete for its core loop but still missing a few
things the legacy app had. Continuing to close that gap:

- [x] **Weekly Reflections** (`src/content/weeklyReflectionQuestions.ts`,
      `src/lib/weeklyReflection.ts`, `src/components/WeeklyReflectionSheet.tsx`) —
      ported the legacy app's 17 weeks of distinct prompts verbatim. Surfaced
      contextually per the master plan's IA (§5: "not a standalone nav
      destination") as a dismissible card on Home that appears once every 7
      completed days and opens a Sheet to answer; past reflections are
      browsable (expand/collapse) in a new section on the Progress page, so
      they aren't write-only. The "due" check is based on completed-day
      count crossing a multiple of 7 with no existing reflection for that
      week yet — matches the legacy app's actual logic (`isReflectionDue`),
      not just the day number, so skipping around doesn't skip reflections.
      Verified end-to-end: card appears at 7 completed days, saving persists
      the exact question/response pairing, the card disappears once saved,
      and the Progress page renders it back correctly.
- [x] **PDF export of journal entries** (`src/lib/pdfExport.ts`) — ported
      the legacy app's layout (title page, per-entry season/day badge,
      scripture ref, date, wrapped journal text, page-break handling)
      using this app's own design-token colors rather than the legacy
      app's unrelated hardcoded ones. Wired into Settings next to the
      JSON export/import.

      Caught and fixed a real bundle-size regression while verifying it:
      `import { jsPDF } from 'jspdf'` at the top of the module put jsPDF
      (and its unused-by-us `html2canvas` peer dependency, ~340KB total)
      into the eagerly-loaded module graph despite `vite.config.ts`
      already having a `manualChunks` rule specifically written to keep
      it out of the main bundle — the static import defeated that intent.
      Switched to a dynamic `await import('jspdf')` inside the export
      function, and separately found that Vite still emitted a
      `<link rel="modulepreload">` for the chunk on every page load *even
      with* the dynamic import — a second, independent eager-fetch path
      — fixed with `build.modulePreload: false`. Confirmed via actual
      network-request tracing in headless Chromium that the modulepreload
      hint is gone; the jsPDF chunk is now only ever requested by the
      service worker's own background install-time precache (a
      deliberate choice, not a bug — this app promises "works fully
      offline" in its Settings copy, so PDF export should work offline
      too even before it's ever been used once online), never as part of
      the page's own critical rendering path.
- [x] Keyboard shortcuts (the Settings toggle already existed but did
      nothing — a half-finished implementation, now finished). Ported the
      legacy shortcut map (`legacy/js/modules/keyboard-shortcuts.js`),
      split by scope rather than one global handler:
      - `src/lib/keyboardShortcuts.ts` — shared guard utilities
        (`isTouchDevice`, `shouldIgnoreKeyEvent`: ignores keydowns while
        typing in an input/textarea/contentEditable, and any ctrl/alt/meta
        chord) plus the `GLOBAL_SHORTCUTS`/`READ_PAGE_SHORTCUTS` tables
        used by the help sheet.
      - `src/hooks/useShortcuts.ts` — a small `useShortcuts(map)` hook that
        reads the `keyboardShortcuts` setting (via `settingsSignal`, so it
        turns on/off live from Settings with no reload), skips touch
        devices, and attaches/detaches one `keydown` listener.
      - Global shortcuts (`h` home, `c` contents, `s` search-via-contents,
        `?` help) are wired once in `AppShell.tsx` and open a new
        `ShortcutsHelpSheet` listing every shortcut.
      - Page-local shortcuts (`n`/`p` day navigation, `f` favourite,
        `m` mark complete, `j` focus journal) are wired directly in
        `ReadPage.tsx` rather than through the global handler, since they
        need that page's own state/handlers to keep the UI in sync. This
        meant hoisting `goToDay`/`toggleComplete`/`toggleFavorite` above
        the page's loading/error guard, because hooks (including
        `useShortcuts`) can't be called conditionally — each helper now
        guards itself against a not-yet-loaded book/state/day instead of
        relying on the later `resolvedDay`/`resolvedState` narrowing.
      - Deliberately dropped from the legacy behaviour: the boundary
        toasts ("you're on the last day") and the `.` alternate for `?`,
        since no toast/snackbar component exists in the rebuild and
        building one solely for this edge case would be over-engineering;
        `Escape` needs no separate global handler since `Sheet.tsx`
        already closes itself on Escape.
      - Verified via a seeded-IndexedDB Playwright smoke test: `?` opens
        the help sheet from Home with the full shortcut list; `c`/`h`
        navigate; on the Read page `n`/`p` change the day (URL + heading
        both update), `f` flips `aria-pressed` on the favourite button,
        `m` flips "Mark complete" → "Completed", `j` focuses the journal
        textarea, and — the key guard check — typing "n is just a letter
        here" into the focused journal textarea does *not* navigate away,
        confirming `shouldIgnoreKeyEvent` correctly ignores keys while
        typing. Zero console errors across the whole run.
- [x] Audio journal notes (voice recording). Ported the legacy AudioNotes
      module (`legacy/js/modules/audio.js`) — the store layer
      (`src/store/audioNotes.ts`, one record per day, keyPath `day`) and
      export/import wiring (`src/store/dataTransfer.ts`) already existed
      from the original 27 tasks; this added the recording UI itself:
      - `src/lib/audioRecording.ts` — framework-free recording logic:
        feature detection, mic-permission + `MediaRecorder` setup with the
        same codec fallback order as legacy (opus-in-webm →
        opus-in-ogg → mp4 → webm), the same 5-minute/10MB limits, a
        `startRecording()` that returns a `{stop, cancel}` session, and
        `getAudioDuration()`/`formatDuration()`/`formatSize()` helpers.
      - `src/components/AudioNoteRecorder.tsx` — a small state machine
        (idle → recording → saving → playback) rendered under the
        Journal card on the Read page (`day` prop), with record / stop &
        save / cancel / delete / re-record controls, an elapsed-time
        progress bar while recording, and a native `<audio controls>`
        player with duration/size/date once a note exists.
      - Added `MicIcon`, `StopIcon`, `TrashIcon` to `src/components/icons.tsx`.
      - Deliberately simplified vs. legacy: uses `window.confirm` for the
        delete/re-record confirmations (matching how Settings' "delete all
        data" already does it) rather than porting a whole custom Modal
        component for two confirm dialogs.
      - **Bug found and fixed during verification**: `getAudioDuration()`
        initially reported `Infinity` for freshly-recorded WebM blobs,
        rendering as "Infinity:NaN" in the UI — a long-standing Chromium
        bug (crbug.com/642012) where `MediaRecorder`'s WebM output has no
        duration in its header, so `<audio>.duration` stays `Infinity`
        until something forces a seek past the end. This affects any app
        using this exact `<audio>`-element duration technique in Chrome,
        including presumably the legacy app. Fixed with the standard
        workaround (seek to `Number.MAX_SAFE_INTEGER`, read the corrected
        `duration` on the resulting `timeupdate`), plus a
        `Number.isFinite` guard in `formatDuration` as a safety net.
      - Verified via a Playwright smoke test launched with
        `--use-fake-device-for-media-stream` and a granted `microphone`
        permission: record → live elapsed timer/progress bar → stop &
        save → correct duration/size/date shown → note survives a page
        reload (confirms IndexedDB persistence) → re-record replaces it
        → cancel returns to idle → delete returns to idle — zero console
        errors throughout.

- [x] Daily reminder notifications. Settings already had a "Daily
      reminder" toggle and a reminder-time picker, but flipping the toggle
      only wrote a boolean to Settings — nothing ever requested
      notification permission or scheduled anything, the same
      half-finished-implementation pattern the keyboard-shortcuts toggle
      had. Ported the scheduling core of the legacy Notifications module
      (`legacy/js/modules/notifications.js`) at a scope that matches the
      rebuild's simpler Settings schema (no quiet-hours/snooze fields to
      add — those are legacy-only extras, dropped as extra surface area
      for a feature nobody had asked to extend):
      - `src/lib/notifications.ts` — support/permission checks, and
        `showDailyReminder()` which looks up the current day/season/
        progress and calls the *service worker's*
        `registration.showNotification()` rather than `new Notification()`
        — the latter throws on Android Chrome, which only allows showing
        notifications through an active SW registration.
      - `src/hooks/useDailyReminder.ts` — a `setTimeout`-based scheduler
        keyed off `notificationsEnabled`/`reminderTime` in
        `settingsSignal`, re-arming itself for the next day each time it
        fires. This is the same mechanism the legacy app used (there's no
        server to push from) — a best-effort reminder that only fires if
        a tab happens to be open around the chosen time, not true
        background push. Mounted once in `AppShell.tsx`.
      - `notificationclick` handler added to `src/sw.ts`: focuses an
        existing tab and calls `WindowClient.navigate()` to the
        notification's day (re-requesting `index.html`, served from the
        precache, so the app boots straight to that day), or opens a new
        tab if none is open.
      - `SettingsPage.tsx`: the toggle now actually requests permission
        when turned on (and reflects a browser-level "denied" state by
        disabling itself with an explanatory subtitle, since JS can't
        re-prompt after a denial), reveals the reminder-time row only
        once permission is granted, and adds a "Send a test notification"
        action for immediate feedback.
      - Verified against a production build served via `vite preview`
        (the service worker only registers in production, not the plain
        dev server) with Playwright's `notifications` permission
        auto-granted: toggling on reveals the time picker and test
        button; sending a test notification actually invokes the real
        service worker's `showNotification()` (confirmed by intercepting
        the call, not just checking for a thrown error) with the correct
        day/season title and prompt text; the enabled state persists
        across a reload. Zero console errors.

- [x] Haptic feedback. Ported `legacy/js/modules/haptics.js`'s core idea
      (light vibration feedback on taps) at a trimmed scope — the legacy
      module distinguished `.btn-primary`/`.btn-ghost` CSS classes that
      don't exist in this rebuild's Tailwind-utility markup, so pattern
      selection here is structural instead: nav items (inside a `<nav>`
      landmark) get a `selection` buzz, every other button/`[role="button"]`
      gets `light`, and checkbox/radio/range controls fire on change.
      - `src/lib/haptics.ts` — `isHapticsSupported()`, and `triggerHaptic()`
        which checks the new `hapticsEnabled` Settings field (default
        `true`, additive to `DEFAULT_SETTINGS` so existing users' stored
        settings just pick up the default with no migration) before
        calling `navigator.vibrate()`.
      - `src/hooks/useHapticFeedback.ts` — one delegated `click`/`change`/
        `input` listener set on `document`, mounted once in `AppShell`,
        with a `WeakMap`-based per-element de-dup on range inputs so
        dragging a slider doesn't buzz on every pixel.
      - New "Haptic feedback" toggle in Settings' Journaling card,
        rendered only when `isHapticsSupported()` — desktop browsers don't
        expose the Vibration API at all, so the row simply doesn't exist
        there rather than showing a control that can never do anything.
      - Verified via Playwright with `navigator.vibrate` stubbed in an
        init script (desktop Chromium has no Vibration API at all, so
        this is the only way to exercise the feature the way a real
        Android Chrome user would): a nav-item click fires the
        `selection` pattern, the Settings toggle is visible once the API
        is present, and turning it off stops further vibration calls.
        Zero console errors.

## Compatibility guarantees

The new store layer opens the same `spiritual-seasons-db` (v1) database
with byte-identical store names, keyPaths, and indexes as `legacy/js/store.js`.
An existing user upgrading to the rebuilt app keeps their journal entries,
completion progress, streaks, favorites, and settings with no migration
step and no data loss.
