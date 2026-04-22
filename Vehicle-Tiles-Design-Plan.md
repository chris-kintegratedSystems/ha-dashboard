# KIS Vehicle Tiles — Design Plan & Recommendation

## Overview

Three vehicle tiles in the Home page priority display zone carousel, plus Weather:
**Tile 0: Porsche 911 Targa 4 GTS** → **Tile 1: Tesla Model Y "Gembella"** → **Tile 2: Mercedes G580 W4E "GEMELLI"** → **Tile 3: Weather**

Each tile swipes horizontally via simple-swipe-card v2.8.2 (already installed).
Dynamic section header updates per tile: "PORSCHE 911" / "TESLA GEMBELLA" / "MERCEDES GEMELLI" / "WEATHER"

---

## 1. HA Integration Requirements (Hands-On Setup)

All three require interactive HA UI setup — NOT bridge-ready.

### Porsche — CJNE/ha-porscheconnect (HACS)
- Install via HACS → Custom Repositories → github.com/CJNE/ha-porscheconnect
- Requires active Porsche Connect subscription
- Login with Porsche ID credentials in HA UI
- Entities expected: sensor.911_range, lock.911_lock, sensor.911_tire_pressure_* (FL/FR/RL/RR), device_tracker.911_location, image.911_*
- **Important:** 911 Targa is gas, NOT EV. No charging entities.
- Polling: ~15 min intervals (Porsche API is conservative)

### Tesla — Tesla Fleet (core integration, recommended over tesla_custom)
- Settings → Devices → Add Integration → Tesla Fleet
- Requires: Tesla developer account, OAuth, virtual key pairing via tesla.com/_ak/YOUR_DOMAIN
- Entities expected: sensor.gembella_battery_level, sensor.gembella_range, binary_sensor.gembella_charging, sensor.gembella_charge_rate, sensor.gembella_charger_voltage, sensor.gembella_charger_current, lock.gembella_door_lock, sensor.gembella_tire_pressure_*, climate.gembella
- Real-time streaming for 2024+ vehicles (Model Y qualifies)
- Virtual key required for commands (lock/unlock, climate)

### Mercedes — ReneNulschDE/mbapi2020 (HACS)  
- Install via HACS → search "MercedesME 2020"
- Login with Mercedes-Benz account credentials
- **CRITICAL:** MFA must be disabled on the MB account, or use a dedicated account without MFA
- Entities expected: sensor.gemelli_soc, sensor.gemelli_range, binary_sensor.gemelli_charging, sensor.gemelli_charge_power, lock.gemelli_lock, sensor.gemelli_tire_pressure_*, device_tracker.gemelli_location
- G580 W4E (EQG) is a newer model — verify entity availability after setup

---

## 2. Card Approach Recommendation

### Evaluated Options

**A. ds2000/homeassistant-fe-tesla (Tesla-only card)**
- Pros: Stunning UI, animated charging cable, real-time door/trunk overlays, GUI editor, closest to Tesla app
- Cons: Tesla-only. Would create visual inconsistency with Porsche and Mercedes tiles
- Verdict: Great card, but using it means the Tesla tile looks different from the other two. Conflicts with "unified look is priority" requirement.

**B. Ultra Vehicle Card (WJDDesigns)**
- Pros: Brand-agnostic, supports EV + fuel, gradient bars, icon grids, custom images, HACS default repo
- Cons: Generic look — doesn't match manufacturer app aesthetics. Limited layout control for the specific dense format needed in a carousel tile.
- Verdict: Good fallback but too generic for the manufacturer-app-inspired look Chris wants.

**C. vehicle-status-card (ngocjohn)**
- Pros: Brand-agnostic, tire pressure display built-in, mini map, swipe button grid
- Cons: Designed as a full-page card, not a compact carousel tile. Heavy.
- Verdict: Too large for the priority zone tile format.

**D. Custom button-card templates (RECOMMENDED)**
- Pros: Full control over layout, matches KIS design system exactly, works with existing day/night CSS variable bridge, proven pattern in this project, compact enough for carousel tiles, unified look across all 3 vehicles
- Cons: More upfront work than dropping in a pre-built card
- Verdict: **Best fit.** Matches the existing dashboard patterns, gives pixel-perfect control, and guarantees a unified look across all three vehicles.

