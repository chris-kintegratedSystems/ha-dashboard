# 04 — Open Work Queue

Canonical current-state queue. Items ordered by rough priority within
each category. Status tags: **in-progress**, **queued**, **blocked**,
**research**.

Last updated: 2026-05-17

---

## In Progress

### Issue 1 — Responsive breakpoint system (Stages 3/4/5)
- **Status:** in-progress
- Stage 3: density-aware sizing in `kis-settings.js`
- Stage 4: validation sweep across all cards on 8 device profiles.
  Stage 4 must re-baseline at A9+ real viewport (1280×799) and diff
  against current `/qa/baseline-pre-issue1/` screenshots taken at
  1440×900. Document any visual delta. Math justification in proposal
  §3 holds (752→651 usable height after chrome, 500px landscape layout
  fits with 151px margin).
- Stage 5: real-device sign-off (Galaxy Tab A9+ + iPhone + iPad)
- Stages 1+2 merged (PRs #64, #65)

---

## mobilev2 Phase Queue

### Phase 2 — Climate
- **Status:** queued
- Thermostat card, room temperature grid, HVAC mode control
- 4 thermostats: Daikin (Living Room), Gemelli, Master, Upstairs (Ecobee)
- Climate tap-to-toggle HVAC was deferred by Chris (2026-04-19)

### Phase 3 — Lights
- **Status:** queued
- Room-grouped brightness sliders, scene-aware state
- mobilev1 Lights page (v38) serves as reference for entity bindings

### Phase 4 — Cameras
- **Status:** queued
- Dedicated camera grid view
- Pattern from mobilev1: `type: panel` + native `grid` card with `aspect_ratio: "16:9"` prop

### Phase 5 — Media
- **Status:** queued
- Full media player page, queue, source selection
- Currently only mini-player in app shell header

---

## Dashboard Features

### Camera two-way audio (talk + listen)
- **Status:** blocked
- Vivint DBC300 backchannel support in go2rtc is unverified
- Requires go2rtc backchannel config + `custom:webrtc-camera` HACS card
- Blocker: `custom:webrtc-camera` install requires Chris approval

### Camera name-label suppression on feeds
- **Status:** queued
- HA's entity-name overlay sits on top of live camera stream
- Needs CSS (shadow-root injection?) or card swap to suppress
- Purely cosmetic, not urgent

### Release / version tagging
- **Status:** queued
- `RELEASE_NOTES.md` exists but releases are not yet tagged in git
- Proposal: tag `v<N>` on every merge that bumps a resource version

### Galaxy Tab A9+ kiosk auto-dim
- **Status:** queued, ready to scope when picked up
- Auto-dim/screen-off schedule for wall kiosk when no motion detected
- Buildable today via existing FKB integration entities:
  - `number.galaxy_tab_a9_screen_brightness` (already exposed in HA)
  - `switch.galaxy_tab_a9_motion_detection` (already exposed in HA,
    uses tablet front camera for motion detection)
- HA automation: motion detected → bright; no motion for N minutes → dim
- No external hardware purchase needed (mmWave sensor NOT required)

### Vehicle tiles
- **Status:** queued
- Carousel vehicle tiles (Porsche 911, Tesla Model Y, Mercedes G580)
- Design doc: `Vehicle-Tiles-Design-Plan.md`
- Currently placeholder items in priority-view carousel

---

## HA Infrastructure

### Nanit MQTT events (motion / sound / cry)
- **Status:** queued
- `indiefan/nanit` fork publishes via MQTT auto-discovery
- Chris's HA stack has no MQTT broker (mosquitto) yet
- Path: add mosquitto container, flip `NANIT_MQTT_ENABLED=true`, extend priority-camera state machine
- Nanit cameras are operational but do NOT participate in motion-triggered takeover

### Frigate event recording enable
- **Status:** queued — audited and ready
- Event-based recording, person-only trigger, 14-day retention
- All 5 cameras, 10s pre/post buffer, snapshots enabled
- Storage: 205 GB free on NVMe at audit time
- Blocker: none

### Tesla + Wall Connector
- **Status:** queued — not yet configured in HA
- Vehicle entity + Wall Connector integration
- Scope: charge level, charge control, vehicle location, climate preconditioning

### iAquaLink pool
- **Status:** queued — not yet configured in HA
- Pool pump, heater, chemical levels
- Scope: pool temperature, pump schedule, heater control

### Flair smart vents
- **Status:** queued — not yet configured in HA
- Per-room airflow control via smart vent positions
- Pairs with existing 4-thermostat setup

### Reolink permanent install
- **Status:** queued
- Reolink RLC-820A currently bench-tested near rack
- Permanent living room ceiling install is future work
- Camera entity already in HA as `camera.reolink_living_room_temp`

### Pi operational cleanup
- **Status:** queued
- Move `NANIT_PASSWORD` out of plain-text `docker-compose.yaml` into `.env` or `secrets:` mount
- Flagged in ha-config CLAUDE.md under Nanit Integration

### HA maintenance script
- **Status:** queued
- Automated apt update + docker pull + image prune + health check
- Currently manual per ha-config CLAUDE.md maintenance section

---

## Research / Future

### UniFi camera migration
- **Status:** research
- Migrate from Nest SDM cameras to UniFi for native RTSP (Tier A source)
- Would resolve WebRTC choppiness issue with Nest cameras

### WiFi fast roaming (802.11r/k/v)
- **Status:** research — relevance unverified
- Hypothesized as root cause for mobile WebRTC stutter, but stationary wired clients also show choppiness
- Start: verify current Araknis AP fast roaming state
- Reference: `FAST_ROAMING_RESEARCH_AND_TEST_PLAN.md` (Drive)

### Nest camera keyframe interval tuning
- **Status:** queued — small, complements WiFi fast roaming
- Frigate go2rtc config (`input_kf=1` on nest_cam_1, nest_cam_2)
- Reduce keyframe interval from 2s to 1s for faster freeze recovery

### Wyoming voice satellite
- **Status:** research
- Local voice control via Wyoming protocol
- Requires ESP32 or similar hardware

### Local LLM inference
- **Status:** research
- On-device LLM for HA automations and voice processing
- Hardware-dependent — may require Mac Mini or dedicated compute

### Hardware migration (Mac Mini M4 Pro)
- **Status:** research
- Replace Pi 5 with Mac Mini M4 Pro for more compute headroom
- Would support more cameras, local LLM, faster Frigate inference
- Cost-benefit analysis not yet done

---

## Docs / Maintenance

### Docs hygiene — stale izzy / entity-stem references
- **Status:** queued — low priority, cosmetic
- Several doc files still reference old key alphabet (`izzy`, `nest_cam_1` as key)
- Files: `01-PROJECT-OVERVIEW.md`, `02-ENTITIES-AND-INVENTORY.md`, `PRD.md`, `transform.py`, `Motion-Camera-Priority-Logic.md`
- No runtime impact

---

## Active branches awaiting PR (mobilev1)

| Repo | Branch | Notes |
|------|--------|-------|
| ha-config | `fix/motion-camera-timing` | Freshness-based motion priority. Uses old key alphabet — conflicts with key-mapping hotfix. |
| ha-config | `fix/lights-page-redesign` | Cache-bump v37 to v38. Branched off motion-camera-timing. |
| ha-dashboard | `fix/lights-page-redesign` | v38 Lights page redesign. |

These are mobilev1 branches. Merge hotfix/camera-follow-code-key-mapping
first (already merged per PR #41) before these can land cleanly.

---

## Closed items (for reference)

- WiFi cam rename: MOOT — old entities replaced by Frigate/Nest SDM
- G10 camera black: RESOLVED 2026-05-01
- HA log orphan curl loop: COMPLETED May 2026
- Nanit camera prep (Docker + HA config): COMPLETE — both cameras operational
