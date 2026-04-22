# 02 — Entities and Inventory

> Every HA entity the mobilev1 / tabletv1 dashboards or kis-nav.js
> reference. Verified against `/api/states` on 2026-04-22 at
> http://192.168.51.179:8123 . If an entity here does not exist, the
> dashboard will render a placeholder or a conditional will evaluate
> false — HA does not raise a warning for an undeclared entity.
>
> Update this file any time an entity is added, removed, or renamed —
> or whenever a conditional / template card fails silently (first check
> whether its trigger entity is actually `unavailable`).

Source of truth for the HA side: `C:\Projects\ha-config\CLAUDE.md`.

---

## Priority camera state machine

Drives the Home-view priority-display zone and motion-camera takeover.
Sensor output alphabet is the public contract with `kis-nav.js`
`PRIORITY_CAMERA_MAP` — DO NOT change the values.

| Entity | Type | Purpose |
|--------|------|---------|
| `sensor.priority_camera` | template sensor | Reads `input_text.active_priority_camera`. Output values: `doorbell` / `living_room` / `izzy` / `none`. |
| `input_text.active_priority_camera` | helper | Write target for the automation state machine. |
| `timer.priority_camera_linger` | 30 s timer | Started when all stickies clear; finish sets state back to `none`. |
| `input_datetime.last_motion_clear_living_room` | helper | Recorded on every Living Room sticky OFF. Used for freshness calc. |
| `input_datetime.last_motion_clear_izzy` | helper | Same for Izzy. |

### Motion stickies (hold-until-clear mirrors of raw motion)

| Entity | Source | Off delay |
|--------|--------|-----------|
| `binary_sensor.doorbell_motion_sticky` | Vivint `binary_sensor.doorbell_motion` | `delay_off: 00:00:30` |
| `binary_sensor.nest_cam_2_motion_sticky` | Nest `event.nest_cam_2_motion` (trigger-based) | `auto_off: 00:00:30` |
| `binary_sensor.nest_cam_1_motion_sticky` | Nest `event.nest_cam_1_motion` (trigger-based) | `auto_off: 00:00:30` |

---

## Lights — all 15 fixtures rendered on the Lights page

Kitchen (4):

| Entity | Display name | Dimmable |
|--------|--------------|----------|
| `light.countertop_lights` | Countertop | ✅ |
| `light.kitchen_chandelier` | Chandelier | ❌ |
| `light.kitchen_ceilings_lights` | Ceiling | ❌ |
| `light.kitchen_island_light` | Island | ❌ |

Living Room (2):

| Entity | Display name | Dimmable |
|--------|--------------|----------|
| `light.living_room_ceiling` | Ceiling | ✅ |
| `light.living_room_lamp_2` | Lamp | ✅ |

Outdoor (7):

| Entity | Display name | Dimmable |
|--------|--------------|----------|
| `light.garage_light` | Garage | ❌ |
| `light.outdoor_switch_2` | Patio String | ❌ |
| `light.front_porch_lights` | Front Porch | ❌ |
| `light.front_walkway_lights` | Front Walkway | ❌ |
| `light.upper_outdoor_lights` | Upper Outdoor | ❌ |
| `light.left_outdoor_patio_lights` | Left Patio | ❌ |
| `light.center_outdoor_patio` | Center Patio | ❌ |

Benjamin's Room (2):

| Entity | Display name | Dimmable |
|--------|--------------|----------|
| `light.benjamins_hatch_light` | Hatch Light | ✅ |
| `light.bens_light` | Ben's Light | ✅ |

### Known stale helpers (defined but unused as of v38)

The expand/collapse approach was removed in v38; these `input_boolean`
entities were never created in HA and the old dashboard silently failed
when it referenced them. They remain in the Settings UI as a leftover
cosmetic but nothing depends on them anymore:

- `input_boolean.lights_kitchen_expanded` — **unavailable**
- `input_boolean.lights_living_room_expanded` — **unavailable**
- `input_boolean.lights_outdoor_expanded` — **unavailable**
- `input_boolean.lights_benjamin_expanded` — **unavailable**

