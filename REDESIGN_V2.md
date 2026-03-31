# Glean UI Redesign V2 — Authoritative Specification
> Built with: Family Values Philosophy · OKLCH Color · userinterface-wiki Rules · animate · typeset · colorize · arrange · onboard · adapt

**Design Philosophy**: *"Remember everything. Organize nothing."*
A personal knowledge vault that feels like a beautifully curated physical space — warm, quiet, alive.

---

## 0. The Three Pillars (Family Values)

Every decision in this spec is filtered through three questions:

1. **Simplicity**: Does this screen have ONE clear next action? Is information revealed progressively?
2. **Fluidity**: Does every element that appears, disappears, or changes **animate**? Do elements travel, not teleport?
3. **Delight**: Does the rarest user action get the most theatrical response? Is there a moment that makes someone say *"oh, that's nice"*?

---

## 1. Design Principles

### Core Philosophy
- **Content is King**: UI elements recede; saved content takes center stage
- **Visual Memory**: Rich previews + earthy colors help users recall what they saved
- **Organic Rhythm**: Cards breathe — varied sizes, generous whitespace, asymmetric flow
- **Warmth**: Earth tones, not clichéd cool-blue tech palettes
- **Alive**: Nothing appears instantly. Everything moves with intention.

### Anti-Patterns (Hard Rules)
- ❌ `transition: all` — always enumerate specific properties
- ❌ Generic purple/blue gradients
- ❌ Uniform card grids (one card type repeated)
- ❌ Inter for *everything* — two distinct typefaces with genuine contrast
- ❌ Cool-gray text on warm backgrounds (clashing temperature)
- ❌ Pure `#ffffff` cards on `#faf9f7` cream — cards should be warm white
- ❌ Linear easing — nothing in the real world moves linearly
- ❌ Stagger > 50ms per item (rule: `physics-no-excessive-stagger`)
- ❌ Bounce/elastic easing — feels dated and calls attention to the animation
- ❌ `transition: all` — already said it, it's that important

---

## 2. Color System

**Design decision**: Full warm palette. Every gray has a warm tint. OKLCH used for perceptual uniformity.

### Base Surfaces
```css
--color-ground:   oklch(97.5% 0.008 70);  /* Warm cream — page background */
--color-surface:  oklch(99% 0.005 75);    /* Warm white — cards (not pure white) */
--color-surface-raised: oklch(96.5% 0.012 70);  /* Warm beige — notes, sidebars */
--color-surface-dark:   oklch(14% 0.012 260);   /* Near-black with cool undertone for contrast */
```

### Text — All Warm-Tinted
```css
--text-primary:   oklch(16% 0.01 60);    /* Warm near-black */
--text-secondary: oklch(42% 0.012 60);   /* Warm dark gray */
--text-tertiary:  oklch(58% 0.010 65);   /* Warm medium gray */
--text-muted:     oklch(70% 0.008 65);   /* Warm light gray */
--text-inverse:   oklch(98% 0 0);        /* Near-white on dark surfaces */
```

> **Rule**: Never use pure neutral grays (`#6b6b6b`, `#9ca3af`). All grays are warm-tinted to harmonize with the cream background. This is the single biggest "cheap vs. expensive" differentiator.

### Content Palette — Earthy, Varied
```css
/* Five distinct earthy gradients — each occupies a different hue region */
--gradient-ochre:      linear-gradient(135deg, oklch(72% 0.12 65) 0%, oklch(65% 0.10 60) 100%);
--gradient-sage:       linear-gradient(135deg, oklch(65% 0.07 150) 0%, oklch(58% 0.09 155) 100%);
--gradient-terracotta: linear-gradient(135deg, oklch(62% 0.13 35) 0%, oklch(56% 0.11 30) 100%);
--gradient-slate:      linear-gradient(135deg, oklch(55% 0.05 230) 0%, oklch(48% 0.07 225) 100%);
--gradient-sand:       linear-gradient(135deg, oklch(80% 0.06 80) 0%, oklch(75% 0.08 75) 100%);
```

> **Why varied hues?** The original spec had 5 gradients in nearly the same hue range — all warm brown/muted. At a glance, they were indistinguishable. The new palette gives `sage` (green), `slate` (cool blue-gray), and `terracotta` (red-orange) genuine contrast while staying "earthy."

