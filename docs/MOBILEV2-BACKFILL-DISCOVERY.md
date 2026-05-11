# mobilev2 Back-Fill Discovery Document

**Date:** 2026-05-10
**Session:** mobilev2 back-fill chunk (env-002)
**Branch:** mobilev2/full-build

---

## 2A — Priority Logic Discovery

### sensor.priority_camera definition

**Type:** Template sensor
**Defined in:** `configuration.yaml` under `template:` → `sensor:`
**State:** Direct passthrough of `input_text.priority_camera_lock`

```yaml
- name: "Priority Camera"
  unique_id: priority_camera
  state: "{{ states('input_text.priority_camera_lock') }}"
```

**Possible states:** `none`, `doorbell`, `living_room`, `bens_room`, `nanit_benjamin`, `nanit_travel`

**Supporting entities:**
- `input_text.priority_camera_lock` — stores current lock value (initial: `none`, max: 20 chars)
- `timer.priority_camera_release` — 60-second trailing release timer (restore: true)
- `input_number.priority_slide_index` — tracks carousel slide position (set by kis-nav.js swipe observer)

### Motion sensor entities

| Room Key | Camera Entity | Motion Trigger Entity |
|----------|--------------|----------------------|
| doorbell | camera.doorbell | binary_sensor.doorbell_person_occupancy |
| living_room | camera.nest_cam_1 | binary_sensor.nest_cam_1_person_occupancy |
| bens_room | camera.nest_cam_2 | binary_sensor.nest_cam_2_person_occupancy |
| nanit_benjamin | camera.nanit_benjamin | binary_sensor.nanit_benjamin_person_occupancy |
| nanit_travel | camera.nanit_travel | binary_sensor.nanit_travel_person_occupancy |

All triggers are `person_occupancy` binary sensors (not raw motion — person detection).

### Priority ordering (when multiple fire simultaneously)

Non-doorbell priority is determined by a fixed cascade in the automation templates:

```
living_room > bens_room > nanit_benjamin > nanit_travel
```

This cascade appears in both `camera_follow_code_initial_lock` and `camera_follow_code_preempt` automations via the same Jinja2 if/else chain.

**Doorbell is a hard override** — always wins regardless of current lock state. The `camera_follow_code_doorbell_lock` automation has no conditions; it unconditionally cancels any running timer and sets the lock.

### Camera Follow Code — 7 automations

| Automation ID | Alias | Behavior |
|--------------|-------|----------|
| camera_follow_code_doorbell_lock | Lock on doorbell trigger | Doorbell person_occupancy ON → lock = "doorbell", cancel timer |
| camera_follow_code_doorbell_timer | Start doorbell timer on clear | Doorbell person_occupancy OFF while lock = "doorbell" → start 60s timer |
| camera_follow_code_initial_lock | Lock on non-doorbell trigger (nothing locked) | Any non-doorbell person_occupancy ON while lock = "none" → lock = highest-priority active camera |
| camera_follow_code_retrigger | Reset timer on locked camera retrigger | Currently-locked camera fires person_occupancy ON again → cancel timer (camera still active) |
| camera_follow_code_locked_clear | Start timer when locked camera clears | Non-doorbell locked camera person_occupancy OFF → start 60s timer |
| camera_follow_code_preempt | Preempt during trailing window | During trailing timer, different non-doorbell camera fires person_occupancy → preempt with highest-priority active, restart timer |
| camera_follow_code_release | Release lock on timer finish | Timer expires → check if any camera still active. If yes, lock onto highest-priority and restart timer. If no, set lock = "none". Also runs on HA start. |

### Sticky-on timing

v1 implements 60-second sticky-on via `timer.priority_camera_release` (duration: `00:01:00`). The launch prompt specifies 2-minute sticky-on for v2. **Decision:** v2's kis-priority-view will implement its own 2-minute sticky timer internally, independent of the HA-side 60-second timer. The HA automations continue to manage `sensor.priority_camera` with 60s trailing; v2's card adds an additional 60s on top (total 2 minutes from motion clear to carousel revert). This avoids modifying ha-config automations (out of envelope).

### simple-swipe-card behavior in v1

**Configuration:**
- `loop_mode: "none"` — no circular looping
- `show_pagination: true` — dot indicators visible
- `card_spacing: 0` — seamless slide-to-slide
- `enable_resize_observer: true`
- `reset_after: 0` — no auto-reset
- `view_mode: "single"` — one card visible at a time

