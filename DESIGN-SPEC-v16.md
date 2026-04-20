# KIS mobilev1 Dashboard — Enhancement Design Spec v16
**Date:** April 19, 2026 | **Agents:** Product + Brand/UX | **Status:** APPROVED — Client decisions locked in

---

## CURRENT STATE SUMMARY

### Dashboard Structure (dashboard_mobilev1.json)
- **6 views:** Home, Climate, Lights, Cameras, Media, Settings
- **All views:** type: "sections", max_columns: 4
- **Custom injection:** kis-nav.js v15 — fixed header bar + fixed bottom nav bar
- **Themes:** kis-day (day mode), kis-dark (night mode), auto-switch via input_select.theme_mode

### Devices
| Device | Orientation | Layout |
|--------|-------------|--------|
| iPhone | Portrait | Single-column (max_columns:4 but narrow viewport) |
| iPad / Tab S9+ | Landscape | Multi-column via HA sections grid |
| iPad / Tab S9+ | Portrait | 2-column via HA sections grid |

---

## DESIGN REQUEST 1: TABLET/IPAD LANDSCAPE LAYOUT — ALL PAGES

### Current State
All 6 views set max_columns: 4. HA sections-view auto-reflows based on viewport width. Landscape screenshots (provided) show:
- **Home:** 4-column layout — Scenes | Locks | Garage | System Status in a row, Now Playing below
- **Climate:** Single centered column with 4 thermostat cards stacked
- **Lights:** Single centered column with room groups stacked
- **Cameras:** Single centered column with 3 camera feeds stacked
- **Media:** Single centered column with media player
- **Settings:** 2-column — Theme | About side by side

### Issues Identified
1. Climate, Lights, Cameras, Media pages waste landscape width — content sits in a narrow center column
2. No motion-triggered camera on Home page landscape
3. No breakpoint-aware card sizing

### Product Agent Recommendation
**Per-page landscape column logic:**

| Page | Landscape Layout |
|------|-----------------|
| Home | Scenes full-width top row. Below: Locks column + Garage column + conditional camera column (shows on motion). System Status moves to Settings. |
| Climate | 2x2 grid — 2 thermostats per row |
| Lights | 2-3 column grid of room cards (one room per column) |
| Cameras | 2-column grid (2 cameras per row, 3rd below) |
| Media | Full-width — media controls need horizontal space |
| Settings | 2-column (Theme + About) — already works |

**Camera visibility rule (Home landscape only):**
- No camera column by default
- Camera feed appears when motion detected on: `binary_sensor.doorbell_motion`, `binary_sensor.ratgdov25i_1746c3_motion`, `binary_sensor.ratgdov25i_1746b4_motion`
- Feed disappears when motion clears
- Uses conditional card with motion binary_sensor as condition

### Brand/UX Spec

**Breakpoints:**
| Range | Mode | Columns |
|-------|------|---------|
| < 600px | Phone | 1 column |
| 600–1024px | Tablet portrait | 2 columns |
| > 1024px | Tablet landscape | 3-4 columns |

**Spacing — Night Mode:**
| Property | Phone | Tablet |
|----------|-------|--------|
| Page padding | 16px | 24px |
| Card gap | 12px | 16px |
| Card border-radius | 14px | 16px |
| Card background | rgba(16,21,31,0.72) | rgba(16,21,31,0.72) |
| Card border | rgba(255,255,255,0.06) | rgba(255,255,255,0.06) |
| Grid gutters | 12px | 16px |

**Spacing — Day Mode:**
| Property | Phone | Tablet |
|----------|-------|--------|
| Page padding | 16px | 24px |
| Card gap | 12px | 16px |
| Card background | rgba(255,255,255,0.88) | rgba(255,255,255,0.88) |
| Card border | rgba(0,0,0,0.05) | rgba(0,0,0,0.05) |
| Card shadow | 0 1px 3px rgba(0,0,0,0.04) | 0 1px 3px rgba(0,0,0,0.04) |

---

## DESIGN REQUEST 2: SCENES ROW — MOVE TO TOP OF HOME PAGE

### Current State
Scenes are already Section 1 on Home page (directly below header). 6 scenes in a 3-column grid:
1. Good Morning (scene.morning_mode)
2. Good Night (scene.night_mode)
3. Away Mode (scene.chill_mode)
4. Welcome Home (scene.day_mode)
5. Movie Time (scene.chill_mode) — DUPLICATE of Away Mode entity
6. Dinner Time (scene.dinner_time) — DOES NOT EXIST in HA