### Semantic / UI Colors
```css
--color-accent:   oklch(42% 0.01 60);    /* Dark warm — primary interactive */
--border-subtle:  oklch(90% 0.01 70);    /* Barely-there border on warm surface */
--border-default: oklch(86% 0.012 70);   /* Standard border */
--input-bg:       oklch(94% 0.010 70);   /* Slightly sunken input */
```

---

## 3. Typography System

**Design decision**: Replace Inter for UI with **DM Sans**. Inter is the most overused font on the web. DM Sans is humanist, clean, and contemporary — still readable at small sizes, but with 20% more personality. Newsreader remains for display — it's a genuinely excellent choice.

### Font Families
```css
/* Display / headlines — editorial personality */
--font-display: 'Newsreader', Georgia, serif;

/* UI / body — humanist, contemporary, not overdone */
--font-ui: 'DM Sans', system-ui, sans-serif;
```

```html
<!-- Google Fonts — load both, variable axis for Newsreader -->
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
```

### Type Scale (Modular — 1.25 ratio, rem-based for app UI)
```css
--text-xs:   0.6875rem;   /* 11px — captions, badges */
--text-sm:   0.8125rem;   /* 13px — secondary labels, meta */
--text-base: 1rem;        /* 16px — body (bumped from 15px) */
--text-lg:   1.125rem;    /* 18px — card titles standard */
--text-xl:   1.25rem;     /* 20px — card titles large */
--text-2xl:  1.5rem;      /* 24px — section headings, logo */
--text-3xl:  2rem;        /* 32px — page titles */
--text-4xl:  2.5rem;      /* 40px — hero / empty state title */
```

### Role Assignments
| Role | Font | Size Token | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| Logo | Newsreader | `--text-2xl` | 500 | 1.2 | -0.03em |
| Page Title | Newsreader | `--text-3xl` | 500 | 1.15 | -0.02em |
| Section Heading | Newsreader | `--text-2xl` | 500 | 1.2 | -0.02em |
| Card Title (large) | Newsreader | `--text-xl` | 500 | 1.3 | -0.015em |
| Card Title (standard) | Newsreader | `--text-lg` | 500 | 1.35 | -0.01em |
| Body | DM Sans | `--text-base` | 400 | 1.65 | 0 |
| Body Small | DM Sans | `--text-sm` | 400 | 1.55 | 0 |
| Caption / Meta | DM Sans | `--text-xs` | 400 | 1.4 | 0 |
| Label (uppercase) | DM Sans | `--text-xs` | 500 | 1.2 | 0.06em |
| Button | DM Sans | `--text-sm` | 500 | 1 | 0.01em |
| Search Input | DM Sans | `--text-base` | 400 | 1 | 0 |

### Typography Rules
```css
/* Apply to all headings */
h1, h2, h3, h4 {
  font-family: var(--font-display);
  font-optical-sizing: auto;      /* Newsreader has optical size axis */
  text-wrap: balance;             /* Prevents awkward line breaks */
}

/* Body text */
body {
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;  /* retina smoothing */
  font-optical-sizing: auto;
}

/* Numbers in data contexts (counts, dates) */
.numeric { font-variant-numeric: tabular-nums; }

/* Uppercase labels */
.label-uppercase {
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 500;
}
```

---

## 4. Layout System

### Spatial Philosophy (arrange)
- **Proximity**: Related elements breathe together; sections breathe apart
- **Squint test**: Hierarchy must be legible with blurred vision — spacing alone should reveal importance
- **No uniform grids**: Feature cards must visibly interrupt the rhythm

### Spacing Scale (generous, with top-end range)
```css
--space-1:   4px;
--space-2:   8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;   /* Section separation — generous breathing room */
```

### Container
```css
.container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 var(--space-12);  /* 48px — desktop */
}
@media (width <= 767px) {
  .container { padding: 0 var(--space-5); } /* 20px — mobile */
}
```

### Grid System
```css
.content-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);   /* 24px */
}
```

**Card span classes** (applied per-card, randomized by content type):
```css
.card--feature   { grid-column: span 4; grid-row: span 2; }  /* Tall hero card */
.card--wide      { grid-column: span 6; }                     /* Half-width */
.card--standard  { grid-column: span 3; }                     /* Quarter-width */
.card--compact   { grid-column: span 2; }                     /* Small */
```

**Tablet (768-1023px)**: Max 8-column. Feature cards collapse to `span 4` (half). Standard to `span 4`.
**Mobile (< 768px)**: Single column. All cards `span 1` (full-width). Feature cards do NOT stack — they become full-width with reduced image height.

