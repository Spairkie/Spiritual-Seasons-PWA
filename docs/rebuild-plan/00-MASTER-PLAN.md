# Spiritual Seasons — Rebuild Master Plan

**Status:** Planning only. No code has been written against this plan.
**Supersedes:** Nothing — this document sits *above* `01`–`06` (written 2026-05-30) and adds the piece they were missing: an actual design vision and UX rework, not just an architecture rework. Where `01`–`06` already cover something well (data schema, module inventory, phased engineering roadmap), this doc references them instead of repeating them.

---

## 0. Why this document exists

Two things happened before this plan:

1. A prior session wrote `docs/rebuild-plan/01`–`06`: an excellent, honest technical audit and a "port everything to Vite + TypeScript, keep the exact same design" rebuild plan.
2. This session then attempted a *design* refresh on top of the *old* architecture — applying a new visual language (from a Claude Design mockup) as an incremental patch: new CSS tokens, a new sidebar, restyled components, several rounds of bug fixes.

The result wasn't good enough. Patching a codebase that the prior audit already diagnosed as having "definition conflicts," "selector explosion," and "40% of styling in inline strings" produced exactly the failure mode you'd predict: real bugs shipped silently (a wrong season icon, a missing string interpolation, CSS custom properties that didn't exist, and — the big one — an ID selector in `seasonal.css` silently overriding every layout fix for three review rounds before I found it). Each was fixable, but finding them one at a time, after the fact, is not how "exceptional" gets built. It's also not fair to you as a reviewer — you shouldn't have to be the one to notice a snowflake icon is actually a sun.

**The conclusion this plan draws:** the prior audit was right that the codebase needs a real rebuild, not patches. What it didn't do is treat the *design* with the same rigor it gave the *architecture*. This plan does both, and — critically — puts a **design sign-off checkpoint before any page gets built**, so you're reacting to a small, cheap set of static screens instead of a finished, deployed app.

---

## 1. What "exceptional UI/UX" means for this app, specifically

Not generic polish. For a 120-day personal devotional app, exceptional means:

- **It gets out of the way.** The app's job is to put a scripture, a question, and a blank page in front of someone for two minutes a day. Every screen between "open the app" and "that moment" is friction. (Research on devotional/journaling habit formation backs this up — minimal friction and prompted, structured reflection are what make the habit stick, more than feature count.)
- **It feels considered, not assembled.** One coherent visual system, not eight CSS files quietly disagreeing with each other. Every spacing value, every radius, every color a decision, not a default.
- **It's calm.** Seasonal theming and soft color are the personality of this app — they should read as ambiance, not as decoration competing with the content.
- **It respects the device you're on.** Full, real desktop and tablet layouts — not a phone screen stretched into a narrow column, which is what exists today.
- **It's accessible by construction**, not by a checklist pass at the end. Keyboard users, screen reader users, and reduced-motion users are first-class, because a devotional app is exactly the kind of app someone opens half-asleep, one-handed, or with a screen reader at 6am.
- **It's honest about its own state.** Loading, empty, error, and offline states are designed, not afterthoughts (the current app's error boundary is decent; most empty states are not).

---

## 2. Diagnosis: why the current app (and the recent patch) falls short

Grounded in what `01-current-site-audit.md` found *and* what I personally hit while patching this session:

