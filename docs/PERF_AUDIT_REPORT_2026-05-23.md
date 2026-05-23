# mobilev2 vs mobilev1 Performance Audit Report
**Date:** 2026-05-23
**Repo:** ha-dashboard (C:\Projects\kintegrated\customers\ha-dashboard)

---

## Section 1: File Inventory

### Per-file metrics

| File | Lines | Raw bytes | Gzip bytes |
|------|------:|----------:|-----------:|
| kis-nav.js | 2,321 | 97,667 | 26,246 |
| kis-app-shell.js | 1,863 | 83,871 | 18,693 |
| kis-design-tokens.js | 301 | 11,490 | 3,117 |
| custom-cards/kis-scenes.js | 241 | 7,756 | 2,756 |
| custom-cards/kis-control-panel.js | 411 | 12,843 | 3,676 |
| custom-cards/kis-priority-view.js | 889 | 29,158 | 7,210 |
| custom-cards/kis-settings.js | 683 | 23,125 | 5,700 |
| dashboard_mobilev1.json | 3,817 | 205,225 | 16,415 |
| dashboard_tabletv1.json | 1,996 | 106,504 | 8,032 |
| kis-dashboard-v2.yaml | 42 | 1,318 | 369 |

### Aggregate payloads

| Payload | Files | Raw bytes | Gzip bytes |
|---------|-------|----------:|-----------:|
| **mobilev1 JS** | kis-nav.js | 97,667 | 26,246 |
| **mobilev2 JS** | kis-app-shell.js + kis-design-tokens.js + 4 custom cards | 168,243 | 41,152 |
| **mobilev1 dashboard config** | dashboard_mobilev1.json | 205,225 | 16,415 |
| **mobilev2 dashboard config** | kis-dashboard-v2.yaml (42-line stub — layout lives in custom card JS) | 1,318 | 369 |

**JS payload delta:** mobilev2 is **72% larger** than mobilev1 (168 KB vs 98 KB raw, 41 KB vs 26 KB gzipped).

**Total code surface:** mobilev2 splits layout logic across 6 JS files totaling 4,388 lines; mobilev1 puts layout in a 3,817-line JSON with 2,321 lines of JS overlay. Combined mobilev1 = 6,138 lines; combined mobilev2 = 4,430 lines.

---

## Section 2: kis-nav.js History (v1 baseline)

### Git log (chronological, first 30 commits)

```
268ce5e fix: top blank space, clock display, lights header alignment, media card style
528475e fix: apply safe-area-inset-top to status bar
971fe0d fix: Dynamic Island safe-area support
defa7fe fix: correct sticky header clearance
0cfba8e fix: add margin-bottom to sticky header card
6e4cf2e feat: dynamic header clearance
20d05b5 fix: add bottom padding to header card
ad7eeb0 fix: use getBoundingClientRect().height for header clearance
1fd3fd9 fix: add delayed re-measurements for env() timing
29eec74 fix: resolve WKWebView safe-area-inset-top
2407936 fix: ensure kis-header-clearance always wins CSS cascade
baf4f09 fix: remove double-layer header clearance
a88f1bf fix: patch sections-view .wrapper shadow root
f84f560 fix: apply header clearance to sections-view element
8e20ac1 fix: ensure scrollable sections start below sticky view header
5639db5 fix: re-measure header clearance when weather data first loads
72ea9af fix: stop stripping iPhone notch padding
e24acac feat: deploy v3 dashboard — single-row header, 6-tab nav, Settings
63b31cd feat: kis-nav.js v16 — highlight nav, badge, mini-player, performance
b6abc11 feat: day/night auto-switching via input_select.theme_mode + sun.sun
0dbaf85 feat(phase5b): priority display zone — swipe-card carousel
e3a8be1 fix(phase5b): edge-to-edge gutter across all view types
ddb2118 fix(phase5b): thin section headers via button-card
8a92d02 feat(phase5b): priority zone v3 — alignment, dynamic header
1f98baf fix(phase5b): swipe detection via currentIndex
9249983 fix(phase5b): swipe-tracker v27 — multi-source reader
9501fdc feat(phase5b): motion-cam preload + Nest stagger
d69eee3 feat(phase5b): camera placeholder overlay
7637db4 feat(phase5b): multi-cam Nest stagger + overlay-only placeholder
2cb3474 fix(kis-nav): eliminate black camera loading flash (v33 → v34)
```

