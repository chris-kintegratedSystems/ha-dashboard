# Issue 1 — UX Real Estate / Dynamic Breakpoints — Proposal

**Status:** PROPOSAL — awaiting Chris review  
**Branch:** `phase/issue-1-breakpoints-proposal`  
**Date:** 2026-05-17  
**Scope:** mobilev2 Home + Settings only. No future-page speculation.

---

## 1. Detection Layer

### Approach: CSS-first, JS-bridged for card layout decisions

**CSS media queries** handle all purely visual adaptations (padding, gap, font scaling, grid tracks). They fire instantly with no JS dependency and produce zero FOUC.

**JS detection** (in `kis-app-shell.js`) publishes a breakpoint state object that custom cards read for structural layout decisions (e.g., control-panel choosing grid vs flex, priority-view choosing aspect-ratio behavior).

### Detection signals

| Signal | Method | Exposed as |
|--------|--------|-----------|
| Viewport width | `window.innerWidth` | Part of breakpoint classification |
| Viewport height | `window.innerHeight` | Part of breakpoint classification |
| Orientation | `screen.orientation.type` + `matchMedia('(orientation: portrait)')` | CSS `@media (orientation: portrait/landscape)` + JS `_breakpoint.orientation` |
| Pointer type | `matchMedia('(pointer: coarse)')` | CSS `@media (pointer: coarse)` + JS `_breakpoint.pointer` |

### Propagation mechanism

The app shell computes a **breakpoint name** and publishes it via:

1. **CSS custom property on `:root`** — `--kis-breakpoint: phone-portrait` (string, for debugging / rare CSS content tricks).
2. **Data attribute on `<body>`** — `data-kis-bp="phone-portrait"` — enables CSS selectors like `body[data-kis-bp="tablet-landscape"] .my-thing { ... }` from anywhere in the DOM (light or shadow, since attribute selectors on body propagate via inheritance of custom properties).
3. **`window.KIS_BREAKPOINT` object** — live reference read by custom cards in their `_update()` or `_render()` methods:
   ```js
   window.KIS_BREAKPOINT = {
     name: 'tablet-landscape',   // breakpoint classification
     orientation: 'landscape',   // 'portrait' | 'landscape'
     pointer: 'coarse',          // 'coarse' | 'fine'
     width: 1440,
     height: 900,
     columns: 2,                 // 1 or 2 — direct layout hint
     density: 'normal',          // 'compact' | 'normal' — see §3
   };
   ```

### Change detection

```js
const mqlOrientation = matchMedia('(orientation: portrait)');
const mqlPointer = matchMedia('(pointer: coarse)');
const mqlTwoCol = matchMedia('(min-width: 1100px)');

function recomputeBreakpoint() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const orient = w > h ? 'landscape' : 'portrait';
  const pointer = mqlPointer.matches ? 'coarse' : 'fine';
  const bp = classifyBreakpoint(w, h, orient, pointer);
  Object.assign(window.KIS_BREAKPOINT, bp);
  document.body.dataset.kisBp = bp.name;
  document.documentElement.style.setProperty('--kis-breakpoint', bp.name);
  // Notify registered cards
  for (const card of _registeredCards) {
    if (card._onBreakpointChange) card._onBreakpointChange(bp);
  }
}

mqlOrientation.addEventListener('change', recomputeBreakpoint);
window.addEventListener('resize', debounce(recomputeBreakpoint, 100));
```

`screen.orientation.addEventListener('change', ...)` fires on physical device rotation — covers iOS Companion and FKB rotation events that `resize` sometimes misses.

---

## 2. Breakpoint Taxonomy

### Named breakpoints

| Name | Predicate | Columns | Density |
|------|-----------|---------|---------|
| `phone-portrait` | width < 600 AND orientation = portrait | 1 | compact |
| `phone-landscape` | width < 600 AND orientation = landscape | 1 | compact |
| `tablet-portrait` | width ≥ 600 AND width < 1100 AND orientation = portrait | 1 | normal |
| `tablet-landscape` | width ≥ 1100 AND pointer = coarse | 2 | normal |
| `desktop` | width ≥ 1100 AND pointer = fine | 2 | normal |