### Elevation Scale (z-index system)
```css
--z-base:       0;
--z-dropdown:  10;
--z-sticky:    20;
--z-modal-bg:  30;
--z-modal:     40;
--z-toast:     50;
--z-tooltip:   60;
```

### Shadow Scale (single light source — offset from top-left)
```css
--shadow-xs:  0 1px 2px  oklch(14% 0 0 / 0.04);
--shadow-sm:  0 2px 6px  oklch(14% 0 0 / 0.06), 0 1px 2px oklch(14% 0 0 / 0.04);
--shadow-md:  0 4px 12px oklch(14% 0 0 / 0.08), 0 2px 4px oklch(14% 0 0 / 0.05);
--shadow-lg:  0 12px 28px oklch(14% 0 0 / 0.12), 0 4px 8px oklch(14% 0 0 / 0.06);
--shadow-xl:  0 20px 40px oklch(14% 0 0 / 0.16), 0 8px 16px oklch(14% 0 0 / 0.08);
```
> All shadows use the same offset direction. No pure `rgba(0,0,0)` — tinted to near-black.

---

## 5. Motion System

> **Guiding rule**: *"We fly instead of teleport."* Nothing appears instantly. Every element that enters, exits, or changes state must animate. Record at 0.5x speed and verify every element has a visible journey.

### Easing Tokens
```css
/* Use these; never use 'ease', 'linear', or 'ease-in-out' for UI */
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);   /* Default — fast start, gentle settle */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);   /* Slightly softer — hover states */
--ease-in:        cubic-bezier(0.4, 0, 1, 1);       /* Exits ONLY */
--ease-spring:    /* Use spring physics via Framer Motion or Web Animations API */
  { stiffness: 200, damping: 28 };                  /* Smooth spring — no bounce */
```

### Duration Tokens
```css
--duration-instant:  100ms;   /* Press / tap feedback */
--duration-fast:     180ms;   /* Micro-interactions — hover, toggle */
--duration-base:     250ms;   /* Standard state change */
--duration-slow:     350ms;   /* Layout change, modal open */
--duration-entrance: 400ms;   /* Page load / section enter */
```

### Card Animations (GPU-safe — only `transform` + `opacity` + `box-shadow`)
```css
.card {
  transition:
    transform     var(--duration-fast) var(--ease-out-quart),
    box-shadow    var(--duration-fast) var(--ease-out-quart);
  will-change: transform;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.card:active {
  transform: scale(0.98) translateY(-2px);
  transition:
    transform  var(--duration-instant) cubic-bezier(0.2, 0, 0, 1),
    box-shadow var(--duration-instant) cubic-bezier(0.2, 0, 0, 1);
}
```

### Card Action Buttons (appear on hover)
```css
/* Stagger max 30ms per button — rule: physics-no-excessive-stagger */
.card-action:nth-child(1) { transition-delay: 0ms; }
.card-action:nth-child(2) { transition-delay: 30ms; }
.card-action:nth-child(3) { transition-delay: 60ms; }

.card-action {
  opacity: 0;
  transform: scale(0.9) translateY(4px);
  transition:
    opacity   var(--duration-fast) var(--ease-out-expo),
    transform var(--duration-fast) var(--ease-out-expo);
}

.card:hover .card-action {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

### Page Load — Card Choreography
```css
/* Each card staggers in — 30ms per card, max 200ms duration */
.card {
  animation: card-enter var(--duration-base) var(--ease-out-expo) both;
}
.card:nth-child(1) { animation-delay: 0ms; }
.card:nth-child(2) { animation-delay: 30ms; }
.card:nth-child(3) { animation-delay: 60ms; }
/* ... etc. Cap at 240ms delay even for card 9+ */

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

> **Corrected from v1**: Stagger reduced from 50ms → 30ms. Duration reduced from 300ms → 250ms. Last card's animation completes by ~470ms (8 cards) — within perceptual tolerance.

### Filter Pill Transition
```css
.filter-pill {
  transition:
    background-color var(--duration-fast) var(--ease-out-expo),
    color            var(--duration-fast) var(--ease-out-expo),
    border-color     var(--duration-fast) var(--ease-out-expo),
    transform        var(--duration-instant) cubic-bezier(0.2, 0, 0, 1);
}

.filter-pill:active {
  transform: scale(0.96);
}
```

