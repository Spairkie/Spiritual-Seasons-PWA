# Rebuild Roadmap — Spiritual Seasons PWA

---

## Overview

This is a phased plan for rebuilding the app from scratch in a new repository. The goal is to deliver a working, production-ready app in phases while preserving all current features, keeping user data compatible, and improving code quality at every step.

**Estimated timeline:** 8–12 weeks for a solo developer, 4–6 weeks with two developers.

**Content:** No changes to `book.json` or `quiz.json` — the spiritual content stays exactly the same.

---

## Phase 0 — Project Setup (Day 1–2)

### Goals
- New repository created and configured
- Dev environment working
- Base file structure in place
- TypeScript compiling

### Tasks

**0.1 Repository & tooling:**
```bash
npm create vite@latest spiritual-seasons-v2 -- --template vanilla-ts
cd spiritual-seasons-v2
npm install
npm install -D vitest @vitest/coverage-v8 fake-indexeddb
npm install idb
npm install vite-plugin-pwa
npm install jspdf
```

**0.2 Configure TypeScript:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

**0.3 Configure Vite:**
- Install `vite-plugin-pwa`
- Set `base: './'` for GitHub Pages compatibility
- Configure code splitting (lazy chunks per route)
- Configure CSS Modules

**0.4 Copy static assets:**
- Copy `content/book.json` and `content/quiz.json` to `public/content/`
- Copy `assets/` folder to `public/assets/`
- Copy `manifest.webmanifest` to `public/`

**0.5 Create types:**
- Write all TypeScript interfaces in `src/types/` (book.ts, quiz.ts, store.ts)

### Deliverable
- `npm run dev` works and shows a blank page
- `npm run build` produces a dist folder
- `npm test` runs (no tests yet, but configuration works)

---

## Phase 1 — Core Infrastructure (Week 1)

### Goals
- IndexedDB store layer (typed, split by domain)
- Router (typed hash router)
- Config
- Utils (DOM, date, validation)

### Tasks

**1.1 IndexedDB layer (`src/store/`):**
- Write `db.ts` — open connection, define schema, handle upgrades
- Write `journal.ts` — getJournalEntry, saveJournalEntry, getAllJournalEntries, deleteJournalEntry
- Write `progress.ts` — getDayProgress, markDayComplete, markDayIncomplete, getCompletedDaysCount, getAllProgress
- Write `favorites.ts` — toggleFavorite, getAllFavorites, isFavorite, updateFavoriteNote
- Write `settings.ts` — getSetting, saveSetting, getSettings, resetSettings
- Write `user.ts` — getCurrentDay, setCurrentDay, getCurrentSeason, getQuizResults, saveQuizResults
- Write `audio.ts` — getAudioNote, saveAudioNote, deleteAudioNote, getAllAudioNotes
- Write `reflections.ts` — getWeeklyReflection, saveWeeklyReflection, getAllReflections
- Write `streaks.ts` — getStreakData, updateStreakData, calculateStreak
- Write `index.ts` — re-export all store functions

**DB schema compatibility:** Same DB name (`spiritual-seasons-db`), version (`1`), and store names as the original. Existing user data will be automatically picked up.

**1.2 Tests for store layer:**
- Write unit tests for each store module using `fake-indexeddb`
- Target: 100% branch coverage on store functions

**1.3 Content loader (`src/content/`):**
- Write `loader.ts` — loads `book.json` and `quiz.json` with caching
- Write `devotional.ts` — getDay(), getSeasonForDay(), getSeasons(), getNextDay(), getPrevDay(), getFrontMatter()
- Write `quiz-engine.ts` — calculateResults(), getQuestions()

**1.4 Router (`src/router/`):**
- Port `router.js` to TypeScript
- Add proper types for params, route names
- Keep hash-based navigation for GitHub Pages compatibility

**1.5 Config (`src/config.ts`):**
- Port `config.js` to TypeScript with `as const` assertion (no Object.freeze needed)

**1.6 Utils (`src/utils/`):**
- `dom.ts`: createElement, clearElement, escapeHtml, showLoading, getIcon
- `date.ts`: formatDate, formatTimeAgo, getGreeting, getDayInSeason
- `validation.ts`: validateDay, validateSetting