### 6 test profiles → breakpoint mapping

| Device | Viewport | Orientation | Pointer | → Breakpoint |
|--------|----------|-------------|---------|--------------|
| Tab S9+ landscape | 1440×900 | landscape | coarse | `tablet-landscape` |
| iPad Pro 11" landscape | 1194×834 | landscape | coarse | `tablet-landscape` |
| Desktop 1920×1080 | 1920×1080 | landscape | fine | `desktop` |
| iPad Pro 11" portrait | 834×1194 | portrait | coarse | `tablet-portrait` |
| iPhone 17 Pro Max portrait | 430×932 | portrait | coarse | `phone-portrait` |
| iPhone 16 Pro portrait | 393×852 | portrait | coarse | `phone-portrait` |

### Edge case: 1440px desktop with mouse vs 1440px touch kiosk

- 1440px + `pointer: fine` → `desktop` (mouse-driven, hover states available)
- 1440px + `pointer: coarse` → `tablet-landscape` (touch-driven, larger hit targets)

Both get `columns: 2` and `density: normal`. The primary behavioral difference is that `desktop` enables hover-state affordances and slightly tighter spacing (since pointer precision is higher), while `tablet-landscape` enforces minimum 44×44px touch targets on interactive elements.

---

## 3. Token System

### Density tokens

Two density levels: `compact` (phones) and `normal` (tablets + desktop).

| Token | CSS Variable | compact | normal |
|-------|-------------|---------|--------|
| Card gap (vertical) | `--kis-spacing-h` | `6px` | `clamp(8px, 1vw, 12px)` |
| Card gap (horizontal) | `--kis-spacing-b` | `10px` | `clamp(12px, 1.5vw, 24px)` |
| Card internal padding V | `--kis-card-pad-v` | `10px` | `14px` |
| Card internal padding H | `--kis-card-pad-h` | `12px` | `16px` |
| Card height (locks/garages) | `--kis-card-h` | `60px` | `80px` |
| Scene button height | `--kis-scene-h` | `48px` | `64px` |
| Section label font size | `--kis-label-fs` | `9px` | `10px` |
| Card name font size | `--kis-name-fs` | `12px` | `14px` |
| Border radius | `--kis-radius` | `10px` | `14px` |
| Icon size (scene) | `--kis-icon-scene` | `20px` | `26px` |
| Touch target minimum | `--kis-touch-min` | `44px` | `44px` |

### Chrome heights (fixed, not density-dependent)

| Element | Height | Notes |
|---------|--------|-------|
| Header bar | 68px | Includes safe-area-inset-top on iOS |
| Nav bar | 80px | Includes safe-area-inset-bottom on iOS |
| Mini-player (when visible) | 52px | Only when media playing; positioned above nav |
| **Total chrome** | **148px** (no mini-player) / **200px** (with mini-player) | |

### Math justification: iPhone 16 Pro (393×852) — Home acceptance

Available height = 852 - 148 (chrome) = **704px** usable (no mini-player case)

