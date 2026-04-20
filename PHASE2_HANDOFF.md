# Phase 2 Handoff — kis-nav.js v16

**Date:** April 19, 2026
**Author:** Dev Agent (Phase 1 session)
**Design Spec:** DESIGN-SPEC-v16.md (approved, client decisions locked in)

---

## Phase 1 Completion Summary

All 6 Phase 1 tasks completed, committed, deployed, and QA-verified:

| Task | Description | Status |
|------|-------------|--------|
| P1.1 | Nav bar — replace pill with background highlight indicator | Done |
| P1.2 | Nav bar — expand tap targets (12px 4px 10px, border-radius 12px) | Done |
| P1.3 | Nav bar — notification badge on Settings icon (red urgent / amber advisory) | Done |
| P1.4 | Mini-player — persistent Now Playing above nav bar (play/pause, art, progress) | Done |
| P1.5 | Performance — replace innerHTML with targeted DOM updates (textContent/style) | Done |
| P1.6 | Day/night styling for all new components (badge, highlight, mini-player) | Done |

**Commits (pushed to origin/master):**
```
63b31cd feat: kis-nav.js v16 — highlight nav, badge, mini-player, performance
c1e1fd3 docs: add v16 design spec, mockup, and theme files
```

**Deployment:**
- kis-nav.js v16 deployed to Pi at `/home/cooper5389/homeassistant/config/www/mobile_v1/kis-nav.js`
- configuration.yaml updated to `?v=16` cache bust
- HA container restarted, v16 live and verified via QA screenshots (iPhone + Tab S9 landscape + Tab S9 portrait)
- MD5 hash verified matching between local and Pi: `946ec61560a38009edf142dce71713e3`

---

## Known Cosmetic Issue

**Settings "About" card shows `kis-nav.js v15`** — this is a static label hardcoded in `dashboard_mobilev1.json`, not read from the script. Must be updated to `v16` in Phase 2 when editing the dashboard JSON.

Location in `dashboard_mobilev1.json`: search for `"kis-nav.js"` in the Settings view's About section cards.

---

## Phase 2 Scope — Dashboard JSON Changes

All changes target `dashboard_mobilev1.json` unless noted. Reference: DESIGN-SPEC-v16.md §Implementation Plan.

### 2.1 Move System Status from Home → Settings
- Remove the System Status section from the Home view
- Add equivalent cards to the Settings view (below the Theme section)
- Cards: lock check count, lights-on count, temperature summary

### 2.2 Remove Now Playing section from Home page
- The static Now Playing section (Section 5 in Home view) is replaced by the persistent mini-player in kis-nav.js
- Delete the entire Now Playing section from Home view JSON
- Keep the full Media page as-is for detailed controls

### 2.3 Scene toggle — active state tracking
- Add `input_boolean.scene_*_active` entities to scene button-cards
- Add accent border (card_mod) to visually indicate active scene
- Requires Phase 3 HA config work (create input_booleans + automation) before this can be fully tested

### 2.4 Climate cards — tap to toggle HVAC
- Change `tap_action` on thermostat cards to toggle HVAC on/off
- Currently tap_action opens more-info dialog

### 2.5 Lights page — room-grouped layout redesign
- Client decision: **all rooms expanded** on both iPhone and tablet (no collapse)
- Remove room icon from top-right of room header cards
- Individual light cards remain as-is for now (brightness slider is a stretch goal)
- Ensure 2-column reflow on tablet landscape

### 2.6 Conditional camera card on Home page
- Add motion-triggered camera card to Home view
- Shows camera feed when motion is detected, hidden otherwise
- Uses HA conditional card type

### 2.7 Landscape column layouts
- Verify all 6 views have appropriate `max_columns` for tablet landscape
- Currently all views are `max_columns: 4` (correct)
- Ensure section ordering makes sense in multi-column reflow

### 2.8 Update kis-nav.js version label
- Update the Settings "About" card from `v15` to `v16`

---

## Current File State (Post Phase 1)

| File | Version/State | Notes |
|------|---------------|-------|
| `kis-nav.js` | v16, committed + deployed | All Phase 1 JS logic complete |
| `dashboard_mobilev1.json` | Committed (day-mode CSS vars + max_columns 4) | Phase 2 primary target |
| `DESIGN-SPEC-v16.md` | Committed | Full spec with client decisions |
| `mockup-v16.html` | Committed | Interactive mockup for all 6 pages |
| `themes/kis_day.yaml` | Committed | Day theme tokens |
| `packages/theme_mode.yaml` | Committed | Auto/day/night switching automation |
| `qa-screenshot.js` | Committed (added Tab S9 portrait device) | Use for QA verification |
| `qa-screenshots/` | Committed | v16 baseline screenshots |
| `.env` | Not committed (contains HA_TOKEN) | Required for qa-screenshot.js |