### Growth

| Metric | Value |
|--------|-------|
| First commit (268ce5e) line count | 344 |
| Current line count | 2,321 |
| Delta | +1,977 lines (+575%) |

---

## Section 3: Static Analysis Per File

| Metric | kis-nav.js | kis-app-shell.js | kis-scenes.js | kis-control-panel.js | kis-priority-view.js | kis-settings.js |
|--------|----------:|-----------------:|--------------:|---------------------:|---------------------:|----------------:|
| a) `set hass(` setters | 0 | 0 | 1 | 1 | 1 | 1 |
| b) `setInterval(` | 4 | 1 | 0 | 0 | 0 | 0 |
| c) `setTimeout(` | 30 | 14 | 0 | 1 | 2 | 1 |
| d) `requestAnimationFrame(` | 3 | 10 | 0 | 0 | 0 | 0 |
| e) `addEventListener(` | 17 | 12 | 1 | 4 | 5 | 5 |
| f) `MutationObserver` | 2 | 1 | 0 | 0 | 0 | 0 |
| g) `ResizeObserver` | 2 | 0 | 0 | 0 | 0 | 0 |
| h) `customElements.define(` | 0 | 0 | 1 | 1 | 1 | 1 |
| i) `attachShadow(` | 0 | 0 | 1 | 1 | 1 | 1 |
| j) `querySelector`/`All(` | 53 | 80 | 1 | 5 | 9 | 9 |
| k) `getComputedStyle(` | 4 | 0 | 0 | 0 | 0 | 0 |
| l) `.innerHTML =` | 6 | 6 | 0 | 1 | 5 | 9 |
| m) `.textContent =` | 13 | 15 | 3 | 4 | 7 | 6 |
| n) `hass.states[` / `_hass.states[` | 3 | 10 | 1 | 2 | 7 | 2 |
| o) shadow DOM CSS injection | 10 | 17 | 0 | 0 | 0 | 0 |

### Aggregate comparison

| Metric | mobilev1 (kis-nav.js) | mobilev2 (app-shell + 4 cards) | Delta |
|--------|---------------------:|-------------------------------:|------:|
| `setInterval` | 4 | 1 | -3 |
| `setTimeout` | 30 | 18 | -12 |
| `requestAnimationFrame` | 3 | 10 | +7 |
| `addEventListener` | 17 | 27 | +10 |
| `MutationObserver` | 2 | 1 | -1 |
| `ResizeObserver` | 2 | 0 | -2 |
| `querySelector`/`All` | 53 | 104 | +51 |
| `getComputedStyle` | 4 | 0 | -4 |
| `.innerHTML =` | 6 | 21 | +15 |
| `.textContent =` | 13 | 35 | +22 |
| `hass.states[` reads | 3 | 22 | +19 |
| Shadow DOM CSS injection | 10 | 17 | +7 |

---

## Section 4: Hass-Update Hot Path (kis-app-shell.js)

### Update mechanism

kis-app-shell.js installs a **property interceptor** via `Object.defineProperty` on the `home-assistant` element's `hass` property (line ~314). Every HA state change triggers the setter, which calls `onHassUpdate(newHass)` and propagates `hass` to all registered custom cards.

This is **reactive** (fires immediately on every state change) vs kis-nav.js which uses **1-second polling** (`setInterval` at line 2257 calling `renderHeaderContent`).

### Call tree from `onHassUpdate(hass)` (line 373 + extension at line 1237)

