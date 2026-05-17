# mobilev2 Inventory — Current State Snapshot

Last updated: 2026-05-17

---

## Views

| View | Path | Type | max_columns | Sections | Status |
|------|------|------|-------------|----------|--------|
| Home | `/mobile-v2/home` | sections | 2 | 3 (scenes full-width, control-panel left, priority-view right) | Live |
| Settings | `/mobile-v2/settings` | sections | 1 | 1 (kis-settings) | Live |

### Planned views (not yet implemented)
- Climate — thermostat + room temps
- Lights — room-grouped brightness controls
- Cameras — dedicated camera grid (currently embedded in priority-view)
- Media — media player controls

---

## Custom Cards

### kis-scenes (`custom-cards/kis-scenes.js`)

| Property | Value |
|----------|-------|
| Tag | `kis-scenes` |
| Section | Home → top (column_span: 2, full-width) |
| Layout | 6-column CSS grid, responsive max-width on mobile (<599px) |

**Entity bindings:**
| Slot | Entity | Action |
|------|--------|--------|
| Good Morning | `script.scene_good_morning` | `script.turn_on` |
| Good Night | `script.scene_good_night` | `script.turn_on` |
| Away Mode | `script.scene_away_mode` | `script.turn_on` |
| Welcome Home | `script.scene_welcome_home` | `script.turn_on` |
| Movie Time | `script.scene_movie_time` | `script.turn_on` |
| Dinner Time | `script.scene_dinner_time` | `script.turn_on` |

Active detection: `last_triggered` within 60 minutes.

---

### kis-control-panel (`custom-cards/kis-control-panel.js`)

| Property | Value |
|----------|-------|
| Tag | `kis-control-panel` |
| Section | Home → left column (column_span: 1) |
| Layout | Desktop: CSS Grid with `grid-template-rows: auto 1fr 1fr 1fr auto 1fr`, `contain: size`. Mobile: flex column, garage-pair stacks at <430px. ResizeObserver for mobile min-height. |

**Entity bindings:**
| Slot | Entity | Tap | Hold (500ms) |
|------|--------|-----|--------------|
| Front Door | `lock.front_door_lock` | Toggle lock/unlock | Open more-info |
| Back Door | `lock.back_door_lock` | Toggle lock/unlock | Open more-info |
| Gemelli | `lock.gemelli_door_lock` | Toggle lock/unlock | Open more-info |
| Main Garage | `cover.ratgdov25i_1746c3_door` | Toggle open/close | Open more-info |
| Workshop Garage | `cover.ratgdov25i_1746b4_door` | Toggle open/close | Open more-info |

---

### kis-priority-view (`custom-cards/kis-priority-view.js`)

| Property | Value |
|----------|-------|
| Tag | `kis-priority-view` |
| Section | Home → right column (column_span: 1) |
| Layout | Carousel with touch/swipe, velocity-based gesture detection |

**Camera entity bindings (motion override):**
| Camera | Entity | Priority | Trigger |
|--------|--------|----------|---------|
| Doorbell | `camera.doorbell` | 100 | `sensor.priority_camera == 'doorbell'` |
| Living Room | `camera.living_room` | 80 | `sensor.priority_camera == 'living_room'` |
| Ben's Room | `camera.bens_room` | 60 | `sensor.priority_camera == 'bens_room'` |
| Nanit Benjamin | `camera.nanit_benjamin` | 40 | `sensor.priority_camera == 'nanit_benjamin'` |
| Nanit Travel | `camera.nanit_travel` | 20 | `sensor.priority_camera == 'nanit_travel'` |

**Default carousel items (when `sensor.priority_camera == 'none'`):**
| Slot | Content |
|------|---------|
| 1 | Porsche 911 (vehicle) |
| 2 | Tesla Model Y (vehicle) |
| 3 | Mercedes G580 (vehicle) |
| 4 | Weather |
| 5 | Weather Radar |

**State machine:** `default` → `motion` → `sticky` (120s client-side hold) → back to `default`

**Key entity:** `sensor.priority_camera` (passthrough from `input_text.priority_camera_lock`)

---

### kis-settings (`custom-cards/kis-settings.js`)

| Property | Value |
|----------|-------|
| Tag | `kis-settings` |
| Section | Settings → single section (column_span: 1) |
| Layout | Vertical stack: theme mode selector, kiosk toggle, color picker, about |

