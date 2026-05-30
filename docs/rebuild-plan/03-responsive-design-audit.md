# Responsive Design Audit — Spiritual Seasons PWA

---

## Summary

The current app has a solid mobile layout but **no meaningful responsive adaptation** above 480px. On tablets and desktops the app renders as a narrow centered column with empty white space on both sides — it does not use the extra screen real estate at all.

---

## Current State

### Layout Fundamentals

**The "locked native" shell:**
```css
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
}
```

This pattern correctly prevents body scroll and creates an "app-like" native feel on mobile. However on desktop it means the page-like scrolling behavior users expect from a web app is gone — the entire screen is taken over by the fixed shell.

**Content max-width:**
```css
--container-max: 48rem; /* 768px */

.page-content {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
}
```

On a 1440px monitor: content is 768px wide, centered, with 336px of blank space on each side.

---

## Viewport-by-Viewport Breakdown

### 320px (iPhone SE, narrow phones)

**Status: Works, with some edge cases**

- Bottom nav 5 items: each gets `flex: 1` — they fit but are tight at 64px each
- Buttons use `white-space: normal; text-align: center` at `max-width: 400px` for wrapping
- Scripture quote text: `var(--text-2xl)` = 24px — may cause long quotes to scroll
- Journal textarea: correct `font-size: 16px` to prevent iOS auto-zoom
- Wellness tools grid: `2×2` layout at this width (grid uses `auto-fit`)

**Issues at 320px:**
- The devotional action toolbar (`Listen`, `Read Full Chapter`) wraps to 2 rows but no min-height — buttons can look squashed
- TOC grid shows 2 columns at this width — acceptable

### 375–428px (Modern iPhone, typical Android)

**Status: Designed for this. Best experience.**

- All layouts designed with this range as primary target
- Bottom nav, cards, typography all optimized here

### 480–640px (Large phones, small landscape phone)

**Status: Works but no enhancement**

- Same layout as 375px — no additional columns, no use of extra width
- Could benefit from 2-column journal layout (scripture left, journal right)

### 768px (iPad portrait, tablets)

**Status: Narrow column, unused space**

- Content column hits max-width (768px)
- Bottom navigation still shows as a 5-item row (mobile pattern)
- No sidebar navigation option
- Wellness tools grid still shows as 2×2
- TOC grid uses `grid-template-columns: repeat(auto-fill, minmax(120px, 1fr))` — gets wider columns on iPad, which looks okay

**What's missing:**
- A side-panel navigation (no need for bottom nav on tablet)
- 2-column layout on the devotional page (scripture + journal side by side)
- Larger scripture typography

### 1024px+ (Desktop, iPad landscape)

**Status: Narrow strip in a vast empty page**

- Content is 768px wide, centered in a white/cream background
- The bottom nav bar spans the full screen width but content stops at 768px
- The seasonal background gradients and snowfall effects cover the full screen width — the only full-width element
- Header spans full width but title/actions are centered at 768px

**What's missing:**
- Full two-column devotional layout
- Sidebar navigation replacing bottom nav
- Wider TOC with more columns
- Progress dashboard using available width for multiple charts

---

## CSS Breakpoint Analysis

### Defined Breakpoints

| Breakpoint | Value | Purpose (actual usage) |
|---|---|---|
| Small | `640px` | Grid utility classes only (`sm\:grid-cols-2`, `sm\:flex-row`) |
| Medium | `768px` | Grid utility classes only (`md\:grid-cols-2`, `md\:text-lg`) |
| Large | `1024px` | Grid utility classes only (`lg\:grid-cols-3`) |
| Mobile only | `400px` | Button text wrapping |
| Mobile only | `768px` | Scripture text size |

None of these breakpoints change the main application layout — header, nav, page padding, sidebar, column count. They only affect utility classes that must be manually applied in generated HTML.

### Missing Breakpoints for Real Layouts

