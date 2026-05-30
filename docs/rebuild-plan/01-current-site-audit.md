# Current Site Audit — Spiritual Seasons PWA

**App:** Spiritual Seasons: Daily Devotional Workbook  
**Author:** Dr. Jacqueline Ghee, MSW, MPCC, DMIN  
**Version:** 1.0.1  
**Audit Date:** 2026-05-30  
**Auditor:** Claude (automated code analysis)

---

## 1. What This App Is

Spiritual Seasons is a 120-day personal devotional app. Users take a quiz to discover their "spiritual season" (Winter/Spring/Summer/Autumn), then work through 30 devotional entries per season. Each day presents a scripture reference, a scripture quote, and a reflection prompt. Users journal their responses, mark days complete, and track progress. The app works fully offline and stores all data locally in the browser.

The app is a companion to a physical book by Dr. Jacqueline Ghee. The PWA replaces a PDF and paper journal with an interactive, guided experience.

---

## 2. Technical Stack (Current)

| Layer | Technology | Notes |
|---|---|---|
| Language | Vanilla JavaScript (ES2020+) | No TypeScript |
| Build | None | Raw files served directly |
| Bundler | None | 28 synchronous `<script>` tags |
| Modules | IIFE pattern, global scope | `const App = (() => { ... })();` |
| Routing | Hash-based SPA | `window.location.hash`, custom Router IIFE |
| Data | IndexedDB | Custom Store wrapper, 8 object stores |
| Styling | Plain CSS with custom properties | 8 separate CSS files, load-order critical |
| PWA | Hand-written service worker | Cache-first, 66-file STATIC_ASSETS list |
| Fonts | Google Fonts (Cormorant Garamond + Source Sans 3) | Cached offline in SW |
| PDF | jsPDF 2.5.1 bundled locally | Loaded on-demand via dynamic `<script>` injection |
| Hosting | GitHub Pages (static) | Inferred from repo structure |
| Testing | None | Zero test coverage |
| CI | GitHub Actions (Netlify deploy preview) | Build is "just push" |

---

## 3. File Structure

