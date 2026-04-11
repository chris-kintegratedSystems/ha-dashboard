# PRD: Home Assistant Dashboard Redesign — Kuprycz Residence
> Project: KIS-HA-DASH-001
> Author: Product Agent
> Status: Draft — Pending Chris Approval
> Last Updated: 2026-04-11

---

## 1. Overview

Chris wants a full redesign of the Lovelace dashboard for his personal Home Assistant instance at 192.168.51.179. The current dashboard is functional but visually inconsistent and not optimized for family usability. This redesign focuses on clarity, speed, and a polished look that reflects KIS brand standards.

---

## 2. Goals

- **Primary:** A wall-mounted kiosk on the Samsung Galaxy Tab S9+ that functions as the home's control center — always-on, always readable, zero confusion for Claire or Benjamin
- **Secondary:** Equally usable on iPhone via the HA Companion app and on iPad
- **Visual:** Professional dark theme consistent with KIS brand identity; not generic HA defaults
- **UX:** Any family member can control lights, locks, or climate in under 2 taps — no hunting through cards

---

## 3. Non-Goals

- This PRD does not cover automations, scripts, or scenes (separate backlog)
- No changes to HA backend, integrations, or entities
- No new hardware or integrations added during this project

---

## 4. Target Devices

| Device | Role | Resolution | Mode |
|--------|------|------------|------|
| Samsung Galaxy Tab S9+ | Primary — wall kiosk, always-on | 1752 × 2800 (landscape) | kiosk-mode, full screen |
| iPhone (Companion app) | Secondary — on-the-go control | 390 × 844 | portrait, scrollable |
| iPad | Tertiary — couch browsing | 1024 × 1366 | landscape or portrait |

**kiosk-mode config:** header hidden, sidebar hidden, all devices.

---

## 5. UX Principles

1. **Kiosk-first layout:** The Tab S9+ in landscape is the design target. Everything important should be visible or one scroll away. Aim for a 2–3 column grid that fills the 1752px width.
2. **Two-tap maximum:** Any action (lock a door, adjust temperature, turn on a light group) must be reachable in 2 taps maximum from the home screen.
3. **Family-safe controls:** No destructive or confusing states exposed. Alarm arming must show clear confirmation. Lock/unlock must show clear state.
4. **Status at a glance:** The top strip shows security state, presence, and weather without any tapping needed.
5. **Dark theme only:** Matches KIS brand — dark backgrounds, cyan/blue accents. Better for kiosk display brightness management.
6. **Clear icon labeling:** Every card has a human-readable label. No icon-only cards for family members.

---

## 6. Design System

### Colors (mapped from KIS brand guide)

| Token | Hex | Usage in Dashboard |
|-------|-----|--------------------|
| `--bg-base` | `#06080e` | Page/dashboard background |
| `--bg-card` | `#0d1e38` | Card surface |
| `--bg-card-hover` | `#112244` | Card hover / active |
| `--accent-cyan` | `#00C8E8` | Active states, highlights, icons on |
| `--accent-blue` | `#1565C0` | Secondary accents, section labels |
| `--text-primary` | `#e4e8f0` | Primary labels, values |
| `--text-muted` | `#6a8090` | Secondary labels, sub-values |
| `--border` | `rgba(0,200,232,0.15)` | Card borders |
| `--state-locked` | `#00C8E8` | Lock secured state |
| `--state-unlocked` | `#f59e0b` | Lock open — amber warning |
| `--state-open` | `#ef4444` | Garage/door open — red alert |
| `--state-alarm` | `#ef4444` | Alarm triggered |
| `--state-armed-home` | `#f59e0b` | Alarm armed home |
| `--state-armed-away` | `#1565C0` | Alarm armed away |
| `--state-disarmed` | `#22c55e` | Alarm disarmed — green safe |

### Typography

- **Headings / section labels:** Rajdhani 700 (matches KIS brand)
- **Body / values:** Barlow 400/500
- **Small labels / eyebrows:** Barlow Condensed 600, uppercase, letter-spaced
- All fonts loaded via Google Fonts (same as KIS website)

### Card Anatomy

All control cards follow a consistent anatomy:
```
[Icon]  [Primary Label]        [State Badge]
        [Secondary value]      [Action Button]
```
- Height target: 80px for single-entity control cards
- Radius: 8px (matches KIS brand)
- Border: 1px solid `rgba(0,200,232,0.15)`
- Hover: background shifts to `#112244`, border brightens

### Icon Style

