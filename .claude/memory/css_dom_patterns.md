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

## picture-entity height inside grid/stack (2026-04-21)
`ha-card { height: 100% }` on a picture-entity sitting inside a
horizontal-stack / grid child slot does NOT inherit parent height.
The picture-entity renders at the image's natural size and the stack
collapses around it, breaking any container-sizing expectation.
**Fix:** give the picture-entity's ha-card an EXPLICIT height
(e.g. `height: 240px !important; @media (min-width:768px){ height: 44vh !important }`)
matching the sibling card it alternates with. Match it on `min-height`
AND `max-height` so the feed cannot overflow either way.

## Day/night CSS variables via kis-nav :root-level bridge (2026-04-21)
HA's themes don't flip for day/night in this setup (single `kis-dark` theme
loaded at all times; sun-based day/night is kis-nav's job). That means theme-
aware CSS vars like `--divider-color` and `--disabled-text-color` cannot be
used to switch values between day and night inside dashboard content.

Bridge pattern: kis-nav.js sets custom properties directly on
`document.documentElement` inside the existing `isDayMode` branch:
```js
document.documentElement.style.setProperty('--kis-section-label', isDayMode ? '#7a8698' : '#4a5570');
document.documentElement.style.setProperty('--kis-section-rule',  isDayMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)');
```
CSS custom properties inherit through shadow DOM from the root, so any card
inside any shadow tree can `var(--kis-section-label, #4a5570)` and pick up
the correct value. Card must declare a fallback for the very first paint
before kis-nav has run.

Works in button-card's native `styles.name` / `styles.card` arrays (which
flatten to inline styles on light-DOM elements inside button-card's shadow
root — CSS vars still inherit).

Do NOT rely on `body[data-kis-day]` selectors — kis-nav only sets that
attribute on its own injected elements (header bar, nav bar, mini player),
not on document.body/html. Adding it to body would work but requires an
extra injection path; property bag on documentElement is simpler.

## simple-swipe-card — active-slide class marks the visible tile (2026-04-21)
`nutteloost/simple-swipe-card` v2.8.2 does NOT dispatch a `slide-changed`
custom event. Instead, it toggles an `active-slide` class on whichever
slide wrapper element is currently centered in the carousel (searched
both shadow DOM and light DOM of the card). To track the active slide
index from kis-nav.js, attach a MutationObserver watching `class`
attribute changes across the subtree, then compute the index by finding
the child with `.active-slide` and counting same-tag siblings.

Debounce the observer (~150ms) to avoid a flurry of callbacks during
the swipe animation. Detach and re-attach on view remount (the swipe-
card element is a new instance after navigating away from Home and
back).

## priority zone sibling conditional pattern (2026-04-21)
For the mobilev1 priority-display zone (home-view right column), the
camera takeover + carousel live as DIRECT children of the section,
not inside an outer grid wrapper. The grid wrapper (previously used
to impose min-height via card_mod) added ha-card padding that pushed
the section's first card BELOW the left column's SECURITY header on
the same row — breaking alignment. Drop the wrapper; each card sits
in the section's default column-gap slot. Alignment then matches
peers on the same grid row.

Card visibility is driven by `sensor.priority_camera` (HA-side template
sensor, most-recent-wins among active motion stickies):
- 3 conditional cards, one per camera, `condition: state`, `state:
  'doorbell' | 'living_room' | 'izzy'`
- 1 simple-swipe-card with `visibility:` block, `state: 'none'`
Exactly one card renders at any time. No overlap, no stacked empty
conditionals consuming row space.

## button-card state-reactive section_label (2026-04-21)
The `section_label` template accepts overrides at the instance level — both
`name` and `styles.name.<prop>` can be `[[[ ... ]]]` JS templates that read
`states[...]` and recompute on state change. Example: dynamic MOTION DETECTED
/ NO MOTION header above priority-display zone, text + color both reactive.

Key points:
- `name: "[[[ ... return 'STRING'; ]]]"` re-renders whenever any read
  state entity updates — no polling, no event wiring needed.
- Inside `styles.name`, any property value can also be `[[[ ... ]]]`.
  Color flip from `var(--kis-section-label, #4a5570)` to `#f04060` works.
- Pattern is cheap: the template only recomputes when listed entities
  change. Use it instead of HA `conditional:` cards whenever the swap
  is just text/style (not a whole card replacement).

## object-fit on camera feeds — Chris prefers fill (2026-04-21)
For the motion-takeover zone on mobilev1, Chris wants `object-fit: fill`
(stretch to fit exact zone dimensions), NOT cover (which crops) and NOT
contain (which letterboxes). The takeover card must be pixel-identical
in footprint to the carousel it replaces; any crop or letterbox reads
as layout shift. Apply via:
- `fit_mode: "fill"` at picture-entity native level
- card_mod on the picture-entity: `hui-image img, hui-image video { object-fit: fill !important; width: 100% !important; height: 100% !important }`
- Also cover `ha-hls-player video, ha-camera-stream video` for Nest/HLS
  streaming cameras where the element tree is different.
- `hui-image div` + `background-size: 100% 100%` for the fallback
  div-with-background-image path picture-entity sometimes takes.
