# Settings Page Controls Audit — mobilev1

Extracted from `dashboard_mobilev1.json` Settings view on 2026-05-09.
Every control, status row, and visual indicator currently on the Settings page.

---

## View Configuration
- Title: Settings
- Path: `/dashboard-mobilev1/settings`
- Icon: `mdi:cog`
- Type: `sections`, max_columns: 4
- Background: `var(--lovelace-background, #070910)`
- Footer: mushroom-chips-card with 6 tabs (Home, Climate, Lights, Cameras, Media, Settings — Settings highlighted cyan)

---

## Section 1: THEME

### 1.1 Section Label
- Template: `section_label`
- Name: "THEME"

### 1.2 Theme Mode Description Card
- **Entity:** `input_select.theme_mode`
- **Type:** Read-only info display (tap_action: none)
- **Title:** "Theme Mode" (13px, weight 600)
- **Description:** Dynamic based on current state:
  - Auto → "Follows sunrise / sunset"
  - Day → "Always light theme"
  - Night → "Always dark theme"
- **Styling:** Standard card (14px 16px padding, 14px radius, card bg, card border)

### 1.3 Theme Mode Selector (horizontal-stack of 3 buttons)
Three equal-width `button-card` buttons:

| Button | Icon | Entity State | Service Call |
|--------|------|-------------|--------------|
| Auto | `mdi:theme-light-dark` | `Auto` | `input_select.select_option` → Auto |
| Day | `mdi:weather-sunny` | `Day` | `input_select.select_option` → Day |
| Night | `mdi:weather-night` | `Night` | `input_select.select_option` → Night |

**Active state styling:** When `input_select.theme_mode` matches button value:
- Background: `var(--accent-color)` (teal)
- Name color: `#fff`
- Icon color: `#fff`

**Inactive styling:**
- Background: `var(--ha-card-background, rgba(16,21,31,0.72))`
- Border: `1px solid var(--divider-color, rgba(255,255,255,0.06))`
- Name/icon: `var(--secondary-text-color)`
- Padding: 12px 8px
- Border-radius: 12px
- Icon size: 20px (--mdc-icon-size)
- Name: 11px, weight 600

---

## Section 2: DISPLAY

### 2.1 Section Label
- Template: `section_label`
- Name: "DISPLAY"

### 2.2 Kiosk Mode Toggle
- **Entity:** `input_boolean.kiosk_mode`
- **Type:** Toggle (tap_action: `input_boolean.toggle`)
- **Layout:** Row with label left, toggle switch right
- **Title:** "Kiosk Mode" (13px, weight 600)
- **Description:** Dynamic:
  - On → "HA header & sidebar hidden"
  - Off → "HA header & sidebar visible"
- **Toggle switch:** Custom HTML toggle
  - Track: 40px x 22px, border-radius 11px
  - On: accent color background (`var(--accent-color, #00d4f0)`)
  - Off: `rgba(255,255,255,0.12)` background
  - Knob: 18px circle, white, `box-shadow: 0 1px 3px rgba(0,0,0,0.3)`
  - Animated: `transition: all 0.2s` on knob, `transition: background 0.2s` on track
- **Styling:** Standard card + `cursor: pointer`

---

## Section 3: SYSTEM STATUS

### 3.1 Section Label
- Template: `section_label`
- Name: "SYSTEM STATUS"

### 3.2 Status Chips (mushroom-chips-card)
Three chips in a horizontal row:

| Chip | Icon | Content (Jinja2 template) | Icon Color | Tap Action |
|------|------|---------------------------|------------|------------|
| Security | `mdi:lock` | "All Secure" / "Check Locks" / "Garage Open" | Green if all secure, red otherwise | Navigate → Home |
| Lights | `mdi:lightbulb-group` | "{N} Lights On" | Accent if >0, disabled if 0 | Navigate → Lights |
| Temperature | `mdi:thermometer` | "{temp}°F" (from climate.daikin) | `#f5a623` | Navigate → Climate |

**Chip styling (via card_mod on mushroom-chips-card):**
- `--chip-background: rgba(16,21,31,0.72)`
- `--chip-border-color: rgba(255,255,255,0.06)`
- `--chip-border-width: 1px`
- `--chip-border-radius: 20px`
- `--chip-padding: 6px 12px`
- `--chip-font-size: 11px`
- `--chip-font-weight: 500`
- `--chip-spacing: 6px`

**Security chip logic:**
- All 3 locks locked + both garages closed → "All Secure" (green icon)
- Any lock unlocked → "Check Locks" (red icon)
- Any garage open → "Garage Open" (red icon)
- Entities checked: `lock.front_door_lock`, `lock.back_door_lock`, `lock.gemelli_door` (locked), `cover.ratgdov25i_1746c3_door`, `cover.ratgdov25i_1746b4_door` (closed)

---

## Section 4: ABOUT

### 4.1 Section Label
- Template: `section_label`
- Name: "ABOUT"

### 4.2 About Info Card
- **Type:** Read-only (tap_action: none)
- **Layout:** Three rows, divider-separated

| Row | Left Label | Right Value | Divider |
|-----|-----------|-------------|---------|
| Dashboard | "Dashboard" (13px, primary text) | "mobilev1" (12px, secondary text) | 1px bottom border |
| kis-nav.js | "kis-nav.js" (13px, primary text) | "v{N}" from `window.KIS_NAV_VERSION` (12px, secondary text) | 1px bottom border |
| Navigation | "Navigation" (13px, primary text) | "6 tabs" (12px, secondary text) | none |

- **Styling:** Standard card (14px 16px padding, 14px radius)
- **Divider color:** `var(--divider-color, rgba(255,255,255,0.06))`

---

## Dashboard-Level Configuration

### kiosk_mode
```json
{
  "hide_header": "[[[is_state('input_boolean.kiosk_mode', 'on')]]]",
  "hide_sidebar": "[[[is_state('input_boolean.kiosk_mode', 'on')]]]"
}
```

### Resources
- Empty array in dashboard JSON (loaded via `configuration.yaml` instead)

---

## Summary for v2 Rebuild

### Controls to Rebuild
1. Theme Mode selector (Auto/Day/Night) — 3 toggle buttons + description card
2. Kiosk Mode toggle — boolean toggle with custom switch UI
3. Security status chip — aggregate lock/garage state display
4. Lights count chip — live count of lights on
5. Temperature chip — current indoor temperature
6. About section — 3 info rows (dashboard version, app shell version, tab count)

### v2 Additions (from launch prompt)
7. Theme color picker — per Chunk 5 spec
8. kis-app-shell.js version row (replaces kis-nav.js version)
9. Release Notes placeholder row
10. Theme export/import controls (admin-only)

### Controls NOT Present in v1 (do not carry forward)
- No brightness controls
- No notification settings
- No user/account management
- No device registration
- No automation controls
