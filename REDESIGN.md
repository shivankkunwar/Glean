# Glean UI Redesign Specification

## Overview

This document contains the complete redesign specification for Glean — transforming it from a generic bookmark manager into a sophisticated, mymind-inspired personal knowledge vault with earthy aesthetics, editorial typography, and organic layouts.

**Design Philosophy**: "Remember everything. Organize nothing." — Content-first, visual-rich, intentionally crafted.

---

## 1. Design Principles

### Core Philosophy
- **Content is King**: UI elements recede; saved content takes center stage
- **Visual Memory**: Rich previews, colors, and imagery help users remember what they saved
- **Organic Rhythm**: Varied card sizes and asymmetric layouts create visual interest
- **Editorial Sophistication**: Newsreader serif headlines paired with clean Inter UI elements
- **Warm Minimalism**: Earth tones, generous whitespace, subtle shadows

### Anti-Patterns Avoided
- ❌ Generic purple-blue gradients (AI slop aesthetic)
- ❌ Uniform card grids (boring repetition)
- ❌ Emoji as icons (inconsistent, unprofessional)
- ❌ Heavy navigation sidebars (visual noise)
- ❌ System fonts only (lacks personality)

---

## 2. Color Palette

### Primary Colors
```css
--color-background: #faf9f7;        /* Warm cream white */
--color-surface: #ffffff;            /* Pure white for cards */
--color-surface-variant: #f5f0e8;    /* Warm beige for notes */
--color-surface-dark: #1a1a1a;       /* Near black for accents */
```

### Content Colors (Earthy Tones)
```css
/* Gradients for content previews */
--gradient-ochre: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%);
--gradient-sand: linear-gradient(135deg, #c9b8a4 0%, #b8a690 100%);
--gradient-terracotta: linear-gradient(135deg, #c4b5a0 0%, #b0a08c 100%);
--gradient-sage: linear-gradient(135deg, #a89080 0%, #988070 100%);
--gradient-warm-gray: linear-gradient(135deg, #b8a090 0%, #a89080 100%);
```

### Text Colors
```css
--text-primary: #1a1a1a;             /* Near black */
--text-secondary: #4b5563;           /* Dark gray */
--text-tertiary: #6b6b6b;            /* Medium gray */
--text-muted: #9ca3af;               /* Light gray */
--text-inverse: #ffffff;             /* White on dark */
```

### UI Colors
```css
--border-light: #e5e3e0;             /* Subtle borders */
--border-medium: #e5e7eb;            /* Standard borders */
--input-bg: #f0eeeb;                 /* Input backgrounds */
--hover-bg: #f3f4f6;                 /* Hover states */
```

---

## 3. Typography System

### Font Families
```css
/* Headlines - Editorial personality */
--font-display: 'Newsreader', Georgia, serif;

/* UI Elements - Clean and functional */
--font-ui: 'Inter', system-ui, sans-serif;
```

### Type Scale

| Element | Font | Size | Weight | Line Height | Letter Spacing |
|---------|------|------|--------|-------------|----------------|
| Logo | Newsreader | 24px | 500 | 1.2 | -0.5px |
| H1 (Page Title) | Newsreader | 32px | 500 | 1.2 | -0.5px |
| H2 (Section) | Newsreader | 28px | 500 | 1.3 | -0.3px |
| H3 (Card Title Large) | Newsreader | 20px | 500 | 1.3 | -0.2px |
| H4 (Card Title Standard) | Newsreader | 16-18px | 500 | 1.3 | -0.1px |
| Body | Inter | 15px | 400 | 1.6 | 0 |
| Body Small | Inter | 13-14px | 400 | 1.5 | 0 |
| Caption | Inter | 11-12px | 400 | 1.4 | 0 |
| Label | Inter | 10-12px | 500 | 1.2 | 0.5px (uppercase) |
| Button | Inter | 14px | 500 | 1 | 0 |

### Typography Patterns
- **Headlines**: Newsreader with slight negative letter-spacing for elegance
- **Body Text**: Inter, comfortable 1.6 line-height for readability
- **Labels**: Uppercase, letter-spacing 0.5px, font-weight 500
- **URLs/Sources**: Inter, 12px, color: text-muted

---

## 4. Layout System

### Container
```css
max-width: 1400px;
margin: 0 auto;
padding: 0 48px;
```

### Grid System
**Desktop (1440px+)**
- 12-column CSS Grid
- Column gap: 24px
- Row gap: 24px
- Cards span: 2-4 columns (varied for organic feel)

**Card Size Variants**
- **Feature Card**: 4 columns × 2 rows (tall)
- **Wide Card**: 2-3 columns × 1 row
- **Standard Card**: 2-3 columns × 1 row
- **Compact Card**: 2 columns × 1 row

### Spacing Scale
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 20px;
--space-2xl: 24px;
--space-3xl: 32px;
--space-4xl: 48px;
```

### Responsive Breakpoints
```css
/* Mobile */
@media (max-width: 767px) {
  /* Single column, full-width cards */
  grid-template-columns: 1fr;
  padding: 0 20px;
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  /* 2-column grid */
  grid-template-columns: repeat(2, 1fr);
}

