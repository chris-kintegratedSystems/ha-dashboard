# Release Notes — ha-dashboard

Chronological, user-facing summary of what shipped per `kis-nav.js` version. One
entry per deployed version; technical fix-only iterations without version bumps
are folded into the next shipped number. Dates match the merge commit on
`master`.

For the raw commit log, use `git log --oneline` in the repo.

Repo: https://github.com/chris-kintegratedSystems/ha-dashboard (private)
Companion repo: https://github.com/chris-kintegratedSystems/ha-config (private)

---

## v38 — 2026-04-22 (current)

### Features
- **Lights page redesign.** Every room is a glass-morph card with a single
  header row (`ROOM NAME` left, live `X/Y on` count right) and one row per
  light. Each light row shows the light name on the left and a horizontal
  amber-fill brightness bar on the right — full when on (non-dim) or sized to
  current brightness percentage (dim). Tap toggles, hold opens HA's native
  more-info dialog for fine brightness control.
- **Lights page: all rooms always expanded.** Replaced the broken
  expand/collapse chevrons that relied on `input_boolean.lights_*_expanded`
  helpers that were never actually created in HA.
- **Lights page: Outdoor room** now includes all 7 fixtures — Garage, Patio
  String, Front Porch, Front Walkway, Upper Outdoor, Left Patio, Center Patio.
- **Day-mode palette for Lights.** Glass-morph flips from dark (night) to
  warm-white (day). Amber fill stays amber in both modes.

### Fixes
- Corrected stale entity-ID reference in `ha-config/CLAUDE.md`:
  `light.patio_string_lights` → `light.outdoor_switch_2`.

### Notes
- Branch: `fix/lights-page-redesign` (both repos). Cache-bust v37 → v38 on
  `ha-config/configuration.yaml`.

---

## v35–v37 — 2026-04-21 (priority-zone layout)

### Fixes
- **Priority display zone now fills its section.** Carousel tiles and the
  motion-camera takeover no longer collapse to content-width inside the
  sections view. Solved by adding `grid_options: 'full'` plus an
  `extra_styles` `:host !important` block on each button-card tile to defeat
  button-card's built-in `max-width: fit-content`.
- **Auto-snap carousel** now lands on the active priority camera whenever
  `sensor.priority_camera` changes to a new camera name. Resets on `none`.
- **Per-camera swipe cooldown.** Dismissing a camera by swiping away
  suppresses auto-snap back for 60 s — higher-tier (doorbell) cameras still
  break through.
- **ResizeObserver re-finds the swipe-card host** each tick so the observer
  still works after HA rebuilds the DOM on route changes.

---

## v34 — 2026-04-21 (camera loading flash fix)

### Fixes
- **Eliminated the black-to-white-to-video flash** during camera stream
  warmup on the Tab S9 (Android WebView 146). Reveal gate moved from
  `loadeddata` (fires on one buffered frame, often a black I-frame) to
  `playing`. Added `background-color` on the `<video>` element itself
  matching the placeholder palette so the UA-default black never leaks.

### Performance
- No decoder starvation: the fix avoids the `opacity: 0` gating that broke
  v31/v32. Overlay-only placeholder; native rendering untouched.

---

## v33 — 2026-04-21 (overlay-only camera placeholder)

### Features
- **Multi-camera Nest stagger.** When multiple cameras mount at once, stream
  requests are staggered by 250 ms to avoid Nest SDM `RESOURCE_EXHAUSTED`
  (5 QPM quota).

### Fixes
- Camera placeholder reworked as a pure `ha-card::before` overlay on top of
  the live feed. Eliminates the race between the placeholder DOM insertion
  and HA's first paint. Safe on Android WebView — no `opacity: 0` on media
  elements.

---

## v29–v32 — 2026-04-21 (camera placeholder experiments)

### Notes
- Several experimental versions that introduced and then removed a shadow-root
  opacity gate on `hui-image` / `<video>` / `ha-hls-player`. On Tab S9 this
  starved the Android WebView decoder and left cells permanently empty.
  Superseded by v33's overlay-only approach. Do not regress.

---

## v26–v28 — 2026-04-21 (priority zone v3)

### Features
- **Reliable swipe-tracker** for the priority-display carousel. Reads
  `cardEl.currentIndex` directly from `custom:simple-swipe-card` and observes
  the internal `.slider` transform for change detection. Backed by a
  `transitionend` listener and a 750 ms poll fallback.
- **Dynamic header** above the priority zone — shows "MOTION DETECTED" when
  active, the carousel section name (VEHICLES / WEATHER) otherwise.