### Tests to write:
- `store/journal.test.ts` — save, retrieve, update, delete
- `store/progress.test.ts` — mark complete, incomplete, count
- `store/favorites.test.ts` — toggle, note update
- `content/devotional.test.ts` — getDay, getSeasonForDay bounds
- `utils/validation.test.ts` — validateDay edge cases

### Deliverable
- All store functions work and are tested
- Content loading works
- Router registered (no pages yet)

---

## Phase 2 — App Shell & CSS Foundation (Week 2)

### Goals
- App shell renders with correct layout
- All CSS design tokens ported
- Seasonal theming works
- Responsive navigation (bottom nav on mobile, sidebar on desktop)
- Light/dark mode working

### Tasks

**2.1 CSS: Design tokens (no changes needed):**
- Copy `variables.css` exactly — the token system is excellent
- Copy `reset.css` exactly
- Write `src/styles/base/global.css` — body background, app shell baseline

**2.2 CSS: App shell layout:**
```css
/* src/styles/layout/shell.css */
html, body {
  overflow: hidden;
  height: 100%;
  position: fixed;
  width: 100%;
}

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

/* Seasonal backgrounds on app-main — single selector, not per page */
.app-main {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--season-light) 20%, var(--bg-cream)),
    var(--bg-cream)
  );
  position: relative;
}

[data-season="winter"] .app-main::before { /* snowfall animation */ }
[data-season="spring"] .app-main::before { /* bloom */ }
[data-season="summer"] .app-main::before { /* sun glow */ }
[data-season="autumn"] .app-main::before { /* warm gradient */ }
```

**2.3 CSS: Responsive navigation:**
```css
/* src/styles/layout/nav.css */
.bottom-nav {
  /* mobile: fixed bottom */
  position: fixed;
  bottom: 0;
  /* ... */
}

@media (min-width: 768px) {
  .bottom-nav { display: none; }
  .sidebar-nav { display: flex; flex-direction: column; }
}
```

**2.4 Render app shell (`src/main.ts`):**
- Build HTML structure (header + main + nav)
- Initialize ThemeManager
- Initialize router
- Navigate to current hash
- Show/hide splash

**2.5 ThemeManager:**
- Port to TypeScript
- Handle `data-theme` and `data-season` attribute updates
- Listen to system color scheme changes

### Deliverable
- App shell renders with header + empty content area + bottom nav
- Clicking nav items changes the hash
- Dark mode toggle works
- Season theme changes color on `data-season` switch

---

## Phase 3 — Core Reading Experience (Week 2–3)

### Goals
- Home page functional
- Devotional page functional (scripture + journal + navigation)
- TOC page functional

### Tasks

**3.1 Home page (`src/pages/home.ts`):**
- Port `renderHome()` from `app.js`
- Move inline styles to `src/styles/components/home.module.css`
- Responsive: 2-column layout at 768px+

**3.2 Devotional page (`src/pages/devotional.ts`):**
- Port `devotional.js` render + attachListeners
- Move ALL inline styles to `devotional.module.css`
- Responsive: 2-column layout at 768px+ (scripture left, journal right)
- Journal: auto-save with debounce, manual save option
- Navigation: prev/next day, season transitions

**3.3 TOC page (`src/pages/toc.ts`):**
- Port `toc.js`
- Render 120 days grouped by season
- Sticky season headers
- Completion/favorite/journal/audio indicators
- Max 5 columns at any width

**3.4 CSS Components:**
- `button.module.css` — all button variants
- `card.module.css` — card, card-header, card-list
- `devotional.module.css` — scripture, journal, nav, save indicator

### Tests to write:
- `pages/devotional.test.ts` — renders correct day, navigation works
- `features/journal-autosave.test.ts` — debounce fires correctly

### Deliverable
- Can read any of the 120 days
- Journal saves to IndexedDB
- Mark complete advances to next day
- TOC shows all 120 days with indicators

---

## Phase 4 — Quiz & Intro (Week 3)

### Goals
- Quiz flow functional end-to-end
- Intro pages functional
- First-time user experience works

### Tasks

