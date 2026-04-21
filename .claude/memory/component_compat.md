# Component Compatibility — What Works and What Doesn't

Append new entries at the bottom. Date-stamp every entry.

---

## Card Components

| Component | Use Case | Status | Notes | Date |
|-----------|----------|--------|-------|------|
| custom:button-card | State-driven styling | WORKS | ONLY card confirmed working. Use native JS templates. | 2026-04 |
| custom:button-card | Brightness slider | WORKS | show_state + slider layout. | 2026-04-21 |
| custom:button-card | Thin section label | WORKS | button_card_templates `section_label` — styles.name with 9px uppercase + border-bottom hairline, no card_mod needed. | 2026-04-21 |
| card-mod (ANY usage) | Custom styling | NOT INSTALLED | `/hacsfiles/card-mod` missing from lovelace_resources. All card_mod blocks are silently ignored by Lovelace schema. Verify w/ `cat /config/.storage/lovelace_resources` before trusting any card_mod CSS. | 2026-04-21 |
| card-mod + Jinja | State-driven styling | BROKEN | Jinja doesn't render inside button-card (separate issue from above). | 2026-04 |
| card-mod | aspect-ratio on picture-entity | BROKEN | Use native aspect_ratio prop. | 2026-04-20 |
| type: markdown + inline HTML | Section header | WORKS IF card-mod not needed | Default HA markdown card ships with heavy `.card-content` padding + white background. Only viable for thin labels if card-mod strips them — which it doesn't here. Use custom:button-card section_label template instead. | 2026-04-21 |
| Bubble Card | Dynamic styling | BROKEN | Shadow DOM blocks. | 2026-04 |
| Mushroom cards | Dynamic styling | BROKEN | Shadow DOM blocks. | 2026-04 |
| tile + card-mod | Dynamic visuals | BROKEN | Shadow DOM blocks. | 2026-04 |
| picture-entity | Camera feeds | WORKS | Use native aspect_ratio. camera_view: auto for iOS. | 2026-04-20 |
| picture-elements | Fullscreen popup content | WORKS | Inside Browser Mod popup. | 2026-04-20 |
| bramkragten/swipe-card | Carousel | BROKEN | FKB crash with conditional children. | 2026-04-21 |
| nutteloost/simple-swipe-card v2.8.2 | Carousel | WORKS | ResizeObserver, no FKB crash. | 2026-04-21 |
| fold-entity-row | Expand/collapse | WORKS | Phase 5A lights page. | 2026-04-21 |
| simple-swipe-card | Carousel w/ slide-index tracking | WORKS | No `slide-changed` event. Observe `.active-slide` class via MutationObserver on subtree. Debounce 150ms. Re-attach on view remount. | 2026-04-21 |
| Browser Mod popup | Fullscreen overlays | WORKS | size: fullscreen, dismissable. | 2026-04-20 |

## Layout Types

| Layout | Use Case | Status | Notes |
|--------|----------|--------|-------|
| type: sections | Home, Climate, Lights views | WORKS | Needs CSS patches. |
| type: panel + grid | Cameras page | WORKS | columns: 2, square: false. |
| type: sections | Cameras (rejected) | FAILED | Height per-column not per-cell. |
| type: masonry | Settings page | NEEDS PATCH | Different CSS path. |

## Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| ratgdo (garage) | WORKS | cover.ratgdov25i_1746c3/b4_door |
| Vivint (alarm) | WORKS | alarm_control_panel.kuprycz_home |
| Nanit (cameras) | PARTIAL | RTMP works. Motion needs MQTT. |
| iCloud3 (AirTags) | NOT STARTED | Needs Apple ID auth. |
| Tesla | NOT STARTED | Needs OAuth + virtual key. |
| Mercedes mbapi2020 | UNCERTAIN | G580 support unconfirmed. |
