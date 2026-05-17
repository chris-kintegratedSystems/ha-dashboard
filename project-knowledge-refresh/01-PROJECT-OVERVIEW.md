# 01 — Project Overview

## What this is

A custom Home Assistant dashboard for Chris Kuprycz's smart home in
Irving, TX. Two dashboard systems: **mobilev2** (active development,
custom-card architecture) and **mobilev1** (maintenance only, legacy
JSON-card approach). Both deploy to a Raspberry Pi 5 running HA in
Docker.

---

## Current Deployed Versions

### mobilev2 (primary)
- **kis-app-shell.js** v42 — persistent UI layer (header, nav, mini-player, theme, hass bridge, FOUC prevention, kiosk toggle)
- **kis-control-panel.js** v30 — door locks + garage doors (bp.columns layout, box-sizing fix)
- **kis-scenes.js** v11 — scene buttons (3x2 phone grid)
- **kis-settings.js** v7 — theme mode, kiosk toggle, color picker
- **kis-priority-view.js** v15 — camera/vehicle carousel with motion override
- **kis-design-tokens.js** — shared sizing/color/responsive constants (ES import, not a registered resource)
- **kis-dashboard-v2.yaml** — Lovelace sections-view definition

### mobilev1 (maintenance)
- **kis-nav.js** v38 — fixed header + nav + mini-player
- **dashboard_mobilev1.json** — storage-mode Lovelace dashboard

---

## Repos

| Repo | Local path | Remote |
|------|-----------|--------|
| ha-dashboard | `C:\Projects\kintegrated\customers\ha-dashboard` | github.com/chris-kintegratedSystems/ha-dashboard (private) |
| ha-config | `C:\Projects\kintegrated\customers\ha-config` | github.com/chris-kintegratedSystems/ha-config (private) |

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | CC session protocol — mandatory read sequence, critical patterns, efficiency rules, deploy workflow |
| `MOBILEV2_ARCHITECTURE.md` | mobilev2 component pattern, CSS injection points, layout primitives, breakpoints, anti-patterns |
| `MOBILEV2_INVENTORY.md` | Current views, entity bindings, resource versions, deployed state |
| `kis-dashboard-v2.yaml` | mobilev2 Lovelace dashboard definition (sections-view) |
| `RELEASE_NOTES.md` | Chronological user-facing changelog per kis-nav.js version |
| `04-OPEN-WORK-QUEUE.md` | Canonical current-state work queue |
| `03-PHASE-HISTORY.md` | What each phase shipped, indexed by version |
| `dashboard_mobilev1.json` | Legacy mobilev1 dashboard (still deployed) |
| `kis-nav.js` | Legacy mobilev1 UI layer |
| `qa-screenshot.js` | Playwright QA tool (8 device profiles x views) |
| `qa-camera-burst.js` | FKB real-device camera burst capture |
| `.claude/memory/*.md` | Accumulated session lessons (dead ends, CSS patterns, deploy gotchas, component compat) |

---

## Infrastructure

| Component | Value |
|-----------|-------|
| HA host | Raspberry Pi 5, Debian Bookworm |
| HA IP | 192.168.51.179:8123 |
| SSH user | cooper5389 |
| HA container | Docker, host network mode |
| Z-Wave | Z-Wave JS UI via Docker (port 8091) |
| Portainer | Port 9000 |
| go2rtc | Standalone container (doorbell RTSP) + Frigate embedded (Reolink) |
| Frigate | NVR — detection on 5 cameras, snapshots, no event recording yet |
| Nanit | indiefan/nanit RTMP restream container |

---

## Devices

| Device | Dashboard | Notes |
|--------|-----------|-------|
| Samsung Galaxy Tab S9+ | Wall kiosk (Fully Kiosk Browser) | Primary display, landscape |
| iPhone (Chris) | HA Companion App | mobilev1 default view |
| iPad 11" | HA Companion App | Both orientations tested |

---

## QA Pipeline

- **qa-screenshot.js**: 8 device profiles x views = up to 48 Playwright screenshots + 1 FKB real-device capture
- **qa-camera-burst.js**: FKB screenshots for camera loading transitions
- **--mock-cameras**: Zero Nest API calls for layout iteration
- **--camera-delay N**: Spaces out device profiles to stay under Nest 5 QPM quota

Device profiles: iPad 11" (portrait/landscape), Tab S9+ (portrait/landscape), iPhone 17 Pro Max (portrait/landscape), iPhone 16 Pro (portrait/landscape).
