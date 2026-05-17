# Issue 1 — UX Real Estate / Dynamic Breakpoints — Proposal

**Status:** PROPOSAL — revision 2 per Chris review  
**Branch:** `phase/issue-1-breakpoints-proposal`  
**Date:** 2026-05-17 (revised 2026-05-17)  
**Scope:** mobilev2 Home + Settings only. No future-page speculation.

---

## 1. Detection Layer

### Approach: CSS-first, JS-bridged for card layout decisions

**CSS media queries** handle all purely visual adaptations (padding, gap, font scaling, grid tracks). They fire instantly with no JS dependency and produce zero FOUC.

**JS detection** (in `kis-app-shell.js`) publishes a breakpoint state object that custom cards read for structural layout decisions (e.g., control-panel choosing grid vs flex).

### Detection signals

| Signal | Method | Exposed as |
|--------|--------|-----------|
| Viewport width | `window.innerWidth` | Part of breakpoint classification |
| Viewport height | `window.innerHeight` | Part of breakpoint classification |
| Orientation | `screen.orientation.type` + `matchMedia('(orientation: portrait)')` | CSS `@media (orientation: portrait/landscape)` + JS `_breakpoint.orientation` |
| Pointer type | `matchMedia('(pointer: coarse)')` | CSS `@media (pointer: coarse)` + JS `_breakpoint.pointer` |

### Propagation mechanism

The app shell computes a **breakpoint name** and publishes it via two mechanisms with distinct reach:

**Mechanism 1 — CSS custom properties on `:root`** (PRIMARY card consumption path)

CSS custom properties set on `document.documentElement` inherit through all shadow DOM boundaries. Cards in their shadow roots read these via `var(--kis-card-h, fallback)` without any cross-boundary workaround. This is how density tokens reach card internals.

Also includes `--kis-breakpoint: phone-portrait` (string value, for debugging or CSS `content:` tricks only — not usable in selectors).

**Mechanism 2 — Data attribute `data-kis-bp` on `<body>`** (light-DOM-only)

Enables CSS selectors like `body[data-kis-bp="tablet-landscape"] .target { ... }` for app-shell-injected styles that target HA chrome elements in the light DOM. This attribute is **NOT usable from inside a custom card's shadow DOM** — shadow boundaries block ancestor attribute selectors. Use for: debugging, app-shell CSS that patches HA elements directly, top-level page styling injected via `injectShadowCSS` into HA's shadow roots (where the selector targets elements within that same shadow root, gated by a class or attribute the shell sets on a reachable element).

**Mechanism 3 — `window.KIS_BREAKPOINT` object** (debug + initial-render fallback)

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

This object is exposed for debugging and as a **synchronous read during initial `_render()`** only. It is NOT the canonical way to react to breakpoint changes — see §1.4 below.

### Change detection + canonical subscription pattern

```js
const mqlOrientation = matchMedia('(orientation: portrait)');
const mqlPointer = matchMedia('(pointer: coarse)');

function recomputeBreakpoint() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const orient = w > h ? 'landscape' : 'portrait';
  const pointer = mqlPointer.matches ? 'coarse' : 'fine';
  const bp = classifyBreakpoint(w, h, orient, pointer);
  Object.assign(window.KIS_BREAKPOINT, bp);
  document.body.dataset.kisBp = bp.name;
  document.documentElement.style.setProperty('--kis-breakpoint', bp.name);
  // Inject density tokens as CSS vars on :root
  applyDensityTokens(bp.density);
  // Notify subscribed cards
  for (const card of _registeredCards) {
    if (card._onBreakpointChange) card._onBreakpointChange(bp);
  }
}

mqlOrientation.addEventListener('change', recomputeBreakpoint);
window.addEventListener('resize', debounce(recomputeBreakpoint, 100));
```

`screen.orientation.addEventListener('change', ...)` fires on physical device rotation — covers iOS Companion and FKB rotation events that `resize` sometimes misses.

**Canonical subscription rule:** Cards that need to re-layout structurally on breakpoint change (e.g., grid↔flex switch) MUST implement `_onBreakpointChange(bp)` and trigger their re-render there. Cards that only consume CSS custom properties (density tokens) adapt automatically via the cascade and do NOT need a callback. `window.KIS_BREAKPOINT` is a debug/inspection surface and a synchronous-read fallback for initial `_render()` — never polled in `_update()`.