**Untracked scratch files (safe to ignore):**
- `HA-Screenshots/` — manual reference screenshots
- `Red circles.png` — annotation reference
- `current-live.html` — HTML snapshot of live dashboard

---

## Conventions and Patterns to Preserve

### Architecture
- **kis-nav.js owns all fixed UI** — header bar, nav bar, mini-player are injected into `document.body` outside HA shadow DOM. Dashboard JSON cards should never duplicate this functionality.
- **Shadow DOM patching** — kis-nav.js patches `hui-root`, `ha-app-layout`, and `hui-sections-view` shadow roots for layout fixes. Do not fight this from the JSON side.

### Day/Night Theming
- **CSS custom properties first** — dashboard JSON cards should use `var(--ha-card-background, fallback)` and `var(--divider-color, fallback)` instead of hardcoded colors. Phase 1 already converted some cards; Phase 2 should continue this pattern.
- **`data-kis-day` attribute** — kis-nav.js sets this on `#kis-header-bar`, `#kis-nav-bar`, and `#kis-mini-player`. Used for CSS day-mode overrides.
- **Theme detection** — reads `hass.themes.theme` (active), `hass.selectedTheme.theme` (user pick), and `hass.themes.darkMode` (fallback). Day mode = `kis-day` theme or `darkMode === false`.

### Performance
- **No innerHTML in render loop** — Phase 1 refactored the header to build DOM once, then use targeted `textContent` / `.style` / `.className` updates. Any new render-loop code must follow this pattern.
- **Alarm/weather lookup tables hoisted** — `ALARM_NIGHT`, `ALARM_DAY`, `WX_LABELS`, `WX_ICONS` are module-level constants, not recreated each tick.
- **`_headerInitialized` flag** — controls initial innerHTML vs subsequent targeted updates.

### Badge Logic
- **Urgent (red):** unlocked locks (`BADGE_LOCKS`), open garages (`BADGE_GARAGES`), alarm disarmed while all persons away
- **Advisory (amber):** reserved for future use (lights-on threshold, unavailable entities)
- Badge updates on every 1s render tick via `updateBadge(hass)`

### Mini-Player
- **Entity:** `media_player.benjamins_hatch_media_player` (constant `MEDIA_PLAYER_ENTITY`)
- **Visibility:** shown when state is `playing` or `paused`, hidden otherwise
- **Animation:** CSS `transform: translateY(100%)` with `transition: 0.25s ease-out`
- **Tap:** play/pause button calls `hass.callService()`. Tap anywhere else opens more-info dialog.
- **`_prevMediaState` flag** — prevents redundant show/hide attribute toggling

### Deploy Process
1. SCP files to Pi `/tmp/`, then `sudo cp` to HA config dirs
2. `kis-nav.js` → `/home/cooper5389/homeassistant/config/www/mobile_v1/kis-nav.js`
3. `dashboard_mobilev1.json` → `/home/cooper5389/homeassistant/config/.storage/lovelace.dashboard_mobilev1`
4. Bump `?v=N` in `configuration.yaml` `extra_module_url` (only if kis-nav.js changed)
5. `sudo docker restart homeassistant`
6. Wait ~20s for HA to come up
7. Run `node qa-screenshot.js` — take iPhone + Tab S9 screenshots
8. Compare vs mockup, list gaps before marking done

### Client Decisions (locked in April 19, 2026)
1. Nav indicator: **background highlight** (not pill)
2. Dinner Time scene: **create** `scene.dinner_time` — Chris will define light states
3. Movie Time scene: **keep** sharing `scene.chill_mode` with Away Mode
4. Lights page: **all rooms expanded** (no collapse on iPhone)
5. Now Playing: **overlay** above nav bar (mini-player, no layout shift)

---

## Resume Prompt

Use this prompt to start a fresh Phase 2 session:

```
Read PHASE2_HANDOFF.md and DESIGN-SPEC-v16.md in the ha-dashboard project
(C:\Projects\kintegrated\projects\ha-dashboard). Phase 1 (kis-nav.js v16) is
complete and deployed. Begin Phase 2: dashboard JSON changes.

Start by reading the current dashboard_mobilev1.json to understand the
existing structure, then work through the Phase 2 scope items listed in the
handoff doc. For each change:
1. Make the edit to dashboard_mobilev1.json
2. Deploy to the Pi via SCP
3. Take QA screenshots on iPhone and Tab S9
4. Verify the change looks correct before moving on

Do NOT modify kis-nav.js — Phase 1 is locked. All changes are to
dashboard_mobilev1.json and potentially new HA config files (scenes,
input_booleans, automations) for Phase 3 prep.
```

---

*Generated by Dev Agent — Phase 1 session, April 19, 2026*