### Recommended Approach: Custom button-card templates

Build a reusable `vehicle_tile` button-card template with per-vehicle overrides.
Each tile shares the same visual structure but with vehicle-specific data and images.

---

## 3. Visual Design Specification

### Tile Layout (fits within priority display zone ~44vh height)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│         [Vehicle Image — transparent bg]            │
│         (centered, ~55% of tile height)             │
│                                                     │
├─────────────────────────────────────────────────────┤
│  911 Targa 4 GTS                    🔒  📍 Home    │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░  220 mi                 │
│  ⊙32 ⊙32    ⊙32 ⊙32  (tire PSI, dim unless warn)  │
└─────────────────────────────────────────────────────┘
```

### Information Hierarchy (per vehicle type)

**ALL VEHICLES — common structure:**
- Row 1: Vehicle image (hero, ~55% height, transparent PNG)
- Row 2: Vehicle name (left) + status icons (right: lock, location)
- Row 3: Range bar + range value
- Row 4: Secondary info (tire pressure / charging details)

**Porsche 911 (gas):**
- Range bar: fuel-style gradient (green → yellow → red as it depletes)
- Range value: "220 mi"
- Lock icon: 🔒 teal (locked) / 🔓 orange (unlocked)
- Location: "Home" or distance (e.g., "3.2 mi away")
- Tire pressure: 4 values (FL FR RL RR), dim gray unless pressure warning → then red
- No charging row

**Tesla "Gembella" (EV, charging):**
- Range bar: battery-style with charge limit marker (like Tesla app)
- Range value: "183 mi · 80%"
- Charging row (when charging): "⚡ Charging · 41 mi/hr · 48A · 236V"
- Charging row (not charging): hidden or "Plugged In" / "Not Connected"
- Bar color: green when charging, teal when idle
- Lock icon: same pattern
- Tire pressure: same as Porsche (only show if warning)

**Mercedes "GEMELLI" (EV, charging):**
- Range bar: battery-style with charge end marker
- Range value: "165 mi · 66%"
- Charging row (when charging): "⚡ Charging · 7.5 kW · ends 5:30 PM"
- Bar color: blue when charging (Mercedes brand), teal when idle
- Lock icon: ⚠️ orange warning if unlocked (like MB app shows)
- Tire pressure: same pattern

### Color System (extends existing KIS palette)

| Element | Night Mode | Day Mode |
|---------|-----------|---------|
| Vehicle name | White | Dark gray |
| Range bar (fuel/idle) | Teal | Teal |
| Range bar (charging) | Green (#22c55e for Tesla, #0ea5e9 for Mercedes) | Same |
| Range bar (low <15%) | Red warning | Red warning |
| Charge limit marker | White triangle (like Tesla app) | Dark triangle |
| Lock (locked) | Teal icon | Teal icon |
| Lock (unlocked) | Orange icon + pulse | Orange icon |
| Location | Dim gray text | Medium gray text |
| Tire (normal) | Very dim, barely visible | Very dim |
| Tire (warning) | Red, bold | Red, bold |
| Charging text | Green | Green |

### Car Images

Need transparent-background PNGs extracted from the manufacturer app screenshots:
- Porsche: Green 911 Targa 4 GTS (side profile)
- Tesla: Anime-wrapped Model Y "Gembella" (rear 3/4 view)  
- Mercedes: Blue G580 W4E (front 3/4 view)

**Day/Night variants:**
- Night mode: images as-is (designed for dark backgrounds)
- Day mode: same images with slightly increased brightness/contrast via CSS filter
  `filter: brightness(1.05) contrast(1.02)` in day mode
  OR: two separate PNGs per vehicle if CSS filter doesn't look right

Image prep is a manual task — Chris (or designer) removes backgrounds in 
Photoshop/Figma and exports transparent PNGs at 2x resolution for retina.
Store in /config/www/mobile_v1/images/vehicles/ on the Pi.

### Tap Actions

- Tap vehicle image: Browser Mod popup with expanded vehicle detail view
  (future phase — for now, just show a larger version of the tile)
- Tap lock icon: toggle lock/unlock (with confirmation for unlock)
- Tap location: open map popup or navigate to a vehicle location view
- Tap charging bar (EVs): no action (display only, avoid accidental charge changes)

---

## 4. Implementation Phases

### Phase A: Integration Setup (Hands-On, ~1 hour)
1. Install all 3 HACS integrations
2. Configure credentials in HA UI
3. Tesla: complete OAuth + virtual key pairing
4. Mercedes: ensure MFA is disabled
5. Verify all entities appear in HA Developer Tools → States
6. Document actual entity IDs in ha-config CLAUDE.md

### Phase B: Image Prep (Manual, ~30 min)
1. Remove backgrounds from the 3 car screenshots
2. Export as transparent PNGs (2x resolution)
3. Optional: create day-mode brightness variants
4. SCP to Pi: /config/www/mobile_v1/images/vehicles/
   - porsche-911-targa.png
   - tesla-model-y-gembella.png  
   - mercedes-g580-gemelli.png

### Phase C: Dashboard Implementation (Bridge-Ready)
1. Create button_card_templates for vehicle_tile (shared structure)
2. Create per-vehicle template overrides (porsche_tile, tesla_tile, mercedes_tile)
3. Add 3 vehicle tiles to simple-swipe-card carousel (before Weather tile)
4. Wire up kis-nav.js dynamic header to show vehicle names on swipe
5. Update input_number.priority_slide_index range (was 0-1, now 0-3)
6. Day/night CSS variables for vehicle-specific colors
7. Deploy + QA with --mock-cameras (vehicles don't need camera QA tools)

### Phase D: Polish & Popups (Bridge-Ready)
1. Build expanded vehicle detail popups (Browser Mod)
2. Add tap-to-lock/unlock with confirmation dialog
3. Charging animations (subtle pulse on bar when actively charging)
4. Tire pressure warning automation (notify if pressure drops)

---

## 5. Key Technical Decisions

1. **button-card over pre-built cards** — unified look, matches KIS patterns, 
   no shadow DOM issues, works with existing day/night variable bridge

2. **Tesla Fleet over tesla_custom** — core integration, official support, 
   real-time streaming for 2024+ vehicles. tesla_custom requires refresh 
   token from third-party app.

3. **Car images as static PNGs, not API images** — manufacturer APIs return 
   generic model images, not the actual car with Chris's specific wrap/color.
   Static PNGs from the app screenshots capture the real vehicles.

4. **Charging bar with brand-specific accent colors** — green for Tesla 
   (matches Tesla app), blue for Mercedes (matches MB app), teal for Porsche 
   (KIS brand color, no charging since it's gas)

5. **Tire pressure hidden unless warning** — keeps tiles clean at a glance. 
   Normal pressures are noise; only surface when actionable.

---

## 6. Risks & Dependencies

| Risk | Mitigation |
|------|-----------|
| Porsche Connect may not expose tire pressure for 911 | Check entity list after integration setup. Fallback: omit tire pressure for Porsche |
| Mercedes MFA requirement blocks integration | Use a dedicated MB account without MFA |
| Tesla virtual key pairing fails | Try from Safari on iPhone (known iOS requirement) |
| Car images don't look right on light backgrounds | Prepare separate day-mode PNGs with subtle drop shadow |
| Priority zone height insufficient for 4 rows of info | Reduce image height to ~45%, use compact typography |
| G580 W4E is very new — mbapi2020 may have gaps | Check GitHub issues for G580/EQG support. Fallback: use generic EV entities |

---

## 7. Evaluate ds2000/homeassistant-fe-tesla Before Committing

Before building custom tiles, Phase C should start by installing the Tesla card 
and evaluating it in a test view (not the live dashboard):

1. Install via HACS self-serve (JS download, bridge-ready)
2. Create a test view with the card configured for Gembella
3. Screenshot on Tab S9 + iPhone
4. Assess: does it fit the carousel tile height? Does it match KIS dark mode?
5. If it's close to what we want → adapt the Porsche and Mercedes custom tiles 
   to match its visual language (reverse-engineer the look)
6. If it doesn't fit the carousel format → proceed with full custom button-card approach

This evaluation costs ~20 minutes and could save hours if the card's design 
language is worth adapting rather than building from scratch.