Also no-ops: `light.kitchen_all`, `light.living_room_all`,
`light.outdoor_all`, `light.benjamin_room_all` — room-master groups that
were wired to the removed master-toggle buttons. They still exist in HA
but the dashboard no longer calls them.

---

## Locks

| Entity | Label | Notes |
|--------|-------|-------|
| `lock.front_door_lock` | Front Door | |
| `lock.back_door_lock` | Back Door | |
| `lock.gemelli_door_lock` | Gemelli Door | Second home. |
| `lock.ratgdov25i_1746b4_lock_remotes` | Right Garage remote lockout | ratgdo "lock remotes" feature, not a physical lock — do NOT surface as a lock card. |
| `lock.ratgdov25i_1746c3_lock_remotes` | Left Garage remote lockout | Same. |

Garage bays are **covers**, not locks:

| Entity | Label |
|--------|-------|
| `cover.ratgdov25i_1746b4_door` | Right Garage |
| `cover.ratgdov25i_1746c3_door` | Left Garage |

Obstruction sensors (used by auto-close automation):

- `binary_sensor.ratgdov25i_1746b4_obstruction`
- `binary_sensor.ratgdov25i_1746c3_obstruction`

---

## Alarm

| Entity | Notes |
|--------|-------|
| `alarm_control_panel.kuprycz_home` | Vivint. States: `disarmed` / `armed_home` / `armed_away` / `triggered`. kis-nav.js maps to ALARM_DAY / ALARM_NIGHT color sets. |

---

## Cameras

| Entity | Type | Notes |
|--------|------|-------|
| `camera.doorbell` | Vivint DBC300 | Fronted by go2rtc. Use `camera_view: auto`. |
| `camera.nest_cam_2` | Nest | Rate-limit prone. `camera_view: auto`. |
| `camera.nest_cam_1` | Nest | Same. |
| `camera.nanit_benjamin` | ffmpeg → Nanit RTMP restream | Local RTMP, no cloud dependency. |
| `camera.nanit_travel` | ffmpeg → Nanit RTMP restream | Portable Nanit. |

Motion inputs feeding the priority state machine:

- `binary_sensor.doorbell_motion` → stickied (Vivint, steady-state)
- `event.nest_cam_2_motion` → stickied (Nest, event pulses)
- `event.nest_cam_1_motion` → stickied

Nanit motion/sound/cry events are **not** available — the fork publishes
via MQTT but Chris's HA has no MQTT broker yet.

---

## Presence / person entities

| Entity | Label | Used by |
|--------|-------|---------|
| `person.chris` | Chris | Header presence chip. |
| `person.claire` | Claire | Header presence chip. |
| `sensor.chris_distance_from_home` | template | Header subtitle. |
| `sensor.claire_distance_from_home` | template | Header subtitle. |

---

## Climate

| Entity | Label |
|--------|-------|
| `climate.living_room_ecobee` | Living Room Ecobee |
| `climate.bedroom_daikin` | Bedroom Daikin |
| (Additional climates exist but are not currently on the dashboard) |

---

## Day/night and navigation helpers

| Entity | Purpose |
|--------|---------|
| `sun.sun` | Day/night auto mode (below_horizon = night). |
| `input_select.theme_mode` | Override: `Auto` / `Day` / `Night`. Read by kis-nav.js and by the `theme_mode_sync` automation. |
| `input_number.priority_slide_index` | Current carousel slide (VEHICLES / WEATHER). Pushed by kis-nav.js on swipe. |

---

## How to verify an entity exists

```bash
source C:/Projects/kintegrated/projects/ha-dashboard/.env
curl -sS -H "Authorization: Bearer ${HA_QA_TOKEN:-$HA_TOKEN}" \
  http://192.168.51.179:8123/api/states/<entity_id>
```

A response of `{"message":"Entity not found."}` means the entity does
not exist. A response with `"state":"unavailable"` means the entity is
declared but the integration isn't providing a value right now —
treat as effectively unavailable for conditional logic.
