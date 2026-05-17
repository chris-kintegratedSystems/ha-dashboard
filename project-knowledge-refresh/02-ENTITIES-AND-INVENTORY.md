# 02 — Entities and Inventory

Current entity truth sourced from `ha-config/CLAUDE.md` and
`MOBILEV2_INVENTORY.md`. Last refreshed: 2026-05-17.

---

## Locks

| Name | Entity ID | Dashboard slot |
|------|-----------|---------------|
| Front Door | `lock.front_door_lock` | Control panel |
| Back Door | `lock.back_door_lock` | Control panel |
| Gemelli Door | `lock.gemelli_door_lock` | Control panel |

---

## Garage Doors (ratgdo)

| Name | Entity ID | Notes |
|------|-----------|-------|
| Main Garage (Left) | `cover.ratgdov25i_1746c3_door` | Opening: 11.1s, Closing: 13.2s |
| Workshop Garage (Right) | `cover.ratgdov25i_1746b4_door` | Opening: 11.2s, Closing: 12.4s |
| Left Garage Light | `light.ratgdov25i_1746c3_light` | |
| Right Garage Light | `light.ratgdov25i_1746b4_light` | |
| Left Obstruction | `binary_sensor.ratgdov25i_1746c3_obstruction` | |
| Right Obstruction | `binary_sensor.ratgdov25i_1746b4_obstruction` | |
| Left Motion | `binary_sensor.ratgdov25i_1746c3_motion` | |
| Right Motion | `binary_sensor.ratgdov25i_1746b4_motion` | |

---

## Thermostats

| Name | Entity ID | Notes |
|------|-----------|-------|
| Living Room | `climate.daikin` | Modes: auto, heat, cool, off. Use `Math.round()` for temp display. |
| Gemelli | `climate.gemelli` | |
| Master | `climate.master` | |
| Upstairs | `climate.upstairs` | Ecobee |

*Note: 4 thermostats confirmed. A 5th thermostat entity has not been
identified in ha-config.* [VERIFY]

---

## Cameras (6 total — all in Frigate)