### FAB
```css
.fab {
  transition:
    transform  var(--duration-fast) var(--ease-out-expo),
    box-shadow var(--duration-fast) var(--ease-out-expo);
}
.fab:hover {
  transform: scale(1.06) rotate(12deg);  /* Subtle rotation — hinting at "add" action */
  box-shadow: var(--shadow-xl);
}
.fab:active {
  transform: scale(0.94);
}
```

### Search Expand
```css
.search-bar {
  transition:
    border-color    var(--duration-fast) var(--ease-out-expo),
    background-color var(--duration-base) var(--ease-out-expo),
    box-shadow      var(--duration-fast) var(--ease-out-expo);
}
.search-bar:focus-within {
  border-color: var(--text-primary);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration:        0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration:       0.01ms !important;
  }
}
```

---

## 6. Components

### 6.1 Header
```
[Logo — Newsreader 24px]                    [Collections] [Avatar]
```
- Background: `transparent` → `oklch(97.5% 0.008 70 / 0.85)` + `backdrop-filter: blur(12px)` when scrolled
- Padding: `var(--space-5) var(--space-12)`
- Position: `sticky top-0`, z-index: `var(--z-sticky)`
- Header background appears only after 40px scroll (class toggle via JS)

**Avatar**:
- 32×32px circle, background `var(--color-surface-dark)`, text `--text-inverse`
- Hover: subtle brightness lift via `filter: brightness(1.2)`, transition `var(--duration-instant)`

### 6.2 Search Bar
```css
.search-bar {
  width: 100%;
  max-width: 520px;
  background: var(--input-bg);
  border: 1.5px solid transparent;
  border-radius: 14px;
  padding: 12px 48px;
  font-family: var(--font-ui);
  font-size: var(--text-base);
  color: var(--text-primary);
}
```
- Keyboard badge: `⌘K` / `Ctrl+K`, appears on hover with `opacity 0→1` transition
- Clear button appears on typing: `opacity 0→1`, `scale(0.8→1)`, delay 100ms
- Search icon SVG: 16px, `var(--text-muted)`, animates to `var(--text-primary)` on focus

### 6.3 Filter Pills
```html
<nav class="filter-pills" role="tablist" aria-label="Filter by content type">
  <button class="filter-pill active" role="tab" aria-selected="true">All</button>
  <button class="filter-pill" role="tab">Articles</button>
  <button class="filter-pill" role="tab">Notes</button>
  <button class="filter-pill" role="tab">Videos</button>
  <button class="filter-pill" role="tab">Books</button>
</nav>
```

```css
.filter-pill {
  padding: 8px 18px;
  border-radius: 100px;
  border: 1.5px solid var(--border-default);
  background: transparent;
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  cursor: pointer;
}

.filter-pill.active {
  background: var(--color-surface-dark);
  border-color: var(--color-surface-dark);
  color: var(--text-inverse);
  font-weight: 500;
}
```

**Mobile**: `overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;`

### 6.4 Card System

#### Base Card Anatomy
```css
.card {
  background: var(--color-surface);
  border-radius: 18px;    /* Slightly larger than v1's 16px — feels more premium */
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  position: relative;
  cursor: pointer;
}
```

#### Inner radius rule (visual-concentric-radius)
When a card has an inset badge or inner container:
```css
/* Inner radius = outer radius (18px) minus padding (12px) = 6px */
.card-badge { border-radius: 6px; }
```

#### 6.4.1 Article Card
```html
<article class="card card--standard">
  <div class="card-image" style="height: 200px;">
    <div class="card-gradient" style="background: var(--gradient-ochre);"></div>
    <div class="card-actions">
      <button class="card-action" aria-label="Pin"><!-- Pin icon --></button>
      <button class="card-action" aria-label="Delete"><!-- Delete icon --></button>
    </div>
  </div>
  <div class="card-body">
    <h3 class="card-title">Article Title in Newsreader</h3>
    <p class="card-excerpt">First 2 lines of content…</p>
    <footer class="card-meta">
      <span class="card-source">source.com</span>
      <time class="card-date">3 days ago</time>
    </footer>
  </div>
</article>
```

#### 6.4.2 Note Card
- Background: `var(--color-surface-raised)` — warm beige, not cream
- No image — full body text visible (truncated at 6 lines)
- Document icon: 16px, DM Sans size, `var(--text-muted)` at top-right
- Subtle ruled-lines pattern in background (CSS repeating-linear-gradient, 2% opacity)