**Interaction:** Manual swipe only (no auto-rotate). Position persists within the page until camera motion override snaps to index 0. kis-nav.js pushes the current index to `input_number.priority_slide_index` via a MutationObserver + transitionend + pointer/touch listener + fallback poll (750ms).

**Auto-snap:** When `sensor.priority_camera` transitions to a camera key, `autoSnapPriorityCamera()` calls `swipeCard.goToSlide(0)`. Camera tiles are conditional cards at indices 0-4; they only render when their condition matches.

**Swipe-away cooldown:** If user swipes away from active camera (index 0 → N), a 60-second cooldown prevents auto-snap back to that camera. Only a full cycle through `none` then back to a camera triggers a new snap.

---

## 2B — Top Header Discovery

### Time / Date / Weather chip (left side)

**Time:** JavaScript `new Date()` — not an HA entity. Format: `h:mm AM/PM` (12-hour, no leading zero).
**Date:** JavaScript — format: `Wednesday · May 10` (full day name · month name date).
**Weather entity:** `weather.forecast_home`
- Temperature: `weather.forecast_home.attributes.temperature` → `Math.round(temp) + '°'`
- Condition icon: emoji map (e.g., sunny→☀️, cloudy→☁️, rainy→🌧️)

**CSS — Night mode:**
- Clock: 22px, weight 700, color `#eef2f8`, tabular-nums
- AM/PM: 11px, weight 600, color `#8a9ab8`
- Date: 9px, weight 500, letter-spacing 0.12em, uppercase, color `#4a5570`
- Weather temp: 14px, weight 700, color `#f1f5f9`
- Weather icon: 16px emoji

**CSS — Day mode:**
- Clock: color `#1a2030`
- AM/PM: color `#4a5a72`
- Date: color `#7a8698`
- Weather temp: color `#1a2030`

### Presence entities (right side)

- `person.chris` — tap opens `hass-more-info` dialog (shows map)
- `person.claire` — tap opens `hass-more-info` dialog (shows map)

**State mapping:**
- `home` → green dot (`#10d090`, glow `0 0 4px #10d090`; day: `#089464`, glow `#089464`)
- `away` → blue dot (`#4d8ef0`; day: `#2d6bc4`)
- `unknown` → gray dot (`#4a5570`; day: `#7a8698`)

**Pill CSS (night):** background `rgba(16,21,31,0.72)`, border `rgba(255,255,255,0.06)`, border-radius 14px, name font 10px weight 600 color `#eef2f8`
**Pill CSS (day):** background `rgba(255,255,255,0.88)`, border `rgba(0,0,0,0.05)`, name color `#1a2030`

### Alarm entity (right side)

**Entity:** `alarm_control_panel.kuprycz_home`
**Tap action:** opens `hass-more-info` dialog (native HA alarm panel with arm/disarm controls)

**State display — Night palette:**

| State | Background | Color | Border | Label |
|-------|-----------|-------|--------|-------|
| disarmed | rgba(16,208,144,0.12) | #10d090 | rgba(16,208,144,0.3) | Disarmed |
| armed_away | rgba(77,142,240,0.12) | #4d8ef0 | rgba(77,142,240,0.3) | Armed Away |
| armed_home | rgba(245,166,35,0.12) | #f5a623 | rgba(245,166,35,0.3) | Armed Home |
| arming | rgba(245,166,35,0.12) | #f5a623 | rgba(245,166,35,0.3) | Arming |
| pending | rgba(245,166,35,0.12) | #f5a623 | rgba(245,166,35,0.3) | Pending |
| triggered | rgba(240,64,96,0.15) | #f04060 | rgba(240,64,96,0.3) | TRIGGERED |

**State display — Day palette:**

| State | Background | Color | Border | Label |
|-------|-----------|-------|--------|-------|
| disarmed | rgba(8,148,100,0.10) | #089464 | rgba(8,148,100,0.35) | Disarmed |
| armed_away | rgba(45,107,196,0.10) | #2d6bc4 | rgba(45,107,196,0.35) | Armed Away |
| armed_home | rgba(192,120,8,0.10) | #c07808 | rgba(192,120,8,0.35) | Armed Home |
| arming | rgba(192,120,8,0.10) | #c07808 | rgba(192,120,8,0.35) | Arming |
| pending | rgba(192,120,8,0.10) | #c07808 | rgba(192,120,8,0.35) | Pending |
| triggered | rgba(192,40,64,0.10) | #c02840 | rgba(192,40,64,0.35) | TRIGGERED |

