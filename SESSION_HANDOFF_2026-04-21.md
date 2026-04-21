# Session Handoff — April 21, 2026

End-of-day handoff. Both repos clean, all PRs merged, Pi deployed.

---

## What shipped this session

### Day/Night Hotfix (kis-nav.js v18)
- Root cause: kis-nav.js relied on HA theme names (kis-day/kis-night)
  that were never registered. Both auto and manual toggle were broken.
- Fix: kis-nav.js now reads `sun.sun` entity directly for auto mode.
- Manual override via `input_select.theme_mode` (Auto/Day/Night).
- Settings page theme selector wired to input_select.
- PRs: ha-dashboard #7, ha-config #5. Both merged.

### Phase 5A — Home Layout + Lights Room Cards
- Home view restructured: Security (3 locks) + Garage in left column,
  camera motion zone in right column.
- Grid uses minmax(0, 1fr) columns, align-items: stretch.
- Garage pushed to bottom of left column.
- Lights page: 4 room cards with button-card sliders,
  expand/collapse, master toggles, per-light brightness control.
- Light groups created in ha-config.
- PRs: ha-dashboard #8, ha-config #6. Both merged.

### v17 Design Session (Claude Project)
- Competitive benchmark (6 competitors)
- v16 mockup audit
- v17 design document + addendum + implementation plan
- Interactive prototypes for priority display zone, presence map,
  vehicle tiles, swipeable carousel, weather/energy tiles
- All docs uploaded to Drive ha-dashboard folder

---

## Current deployed state (on the Pi)

| Component | Version / state |
|-----------|-----------------|
| kis-nav.js | v18, cache-bust v18, day/night working |
| dashboard_mobilev1 | Phase 5A deployed (256KB, root:root 644) |
| input_select.theme_mode | Auto/Day/Night helper present |
| Light groups | kitchen_all, living_room_all, outdoor_all, benjamin_room_all |
| Camera entities | 5 cameras (doorbell, izzy, living room, nanit benjamin, nanit travel) |
| Motion sticky sensors | 3 binary_sensors (doorbell, living room, izzy) |

---

## Open PRs

None — all merged.

---

## Next up: Phase 5B — Swipeable Priority Display Zone

See KIS-v17-Implementation-Plan.md in the Drive ha-dashboard folder.

Deliverables:
1. Install swipe-card (HACS), verify on Tab S9 + iPhone
2. Replace Phase 4 camera zone with swipe-card carousel:
   - Tile 1: Vehicle cards (Tesla + Mercedes placeholder)
   - Tile 2: Weather card
3. Motion camera priority takeover (conditional wrapping carousel)
4. Swipe hint overlay in kis-nav.js

Blocker: swipe-card HACS install (bridge-ready, no auth needed).
Fallback: kis-nav.js custom carousel if swipe-card has issues.

---

## Design docs in Drive (ha-dashboard folder)

- KIS-v17-Design-Document.md — competitive benchmark, v16 audit, design spec
- KIS-v17-Design-Addendum.md — revised Home layout, swipeable priority zone,
  presence map, vehicle tiles, priority takeover stack
- KIS-v17-Implementation-Plan.md — 6 phases (5A-5F), bridge-ready prompts,
  feasibility scorecard, risk register, dependency graph
- mockup-v17.html — interactive mockup (pre-design-iteration)

## Key technical decisions from this session

1. Day/night uses sun.sun directly in kis-nav.js, NOT HA themes
2. Priority display zone uses swipeable carousel (swipe-card HACS)
3. Vehicles as default tile, presence map as tile 2
4. Priority takeover stack: P1 weather > P2 alarm > P3 motion > P4 carousel
5. Presence map: custom Leaflet.js webpage card (Phase 5D)
6. AirTags for golf carts via iCloud3 HACS (Phase 5D)
7. Swipe hint: transparent centered overlay, fades after 3.5s, localStorage flag
8. Grid columns: minmax(0, 1fr) to prevent overflow
