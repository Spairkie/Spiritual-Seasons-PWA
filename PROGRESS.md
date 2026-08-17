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
| Build | Vite 8 + `vite-plugin-pwa` (Workbox) | Replaces the hand-maintained `STATIC_ASSETS` cache-list; HMR for dev |
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
- [ ] Wellness features (timer, breathing, ambient sound, TTS)
- [ ] Search, sharing, export/import UI, PWA/service worker polish
- [ ] Accessibility pass (WCAG 2.2 AA), real-device check, final review

`src/main.tsx` / `src/app.tsx` currently render a placeholder that only
proves the pipeline (Vite build, Preact render, Tailwind, store init) works
end to end — the real router and app shell replace it in the next steps.

## Compatibility guarantees

The new store layer opens the same `spiritual-seasons-db` (v1) database
with byte-identical store names, keyPaths, and indexes as `legacy/js/store.js`.
An existing user upgrading to the rebuilt app keeps their journal entries,
completion progress, streaks, favorites, and settings with no migration
step and no data loss.