| Problem | Evidence |
|---|---|
| No responsive design above ~480px | App is a centered 768px column on any wider screen; bottom nav never becomes a sidebar without manual, page-by-page CSS work |
| CSS cascade is unmanaged | `layout.css` and `components.css` both define `.page-content`, `.app-main`, etc. — whichever loads last silently wins. `seasonal.css` targets pages **by ID**, which beats every class-based override regardless of source order. This is exactly what caused the multi-round "still has unnecessary scroll" bug this session — I was correctly fixing `.page` and `.app-main`, but an ID selector three files away was overriding both, and nothing in the system made that discoverable except manually diffing computed styles in a browser |
| ~40% of styling lives in `style=""` strings inside JS template literals | Can't be responsive (no media queries on inline styles), can't be themed consistently, can't be found by searching CSS |
| No component model | Every page is a hand-built HTML string glued into `innerHTML`. There is no mechanism that catches "this variable is out of scope" or "this CSS custom property doesn't exist" — both bugs shipped silently this session and were only caught by manual QA |
| Zero tests | Every change is a manual click-through. Regressions are invisible until someone notices |
| Real-device gap | All of this session's QA was headless Chromium screenshots at fixed viewports. That's necessary but not sufficient — it cannot catch iOS Safari's dynamic toolbar, real font rendering, VoiceOver behavior, or how the app actually feels in a hand |

None of this is about taste. It's about the fact that the current architecture makes it *structurally likely* that visible bugs ship, and makes "exceptional" polish expensive to achieve and impossible to keep. A rebuild fixes the ceiling. This plan's design section fixes the floor.

---

## 3. Design vision

### 3.1 Direction

The design mockups you commissioned (`Spiritual Seasons App.dc.html` / `Spiritual Seasons Mobile.dc.html` in your Claude Design project) are a strong, coherent starting point: warm paper tones, a serif display face for scripture and numbers, a restrained sans for UI chrome, muted seasonal accents instead of primary-color-app-icon brightness, generous line-height on reading text, soft shadows, pill-shaped controls. It reads like a well-made book, not a fitness tracker — appropriate for what this app actually is.

**What went wrong wasn't the direction — it was the execution path.** I translated the mockup piecemeal onto the old architecture across several commits, which is exactly how a wrong icon and a missing offline font slip through. This plan proposes keeping that visual direction as the working default, but:

1. Building it as an actual design system (documented tokens + component specs, §4) instead of ad-hoc CSS edits, and
2. **Not writing a single line of page code until you've signed off on a small set of static, high-fidelity screens** — home, devotional/read, and one settings-style list screen, in both light/dark and mobile/desktop. That's maybe a day of work and it's the cheapest possible point to say "no, not this" if the direction itself isn't it. (See §8, Phase 0.5.)

If, after seeing that, the direction itself is the problem rather than the execution — tell me and we pick a different one before any build work starts. Two credible alternatives, if the current mockup's editorial-warm feel isn't right:
- **Quiet/minimal:** near-monochrome (ink/paper only), a single seasonal accent used sparingly (just the badge and CTA, not backgrounds), more whitespace, less texture. Reads more like a premium note-taking app.
- **Modern devotional:** bolder seasonal color blocking (full-bleed tinted headers per season), rounder/friendlier type pairing, closer to Calm/Headspace's visual energy. More vibrant, less "literary."

### 3.2 Principles that apply regardless of which direction wins

- **One token system, no exceptions.** Every color, space, radius, and shadow in the app traces back to a CSS custom property. No hex codes or magic numbers in component code, ever — this alone would have prevented most of the bugs from §2.
- **Motion with intent, not decoration.** Page transitions and hover states should confirm what just happened (a save, a completion, a navigation) — not spin for its own sake. Everything respects `prefers-reduced-motion`.
- **Typography does the emotional work.** The serif face is reserved for scripture, reflection prompts, and big numbers (streaks, day counts) — the moments that should feel unhurried. UI chrome (nav, buttons, labels) stays in the sans face so it reads as *interface*, not content.
- **Season is ambient, not loud.** The accent color shifts with the reader's season; it should never fight with the content for attention.

---

## 4. Design system specification