Follow-up: update `MOBILEV2_ARCHITECTURE.md` §7 (Page Authoring Checklist) to document the `_onBreakpointChange` protocol when Stage 1 ships.

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

Both get `columns: 2` and `density: normal`. Desktop reuses tablet-landscape density because KIS client demos on a desktop browser benefit from a familiar tablet aesthetic — the same layout the client sees on their wall-mounted Tab S9 — not a sysadmin-console density. The ONLY desktop-specific behavior is CSS `:hover` state affordances on interactive elements (subtle background highlight on lock/garage cards, scene buttons). No additional spacing or sizing changes.

### Phone-landscape acceptance criteria

**Behavior:** Scroll permitted on phone-landscape. Fit-single-screen is NOT enforced.

**Rationale:** At iPhone 16 Pro landscape (852×393), the usable height after chrome is 393 - 148 = 245px. There is no physically possible layout that renders all Home acceptance criteria elements (scenes + locks + garages + priority view) in 245px without either making them unusably small or removing content. Phone-landscape is an incidental orientation — users land here when they pick up the phone at an angle or auto-rotation fires unexpectedly. The correct UX is to allow scrolling and show all content at compact density in DOM order (same as portrait), not to block or reshape content.

**Acceptance criteria for phone-landscape (852×393 and 956×440):**
- All Home elements render correctly (no overflow, no clipping, no overlap)
- Compact density tokens apply (same as phone-portrait)
- DOM order matches portrait (scenes → security → garage → priority)
- Vertical scroll enabled — no fit-single-screen constraint
- Priority view renders at 16:9 aspect ratio relative to viewport width (852 × 9/16 = 479px tall — taller than viewport, requires scroll; this is acceptable)
- No rotation hint overlay, no "rotate device" message
- Cards remain fully interactive at compact density touch targets (≥44px)

---

## 3. Token System

### Density tokens

Two density levels: `compact` (phones) and `normal` (tablets + desktop).

| Token | CSS Variable | compact | normal |
|-------|-------------|---------|--------|
| Card gap (vertical) | `--kis-spacing-h` | `4px` | `clamp(8px, 1vw, 12px)` |
| Card gap (horizontal) | `--kis-spacing-b` | `8px` | `clamp(12px, 1.5vw, 24px)` |
| Card internal padding V | `--kis-card-pad-v` | `8px` | `14px` |
| Card internal padding H | `--kis-card-pad-h` | `10px` | `16px` |
| Card height (locks/garages) | `--kis-card-h` | `54px` | `80px` |
| Scene button height | `--kis-scene-h` | `44px` | `64px` |
| Section label font size | `--kis-label-fs` | `9px` | `10px` |
| Section label height (line + margin) | (derived) | `12px` | `16px` |
| Card name font size | `--kis-name-fs` | `11px` | `14px` |
| Border radius | `--kis-radius` | `10px` | `14px` |
| Icon size (scene) | `--kis-icon-scene` | `18px` | `26px` |
| Touch target minimum | `--kis-touch-min` | `44px` | `44px` |
| Sections container padding (top + bottom) | (derived) | `16px` | `24px` |

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
| Section label "SCENES" | 12px | 9px font + 3px margin |
| Scene grid (6 buttons, 3×2) | 2 × 44 + 4 gap = **92px** | 2 rows of 44px buttons + 4px gap |
| Gap between sections | 4px | |
| Section label "SECURITY" | 12px | |
| Locks (3 rows) | 3 × 54 + 2 × 4 = **170px** | 3 cards at 54px + 2 gaps |
| Gap | 4px | |
| Garage pair | 54px | Side-by-side at 54px height |
| Gap between sections | 4px | |
| Section label "PRIORITY" | 12px | |
| Priority view (16:9 at full width) | (393 - 16 padding) × 9/16 = 377 × 9/16 = **212px** | Container width minus L+R 8px each |
| Sections container padding (top + bottom) | 16px | 8px top + 8px bottom |
| **TOTAL** | **592px** | |

