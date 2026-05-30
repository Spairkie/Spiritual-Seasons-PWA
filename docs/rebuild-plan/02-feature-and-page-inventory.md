# Feature & Page Inventory — Spiritual Seasons PWA

---

## Routes / Pages

The app has 11 registered routes. All pages exist in the DOM simultaneously as hidden `<div>` elements; only the active route's `#page-{name}` is shown.

---

### Route: `intro`

**URL:** `#intro` / `#intro?page=winter` etc.  
**File:** `js/modules/intro-pages.js`  
**Purpose:** Multi-page introductory carousel before the user starts reading.

**Sub-pages (rendered within the route):**

| Page ID | Content |
|---|---|
| `toc` | Introduction table of contents — links to each intro section |
| `welcome` | App welcome / overview |
| `author` | About Dr. Jacqueline Ghee |
| `how-to-use` | Step-by-step guide for using the app |
| `winter` | Season overview: "Stillness & Trust" |
| `spring` | Season overview: "Renewal & Planting" |
| `summer` | Season overview: "Abundance & Joy" |
| `autumn` | Season overview: "Harvest & Letting Go" |
| `seasonal-overviews` | All 4 seasons briefly summarized |

Navigation: Previous/Next buttons within the intro pages. At season boundary days (30, 60, 90), the "Next Day" button on the devotional navigates to the next season's intro page.

**Data source:** `book.json` → `frontMatter.introduction`, `book.json` → `seasonalOverviews`

---

### Route: `quiz`

**URL:** `#quiz`  
**File:** `js/modules/quiz.js`  
**Purpose:** Season identification quiz. User scores themselves on 5 Likert-scale questions per season (4 seasons × 4–5 questions), then sees their result.

**Flow:**
1. Welcome screen — describes the quiz
2. Questions screen — one season at a time, 5 questions, 1–5 scale
3. Tiebreaker screen — if two seasons tie, user picks their strongest resonance
4. Results screen — season name, description, encouragement quote, CTA to begin

**Data stored:** `Store.saveQuizResults()` → `user` store → triggers current day initialization  
**ARIA:** Full radio group pattern (`role="radiogroup"`, `role="radio"`, `aria-checked`, arrow key navigation)

---

### Route: `home`

**URL:** `#home`  
**File:** `js/app.js` → `renderHome()`  
**Purpose:** Dashboard / landing screen after quiz completion.

**Sections:**
1. **Greeting** — Time-based greeting ("Good morning", etc.) + today's date
2. **Season badge** — Current season emoji + name
3. **Today's devotional card:**
   - `Day N of 120` + `Day N of 30 in [Season]` dual progress labels
   - Compact progress bar (% of 120 days complete)
   - Scripture reference and quote preview
   - "Last journaled X ago" note if journal entry exists
   - `Read Day N →` CTA button