### Issues Identified
1. `scene.dinner_time` does not exist — will produce error state
2. `scene.chill_mode` is shared between Away Mode and Movie Time — they do the same thing
3. Scenes are in a 3-column grid on iPhone (2 rows of 3) — correct per spec
4. On landscape, scenes should be full-width single row (6 in a row)

### Product Agent Recommendation
- Scenes position is already correct (top of Home page)
- **FLAG FOR DEV:** Create `scene.dinner_time` in HA or remove the card
- **FLAG FOR DEV:** Create separate `scene.movie_time` in HA (distinct from chill_mode)
- Landscape: set scenes section to span full width, 6 columns

### HA Changes Required for Dev Agent
```yaml
# scenes.yaml — add these:
- id: dinner_time
  name: Dinner Time
  entities:
    # Chris to define which lights/states for dinner
    light.kitchen_chandelier:
      state: on
      brightness: 180
    light.countertop_lights:
      state: on
      brightness: 100
    light.kitchen_island_light:
      state: on
      brightness: 150
    light.living_room_ceiling:
      state: off
    light.living_room_lamp_2:
      state: off

- id: movie_time
  name: Movie Time
  entities:
    # Distinct from chill_mode — dimmer, more ambient
    light.living_room_lamp_2:
      state: on
      brightness: 30
    light.countertop_lights:
      state: off
    light.kitchen_chandelier:
      state: off
    light.kitchen_ceilings_lights:
      state: off
    light.living_room_ceiling:
      state: off
    light.kitchen_island_light:
      state: off
```

---

## DESIGN REQUEST 3: SCENE ACTIVE STATE — TAP ANYWHERE + ACTIVE BORDER + TOGGLE

### Current State
- All 6 scenes use `tap_action: call-service` with `scene.turn_on` — ONE-WAY only
- No active/inactive visual state — scenes always look the same
- No toggle capability — tapping always activates, cannot deactivate
- Full card surface IS tappable (button-card handles this)

### Issues Identified
1. HA scenes are inherently one-way — `scene.turn_on` has no `scene.turn_off`
2. Toggle requires either: paired scenes (on/off), or `input_boolean` helpers
3. No visual feedback for which scene is currently active

### Product Agent Recommendation
**Approach: input_boolean helpers per scene**

Each scene gets a companion `input_boolean` that tracks active state. When a scene is activated, its boolean turns on and all others turn off. Tapping an active scene turns off its boolean and runs a "reset" scene (all lights to a neutral state).

**HA entities needed (for Dev agent):**
```yaml
input_boolean:
  scene_morning_active:
    name: Morning Active
  scene_night_active:
    name: Night Active
  scene_away_active:
    name: Away Active
  scene_welcome_active:
    name: Welcome Active
  scene_movie_active:
    name: Movie Active
  scene_dinner_active:
    name: Dinner Active
```

**Automation:** When any scene card is tapped:
1. Turn off all `input_boolean.scene_*_active`
2. Turn on the tapped scene's boolean
3. Call `scene.turn_on` for the scene

When tapping an already-active scene:
1. Turn off its boolean
2. Call a neutral "all off" scene or just turn off all lights

**Dashboard card changes:** Button-card template checks `input_boolean.scene_X_active` state to show active border.

### Brand/UX Spec — Active State

**Night Mode:**
| State | Border | Background | Icon opacity |
|-------|--------|------------|--------------|
| Inactive | 1px solid rgba(255,255,255,0.06) | rgba(16,21,31,0.72) | 0.6 |
| Active | 2px solid {scene accent color} | rgba({accent},0.08) | 1.0 |
| Pressed | 2px solid {scene accent color} | rgba({accent},0.15) | 1.0 |

**Day Mode:**
| State | Border | Background | Icon opacity |
|-------|--------|------------|--------------|
| Inactive | 1px solid rgba(0,0,0,0.05) | rgba(255,255,255,0.88) | 0.5 |
| Active | 2px solid {scene accent color} | rgba({accent},0.06) | 1.0 |
| Pressed | 2px solid {scene accent color} | rgba({accent},0.12) | 1.0 |

