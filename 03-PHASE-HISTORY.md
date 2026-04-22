# 03 — Phase History

> What each phase actually shipped, indexed by kis-nav version. For a
> chronological changelog in user-facing language, see `RELEASE_NOTES.md`.
> For the raw git trail, run `git log --oneline --all` in ha-dashboard.
>
> The `PHASE2_HANDOFF.md` and `PHASE4_HANDOFF.md` files in this repo are
> superseded by this document and are kept only as primary-source history.

---

## Phase 1 — Product spec + mockups
**When:** 2026-04-11 through 2026-04-13
**Shipped:** `PRD.md`, `DESIGN-SPEC-v16.md`, interactive v17 mockup
**Outcome:** Chris approved layout, typography, color system, and KIS
brand alignment. No code shipped in this phase.

---

## Phase 2 — Full 6-view dashboard + kis-nav.js v11–v16
**When:** 2026-04-13 through 2026-04-14
**kis-nav versions:** v11 → v16
**Shipped:**
- Lovelace JSON for all 6 views — Home, Climate, Lights, Cameras, Media,
  Settings.
- `kis-nav.js` v16 — fixed header + bottom nav + mini-player, injected
  outside the HA shadow tree; weather, presence, alarm, clock, now-playing
  strip; active-route nav highlight.
- Kiosk mode on all devices — HA chrome hidden.
- Theme pinned to `kis-dark` at all times (day/night switching added
  later in Phase 5A).
- Shadow-DOM patch chain for the sticky header — multiple iterations to
  survive HA's Lit rerenders and to preserve iPhone notch padding.

---

## Phase 3 — Motion camera + scene tracking
**When:** 2026-04-15
**kis-nav versions:** v17 → v18
**Shipped:**
- `type: conditional` motion camera on Home, keyed off legacy sticky
  sensors.
- Six scene wrapper scripts (`script.scene_morning` etc.) so the
  Home-view scene buttons can show active-state feedback.
- `v17` interactive mockup for stakeholder review.

---

## Phase 4 — Home sections redesign + hardened QA + Nanit
**When:** 2026-04-16 through 2026-04-20
**kis-nav versions:** v18 → v23
**Shipped:**
- Home view rewritten to `type: sections`, `max_columns: 2`, with a
  reserved right-column camera zone keyed off
  `binary_sensor.*_motion_sticky`. PR #4 on ha-dashboard, PR #2 on
  ha-config.
- Nanit integration — `indiefan/nanit` RTMP restream Docker container on
  Pi, with `camera.nanit_benjamin` + `camera.nanit_travel` surfacing in HA
  as ffmpeg cameras. PR #3 + PR #5.
- **Camera fullscreen popups** — tap any camera card, get a full-viewport
  `browser_mod.popup` with `picture-elements` overlay buttons (close X,
  front-door lock toggle, disabled talk/listen placeholders). PR #6.
- **Cameras page rewrite** — `type: sections` with `card_mod` aspect-ratio
  hacks was abandoned after multiple failed iterations; switched to
  `type: panel` + native `grid` card (`columns: 2, square: false`) with
  picture-entity `aspect_ratio: "16:9"` as a native property. Produces
  uniform cell dimensions in every viewport. See `dead_ends.md` for the
  full card-mod dead-end trail.
- **QA pipeline hardened** — authenticated Playwright, kis-nav injection
  gate, 8 device profiles × 6 views (48 shots), Fully Kiosk real-device
  capture from the Tab S9 Remote Admin REST API. `--mock-cameras` flag
  added so iterative sweeps don't burn Nest's 5 QPM quota.
- Deploy-path sanity: dashboards go to `.storage/lovelace.*`
  (`root:root 644`, no `.json` extension); `www/mobile_v1/` is for
  static assets only (kis-nav.js, theme CSS, images). An earlier
  deploy to `www/` was silently ignored by HA.

**Key lessons** (captured in `.claude/memory/`):
- card-mod is NOT installed on this HA instance — all `card_mod:` blocks
  are silently ignored. Verified by inspecting
  `.storage/lovelace_resources` on the Pi. Use `custom:button-card` native
  styles instead.
- `card_mod` aspect-ratio rules never reach picture-entity's inner
  ha-card computed style. Use the native `aspect_ratio` property.