Required elements in portrait (stacked vertically):
| Element | Height (compact tokens) | Notes |
|---------|------------------------|-------|
| Alarm pill | 28px | Inline with header — no separate vertical space needed (it's IN the header bar already) |
| Section label "SCENES" | 14px | Label above scene grid |
| Scene grid (6 buttons, 3×2) | 2 × 48 + 6 gap = **102px** | 2 rows of 48px buttons + 6px gap |
| Gap | 6px | |
| Section label "SECURITY" | 14px | |
| Locks (3 rows) | 3 × 60 + 2 × 6 = **192px** | 3 cards at 60px + 2 gaps |
| Gap | 6px | |
| Garage pair | 60px | Side-by-side at 60px height |
| Gap | 6px | |
| Section label "PRIORITY" | 14px | |
| Priority view (16:9 at full width) | 393 × 9/16 = **221px** | Full container width in portrait |
| Padding (top + bottom of sections container) | ~24px | 12px top + 12px bottom |
| **TOTAL** | **660px** | |

**660px < 704px available — fits with 44px margin.**

With mini-player active: 704 - 52 = 652px available. 660 > 652 = **8px overflow with mini-player.** Mitigation: in `phone-portrait` + mini-player-active, reduce scene row height from 48→44px (saves 8px) or reduce lock card height from 60→56px (saves 12px). The compact density tokens are the adjustment knobs; the mini-player shortfall is a documented edge case handled via a `body[data-kis-mini-active]` selector that shaves 2px per lock card.

### iPhone 17 Pro Max (430×932) — same calculation

Available = 932 - 148 = 784px. Same layout at 660px → **124px margin**. Comfortable even with mini-player (784 - 52 = 732 vs 660).

### Tab S9+ landscape (1440×900) — 2-column

Available = 900 - 148 = 752px usable height.

Left column:
| Element | Height | Notes |
|---------|--------|-------|
| Section label "SECURITY" | 16px | |
| Locks (3 rows) | 3 × 80 + 2 × 12 = **264px** | normal density |
| Gap | 12px | |
| Section label "GARAGE" | 16px | |
| Garage pair | 80px | Side-by-side |
| **Left total** | **388px** | |

Right column (priority view):
| Element | Height | Notes |
|---------|--------|-------|
| Section label "PRIORITY" | 16px | |
| Priority view 16:9 at column width | (1440-24 padding)/2 × 9/16 ≈ 708 × 9/16 = **398px** | Column width ~ 708px |

Scenes (full-width row above both columns):
| Element | Height | |
|---------|--------|--|
| Scene grid (1 row of 6) | 64px | All 6 fit in one row at normal density |
| Section label + gap | 22px | |
| **Scenes total** | **86px** | |

**Total height needed:** 86 (scenes) + max(388, 414) = 86 + 414 = **500px < 752px available.** Comfortable.

---

## 4. Component Impact

### kis-app-shell.js — Breakpoint engine + CSS variable injection

**New responsibilities:**
- `classifyBreakpoint(w, h, orient, pointer)` — pure function, returns breakpoint object
- `recomputeBreakpoint()` — called on resize/orientation change, updates CSS vars + notifies cards
- Inject density tokens as CSS custom properties on `:root` (already does this for theme colors — same pattern)
- Publish `window.KIS_BREAKPOINT` object
- Set `data-kis-bp` attribute on `<body>`
- New `_onBreakpointChange(bp)` callback protocol for registered cards (optional — cards that don't need it simply don't implement it)
- `getSectionsViewCSS()` updated: add `@media (orientation: portrait)` and `@media (orientation: landscape)` blocks for column-count control

**Structural change:** The `getSectionsViewCSS()` function currently returns a fixed CSS string. It needs to become orientation-aware to control whether `max_columns: 2` actually renders as 2 columns or collapses to 1. Currently HA's sections view handles this via its own width threshold, but we need to override it for explicit orientation control via injected CSS that forces the grid template.

### kis-control-panel.js — Height-aware, density-responsive

**Current state:** Uses hardcoded `769px` breakpoint for grid vs flex switch. Has `--cp-h: var(--kis-card-h, 80px)` — already wired to read a CSS variable.

**Changes needed:**
- Replace `@media (min-width: 769px)` with the new breakpoint system: grid mode when `columns: 2`, flex mode when `columns: 1`
- Read `--kis-card-h` from the density tokens (already partially done via CSS var)
- In portrait/compact mode: `--kis-card-h: 60px`, flex column, garage-pair side-by-side
- In landscape/normal mode: `--kis-card-h: 80px`, CSS Grid with row template, `contain: size`
- The card does NOT need to know its constrained height explicitly — it uses `height: 100%` on `:host` and `contain: size` in desktop mode, letting the parent grid section dictate available space. The density tokens handle the minimum sizes.

### kis-scenes.js — Density-responsive button sizing

**Current state:** `--sc-h: var(--kis-card-h, 64px)` — reads from CSS variable. Grid is `repeat(6, 1fr)`.

**Changes needed:**
- Read `--kis-scene-h` from density tokens instead of `--kis-card-h`
- In compact mode: `--kis-scene-h: 48px`, 3×2 grid (`grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr)`)
- In normal mode: `--kis-scene-h: 64px`, single row of 6 (`grid-template-columns: repeat(6, 1fr)`)
- The grid switch is CSS-only via `@media (max-width: 599px)` — phones get 3×2, everything else gets 1×6
- Icon and text scale via existing clamp() functions that reference `--kis-scene-h`

### kis-priority-view.js — Orientation-specific sizing + empty state

**Current state:** `.carousel-viewport { aspect-ratio: 16 / 9; }` — always 16:9 at full width.

**Changes needed:**
- **Portrait mode:** `aspect-ratio: 16/9` at full container width — keeps current behavior. The viewport fills the width and the height is derived. No change needed for portrait.
- **Landscape mode (2-column):** `aspect-ratio: 16/9` at column width. The priority view is in the right column (column_span: 1). Column width ≈ `(viewport - padding) / 2`. The viewport renders at that width × 9/16 height. This is the current behavior — `aspect-ratio: 16/9` already works correctly because the card fills its column width.
- **Key decision:** Priority view does NOT dictate viewport height in landscape. It sizes itself to its column width via aspect-ratio. If the left column is taller, the right column simply has empty space below the priority view. If the right column is taller (unlikely with current math), the left column stretches via `align-items: stretch` on the grid.
- **Empty state (no motion, carousel at rest):** The viewport placeholder already shows the default carousel items (vehicles, weather, radar). There is no true "empty" state. When `sensor.priority_camera == 'none'`, the carousel shows default items. The reserved space is always filled — no layout shift possible.

### kis-settings.js — Token consumption only

**Changes:** Reads density tokens for padding/gap. No structural changes. Already a single-column layout that works at any width.

### kis-dashboard-v2.yaml — No changes needed

The YAML already declares `max_columns: 2` for Home and `max_columns: 1` for Settings. The portrait-to-landscape column collapse is handled by the app shell's CSS injection into `hui-sections-view`, which overrides the grid template based on viewport orientation. The YAML structure stays as-is.

---

## 5. Files Touched + Anticipated Version Bumps

| File | Current Version | Projected Version | Change Type |
|------|----------------|-------------------|-------------|
| `kis-app-shell.js` | v36 (VERSION='2') | v37 | Detection layer, CSS var injection, breakpoint propagation |
| `kis-design-tokens.js` | v2 | v3 | Density token definitions, breakpoint taxonomy |
| `custom-cards/kis-control-panel.js` | v26 | v27 | Replace hardcoded 769px breakpoint with token system |
| `custom-cards/kis-scenes.js` | v9 | v10 | Scene grid responsive switch (6→3×2) + density tokens |
| `custom-cards/kis-priority-view.js` | v14 | v15 | Minimal — verify aspect-ratio still works at all breakpoints |
| `custom-cards/kis-settings.js` | v6 | v7 | Consume density tokens for spacing |
| `kis-dashboard-v2.yaml` | — | — | No changes anticipated |

**Total version bumps:** 5 files, 5 `lovelace_resources` cache-bust increments + 1 HA restart.

---

## 6. Risk Register

### R1: FOUC from breakpoint state arriving after initial render

**Risk:** Cards render at default density before the breakpoint engine publishes the correct tokens, causing a visible layout jump.

**Mitigation:** The density tokens are injected as CSS custom properties on `:root` BEFORE the `kis-ready` class is added (which is what makes `hui-sections-view` visible). The existing FOUC prevention system (`earlyHideLoop` + `armRevealGate`) already gates visibility until all cards are defined AND hass is available. We add one more gate condition: `window.KIS_BREAKPOINT.name !== null`. The breakpoint computation runs synchronously during `injectUI()` — it only reads `window.innerWidth/innerHeight` and `matchMedia()`, both available immediately. Zero async dependency.

**Residual risk:** Near-zero. CSS custom properties applied to `:root` before the reveal gate opens means no card sees the wrong tokens.

### R2: Layout shift on orientation change (rotation)

**Risk:** User rotates iPad from portrait to landscape. The layout changes from 1-column to 2-column. During the transition, cards may briefly render at wrong sizes.

**Mitigation:** The `recomputeBreakpoint()` handler fires on `orientationchange` + `resize`. It immediately updates CSS custom properties. Cards using `_onBreakpointChange()` can re-render their grid. CSS-only adaptations (via media queries) are instant. The only visible transition is the sections-view grid switching from 1→2 columns, which HA handles via its own reactive layout update once the injected CSS changes.

**Residual risk:** Low. HA's sections-view re-layouts on grid-template change. One frame of intermediate state possible — acceptable for a deliberate user action (rotation).

### R3: Interaction with kiosk toggle (Issue 2 patches)

**Risk:** Kiosk mode OFF adds sidebar (220px), reducing available width. A tablet-landscape viewport at 1440px with sidebar would be 1220px effective — still above 1100px threshold so breakpoint stays `tablet-landscape`. If kiosk mode is toggled while on the dashboard, the sidebar appearance changes available width but not the `window.innerWidth` (sidebar is inside HA's layout, not a viewport change).

**Mitigation:** The breakpoint system reads `window.innerWidth` which is the viewport width including sidebar space. When kiosk is OFF and sidebar is visible, the sections-view has less available width but the breakpoint classification doesn't change (it's still a wide viewport). The `--ha-view-sections-column-max-width: none` override already forces full-width sections within whatever space HA gives them. Cards use relative sizing (% of their container) not absolute viewport math.

**Residual risk:** Low. The sidebar reduces visual real estate but doesn't break the fit-single-screen constraint because the constraint targets chrome-free viewport height (which sidebar doesn't affect).

