# CSS / DOM Patterns

Append new entries at the bottom. Date-stamp every entry.

---

## Shadow DOM traversal (2026-04)
document > home-assistant > SR > home-assistant-main > SR > ha-drawer > ha-panel-lovelace > SR > hui-root > SR (huiShadow) > ha-app-layout / #view > hui-sections-view | hui-masonry-view | hui-panel-view

## kis-nav.js injections (outside all shadow DOMs)
- #kis-header-bar: z-index 10000001, fixed top
- #kis-nav-bar: z-index 9999999, fixed bottom
- #kis-mini-player: z-index 9999998, above nav
- Day mode: data-kis-day attribute

## CSS patch IDs
- kis-hui-patch: huiShadow (ide app-header, view height)
- kis-header-clearance: huiShadow (#view padding-top)
- kis-applayout-patch: appLayout.SR (content padding)
- kis-sections-patch: sectionsView.SR (wrapper margin)

## Edge-to-edge fix (2026-04-21)
Sections: max-width:100%, padding:12px (matches card gap).
Masonry/panel: need separate overrides.

## Grid alignment (2026-04-21)
- minmax(0,1fr) not 1fr
- min-width:0 on flex children
- Carousel slides: flex:0 0 100%; max-width:100%
- align-items:stretch for equal columns

## Camera popup pattern (2026-04-20)
- Browser Mod fullscreen + picture-elements (100vwx100vh)
- Close X: :host position:fixed, z-index:9999
- Shared via button_card_templates

## Safe area inset top (2026-04)
- WKWebView delayed env() - probe after 500ms
- Never override with 0
