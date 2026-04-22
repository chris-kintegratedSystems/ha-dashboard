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
| simple-swipe-card | Carousel w/ slide-index tracking | WORKS | No `slide-changed` event. `.active-slide` class is VERTICAL-only in v2.8.2 — useless for horizontal swipes. Read `cardEl.currentIndex`, observe `.slider` style/transform mutations + `transitionend`, 750 ms poll fallback. Debounce 80ms. | 2026-04-21 |
| simple-swipe-card v2.8.2 | Dynamic tile visibility (conditionals) | WORKS | Children of `type: conditional` collapse cleanly when their condition evaluates false. `_adjustCurrentIndexForVisibility` recalculates slide count on HA state change. `goToSlide(i)` takes the VISIBLE rendered index, not the config-order index — so `goToSlide(0)` always lands on whichever conditional is the first currently-rendered tile. Pattern used for motion-camera takeover where 3 camera conditionals + 2 static tiles share one carousel and the priority camera is guaranteed by the upstream state machine to always be the first rendered tile. | 2026-04-21 |
| custom:button-card | Fill parent height (inside swipe-card slide, grid cell, flex child) | WORKS | `styles.card: height:100%` alone collapses because button-card's shadow DOM has `:host > #aspect-ratio > ha-card` and `#aspect-ratio` is `display:inline` with no height when `aspect_ratio:` is unset. Use top-level `extra_styles` with `:host { height:100%; display:block } #aspect-ratio { height:100%; display:block } ha-card { height:100% }`. See css_dom_patterns.md entry. Do NOT set `aspect_ratio:` config — it flips `#aspect-ratio` to `position:absolute`. | 2026-04-21 |
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
| Nest SDM (WebRTC) | WORKS, RATE-LIMITED | 5 QPM ExecuteDeviceCommand quota per user. Rapid test iteration burns it and returns 429 RESOURCE_EXHAUSTED that looks like a code regression. Wait ≥60s between camera-page reloads; navigate away for 90s to fully refill. For Playwright iteration use `qa-screenshot.js --mock-cameras` (no API calls); for loading-sequence verification use `qa-camera-burst.js` (FKB screenshots only). |
| iCloud3 (AirTags) | NOT STARTED | Needs Apple ID auth. |
| Tesla | NOT STARTED | Needs OAuth + virtual key. |
| Mercedes mbapi2020 | UNCERTAIN | G580 support unconfirmed. |