**4.1 Quiz (`src/pages/quiz.ts`):**
- Port `quiz.js` with ARIA improvements already in place
- TypeScript types for quiz results
- Tiebreaker handling
- Save results to IDB

**4.2 Intro pages (`src/pages/intro.ts`):**
- Port `intro-pages.js`
- All intro sub-pages (welcome, how-to-use, season overviews)

**4.3 First-time flow:**
- Detect no quiz results → route to intro
- Quiz → save season → navigate home
- Onboarding tour prompt

### Deliverable
- New user can complete quiz and start reading
- All 8 intro pages render correctly

---

## Phase 5 — Progress, Search & Favorites (Week 4)

### Goals
- Progress dashboard with streaks and milestones
- Search with filters
- Favorites with notes
- Weekly reflections

### Tasks

**5.1 Progress dashboard (`src/pages/progress.ts`):**
- Port `progress.js`
- Season rings (SVG)
- Streak card
- Milestone badges
- Responsive: 2-column at 1024px+

**5.2 Search (`src/pages/search.ts`):**
- Port `search.js`
- Fix filter performance: batch load journals/progress/favorites/audioNotes once
- Highlight matched text in results

**5.3 Favorites (`src/pages/favorites.ts`):**
- Port from `app.js renderFavorites()`
- Edit note modal
- Empty state with action

**5.4 Weekly reflections (`src/pages/reflections.ts`):**
- Port `weekly-reflection.js`
- Fix container ID bug (was using 'content' instead of 'reflections-content')

### Deliverable
- Progress page shows streaks and milestones
- Search works with filters (no per-item IDB reads)
- Favorites list with note editing
- Weekly reflections viewable and editable

---

## Phase 6 — Settings & Privacy (Week 4–5)

### Goals
- All settings persist and apply immediately
- Data export (JSON, CSV, PDF)
- Data import with validation
- Privacy dashboard

### Tasks

**6.1 Settings page (`src/pages/settings.ts`):**
- Port `settings.js`
- All settings: dark mode, font size, line spacing, bible translation, season colors, reading speed, auto-save, notifications

**6.2 Privacy/data dashboard (`src/pages/privacy.ts`):**
- Port `privacy.js`
- Export buttons (JSON, CSV, PDF)
- Import with validation
- Reset with export-first prompt

**6.3 Data export (`src/features/data-export.ts`):**
- Port `data-export.js` with bugs already fixed
- JSON export in importable format
- CSV export
- PDF export (lazy-load jsPDF)

### Deliverable
- All settings work and persist
- Data can be exported and re-imported
- Full reset works with confirmation

---

## Phase 7 — Wellness Features (Week 5)

### Goals
- TTS functional
- Audio notes functional
- Ambient sounds functional
- Guided breathing functional
- Meditation timer functional

### Tasks

**7.1 TTS (`src/features/tts.ts`):**
- Port `tts.js`
- TypeScript types for speech events

**7.2 Audio notes (`src/features/audio-notes.ts`):**
- Port `audio.js`
- TypeScript types for MediaRecorder events

**7.3 Ambient sounds (`src/features/ambient-sound.ts`):**
- Port `ambient-sound.js`
- 8 presets remain the same

**7.4 Guided breathing (`src/features/breathing.ts`):**
- Port `guided-breathing.js`

**7.5 Meditation timer (`src/features/meditation-timer.ts`):**
- Port `meditation-timer.js`

### Deliverable
- All wellness features work on mobile and desktop
- Audio recording works (where MediaRecorder is supported)

---

## Phase 8 — PWA & Service Worker (Week 6)

### Goals
- Workbox-generated service worker
- All assets cached offline
- Push notifications
- PWA installable
- Network conditions tested

### Tasks

**8.1 Configure vite-plugin-pwa:**
- Precache all built assets automatically
- Runtime caching for fonts (CacheFirst) and content JSON (NetworkFirst)

**8.2 Port push notification logic:**
- `src/features/notifications.ts` from `notifications.js`

**8.3 PWA install promotion:**
- Port from `app.js`

**8.4 Test offline:**
- Verify all 120 days accessible offline
- Verify journal saves queue when offline and sync when online
- Verify correct update flow (new version banner)

### Deliverable
- PWA score: 100% in Lighthouse
- Works fully offline
- Installs on iOS and Android

