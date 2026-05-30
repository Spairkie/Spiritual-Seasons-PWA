# New Architecture Plan — Spiritual Seasons PWA Rebuild

---

## Stack Decision

### Recommendation: Vite + Vanilla TypeScript + CSS Modules

**Why not React/Vue/Svelte:** The app is content-driven with mostly static rendering. The features that change state frequently (journal auto-save, progress tracking) are localized and don't benefit from a VDOM diffing strategy. React would add ~45 KB to the bundle for minimal benefit over well-structured vanilla JS.

**Why Vite:** Zero-config bundler, instant HMR, ES module output, built-in TypeScript support, Rollup under the hood for optimal code-splitting, handles the service worker build (via `vite-plugin-pwa`). Replaces the manual BUILD_TIME / STATIC_ASSETS maintenance.

**Why TypeScript:** The current `Store.js` is a black box — calling it wrong gives runtime errors with no feedback. TypeScript will catch `Store.getJournalEntry(undefined)` at compile time. Also enables IDE autocomplete for the content JSON shape and IndexedDB response types.

**Why CSS Modules:** Eliminates the class name collision problem and the "which file defines this class" ambiguity. The existing CSS design token system (in `variables.css`) is excellent and stays — only component-level styling moves to modules.

**Why not a CSS framework (Tailwind):** The existing design token system is already a Tailwind-equivalent in vanilla CSS. The seasonal variable system (`--season-primary`, `--season-light`, etc.) is elegant and framework-specific utility classes would fight it.

---

## Alternative: If You Prefer a Component Framework

If the team wants React for future flexibility (e.g. adding a chatbot companion, a social journal feature, or React Native mobile):

- **Stack:** Vite + React 18 + TypeScript + CSS Modules
- **State:** Zustand (3 KB, simpler than Redux, TypeScript-native)
- **Routing:** React Router v7 (file-based routing)
- **Trade-off:** +45 KB bundle, higher learning curve, but far easier to build complex interactive UIs

This plan is written for the vanilla TS path. A React path would use the same folder structure and CSS design, just replacing IIFE modules with React components.

---

## Project Structure