Scene accent colors (same both modes):
- Good Morning: #f5a623
- Good Night: #9d6ef0
- Away Mode: #f04060
- Welcome Home: #10d090
- Movie Time: #4d8ef0
- Dinner Time: #9d6ef0

---

## DESIGN REQUEST 4: ALL CARDS — TAP ANYWHERE TO TOGGLE

### Current State Audit

| Page | Card Type | Tap Action | Full Surface? |
|------|-----------|-----------|---------------|
| Home | Scene cards | call-service (scene.turn_on) | YES |
| Home | Lock cards | toggle | YES |
| Home | Garage cards | toggle | YES |
| Home | System Status chips | navigate | YES |
| Home | Now Playing | media_play_pause | YES |
| Climate | Thermostat cards | call-service (+1°F) | YES (but not toggle) |
| Lights | Individual light cards | toggle | YES |
| Lights | Room header cards | tap=all on, hold=all off | YES |
| Cameras | picture-entity | popup | YES |
| Media | Media player | play/pause | YES |
| Settings | Theme buttons | call-service | YES |

### Issues Identified
1. **Climate cards:** Tap increases temp, hold decreases. This is functional but NOT toggle. Tapping should toggle the HVAC on/off — temp controls should be via +/- buttons.
2. **All other cards:** Full-surface tap is already implemented via button-card.

### Product Agent Recommendation
- Climate: Add explicit toggle behavior — tapping card toggles HVAC on/off. Keep +/- controls for temperature adjustment. Hold action opens more-info for advanced settings.
- All other pages: No changes needed — already working.

### Brand/UX Spec — Press Feedback (all pages, both modes)

**Night Mode:**
- Pressed state: `transform: scale(0.97)`, `transition: 120ms ease`, background brightens slightly
- Active feedback: `rgba(0,212,240,0.06)` overlay on press

**Day Mode:**
- Pressed state: `transform: scale(0.97)`, `transition: 120ms ease`, background darkens slightly
- Active feedback: `rgba(0,0,0,0.03)` overlay on press

---

## DESIGN REQUEST 5: SYSTEM STATUS — MOVE TO SETTINGS PAGE

### Current State
System Status is Section 4 on Home page — mushroom-chips-card with 3 template chips:
1. Security: "All Secure" / "Check Locks" (green/red)
2. Lights: "{N} Lights On" (cyan)
3. Temperature: "{T}°F" (cyan)

### Product Agent Recommendation
- Remove System Status section from Home page
- Add System Status section to Settings page (new Section 3, below About)
- On Settings page: expand chips into fuller status cards with more detail
- Settings page becomes the system dashboard/health page

### Brand/UX Spec — Settings System Status

**Layout:** Full-width section below About, with 3-4 status cards in a grid

**Night Mode:**
| Element | Value |
|---------|-------|
| Section header | "SYSTEM STATUS" - #4a5570, uppercase, 10px, letter-spacing 0.15em |
| Card background | rgba(16,21,31,0.72) |
| Card border | 1px solid rgba(255,255,255,0.06) |
| Status dot (ok) | #10d090 |
| Status dot (warning) | #f5a623 |
| Status dot (error) | #f04060 |
| Label text | #eef2f8, 12px |
| Value text | #8a9ab8, 11px |

**Day Mode:**
| Element | Value |
|---------|-------|
| Card background | rgba(255,255,255,0.88) |
| Card border | 1px solid rgba(0,0,0,0.05) |
| Status dot (ok) | #089464 |
| Status dot (warning) | #c07808 |
| Status dot (error) | #c02840 |
| Label text | #1a2030, 12px |
| Value text | #4a5a72, 11px |

---

## DESIGN REQUEST 6: SETTINGS NAV ICON — NOTIFICATION BADGE

### Current State
Settings nav icon (mdi:cog) has no badge. Nav bar implemented in kis-nav.js.

### Product Agent Recommendation

**Badge trigger conditions:**
| Condition | Entities | Severity |
|-----------|----------|----------|
| Door unlocked | lock.front_door_lock, lock.back_door_lock, lock.gemelli_door_lock | RED (urgent) |
| Garage open | cover.ratgdov25i_1746c3_door, cover.ratgdov25i_1746b4_door | RED (urgent) |
| Alarm disarmed + away mode | alarm_control_panel.kuprycz_home + person.chris state | RED (urgent) |
| Entity unavailable | Any entity in error/unavailable state | AMBER (advisory) |
| Lights on > threshold | Count of light.* entities on > configurable (default: 60 min) | AMBER (advisory) |