/* Desktop */
@media (min-width: 1024px) {
  /* 12-column grid as specified */
}
```

---

## 5. Components

### 5.1 Header
**Structure**
- Logo (left): "Glean" in Newsreader, 24px
- Navigation (right): Collections link + User avatar
- No sidebar
- Background: transparent
- Padding: 20px 48px

**Avatar**
- Size: 32px × 32px
- Border-radius: 50%
- Background: #1a1a1a
- Text: White, 12px, first letter of name

### 5.2 Search Bar
**Default State**
- Width: 100%, max-width: 500px
- Background: #f0eeeb
- Border: none
- Border-radius: 12px
- Padding: 12px 44px 12px 44px (left space for icon)
- Font: Inter, 15px
- Placeholder: "Search..."

**Active State**
- Border: 2px solid #1a1a1a
- Background: #ffffff

**Keyboard Shortcut Badge**
- Position: Absolute right
- Padding: 4px 8px
- Background: #e5e3e0
- Border-radius: 6px
- Font: 12px, text-muted

### 5.3 Filter Pills
**Default State**
- Padding: 8px 16px
- Background: transparent
- Border: 1px solid #e5e3e0
- Border-radius: 20px
- Font: Inter, 13px, color: #6b6b6b

**Active State**
- Background: #1a1a1a
- Border: none
- Color: white
- Font-weight: 500

**Layout**
- Display: flex
- Gap: 12px
- Horizontal scroll on mobile

### 5.4 Cards

#### 5.4.1 Article Card
```html
<div class="card">
  <div class="card-image" style="height: 200px; background: gradient;"></div>
  <div class="card-content" style="padding: 20px;">
    <h3 class="card-title">Title in Newsreader</h3>
    <p class="card-description">Description in Inter</p>
    <span class="card-source">Source URL</span>
  </div>
</div>
```

**Specs**
- Background: #ffffff
- Border-radius: 16px
- Box-shadow: 0 1px 3px rgba(0,0,0,0.04)
- Hover: translateY(-4px), shadow: 0 12px 24px rgba(0,0,0,0.12)
- Transition: all 200ms cubic-bezier(0.25, 1, 0.5, 1)

#### 5.4.2 Note Card
- Background: #f5f0e8 (warm beige)
- No image
- Full text content visible
- Border-radius: 16px
- Icon: Document SVG

#### 5.4.3 Book Card
- Image area: 3D book visualization or solid color
- Book spine mockup (CSS rotated rectangle)
- Border-radius: 16px

#### 5.4.4 Video Card
- Play button overlay: 56px circle, white background
- Duration badge: bottom-right corner
- Video type badge: top-left corner

#### 5.4.5 Product Card
- Image area: Product thumbnail or gradient
- Price badge: prominent
- Border-radius: 16px

#### 5.4.6 Quote Card
- Background: #1a1a1a (dark)
- Text: White, italic, Newsreader
- Border-radius: 16px
- Attribution: text-muted

### 5.5 Floating Action Button (FAB)
- Position: Fixed, bottom: 32px, right: 32px
- Size: 56px × 56px
- Background: #1a1a1a
- Border-radius: 50%
- Icon: Plus SVG, white, 24px
- Shadow: 0 4px 20px rgba(0,0,0,0.15)
- Hover: Scale 1.05

### 5.6 Empty State
- Centered vertically and horizontally
- Illustration: Circle with plus icon, 200px
- Background: gradient warm gray
- Title: "Your mind is empty", Newsreader, 32px
- Subtitle: Descriptive text, Inter, 16px
- CTA Buttons: Primary (dark) + Secondary (outline)
- Tips section: Warm beige background, numbered list

### 5.7 Search Results
- Active search input with query text
- Results count: "Found X results for 'query'"
- Type filter tags with counts
- Cards displayed in grid

---

## 6. Animations & Interactions

### Card Hover
```css
.card {
  transition: all 200ms cubic-bezier(0.25, 1, 0.5, 1);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.12);
}
```

### Action Buttons (on card hover)
- Appear: opacity 0 → 1, scale(0.9) → scale(1)
- Duration: 150ms
- Stagger: 30ms delay between buttons
- Easing: cubic-bezier(0.22, 1, 0.36, 1)

### Press/Active State
```css
.card:active {
  transform: scale(0.98);
  transition: all 100ms;
}
```

### Filter Pill Transition
```css
.filter-pill {
  transition: all 200ms ease;
}
```

### FAB Hover
```css
.fab:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 24px rgba(0,0,0,0.2);
}
```

### Page Load Animation
- Cards fade in with stagger
- Duration: 300ms per card
- Stagger: 50ms
- Transform: translateY(20px) → translateY(0)
- Opacity: 0 → 1

---

## 7. Page Layouts

### 7.1 Dashboard - All View
**Structure**
```
[Header]
  - Logo (left)
  - Collections + Avatar (right)