**Entity bindings:**
| Feature | Entity | Values |
|---------|--------|--------|
| Theme mode | `input_select.theme_mode` | Auto, Day, Night |
| Kiosk mode | `input_boolean.kiosk_mode` | on/off |
| Day colors (×10) | `input_text.kis_day_{key}` | Hex color per key |
| Night colors (×10) | `input_text.kis_night_{key}` | Hex color per key |

**Color keys (10 per mode):** `primary_accent`, `bg_app`, `text_primary`, `text_secondary`, `success`, `warning`, `error`, `info`, `scene_active`, `section_label`

Uses `window.KIS_THEME` API from app shell for live preview.

---

## App Shell Entity Bindings

The app shell (`kis-app-shell.js`) reads these entities directly (not via cards):

| Feature | Entity | Usage |
|---------|--------|-------|
| Theme mode | `input_select.theme_mode` | Day/Night/Auto resolution |
| Sun state | `sun.sun` | Auto mode → below_horizon = night |
| Weather | `weather.home` | Header: icon + temperature |
| Alarm | `alarm_control_panel.vivint` | Header: alarm state chip |
| Presence | `person.*` (all) | Header: presence pills |
| Media player | `media_player.benjamins_hatch_media_player` | Mini-player bar |
| Badge: locks | `lock.front_door_lock`, `lock.back_door_lock`, `lock.gemelli_door_lock` | Security attention signal |
| Badge: garages | `cover.ratgdov25i_1746c3_door`, `cover.ratgdov25i_1746b4_door` | Security attention signal |
| Badge: updates | `update.*` (all) | Update count attention signal |
| Day colors | `input_text.kis_day_*` (×10) | Custom theme overrides |
| Night colors | `input_text.kis_night_*` (×10) | Custom theme overrides |

---

## Resource Registration

All mobilev2 resources are registered in `.storage/lovelace_resources` on the Pi (NOT in `configuration.yaml`'s `extra_module_url`).

| Resource | Path | Current cache-bust | Git version |
|----------|------|-------------------|-------------|
| kis-app-shell.js | `/local/mobile_v2/kis-app-shell.js` | `?v=35` | v35 |
| kis-control-panel.js | `/local/mobile_v2/custom-cards/kis-control-panel.js` | `?v=26` | v26 |
| kis-scenes.js | `/local/mobile_v2/custom-cards/kis-scenes.js` | `?v=9` | v9 |
| kis-settings.js | `/local/mobile_v2/custom-cards/kis-settings.js` | `?v=6` | v6 |
| kis-priority-view.js | `/local/mobile_v2/custom-cards/kis-priority-view.js` | `?v=14` | v14 |

**kis-design-tokens.js** is imported by the cards at runtime (ES module `import`), not registered separately as a resource.

**kis-nav.js** (mobilev1) is loaded separately via `frontend.extra_module_url` in `configuration.yaml`.

---

## Deployed State vs Git Drift Check

As of 2026-05-17:

| File | Deployed (Pi) | Git (main) | Drift? |
|------|---------------|------------|--------|
| kis-app-shell.js | v=35 | v35 (VERSION='2') | No |
| kis-control-panel.js | v=26 | Matches | No |
| kis-scenes.js | v=9 | Matches | No |
| kis-settings.js | v=6 | Matches | No |
| kis-priority-view.js | v=14 | Matches | No |

**No drift detected.** Deployed state matches git on all resources.

---

## Infrastructure Notes

- **Dashboard YAML source of truth:** `kis-dashboard-v2.yaml` in this repo. Changes deploy via SCP to the Pi like any other resource.
- **Deploy method:** SCP to Pi `/tmp/` → `sudo cp` to target + permissions fix + docker restart. Or: `sed -i` cache-bust in `lovelace_resources` + docker restart for version bumps only.
- **Dashboard storage:** `/home/cooper5389/homeassistant/config/.storage/lovelace.dashboard_mobilev2`
- **Dashboard YAML on Pi:** `/home/cooper5389/homeassistant/config/www/mobile_v2/kis-dashboard-v2.yaml`
- **Static assets:** `/home/cooper5389/homeassistant/config/www/mobile_v2/`
- **HA restart required:** Yes, always — HA caches both Lovelace config and resource URLs in memory.
- **Cache-bust pattern:** Increment `?v=N` in lovelace_resources entry + docker restart. FKB hard-refresh on Tab S9 after.