**Badge logic:**
- Count = total active issues
- Color = RED if any urgent, AMBER if advisory only
- Badge disappears when all conditions cleared
- Mixed urgency = RED with total count

**Implementation:** kis-nav.js checks entity states on each render cycle. Badge rendered as absolute-positioned span on the Settings nav button.

### Brand/UX Spec — Badge Design

**Size:** 16px diameter circle (count <=9), pill shape for 10+
**Position:** Top-right of Settings icon, offset -4px top, -4px right
**Font:** 10px, bold, white (#fff)
**Min touch exclusion:** Badge does not interfere with tap target

**Night Mode:**
| State | Background | Border | Text |
|-------|-----------|--------|------|
| Urgent (red) | #f04060 | 2px solid rgba(7,9,16,0.92) | #fff |
| Advisory (amber) | #f5a623 | 2px solid rgba(7,9,16,0.92) | #fff |

**Day Mode:**
| State | Background | Border | Text |
|-------|-----------|--------|------|
| Urgent (red) | #c02840 | 2px solid rgba(255,255,255,0.96) | #fff |
| Advisory (amber) | #c07808 | 2px solid rgba(255,255,255,0.96) | #fff |

Border matches nav bar background to create "cutout" effect (iOS convention).

---

## DESIGN REQUEST 7: NOW PLAYING — FULL WIDTH + CONDITIONAL + ANIMATION

### Current State
- Home page: Now Playing is Section 5 (always visible, shows placeholder when nothing playing)
- Media page: Conditional cards — shows player when active, "Nothing Playing" when off
- Not present on Climate, Lights, Cameras, or Settings pages

### Product Agent Recommendation

**New behavior (all pages):**
- Now Playing mini-player pinned above bottom nav bar on ALL pages
- Only visible when `media_player.benjamins_hatch_media_player` state is `playing` or `paused`
- Hidden (not rendered) when state is `off`, `unavailable`, or `idle`
- Slides up from nav bar on state change to playing (~250ms ease-out)
- Slides down behind nav bar when playback stops (~200ms ease-in)
- Compact design: album art (40px) + track/artist + play/pause button + room label

**Implementation:** Rendered by kis-nav.js (same as header/nav bar — outside shadow DOM, position:fixed above nav bar). Entity subscription triggers show/hide animation.

**Remove:** Static Now Playing section from Home page. Keep full Media page as-is for detailed controls.

### Brand/UX Spec — Mini-Player

**Layout:** Full width, 56px height, pinned `bottom: NAV_H` (80px)

**Night Mode:**
| Element | Value |
|---------|-------|
| Background | rgba(11,14,23,0.95) |
| Backdrop filter | blur(20px) saturate(180%) |
| Border-top | 1px solid rgba(255,255,255,0.06) |
| Track title | #eef2f8, 13px, font-weight 600 |
| Artist | #8a9ab8, 11px |
| Play/pause icon | #00d4f0, 24px |
| Room label | #4a5570, 9px, uppercase |
| Progress bar track | #1c2438 |
| Progress bar fill | #00d4f0 |

**Day Mode:**
| Element | Value |
|---------|-------|
| Background | rgba(255,255,255,0.96) |
| Backdrop filter | blur(20px) saturate(180%) |
| Border-top | 1px solid rgba(0,0,0,0.04) |
| Box-shadow | 0 -1px 3px rgba(0,0,0,0.06) |
| Track title | #1a2030, 13px, font-weight 600 |
| Artist | #4a5a72, 11px |
| Play/pause icon | #0088a8, 24px |
| Room label | #7a8698, 9px, uppercase |
| Progress bar track | #c0c8d4 |
| Progress bar fill | #0088a8 |

**Animation:**
- Enter: `transform: translateY(100%) → translateY(0)`, 250ms ease-out
- Exit: `transform: translateY(0) → translateY(100%)`, 200ms ease-in
- No layout shift — mini-player overlaps nav padding area

---

## DESIGN REQUEST 8: BOTTOM NAV BAR — THREE FIXES

### Current State (kis-nav.js)
- **Active indicator:** 3px tall pill, 28px wide, positioned at `bottom: 5px`, opacity transition
- **Tap target:** Button element with `padding: 8px 4px 6px`, `flex: 1` (fills available width)
- **Day mode:** Background rgba(255,255,255,0.96), icon color #7a8698 inactive / #0088a8 active

### FIX A: Active Indicator Visibility

**Problem:** The 3px pill at bottom:5px is too close to the icon and nearly invisible in day mode — the cyan-on-white contrast is low, and the pill is tucked under the label.

**Brand/UX — Two Options for Client Review:**

**Option 1: Elevated Pill with Gap**
- Pill moves to `bottom: 0px` (flush with nav bottom edge)
- Height increases: 3px → 4px
- Width increases: 28px → 32px
- Gap between label and pill: 8px (up from ~2px)
- Night: #00d4f0 | Day: #0088a8

**Option 2: Background Highlight Zone**
- No separate pill element
- Active icon gets a filled rounded rectangle background behind icon+label
- Night: rgba(0,212,240,0.08) background, icon #00d4f0
- Day: rgba(0,136,168,0.08) background, icon #0088a8
- Border-radius: 12px, padding: 6px 12px
- More visible, more modern (iOS tab bar style)

**Recommendation:** Option 2 (background highlight) — more visible in both modes, follows current iOS/Android conventions.

### FIX B: Nav Icon Tap Target Size

**Current:** Each button is `flex: 1` which fills the width, but the visual clickable area feels small because there's minimal padding.

**Fix:** Already mostly correct — `flex: 1` gives each button ~65px width on iPhone (390px / 6 tabs). The issue is vertical: `padding: 8px 4px 6px` gives only ~50px total height.

**Brand/UX Spec:**
- Increase padding: `8px 4px 6px` → `12px 4px 10px`
- Min height: 52px content area (well above 44px Apple HIG minimum)
- Each tab zone: ~65px wide × ~72px tall = 4,680px² (exceeds Apple's 44×44 = 1,936px² minimum by 2.4x)

### FIX C: Day/Night Consistency

**Night Mode (current — keep):**
| Element | Value |
|---------|-------|
| Background | rgba(7,9,16,0.95) |
| Border-top | 1px solid rgba(255,255,255,0.06) |
| Inactive icon | #4a5570 |
| Active icon | #00d4f0 |
| Label | same as icon color |

**Day Mode (current — adjust):**
| Element | Value |
|---------|-------|
| Background | rgba(255,255,255,0.96) |
| Border-top | 1px solid rgba(0,0,0,0.04) |
| Box-shadow | 0 -1px 3px rgba(0,0,0,0.06), 0 -4px 12px rgba(0,0,0,0.03) |
| Inactive icon | #8a96a8 → **#7a8698** (slightly darker for contrast) |
| Active icon | #0088a8 |
| Active bg (Option 2) | rgba(0,136,168,0.08) |
| Label | same as icon color |

---

## DESIGN REQUEST 9: PERFORMANCE — LIGHT LAG / ALARM POLLING

### Current State Analysis

**Header refresh cycle:**
- kis-nav.js `setInterval` at 1000ms calls `renderHeaderContent()`
- `renderHeaderContent()` reads: clock, weather, alarm, person states via `getHass()` / `getState()`
- Entire header innerHTML is rebuilt every second
- `requestAnimationFrame(applyDynamicHeaderClearance)` called after every render
- MutationObserver also triggers renders on theme/style changes

**Alarm entity:**
- `alarm_control_panel.kuprycz_home` — Vivint integration via HACS
- Vivint integration uses cloud polling (not local push)
- Known issue: 520 errors from Vivint cloud are intermittent

**Potential lag sources:**
1. `innerHTML` rebuild every second forces browser to re-parse and re-layout the entire header
2. `applyDynamicHeaderClearance()` called every second — traverses shadow DOM tree, measures header height, sets styles
3. HA WebSocket pushes state changes to all subscribed entities simultaneously — a burst of state updates can cause multiple rapid re-renders
4. button-card tap → HA WebSocket → state change → UI update has inherent round-trip latency

### Product Agent Recommendation

**Fixes (priority order):**

1. **Optimistic UI on light cards:** Button-card supports `show_last_changed: false` but not native optimistic rendering. Implement via card_mod CSS: on tap, immediately apply "on" visual state via `:active` / pressed CSS, then HA state confirms within 200-500ms.

2. **Reduce header innerHTML rebuilds:** Instead of full innerHTML replacement every second, diff the content — only update clock text, weather, and entity states that actually changed. Use `textContent` on individual spans rather than rebuilding the entire DOM tree.

3. **Throttle applyDynamicHeaderClearance:** Only call after actual resize/orientation events, not on every header render. Header height rarely changes — measure once and cache until resize.

4. **Alarm polling:** Vivint uses cloud polling at the integration level (not dashboard-level). Check HA integration settings for scan_interval. Default is likely 30s which is appropriate. If shorter, increase to 30-60s.

5. **Isolate header from card renders:** Header is already in a separate fixed div outside HA shadow DOM — it should NOT trigger card re-renders. Verify that renderHeaderContent() isn't indirectly triggering HA to re-render view content.

**Performance target:** Light card visual feedback within 50-100ms of tap.

---

## DESIGN REQUEST 10: LIGHTS PAGE — ROOM-GROUPED LAYOUT REDESIGN

### Current State

4 room groups, each consisting of:
1. **Room header card** (button-card): Shows room name, count "{N}/total on", room icon in top-right corner
   - Tap: turn on all lights in room
   - Hold: turn off all lights
   - Double-tap: turn off all lights
2. **Individual light cards** in 3-column grid below header
   - Tap: toggle
   - Hold: more-info
   - Visual: brightness gradient background when on

**Room groups:**
| Room | Lights | Icon |
|------|--------|------|
| Kitchen | 4 (Countertop, Chandelier, Ceiling, Island) | mdi:silverware-fork-knife |
| Living Room | 2 (Ceiling, Lamp) | mdi:sofa |
| Outdoor | 7 (Garage, Patio String, Front Porch, Front Walkway, Upper Outdoor, Left Patio, Center Patio) | mdi:tree |
| Benjamin's Room | 2 (Hatch Light, Ben's Light) | mdi:bed |

### Issues Identified
1. Room icon in top-right is unnecessary — wastes space, adds visual clutter
2. Room header and individual lights are separate cards — not grouped inside a single card
3. No brightness slider for dimmable lights
4. On iPhone, all rooms expanded = long scroll
5. On tablet landscape, rooms stack in one column — should reflow to 2-3 column grid

### Product Agent Recommendation

**New structure per room:**
```
┌─────────────────────────────────┐
│ Kitchen                    4/4  │  ← Room name + count + master toggle
│─────────────────────────────────│
│ ● Countertop         ──●───── │  ← Light name + toggle + brightness
│ ● Chandelier         ──●───── │
│ ● Ceiling            ──●───── │
│ ● Island             ──●───── │
└─────────────────────────────────┘
```

- Room icon REMOVED from top-right
- Room name as header with on-count / total
- Master toggle (switch) at right of header — toggles all lights
- Individual lights as compact rows INSIDE the room card
- Each row: status dot + light name + on/off toggle + brightness slider (if dimmable)
- Tap anywhere on row toggles that light
- Brightness slider appears inline (thin, compact)

**iPhone portrait:** Rooms collapsed by default — tap room header to expand/collapse. Only room name + count + master toggle visible when collapsed.

**Tablet landscape:** All rooms expanded, 2-column grid (2 rooms per row). Each room card fills column width.

### Brand/UX Spec — Room Cards

**Night Mode:**
| Element | Value |
|---------|-------|
| Room card bg | rgba(16,21,31,0.72) |
| Room card border | 1px solid rgba(255,255,255,0.06) |
| Room card radius | 16px |
| Room header bg | rgba(255,255,255,0.03) |
| Room name | #eef2f8, 13px, font-weight 700, uppercase, letter-spacing 0.08em |
| Light count | #4a5570, 11px |
| Master toggle on | #00d4f0 |
| Master toggle off | #4a5570 |
| Divider | rgba(255,255,255,0.04) |
| Light row height | 44px |
| Light name | #eef2f8, 13px |
| Light dot on | #f5a623 |
| Light dot off | #4a5570 |
| Brightness slider track | #1c2438 |
| Brightness slider fill | #f5a623 |
| Brightness slider thumb | #eef2f8, 12px circle |
| Collapsed chevron | mdi:chevron-down, #4a5570 |
| Expanded chevron | mdi:chevron-up, #8a9ab8 |

**Day Mode:**
| Element | Value |
|---------|-------|
| Room card bg | rgba(255,255,255,0.88) |
| Room card border | 1px solid rgba(0,0,0,0.05) |
| Room card shadow | 0 1px 3px rgba(0,0,0,0.04) |
| Room header bg | rgba(0,0,0,0.02) |
| Room name | #1a2030, 13px, font-weight 700 |
| Light count | #7a8698, 11px |
| Master toggle on | #0088a8 |
| Master toggle off | #7a8698 |
| Divider | rgba(0,0,0,0.04) |
| Light name | #1a2030, 13px |
| Light dot on | #c07808 |
| Light dot off | #7a8698 |
| Brightness slider track | #c0c8d4 |
| Brightness slider fill | #c07808 |
| Brightness slider thumb | #1a2030, 12px circle |

---

## SCENE AUDIT — HA CHANGES REQUIRED FOR DEV AGENT

### Missing Scenes
| Dashboard Label | Entity Used | Status | Action Required |
|-----------------|-------------|--------|-----------------|
| Dinner Time | scene.dinner_time | DOES NOT EXIST | Create scene in scenes.yaml |
| Movie Time | scene.chill_mode | WRONG — shares with Away | Create scene.movie_time |

### Toggle Support — All Scenes
All 6 scenes are one-way (scene.turn_on). For toggle support:

**Required HA entities:**
- `input_boolean.scene_morning_active`
- `input_boolean.scene_night_active`
- `input_boolean.scene_away_active`
- `input_boolean.scene_welcome_active`
- `input_boolean.scene_movie_active`
- `input_boolean.scene_dinner_active`

**Required automation:** "Scene Toggle Manager"
- Trigger: any scene input_boolean changes to "on"
- Action: turn off all OTHER scene booleans (mutual exclusion)

**Required scene:** `scene.all_lights_off` (or `scene.neutral`) — called when deactivating an active scene.

---

## CLIENT DECISIONS — LOCKED IN (April 19, 2026)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Nav bar active indicator | **Background Highlight** (iOS 17+ style zone) |
| 2 | Dinner Time scene | **Create** `scene.dinner_time` in HA — Chris to define light states |
| 3 | Movie Time scene | **Keep** sharing `scene.chill_mode` — no separate scene needed |
| 4 | Lights page collapse | **All rooms expanded** on both iPhone and tablet |
| 5 | Now Playing position | **Overlay** above nav bar — no layout shift, slide animation |

---

## PAGES NOT APPLICABLE

| Request | Climate | Cameras | Media | Settings |
|---------|---------|---------|-------|----------|
| Scenes row | N/A | N/A | N/A | N/A |
| Scene toggle | N/A | N/A | N/A | N/A |
| System Status | N/A | N/A | N/A | ADDED HERE |
| Motion camera | N/A (Home only) | N/A | N/A | N/A |
| Lights room redesign | N/A | N/A | N/A | N/A |

**Applicable to ALL pages:** Landscape layout, card tap-anywhere, nav bar fixes, Now Playing mini-player, day/night consistency, notification badge.

---

## IMPLEMENTATION PLAN

Mockup approved. Proceeding to implementation.

**Phase 1 — kis-nav.js v16 (Nav bar + Mini-player + Badge + Performance)**
1. Nav bar: Replace pill indicator with background highlight style
2. Nav bar: Expand tap targets (padding 12px 4px 10px)
3. Nav bar: Add notification badge on Settings icon
4. Mini-player: Render above nav bar, conditional on media_player state, slide animation
5. Performance: Replace innerHTML with targeted DOM updates, throttle clearance measurement
6. Day/night: Ensure all new components have both mode styles

**Phase 2 — Dashboard JSON (Cards + Layout + Scenes)**
1. Remove System Status from Home page → add to Settings page
2. Remove Now Playing section from Home page (replaced by persistent mini-player)
3. Scene toggle: Add input_boolean-based active state tracking + accent border
4. Climate cards: Change tap_action to toggle HVAC on/off
5. Lights page: Redesign to room-grouped layout (all expanded, no collapse)
6. Add conditional camera card to Home page (motion-triggered)
7. Landscape: Ensure all pages use appropriate column layouts

**Phase 3 — HA Config**
1. Create `scene.dinner_time` in scenes.yaml
2. Create `input_boolean.scene_*_active` helpers for scene toggle support
3. Create "Scene Toggle Manager" automation
4. card-mod audit — reduce/eliminate where possible

**Ready for Dev agent to begin implementation.**

---

---

## HA COMMUNITY RESEARCH FINDINGS — KEY IMPACTS

### Performance (Request 9 — REVISED)
**Critical finding:** Vivint integration uses PubNub event-based push, NOT polling. It is NOT the primary lag source. The real culprits identified by the community:
1. **card-mod overhead** — Simply having card-mod registered as a resource degrades performance even if no cards use it. Combined with button-card, this is the worst-performing combination.
2. **innerHTML rebuild every 1s** in kis-nav.js — Rebuilding the entire header DOM tree every second is expensive. Should diff/update individual elements.
3. **card-mod breaking changes in HA 2026.4** — MDC CSS variables no longer work. UIX is positioned as the successor. Current card-mod usage may silently fail after HA updates.

**Revised recommendation:**
- Audit card-mod usage across all cards — minimize or eliminate where possible
- Replace card-mod inline styles with native button-card `styles:` blocks where feasible
- kis-nav.js: Replace innerHTML with targeted textContent updates on changed elements
- Add CSS `:active` visual feedback (scale 0.97 + color shift) for instant tap response — not optimistic state, but immediate visual acknowledgment
- Monitor card-mod version compatibility with HA updates

### Lights Page (Request 10 — VALIDATED)
**Community consensus validates our approach:** Light Group helpers + Mushroom Light Card is the recommended pattern for room-grouped controls. However, since we're already heavily invested in button-card, we should use button-card with `button_card_templates` for consistency and avoid mixing card systems.

### Now Playing (Request 7 — VALIDATED)
**No native persistent mini-player exists** in HA. The kis-nav.js injection approach (rendering outside shadow DOM, position:fixed above nav) is the correct solution. YAMP card (`always_collapsed` mode) could be evaluated as an alternative if we want to use a community card instead of custom rendering.

### Conditional Camera (Request 1 — VALIDATED)
**Community recommends:** Native conditional card wrapping picture-entity, with motion binary_sensor as condition. Advanced Camera Card (Frigate) also supports this but adds dependency. Our approach (conditional card) is simpler and more stable.

### Nav Bar (Request 8 — VALIDATED)
**No community card handles badges natively.** Our kis-nav.js custom implementation is the right approach. Badge rendering via absolute-positioned span is the standard community workaround (button-card custom_fields pattern).

### card-mod Risk Assessment
**HIGH RISK:** HA 2026.4 broke MDC variable styling. We should:
1. Pin card-mod version in HACS
2. Test dashboard after every HA update before deploying
3. Plan migration path to UIX when it stabilizes
4. Reduce card-mod dependency where native button-card `styles:` can achieve the same result

---

## AGREED FINAL CHANGE SET — PRODUCT + BRAND/UX

Both agents agree on the following scope. Items marked with options require client decision.

| # | Change | All Pages? | Client Decision Needed? |
|---|--------|-----------|------------------------|
| 1 | Landscape multi-column optimization | YES — per-page logic | No |
| 2 | Scenes at top of Home (already done) | Home only | Fix scene entities (Dinner Time, Movie Time) |
| 3 | Scene active state + toggle | Home only | Yes — create input_boolean helpers |
| 4 | Tap-anywhere on all cards | YES | No — mostly already done. Climate tap = toggle HVAC |
| 5 | System Status → Settings page | Home + Settings | No |
| 6 | Settings nav notification badge | Nav bar (all pages) | No |
| 7 | Now Playing mini-player | YES — all pages | Overlay vs push (recommend overlay) |
| 8a | Nav active indicator | Nav bar (all pages) | YES — Pill vs Highlight (recommend highlight) |
| 8b | Nav tap target expansion | Nav bar (all pages) | No |
| 8c | Nav day/night consistency | Nav bar (all pages) | No |
| 9 | Performance optimization | YES | No — card-mod audit + kis-nav.js optimization |
| 10 | Lights page room-grouped redesign | Lights only | Collapse on iPhone? (recommend yes) |

---

*Product Agent + Brand/UX Agent | KIntegrated Systems | April 15, 2026*