4. **Quick Wellness Tools grid:**
   - 5-min Meditation Timer (opens MeditationTimer modal)
   - Breathe (opens GuidedBreathing modal)
   - Ambient Sounds (opens AmbientSound panel)
   - Favorites (navigates to #favorites)
5. **Daily anchor quote** — "Be still and know that I am God" — Psalm 46:10 (static)

**Data loaded:** `currentDay`, `completedCount`, `streak`, `weekProgress`, `journalEntry` (parallel IDB reads)

---

### Route: `devotional`

**URL:** `#devotional` / `#devotional/{day}`  
**File:** `js/modules/devotional.js`  
**Purpose:** Core reading experience — the primary feature of the app.

**Sections:**
1. **Day badge** — `[Season Name] • Day N of 30`
2. **Scripture reference** — Book, chapter, verse (display font, large)
3. **Scripture quote** — Italic quote text
4. **Action toolbar:**
   - "Listen" button (TTS via Web Speech API)
   - "Read Full Chapter" link (Bible Gateway, opens in new tab, uses saved Bible translation)
5. **Today's Reflection prompt** — The day's journaling prompt
6. **Journal section:**
   - Textarea with auto-save (debounced 2s) or manual save button
   - Word count + character count (live)
   - Save indicator with "Saved / Saving..." states
   - Last-saved time ("X seconds ago")
7. **Audio recording** (if supported) — Record, play back, and delete audio journal notes
8. **Share toolbar:**
   - "Share Verse" (Web Share API or clipboard fallback)
   - "Create Shareable Image" (canvas-generated image via VerseImages module)
9. **Navigation footer:**
   - Previous Day button (disabled on day 1)
   - Favorite toggle button (filled/unfilled heart icon, `aria-label` updates)
   - Mark Complete button (`aria-pressed`)
   - Next Day button (at season ends: "Spring Season →" / "Summer Season →" etc.)
10. **Completion card** (shown after marking complete):
    - Normal: "Continue to Day N →"
    - Season end: "Season Complete" + next season description + "Begin [Season] Season →"
    - Day 120: "Journey Complete!" + "View My Journey" + "Export My Journal"

**Data loaded (parallel):** `journalEntry`, `progress`, `isFavorite`, `bibleTranslation`, `autoSave`

---

### Route: `contents`

**URL:** `#contents`  
**File:** `js/modules/toc.js`  
**Purpose:** Table of contents — browse all 120 devotionals.

**Layout:**
- 4 season sections (Winter / Spring / Summer / Autumn)
- Each section shows 30 day buttons in a responsive grid
- Each day button shows: day number, scripture reference
- Indicators: ✓ completed, ♥ favorited, ✎ has journal entry, 🎙 has audio note
- Current day highlighted with 2px border + glow ring
- Clicking a day navigates to `#devotional/{day}`

**Data loaded (per day):** `progress`, `journalEntries`, `favorites`, `audioNotes` (bulk fetch, then keyed)

---

### Route: `search`

**URL:** `#search`  
**File:** `js/modules/search.js`  
**Purpose:** Full-text search across all devotional content and personal data.

**Features:**
- Live search as user types (debounced 300ms, min 2 characters)
- Searches: scripture references, scripture text, reflection prompts, journal entries
- Filter chips: "Has Journal", "Completed", "Favorited", "Has Audio"
- Results show: season, day-in-season, scripture ref, matched text with highlight
- Clicking a result navigates to that devotional

**Performance (current issue):** Filters trigger per-item IDB reads. With 120 results and 4 filter types, this is up to 480 sequential IDB reads.

---

### Route: `favorites`

**URL:** `#favorites`  
**File:** `js/app.js` → `renderFavorites()`  
**Purpose:** List of favorited devotionals with personal notes.

**Features:**
- Sorted by day number
- Each card: season badge, scripture ref, scripture quote, personal note (if any)
- "Remove from favorites" heart button
- "Edit/Add Note" button → opens modal with 500-char textarea
- "Read Devotional" link → navigates to that day

**Empty state:** Icon + title + description + "Browse Devotionals" button

---

### Route: `progress`

**URL:** `#progress`  
**File:** `js/modules/progress.js`  
**Purpose:** Progress dashboard — streaks, milestones, and completion visualization.

**Sections:**
1. **Overall progress** — X of 120 days complete + percentage
2. **Current streak** — Days in a row, longest streak
3. **Season rings** — SVG ring chart per season showing % complete
4. **Milestone badges** — 7, 14, 30, 60, 90, 120 days — earned vs. locked
5. **Weekly overview** — This week's completion calendar

---

### Route: `reflections`

**URL:** `#reflections`  
**File:** `js/modules/weekly-reflection.js`  
**Purpose:** Weekly guided reflection prompts (every 7 days).

**Flow:**
- If a reflection is due, prompts user to complete it
- Shows all past reflections as expandable cards
- 3 reflection questions per week, rotating through seasons
- Responses saved as array of strings

**Empty state:** "No reflections yet" + "Start Reading" button

---

### Route: `privacy`

**URL:** `#privacy`  
**File:** `js/modules/privacy.js`  
**Purpose:** Data transparency and management.

**Sections:**
1. **Your Data** — Summary of what's stored and where
2. **Export** — Download as JSON, CSV, or PDF
3. **Import** — Restore from a JSON backup (with validation)
4. **Reset** — Clear all data (with export-first confirmation prompt)
5. **Privacy statement** — "All data stored only on this device. Nothing sent to servers."

---

### Route: `settings`

**URL:** `#settings`  
**File:** `js/modules/settings.js`  
**Purpose:** App preferences.

**Sections — Display & Reading:**
- Dark Mode (System / Light / Dark)
- Font Size (Small / Medium / Large / Extra Large)
- Line Spacing (Compact / Normal / Relaxed / Loose)
- Bible Translation (NLT / NIV / KJV / NKJV / ESV / NASB / MSG)
- Season Colors (Auto / Winter / Spring / Summer / Autumn)
- Reading Speed (TTS rate slider)
- Auto-Save Journal (toggle)

**Sections — Notifications:**
- Enable Reminders (toggle + time picker)
- Note: "Reminders appear while the app is open"

**Sections — Data Management:**
- Export Data (opens DataExport flow)
- Import Backup (opens file picker)
- Reset All Data (destructive, with confirmation)
- Privacy & Data (navigates to `#privacy`)

**Sections — About:**
- App name, version (1.0.1), author, copyright
- Privacy link

---

## Feature Inventory

### Core Features

| Feature | Module | Status |
|---|---|---|
| Season identification quiz | `quiz.js` | Working |
| Daily devotional reading | `devotional.js` | Working |
| Journal entries (text) | `devotional.js` + `store.js` | Working |
| Journal auto-save (debounced) | `devotional.js` | Working |
| Journal manual save option | `devotional.js` | Working |
| Day completion tracking | `devotional.js` + `store.js` | Working |
| Completion card with CTA | `devotional.js` | Working |
| Season transition intro | `devotional.js` + `intro-pages.js` | Working |
| Favorite days with notes | `app.js` + `store.js` | Working |
| Table of contents (120 days) | `toc.js` | Working |
| Progress / streak tracking | `progress.js` | Working |
| Weekly reflection prompts | `weekly-reflection.js` | Working |
| Full-text search | `search.js` + `search-engine.js` | Working |
| Settings persistence | `settings.js` + `store.js` | Working |
| Dark mode | `theme-manager.js` | Working |
| 4 seasonal color themes | `variables.css` + `seasonal.css` | Working |
| Font size / line spacing | `settings.js` | Working |
| Bible translation selection | `settings.js` + `devotional.js` | Working |

### Wellness Features

| Feature | Module | Status |
|---|---|---|
| Text-to-speech (TTS) | `tts.js` | Working (Web Speech API, no Safari iOS) |
| Audio journal notes | `audio.js` | Working (MediaRecorder API) |
| Ambient soundscapes | `ambient-sound.js` | Working (8 presets: rain, ocean, forest, etc.) |
| Guided breathing exercise | `guided-breathing.js` | Working (box pattern 4-4-4-4) |
| Meditation timer | `meditation-timer.js` | Working (countdown, customizable duration) |

### Sharing & Export

| Feature | Module | Status |
|---|---|---|
| Share verse (Web Share API) | `sharing.js` | Working |
| Copy verse to clipboard | `sharing.js` | Working (fallback) |
| Create shareable image | `verse-images.js` | Working (Canvas 2D API) |
| Export journal as JSON | `data-export.js` | Working (importable format) |
| Export journal as CSV | `data-export.js` | Working |
| Export journal as PDF | `pdf-export.js` + jsPDF | Working |
| Import JSON backup | `store.js` + `privacy.js` | Working (with validation) |
| Calendar integration | `calendar-integration.js` | Working (Google Calendar + ICS) |

### PWA Features

| Feature | File | Status |
|---|---|---|
| Service worker (offline) | `sw.js` | Working (cache-first) |
| PWA install prompt | `app.js` | Working (shown after 1 minute) |
| Offline indicator | `app.js` | Working |
| Push notifications | `notifications.js` | Working (requires permission) |
| App shortcuts (manifest) | `manifest.webmanifest` | Working (Today + Contents) |
| Background sync queue | `sync-queue.js` | Working (queues offline writes) |
| PWA update detection | `app.js` | Working (toast + reload) |

### UX/Accessibility Features

| Feature | Module | Status |
|---|---|---|
| Keyboard shortcuts | `keyboard-shortcuts.js` | Working |
| Onboarding tour | `onboarding-tour.js` | Working |
| Haptic feedback | `haptics.js` | Working (Vibration API) |
| Page transitions | `page-transitions.js` | Working |
| Error boundaries | `error-boundary.js` + `error-handler.js` | Working |
| Undo manager | `undo-manager.js` | Exists but not wired to any UI |
| Blob URL lifecycle | `blob-manager.js` | Working |

---

## Data Flows

### First-Time User Flow

```
Landing → Splash screen (800ms)
→ App initializes (loads book.json + quiz.json)
→ No quiz results found
→ Default route = 'intro'
→ Intro pages (read or skip)
→ Quiz → Results → Season saved
→ currentDay = 1 → Navigate to home
→ Onboarding tour prompts after 1 second
```

### Daily Use Flow

```
Open app → Splash → App initializes
→ Quiz results exist → Default route = 'home'
→ Home shows current day card
→ Tap "Read Day N →" → Devotional page
→ Read scripture + reflection prompt
→ Write journal entry (auto-saves after 2s)
→ Optionally: listen (TTS), record audio, create image, share
→ Tap "Mark Complete"
→ currentDay advances to N+1
→ Completion card shown
→ Navigate to next day
```

### Data Persistence Flow

```
Journal entry typed
→ debounce 2s
→ queueJournalSave(day, content, season)
→ Store.saveJournalEntry(day, content, season)
→ IndexedDB write to 'journal' store
→ (If offline: SyncQueue queues the operation)
→ (When online: SyncQueue retries all queued ops)
→ Progress.updateStreaks()
→ Search.rebuildIndex()
```

---

## Content Inventory

| Asset | Size | Type | Notes |
|---|---|---|---|
| book.json | 66 KB | JSON | 120 days × {scriptureRef, scriptureText, prompt, pdfPage} + front matter |
| quiz.json | 4.4 KB | JSON | 4 seasons × 4–5 questions, results text |
| icon.svg | — | SVG | Primary icon |
| icon-simple.svg | — | SVG | Simplified variant |
| icon-{size}.png | — | PNG | 8 sizes (72–512px) |
| book-cover.webp | — | WebP | Physical book cover |
| Google Fonts | External | CSS/WOFF2 | Cormorant Garamond + Source Sans 3 |
| jsPDF 2.5.1 | 364 KB | JS | Loaded on-demand for PDF export |

---

*See `03-responsive-design-audit.md` for the responsive design analysis.*