```
Spiritual-Seasons-PWA/
├── index.html                     # Entry: CSP meta, 28 script tags, splash screen
├── manifest.webmanifest           # PWA manifest, 9 icon sizes
├── sw.js                          # Service worker (cache-first, 343 lines)
│
├── content/
│   ├── book.json                  # 66 KB — 120 devotional entries (4 seasons × 30 days)
│   └── quiz.json                  # 4.4 KB — Quiz data (4 seasons × 4-5 questions)
│
├── css/
│   ├── variables.css              # Design tokens: spacing, typography, colors, seasons
│   ├── reset.css                  # CSS reset/normalize
│   ├── layout.css                 # App shell, containers, grid, flex utilities
│   ├── components.css             # Buttons, cards, nav, modals, forms (~1400 lines)
│   ├── app.css                    # App-specific — currently contains only 1 comment
│   ├── seasonal.css               # Seasonal backgrounds, effects, animations
│   ├── utilities.css              # Functional utility classes
│   └── ui-polish.css              # Production polish: journal, TOC, progress, breathing
│
├── js/
│   ├── config.js                  # Frozen CONFIG object (routes, features, DB schema)
│   ├── utils.js                   # Shared utilities (DOM helpers, icons, validation)
│   ├── store.js                   # IndexedDB wrapper (all data operations)
│   ├── router.js                  # Hash-based SPA router (IIFE)
│   ├── app.js                     # Bootstrap: init, renderHome, renderFavorites, SW reg
│   │
│   ├── state-manager.js           # (Infrastructure) Simple publish/subscribe state
│   ├── event-manager.js           # (Infrastructure) Named event bus
│   ├── module-lifecycle.js        # (Infrastructure) Module init/destroy tracking
│   ├── blob-manager.js            # (Infrastructure) Blob URL lifecycle management
│   ├── undo-manager.js            # (Infrastructure) Undo/redo stack
│   ├── search-engine.js           # (Infrastructure) Full-text search engine
│   ├── sync-queue.js              # (Infrastructure) Offline-first sync queue
│   ├── loading-manager.js         # (Infrastructure) Loading state management
│   │
│   ├── ui/
│   │   ├── toast.js               # Toast notification component
│   │   ├── modal.js               # Modal dialog component
│   │   └── theme-manager.js       # Light/dark theme switching
│   │
│   ├── modules/
│   │   ├── error-handler.js       # Global error boundary + retry logic
│   │   ├── error-boundary.js      # Per-module error wrapping
│   │   ├── haptics.js             # Vibration API for mobile feedback
│   │   ├── keyboard-shortcuts.js  # Global keyboard shortcut registry
│   │   ├── tts.js                 # Text-to-speech (Web Speech API)
│   │   ├── ambient-sound.js       # Ambient soundscapes (8 presets: rain, ocean, etc.)
│   │   ├── audio.js               # Audio note recording (MediaRecorder API)
│   │   ├── intro-pages.js         # Multi-page introduction carousel
│   │   ├── quiz.js                # Season quiz (5-point Likert, tiebreaker)
│   │   ├── devotional.js          # Core: scripture, journal, TTS, sharing, complete
│   │   ├── toc.js                 # Table of contents (grid of 120 days)
│   │   ├── settings.js            # App preferences + data management
│   │   ├── notifications.js       # Daily reminder notifications (push/scheduled)
│   │   ├── sharing.js             # Web Share API + clipboard fallback
│   │   ├── progress.js            # Streak tracking, milestones, dashboard
│   │   ├── weekly-reflection.js   # Weekly guided reflection prompts
│   │   ├── search.js              # Full-text search UI + filter overlay
│   │   ├── privacy.js             # Data transparency + export/delete/reset
│   │   ├── verse-images.js        # Canvas-based shareable scripture image generator
│   │   ├── meditation-timer.js    # Countdown meditation timer (customizable)
│   │   ├── guided-breathing.js    # Guided breathing exercise (4-4-4-4 box pattern)
│   │   ├── calendar-integration.js # Google Calendar / ICS file integration
│   │   ├── onboarding-tour.js     # First-use walkthrough tour
│   │   ├── data-export.js         # Export: JSON backup, CSV, or PDF
│   │   ├── page-transitions.js    # Animated page transitions
│   │   └── pdf-export.js          # Journal-to-PDF export (jsPDF)
│   │
│   └── lib/
│       └── jspdf.umd.min.js       # jsPDF 2.5.1 (364 KB, bundled locally)
│
└── assets/
    ├── icons/
    │   ├── icon.svg               # Primary SVG icon
    │   ├── icon-simple.svg        # Simplified icon variant
    │   └── icon-{72,96,128,144,152,192,384,512}.png  # 8 raster icon sizes
    └── images/
        └── book-cover.webp        # Physical book cover image
```

---

## 4. JavaScript Architecture Analysis

### Module Loading

All 28 script tags are synchronous — the browser cannot parse the next tag until the previous script completes. On a slow 3G connection this could mean 2–3 seconds before the app renders, even with the service worker's cache.

The load order is critical and implicit:
```
1. Infrastructure (state-manager, event-manager, etc.)
2. Core (config, utils, store, router)
3. UI Components (toast, modal, theme-manager)
4. Feature Modules (26 modules, alphabetical within load-order constraints)
5. App (bootstrapper)
```

Any module loaded before `config.js` or `utils.js` will crash. There is no import system enforcing this — it's purely convention in the `<script>` order in `index.html`.

### Global Scope

Every module, UI component, and infrastructure class becomes a global variable:
```
App, Router, Store, CONFIG, Utils,
Devotional, Quiz, Settings, Progress, Search, TOC, WeeklyReflection,
Toast, Modal, ThemeManager,
TTS, AudioNotes, AmbientSound, Sharing, VerseImages,
MeditationTimer, GuidedBreathing, CalendarIntegration,
OnboardingTour, DataExport, PDFExport, Notifications,
ErrorHandler, ErrorBoundary, Haptics, KeyboardShortcuts,
IntroPages, Privacy, PageTransitions,
StateManager, EventManager, ModuleLifecycle, BlobManager,
UndoManager, SearchEngine, SyncQueue, LoadingManager
```

This is approximately **40 globals** in `window`. Any name collision with a browser API or future standard (e.g. `Search`, `Modal`, `Audio`) would silently break the app.

### State Management