---

## Phase 9 — Sharing & Verse Images (Week 6)

### Goals
- Web Share API
- Canvas image generator
- Calendar integration

### Tasks

**9.1 Sharing (`src/features/sharing.ts`):**
- Port `sharing.js`

**9.2 Verse images (`src/features/verse-images.ts`):**
- Port `verse-images.js`

**9.3 Calendar integration (`src/features/calendar.ts`):**
- Port `calendar-integration.js`

**9.4 PDF export (`src/features/pdf-export.ts`):**
- Port `pdf-export.js`
- Use proper jsPDF import (not dynamic script injection)

### Deliverable
- Verse can be shared via Web Share or copied
- Shareable image can be generated and downloaded
- Journal can be exported as PDF

---

## Phase 10 — Accessibility, Testing & Polish (Week 7–8)

### Goals
- WCAG 2.1 AA compliance
- Keyboard navigation fully functional
- All unit tests written
- Lighthouse performance score 90+
- Final design polish

### Tasks

**10.1 Accessibility:**
- Add skip link: `<a href="#main-content" class="skip-link">Skip to content</a>`
- Verify all interactive elements have visible focus styles (add to CSS)
- ARIA audit: headings, labels, live regions, landmarks
- Screen reader test (NVDA/VoiceOver)

**10.2 Keyboard shortcuts:**
- Port `keyboard-shortcuts.js`

**10.3 Onboarding tour:**
- Port `onboarding-tour.js`

**10.4 Test coverage:**
- Target: 80% line coverage on store layer, 60% on page modules
- Integration test: quiz flow end-to-end
- Integration test: journal save + offline sync

**10.5 Performance audit:**
- Run Lighthouse against production build
- TOC: verify no per-item IDB reads
- Seasonal animations: pause when tab not visible

**10.6 Final CSS polish:**
- Remove all inline styles from page modules (moved to CSS modules)
- Verify dark mode in all pages
- Verify all 4 seasonal themes in all pages

### Deliverable
- All features working at pixel-perfect quality
- Keyboard accessible throughout
- Lighthouse: Performance 90+, Accessibility 95+, PWA 100%
- Test coverage report

---

## Migration Plan for Existing Users

No special migration is needed. The new app reads the same IndexedDB database:
- Same name: `spiritual-seasons-db`
- Same schema version: `1`
- Same store names and key paths

Users who open the new app while having data from the old app will see all their journal entries, progress, favorites, and settings exactly as they were.

**One exception:** If the new repo is deployed to a different domain (e.g. `spiritualseasons.app` instead of `github.io/Spiritual-Seasons`), the IndexedDB data is origin-scoped and won't transfer automatically. In this case, the old app should export data (Settings → Export) and the new app should import it (Settings → Import).

---

## GitHub Repository Setup Checklist

- [ ] Create new repo: `spiritual-seasons-v2` (or `Spiritual-Seasons` in the same org)
- [ ] Branch protection on `main`: require PR + review
- [ ] GitHub Pages: deploy from `main` branch, `dist/` folder (via GitHub Actions)
- [ ] GitHub Actions CI workflow:
  - `npm ci`
  - `npm run type-check` (TypeScript)
  - `npm test -- --run` (Vitest)
  - `npm run build`
  - Deploy to Pages
- [ ] Dependabot for npm updates
- [ ] Add `CODEOWNERS` if multiple developers

---

## Success Metrics

| Metric | Current | Target |
|---|---|---|
| Initial JS bundle | ~800 KB | <75 KB |
| Lighthouse Performance | ~70 | 90+ |
| Lighthouse Accessibility | ~75 | 95+ |
| Lighthouse PWA | 90 | 100 |
| TypeScript coverage | 0% | 100% |
| Test coverage (store layer) | 0% | 80% |
| CSS duplication (seasonal selectors) | ~60 selectors per effect | 1 selector per effect |
| Inline style blocks | ~143 | 0 |
| Responsive breakpoints implemented | 0 | 4 (480/768/1024/1280) |
| Desktop layout quality | Narrow column | Full 2-column layout |

---

*See `06-claude-new-repo-build-prompt.md` for the prompt to use when starting the new repo build.*