---

## Phase 5A — Day/night auto-switching + Lights v1
**When:** 2026-04-21 (early)
**kis-nav versions:** v24 → v25
**Shipped:**
- Day/night palette flip driven by `sun.sun` and
  `input_select.theme_mode` (Auto / Day / Night).
- `kis-nav.js` sets `--kis-section-label` and `--kis-section-rule` CSS
  custom properties on `document.documentElement` so any card can pick up
  the correct palette via shadow-DOM CSS-var inheritance. The bridge
  pattern (documented in `.claude/memory/css_dom_patterns.md`) avoids
  needing separate HA themes for day vs. night.
- Lights page v1 — per-room cards with expand/collapse chevrons.
  Superseded in v38; see Phase 5C below.
- `theme_mode_sync` automation keeps HA's native theme in sync with
  the input_select override, covering browser reloads.
- Nest camera motion switched to **trigger-based template binary_sensors**
  (`binary_sensor.*_motion_sticky`) with `auto_off` latching — Nest
  emits motion as event-entities, not steady-state binaries, so the
  previous `delay_off` pattern could not read them.

---

## Phase 5B — Priority display zone (first pass)
**When:** 2026-04-21 (mid)
**kis-nav versions:** v26 → v34
**Shipped:**
- **Carousel in the priority zone** via `custom:simple-swipe-card` v2.8.2.
  Abandoned `bramkragten/swipe-card` after a reproducible setConfig crash
  on Fully Kiosk Browser.
- **Swipe tracker** — read `cardEl.currentIndex` directly from the custom
  element and observe the internal `.slider` transform mutations; backed
  by a `transitionend` listener and a 750 ms poll. Previous attempts to
  watch the `.active-slide` class failed because that class only exists
  in vertical mode in this card version.
- **Dynamic section header** above the carousel — shows "MOTION
  DETECTED" when a camera takeover is active, "VEHICLES" or "WEATHER"
  otherwise.
- **Section headers** switched to `custom:button-card` with a reusable
  `section_label` template; stopped depending on card-mod that wasn't
  installed.
- **Thin camera placeholder** via `ha-card::before` pseudo-element inside
  each picture-entity shadow root. Went through several failed variants:
    - v29: DOM-injected overlay — raced HA first paint, produced a black
      flash.
    - v31–v32: opacity-gated media elements — starved Android WebView's
      decoder, left cells permanently empty.
    - v33: overlay-only `ha-card::before` — safe on WebView, no decoder
      starvation.
    - v34: reveal gate changed from `loadeddata` (fires on one buffered
      frame, often a black I-frame on low-light / warmup) to `playing`,
      plus `<video>` element's own `background-color` matches the
      placeholder to neutralize Android WebView's UA-default black.
- **Multi-cam Nest stagger** — 250 ms spacing between stream requests to
  stay under Nest SDM's 5 QPM `ExecuteDeviceCommand` quota.
- **Save Everything command** added to CLAUDE.md — 6-phase checkpoint
  procedure invoked by "save everything" / "safe to exit?". Includes
  updating `.claude/memory/` BEFORE commit so lessons travel with code.
- **Efficiency rules** appended to CLAUDE.md from the Phase 5B
  retrospective — research-before-code after first failure,
  real-device-first for WebView bugs, 3-deploy budget per session, Nest
  quota budget, post-compaction mandatory re-read, debug UI never ships
  to prod.

---

## Phase 5B-ext — Priority zone layout fix
**When:** 2026-04-21 (late)
**kis-nav versions:** v35
**Shipped:**
- Priority-zone tiles now fill the section column correctly on both
  devices. Root cause: button-card ships its own `adoptedStyleSheets`
  with `:host { display: flex; max-width: fit-content; flex: 0 0 auto }`
  which wins at equal specificity against section-grid placement. Fixed
  with an `extra_styles` `:host !important` block per tile.
- Auto-snap carousel lands on the active priority camera when
  `sensor.priority_camera` changes to a new name.
- Per-camera 60 s swipe cooldown — dismissing with a swipe suppresses
  auto-snap back until the cooldown expires or a higher-tier camera
  (doorbell) fires.
- ResizeObserver re-finds the swipe-card host each tick; self-heals
  after HA DOM rebuilds.