There is no central state store. State lives in three places simultaneously:
1. **IndexedDB** — authoritative persistence (journal, progress, favorites, settings, etc.)
2. **Module-local variables** — e.g. `Devotional.bookData`, `Quiz.quizData`
3. **DOM** — the actual rendered UI (buttons' `aria-pressed`, textarea values)

The `StateManager` infrastructure file exists but is not used by any feature module.

### Routing

The custom Router IIFE:
- Registers route handlers via `Router.register(path, asyncFn)`
- Listens to `popstate` and `hashchange` events
- Hides/shows `#page-{routeName}` elements (they all exist in the DOM simultaneously)
- Calls `updateNav()` to toggle `.active` on bottom nav items
- Scrolls `.app-main` to top on each navigation

URL format: `#routename/day?queryparams` (e.g. `#devotional/42`)

### App Bootstrap Sequence

```
DOMContentLoaded
  → App.init()
  → ErrorHandler.init()
  → StateManager.init()
  → BlobManager.setupAutoCleanup()
  → SyncQueue.init() + registerHandlers()
  → Store.init() (opens IndexedDB)
  → ThemeManager.init()
  → loadData() (fetches book.json + quiz.json in parallel)
  → TTS.init(), AmbientSound.init(), Quiz.init(), Devotional.init(), ...
  → Settings.applySettings()
  → renderAppShell() (replaces document.body innerHTML)
  → setupRoutes() (registers all route handlers)
  → Router.init() (navigates to current hash or default)
  → OnboardingTour.showTourPrompt() (after 1 second delay)

window.load (concurrent)
  → splash screen fade-out (800ms delay)
  → ServiceWorker registration
```

Note: `document.body.innerHTML` is completely replaced during bootstrap. The `index.html` body is a loading spinner that becomes the full app shell.

---

## 5. CSS Architecture Analysis

### The 8-File System

Load order matters — each file depends on the previous:

| File | Purpose | Issues |
|---|---|---|
| `variables.css` | Design tokens (spacing, type, color, season tokens) | Well-structured, clean |
| `reset.css` | CSS normalize | Standard, fine |
| `layout.css` | App shell, containers, flex/grid utilities | Duplicates `components.css` definitions |
| `components.css` | Buttons, cards, nav, forms, modals (~1400 lines) | Duplicates layout.css definitions |
| `app.css` | App-specific overrides | **Empty** — just a comment |
| `seasonal.css` | Season backgrounds and animations | **Extreme duplication** (see below) |
| `utilities.css` | Helper classes | Fine |
| `ui-polish.css` | Production polish | Handles edge cases well |

### Major CSS Problems

**Problem 1: Definition duplication between layout.css and components.css**

Both files define `.page-content`, `.page-header`, `.page-title`, `.page-subtitle`, `.app-main`, and `.app-shell`. The `components.css` definitions override `layout.css`. A developer editing the wrong file will see no change.

**Problem 2: seasonal.css selector explosion**

Every seasonal effect is applied to every page by listing every page ID. Winter snowflakes alone require:
```css
[data-season="winter"] .season-bg::before,
[data-season="winter"] #page-home::before,
[data-season="winter"] #page-devotional::before,
[data-season="winter"] #page-contents::before,
[data-season="winter"] #page-progress::before,
[data-season="winter"] #page-favorites::before,
[data-season="winter"] #page-reflections::before,
[data-season="winter"] #page-intro::before,
[data-season="winter"] #page-search::before,
[data-season="winter"] #page-settings::before,
[data-season="winter"] #page-privacy::before { ... }
```

Then this same selector block is repeated for Spring, Summer, Autumn, and then for dark mode variants. The file is 526 lines primarily because of this repetition. Adding a new page requires editing 12+ selector lists.

**Problem 3: No responsive design for tablets/desktop**

The CSS was designed mobile-first but stops at mobile. The app has:
- `--container-max: 48rem` (768px) — the content column never gets wider than this
- On a 1920px monitor, users see a narrow 768px-wide column centered on a white/cream background with empty space on both sides
- No tablet layout (e.g. side-by-side journal + scripture on iPad landscape)
- Bottom navigation doesn't adapt to wider screens (sidebar is never considered)
- The 3 defined breakpoints (`640px`, `768px`, `1024px`) are used only for utility classes, not for actual page layout

**Problem 4: Inline styles throughout generated HTML**

Roughly 40% of the app's visual styling is applied as `style=""` attributes on dynamically generated HTML strings inside JS modules. For example, `devotional.js` renders:
```js
`<div style="margin-top: var(--space-4); display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: center;">`
```

This makes it impossible to override styles in CSS, creates inconsistency, and prevents dark mode/responsive overrides from working correctly.

**Problem 5: `color-mix()` without fallback**

`color-mix(in srgb, ...)` is used in `variables.css` (shadow-season, focus-ring) and `seasonal.css`. This is a modern CSS feature (Chrome 111+, Safari 16.2+, Firefox 113+). Users on older browsers get broken shadow/focus-ring styles with no fallback.

### Responsive Breakpoints (Current)

| Breakpoint | Value | Usage |
|---|---|---|
| Small | `640px` | Grid utility classes only |
| Medium | `768px` | Grid utility classes only |
| Large | `1024px` | Grid utility classes only |

No breakpoints are used for actual layout changes — the app looks identical at 320px and 1920px (just centered in a narrower column on desktop).

---

## 6. Data Architecture

### IndexedDB Schema (DB_VERSION = 1)

| Store | Key | Value Shape | Notes |
|---|---|---|---|
| `user` | `'user'` | `{ quizResults, seasonId, startDate, currentDay }` | Single user object |
| `journal` | `day` (number) | `{ day, content, createdAt, updatedAt, season }` | One entry per day |
| `progress` | `day` (number) | `{ day, completed, completedAt, season }` | One per day |
| `favorites` | `day` (number) | `{ day, season, scriptureRef, note, savedAt }` | One per day |
| `settings` | `key` (string) | `value` (any) | Key-value store |
| `audioNotes` | `day` (number) | `{ day, blob, mimeType, duration, createdAt }` | Audio recording per day |
| `weeklyReflections` | `week` (number) | `{ week, responses: string[], updatedAt }` | One per week (1–17) |
| `streaks` | `'streaks'` | `{ currentStreak, longestStreak, lastCompletedDate, milestones }` | Single object |

### Content JSON Schema

**book.json (66 KB)**
```json
{
  "title": "Spiritual Seasons",
  "subtitle": "...",
  "author": "Dr. Jacqueline Ghee",
  "description": "...",
  "acknowledgements": "...",
  "aboutAuthor": "...",
  "frontMatter": {
    "introduction": { "text": "...", "scripture": "..." },
    "howToUse": { "steps": ["..."] }
  },
  "seasons": [
    {
      "id": "winter",
      "days": [
        {
          "day": 1,
          "scriptureRef": "Psalm 46:10",
          "scriptureText": "Be still...",
          "prompt": "Where do I need to release control...",
          "pdfPage": 1
        }
      ]
    }
  ],
  "seasonalOverviews": { ... }
}
```

The `pdfPage` field is vestigial — it references the physical book's page numbers, which are not used by the app.

**quiz.json (4.4 KB)**
- 4 seasons × 4–5 questions = ~20 questions total
- Each question uses a 1–5 Likert scale
- Scoring: sum each season's scores, highest wins; ties prompt user choice

---

## 7. Accessibility Audit

### What Works

- Bottom nav: `role="navigation"`, `aria-label="Main navigation"`, `aria-current="page"` updated dynamically
- Quiz: ARIA radio group pattern (`role="radiogroup"`, `role="radio"`, `aria-checked`, roving tabindex, arrow key navigation) — fixed in PR #13
- Mark Complete button: `aria-pressed` updated dynamically
- All icon buttons have `aria-label`
- Modals: use Modal component with focus management
- `<noscript>` fallback present
- Error boundaries render accessible error messages

### What Is Missing

- **Focus visible styles**: The CSS reset removes browser outline but `ui-polish.css` and `components.css` don't restore a consistent focus indicator for keyboard users
- **Skip link**: No "skip to main content" link for screen reader / keyboard users
- **Devotional page headings**: The scripture reference is an `<h2>` but the day number badge above it is a `<div>` — the heading hierarchy is not always logical
- **TOC grid**: 120 buttons in a grid with no grouping by season, no `aria-label` per button beyond the day number
- **Progress dashboard**: Charts/rings rendered as SVG with no text fallback data
- **Textarea labels**: The journal textarea has `aria-label="Journal entry"` but no visible `<label>` element
- **Ambient sound panel**: Generated in a Modal with buttons but no current-playing state announced to screen readers
- **Weekly reflection**: Form inputs have IDs but the label association logic isn't always present

---

## 8. Performance Audit

### Loading Performance

| Metric | Current | Target |
|---|---|---|
| Script load (28 files) | ~10 HTTP requests (with SW cache) | 1–2 bundles |
| JavaScript total | ~800 KB (including jsPDF 364 KB) | <200 KB initial |
| book.json | 66 KB (loaded upfront) | Could be deferred |
| quiz.json | 4.4 KB | Fine |
| CSS total | ~6 files, ~100 KB | Fine after dedup |
| Fonts | Google Fonts (cached offline) | Fine |

**Critical path:** `DOMContentLoaded` fires only after all 28 synchronous scripts parse. On a cold load without service worker, this means fetching 28 JS files sequentially. The service worker helps on repeat visits but first-load is slow.

### Runtime Performance

- **`color-mix()` animations**: The `snowfall` and `sunGlow` animations in `seasonal.css` run continuously, even when the user is not looking at the screen. No `IntersectionObserver` pauses them.
- **TOC rendering**: Renders 120 buttons in a single synchronous pass with 3 IDB reads per button (progress, journal, favorites) in a `for...of` loop. With 120 days this is up to 360 sequential IDB reads.
- **Search**: Scans all content synchronously without Web Worker offloading.
- **No virtualization**: The TOC lists all 120 days at once with no virtual scrolling.

### PWA Score

| Area | Status |
|---|---|
| Service Worker | ✅ Registered, cache-first |
| Manifest | ✅ Complete with 9 icon sizes |
| Offline support | ✅ All assets in STATIC_ASSETS |
| HTTPS | ✅ GitHub Pages enforces HTTPS |
| Install prompt | ✅ Handled via beforeinstallprompt |
| Push notifications | ✅ Implemented (requires permission) |
| App shortcuts | ✅ 2 shortcuts defined in manifest |

---

## 9. Security Audit

### Current State (Post-Fixes)

| Area | Status | Notes |
|---|---|---|
| CSP | ✅ Strict | `script-src 'self'` only after PR #13 |
| XSS | ✅ Protected | `Utils.escapeHtml()` used throughout generated HTML |
| External scripts | ✅ Removed | jsPDF now bundled locally |
| IndexedDB | ✅ No injection risk | All structured data |
| Data transmission | ✅ None | No server, no API calls |
| Inline handlers | ✅ Removed | PR #13 converted all `onclick=""` to delegated listeners |

### Remaining Concern

**Ambient sound panel** (in `app.js` `showAmbientSoundPanel()`): Uses a template literal with `oninput="this.nextElementSibling.textContent = this.value + '%'"` inline handler on the volume slider. This is the last remaining `oninput` inline handler and conflicts with the strict CSP (though it works because it's native `oninput` attribute on an element, not `eval` — still worth cleaning up).

---

## 10. Honest Problems Summary

Ranked by rebuild priority:

### P0 — Architecture (blocks scalability)

1. **No module system**: 28 synchronous script tags, 40+ globals. Adding any new feature risks name collision. Impossible to tree-shake unused code.
2. **All-at-once loading**: 800 KB of JS loads before any UI renders on first visit.
3. **Zero tests**: No unit tests, no integration tests. Every change is a manual test.
4. **No TypeScript**: Store API is a black box. Function signatures are undocumented and easy to call wrong.

### P1 — CSS (blocks maintainability)

5. **CSS selector explosion in seasonal.css**: Adding a new page requires editing 12+ selector lists. The file will never shrink as the app grows.
6. **Inline styles in JS**: ~40% of styles are `style=""` attributes in JS string templates. Impossible to override responsively.
7. **Definition conflicts**: `layout.css` and `components.css` both define the same class names. The later file wins silently.
8. **No desktop layout**: On screens wider than 768px, the app is a narrow centered column with unused white space on both sides.

### P2 — UX (blocks user experience)

9. **No responsive tablet view**: iPad landscape has the same layout as a phone.
10. **TOC performance**: 120 days × 3 IDB reads = potential 360 sequential async operations before TOC renders.
11. **No focus visible styles**: Keyboard-only navigation has no visible focus indicator on interactive elements.
12. **Missing skip link**: Screen readers start from the app header on every navigation.

### P3 — Developer Experience (blocks team growth)

13. **Manual service worker maintenance**: `BUILD_TIME` and `STATIC_ASSETS` must be hand-updated on every deployment. Forgetting either causes stale caches.
14. **Empty `app.css`**: The designated file for app-specific styles is unused, causing styles to scatter across `components.css`, `ui-polish.css`, and inline JS.
15. **`pdfPage` field**: Vestigial data in `book.json` for physical book page numbers that the app never uses.

---

*See `02-feature-and-page-inventory.md` for the complete feature list.*
