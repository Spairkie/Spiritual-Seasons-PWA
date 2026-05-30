# Claude Prompt: Build the New Spiritual Seasons PWA

This document contains the complete briefing prompt to give Claude (or another AI coding assistant) when starting the rebuild in a new repository. Copy this entire prompt and paste it as the first message.

---

## THE PROMPT

You are building a complete rebuild of the Spiritual Seasons PWA from scratch. This is a 120-day Christian devotional Progressive Web App by Dr. Jacqueline Ghee. The app helps users discover their "spiritual season" (Winter/Spring/Summer/Autumn) through a quiz, then guides them through 30 daily devotional entries per season. Users journal their reflections, track progress, and access wellness tools.

---

## WHAT YOU ARE BUILDING

A **Vite + vanilla TypeScript + CSS Modules** Progressive Web App with:
- No UI framework (vanilla TypeScript DOM manipulation)
- No CSS framework (custom design token system)
- **idb** library for IndexedDB
- **vite-plugin-pwa** with Workbox for service worker
- **Vitest** for testing with **fake-indexeddb**
- **jsPDF** for PDF export (imported properly, not injected via dynamic script)

---

## CRITICAL CONSTRAINTS

1. **IndexedDB compatibility**: The new app MUST use the exact same IndexedDB schema as the original (DB name: `spiritual-seasons-db`, version: `1`). Existing users' data will be automatically carried over. Do NOT change DB_VERSION. Do NOT rename any object store.

2. **Content preservation**: `book.json` and `quiz.json` are unchanged — they contain the spiritual content written by Dr. Jacqueline Ghee and must not be modified.

3. **Feature parity**: Every feature in the original app must exist in the new app:
   - Season quiz with Likert scale + tiebreaker
   - Daily devotionals with journal (text + audio)
   - Auto-save (debounced 2s) + manual save option
   - Mark day complete → advances to next day → shows completion card
   - Favorites with personal notes
   - Table of contents (all 120 days with completion/favorite/journal/audio indicators)
   - Full-text search with filters
   - Progress dashboard with streaks, milestones, season rings
   - Weekly guided reflections
   - Text-to-speech (Web Speech API)
   - Ambient soundscapes (8 presets)
   - Guided breathing (box pattern 4-4-4-4)
   - Meditation timer
   - Web Share API + clipboard fallback
   - Canvas-based shareable verse image generator
   - PDF journal export (jsPDF)
   - JSON/CSV data export + import
   - Settings: dark mode, font size, line spacing, bible translation, season colors, auto-save, notifications
   - Push notifications
   - Offline support (service worker)
   - PWA installable

4. **No breaking changes to UX**: Users upgrading from the old app should recognize the interface. Keep the same design aesthetic — seasonal color themes, Cormorant Garamond display font + Source Sans 3 body font, cream/warm backgrounds.

---

## DESIGN SYSTEM (KEEP EXACTLY)

Copy these CSS files exactly from the original repository:
- `css/variables.css` — All design tokens (spacing, typography, colors, seasonal tokens)
- `css/reset.css` — CSS reset

The design token system in `variables.css` is the foundation. Never use hardcoded pixel values or hex colors in CSS — always use tokens (`var(--space-4)`, `var(--season-primary)`, etc.).

**Seasonal theming:** Apply seasonal backgrounds to `.app-main` (not per-page IDs):
```css
/* New approach — single selector, not 11 selectors per season */
[data-season="winter"] .app-main::before { /* snowfall */ }
[data-season="spring"] .app-main::before { /* bloom */ }
[data-season="summer"] .app-main::before { /* sun glow */ }
[data-season="autumn"] .app-main::before { /* warm gradient */ }
```

---

## RESPONSIVE DESIGN REQUIREMENTS

The original app has NO responsive layout above 480px. The rebuild must fix this:

**Navigation:**
- `< 768px`: Bottom navigation bar (5 items: Home, Read, Contents, Progress, Settings)
- `768px+`: Sidebar navigation OR top navigation (replace bottom nav)

**Devotional page at `768px+`:**
- Left column (40%): Scripture reference, scripture quote, reflection prompt, action buttons
- Right column (60%): Journal textarea, audio controls, navigation footer

**Home page at `768px+`:**
- Left (55%): Today's card (scripture preview + progress bar + CTA)
- Right (45%): Wellness tools grid + anchor quote

**Table of Contents at `768px+`:**
- Sticky season headers
- 4–5 columns per season grid
- "Completed / Favorite / Journaled / Audio" indicators remain

**Progress page at `1024px+`:**
- Row 1: Overall stats (3 cards side by side)
- Row 2: Season rings (4 rings side by side, not stacked)