#### 6.4.3 Quote Card (Dark)
- Background: `var(--color-surface-dark)`
- Use `text-wrap: balance` on the quote for even line lengths
- Large decorative `"` mark: Newsreader, 120px, `oklch(70% 0.01 60 / 0.15)`, positioned top-left (decorative)
- Attribution: `--text-muted` but lightened for dark background: `oklch(65% 0.01 60)`

#### 6.4.4 Video Card
- Play button: 52px circle, `oklch(99% 0 0 / 0.92)`, `backdrop-filter: blur(8px)`
- Duration badge: bottom-right, `oklch(14% 0.01 60 / 0.7)` frosted glass
- Both elements transition from `opacity: 0` to `opacity: 1` on card hover (80ms, no stagger)

#### 6.4.5 Book Card
- Image area: 3D book mockup using CSS perspective transform
- Book spine: CSS rotated rectangle, `oklch(35% 0.08 65)` (dark earthy)
- Author: `--text-muted`, italic, DM Sans 13px

#### 6.4.6 Product Card
- Price: `var(--text-primary)`, DM Sans 500, prominent — not tucked away
- Image: Square crop with `object-fit: cover`
- Category badge: pill style, `var(--color-surface-raised)`

### 6.5 Floating Action Button (FAB)
```css
.fab {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-surface-dark);
  color: var(--text-inverse);
  box-shadow: var(--shadow-lg);
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  z-index: var(--z-sticky);
}

/* Mobile — slightly inset for thumb comfort */
@media (width <= 767px) {
  .fab { bottom: 24px; right: 24px; }
}
```

> **Easter egg**: After clicking the FAB 10 times in one session, the icon briefly becomes a 🎯 for 1 second. Hidden. Rewarding to discover.

### 6.6 Empty State
```html
<section class="empty-state">
  <div class="empty-illustration">
    <!-- Animated SVG or Lottie — floating, gentle bob -->
  </div>
  <h1 class="empty-title">Your mind is empty.</h1>
  <p class="empty-subtitle">Start filling it.</p>
  <div class="empty-actions">
    <button class="btn-primary">Save your first item</button>
    <button class="btn-ghost">Install browser extension</button>
  </div>
  <!-- Animated arrow pointing toward FAB -->
  <div class="empty-cta-arrow" aria-hidden="true">
    <!-- SVG arrow that pulses toward FAB -->
  </div>
</section>
```

**Animation**:
```css
/* Floating illustration */
.empty-illustration {
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-12px); }
}

/* Arrow pulse toward FAB */
.empty-cta-arrow {
  animation: pulse-right 1.8s var(--ease-out-expo) infinite;
}
@keyframes pulse-right {
  0%, 100% { transform: translate(0, 0); opacity: 0.5; }
  50%       { transform: translate(8px, 8px); opacity: 1; }
}
```

---

## 7. Delight System (Selective Emphasis)

> *"Mastering delight is mastering selective emphasis."* — The less frequent the action, the more theatrical the response.

| Interaction | Frequency | Delight Level | Pattern |
|---|---|---|---|
| Card hover | Very high | Subtle | translateY(-4px) + shadow lift |
| Filter switch | High | Subtle | `background-color` crossfade |
| Search typing | High | None | Clean, professional — no animation |
| Save item | Occasional | Medium | Card fades in with bounce from FAB |
| Delete item | Occasional | Medium | Card collapses away (scale → 0, opacity → 0) |
| First save (ever) | Once | High | Full-screen confetti burst |
| 10th save | Once | Medium | Toast: "You're on a roll. 10 items saved." |
| Empty state → First save | Once | Theatrical | Empty state animates out; first card "drops" in |
| FAB ×10 easter egg | Rare | Theatrical | Brief icon change → "Found it!" console message |

### Save Animation (Card Drop)
When a user saves a new item:
1. FAB pulses (`scale(1) → scale(1.2) → scale(1)`, 200ms spring)
2. New card appears at top of grid: `translateY(-30px), opacity(0)` → `translateY(0), opacity(1)` (350ms spring)
3. Existing cards animate downward to make room (layout animation via `grid` + `transition: grid-template-rows`)

### Delete Animation
```css
.card.deleting {
  animation: card-delete 200ms var(--ease-in) forwards;
}
@keyframes card-delete {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95) translateY(-8px); }
}
```