**592px < 704px available — fits with 112px margin (16%).** Target of ≥80px exceeded.

### iPhone 16 Pro — with mini-player active

Available = 704 - 52 = **652px**. Layout at 592px → **60px margin (9%).** Target of ≥40px exceeded.

No special `body[data-kis-mini-active]` patch needed — the tightened compact tokens provide sufficient margin in both cases without conditional density adjustments.

### iPhone 17 Pro Max (430×932) — same calculation

Available = 932 - 148 = **784px** (no mini-player).

Priority view at full width: (430 - 16) × 9/16 = 414 × 9/16 = **233px**.  
Scenes: 2 × 44 + 4 = 92px. Locks: 3 × 54 + 2 × 4 = 170px. Garage: 54px.  
Labels: 4 × 12 = 48px. Gaps: 3 × 4 = 12px. Padding: 16px.  
**Total: 625px.** Margin: **159px (20%).** Comfortable.

With mini-player: 784 - 52 = 732. Margin: **107px.** Well above 40px target.

iPhone 17 Pro Max gets full 16:9 priority view — same layout as iPhone 16 Pro.

### Tab S9+ landscape (1440×900) — 2-column

Available = 900 - 148 = **752px** usable height.

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
| **Right total** | **414px** | |

Scenes (full-width row above both columns):
| Element | Height | |
|---------|--------|--|
| Scene grid (1 row of 6) | 64px | All 6 fit in one row at normal density |
| Section label + gap | 22px | |
| **Scenes total** | **86px** | |

**Total height needed:** 86 (scenes) + max(388, 414) = 86 + 414 = **500px < 752px available.** Margin: **252px (34%).** Comfortable.

---

## 4. Component Impact

### 4.1 Per-card subscription matrix

| Card | Breakpoint mechanism | Reason |
|------|---------------------|--------|
| `kis-app-shell.js` | Owns publication — no subscription | Computes + publishes breakpoints |
| `kis-control-panel.js` | **Subscribes** via `_onBreakpointChange(bp)` | Structural grid↔flex layout switch |
| `kis-scenes.js` | CSS-only via `@media` | Grid columns switch (3×2 ↔ 1×6) is pure CSS |
| `kis-priority-view.js` | CSS-only via `@media` | `aspect-ratio: 16/9` works at any width; no structural change |
| `kis-settings.js` | CSS-only | Token consumption for padding/gap only |

Cards using CSS-only adapt instantly on viewport change (zero JS cost). The single subscriber (`kis-control-panel`) re-renders its grid template only when `bp.columns` changes (1↔2), which is a deliberate user action (rotation or kiosk toggle) — not a hot path.

### 4.2 kis-app-shell.js — Breakpoint engine + CSS variable injection

**New responsibilities:**
- `classifyBreakpoint(w, h, orient, pointer)` — pure function, returns breakpoint object
- `recomputeBreakpoint()` — called on resize/orientation change, updates CSS vars + notifies cards
- `applyDensityTokens(density)` — sets CSS custom properties on `:root` from the density level
- Inject density tokens as CSS custom properties on `:root` (already does this for theme colors — same pattern)
- Publish `window.KIS_BREAKPOINT` object (debug/initial-render only)
- Set `data-kis-bp` attribute on `<body>` (light-DOM debugging/HA chrome patching only)
- Notify cards implementing `_onBreakpointChange(bp)` on breakpoint transitions
- `getSectionsViewCSS()` updated: add `@media (orientation: portrait)` and `@media (orientation: landscape)` blocks for column-count control

**Structural change:** The `getSectionsViewCSS()` function currently returns a fixed CSS string. It needs to become orientation-aware to control whether `max_columns: 2` actually renders as 2 columns or collapses to 1. Currently HA's sections view handles this via its own width threshold, but we need to override it for explicit orientation control via injected CSS that forces the grid template.

### 4.3 kis-control-panel.js — Height-aware, density-responsive

**Current state:** Uses hardcoded `769px` breakpoint for grid vs flex switch. Has `--cp-h: var(--kis-card-h, 80px)` — already wired to read a CSS variable.