### Fixes
- `object-fit: fill` on motion-takeover camera cards so they match the
  carousel footprint pixel-for-pixel (no crop, no letterbox).
- Thin section headers now render via `custom:button-card` (card-mod is not
  installed on this HA instance; all previous card-mod section styling was
  being silently ignored by Lovelace).

---

## v24–v25 — 2026-04-21 (section-label bridge)

### Features
- **Day/night CSS custom-property bridge.** `kis-nav.js` sets
  `--kis-section-label`, `--kis-section-rule`, and camera placeholder colors
  on `document.documentElement` so any card (including inside shadow DOM)
  can pick up the correct palette with a `var(..., fallback)` fallback.
- **Per-camera sticky motion sensors.** Nest cameras emit motion as
  event-entities; switched to trigger-based template binary_sensors
  (`binary_sensor.*_motion_sticky`) with `auto_off` latching (initially 5 s,
  later 30 s).

---

## v18–v23 — 2026-04-20 (Phase 4 + Nanit + cameras)

### Features
- **Phase 4 Home layout.** Sections view with a reserved camera-takeover
  column that swaps in a motion camera when `sensor.priority_camera` changes.
- **Nanit baby-monitor integration.** `indiefan/nanit` RTMP restream running
  in Docker on the Pi; `camera.nanit_benjamin` + `camera.nanit_travel` live
  in HA as ffmpeg cameras.
- **Camera fullscreen popups.** Tap a camera card → `browser_mod.popup`
  overlays a full-viewport `picture-elements` card with overlay buttons
  (close X, front-door lock toggle, disabled talk/listen placeholders).
- **Cameras page rewrite.** `type: panel` + native `grid` card (`columns: 2`,
  `square: false`), each picture-entity card pinned to `aspect_ratio: "16:9"`
  via the native property. Uniform cell dimensions in every viewport.

### Fixes
- Dashboard-deploy path corrected everywhere — `.storage/lovelace.*` is
  canonical; `www/` is a dead letter for Lovelace JSON.
- Hotfix: camera popup dismissable, doorbell overlay centering.

### Performance
- QA pipeline hardened to 8 device profiles × 6 views (48 Playwright shots)
  plus one Fully Kiosk real-device capture from the wall-mounted Tab S9.
- `--mock-cameras` and `--camera-delay` flags added so iterative sweeps
  don't burn Nest SDM quota.

---

## v17 — 2026-04-14 (design mockup)

### Features
- Interactive v17 design mockup shipped alongside the code so review can
  happen against both a rendered dashboard and the reference HTML.

---

## v16 — 2026-04-13 (Phase 2 + 3 baseline)

### Features
- **Full 6-view mobile dashboard.** Home, Climate, Lights, Cameras, Media,
  Settings, with Kiosk mode hiding the HA chrome on all devices.
- **kis-nav.js v16.** Fixed-position header + bottom nav + mini-player
  injected outside the HA shadow tree. Shows weather, presence, alarm,
  clock, and now-playing strip. Nav highlights the active route.
- **Conditional motion camera on Home.** Home view reserves a column that
  swaps in the right camera feed when motion fires on that camera's sticky.
- **Scene toggle active-state tracking.** Six scene wrapper scripts light
  up the active scene button.
- **Per-room Lights layout.** Initial version with expand/collapse chevrons
  (superseded by v38).

---

## v11–v15 — 2026-04-08 through 2026-04-12 (foundations)

### Features
- Single-row header, 6-tab nav, Settings view.
- v2 and v3 prototypes with all product-spec enhancements.

### Fixes
- Sticky view-header clearance: multiple shadow-DOM patch iterations to
  keep scrollable sections below the fixed header on every view type
  (sections / masonry / panel).
- iPhone notch padding preserved through header clearance.

---

## Unreleased / in-flight branches

| Repo | Branch | What it ships |
|------|--------|---------------|
| ha-config | `fix/motion-camera-timing` | Freshness-based interior-camera priority (doorbell always overrides; fresh beats stale within Tier 2). 30 s stickies + 30 s linger preserved. |
| ha-config | `fix/lights-page-redesign` | Branched from motion-camera-timing. Adds cache-bump v37→v38 + patio light entity-ID fix. |
| ha-dashboard | `fix/lights-page-redesign` | v38 Lights page redesign + day/night CSS vars. |

Both `fix/lights-page-redesign` branches are pushed but PRs are not yet
opened. Either open them via `gh pr create` or via the GitHub web UI.