```
spiritual-seasons-v2/
├── index.html                    # Entry point — Vite injects bundle automatically
├── vite.config.ts                # Vite config + vite-plugin-pwa
├── tsconfig.json
├── package.json
│
├── public/                       # Static assets (copied as-is by Vite)
│   ├── manifest.webmanifest
│   ├── assets/
│   │   ├── icons/                # All icon PNGs + SVGs
│   │   └── images/               # book-cover.webp
│   └── content/                  # JSON loaded at runtime (not bundled)
│       ├── book.json
│       └── quiz.json
│
├── src/
│   ├── main.ts                   # App entry point (replaces app.js init block)
│   │
│   ├── config.ts                 # CONFIG object (typed, const-asserted)
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── book.ts               # DayEntry, Season, FrontMatter, BookData
│   │   ├── quiz.ts               # QuizQuestion, QuizResults, QuizSeason
│   │   ├── store.ts              # JournalEntry, Progress, Favorite, Settings, etc.
│   │   └── index.ts              # Re-exports all types
│   │
│   ├── store/                    # IndexedDB data layer
│   │   ├── db.ts                 # DB init, upgrade, connection pool
│   │   ├── journal.ts            # getJournalEntry, saveJournalEntry, getAllJournalEntries
│   │   ├── progress.ts           # getDayProgress, markDayComplete, getCompletedDaysCount
│   │   ├── favorites.ts          # toggleFavorite, getAllFavorites, updateFavoriteNote
│   │   ├── settings.ts           # getSetting, saveSetting, getSettings
│   │   ├── user.ts               # getCurrentDay, setCurrentDay, getQuizResults, saveQuizResults
│   │   ├── audio.ts              # getAudioNote, saveAudioNote, deleteAudioNote
│   │   ├── reflections.ts        # getWeeklyReflection, saveWeeklyReflection, getAllReflections
│   │   ├── streaks.ts            # getStreakData, updateStreakData, calculateStreak
│   │   └── index.ts              # Re-exports entire Store API (replaces store.js public API)
│   │
│   ├── router/
│   │   ├── router.ts             # Hash-based router (typed, same logic)
│   │   └── routes.ts             # Route definitions as typed constants
│   │
│   ├── content/
│   │   ├── loader.ts             # loadBookData(), loadQuizData() with caching
│   │   ├── devotional.ts         # getDay(), getSeasonForDay(), getSeasons(), etc.
│   │   └── quiz-engine.ts        # calculateResults(), handleTiebreaker()
│   │
│   ├── ui/                       # Reusable UI components (no framework)
│   │   ├── toast.ts              # Toast component (same logic, typed)
│   │   ├── modal.ts              # Modal component (same logic, typed + focus trap)
│   │   ├── theme-manager.ts      # Light/dark + season theme switching
│   │   └── icons.ts             # SVG icon registry (replaces Utils.getIcon())
│   │
│   ├── pages/                    # One file per route
│   │   ├── home.ts               # renderHome()
│   │   ├── intro.ts              # renderIntroPages()
│   │   ├── quiz.ts               # renderQuiz()
│   │   ├── devotional.ts         # renderDevotional()
│   │   ├── toc.ts                # renderTOC()
│   │   ├── search.ts             # renderSearch()
│   │   ├── favorites.ts          # renderFavorites()
│   │   ├── progress.ts           # renderProgress()
│   │   ├── reflections.ts        # renderReflections()
│   │   ├── privacy.ts            # renderPrivacy()
│   │   └── settings.ts           # renderSettings()
│   │
│   ├── features/                 # Self-contained feature modules
│   │   ├── tts.ts                # Text-to-speech
│   │   ├── audio-notes.ts        # Audio recording
│   │   ├── ambient-sound.ts      # Ambient soundscapes
│   │   ├── breathing.ts          # Guided breathing
│   │   ├── meditation-timer.ts   # Meditation countdown
│   │   ├── sharing.ts            # Web Share + clipboard
│   │   ├── verse-images.ts       # Canvas image generator
│   │   ├── notifications.ts      # Push notifications
│   │   ├── data-export.ts        # JSON/CSV/PDF export
│   │   ├── calendar.ts           # Calendar integration
│   │   └── onboarding.ts         # First-use tour
│   │
│   ├── utils/
│   │   ├── dom.ts                # createElement, clearElement, escapeHtml, showLoading
│   │   ├── date.ts               # formatDate, formatTimeAgo, getGreeting
│   │   ├── validation.ts         # validateDay, validateSetting
│   │   ├── sync-queue.ts         # Offline sync queue
│   │   └── keyboard.ts           # Keyboard shortcut registry
│   │
│   └── styles/
│       ├── base/
│       │   ├── variables.css     # Design tokens (unchanged from current)
│       │   ├── reset.css         # CSS reset (unchanged)
│       │   └── global.css        # Body, app shell, typography baseline
│       │
│       ├── layout/
│       │   ├── shell.css         # App shell (header, main, nav)
│       │   ├── page.css          # .page, .page-header, .page-content (deduplicated)
│       │   └── nav.css           # Bottom nav (mobile), sidebar nav (tablet+)
│       │
│       ├── seasonal/
│       │   ├── themes.css        # Season token application (same as variables.css seasonal section)
│       │   └── effects.css       # Seasonal backgrounds (greatly simplified — see below)
│       │
│       └── components/           # Component-level styles (CSS Modules)
│           ├── button.module.css
│           ├── card.module.css
│           ├── modal.module.css
│           ├── toast.module.css
│           ├── form.module.css
│           ├── devotional.module.css
│           ├── toc.module.css
│           ├── progress.module.css
│           └── ...
│
├── sw.ts                         # Service worker source (TypeScript, built by Workbox)
│
└── tests/
    ├── unit/
    │   ├── store/                # Unit tests for each store module
    │   ├── content/              # Tests for content helpers
    │   └── utils/                # Tests for utilities
    ├── integration/
    │   └── quiz-flow.test.ts     # Quiz → results → season saved flow
    └── setup.ts                  # Vitest setup (fake IndexedDB, etc.)
```

---

## Key Architecture Decisions

### 1. Store: Split the Monolith

The current `store.js` is 800+ lines with all 8 IndexedDB stores in one file. In the new codebase, each store domain gets its own module:

```typescript
// src/store/journal.ts
import { getDB } from './db';

export async function getJournalEntry(day: number): Promise<JournalEntry | null> {
  const db = await getDB();
  return db.get('journal', day);
}

export async function saveJournalEntry(
  day: number,
  content: string,
  season: SeasonId
): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  const existing = await db.get('journal', day);
  await db.put('journal', {
    day,
    content,
    season,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  });
}
```

