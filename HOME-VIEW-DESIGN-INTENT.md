# KIS mobilev1 — Home View Design Intent
**Date:** 2026-04-23 | **Status:** AUTHORITATIVE — read before any Home view work  
**Supersedes:** any conflicting prior doc (v16, v17, prior session handoffs)

## The anchor

**Everything scales from one thing: the priority card's 16:9 aspect ratio.**

```
priority_zone_width (derived from column width)
priority_zone_height = priority_zone_width × 9/16
```

This is the ONLY fixed ratio in the design. Every other dimension on the Home view derives from it through CSS calc + clamp. No hardcoded pixel values in card content anywhere.

## Two layouts, one philosophy

### Landscape (≥ 1100px wide) — 2-column
```
┌──────────────────────────────────────────────────────────┐
│  Header (kis-nav header bar — fixed, 68px)              │
├──────────────────────────────────────────────────────────┤
│  SCENES (full-width row, 5 cards side-by-side)           │
│  [Secure] [Morning] [Night] [Welcome] [Movie]            │
├─────────────────────────┬────────────────────────────────┤
│  SECURITY               │  PORSCHE 911 (or motion cam)  │
│  [Front Door]           │  ┌──────────────────────────┐ │
│  [Back Door]            │  │                          │ │
│  [Gemelli]              │  │    Priority zone         │ │
│  GARAGE                 │  │    (16:9 of col width)   │ │
│  [Left] [Right]         │  │                          │ │
│                         │  └──────────────────────────┘ │
└─────────────────────────┴────────────────────────────────┘
                                 ↑
             Left column bottom ═ Right column bottom
             (priority zone height drives card heights)
```

### Portrait (< 1100px wide) — 1-column
```
┌──────────────────────────┐
│  Header                  │
├──────────────────────────┤
│  SCENES (5 across)       │
│  [S][M][N][W][Mv]        │
├──────────────────────────┤
│  SECURITY                │
│  [Front Door]            │
│  [Back Door]             │
│  [Gemelli]               │
├──────────────────────────┤
│  GARAGE                  │
│  [Left]    [Right]       │  ← 2 cards side-by-side
├──────────────────────────┤
│  PORSCHE 911 / MOTION    │
│  ┌────────────────────┐  │
│  │  Priority zone     │  │  ← 16:9 of viewport width
│  │  (16:9)            │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

## Card sizing contract

**Scenes** (always a single row of 5, regardless of orientation):
- Card height = `--kis-card-h`
- In landscape: scene cards sit at top, full-width row
- In portrait: scene cards are the first section, full-width row

**Locks** (3 stacked):
- Each card height = `--kis-card-h`
- All 3 same height, uniform

**Garage** (2 side-by-side):
- Each card height = `--kis-card-h`
- Same height as locks

**Priority zone:**
- Height = `--kis-zone-h` = column_width × 9/16
- In landscape: column_width = right column width
- In portrait: column_width = viewport width minus padding

## Height derivation formula

```
// Landscape 2-col mode:
--kis-zone-h = right_column_width × 9/16
--kis-card-h = (--kis-zone-h − section_labels − gaps) / 4

Where:
  4 = 3 locks + 1 garage row (which is itself 1 row of 2 side-by-side)
  section_labels = SECURITY label + GARAGE label (~40px)
  gaps = inter-card gaps + label-to-card gaps

// Portrait 1-col mode:
--kis-zone-h = viewport_width × 9/16
--kis-card-h = computed similarly, but only one column's math matters
```

Both `--kis-card-h` and `--kis-zone-h` are published as CSS custom properties on `<html>` by kis-nav.js. Cards subscribe via `min-height: var(--kis-card-h)`.

## Content scales with card height

All content inside cards scales proportionally via `clamp()` and `calc()`:

```css
/* Example formulas — NOT binding values, illustrative */
icon-size:        clamp(14px, calc(var(--kis-card-h) * 0.30), 28px)
chip-size:        clamp(24px, calc(var(--kis-card-h) * 0.58), 48px)
chip-padding:     clamp(4px, calc(var(--kis-card-h) * 0.12), 10px)
card-padding:     clamp(6px, calc(var(--kis-card-h) * 0.18), 14px)
timestamp-font:   clamp(7px, calc(var(--kis-card-h) * 0.14), 11px)
name-font:        clamp(9px, calc(var(--kis-card-h) * 0.17), 14px)
pill-font:        clamp(8px, calc(var(--kis-card-h) * 0.13), 10px)
pill-padding:     clamp(2px 6px, calc(var(--kis-card-h) * 0.06) calc(var(--kis-card-h) * 0.13), 4px 10px)
```

When `--kis-card-h` is 83px (Tab S9 landscape): content renders at generous, app-like scale.
When it's 65px (iPad landscape): content renders at comfortable compact scale.
When it's 48px (iPhone portrait): content renders at dense iOS-list scale.

**Rule: no hardcoded pixel values inside card content. Everything derives.**

## What "right" looks like on every device

| Device | Mode | Scene row | Col layout | Columns aligned | Priority zone visible on initial load |
|---|---|---|---|---|---|
| Tab S9+ landscape | 2-col | 5 across, full-width top | Security/Garage left, Porsche right | Bottom-aligned ≤ 2px | Yes |
| iPad landscape | 2-col | 5 across, full-width top | Same | Bottom-aligned ≤ 2px | Yes |
| iPad portrait | 1-col stack | 5 across | All sections stack | n/a (single column) | Yes |
| Tab S9 portrait | 1-col stack | 5 across | All sections stack | n/a | Yes |
| iPhone landscape | 1-col stack | 5 across | All sections stack | n/a | May require slight scroll acceptable |
| iPhone portrait | 1-col stack | 5 across | All sections stack | n/a | Yes |

## Priority zone swap-in (motion camera)

When motion is detected on a priority camera, the zone content swaps from Porsche 911 to live camera feed + "MOTION: [camera name]" red label. Zone dimensions unchanged — 16:9 anchor holds. No layout shift.

## What this design does NOT include

- Dinner Time scene (removed)
- Away scene (removed — Secure covers "I'm leaving")
- `max-width: calc(55vh * 16/9)` cap on phone cards (unnecessary constraint — removed)
- Media queries that scope card heights to viewport ranges (heights derive from anchor math, no viewport-scoped hardcodes)
- Any `!important` in kis-nav.js injected CSS (last resort only, must be justified inline)

## Hard constraints

- **Dynamic, no hardcoded card heights.** Every height derives from `--kis-zone-h` or its derivative `--kis-card-h`.
- **Dynamic, no hardcoded content sizes.** Every font, icon, padding uses clamp + calc against `--kis-card-h`.
- **Two column layout above 1100px viewport. One column below.** This one threshold is hardcoded intentionally — it marks the architectural split between "priority zone as right-column anchor" and "priority zone as bottom-stack element."
- **5 scenes, 3 locks, 2 garages.** Counts are fixed design decisions, not responsive.

## Reference screenshots

Canonical portrait (from iPhone deployed state, motion camera active):
*see Drive ha-dashboard folder — portrait reference images from 2026-04-23 session*

Canonical landscape (target state, not yet achieved):
- Left column bottom edge aligns with right column (priority zone) bottom edge
- All 5 cards in left column are the same height
- Content inside each card fills the card comfortably — no empty white space at the bottom of the priority zone, no cramped text in the locks