**Settings at `1024px+`:**
- Left column: Display & Reading + Notifications
- Right column: Data Management + About

**Breakpoints to use:**
```css
/* Mobile base (no query) */
/* Large phone */
@media (min-width: 480px) { ... }
/* Tablet portrait */
@media (min-width: 768px) { ... }
/* Desktop / tablet landscape */
@media (min-width: 1024px) { ... }
/* Wide desktop */
@media (min-width: 1280px) { ... }
```

---

## INDEXEDDB SCHEMA (MUST MATCH EXACTLY)

```typescript
// DB name: 'spiritual-seasons-db', version: 1

interface DBSchema {
  user: {
    key: string;          // 'user' (single record)
    value: {
      quizResults: QuizResults | null;
      seasonId: SeasonId | null;
      startDate: string | null;
      currentDay: number;
    };
  };
  journal: {
    key: number;          // day number (1–120)
    value: {
      day: number;
      content: string;
      createdAt: string;  // ISO 8601
      updatedAt: string;  // ISO 8601
      season: SeasonId;
    };
  };
  progress: {
    key: number;          // day number (1–120)
    value: {
      day: number;
      completed: boolean;
      completedAt: string | null;
      season: SeasonId;
    };
  };
  favorites: {
    key: number;          // day number (1–120)
    value: {
      day: number;
      season: SeasonId;
      scriptureRef: string;
      note: string;
      savedAt: string;
    };
  };
  settings: {
    key: string;          // setting key name
    value: unknown;       // setting value
  };
  audioNotes: {
    key: number;          // day number (1–120)
    value: {
      day: number;
      blob: Blob;
      mimeType: string;
      duration: number;
      createdAt: string;
    };
  };
  weeklyReflections: {
    key: number;          // week number (1–17)
    value: {
      week: number;
      responses: string[];
      updatedAt: string;
    };
  };
  streaks: {
    key: string;          // 'streaks' (single record)
    value: {
      currentStreak: number;
      longestStreak: number;
      lastCompletedDate: string | null;
      milestones: number[];
    };
  };
}
```

---

## CONTENT STRUCTURE (DO NOT CHANGE)

**`book.json` top-level shape:**
```typescript
interface BookData {
  title: string;
  subtitle: string;
  author: string;
  description: string;
  acknowledgements: string;
  aboutAuthor: string;
  frontMatter: {
    introduction: { text: string; scripture: string };
    howToUse: { steps: string[] };
  };
  seasons: Array<{
    id: 'winter' | 'spring' | 'summer' | 'autumn';
    title: string;
    name: string;
    emoji: string;
    days: Array<{
      day: number;             // 1–120
      scriptureRef: string;
      scriptureText: string;
      prompt: string;
      pdfPage: number;         // vestigial, ignore
    }>;
  }>;
  seasonalOverviews: Record<string, unknown>;
}
```

**Season day ranges:**
- Winter: days 1–30
- Spring: days 31–60
- Summer: days 61–90
- Autumn: days 91–120

**`quiz.json` top-level shape:**
```typescript
interface QuizData {
  title: string;
  description: string;
  instructions: string;
  scale: { min: 1; max: 5; labels: Record<string, string> };
  rules: { minScore: 4; maxScore: 20; winnerLogic: string; tieBehavior: string };
  seasons: Array<{
    id: 'winter' | 'spring' | 'summer' | 'autumn';
    title: string;
    shortTitle: string;
    description: string;
    questions: Array<{ id: string; text: string }>;
  }>;
  results: Record<SeasonId, { title: string; message: string; encouragement: string }>;
}
```

---

## ROUTES

Use hash-based routing (required for GitHub Pages compatibility — no server-side routing):

```
#intro              → Introduction pages (sub-pages via ?page=...)
#quiz               → Season identification quiz
#home               → Dashboard (default after quiz)
#devotional/{day}   → Daily reading (e.g. #devotional/1)
#contents           → Table of contents (all 120 days)
#search             → Full-text search
#favorites          → Saved devotionals
#progress           → Streak + milestone dashboard
#reflections        → Weekly reflection prompts
#privacy            → Data management
#settings           → App preferences
```

---

## KEY BEHAVIORS TO IMPLEMENT EXACTLY

### 1. Mark Complete Flow
```
User taps "Mark Complete"
→ Store.markDayComplete(day, season)
→ Store.updateStreak()
→ nextDay = Math.min(day + 1, 120)
→ Store.setCurrentDay(nextDay)
→ Update button to "Completed" (aria-pressed="true")
→ Show completion card:
   - Normal day: "Continue to Day N+1 →"
   - Day 30/60/90: "Season Complete" + next season description + "Begin [Season] →"
   - Day 120: "Journey Complete!" + "View My Journey" + "Export My Journal"
```