### First Save — Confetti
```javascript
// Uses canvas-confetti (npm i canvas-confetti)
// Fires only once, gated by localStorage flag
if (!localStorage.getItem('glean-first-save')) {
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
  localStorage.setItem('glean-first-save', 'true');
}
```

---

## 8. Onboarding UX

### Philosophy (onboard skill)
- Get users to their "aha moment" — seeing a card they saved — as fast as possible.
- Teach features at the moment they're encountered, not all upfront.
- Experienced users can bypass everything.

### First Visit — Empty State
The empty state IS the onboarding. No separate tutorial. Rules:
1. **Show value immediately**: The 3 tips in the warm beige card reveal what Glean *can* hold.
2. **One primary CTA**: "Save your first item" (dark button). Extension install is secondary (ghost).
3. **The animated arrow**: Points from the empty state towards the FAB — teaches the gesture before explaining it.

### First Save — Contextual Discovery
After the first card appears:
- **Filter pills tooltip** appears after 1.5s (not immediately): *"Filter by type — as you save more, use these."*
  - Dismissable with Escape or clicking anywhere
  - `localStorage` gated — shows once only
  - Fades in (200ms), tethered visually to the pills component

### Search — First Use Hint
When user focuses search for the first time:
- Placeholder text animated from *"Search..."* to *"Try: 'articles about design'"* using a text crossfade (600ms)
- Shows once only (localStorage gated)

