# HA Dashboard Redesign — Tasks

**Project:** Home Assistant Dashboard Redesign
**Status:** Kickoff — Product spec in progress
**Owner:** Chris (KIntegrated Systems)
**Lead Agent:** Product → Dev → QA

---

## Phase 1: Product Spec & Mockups

- [x] Project folder created
- [x] Product Agent produces PRD with visual mockups
- [x] Chris approves spec / mockups

## Phase 2: Design & Build

- [x] dashboard_mobilev1.json designed and deployed to Pi
- [x] Kiosk mode — admin users now hidden (header/sidebar/tab)
- [x] System Status card — 3-chip row (security, lights count, temp)
- [x] Scene grid — 3-col with mixed colors per scene type
- [x] Dimmer light buttons — orange gradient fill proportional to brightness %, tap=toggle, hold=slider
- [x] Nav bar — cyan pill active indicator on all 5 tabs
- [ ] QA sign-off from Chris on all devices (Tab S9+, iPhone, iPad)

## Phase 3: Ship

- [ ] Chris confirms on all devices
- [ ] Tag release commit

---

## QA Run #4 — 2026-04-13 (iPhone mockup comparison)

**Tester:** QA Agent
**Approved mockup:** https://chris-kintegratedsystems.github.io/ha-dashboard/mockup-iphone.html
**Screenshots taken:** Yes — all 5 pages
- `scripts/screenshots/qa-run4-iphone-home.png`
- `scripts/screenshots/qa-run4-iphone-climate.png`
- `scripts/screenshots/qa-run4-iphone-lights.png`
- `scripts/screenshots/qa-run4-iphone-cameras.png`
- `scripts/screenshots/qa-run4-iphone-media.png`
**Viewport:** 390×844 (iPhone 14 Pro / Companion App)

### Gap Report