- Use MDI icons throughout (standard HA icon set)
- Active state: `--accent-cyan` (#00C8E8)
- Inactive state: `--text-muted` (#6a8090)
- Alert state: red `#ef4444`

---

## 7. Proposed Dashboard Structure

The redesign reorganizes the current flat list into semantic sections. Proposed order:

### Section 0: Status Bar (always visible, top of page)
A full-width strip, not scrollable off-screen.
- **Clock + Date** (left) — large, always visible
- **Weather** (center) — current temp, condition icon, today's high/low
- **Alarm State Badge** (right) — large colored badge showing DISARMED / ARMED HOME / ARMED AWAY / TRIGGERED
- **Presence chips** (far right) — Chris and Claire with home/away icons

This replaces the current separate Clock/Weather and Presence sections which are disconnected.

### Section 1: Quick Actions
A horizontal strip of scene/automation buttons (custom:button-card, icon + label):
| Button | Action | Icon |
|--------|--------|------|
| Good Morning | Scene or script | mdi:weather-sunrise |
| Goodnight | Lock all + arm home + lights off | mdi:moon-waning-crescent |
| Away Mode | Arm away + lock all + HVAC eco | mdi:home-export-outline |
| Welcome Home | Disarm + unlock front + lights on | mdi:home-import-outline |
| Movie Time | Dim living room + TV scene | mdi:television-play |

These are the "power user" shortcuts for Chris and habitual daily actions for Claire.

### Section 2: Security
Two sub-sections side-by-side:

**Locks (left):**
- Front Door Lock (`lock.front_door_lock`)
- Back Door Lock (`lock.back_door_lock`)
- Gemelli Door (`lock.gemelli_door`)
- Card type: custom:button-card with state-based color (locked = cyan, unlocked = amber)
- Tap to toggle with confirmation popup (browser_mod)

**Garage (right):**
- Left Garage (`cover.ratgdov25i_1746c3_door`)
- Right Garage (`cover.ratgdov25i_1746b4_door`)
- Card type: custom:button-card showing open/closed state
- Open = red alert state; Closed = green safe state
- Tap to toggle (no confirmation needed — garages are visible on cameras)

### Section 3: Climate
A 2×2 grid of thermostat cards, each showing:
- Current temperature (large, primary)
- Set point with up/down arrows
- Current mode (heat/cool/auto/off) as icon badge
- Entity: climate.daikin (Living Room), climate.gemelli, climate.master, climate.upstairs

Card type: custom:button-card or mushroom-climate-card
Recommended: mushroom-climate-card for native HA climate controls, wrapped in card_mod for styling

### Section 4: Lights — grouped by room
Current design is 15 lights in a flat list. **Proposed: group by room with a master room toggle + expandable individual controls.**

| Group | Room Toggle | Individual Lights |
|-------|------------|-------------------|
| Kitchen | Group toggle | Countertop, Chandelier, Ceiling Lights, Island |
| Living Room | Group toggle | Ceiling, Lamp 2 |
| Outdoor | Group toggle | Garage Light, Patio String, Front Porch, Front Walkway, Upper Outdoor, Left Patio, Center Patio |
| Bedrooms | Group toggle | Benjamin's Hatch Light, Ben's Light |

Each group: one large room toggle card + collapsible or scrollable row of individual light controls.

Card type: light-group entity or custom:button-card tap_action: more-info for individual lights, hold_action: toggle for quick off.

### Section 5: Cameras
Three camera feeds in a 3-column grid:
- Doorbell (`camera.doorbell`)
- Izzy (`camera.izzy_camera`)
- Living Room (`camera.living_room_camera`)

Each card: picture-glance or custom-image with camera_view: auto. Tap opens browser_mod popup with full-size stream.

On mobile (iPhone): cameras stack vertically, each tap-to-expand.

### Section 6: Media
Single card row:
- Benjamin's speaker (`media_player.benjamins_hatch_media_player`)
- Shows currently playing media, volume slider, play/pause/skip
- Card type: mini-media-player (custom card)

### Section 7: (Optional) Irrigation
- Rachio controller status
- Quick "Run Zone" buttons if Chris wants watering control from the dashboard
- Card type: custom:button-card or entity card
- **Status: Hold — Chris to confirm if Rachio is integrated in HA**

---

## 8. Reorganization vs. Current Structure

| Current | Proposed Change | Reason |
|---------|----------------|--------|
| Clock & Weather (separate top card) | Merged into Status Bar with alarm + presence | Consolidates at-a-glance info into one strip |
| Alarm (standalone section) | Moved into Status Bar badge + Security section | Alarm state is always visible; arming actions in Security |
| Locks (horizontal-stack of 3) | Security section, left column | Better grouped with garage logically |
| Garage (2 covers) | Security section, right column | Paired with locks as "access control" |
| Climate (2×2 grid) | Retained, restyled with clearer temp display | Current layout is good, just needs visual polish |
| Lights (15 flat entities) | Grouped into 4 rooms | Major UX improvement — easier for family |
| Cameras (with browser_mod popups) | Retained, restyled in 3-col grid | Already works well |
| Presence (bottom, mushroom) | Moved to Status Bar | Presence should be always-visible context |
| (none) | New: Quick Actions strip | Power shortcuts save daily taps |
| (none) | New: Media section | Benjamin's speaker should be accessible |

---

## 9. Card Library Usage

| Card | Used For | Notes |
|------|---------|-------|
| `custom:button-card` | Locks, Garage, Quick Actions, Light toggles | Primary workhorse — state-based styling |
| `custom:mushroom-climate-card` | Thermostats | Best native feel for HVAC |
| `custom:mushroom-template-card` | Presence display | Already in use |
| `custom:clock-weather-card` | Status bar clock+weather | Retained from current setup |
| `picture-glance` or `custom:camera-card` | Camera feeds | camera_view: auto required |
| `browser_mod` popups | Lock confirm, camera full-screen | Retained from current setup |
| `card_mod` | Global styling overrides | Used everywhere for theming |
| `kiosk-mode` | Header/sidebar hiding | Applied via dashboard config |

---

## 10. Mobile Adaptations

| Feature | Tab S9+ (landscape) | iPhone (portrait) | iPad |
|---------|--------------------|--------------------|------|
| Status bar | Full-width single row | Stacked 2 rows | Full-width |
| Quick Actions | 5 buttons in a row | 2×3 grid | 5 in a row |
| Security | 2-col side by side | Stacked | 2-col |
| Climate | 2×2 grid | 2×2 grid (smaller) | 2×2 grid |
| Light groups | 4 group cards in a row | 2-col grid | 4 in a row |
| Cameras | 3-col grid | Stacked vertical | 3-col |

---

## 11. Open Questions (for Chris)

1. **Quick Actions:** Which scenes/scripts already exist in HA? The PRD proposes 5 — which ones need to be built vs. already exist?
2. **Light groups:** Are there existing `light` group entities, or do we need to create them in HA config?
3. **Rachio:** Is the Rachio integration active in HA? Should it appear on the dashboard?
4. **Alarm code pad:** Should the dashboard include a keypad card for arming/disarming, or does Chris use the Vivint app for that?
5. **Brightness schedule:** Does the kiosk need auto-dim at night? (Can be handled via HA automation + kiosk-mode, outside scope of this PRD but worth planning)
6. **Benjamin's section:** Should there be a "Benjamin" tab or page with his lights + media, separate from the main family view?

---

## 12. Acceptance Criteria

- [ ] All entities listed in Section 7 appear on the dashboard
- [ ] No HA restart required after deploy (Lovelace YAML only)
- [ ] Tab S9+ landscape view: no horizontal scroll, all primary controls visible without vertical scroll
- [ ] iPhone portrait view: all sections accessible via vertical scroll, no content clipped
- [ ] Lock and garage state colors match spec (locked=cyan, unlocked=amber, open=red)
- [ ] Alarm state badge visible without scrolling on all devices
- [ ] Climate cards show current temp AND set point simultaneously
- [ ] Camera feeds use camera_view: auto
- [ ] kiosk-mode hides header and sidebar
- [ ] No hardcoded secrets — secrets.yaml for any sensitive values
- [ ] Chris reviews mockup and approves layout before YAML is written

---

## 13. Deliverables & Handoff

| Deliverable | Owner | Status |
|------------|-------|--------|
| PRD (this document) | Product Agent | Draft |
| Visual mockup (mockup.html) | Product Agent | In Progress |
| Dashboard YAML | Dev Agent | Not Started — blocked on mockup approval |
| QA test plan | QA Agent | Not Started |
| Deploy to 192.168.51.179 | Dev Agent | Not Started |

**Handoff condition:** Chris approves the mockup.html. Dev Agent may then begin YAML implementation.

---

*KIntegrated Systems | Confidential | kintegratedsystems.com | (214) 478-2680*