This is the token set already validated in the current codebase (it renders correctly, in both themes, across every page — see the screenshots from this session's earlier work) and should be the literal source of truth for the rebuild, not something to be reverse-engineered from CSS again.

### 4.1 Color

**Base (light):** paper `#FBF9F5` (page bg) · surface `#FFFFFF` (cards) · surface-2 `#F4F0E9` (hover/secondary) · ink `#1F1D1A` · ink-2 `#5C5852` · ink-3 `#8B857B` · line `#E7E2D8` · line-2 `#D8D2C6`

**Base (dark):** paper `#15140F` · surface `#1D1C17` · surface-2 `#26241D` · ink `#F3EFE6` · ink-2 `#B2ACA1` · ink-3 `#8B8579` · line `#302D26` · line-2 `#3D3931`

**Seasonal accents** (accent / accent-deep / tint / tint-2 — tint is a wash used for card backgrounds and badges, never as a large flat area):

| Season | Light accent | Light deep | Dark accent | Dark deep |
|---|---|---|---|---|
| Winter | `#4C7688` | `#2B4E5C` | `#7FB3C6` | `#A9CFDD` |
| Spring | `#6D8E4E` | `#43602F` | `#9DBE7B` | `#BBD69E` |
| Summer | `#B5822B` | `#835A16` | `#DCAE5C` | `#EDC77F` |
| Autumn | `#A9503A` | `#7A3524` | `#D08469` | `#E2A188` |

Dark-mode accents are deliberately *brighter* than their light-mode counterparts (contrast against a dark surface needs more saturation/lightness, not the same value inverted).

### 4.2 Typography

- **Display/serif** (Cormorant Garamond): scripture text, reflection prompts, page titles, stat numbers, section headers. Self-host as variable-font WOFF2 (already done this session — don't reintroduce a Google Fonts CDN dependency; this app claims to work offline and should actually mean it).
- **Body/UI** (Libre Franklin): everything else — nav labels, buttons, form controls, metadata.
- Scale runs roughly: 10px uppercase-tracked eyebrow labels → 13–15px body/UI → 17–19px section headers → 22–31px page titles → up to 36px for stat numbers. Exact scale to be finalized as real CSS custom properties (`--text-*`) during Phase 0.5, not re-derived per component.

### 4.3 Shape, elevation, spacing

- Radius: ~10–13px for buttons/list rows, 14–16px for cards, 18–20px for large cards and sheets, full pill for badges/toggles/switches.
- Shadow: soft and shallow — `0 1px 2px rgba(ink,.04), 0 10px 26px -16px rgba(ink,.18)` in light mode; darker, more diffuse in dark mode. No hard drop shadows.
- Spacing: an 8px-rooted scale (8/12/16/20/24/28/32...), applied consistently — not the mix of ad-hoc `--space-*` multiples currently scattered across `components.css`.

### 4.4 Components (spec, not implementation)

Every one of these needs a documented spec (states: default/hover/active/focus/disabled; light+dark; all four seasons) before it's built once and reused everywhere, instead of being redefined per page as it is today:

Button (primary/secondary/ghost, 3 sizes) · Card (with optional left accent border, used for reflection callouts) · List row (label + meta + trailing control — used everywhere in Settings) · Toggle switch · Select · Badge/pill · Bottom sheet (mobile) / centered dialog (desktop) — same component, responsive presentation · Toast · Progress ring · Season swatch picker · Nav item (bottom-nav and sidebar are the same semantic component, two layouts) · Empty state · Skeleton/loading state.

### 4.5 Motion

- Hover: buttons darken (`accent` → `accent-deep`); cards lift 1–2px and their border tints toward the season accent; icon buttons get a `surface-2` background.
- Sheets/modals: 200–300ms scale+fade, matching direction to platform convention (slide-up on mobile, fade+scale on desktop).
- Page transitions: subtle fade/slide (~150–250ms), never blocking interaction, always skippable via `prefers-reduced-motion`.
- **Seasonal ambient effects** (snowfall, bloom, sun-glow, etc.) pause when the tab isn't visible (`document.visibilityState`) and are disabled entirely under `prefers-reduced-motion: reduce`. The current app runs these continuously regardless — a real (if minor) battery/performance bug.

---

## 5. Information architecture rework

The current app has 11 flat routes with no hierarchy. Two concrete simplifications, both visible already in the design mockup's own nav (which only surfaces 5 primary destinations):

1. **Fold Privacy into Settings.** They're both "manage my data" — currently split across two routes with overlapping content (both show "what's stored," both link to export). One "Data & Privacy" section inside Settings, not a separate page reachable only from a link buried in Settings.
2. **Reconsider Favorites as a Contents filter, not a separate page.** Contents already renders every day with completed/favorited/journaled/audio indicators. A "Favourites" filter chip on that same screen (vs. a whole separate page with different card styling for the same 120 days) is one mental model instead of two. *(Flagging this as a recommendation, not a mandate — worth 10 minutes of discussion before Phase 0.5, since it's a bigger behavior change than the others.)*
3. **Weekly Reflections stays but becomes contextual**, not another primary nav destination competing for one of 5 precious sidebar/bottom-nav slots. Surface it as a card/banner on Home when one is due, and a section within Progress ("Your reflections") for browsing past ones.

Net result: **5 primary nav destinations** (Home, Read, Contents, Progress, Settings) — same as the current bottom nav/sidebar already settled on — with Favourites, Search, and Reflections reachable in 1–2 taps from Home/Contents/Progress rather than each owning a route that has to be independently designed, tested, and kept responsive.

```
Home ──┬── Devotional (Read) ──── Season transition ──── Intro (next season)
       ├── Contents ──── Devotional (jump to day) [+ Favourites filter]
       ├── Progress ──── Reflections (past + due)
       └── Settings ──── Data & Privacy (export/import/reset)

Quiz / Intro (first-run only, or reachable via Settings → "Retake quiz")
Search (icon in header, overlay — not a nav destination)
```

---

## 6. Page-by-page UX spec

For each page: purpose, what's genuinely different from today, and responsive behavior. (Full current-state behavior is already well documented in `02-feature-and-page-inventory.md` — this section only calls out *changes*.)

### Cover / Intro
No change to the flow (cover → "Begin, discover your season" → quiz). Front-matter (acknowledgements, author bio, how-to-use, season overviews) stays reachable on-demand from Contents' Introduction accordion, not a forced gate — this is already correct in the current app and should be preserved, not "improved."

### Quiz
Keep the existing ARIA radiogroup pattern (already solid). Visual: tighten to match the design system's card/progress-bar language. No structural change.

### Home
Today's card + quick wellness tools, largely as today, restyled. **Desktop (≥1024px):** two-column — today's card left, wellness tools + anchor quote right — instead of today's single stacked column stretched into a sidebar-adjacent void.

### Devotional (Read) — the core screen, deserves the most care
**Mobile:** single column, as today (scripture → prompt → journal → actions → nav), but journal textarea gets the serif face at a larger size for a more personal writing feel (the mockup does this; the current app uses the UI sans face for journaling, which is a small but real miss).
**Tablet/desktop (≥768px):** two columns — left (≈40%) holds scripture, reflection prompt, and the listen/full-chapter actions; right (≈60%) holds the journal textarea, audio recorder, and day-navigation footer. This eliminates the scroll-between-reading-and-writing problem that exists today on any screen wider than a phone.
Completion states (day complete / season complete / journey complete) get real designed cards, not the current plain text substitution.

### Contents
Season sections as accordions (current pattern is fine), but: sticky season header while scrolling within an open section, and (pending the IA decision in §5) a Favourites filter chip. Day buttons keep their completed/favorite/journal/audio indicators — those are genuinely useful and shouldn't be cut for minimalism's sake.

### Progress
Richer than today's version — the design mockup's spec (ring + streak card + milestones grid + per-season bars + activity summary + share/export) is a real upgrade over the current app's more minimal dashboard and should be the target, not just a re-skin of what exists. **Desktop (≥1024px):** stats row becomes 3-up, season bars and milestones sit side-by-side instead of stacked.

### Settings
Restructured into clearly labeled card-grouped sections (Display & Reading / Season theme / Audio & Narration / Notifications / Data Management / Journal & Practice / Privacy — see the full spec already in the mockup, extracted in this session) instead of one long flat list. **Desktop (≥1024px):** two-column layout, groups distributed left/right rather than one long single column that scrolls forever on a 1440px monitor with 400px of unused width on either side.

### Favourites / Search / Reflections
Per §5 — folded into Contents/Home/Progress rather than standalone pages, pending your confirmation.

---

## 7. Technical architecture

### 7.1 Stack recommendation — revised from `04-new-architecture-plan.md`

The existing plan recommends **Vite + vanilla TypeScript + CSS Modules, no framework**. I'd revise one part of that: use **Preact (3KB) with TypeScript**, not fully manual DOM manipulation.

Why the change: every bug I introduced or found this session was a *category* that a real component model prevents by construction —
- a variable referenced out of its scope → caught by any component-based render function, since props/state are explicit
- CSS custom properties that don't exist → still possible, but CSS Modules + a component boundary makes "which styles apply to this component" a solvable, local question instead of "search 8 global files and hope"
- an ID selector overriding a class selector three files away → structurally can't happen with scoped component styles

Preact is 3KB gzipped, uses JSX (auto-escaping — removes the manual `escapeHtml()` calls and the XSS risk class entirely), has first-class TypeScript support, and is a well-trodden, boring, stable choice — not an experiment. It is not "adding React" in spirit or in weight; it's replacing hand-rolled `innerHTML` string assembly with the same declarative model virtually every production web app already uses, at a bundle cost smaller than one of this app's PNG icons.

If you'd rather stay at true zero-dependency vanilla TypeScript (the original plan), that remains a completely reasonable choice — it just means the discipline of "no inline styles, no cross-file cascade conflicts" has to be enforced by code review rather than by the architecture itself. Either way, the rest of this section holds.

**Everything else from `04-new-architecture-plan.md` stands:** Vite, `idb` for typed IndexedDB access, `vite-plugin-pwa`/Workbox for the service worker (replacing the hand-maintained `STATIC_ASSETS` array — the exact kind of manual list that already caused a stale-font bug this session), Vitest + `fake-indexeddb` for testing, CSS Modules for component styling on top of the same global design-token file.

### 7.2 What must not change

- **IndexedDB schema** (db name `spiritual-seasons-db`, version `1`, all 8 store names/shapes) — existing users' journals, streaks, and favorites carry over with zero migration code. This is non-negotiable and already fully specified in `06-claude-new-repo-build-prompt.md`.
- **`content/book.json` and `content/quiz.json`** — Dr. Ghee's content, unchanged, byte-for-byte.
- **Feature parity** — every working feature listed in `02-feature-and-page-inventory.md` ships in the rebuild. Nothing gets quietly dropped because it's inconvenient to port.

### 7.3 Verification pass — what's changed since the original May audit

Confirmed by re-checking the live codebase against `01`–`06`:

**Still accurate:** the ~40 global IIFE modules, the inline-style count (heaviest offenders: `toc.js` 24, `data-export.js` 22, `calendar-integration.js` 21, `guided-breathing.js` 17, `devotional.js` 15), the `layout.css`/`components.css` duplication of `.page-content`/`.page-header`/`.app-main`, and `store.js`'s schema/API — `store.js` is byte-for-byte unchanged since May, so the schema in `06-claude-new-repo-build-prompt.md` is still exactly correct.

**Important — branch state:** the redesign work from this session (sidebar nav, theme toggle, self-hosted fonts, the `seasonal.css` fix) lives on branch `claude/design-access-check-6ju2af`, not yet merged to `main`. Whatever gets treated as "the current app" for rebuild reference purposes should be that branch, not `main` — otherwise the rebuild would be referencing a version that's already a step behind what you've been reviewing.

**New findings from the deeper module pass (not in the original audit):**

- `progress.js` computes season completion by calling `isDayCompleted()` in a serial loop — up to 120 sequential IndexedDB reads to render one dashboard. Same class of bug as the TOC performance issue the original audit already flagged (§10, item 10); fix is the same: batch-load once via `getAllProgress()`.
- `search.js` already pre-batches its filter sets into `Set`s (a prior perf fix, per its own comments) and has a hand-rolled fuzzy matcher (Levenshtein distance + a scoring heuristic). Worth deciding explicitly: port this logic, or replace with a small real search library (e.g. MiniSearch) in the rebuild — hand-rolled fuzzy matching is exactly the kind of thing that quietly degrades.
- `weekly-reflection.js` manually tracks and tears down its own delegated click listener across re-renders (`_reflectionClickHandler`/`_reflectionClickContainer`) to avoid handler-stacking bugs. This is a real workaround for a real problem — and it's a problem a component model (§7.1) eliminates structurally rather than needing hand-written singleton bookkeeping.
- `notifications.js` schedules reminders with a recursive `setTimeout`, which does not survive a page reload or the app being closed — despite running inside a PWA with a service worker that could support more durable scheduling. It also declares a `snooze` action on the notification payload that nothing appears to listen for (worth confirming in `sw.js`'s `notificationclick` handler; may be dead code). Flag as a real gap: local reminders in this app currently only fire while the tab is open, which likely undermines the feature's whole purpose.
- `calendar-integration.js` generates `.ics` files with `VERSION:1.0` in the header. RFC 5545 requires `VERSION:2.0` — some calendar clients may reject these files. Small, concrete bug to carry into the rebuild's fix list.
- `css/ui-polish.css` (511 lines) and `css/utilities.css` (648 lines) are both fine internally, but `ui-polish.css` re-touches selectors owned by `components.css` (e.g. `.progress-dashboard`, `.toc-day-btn`) — another instance of styling for one concept living in more than one file. Separately, `utilities.css` is a substantial, consistently-named, hand-built Tailwind-style utility layer that already exists in this codebase. That's relevant to §7.1's CSS strategy: rather than introducing CSS Modules from zero, it may be cheaper and just as disciplined to formalize this existing utility layer (or adopt a real utility framework) alongside component-scoped styles for the handful of truly custom components. Worth a deliberate choice during Phase 0.5, not a default.

### 7.4 Accessibility & performance targets

- **WCAG 2.2 AA** (not 2.1 — 2.2 is the current W3C recommendation and the standard now referenced by ADA case law, the EU Accessibility Act, and AODA; it adds 9 criteria on top of 2.1, several directly relevant here: focus visibility, target size, dragging alternatives).
- Skip link, visible focus rings on every interactive element (currently missing), full keyboard nav, screen-reader-tested modals/sheets with proper focus trapping, `prefers-reduced-motion` support everywhere motion exists.
- Lighthouse targets: Performance 90+, Accessibility 95+, PWA 100 (current app: no Lighthouse baseline exists — first task in the rebuild is establishing one against the *current* production app, so "improvement" is measured, not assumed).
- Initial JS payload target <75KB (current: ~800KB including a synchronously-loaded 364KB PDF library that's only needed for one export feature).

---

## 8. Rollout plan

### Phase 0.5 — Design validation (NEW — do this before any of `05-rebuild-roadmap.md`'s Phase 0)

**~1–2 days.** Before a single line of the rebuild is written:
1. Finalize the token set (§4) as real, documented values — not re-derived per component later.
2. Build 3 static, high-fidelity screens (Home, Devotional/Read, one Settings-style list) in both light/dark and at mobile/desktop widths. Static HTML/CSS, no app logic — this is the cheapest possible artifact to react to.
3. You review and either sign off or redirect. If the direction itself needs to change (not just execution), that happens *here*, against a few static screens, not after weeks of building.
4. Resolve the two open IA questions from §5 (Favourites-as-filter, Reflections placement) before Phase 1 begins, since they affect the route/component structure.

This is the single biggest change from the original roadmap, and it's the direct response to "I don't like the changes" — it moves the feedback loop to before the expensive part, instead of after.

### Phases 0–10 — Engineering build

Follow `05-rebuild-roadmap.md` as written (Phase 0 project setup → Phase 1 store/router/content layer → Phase 2 shell/CSS → Phase 3 core reading experience → ... → Phase 10 accessibility/testing/polish), with two adjustments:
- Phase 0's stack setup uses Preact per §7.1 (or stays vanilla-TS if you decide against the change — the folder structure in `04-new-architecture-plan.md` barely changes either way).
- Phase 2 (shell/CSS) and Phase 3 (home/devotional/TOC) build *from* the signed-off screens in Phase 0.5, not from a fresh interpretation of the mockup.

Estimated timeline is unchanged from the original doc: **8–12 weeks solo, 4–6 weeks with two developers**, plus the 1–2 days of Phase 0.5 up front.

### Where this happens

Recommend a **new repository** (as the original plan assumed), kept private until ready, with the current repo's IndexedDB-compatible data model meaning existing users transfer seamlessly *if* the new app deploys to the same origin/domain; if it moves domains, export/import (already a built feature) bridges the gap. Alternative: a long-lived branch in this repo — viable, but a fresh repo gives a clean history and avoids 25+ commits of incremental-patch archaeology sitting underneath a from-scratch rebuild.

---

## 9. Success metrics

Same table as `05-rebuild-roadmap.md`, plus explicit UX/design metrics that doc didn't have:

| Metric | Current | Target |
|---|---|---|
| Initial JS bundle | ~800 KB | <75 KB |
| Lighthouse Performance | *(unmeasured — establish baseline first)* | 90+ |
| Lighthouse Accessibility | *(unmeasured)* | 95+ |
| Lighthouse PWA | *(unmeasured)* | 100 |
| Test coverage (store layer) | 0% | 80%+ |
| Inline style blocks | ~143 | 0 |
| Responsive breakpoints with real layout changes | 0 | 4 |
| Desktop layout | Narrow centered column | Full 2-column layouts on Devotional/Settings/Progress |
| Design sign-off before build | Never happened | Required gate (Phase 0.5) |
| CSS files with duplicate/conflicting selectors | 3 confirmed (`layout.css`/`components.css`/`seasonal.css`) | 0 (component-scoped styles) |

---

## 10. Open decisions — need your input before Phase 0.5 starts

1. **Design direction:** proceed with the existing editorial-warm mockup direction (§3.1), or explore one of the two alternatives first?
2. **Favourites as a Contents filter** vs. keeping it a standalone page (§5) — this is the one IA change with real behavioral impact, worth a deliberate yes/no.
3. **Stack:** Preact+TS (recommended, §7.1) or stay fully vanilla TS per the original plan?
4. **Where it lives:** new repository, or a long-lived branch here?
5. Anything specific about what felt wrong in the recent patch that isn't captured in §2 — even something as simple as "the colors felt off" or "it felt cramped" helps calibrate Phase 0.5 before I build the sign-off screens.
6. **CSS strategy** (§7.3): CSS Modules from scratch, or formalize/extend the utility-class layer that already exists in `utilities.css`? Both are defensible; worth a deliberate pick rather than defaulting.

---

*Supporting detail: `01-current-site-audit.md` (technical audit), `02-feature-and-page-inventory.md` (full feature/route list), `03-responsive-design-audit.md` (viewport-by-viewport breakdown), `04-new-architecture-plan.md` (file structure, store split, CSS strategy), `05-rebuild-roadmap.md` (phased engineering plan), `06-claude-new-repo-build-prompt.md` (exact schema/content contracts + briefing prompt for whoever/whatever builds it).*