```
onHassUpdate(hass)                        ← fired on EVERY state change
├── Check sun.sun + input_select.theme_mode (2 state reads)
│   └── if changed → initTheme(hass)
│       └── resolveMode(hass)             ← 1 state read
│       └── readColors(hass, mode)        ← 10 state reads (COLOR_MAP loop)
│       └── applyColors(colors)           ← 10× document.documentElement.style.setProperty
├── COLOR_MAP loop (10 iterations)        ← 10 state reads + 10 getPropertyValue
│   └── if any changed → applyColors()   ← (same as above, breaks after first)
├── Check input_boolean.kiosk_mode        ← 1 state read
│   └── if changed → syncKioskMode(hass)
├── renderV2Header()                      ← (only when on mobilev2 dashboard)
│   ├── getState(ALARM_ENTITY)            ← 1 state read
│   ├── getState(weather.forecast_home)   ← 1 state read
│   ├── personState(person.chris)         ← 1 state read
│   ├── personState(person.claire)        ← 1 state read
│   ├── 7× querySelector + textContent compare/set (diffed updates)
│   ├── updateV2Badge(hass)
│   │   ├── BADGE_LOCKS.forEach           ← N state reads (locks)
│   │   ├── BADGE_GARAGES.forEach         ← N state reads (garages)
│   │   ├── getState(ALARM_ENTITY)        ← 1 state read
│   │   ├── getState(person.chris)        ← 1 state read
│   │   ├── getState(person.claire)       ← 1 state read
│   │   └── Object.keys(hass.states).filter(k => k.startsWith('update.'))
│   │       ← FULL STATE ENUMERATION on every update
│   └── updateV2MiniPlayer(hass)
│       ├── getState(MEDIA_PLAYER_ENTITY) ← 1 state read
│       └── 4× querySelector + diffed textContent/src updates
└── updateAlarmPanel()                    ← (only when on mobilev2 dashboard)
    └── getState(ALARM_ENTITY)            ← 1 state read
```

### Hot path cost per hass update

| Operation | Count per update (worst case) |
|-----------|------------------------------:|
| State reads (`hass.states[...]`) | ~25-30 |
| `Object.keys(hass.states).filter()` | 1 (full enumeration) |
| `document.documentElement.style.getPropertyValue()` | 10 |
| `querySelector()` calls | ~15 |
| `textContent` comparisons | ~7 |
| DOM writes (only if changed) | 0-7 (diffed) |

### Notable patterns

**`Object.keys(hass.states).filter(k => k.startsWith('update.'))` (line 1155):** This enumerates the entire state object (~500+ entities) on every single hass update to count available updates for the badge. This runs in `updateV2Badge` which runs inside `renderV2Header` which runs on every hass update when on the mobilev2 dashboard.

**COLOR_MAP loop (line 389):** On every hass update, iterates 10 color helper entities AND calls `document.documentElement.style.getPropertyValue()` for each, comparing current CSS variable values. This runs even when no color changed. Early-exit on first mismatch prevents the `applyColors` call, but the 10 reads + 10 getPropertyValue calls happen unconditionally.

**Reactive vs polling:** kis-app-shell.js fires on every state change (could be dozens per second during busy periods). kis-nav.js polls once per second regardless. The reactive approach means mobilev2's hot path runs N times per second (where N = number of state changes) rather than a fixed 1/sec.

### Card propagation

Every hass update also triggers `card.hass = newHass` on all registered custom cards (line 332). Each card's `set hass()` setter then runs its own update logic:

- **kis-scenes.js:** reads 1 entity (input_select.active_scene or similar)
- **kis-control-panel.js:** reads 2 entities (locks/covers)
- **kis-priority-view.js:** reads 7 entities (cameras, motion sensors)
- **kis-settings.js:** reads 2 entities (kiosk_mode, theme_mode)

Total additional state reads from card propagation: ~12 per hass update.

---

## Summary Metrics

| Metric | mobilev1 | mobilev2 | Ratio |
|--------|----------|----------|-------|
| JS payload (gzip) | 26 KB | 41 KB | 1.57× |
| JS payload (raw) | 98 KB | 168 KB | 1.72× |
| JS lines of code | 2,321 | 4,388 | 1.89× |
| Total code surface (JS + config) | 6,138 lines | 4,430 lines | 0.72× |
| Update mechanism | 1s polling | Reactive (per state change) | — |
| Entity reads per update cycle | ~19 | ~37-42 | ~2× |
| `querySelector` calls (static count) | 53 | 104 | 1.96× |
| `innerHTML` assignments | 6 | 21 | 3.5× |
| Shadow DOM CSS injections | 10 | 17 | 1.7× |
| `setInterval` timers | 4 | 1 | 0.25× |
| `setTimeout` calls | 30 | 18 | 0.6× |
| Full state enumeration in hot path | 0 | 1 | — |