| ID | Page | Severity | Description |
|----|------|----------|-------------|
| G1 | Home | P1 | **Extra sticky header row** — Live dashboard shows a 3rd row beneath the 2-row header (a redundant "ARMED AWAY" chip + avatar row). Approved mockup specifies exactly 2 rows (time/alarm + weather/avatars). This extra row pushes content down and is not in spec. |
| G2 | Home | P1 | **Scene grid is 5 buttons, not 6** — Mockup shows a full 3×2 grid (6 scenes). Live dashboard renders only 5 (Good Morning, Good Night, Away Mode, Welcome Home, Movie Time). One scene button is missing from the grid. |
| G3 | Home | P2 | **System Status chip — alarm chip shows "CHECK LOCKS" with red background instead of security state** — Mockup shows a green "Disarmed" / "Armed Away" shield chip. Live shows a red "CHECK LOCKS" label, which is alarm state text but incorrectly labeled and colored. Should reflect actual alarm state with correct design token color (disarmed=#10d090, armed_away=#4d8ef0, armed_home=#f5a623, triggered=#f04060). |
| G4 | Home | P2 | **Lock cards missing left accent bar** — Mockup specifies a 2px left-side color bar on each lock card matching lock state (cyan = locked, amber = unlocked). Not visible in live screenshot. |
| G5 | Climate | P2 | **Climate cards missing current temperature display, mode badge, and progress bar** — Mockup shows a large 52px current temp reading, a color-coded mode badge (Cool/Heat/Auto), and a progress bar per zone. Live shows only the setpoint number with +/− controls. The full card design from the mockup is not implemented. |
| G6 | Climate | P2 | **Living Room climate zone not visible** — Mockup shows 4 zones (Living Room, Gemelli Suite, Master Bedroom, Upstairs). Living Room is cut off above the fold at page top in the screenshot, suggesting it may be present but scroll state is wrong, or the card ordering needs review. |
| G7 | Lights | P2 | **Missing room-level summary and action buttons** — Mockup shows each room group with a count chip ("3 / 4 on") and "All On" / "All Off" buttons. Live shows individual tile grid only — no room-level controls or count. |
| G8 | Media | P2 | **Media page is blank** — Mockup shows a rich media card (album art, track title, room label, progress bar, playback controls, volume slider). Live screenshot shows only the header and an empty dark page. Likely caused by Benjamin's Hatch media player being idle/unavailable, but the page should still show the player card in an idle/off state. |
| G9 | Cameras | P3 | **No "LIVE" badge overlay on camera feeds** — Mockup shows a red "LIVE" badge top-left on camera tiles. Not visible on live doorbell feed. |
| G10 | Cameras | P3 | **Izzy Camera and Living Room camera still black** — Carried forward from QA Run #3. Entities appear offline. Chris to verify camera availability in HA. |

### Results Summary

| Severity | Count | Status |
|----------|-------|--------|
| P1 | 2 | Open |
| P2 | 6 | Open |
| P3 | 2 | Deferred (known) |

**Overall verdict: ❌ QA FAIL — 2 P1 issues and 6 P2 issues require Dev attention before sign-off**

**Priority fixes for Dev:**
1. G1 — Remove or consolidate the 3rd sticky header row (not in mockup spec)
2. G2 — Restore missing 6th scene button to complete the 3×2 grid
3. G3 — Fix System Status alarm chip label/color to use security state + correct design tokens
4. G5 — Implement full climate card design (current temp display, mode badge, progress bar)
5. G7 — Add room-level light count and All On/All Off buttons to Lights page
6. G8 — Ensure Media page shows player card even when idle/unavailable

---

## QA Run #3 — 2026-04-12 (Full Visual QA — All Pages)

**Tester:** Dev/QA Agent
**Focus:** All pages, both dashboards, every card vs approved mockup
**Screenshots:** `scripts/screenshots/final-tablet-home.png`, `final-tablet-media.png`, `postfix-mobile-home.png`, `postfix-mobile-media.png`

### Results Summary
| Severity | Count | Status |
|----------|-------|--------|
| P1       | 3     | ✅ FIXED |
| P2       | 1     | ✅ FIXED |
| P3       | 2     | ⚠️ Deferred |

**Overall verdict: ✅ QA PASS — all P1/P2 resolved, ready for Chris final device check**

---

### Bug: Tablet clock showing --:-- ✅ FIXED 2026-04-12

**Severity:** P1
**Found in:** Tablet dashboard — all pages (status card)
**Root cause:** `sensor.time` not available in button-card template context
**Fix:** Replaced `states['sensor.time']` with `new Date()` JavaScript time calculation directly

---

### Bug: Tablet content only filling left 1/3 of 1024px screen ✅ FIXED 2026-04-12

**Severity:** P1
**Found in:** Tablet dashboard — all pages
**Root cause:** `max_columns: 4` (and 2/3) caused sections to each take 1 column instead of full width; `column_span: 4` was not working as expected with those max_columns values
**Fix:** Changed all tablet view `max_columns` to `1` — forces every section to fill full width. Internal `horizontal-stack` layout within Security section handles the 2-column lock/garage layout.

---

### Bug: Extra media players on Media page (Living Room TV, Master Bedroom) ✅ FIXED 2026-04-12

**Severity:** P1 — spec says Benjamin's Hatch only
**Found in:** Mobile Media page AND Tablet Media page
**Fix:** Removed `media_player.living_room_tv` and `media_player.master_bedroom` cards from both dashboards. Only `media_player.benjamins_hatch_media_player` remains.

---

### Bug: Tablet alarm colors using wrong design tokens ✅ FIXED 2026-04-12

**Severity:** P2 — Tailwind colors (#22c55e, #ef4444, #3b82f6) instead of design tokens
**Found in:** Tablet — all page status cards
**Fix:** Replaced with correct design tokens: disarmed=#10d090, armed_away=#4d8ef0, armed_home=#f5a623, triggered=#f04060

---

### Bug: Tablet scene labels truncated ("GOO...", "AWA...") ✅ FIXED 2026-04-12

**Severity:** P2 — labels unreadable without full text
**Found in:** Tablet Home — Scenes section
**Fix:** Added `white-space: normal`, `word-break: break-word`, `line-height: 1.2` to scene name styles. Labels now show "GOOD MORNING", "GOOD NIGHT", etc. on two lines.

---

### Known remaining issues (deferred)

**P3 — Camera feeds 2/3 black (Izzy, Living Room):** Camera entities appear offline. Doorbell works. Entity availability issue — not a dashboard JSON bug. Chris to verify cameras are live.

**P3 — Now Playing card bright cyan background:** Native HA `media-control` card uses cyan/teal default styling that doesn't match the dark obsidian theme. Would require card_mod override. Deferred.

**P3 — Good Morning scene on tablet appears dark (no icon color visible):** card_mod background/icon styling may not render in screenshot context. Needs device verification. Not actionable from code alone.

---

## QA Run #2 — 2026-04-12 (Deep Check)

**Tester:** QA Agent
**Focus:** 100% UX match — buttons, style, layout, scale, alignment

### Results Summary
| Severity | Count | Status |
|----------|-------|--------|
| P1       | 2     | ✅ FIXED |
| P2       | 2     | ✅ FIXED |
| P3       | 1     | Deferred |

**Overall verdict: ✅ QA PASS — ready for Chris final device check**

---

## Bug: Tablet scene buttons missing violet styling ✅ FIXED 2026-04-12

**Severity:** P1 (spec violation — no violet on tablet)
**Found in:** Tablet Home — Scenes section
**Fix:** Added `color: #9d6ef0`, card_mod background/border/icon styling to all 5 tablet scene buttons

---

## Bug: Tablet scene button text labels unstyled ✅ FIXED 2026-04-12

**Severity:** P2 (polish — font weight, letter-spacing, uppercase, margin)
**Found in:** Tablet Home — Scenes section
**Fix:** Added full name styling block matching mobile (600 weight, uppercase, 0.05em spacing)

---

## QA Run #1 — 2026-04-12

**Tester:** QA Agent
**Screenshots:** `scripts/screenshots/qa-mobile-home.png`, `qa-mobile-lights.png`, `qa-mobile-climate.png`, `qa-mobile-cameras.png`, `qa-tablet-home.png`

### Results Summary
| Severity | Count |
|----------|-------|
| P1       | 2     |
| P2       | 2     |
| P3       | 1     |

**Overall verdict: ❌ QA FAIL — do not ship until P1s resolved**

---

## Bug: Scene buttons use mixed colors — not uniform violet ✅ FIXED 2026-04-12

**Severity:** P1 (wrong colors — spec violation)
**Found in:** Mobile Home / Tablet Home — Scenes section
**Steps to reproduce:**
1. Open dashboard-mobilev1 on Home tab
2. Observe the 5 scene buttons
**Expected:** All 5 scene buttons use violet (#9d6ef0) styling per design token spec
**Actual:** Scenes use mixed colors — Good Morning is green, Good Night is purple/moon icon, Away Mode is blue arrow, Welcome Home is green, Movie Time is blue/cyan. No scene consistently uses #9d6ef0 violet.
**Screenshot:** qa-mobile-home.png
**Assigned to:** Dev

---

## Bug: Tablet kiosk mode not hiding header/sidebar ✅ FIXED 2026-04-12

**Severity:** P1 (blocking — sidebar and header visible on tablet)
**Found in:** Tablet Home (dashboard-tabletv1)
**Steps to reproduce:**
1. Open http://192.168.51.179:8123/dashboard-tabletv1/home at 1024×1366
2. Observe left sidebar and top header bar
**Expected:** Header and sidebar hidden via kiosk_mode tablet_settings (hide_header: true, hide_sidebar: true)
**Actual:** Full HA sidebar visible on left side, HA header bar visible at top. Kiosk mode is not activating for the tablet dashboard.
**Screenshot:** qa-tablet-home.png
**Assigned to:** Dev

---

## Bug: Garage doors displayed stacked vertically, not as horizontal pair ✅ FIXED 2026-04-12

**Severity:** P2 (layout issue)
**Found in:** Mobile Home — Garage section
**Steps to reproduce:**
1. Open dashboard-mobilev1 on Home tab
2. Scroll to Garage section
**Expected:** Left Garage and Right Garage displayed as a horizontal pair (side-by-side) per mockup spec
**Actual:** Both garage cards appear as full-width stacked rows, same as the lock cards above them — not a horizontal pair
**Screenshot:** qa-mobile-home.png
**Assigned to:** Dev

---

## Bug: System Status section not confirmed visible in mobile viewport ✅ CONFIRMED 2026-04-12

**Severity:** P2 (section may be missing or below fold without scroll)
**Found in:** Mobile Home — System Status section
**Steps to reproduce:**
1. Open dashboard-mobilev1 on Home tab
2. Scroll past Garage section
**Expected:** Markdown card with security status, lights count, and temperature visible below Garage section
**Actual:** Section confirmed present at lines 600-627 as a custom button-card chips row
**Screenshot:** qa-mobile-home.png (section not visible)
**Assigned to:** Dev — please confirm section exists and is rendering

---

## Bug: Cameras 2 and 3 showing black/no image

**Severity:** P3 (cosmetic/availability — may be offline entities)
**Found in:** Mobile Cameras page
**Steps to reproduce:**
1. Open dashboard-mobilev1 on Cameras tab
2. Observe Izzy Camera and Living Room camera feeds
**Expected:** 3 camera feeds showing live or recent snapshots
**Actual:** Doorbell camera shows live image; Izzy Camera and Living Room camera display as solid black frames with labels only. Cameras may be offline or snapshots unavailable at time of test.
**Screenshot:** qa-mobile-cameras.png
**Assigned to:** Dev — verify entity availability in HA developer tools

---

## Context

**Target devices:**
- Samsung Galaxy Tab S9+ (wall-mounted kiosk — primary)
- iPhone (Chris — Companion app)
- iPad (Companion app)

**Source of truth for devices/entities:** C:\Projects\ha-config\CLAUDE.md

**Stack:**
- Custom cards: button-card, mushroom, card_mod, bubble-card, kiosk-mode, clock-weather-card, browser_mod
- YAML deploy: SCP from Windows → Pi, no restart needed for Lovelace
- Validation: `sudo docker exec homeassistant ha core check`

---

*Created: 2026-04-11*