### R4: Interaction with first-nav patch (Issue 4 MutationObserver)

**Risk:** The `#view` MutationObserver that re-arms the reveal gate on navigation could interfere with breakpoint recomputation timing.

**Mitigation:** Breakpoint state is global and persistent — it doesn't reset on navigation. Only the reveal gate resets. The `patchHALayout` call that re-injects CSS after navigation re-injects the correct density-aware CSS (it reads the live `window.KIS_BREAKPOINT` state). No interference expected.

**Residual risk:** Negligible.

### R5: Cache-bust / lovelace_resources implications

**Risk:** 5 resource files need their `?v=N` bumped simultaneously. If one is missed, the old version loads and reads undefined CSS custom properties (falling back to defaults — not broken, but wrong density).

**Mitigation:** Stage 1 deploys detection layer + token system (app shell + design tokens) first. Cards consume tokens via CSS variables with fallback values that match their current behavior. Only Stage 2+ changes card behavior. This means a partial deploy (new app shell, old cards) produces identical visual output to today — the fallback values ARE today's values.

**Residual risk:** Low. Fallback values prevent visual regression during partial deploy.

### R6: HA architecture quirks — sections-view grid override

**Risk:** HA's `hui-sections-view` uses its own responsive breakpoint to decide column count. Our CSS injection must reliably override it. If HA updates its CSS specificity, our override could break.