[Search Section]
  - Search bar (centered, max-width: 500px)

[Filter Pills]
  - Horizontal row of pill buttons
  - "All" active by default

[Content Grid]
  - Mixed card types and sizes
  - Feature cards, standard cards, notes, etc.

[Floating Action Button]
  - Bottom-right corner
```

### 7.2 Dashboard - Filtered View (Articles)
**Structure**
```
[Header]
[Search]
[Filter Pills]
  - "Articles" pill active (dark background)

[Section Title]
  - "12 Articles" in Newsreader, 28px

[Content Grid]
  - Article cards only
  - Uniform card size for consistency
```

### 7.3 Empty State
**Structure**
```
[Header]
[Centered Content]
  - Illustration (200px circle with plus)
  - Title: "Your mind is empty"
  - Subtitle: Description
  - CTA Buttons: "Save your first item", "Install browser extension"
  - Tips section: 3 numbered tips in warm beige card
```

### 7.4 Search Results
**Structure**
```
[Header]
[Active Search Bar]
  - Query text visible
  - Clear button (X)

[Results Info]
  - "Found X results for 'query'"

[Type Filter Tags]
  - "All types" (active)
  - "Articles (2)"
  - "Videos (1)"
  - "Notes (1)"

[Results Grid]
  - Mixed content types
  - Type badges on cards
```

### 7.5 Mobile View (390px)
**Adaptations**
- Single column layout
- Full-width cards
- Horizontal scroll for filter pills
- FAB positioned for thumb reach
- Reduced padding (20px instead of 48px)
- Simplified header

---

## 8. Assets & Resources

### Required Fonts
```html
<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

### Required SVG Icons
- Search/magnifying glass
- Plus (for FAB)
- Document (for notes)
- Play button (for videos)
- X/Close (for search clear)
- Pin, Edit, Delete (for card actions)
- Arrow icons

### Icon Specifications
- Size: 16-24px depending on context
- Stroke width: 1.5-2px
- Stroke-linecap: round
- Stroke-linejoin: round
- Color: Inherits from text color

---

## 9. Accessibility

### Color Contrast
- All text meets WCAG AA (4.5:1 ratio minimum)
- Interactive elements: 3:1 ratio minimum

### Focus States
- Visible focus rings on all interactive elements
- Focus ring: 2px solid #1a1a1a, 2px offset

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Touch Targets
- Minimum: 44px × 44px on mobile
- Adequate spacing between touch targets

---

## 10. Implementation Notes

### CSS Architecture
```css
/* Recommended structure */
base/
  - variables.css      /* All design tokens */
  - typography.css     /* Font imports & type scale */
  - reset.css          /* Normalize/reset */

components/
  - header.css
  - search.css
  - filter-pills.css
  - cards.css
  - fab.css

layouts/
  - dashboard.css
  - empty-state.css
  - search-results.css

animations/
  - transitions.css
  - keyframes.css
```

### Key Implementation Details
1. **CSS Variables**: Use the color and spacing tokens defined above
2. **Grid**: Use CSS Grid with auto-fill for responsive behavior
3. **Cards**: Use consistent border-radius (16px) and shadows
4. **Typography**: Always use the font stack variables
5. **Images**: Use aspect-ratio for consistent image sizing
6. **Hover**: Implement on desktop only with @media (hover: hover)

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 11. Design to Code Checklist

Before implementing, ensure:
- [ ] Fonts loaded (Newsreader + Inter)
- [ ] CSS variables defined
- [ ] Color palette implemented
- [ ] Card component created with hover states
- [ ] Search component with keyboard shortcut
- [ ] Filter pills with active state
- [ ] FAB positioned and styled
- [ ] Grid system responsive
- [ ] Empty state designed
- [ ] Animations implemented (with reduced motion support)
- [ ] Touch targets sized correctly
- [ ] Focus states visible

---

## 12. Version History

- **v1.0** (March 2025): Initial redesign specification
  - Complete color palette (earthy tones)
  - Typography system (Newsreader + Inter)
  - Component library
  - All dashboard views specified
  - Animation specifications
  - Responsive breakpoints

---

## Quick Reference Card

```css
/* Colors */
--bg: #faf9f7;
--surface: #ffffff;
--text: #1a1a1a;
--text-secondary: #6b6b6b;

/* Typography */
--font-display: 'Newsreader', Georgia, serif;
--font-ui: 'Inter', system-ui, sans-serif;

/* Spacing */
--gap: 24px;
--padding: 48px;

/* Card */
border-radius: 16px;
box-shadow: 0 1px 3px rgba(0,0,0,0.04);
hover: translateY(-4px), shadow 0 12px 24px rgba(0,0,0,0.12);

/* Transitions */
transition: all 200ms cubic-bezier(0.25, 1, 0.5, 1);
```

---

**Document Status**: Complete  
**Last Updated**: March 2025  
**Author**: UI/UX Design Team  
**Review**: Ready for implementation