**Alarm pill CSS:** font 9px, weight 700, letter-spacing 0.12em, uppercase, border-radius 16px. Pulsing dot animation (2s ease-in-out infinite, scale 0.7↔1.0, opacity 0.5↔1.0).

### Header container CSS

**Night:** background `rgba(7,9,16,0.92)`, backdrop-filter `blur(20px) saturate(180%)`, border-bottom `rgba(255,255,255,0.06)`, min-height 68px, padding `0 16px`, padding-top `env(safe-area-inset-top)`
**Day:** background `rgba(255,255,255,0.96)`, border-bottom `rgba(0,0,0,0.04)`, box-shadow `0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03)`
**Z-index:** 10000001

---

## 2C — Mini-Player Discovery

### Media player entity

**Primary entity:** `media_player.benjamins_hatch_media_player` (hardcoded in v1's `MEDIA_PLAYER_ENTITY` constant)

**All media_player entities on this HA instance:**
- `media_player.living_room_tv` — Samsung TV
- `media_player.benjamins_hatch_media_player` — Hatch Rest Mini (Benjamin's room)
- `media_player.izzy_s_hatch_media_player` — Hatch Rest Mini (Izzy's room)
- `media_player.benjamins_tv` — Benjamin's TV
- `media_player.living_room_hub` — Google Home Hub
- `media_player.living_room` — Sonos/cast group
- `media_player.chriss_office` — Sonos/cast
- `media_player.dining_room`, `.gemelli`, `.master_bedroom`, `.patio`, `.office`, `.master_bathroom` — Sonos/cast zones
- `media_player.galaxy_tab_a9` — wall tablet
- `media_player.living_room_tv_qn75qn900afxza` — Samsung TV (alt)
- `media_player.browser_mod_*` — Browser Mod virtual players (unavailable)

**v2 Decision:** Monitor `media_player.benjamins_hatch_media_player` specifically (faithful port of v1). The mini-player is specifically for Benjamin's white noise machine status. Future enhancement could monitor "any active player" but that's out of scope for this chunk.

### Active state detection

v1 treats both `playing` and `paused` as "active" (mini-player visible). States `off`, `idle`, `unavailable`, `unknown` → mini-player hidden.

### Album art source

`entity.attributes.entity_picture` — HA serves this as a relative URL (e.g., `/api/media_player_proxy/media_player.benjamins_hatch_media_player`). Used as `<img src>`.

### Service calls

- Play/pause toggle: `hass.callService('media_player', state === 'playing' ? 'media_pause' : 'media_play', { entity_id: MEDIA_PLAYER_ENTITY })`
- Tap on mini-player body (not play button) → `hass-more-info` event with `MEDIA_PLAYER_ENTITY` (opens native HA media player dialog)
- No skip forward/skip back in v1 mini-player (only play/pause)

### Progress bar

- Duration: `entity.attributes.media_duration`
- Position: `entity.attributes.media_position`
- Percentage: `Math.min(100, (position / duration) * 100)`
- Visual: 2px bar, background `#1c2438`, fill `#00d4f0`, linear transition 1s

### Mini-player CSS

**Night:** background `rgba(11,14,23,0.95)`, backdrop-filter `blur(20px) saturate(180%)`, border-top `rgba(255,255,255,0.06)`, height 52px, positioned `bottom: 80px` (above 80px nav bar)
**Day:** background `rgba(255,255,255,0.96)`, border-top `rgba(0,0,0,0.04)`, box-shadow `0 -1px 3px rgba(0,0,0,0.06)`

- Art: 36×36px, border-radius 6px, background `#151c2a` (day: `#e4e8f0`)
- Track: 12px weight 600, color `#eef2f8` (day: `#1a2030`)
- Artist: 10px, color `#8a9ab8` (day: `#4a5a72`)
- Play icon: 24px `ha-icon`, color `#00d4f0` (day: `#0088a8`)

---

## 2D — Badge Signals Discovery

### v1 badge implementation

v1's `updateBadge()` function in kis-nav.js computes urgent + advisory counts:

**Urgent (red badge `#f04060`, day `#c02840`):**
1. Unlocked locks: `lock.front_door_lock`, `lock.back_door_lock`, `lock.gemelli_door_lock` — each `unlocked` state adds 1
2. Open garages: `cover.ratgdov25i_1746c3_door`, `cover.ratgdov25i_1746b4_door` — each `open` state adds 1
3. Alarm disarmed + everyone away: `alarm_control_panel.kuprycz_home` is `disarmed` AND `person.chris` !== `home` AND `person.claire` !== `home` → adds 1

**Advisory (amber badge `#f5a623`, day `#c07808`):**
Currently none in v1.

**Display:**
- Zero count → badge hidden (not shown as "0")
- Shown as number (capped at "9+")
- Badge class: `urgent` (red) if any urgent, else `advisory` (amber)

### HA update entities available for v2 badge

**Software updates (state = "on" means update available):**
- `update.tesla_update` — currently has update (v3.25.5 → v3.26.0)
- `update.hatch_rest_mini_sound_machine_update` — currently has update (v1.28.2 → v1.30.0)
- `update.frigate_server` — Frigate NVR

**No HA Core/Supervisor/OS update entities found** — this is a Docker-based install (no HA OS), so `update.home_assistant_core_update` and `update.home_assistant_supervisor_update` don't exist.

**HACS update entities:** All currently up-to-date (state = "off"). Available entities include `update.hacs_update`, `update.button_card_update`, `update.browser_mod_update`, `update.simple_swipe_card_update`, `update.weather_radar_card_update`, etc.

### v2 badge signal design

Port v1's exact logic (locks + garages + alarm-away) as urgent signals. Add HACS/integration updates as advisory signals. The extensible config array pattern:

```javascript
const BADGE_SIGNALS = [
  // Urgent — security
  { entity: 'lock.front_door_lock', condition: s => s === 'unlocked', tier: 'urgent' },
  { entity: 'lock.back_door_lock', condition: s => s === 'unlocked', tier: 'urgent' },
  { entity: 'lock.gemelli_door_lock', condition: s => s === 'unlocked', tier: 'urgent' },
  { entity: 'cover.ratgdov25i_1746c3_door', condition: s => s === 'open', tier: 'urgent' },
  { entity: 'cover.ratgdov25i_1746b4_door', condition: s => s === 'open', tier: 'urgent' },
  // Urgent — alarm away with nobody home (computed separately)

  // Advisory — updates
  { entity: 'update.hacs_update', condition: s => s === 'on', tier: 'advisory' },
  // Add more update entities here as needed
];
```

---

## 2E — v1 → v2 Visual Fidelity Reference

### Bottom nav bar

**Night:**
- Background: `rgba(7,9,16,0.95)`, backdrop-filter `blur(24px) saturate(200%)`
- Border-top: `rgba(255,255,255,0.06)`
- Min-height: 68px, padding-bottom: `env(safe-area-inset-bottom)`
- Inactive button: color `#4a5570`
- Active button: color `#00d4f0`, background `rgba(0,212,240,0.08)`, border-radius 12px
- Button: icon 22px (via `--mdc-icon-size`), label 9px weight 600 letter-spacing 0.08em uppercase
- Z-index: 9999999

**Day:**
- Background: `rgba(255,255,255,0.96)`, border-top `rgba(0,0,0,0.04)`, box-shadow `0 -1px 3px rgba(0,0,0,0.06), 0 -4px 12px rgba(0,0,0,0.03)`
- Inactive: `#7a8698`
- Active: color `#0088a8`, background `rgba(0,136,168,0.08)`

### Top header bar

See section 2B above for complete CSS values.

### Mini-player

See section 2C above for complete CSS values.

### Priority zone section label

v1 uses a dynamic `custom:button-card` with `template: section_label`:
- Font: 9px, weight 600, letter-spacing 0.15em, uppercase
- Color: `var(--kis-section-label, #4a5570)`
- Border-bottom: `1px solid var(--kis-section-rule, rgba(255,255,255,0.06))`
- Background: none, border: none, box-shadow: none

**Dynamic label logic (v1):** When `sensor.priority_camera !== 'none'`, label = `"MOTION: " + camera_friendly_name.toUpperCase()`. When no motion, label = `SLIDE_LABELS[slide_index].toUpperCase()` where SLIDE_LABELS = `['Porsche 911', 'Tesla Model Y', 'Mercedes G580', 'Weather', 'Weather Radar']`.

**v2 Decision (from launch prompt Q4):** Label matches current item literally — no "MOTION:" prefix. Just the item name: "FRONT DOOR", "PORSCHE 911", "WEATHER RADAR", etc.

### Camera picture-entity cards (in priority zone)

- `aspect_ratio: "16:9"` (native HA prop, not CSS)
- `camera_view: "live"`, `fit_mode: "fill"`
- Doorbell gets red border: `2px solid var(--error-color, #f04060)`, glow `0 0 12px rgba(240,64,96,0.35)`
- Interior cameras get teal border: `2px solid var(--accent-color, #00d4f0)`, glow `0 0 12px rgba(0,212,240,0.25)`
- Border-radius: 14px on ha-card

### Vehicle button-cards (in priority zone)

- Size via `extra_styles: :host { height: var(--kis-zone-h, 400px) !important; ... }`
- Icon size: 56px
- Icon colors: Porsche → `#10d090`, Tesla → `#e81c24`, Mercedes → `#00d4f0`
- Name: 15px weight 600 color `#eef2f8`, letter-spacing 0.03em
- Label: 11px, letter-spacing 0.08em, uppercase, color `rgba(138,154,184,0.7)`
- Card: padding `18px 16px`, border-radius 14px, background `var(--ha-card-background, rgba(16,21,31,0.72))`, border `1px solid rgba(255,255,255,0.06)`

### Weather button-card

Same card structure as vehicles. Dynamic icon based on `weather.forecast_home.state` (maps to mdi weather icons). Dynamic name shows temperature. Dynamic label shows condition + humidity + wind speed.

Icon colors by condition: sunny→`#f5a623`, clear-night→`#9d6ef0`, cloudy→`#8a9ab8`, rainy→`#4d8ef0`, etc.

### Weather radar card

- `custom:weather-radar-card` with RainViewer data source
- Center: Irving TX (32.814, -96.94), zoom 7
- frame_delay: 400, past_minutes: 120, map_style: "Dark"
- Marker shown, playback/zoom/recenter/scale/color_bar hidden
- radar_opacity: 0.7
- kis-nav.js patches: host gets `height: 100%; width: 100%; border-radius: 14px; overflow: hidden`. Shadow root gets `ha-card { height: 100% !important; }`, Leaflet background matches `--ha-card-background`, `#bottom-container { display: none }`

---

## 2F — Carousel Item Configuration Schema

```javascript
const CAROUSEL_ITEMS = [
  // Cameras (indices 0-4) — conditional, only rendered when motion active
  {
    type: 'camera',
    id: 'doorbell',
    label: 'FRONT DOOR',
    entity: 'camera.doorbell',
    motion_sensor: 'binary_sensor.doorbell_person_occupancy',
    priority: 100,  // highest — hard override
    border_color: 'var(--kis-red, #f04060)',
    glow_color: 'rgba(240,64,96,0.35)',
    popup: {
      camera_image: 'camera.doorbell',
      elements: [
        { template: 'cam_close' },
        { template: 'cam_lock_front_door' },
        { template: 'cam_ctrl_disabled', icon: 'mdi:microphone' },
        { template: 'cam_ctrl_disabled', icon: 'mdi:volume-high' },
      ]
    }
  },
  {
    type: 'camera',
    id: 'living_room',
    label: 'LIVING ROOM',
    entity: 'camera.nest_cam_1',
    motion_sensor: 'binary_sensor.nest_cam_1_person_occupancy',
    priority: 80,
    border_color: 'var(--kis-accent, #00d4f0)',
    glow_color: 'rgba(0,212,240,0.25)',
    popup: {
      camera_image: 'camera.nest_cam_1',
      elements: [
        { template: 'cam_close' },
        { template: 'cam_ctrl_disabled', icon: 'mdi:microphone' },
        { template: 'cam_ctrl_disabled', icon: 'mdi:volume-high' },
      ]
    }
  },
  {
    type: 'camera',
    id: 'bens_room',
    label: "BEN'S ROOM",
    entity: 'camera.nest_cam_2',
    motion_sensor: 'binary_sensor.nest_cam_2_person_occupancy',
    priority: 60,
    border_color: 'var(--kis-accent, #00d4f0)',
    glow_color: 'rgba(0,212,240,0.25)',
    popup: { /* same pattern as living_room */ }
  },
  {
    type: 'camera',
    id: 'nanit_benjamin',
    label: 'NANIT BENJAMIN',
    entity: 'camera.nanit_benjamin',
    motion_sensor: 'binary_sensor.nanit_benjamin_person_occupancy',
    priority: 40,
    border_color: 'var(--kis-accent, #00d4f0)',
    glow_color: 'rgba(0,212,240,0.25)',
    popup: { /* same pattern */ }
  },
  {
    type: 'camera',
    id: 'nanit_travel',
    label: 'NANIT TRAVEL',
    entity: 'camera.nanit_travel',
    motion_sensor: 'binary_sensor.nanit_travel_person_occupancy',
    priority: 20,
    border_color: 'var(--kis-accent, #00d4f0)',
    glow_color: 'rgba(0,212,240,0.25)',
    popup: { /* same pattern */ }
  },

  // Default carousel items (indices 5-9) — always rendered
  {
    type: 'vehicle',
    id: 'porsche_911',
    label: 'PORSCHE 911',
    icon: 'mdi:car-sports',
    icon_color: '#10d090',
    subtitle: 'Setup Required',
    entity: null,  // no HA entity yet
  },
  {
    type: 'vehicle',
    id: 'tesla_model_y',
    label: 'TESLA MODEL Y',
    icon: 'mdi:car-electric',
    icon_color: '#e81c24',
    subtitle_template: 'tesla_battery',  // sensor.tesla_battery_level + sensor.tesla_range
    entity: 'sensor.tesla_battery_level',
  },
  {
    type: 'vehicle',
    id: 'mercedes_g580',
    label: 'MERCEDES G580',
    icon: 'mdi:car-estate',
    icon_color: '#00d4f0',
    subtitle: 'Setup Required',
    entity: null,
  },
  {
    type: 'weather',
    id: 'weather',
    label: 'WEATHER',
    entity: 'weather.forecast_home',
  },
  {
    type: 'weather_radar',
    id: 'weather_radar',
    label: 'WEATHER RADAR',
    config: {
      data_source: 'RainViewer',
      center_latitude: 32.814,
      center_longitude: -96.94,
      zoom_level: 7,
      frame_delay: 400,
      past_minutes: 120,
      map_style: 'Dark',
      show_marker: true,
      show_playback: false,
      show_zoom: false,
      show_recenter: false,
      show_scale: false,
      show_color_bar: false,
      radar_opacity: 0.7,
    }
  },
];
```

Adding a new item (e.g., "Mercedes EQS") is a single object addition to this array.

---

## 2G — Key Implementation Notes

### v2 vs v1 architectural differences

1. **v1:** Carousel uses `custom:simple-swipe-card` (HA HACS custom card) wrapping 10 Lovelace cards (5 conditional + 5 static). Camera motion override handled by `kis-nav.js` calling `swipeCard.goToSlide(0)`. Section label is a separate `custom:button-card` above the swipe card, reading `sensor.priority_camera` and `input_number.priority_slide_index`.

2. **v2:** All of this collapses into a single `kis-priority-view` web component. The component owns its own carousel (touch events), section label, camera rendering (via picture-entity or direct camera stream), vehicle/weather rendering, and motion override state machine. No dependency on simple-swipe-card, button-card, or conditional cards for the priority zone.

### What v2 can reuse from v1

- Camera Follow Code automations (untouched — same `sensor.priority_camera` output)
- Same entity IDs for everything
- Same visual design language (colors, sizing, glassmorphism, border-radius)
- Same browser_mod popup pattern for camera fullscreen

### What v2 changes from v1

- Section label: literal item name instead of "MOTION: camera_name"
- Sticky-on: 2 minutes instead of 60 seconds (additional 60s added client-side on top of HA's 60s timer)
- No simple-swipe-card dependency — native touch carousel
- Vehicle cards: placeholder content for now (Porsche, Mercedes show "Setup Required"; Tesla shows battery if entity exists)
- Carousel is a self-contained web component — no cross-component coordination needed

### Camera rendering approach for v2

The kis-priority-view card will render camera feeds using HA's `<ha-camera-stream>` element (the same element used inside `hui-picture-entity-card`). This avoids reimplementing stream negotiation (WebRTC/HLS/MJPEG) and inherits HA's built-in go2rtc/Frigate stream handling. The card creates the element, sets `hass` and entity config on it, and wraps it in styled containers matching v1's visual treatment.

### App shell expansion scope

kis-app-shell.js currently handles theme initialization only. It will be expanded to include:
- Bottom nav bar (HOME + SETTINGS) — replaces the 6-tab nav from kis-nav.js with 2 tabs
- Top header bar (time/date/weather + presence pills + alarm chip) — same as v1's header
- Mini-player (same behavior as v1)
- Settings badge (same urgent signals as v1 + advisory update signals)

The app shell injects into `document.body` outside HA's shadow DOM, same as v1's kis-nav.js pattern.