**Mitigation:** The existing `getSectionsViewCSS()` already overrides HA's column width with `!important`. The new orientation-aware rules will follow the same specificity pattern. HA's sections-view respects `grid-template-columns` on its inner container — we inject that directly. Tested pattern (from existing deployment).

**Residual risk:** Medium on HA version upgrades. Pinned to current HA version behavior. Document the exact selector chain in `css_dom_patterns.md` for future-proofing.

### R7: Safe-area-inset interaction with chrome heights

**Risk:** iOS safe-area-inset-top/bottom add pixels to the chrome bars that the math in §3 doesn't account for.

**Mitigation:** The header already adds `env(safe-area-inset-top, 0px)` to its height. The nav bar adds `env(safe-area-inset-bottom, 0px)`. On iPhone 16 Pro, safe-area-inset-top ≈ 59px and safe-area-inset-bottom ≈ 34px. HOWEVER — the 852px viewport height already accounts for these (it's the CSS viewport, not the screen height). The safe-area insets are consumed by the chrome bars' internal padding, not added on top of the viewport. The math in §3 remains valid.

**Verification:** Confirm via DevTools device emulation that `window.innerHeight` reports 852 (not 852 + insets) on iPhone 16 Pro profile.

---

## 7. Phase Plan

### Stage 1: Detection layer + token plumbing (no visible change)

**Goal:** Deploy the breakpoint engine and density tokens. All cards continue to look exactly the same because token default values match current hardcoded values.

**Work:**
1. Add breakpoint classification function + event listeners to `kis-app-shell.js`
2. Add density token definitions to `kis-design-tokens.js`
3. Inject density tokens as CSS custom properties on `:root` from app shell
4. Add `window.KIS_BREAKPOINT` API + `_onBreakpointChange()` card protocol
5. Add breakpoint computation to the `armRevealGate()` prerequisite list
6. Deploy: bump kis-app-shell.js + kis-design-tokens.js cache-busts

**Stop gate:** Verify on all 6 profiles that the dashboard looks IDENTICAL to pre-deploy. Breakpoint is correctly classified (inspect `document.body.dataset.kisBp`). No FOUC. No layout shift.

**Verification:** Chrome DevTools Device Toolbar at all 6 profiles. Inspect CSS custom property values on `:root`. Confirm breakpoint name matches expectation per §2 table.

---

### Stage 2: Home view orientation-aware layout

**Goal:** Home view renders correctly at all 6 profiles with fit-single-screen constraint enforced.

**Work:**
1. Update `getSectionsViewCSS()` with orientation-aware grid template rules
2. Update `kis-scenes.js` — 3×2 grid on phones, 1×6 on tablets/desktop
3. Update `kis-control-panel.js` — replace `769px` media query with token-driven breakpoint
4. Verify `kis-priority-view.js` aspect-ratio behavior at all 6 profiles (likely no code change)
5. Deploy all 4 cards + app shell

**Stop gate:** Screenshot all 6 profiles. Verify acceptance criteria:
- All elements visible above the fold (no scroll needed on Home)
- Correct column layout per orientation
- Priority view maintains 16:9 in both orientations
- No element overlap or overflow

---

### Stage 3: Settings view token consumption

**Goal:** Settings page uses density tokens for consistent spacing.

**Work:**
1. Update `kis-settings.js` to consume `--kis-card-pad-v`, `--kis-card-pad-h`, `--kis-spacing-h`
2. Deploy

**Stop gate:** Settings page looks correct at all 6 profiles. No functional change — just token-driven spacing.

---

### Stage 4: 6-profile validation pass

**Goal:** Full sweep across all 6 profiles, both views, day + night theme.

**Work:**
1. Chrome DevTools Device Toolbar validation at each profile (per layout validation standard)
2. Document any edge cases found
3. Fix any issues
4. Final deploy

**Stop gate:** All 6 profiles pass acceptance criteria. Ready for real-device verification.

---

### Stage 5 (optional): Real-device verification

**Goal:** Confirm on physical hardware that the layout matches DevTools.

**Work:**
1. Tab S9+ landscape (Fully Kiosk hard refresh)
2. iPhone (Companion App)
3. Rotate iPad between portrait/landscape — verify live transition

**Stop gate:** Chris confirms on real devices. Issue 1 closed.

---

## Summary

The breakpoint system is deliberately minimal:
- 5 named breakpoints covering every device in the matrix
- 2 density levels (compact/normal)
- CSS-first where possible, JS only for structural layout decisions
- Existing FOUC prevention gates the reveal until tokens are injected
- No changes to dashboard YAML structure
- Staged deploy with stop gates prevents partial-breakage

The hardest constraint — fit-single-screen on iPhone 16 Pro in portrait — has 44px of margin in the no-mini-player case. The mini-player edge case (8px overflow) is handled by a targeted density adjustment that shaves 2px per lock card only when the mini-player is active on phones.