Benefits:
- Smaller files, easier to test
- Tree-shakeable — the PDF export feature only imports `journal`, not all of `store.js`
- Type-safe: `JournalEntry` type is co-located with its operations

### 2. TypeScript Types for All Data

```typescript
// src/types/store.ts

export type SeasonId = 'winter' | 'spring' | 'summer' | 'autumn';

export interface JournalEntry {
  day: number;
  content: string;
  season: SeasonId;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
}

export interface Settings {
  darkMode: 'system' | 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  lineSpacing: 'compact' | 'normal' | 'relaxed' | 'loose';
  bibleTranslation: 'NLT' | 'NIV' | 'KJV' | 'NKJV' | 'ESV' | 'NASB' | 'MSG';
  seasonTheme: 'auto' | SeasonId;
  autoSave: boolean;
  ttsRate: number;
  notificationsEnabled: boolean;
  notificationTime: string;  // "HH:MM"
}

// src/types/book.ts

export interface DayEntry {
  day: number;
  scriptureRef: string;
  scriptureText: string;
  prompt: string;
}

export interface BookSeason {
  id: SeasonId;
  title: string;
  name: string;
  emoji: string;
  days: DayEntry[];
}
```

### 3. CSS: Eliminate the Selector Explosion

The current `seasonal.css` lists every page ID for every seasonal effect. The fix: apply seasonal backgrounds to `.app-main` and let child elements inherit via `color-mix`.

```css
/* NEW seasonal/effects.css — entire seasonal background in 4 rules */
.app-main {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--season-light) 20%, var(--bg-cream)),
    var(--bg-cream)
  );
  position: relative;
}

/* Winter only — snowfall on the scrollable content area */
[data-season="winter"] .app-main::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: /* snowflake dots */;
  animation: snowfall 20s linear infinite;
  pointer-events: none;
}
/* etc. for Spring, Summer, Autumn */
```

This reduces the selector count from ~60 selectors per seasonal effect to 1. Adding a new page requires no CSS changes.

### 4. No More Inline Styles

All layout logic moves to CSS classes:

```typescript
// Instead of this (current):
element.innerHTML = `<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px;">`;

// Do this (new):
const toolbar = document.createElement('div');
toolbar.className = styles.actionToolbar; // CSS Module class
```

```css
/* devotional.module.css */
.actionToolbar {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: var(--space-4);
}

@media (min-width: 768px) {
  .actionToolbar {
    justify-content: flex-start;
  }
}
```

### 5. Service Worker: Workbox Replaces Hand-Written SW

The current `sw.js` manually lists 66 assets in `STATIC_ASSETS`. Forgetting to update this when adding a new JS file causes the old cached file to be served.

Workbox with `vite-plugin-pwa` generates this list automatically at build time from the Vite manifest:

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts' }
          },
          {
            urlPattern: /content\/.*\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'content' }
          }
        ]
      }
    })
  ]
});
```

Benefits:
- `STATIC_ASSETS` maintained automatically — can never be stale
- `BUILD_TIME` not needed — Workbox generates a cache revision hash automatically
- Network-first for JSON content, cache-first for fonts and assets

### 6. Testing with Vitest + fake-indexeddb

```typescript
// tests/unit/store/journal.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getJournalEntry, saveJournalEntry } from '../../../src/store/journal';

describe('journal store', () => {
  beforeEach(async () => {
    // fake-indexeddb resets between tests
  });

  it('returns null for a day with no entry', async () => {
    const entry = await getJournalEntry(1);
    expect(entry).toBeNull();
  });

  it('saves and retrieves an entry', async () => {
    await saveJournalEntry(1, 'My reflection', 'winter');
    const entry = await getJournalEntry(1);
    expect(entry?.content).toBe('My reflection');
    expect(entry?.season).toBe('winter');
  });

  it('updates updatedAt when saving twice', async () => {
    await saveJournalEntry(1, 'First', 'winter');
    const first = await getJournalEntry(1);
    
    await saveJournalEntry(1, 'Second', 'winter');
    const second = await getJournalEntry(1);

    expect(second?.updatedAt).not.toBe(first?.updatedAt);
    expect(second?.createdAt).toBe(first?.createdAt);
  });
});
```

### 7. Eliminate globals: ES Module Imports

```typescript
// Current (global, implicit)
const dayData = Devotional.getDay(day);  // Where does Devotional come from?

// New (explicit imports)
import { getDay } from '../content/devotional';
const dayData = getDay(day);
```

---

## Routing Architecture

Keep hash-based routing (works with GitHub Pages, no server config needed):