### Keyboard Shortcut Hint
- `⌘K` / `Ctrl+K` badge appears on the search bar on second visit (not first — don't overwhelm)
- Fades in with `opacity: 0 → 1` (300ms) after 2s delay on page load

---

## 9. Page Layouts

### 9.1 Dashboard — All Items
```
[Header — sticky, transparent until scroll]

[Search — centered, max-width 520px]
  spacing: var(--space-8) above, var(--space-6) below

[Filter Pills — horizontal row]
  spacing: var(--space-10) below

[Content Grid — 12-column]
  Feature card (4-col) | Standard (3-col) | Standard (3-col) | Compact (2-col)
  Wide (6-col) | Quote dark (3-col) | Note (3-col)
  ...

[FAB — fixed, bottom-right]
```

### 9.2 Filtered View (e.g. Articles)
- Section heading appears above grid: *"12 Articles"* in Newsreader 28px, animates in from `translateY(8px)`
- Cards become uniform size (`card--standard`) for visual consistency within a type

### 9.3 Search Results
- Results info: *"Found 4 results for 'design'"* — counter from 0 to N using `AnimatedNumber`
- Type filter tags appear with 30ms stagger below results count
- No results state: Illustrated, warm — *"Nothing matches that. Try shorter words."*

### 9.4 Mobile (< 768px)
- Single column grid
- All cards: full-width with `border-radius: 14px` (slightly reduced from desktop's 18px)
- Filter pills: `overflow-x: auto; scroll-snap-type: x mandatory;`
- FAB: `bottom: 24px, right: 24px`
- Header: Simplified — Logo only, avatar in top-right
- Search: Full width, `border-radius: 12px`
- No hover states (guarded by `@media (hover: hover)`)
- Collections link moved to avatar dropdown

### 9.5 Tablet (768–1023px)
- 8-column grid
- Feature cards: `span 4` (half width)
- Standard cards: `span 4` (half width)
- Side-by-side master-detail view for search results

---

## 10. Accessibility

### Color Contrast (WCAG AA)
- All body text on surfaces: ≥ 4.5:1 (verified for OKLCH values above)
- Interactive elements border: ≥ 3:1

### Focus Management
```css
:focus-visible {
  outline: 2px solid var(--text-primary);
  outline-offset: 3px;
  border-radius: 4px;  /* Soften focus ring */
}
/* Remove outline for mouse users — only show for keyboard */
:focus:not(:focus-visible) { outline: none; }
```

### ARIA
- Filter pills: `role="tablist"` + `role="tab"` + `aria-selected`
- Cards: `role="article"`, linked via `aria-labelledby` to card title
- FAB: `aria-label="Save new item"`
- Search: `role="search"`, `aria-label="Search your saved items"`
- Icon SVGs: `aria-hidden="true"` — SVGs are decorative; text provides meaning

### Touch Targets (Fitts's Law — `ux-fitts-target-size`)
- All interactive elements: minimum `44×44px` on mobile
- Card action buttons expand hit area via `::after` pseudo-element:
```css
.card-action::after {
  content: '';
  position: absolute;
  inset: -8px;  /* Expands hit target without changing visual size */
}
```

---

## 11. CSS Architecture
```
src/styles/
  base/
    _variables.css       All design tokens (colors, spacing, type, shadows, z-index, easing)
    _typography.css      Font imports, type scale, OpenType features
    _reset.css           Minimal reset (box-sizing, margin collapse)

  components/
    _header.css
    _search.css
    _filter-pills.css
    _cards.css           All card variants + card-action system
    _fab.css
    _empty-state.css
    _tooltips.css        Onboarding tooltip system

  layouts/
    _dashboard.css       Grid, container, section spacing
    _search-results.css

  motion/
    _transitions.css     All card, button, filter-pill transitions
    _keyframes.css       card-enter, card-delete, float, pulse animations
    _reduced-motion.css  Overrides for prefers-reduced-motion

  utilities/
    _helpers.css         .numeric, .label-uppercase, .sr-only, etc.
```

---

## 12. Implementation Checklist

### Foundations
- [ ] CSS variables: all tokens (colors, spacing, type, shadows, easing, z-index)
- [ ] Font loading: DM Sans + Newsreader with `font-display: swap`
- [ ] OpenType features: `font-optical-sizing: auto`, `font-variant-numeric: tabular-nums` on .numeric
- [ ] Reset + box-sizing

### Components
- [ ] Header: sticky + transparent-to-frosted scroll behavior
- [ ] Search: focus states, keyboard badge (2nd visit), clear button animation
- [ ] Filter pills: active state, mobile scroll-snap, ARIA roles
- [ ] Card base: border, radius, shadow, hover/active transitions (GPU-safe)
- [ ] All 6 card variants: Article, Note, Quote, Video, Book, Product
- [ ] Card actions: hover-reveal with 30ms stagger
- [ ] FAB: hover rotation, mobile positioning, easter egg (10×)
- [ ] Empty state: floating animation, arrow pulse, animated out on first save

### Motion
- [ ] Page load: card choreography (30ms stagger, 250ms duration)
- [ ] Card enter: `card-enter` keyframe
- [ ] Card delete: `card-delete` keyframe
- [ ] Save confetti: `canvas-confetti`, localStorage gated
- [ ] Reduced motion: override file applied

### Onboarding
- [ ] First save → confetti (localStorage gated)
- [ ] Filter pills tooltip: 1.5s delay after first save (localStorage gated)
- [ ] Search placeholder animation on first focus (localStorage gated)
- [ ] Keyboard shortcut badge: 2nd visit, 2s delay (sessionStorage gated)

### Responsive
- [ ] Mobile (< 768px): single column, thumb FAB, scroll-snap pills, simplified header
- [ ] Tablet (768–1023px): 8-column, feature card collapse
- [ ] Desktop (1024px+): 12-column, full hover states
- [ ] Hover guard: `@media (hover: hover)` on all hover states

### Accessibility
- [ ] `:focus-visible` ring (soft, 2px offset)
- [ ] ARIA on all interactive elements
- [ ] Touch target expansion (`::after` with `inset: -8px`)
- [ ] Single light source shadows verified
- [ ] WCAG AA contrast verified for all text/background combos

---

## Quick Reference Card

```css
/* Ground / surfaces */
--color-ground:  oklch(97.5% 0.008 70);
--color-surface: oklch(99% 0.005 75);

/* Text — all warm-tinted */
--text-primary:   oklch(16% 0.01 60);
--text-secondary: oklch(42% 0.012 60);
--text-tertiary:  oklch(58% 0.010 65);

/* Fonts */
--font-display: 'Newsreader', Georgia, serif;
--font-ui:      'DM Sans', system-ui, sans-serif;

/* Easing — always use */
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);
--ease-in:        cubic-bezier(0.4, 0, 1, 1);     /* exits only */

/* Card */
border-radius: 18px;
box-shadow: var(--shadow-sm);
hover: translateY(-4px), shadow: var(--shadow-lg);
transition: transform + box-shadow only, 180ms, --ease-out-quart;

/* Page load stagger */
animation: card-enter 250ms --ease-out-expo;
stagger: 30ms per card;
```

---

**Document Version**: V2.0
**Supersedes**: REDESIGN.md (V1.0)
**Skills Applied**: Family Values · animate · typeset · colorize · arrange · userinterface-wiki · onboard · adapt
**Status**: Ready for implementation
