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
- [ ] Home page
- [ ] Devotional (Read) page
- [ ] Contents page (Favourites folded in as a filter, per master plan §5)
- [ ] Progress page
- [ ] Settings page (Data & Privacy folded in, per master plan §5)
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