| Target | Missing Change |
|---|---|
| `640px+` | Devotional: 2-column layout (scripture left, journal right) |
| `768px+` | Nav: switch from bottom nav to sidebar or top nav |
| `768px+` | TOC: increase to 4–5 columns |
| `1024px+` | Progress: 2-column grid for stats + charts |
| `1024px+` | Home: 2-column layout (today's card + wellness tools side by side) |

---

## Responsive Design Failures by Feature

### 1. Bottom Navigation

**Current:** 5 items × 64px each in a row — works great on phones, acceptable on tablets (wide enough), confusing on desktop (looks like a phone app).

**Problem:** On wide screens the bottom nav is not expected UX. Desktop users look for top or left-side navigation.

**Fix in rebuild:** Below 768px → bottom nav. Above 768px → left sidebar navigation (collapsible). Above 1280px → expanded sidebar with labels.

### 2. Devotional Page

**Current:** Single column, full width. Scripture at top, journal below. Users must scroll between them.

**Problem on tablet/desktop:** There is enough horizontal space for a 2-column layout where scripture, reflection prompt, and actions are on the left, and the journal textarea is on the right. This would eliminate the need to scroll.

**Fix in rebuild:** At 768px+, flex-row layout: `max-width: 340px` scripture column + `flex: 1` journal column.

### 3. Table of Contents

**Current:** `repeat(auto-fill, minmax(120px, 1fr))` — adapts reasonably across widths. On a 1440px screen you get 10+ columns, which makes the day buttons very wide and the text small.

**Problem:** The TOC doesn't have season section headers that stay visible at the top of each section while scrolling. With 120 entries, users can't tell which season they're in without scrolling back to the header.

**Fix in rebuild:** Sticky season headers. Grouped layout: 4 season panels with collapsible day grids. Max 5 columns.

### 4. Home Page

**Current:** Stacked cards — greeting, today's card, wellness tools, quote. On desktop, cards are narrow and short-looking.

**Problem:** The wellness tools 2×2 grid looks cramped on mobile and leaves space on desktop. The progress bar is minimal.

**Fix in rebuild:** At 768px+, side-by-side layout: today's card (left) + wellness tools panel (right).

### 5. Settings Page

**Current:** Single column of settings groups. On desktop, settings extend below the fold unnecessarily.

**Fix in rebuild:** At 1024px+, 2-column settings layout (Display & Reading left, Data Management right).

---

## Inline Style Problems

Throughout the codebase, layout and spacing is controlled by inline `style` attributes on dynamically generated HTML. These cannot be overridden by media queries:

```js
// devotional.js — cannot override with CSS breakpoints
`<div style="display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: center;">`

// app.js home page
`<p style="font-size: var(--text-xs); color: var(--color-text-muted); margin: 0 0 var(--space-2);">`
```

A responsive rewrite requires moving all layout logic from inline styles into CSS classes with proper `@media` rules.

---

## Estimated Inline Style Count

| File | Approximate inline style occurrences |
|---|---|
| `app.js` | ~35 |
| `devotional.js` | ~25 |
| `settings.js` | ~20 |
| `progress.js` | ~15 |
| `weekly-reflection.js` | ~10 |
| `search.js` | ~8 |
| Other modules | ~30 |
| **Total** | **~143 inline style blocks** |

---

## Recommended Responsive Strategy for Rebuild

### Breakpoints

```css
/* Mobile first — no media query for base */

/* Large phone / small tablet — 2 columns in some grids */
@media (min-width: 480px) { ... }

/* Tablet portrait — 2-column layouts, bottom nav replacement */
@media (min-width: 768px) { ... }

/* Desktop / tablet landscape — sidebar nav, 3-column grids */
@media (min-width: 1024px) { ... }

/* Wide desktop */
@media (min-width: 1280px) { ... }
```

### Navigation Strategy

```
< 768px: Bottom navigation (5 items, fixed)
768px–1024px: Top navigation bar with all 5 items + icons
1024px+: Collapsible left sidebar (icon-only by default, expand on hover/click)
```

### Layout Strategy

```
Devotional page (768px+):
  Left column (40%): Scripture, reflection prompt, actions
  Right column (60%): Journal textarea + audio controls + navigation

Home page (768px+):
  Left (55%): Today's card + progress bar
  Right (45%): Wellness tools grid (2×2) + quote

Settings (1024px+):
  Left (50%): Display & Reading settings
  Right (50%): Notifications + Data management

TOC (768px+):
  Season header sticky
  4-column day grid
  Filter by season tabs

Progress (1024px+):
  Top row: Overall stats (3 cards in a row)
  Bottom: Season rings (side by side, not stacked)
```

---

## Font Scaling

Current font sizes use fixed `rem` values. The root font size is overridden by the font size setting:

```js
function applyFontSize(size) {
  const sizes = { small: '14px', medium: '16px', large: '18px', 'extra-large': '20px' };
  document.documentElement.style.fontSize = sizes[size] || '16px';
}
```

This correctly scales the entire app. But the base type sizes should also grow responsively:

```css
/* Recommended for rebuild */
html {
  font-size: 15px; /* mobile base */
}

@media (min-width: 768px) {
  html {
    font-size: 16px; /* tablet base */
  }
}

@media (min-width: 1280px) {
  html {
    font-size: 17px; /* desktop base */
  }
}
```

---

*See `04-new-architecture-plan.md` for the rebuild strategy.*