- **Probe-before-deploy efficiency rule** added to CLAUDE.md —
  measure-the-DOM-first discipline that would have caught the
  `max-width: fit-content` trap on the first attempt instead of the
  sixth.

---

## Phase 5C — Lights page redesign + motion priority freshness
**When:** 2026-04-21 through 2026-04-22
**kis-nav versions:** v36 → v38
**Status:** Pushed on branches `fix/lights-page-redesign` + (prereq)
`fix/motion-camera-timing` on both repos. PRs not yet opened as of
2026-04-22.

**Shipped on `fix/lights-page-redesign`:**
- Full Lights page redesign — glass-morph room cards, single header row
  per room (`ROOM NAME` + live `X/Y on` count), per-light rows with name
  on the left and amber-fill horizontal brightness bar on the right.
  Tap toggles; hold opens more-info (native brightness slider). No
  master toggles, no dots, no toggle switches, no expand/collapse.
- Outdoor room now includes all 7 fixtures (added `light.garage_light`
  and `light.outdoor_switch_2` which had been missing).
- `ha-config/CLAUDE.md` corrected: `light.patio_string_lights` (never
  existed) → `light.outdoor_switch_2` (real entity, friendly name
  "Patio String Lights").
- Day-mode palette for the Lights page — glass flips to warm-white,
  amber fill stays amber. Achieved via `--kis-lights-*` CSS variables on
  `document.documentElement` set by kis-nav.js v38.

**Shipped on `fix/motion-camera-timing`:**
- Interior-camera motion priority now uses freshness-based arbitration
  instead of strict hold-until-clear. Doorbell remains a Tier 1 override
  (always wins). Between Living Room and Izzy, a FRESH motion event
  (sticky was OFF for ≥ 60 s before this trigger) can displace a STALE
  current owner (sticky has been continuously ON for ≥ 60 s). Truth
  table collapses to "incoming fresh wins, incoming stale holds".
- Two new helpers record last-clear timestamps:
  `input_datetime.last_motion_clear_living_room` and `_izzy`. Written
  by the sticky_off handler on every interior clear.
- `priority_camera_sticky_off` replacement picker reversed: previously
  picked oldest last_changed (staleness bias, longest-continuous wins);
  now picks newest last_changed (freshest turn-on wins).

**Key new lessons** (captured in `.claude/memory/`):
- `grid_options: 'full'` alone does not widen a `custom:button-card`
  inside a sections-view column — button-card's adoptedStyleSheets
  override at equal specificity. Add `extra_styles` with `:host` width
  / flex `!important`.
- `input_boolean.lights_*_expanded` helpers referenced by old Lights
  page conditionals were in state `unavailable` forever (never
  created). HA raises no warning; the conditional just evaluates false
  silently. Pre-deploy probe for helper availability prevents this.
- `custom:button-card` `custom_fields.<field>.card: { type: ... }`
  reliably embeds a nested Lovelace card with full interactive bindings
  (tap_action etc.) preserved. Used to put the Lights page header +
  per-light rows inside the glass-morph wrapper.

---

## Version-to-phase index

| kis-nav version | Phase | Summary |
|-----------------|-------|---------|
| v11–v15 | Phase 2 prep | Foundations, sticky-header clearance iterations |
| v16 | Phase 2 baseline | Full 6-view dashboard shipped |
| v17 | Phase 3 | Motion camera + scene active-state |
| v18–v23 | Phase 4 | Home sections, Nanit, Cameras rewrite, camera popups, QA pipeline |
| v24–v25 | Phase 5A | Day/night switching, Lights v1, Nest trigger-based stickies |
| v26–v28 | Phase 5B | Priority zone v3 (swipe tracker, dynamic header, camera scaling) |
| v29–v32 | Phase 5B | Camera placeholder attempts (several regressions, superseded) |
| v33 | Phase 5B | Overlay-only placeholder (safe on WebView) |
| v34 | Phase 5B | Reveal gate hardening (`playing` not `loadeddata`) |
| v35 | Phase 5B-ext | Priority zone layout fill + auto-snap + cooldown |
| v36–v37 | (cache-bust only) | Cache-bust bumps during layout iteration |
| v38 | Phase 5C | Lights page redesign + day-mode palette |