**Changes needed:**
- Implement `_onBreakpointChange(bp)` — switch between grid and flex when `bp.columns` changes
- Replace `@media (min-width: 769px)` with the new breakpoint system: grid mode when `columns: 2`, flex mode when `columns: 1`
- Read `--kis-card-h` from the density tokens (already partially done via CSS var)
- In portrait/compact mode: `--kis-card-h: 54px`, flex column, garage-pair side-by-side
- In landscape/normal mode: `--kis-card-h: 80px`, CSS Grid with row template, `contain: size`
- The card does NOT need to know its constrained height explicitly — it uses `height: 100%` on `:host` and `contain: size` in desktop mode, letting the parent grid section dictate available space. The density tokens handle the minimum sizes.

### 4.4 kis-scenes.js — Density-responsive button sizing (CSS-only)

**Current state:** `--sc-h: var(--kis-card-h, 64px)` — reads from CSS variable. Grid is `repeat(6, 1fr)`.

**Changes needed:**
- Read `--kis-scene-h` from density tokens instead of `--kis-card-h`
- In compact mode: `--kis-scene-h: 44px`, 3×2 grid (`grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr)`)
- In normal mode: `--kis-scene-h: 64px`, single row of 6 (`grid-template-columns: repeat(6, 1fr)`)
- The grid switch is CSS-only via `@media (max-width: 599px)` — phones get 3×2, everything else gets 1×6
- No `_onBreakpointChange` needed — CSS media query handles the switch
- Icon and text scale via existing clamp() functions that reference `--kis-scene-h`

### 4.5 kis-priority-view.js — No code change, no version bump

**Current state:** `.carousel-viewport { aspect-ratio: 16 / 9; }` — always 16:9 at full container width.

**Analysis:** The priority view's `aspect-ratio: 16/9` on `.carousel-viewport` already produces the correct behavior at every breakpoint:
- Portrait phones: 16:9 at ~377-414px width → 212-233px tall. Fits in the compact layout.
- Landscape tablets (2-column): 16:9 at ~708px column width → 398px tall. Fits.
- The card fills its container width via `:host { width: 100% }` and the height is derived from the aspect ratio. No structural change needed.

**Decision:** No code change. No version bump. Removed from §5 table.

### 4.6 kis-settings.js — Token consumption only (CSS-only)

**Changes:** Reads density tokens for padding/gap via CSS custom properties. No structural changes. No `_onBreakpointChange` needed. Already a single-column layout that works at any width.

### 4.7 kis-dashboard-v2.yaml — No changes needed

The YAML already declares `max_columns: 2` for Home and `max_columns: 1` for Settings. The portrait-to-landscape column collapse is handled by the app shell's CSS injection into `hui-sections-view`, which overrides the grid template based on viewport orientation. The YAML structure stays as-is.

---

## 5. Files Touched + Anticipated Version Bumps

| File | Current Version | Projected Version | Change Type |
|------|----------------|-------------------|-------------|
| `kis-app-shell.js` | v36 (VERSION='2') | v37 | Detection layer, CSS var injection, breakpoint propagation |
| `kis-design-tokens.js` | v2 | v3 | Density token definitions, breakpoint taxonomy constants |
| `custom-cards/kis-control-panel.js` | v26 | v27 | Replace hardcoded 769px breakpoint with token system + `_onBreakpointChange` |
| `custom-cards/kis-scenes.js` | v9 | v10 | Scene grid responsive switch (6→3×2) + density tokens |
| `custom-cards/kis-settings.js` | v6 | v7 | Consume density tokens for spacing |
| `kis-dashboard-v2.yaml` | — | — | No changes anticipated |

**Removed:** `kis-priority-view.js` — no code change needed (see §4.5).

**Clarification on `kis-design-tokens.js`:** This file already exists and is deployed to the Pi at `/local/mobile_v2/kis-design-tokens.js`. It is imported by cards at runtime as an ES module (`import { KIS_TOKENS } from '...'`) and is NOT registered as a separate `lovelace_resources` entry — it piggybacks on the importing card's fetch. Bumping its cache-bust means changing the import URL in every consuming card (or using a versioned filename). Stage 1 work plan must account for this: either version the filename (`kis-design-tokens-v3.js`) or append `?v=3` to the import specifier in each card. The latter is simpler and matches existing pattern.