| Name | Entity ID | Source | Priority Key | Notes |
|------|-----------|--------|-------------|-------|
| Doorbell | `camera.doorbell` | Vivint DBC300 via RTSP / go2rtc standalone | `doorbell` | Priority 100. `camera_view: auto`. 960x960 @15fps, H.264 Main L3.1, ~700kbps. |
| Nest Cam 1 (Living Room) | `camera.nest_cam_1` | Nest SDM / google_nest_sdm integration | `living_room` | Priority 80. 1080p24, H.264 High L4.0, ~1.5Mbps, 5s keyframe. Older Nest HW. Rate-limit prone. |
| Nest Cam 2 (Ben's Room) | `camera.nest_cam_2` | Nest SDM / google_nest_sdm integration | `bens_room` | Priority 60. 1080p30, H.264 High L4.0, ~1.2Mbps, 2s keyframe. Newer Nest HW. |
| Nanit Benjamin | `camera.nanit_benjamin` | indiefan/nanit RTMP restream, ffmpeg platform | `nanit_benjamin` | Priority 40. 1080p10 @1.2Mbps. HW v2.0, MOBILE profile caps fps. |
| Nanit Travel | `camera.nanit_travel` | indiefan/nanit RTMP restream, ffmpeg platform | `nanit_travel` | Priority 20. 960p10 @1.9Mbps. HW v1.5, at hardware ceiling. |
| Reolink (temp) | `camera.reolink_living_room_temp` | Reolink RLC-820A at 192.168.51.70 via Frigate embedded go2rtc | N/A (live-view only) | 2560x1440 @25fps H.264. Detect/record/snapshots disabled. Bench-tested, permanent install pending. |

### Retired camera entities (do not reference)
- `camera.izzy_camera` — replaced by `camera.nest_cam_2` (Frigate/Nest SDM)
- `camera.living_room_camera` — replaced by `camera.nest_cam_1` (Frigate/Nest SDM)

### Camera priority order
`doorbell > living_room > bens_room > nanit_benjamin > nanit_travel`

Driven by `sensor.priority_camera` (template passthrough from
`input_text.priority_camera_lock`). 7 automations in ha-config manage
lock acquisition, preemption, and 60s trailing hold.

### Camera notes
- Nanit cameras are **operational** — both `camera.nanit_benjamin` and `camera.nanit_travel` streaming via local RTMP restream. Docker container: `indiefan/nanit` on the Pi.
- Nanit motion/sound/cry events are NOT yet integrated (requires MQTT broker — mosquitto not installed).
- Always use `camera_view: auto` in dashboard cards.
- Nest cameras have documented WebRTC choppiness (H.264 Baseline profile causes browser HW decoder rejection). RTSP/RTMP sources (doorbell, Nanit, Reolink) are smooth.

---

## Alarm

| Entity | Integration | Notes |
|--------|-------------|-------|
| `alarm_control_panel.vivint` | Vivint (HACS: natekspencer/ha-vivint) | States: disarmed, armed_home, armed_away, arming, pending, triggered |

Also referenced as `alarm_control_panel.kuprycz_home` in ha-config
CLAUDE.md. [VERIFY — may be same entity with different ID in different
contexts]

Known issue: 520 errors are intermittent Vivint cloud errors, not a
code bug.

---

## Lights

```
light.countertop_lights
light.kitchen_chandelier
light.kitchen_ceilings_lights
light.kitchen_island_light
light.living_room_ceiling
light.living_room_lamp_2
light.garage_light
light.outdoor_switch_2          # friendly name: "Patio String Lights"
light.front_porch_lights
light.front_walkway_lights
light.upper_outdoor_lights
light.left_outdoor_patio_lights
light.center_outdoor_patio
light.benjamins_hatch_light
light.bens_light
```

---

## Scene Script Wrappers

Scripts that wrap HA scenes so the dashboard can track active state via
`last_triggered`:

| Script | Dashboard slot |
|--------|---------------|
| `script.scene_good_morning` | Scenes card |
| `script.scene_good_night` | Scenes card |
| `script.scene_away_mode` | Scenes card |
| `script.scene_welcome_home` | Scenes card |
| `script.scene_movie_time` | Scenes card |
| `script.scene_dinner_time` | Scenes card |

Active detection: `last_triggered` within 60 minutes.

---

## Presence / People

| Person | Entity | Notes |
|--------|--------|-------|
| Chris | `person.chris` | `sensor.chris_distance_from_home` |
| Claire | `person.claire` | `sensor.claire_distance_from_home` — requires HA Companion app, Location Always, Background Refresh on |
| Benjamin | (no tracking entity) | Family member |

---

## Media

| Entity | Notes |
|--------|-------|
| `media_player.benjamins_hatch_media_player` | Mini-player in app shell header |

---

## Weather

| Entity | Usage |
|--------|-------|
| `weather.home` | Header: icon + temperature |
| `sun.sun` | Auto theme mode: below_horizon = night |

---

## Theme / Settings Entities

| Entity | Purpose |
|--------|---------|
| `input_select.theme_mode` | Auto / Day / Night |
| `input_boolean.kiosk_mode` | Kiosk chrome toggle (initial: true, resets on HA restart) |
| `input_text.kis_day_{key}` (x10) | Custom day color overrides |
| `input_text.kis_night_{key}` (x10) | Custom night color overrides |

Color keys (10 per mode): `primary_accent`, `bg_app`, `text_primary`,
`text_secondary`, `success`, `warning`, `error`, `info`, `scene_active`,
`section_label`.

---

## Not Yet Configured (queued)

| Integration | Status |
|-------------|--------|
| Tesla (vehicle + Wall Connector) | Queued — not yet added to HA |
| iAquaLink (pool) | Queued — not yet added to HA |
| Flair (smart vents) | Queued — not yet added to HA |
| UniFi cameras | Queued — future migration path |
| Wyoming voice satellite | Queued — research phase |

---

## Z-Wave

| Device | Entity ID | Node | Notes |
|--------|-----------|------|-------|
| AeoTec TriSensor (Garage) | `binary_sensor.aeotec_trisensor_garage_motion_detection` | Node 35 | Wake-up: 3600s, Untrigger: 60s, ~50% packet drop |
| Node 25 | Unknown | 25 | One-way comm failure — 0/10 return pings |

---

## Other Integrations

| Integration | Notes |
|-------------|-------|
| Rachio | Irrigation system |
| Ecobee | Upstairs thermostat |
| Google Nest | Cameras (SDM API) |
| browser_mod | Popup cards on mobilev1 dashboard |
| HACS | button-card, simple-swipe-card, kiosk-mode, clock-weather-card, browser_mod, weather-radar-card |