### 2. Quiz Tiebreaker
```
If two seasons have equal highest score
→ Show tiebreaker screen
→ Present both tied seasons with descriptions
→ User selects one
→ Save that season as result
→ (MUST be awaited before navigating away)
```

### 3. Season Navigation at Day Boundaries
```
On devotional day 30, 60, or 90:
"Next Day" button label = "Spring Season →" / "Summer Season →" / "Autumn Season →"
Clicking navigates to: #intro?page=[next-season-id]
(NOT directly to #devotional/31 — user sees the season intro first)
```

### 4. Bible Gateway Links
```
Always use the user's saved Bible translation setting:
const translation = await getSetting('bibleTranslation') || 'NLT';
href = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=${translation}`
```

### 5. Auto-Save with Race Condition Protection
```
Journal textarea 'input' event
→ If autoSave === false: do nothing (show manual save button)
→ If autoSave === true:
   → Show "Saving..." indicator
   → debounce 2000ms
   → queue save (if one in progress, it will pick up latest data on completion)
   → After save: show "Saved" indicator for 3s
```

### 6. Search Filter Performance
```
When any filter is active:
1. Batch load all data ONCE: journals, progress, favorites, audioNotes
2. Build Sets: journalDays, completedDays, favoriteDays, audioDays
3. Filter results synchronously against Sets (no per-item async reads)
```

### 7. First-Time User Routing
```
If Store.getQuizResults() returns null:
  → Default route = 'intro'
Else:
  → Default route = 'home'
```

---

## ACCESSIBILITY REQUIREMENTS

All of these are required (some were missing in the original):

- **Skip link**: `<a href="#main-content" class="skip-link">Skip to content</a>` as first DOM element
- **Focus visible**: All interactive elements must have visible focus ring using `var(--season-primary)` color
- **Quiz ARIA**: `role="radiogroup"`, `role="radio"`, `aria-checked`, roving `tabindex`, arrow key navigation
- **Mark Complete**: `aria-pressed="true/false"` toggled dynamically
- **Bottom nav**: `role="navigation"`, `aria-label="Main navigation"`, `aria-current="page"` on active item
- **Journal textarea**: Associated `<label>` with visible text (not just `aria-label`)
- **Modals**: Focus trap (Tab/Shift+Tab), return focus to trigger on close, `role="dialog"`, `aria-labelledby`
- **TOC**: Season section headers as `<h2>`, day buttons with descriptive `aria-label="Day N: [Scripture Ref]"`
- **Reduce motion**: `@media (prefers-reduced-motion: reduce)` disables snowfall, sun glow animations

---

## FILE NAMING AND CODE STYLE

- **TypeScript only** — no `.js` files in `src/`
- **No `any` types** — use `unknown` and narrow with type guards
- **No `!` non-null assertions** — handle null/undefined explicitly
- **No inline styles** — ALL styles in `.module.css` files or global CSS files
- **No HTML string templates** with `innerHTML` for interactive elements — use `document.createElement` + event listeners
- **Exception:** For non-interactive display content (scripture text, dates), `innerHTML` with `escapeHtml()` is acceptable
- **ES modules only** — `import`/`export`, never globals
- **Async/await throughout** — no `.then()` chains
- **Comments only for WHY** — never comment what the code does, only non-obvious decisions

---

## STARTING POINT

Begin with Phase 0 from `05-rebuild-roadmap.md`:

1. `npm create vite@latest spiritual-seasons-v2 -- --template vanilla-ts`
2. Install dependencies (idb, vite-plugin-pwa, jspdf, vitest, fake-indexeddb)
3. Copy `content/`, `assets/`, `manifest.webmanifest` to `public/`
4. Copy `css/variables.css` and `css/reset.css` to `src/styles/base/`
5. Write TypeScript types in `src/types/` (book.ts, quiz.ts, store.ts)
6. Then proceed to Phase 1: the IndexedDB store layer

Tell me when Phase 0 is complete and I'll confirm before we move to Phase 1.

---

## REFERENCE REPOSITORY

The original codebase is at `spairkie/spiritual-seasons-pwa`. Read it freely for:
- Exact feature behavior
- Specific UI strings and labels (do not change Dr. Ghee's content)
- CSS component styles to port
- Module logic to adapt

Do NOT copy the following (these are problems to fix):
- Inline `style=""` attributes in JS-generated HTML
- Global scope `const ModuleName = (() => { ... })();` IIFE pattern
- `seasonal.css` selector explosion (repeated per-page IDs)
- Manual `STATIC_ASSETS` array in service worker
- Missing responsive layouts

---

*End of prompt. Everything above this line is the briefing for the new repo build.*