**Total version bumps:** 4 files need `lovelace_resources` cache-bust increments + 1 HA restart. `kis-design-tokens.js` bump is propagated via the import URL change in the 4 card files.

---

## 6. Risk Register

### R1: FOUC from breakpoint state arriving after initial render

**Risk:** Cards render at default density before the breakpoint engine publishes the correct tokens, causing a visible layout jump.

**Mitigation:** The density tokens are injected as CSS custom properties on `:root` BEFORE the `kis-ready` class is added (which is what makes `hui-sections-view` visible). The existing FOUC prevention system (`earlyHideLoop` + `armRevealGate`) already gates visibility until all cards are defined AND hass is available. We add one more gate condition: `window.KIS_BREAKPOINT.name !== null`. The breakpoint computation runs synchronously during `injectUI()` — it only reads `window.innerWidth/innerHeight` and `matchMedia()`, both available immediately. Zero async dependency.

**Residual risk:** Near-zero. CSS custom properties applied to `:root` before the reveal gate opens means no card sees the wrong tokens.

### R2: Layout shift on orientation change (rotation)

**Risk:** User rotates iPad from portrait to landscape. The layout changes from 1-column to 2-column. During the transition, cards may briefly render at wrong sizes.

**Mitigation:** The `recomputeBreakpoint()` handler fires on `orientationchange` + `resize`. It immediately updates CSS custom properties. `kis-control-panel` receives `_onBreakpointChange` and switches grid↔flex. CSS-only adaptations (via media queries in scenes/priority-view) are instant. The only visible transition is the sections-view grid switching from 1→2 columns, which HA handles via its own reactive layout update once the injected CSS changes.

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

**Risk:** 4 resource files need their `?v=N` bumped simultaneously. If one is missed, the old version loads and reads undefined CSS custom properties (falling back to defaults — not broken, but wrong density).

**Mitigation:** Stage 1 deploys detection layer + token system (app shell + design tokens) first. Cards consume tokens via CSS variables with fallback values that match their current behavior. Only Stage 2+ changes card behavior. This means a partial deploy (new app shell, old cards) produces identical visual output to today — the fallback values ARE today's values.

**Residual risk:** Low. Fallback values prevent visual regression during partial deploy.

### R6: HA architecture quirks — sections-view grid override

**Risk:** HA's `hui-sections-view` uses its own responsive breakpoint to decide column count. Our CSS injection must reliably override it. If HA updates its CSS specificity, our override could break.

**Mitigation:** The existing `getSectionsViewCSS()` already overrides HA's column width with `!important`. The new orientation-aware rules will follow the same specificity pattern. HA's sections-view respects `grid-template-columns` on its inner container — we inject that directly. Tested pattern (from existing deployment).

**Residual risk:** Medium on HA version upgrades. Pinned to current HA version behavior. Document the exact selector chain in `css_dom_patterns.md` for future-proofing.

### R7: Safe-area-inset interaction with chrome heights

**Risk:** iOS safe-area-inset-top/bottom add pixels to the chrome bars that the math in §3 doesn't account for.