```typescript
// src/router/routes.ts
export const ROUTES = {
  INTRO: 'intro',
  QUIZ: 'quiz',
  HOME: 'home',
  DEVOTIONAL: 'devotional',
  TOC: 'contents',
  SEARCH: 'search',
  FAVORITES: 'favorites',
  PROGRESS: 'progress',
  REFLECTIONS: 'reflections',
  PRIVACY: 'privacy',
  SETTINGS: 'settings',
} as const;

export type Route = typeof ROUTES[keyof typeof ROUTES];
```

```typescript
// src/router/router.ts
import type { Route } from './routes';
import { ROUTES } from './routes';

type RouteHandler = (params: RouteParams) => Promise<void>;

export class HashRouter {
  private routes = new Map<string, RouteHandler>();
  
  register(route: Route, handler: RouteHandler): void {
    this.routes.set(route, handler);
  }
  
  async navigate(route: Route, params: RouteParams = {}): Promise<void> {
    // ... same logic as current router, but typed
  }
}

export const router = new HashRouter();
```

---

## App Shell Architecture

Replace the single-page DOM replacement with a proper shell that doesn't re-render on init:

```html
<!-- index.html -->
<div id="app">
  <div id="splash" class="splash">...</div>
  <div id="shell" class="shell hidden">
    <header class="app-header">...</header>
    <main class="app-main" id="main-content">
      <!-- Pages rendered here by router -->
    </main>
    <nav class="bottom-nav" id="bottom-nav">...</nav>
    <aside class="sidebar-nav hidden" id="sidebar-nav">...</aside>
  </div>
</div>
```

```typescript
// src/main.ts
async function init() {
  await Store.init();
  await loadContent();
  
  renderShell();  // Renders header + nav once
  setupRoutes();  // Registers route handlers
  router.init();  // Navigates to current hash
  
  hideSplash();
}
```

This avoids the current pattern where `document.body.innerHTML` is overwritten during init, which causes the splash screen element to be destroyed before `window.load` fires.

---

## Data Migration

User data in IndexedDB is fully compatible between the old app and new app:
- DB name: `spiritual-seasons-db` — keep the same
- DB version: stays at `1`
- All 8 object stores: same names, same key paths, same data shapes
- No migration code needed

The only change: the new app uses ES module imports of store functions instead of `Store.functionName()` globals.

---

## Dependencies (Minimal)

| Package | Version | Purpose |
|---|---|---|
| `vite` | ^6.x | Build tool + dev server |
| `vite-plugin-pwa` | ^1.x | Workbox SW generation |
| `typescript` | ^5.x | Type checking |
| `idb` | ^8.x | IndexedDB wrapper (modern, typed) — replaces hand-written store.js |
| `jspdf` | ^2.5.1 | PDF export (same version, now proper import) |
| `vitest` | ^3.x | Testing |
| `fake-indexeddb` | ^6.x | Fake IDB for tests |
| `@vitest/coverage-v8` | ^3.x | Code coverage |

**No UI framework** (vanilla TS).  
**No CSS framework** (existing token system is the framework).  
**No state management library** (stores + module-level state is sufficient).

---

## Build Output

```
dist/
├── index.html                    # Entry with injected asset hashes
├── sw.js                         # Workbox-generated service worker
├── workbox-*.js                  # Workbox runtime
├── assets/
│   ├── main-[hash].js            # Main bundle (entry)
│   ├── home-[hash].js            # Home page chunk (lazy)
│   ├── devotional-[hash].js      # Devotional chunk (lazy)
│   ├── quiz-[hash].js            # Quiz chunk (lazy)
│   ├── settings-[hash].js        # Settings chunk (lazy + lower priority)
│   ├── pdf-export-[hash].js      # PDF export chunk (lazy, on-demand)
│   └── [hash].css                # All CSS bundled + minified
├── content/
│   ├── book.json                 # Served as-is
│   └── quiz.json
└── assets/
    ├── icons/                    # All icons
    └── images/                   # book cover
```

**Estimated bundle sizes:**
| Chunk | Target |
|---|---|
| Main (router + shell) | <20 KB |
| Home | <15 KB |
| Devotional | <25 KB |
| Quiz | <15 KB |
| Settings | <20 KB |
| PDF Export (lazy) | <380 KB (jsPDF) |
| Total initial JS | <75 KB |
| Current total JS | ~800 KB |

---

*See `05-rebuild-roadmap.md` for the phased plan.*