**Mitigation:** The header already adds `env(safe-area-inset-top, 0px)` to its height. The nav bar adds `env(safe-area-inset-bottom, 0px)`. On iPhone 16 Pro, safe-area-inset-top ≈ 59px and safe-area-inset-bottom ≈ 34px. HOWEVER — the 852px viewport height already accounts for these (it's the CSS viewport, not the screen height). The safe-area insets are consumed by the chrome bars' internal padding, not added on top of the viewport. The math in §3 remains valid.

**Stage 1 verification (stop gate item):** Confirm via DevTools device emulation that `window.innerHeight` reports 852 (not 852 + insets) on iPhone 16 Pro profile. If it doesn't, recalculate §3 math with actual reported value.

---

## 7. Phase Plan

### Stage 1: Detection layer + token plumbing (no visible change)

**Goal:** Deploy the breakpoint engine and density tokens. All cards continue to look exactly the same because token default values match current hardcoded values.

**Work:**
1. **Capture baseline screenshots** on all 6 DevTools profiles BEFORE any code change. Commit to `qa/baseline-pre-issue1/` for diff comparison post-deploy.
2. Add breakpoint classification function + event listeners to `kis-app-shell.js`
3. Add density token definitions to `kis-design-tokens.js`
4. Update import URL version (`?v=3`) in all consuming cards for `kis-design-tokens.js`
5. Inject density tokens as CSS custom properties on `:root` from app shell
6. Add `window.KIS_BREAKPOINT` API + `_onBreakpointChange()` card protocol
7. Add breakpoint computation to the `armRevealGate()` prerequisite list
8. Deploy: bump kis-app-shell.js + card cache-busts in `lovelace_resources`

**Stop gate checklist:**
- [ ] Baseline screenshots captured (pre-change) and committed
- [ ] All 6 profiles render IDENTICAL to baseline (screenshot diff)
- [ ] `document.body.dataset.kisBp` reports correct breakpoint name per §2 table at each profile
- [ ] CSS custom properties on `:root` match expected density token values per §3 table
- [ ] `window.innerHeight` on iPhone 16 Pro profile reports 852 (validates R7 safe-area assumption)
- [ ] No FOUC — reveal gate holds until breakpoint state is published
- [ ] No layout shift on page load

---

### Stage 2: Home view orientation-aware layout

**Goal:** Home view renders correctly at all 6 profiles with fit-single-screen constraint enforced.

**Work:**
1. Update `getSectionsViewCSS()` with orientation-aware grid template rules
2. Update `kis-scenes.js` — 3×2 grid on phones, 1×6 on tablets/desktop
3. Update `kis-control-panel.js` — replace `769px` media query with token-driven breakpoint + `_onBreakpointChange`
4. Deploy all cards + app shell

**Stop gate:** Screenshot all 6 profiles. Verify acceptance criteria:
- All elements visible above the fold (no scroll needed on Home) for all profiles except phone-landscape
- Phone-landscape: scrollable, all elements rendered correctly at compact density
- Correct column layout per orientation (1-col portrait, 2-col landscape ≥1100px)
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

### Stage 4: 6-profile validation pass (preflight)

**Goal:** Full sweep across all 6 profiles, both views, day + night theme in DevTools.

**Work:**
1. Chrome DevTools Device Toolbar validation at each profile (per layout validation standard: 1440×900, 834×1194, 393×852 — plus the other 3 test profiles)
2. Document any edge cases found
3. Fix any issues
4. Final deploy

**Stop gate:** All 6 profiles pass acceptance criteria in DevTools. Ready for real-device sign-off.

---

### Stage 5: Real-device sign-off (REQUIRED)

**Goal:** Confirm on physical hardware. DevTools does not reproduce: Fully Kiosk Browser FOUC timing, iOS Safari URL-bar behavior, HA Companion App PWA chrome, real touch ergonomics. Issues 2 and 4 were caught on physical hardware that DevTools missed.

**Work:**
1. Tab S9+ landscape — Fully Kiosk hard refresh, verify 2-column layout, touch targets, no FOUC
2. iPhone — HA Companion App, verify phone-portrait layout, fit-single-screen, touch targets
3. iPad — live rotation portrait↔landscape, verify layout transition, no flash/jump
4. Day AND night theme on all three devices
5. Mini-player visible scenario on iPhone (play media → verify margin holds)

**Stop gate:** Chris confirms on real devices. All acceptance criteria pass on hardware. Issue 1 closed.

**Issue 1 cannot close without Stage 5 pass.**

---

## Summary

The breakpoint system is deliberately minimal:
- 5 named breakpoints covering every device in the matrix
- 2 density levels (compact/normal) — desktop reuses normal, no third level
- CSS-first where possible, JS callback only for the one card that needs structural re-layout
- Existing FOUC prevention gates the reveal until tokens are injected
- No changes to dashboard YAML structure
- Staged deploy with stop gates prevents partial-breakage
- Real-device sign-off is mandatory, not optional

The hardest constraint — fit-single-screen on iPhone 16 Pro in portrait — has **112px margin (16%)** in the no-mini-player case and **60px margin (9%)** with mini-player active. Both exceed the ≥80px / ≥40px targets respectively without any conditional density patches.
