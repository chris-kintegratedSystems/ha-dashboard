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

## simple-swipe-card — read currentIndex, watch .slider transform (2026-04-21, revised)
`nutteloost/simple-swipe-card` v2.8.2 does NOT dispatch a `slide-changed`
custom event. Earlier note in this file claimed `.active-slide` class
marks the visible tile — that was WRONG for horizontal mode. Per the
card's CSS, `.active-slide` is only applied when the carousel is in
vertical mode (`.vertical .slide.active-slide`); horizontal swipes
never toggle that class and a MutationObserver watching for it never
fires. Verified via Playwright DOM inspection in `swipe-inspect.js`.

Working approach (kis-nav.js v26):
1. Read the authoritative index directly from the custom element as
   `cardEl.currentIndex` — the card exposes this property and keeps it
   in sync with the rendered transform. Preferred source of truth.
2. Attach a MutationObserver to the card's shadow root with
   `attributeFilter: ['style', 'class', 'data-visible-index']` and
   `subtree: true`. The `.slider` element's inline `style` (transform
   matrix) mutates on every swipe and snap-back, so this fires reliably.
3. Attach a `transitionend` listener on the shadow root's `.slider`
   element — fires when the swipe animation settles. Cheap confirmation
   callback.
4. As a fallback, run a 750 ms `setInterval` that re-reads
   `currentIndex` and pushes to HA if it changed. Covers any mutation
   the observer misses (e.g. programmatic `goToSlide()`).

Debounce the observer to 80 ms. On every callback, re-read
`cardEl.currentIndex` and only call `input_number.set_value` when the
value changed from the last pushed value (cache last-sent in a module-
scoped var). Detach observer + transitionend + interval on view remount
— the swipe-card element is a new instance after navigating away from
Home and back. Store refs in `_swipeObserverEl`,
`_swipeObserverInstance`, `_swipeTransitionCleanup`, `_swipePollTimer`.

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
  'doorbell' | 'living_room' | 'bens_room' | 'nanit_benjamin' | 'nanit_travel'`
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

## Camera placeholder via pseudo-element — CSS-first, no race (2026-04-21, v30 — SUPERSEDED, see v33 below)
Inject a stylesheet into each `hui-picture-entity-card` shadow root that:
1. Paints a placeholder layer via `ha-card::before` — `content: var(--kis-cam-label-text)`,
   centered text, subtle opacity pulse. Exists the moment the `<style>` node lands.
2. Gates the live feed at `opacity: 0` (hui-image, hui-image img/video/div,
   ha-hls-player video, ha-camera-stream video) — no transition, no visible
   fade-out of a raw black `<video>` element.
3. On `:host([data-kis-feed-ready])`, flips feed opacity to 1 WITH a 300 ms
   transition, and `ha-card::before { opacity: 0 }` fades the placeholder out.

Day/night colors come from documentElement CSS vars (--kis-cam-placeholder-bg /
-text / -border), set in `renderHeaderContent`'s isDayMode branch. CSS custom
properties inherit through every shadow-DOM boundary, so no attribute
propagation onto the picture-entity host is needed.

Label text is passed via `--kis-cam-label-text` (set on the host's inline style,
value wrapped in quotes so it resolves as a valid CSS string for `content`).
Install calls `customElements.whenDefined('hui-picture-entity-card')` for the
earliest opportunity, plus a 60 ms / 6 s burst as a fallback on view nav.

Why this beats a DOM-injected overlay: the `<style>` insertion happens atomically
with its rules taking effect — there's no window where picture-entity paints
before the pseudo-element exists. See `dead_ends.md` → "Camera placeholder via
DOM-injected overlay" for the v29 race that motivated this.

**DO NOT USE step 2 — it's the v31/v32 break.** Gating hui-image / video /
ha-hls-player / ha-camera-stream at `opacity: 0` starves Android WebView's
media decoder on the Tab S9 (Chromium 146.x): the elements never paint
pixels even after the reveal class lifts the gate, and the cell stays
empty indefinitely. v33 pattern below is the safe version.

## Camera placeholder via overlay-only ha-card::before (2026-04-21, v33 — SUPERSEDED by v34 below)
Same goal as the v30 entry above, but this time the native feed rendering is
left **completely untouched** — no `opacity: 0` on hui-image/video/ha-hls-player/
ha-camera-stream, no host opacity tricks. Only the `ha-card::before` pseudo-
element is painted as a solid-color overlay on top of the live feed, and fades
out when the reveal class lands.

Shadow-root stylesheet (inside each `hui-picture-entity-card`):
```css
ha-card {
  background: var(--kis-cam-placeholder-bg, #151c2a) !important;
}
ha-card::before {
  content: var(--kis-cam-label-text, "CAMERA");
  position: absolute; inset: 0; z-index: 5;
  display: flex; align-items: center; justify-content: center;
  background: var(--kis-cam-placeholder-bg, #151c2a);
  color: var(--kis-cam-placeholder-text, #4a5570);
  pointer-events: none; border-radius: inherit;
  transition: opacity 300ms ease;
  animation: kis-cam-pulse 2.4s ease-in-out infinite;
}
:host(.kis-feed-ready) ha-card::before {
  opacity: 0;
  animation: none;
}
```

Reveal trigger: JS adds class `kis-feed-ready` to the `hui-picture-entity-card`
host element when any of `loadeddata` / `playing` / `canplay` fires on the feed
element (hui-image img/video, ha-hls-player video, ha-camera-stream video).
Hard cap at 5 s via an interval counter, plus a 3 s `setTimeout` safety to
mark ready unconditionally — prevents cameras with quirky event dispatch from
staying placeholder'd forever.

Why `:host(.kis-feed-ready)` not `:host([data-kis-feed-ready])`: attribute
selectors on HA component hosts can collide with the component's own config
attributes; a plain class is safer and HA doesn't manage classes on the host.

Day/night colors still travel via documentElement CSS custom properties
(--kis-cam-placeholder-bg, --kis-cam-placeholder-text) — unchanged from v30.

**Broader lesson:** overlay on TOP of native media rendering is always safer
than gating native rendering off. Any CSS that touches video element opacity
on Android WebView is a regression waiting to happen.

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

## Playwright camera mock — two-layer intercept (2026-04-21)
`qa-screenshot.js --mock-cameras` replaces Nest camera feeds
(`camera.nest_cam_2`, `camera.nest_cam_1`) with a generated
SVG placeholder so iterative Playwright sweeps over camera-containing
views burn zero Nest SDM quota. The implementation uses BOTH layers
simultaneously because neither alone covers every picture-entity
render path:

Layer 1 — `context.route()` intercepts `**/api/camera_proxy/<entity>*`
and `**/api/camera_proxy_stream/<entity>*`, returning the SVG as a
200 with `image/svg+xml`. Covers the snapshot thumbnail path that
picture-entity pulls on first paint. Does NOT cover HLS (`/api/hls/
<token>/*`) or WebRTC (signaled via websocket, peers directly) —
those URL tokens are keyed to the stream, not the entity, so
pattern matching cannot target specific cameras.

Layer 2 — `context.addInitScript()` registers a MutationObserver +
500 ms interval that walks shadow DOMs looking for
`hui-picture-entity-card` elements whose `config.entity` is in the
mock set. When found, it injects a `<style>` inside the card's
shadow root that (a) gates `hui-image`, `ha-hls-player`,
`ha-camera-stream` children at `opacity: 0`, and (b) paints a
`.kis-mock-overlay` div inside `ha-card` with the SVG as a
`background-image`. This catches HLS/WebRTC renders that Layer 1
misses.

Note: Layer 2 uses the same "opacity: 0 on media elements" gating
pattern that broke v31/v32 on Android WebView (see dead_ends.md).
That is safe here because Playwright's Chromium handles the opacity
correctly AND this is mock-only — the mock never ships to real
devices. DO NOT copy this opacity-gating pattern into kis-nav.js
shadow CSS on the Tab S9.

SVG body is inline in the script — no external file dependency:
dark-gray 16:9 rectangle, "CAMERA MOCK" heading, entity name
subtitle. `preserveAspectRatio="xMidYMid slice"` lets the SVG fill
whatever aspect ratio the card slot demands.

## Camera placeholder — video background + playing-gated reveal (2026-04-21, v34)
Builds on v33 (overlay-only `ha-card::before` — no `opacity` gating on
media elements, safe for Android WebView). v33 fixed the race between
our CSS and HA's first paint, but left a secondary flash visible during
the 300ms overlay fade-out: Android WebView 146 paints empty `<video>`
elements black by UA default, and we were firing the reveal (adding
`.kis-feed-ready`) on `loadeddata` — which fires on one buffered frame,
not on visible frames. Cross-dissolving the placeholder into an empty
`<video>` produced "black → white → video" in day mode
(near-white overlay) and was invisible in night mode (near-black
overlay blends with UA black).

Two additions on top of v33:

1. **Paint the video element's OWN background** to match the
   placeholder, via the same shadow-root stylesheet:
   ```css
   video,
   hui-image video,
   ha-camera-stream video,
   ha-hls-player video,
   ha-web-rtc-player video {
     background-color: var(--kis-cam-placeholder-bg, #151c2a) !important;
   }
   ```
   `background-color` on `<video>` is standard CSS — it paints the
   element's own backing color whenever the video has no decoded frame
   (empty buffer, initial mount, network stall, brief decoder hiccup).
   Critically **not** `opacity: 0` — so the decoder keeps painting
   pixels normally and the v31/v32 WebView regression stays fixed.

2. **Reveal gate tightened from `loadeddata` to `playing`.** `loadeddata`
   = decoder buffered one frame = often a black I-frame on Nest SDM
   low-light / warmup. `playing` = stream is actually producing
   subsequent frames = safe moment to cross-dissolve the overlay. For
   the initial/polled readyState check: raised from `>= 2`
   (HAVE_CURRENT_DATA) to `>= 3 && !paused` (HAVE_FUTURE_DATA +
   actually playing). `<img>` feeds (Nanit MJPEG / Vivint snapshot) are
   unchanged — `load` event + `complete && naturalHeight > 0` still
   right there.

Safety timer (3 s) and poll-count cap (5 s) unchanged — the hard
backstop for feeds where `playing` never fires.

**Why Playwright didn't reproduce the original bug:** Playwright's
Chromium uses a transparent UA default for empty `<video>`. Real
Android WebView 146 uses black. The bug is only visible on actual
hardware, so Playwright sweeps must be complemented by
`qa-camera-burst.js` bursts of the Tab S9 for anything involving
camera load transitions.

**Broader lesson:** two paint-layer bugs can stack. v33 fixed Layer 1
(placeholder CSS race vs. first HA render). v34 fixed Layer 2 (UA
default video paint + wrong reveal gate). Keep both patterns
together.

## Priority-camera auto-snap + per-camera swipe cooldown (2026-04-21, kis-nav v35)
Carousel takeover pattern: 3 camera conditionals + 2 static tiles
inside simple-swipe-card. Upstream tier-priority state machine
(`sensor.priority_camera`, hold-until-clear logic in
`ha-config/automations.yaml`) guarantees the active priority camera
is ALWAYS the first currently-rendered tile. kis-nav.js auto-snaps
the carousel to rendered-index 0 whenever `sensor.priority_camera`
transitions into a new camera name:

```js
function autoSnapPriorityCamera() {
  const cam = getState(hass, 'sensor.priority_camera')?.state;
  if (!['doorbell','living_room','bens_room','nanit_benjamin','nanit_travel'].includes(cam)) {
    _lastSnappedPriorityCamera = null;  // reset on 'none' so next snap fires
    return;
  }
  if (cam === _lastSnappedPriorityCamera) return;           // already snapped
  if (Date.now() < (_cameraCooldownUntil[cam] || 0)) {
    _lastSnappedPriorityCamera = cam;                       // ACK during cooldown so expiry doesn't re-snap
    return;
  }
  swipeCard.goToSlide(0);                                   // 0 = rendered index, not config index
  _lastSnappedPriorityCamera = cam;
}
```

Called from both the post-navigation 100ms setTimeout and the
1-second setInterval in onMobileDashboard tick.

**Swipe-away cooldown (user dismiss):** pointerup handler on the
swipe card reads `currentIndex` BEFORE and 120ms AFTER release; if
pre=0 and post>0 during an active priority camera, records
`_cameraCooldownUntil[cam] = Date.now() + 60000` so that camera
cannot auto-snap back for 60s. Per-camera, so a higher-tier camera
still snaps even if the user dismissed a lower-tier one.

**Cooldown-ACK subtlety:** during cooldown, still set
`_lastSnappedPriorityCamera = cam`. Without the ACK, the moment
cooldown expires the sensor state still equals cam and the next tick
would auto-snap — defeating the dismissal. Only a transition through
`priority_camera == 'none'` back into a camera name resets
`_lastSnappedPriorityCamera` and earns another snap.

## button-card fill parent height — `extra_styles` :host chain (2026-04-21)
Context: a `custom:button-card` inside `custom:simple-swipe-card` with
`grid_options: { rows: 9 }` — swipe-card host resolves to 568px, but
button-card's inner ha-card renders at ~153px (content height — icon
+ name + label). simple-swipe-card's internal `.slide > * > ha-card`
CSS reaches the button-card HOST (light DOM), but cannot cross the
shadow-DOM boundary into button-card's internal ha-card.

Root cause from button-card source (`src/button-card.ts`): shadow
structure is `:host > #aspect-ratio > ha-card`. `styles.card:` is
applied directly to ha-card via inline styleMap, so `styles.card:
height: 100%` IS reaching ha-card — but resolves against a
parent `#aspect-ratio` div that is `display: inline` with no height
when `aspect_ratio:` config is unset. 100% of zero height = zero,
so ha-card collapses to content.

**Fix — card-mod NOT required.** button-card exposes a top-level
`extra_styles` key that emits a raw `<style>` inside its shadow root.
Set height:100% on ALL THREE ancestors in the chain:

```yaml
type: custom:button-card
extra_styles: |
  :host { height: 100%; display: block; }
  #aspect-ratio { height: 100%; display: block; }
  ha-card { height: 100%; }
```

In JSON: a single string key `"extra_styles"` with the three rules
concatenated on one line.

Do NOT also set the `aspect_ratio:` config prop — it flips
`#aspect-ratio` into `position: absolute` mode and ha-card fights
the swipe-card slot differently. Leave `aspect_ratio:` unset.

Related refs: custom-cards/button-card issue #861, home-assistant/
frontend issue #22616 (HA 2024.11+ grid height regression). Community
confirmed this is the post-2024.11 community-standard workaround.

Applied 2026-04-21 to the priority-zone vehicle + weather tiles in
`dashboard_mobilev1.json` section s[2].

## 2026-04-21 — button-card extra_styles needs !important on :host

`extra_styles` injects a `<style>` element into button-card's shadow
root, so `:host { ... }` rules DO apply. But button-card ships its
own `adoptedStyleSheets` with `:host { display: flex; max-width:
fit-content; flex: 0 0 auto; ... }` that win at equal specificity.

Symptom: inside a simple-swipe-card `.slide` (display: flex, width:
500px), the button-card renders at `width: 133px` despite
`extra_styles: ":host { width: 100% }"` — the computed styles show
`display: flex`, `max-width: fit-content` from button-card's own
sheet.

**Fix:** use `!important` on every `:host` property you need to
override:
```
:host {
  height: var(--kis-zone-h, 400px) !important;
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  flex: 1 1 100% !important;
  display: block !important;
  box-sizing: border-box;
}
```

Probe confirmation: `shadowRoot.querySelectorAll('style')` shows
exactly ONE style element (the extra_styles one), so the competing
rules must come from adoptedStyleSheets which are NOT listed there.
The `!important` tips specificity in your favor regardless of source.

Applied to `dashboard_mobilev1.json` priority-zone tiles 2026-04-21.

## 2026-04-21 — HA sections right-column hui-grid-section is inside shadow

The right column on a `type: sections` home view lives inside a
shadow root of `hui-sections-view`. `document.querySelectorAll(
'hui-grid-section')` from light DOM misses it.

**Fix:** walk UP from a known-deep element (e.g. the swipe-card)
through shadow boundaries using
`el.getRootNode().host` when crossing shadow roots:
```
function findPriorityZoneSection() {
  const swipe = findSwipeCardEl(document.body);
  if (!swipe) return null;
  let el = swipe;
  for (let i = 0; i < 30; i++) {
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    if (tag === 'hui-grid-section' || tag === 'hui-section') return el;
    const next = el.parentElement
      || (el.getRootNode && el.getRootNode() !== document
           ? el.getRootNode().host : null);
    if (!next || next === document.body || next === document.documentElement) break;
    el = next;
  }
  return swipe.parentElement || swipe;
}
```

Use this whenever kis-nav.js needs to observe or measure a
`hui-grid-section` on a `type: sections` dashboard.

## 2026-04-21 — ResizeObserver attach can beat shadow-mount: re-find

When `installZoneHeightObserver()` attaches during initial page load,
the swipe-card's shadow root often isn't mounted yet. `findSwipeCardEl
(rightSection)` returns null. Later ResizeObserver fires set the CSS
custom property but NOT the inline `style.height` on the swipe-card
(because `_zoneSwipeCard` is still null), so tiles that look at
`var(--kis-zone-h)` render correctly while the swipe-card container
stays at its intrinsic ~100px.

**Fix:** re-find the swipe-card at the top of `recomputeZoneHeight()`
on every call, not just once in `installZoneHeightObserver`:
```
if (!_zoneSwipeCard || !_zoneSwipeCard.isConnected) {
  _zoneSwipeCard = findSwipeCardEl(_zoneRightSection)
                || findSwipeCardEl(document.body);
}
```

This also self-heals if HA ever replaces the swipe-card DOM (route
swap, rebuild).

## 2026-04-22 — Event-driven state subscription from extra_module_url JS
`window.hassConnection` is a Promise (set by HA frontend) that resolves
to `{ auth, conn }`. The `conn` object is a `home-assistant-js-websocket`
Connection with `subscribeEvents(callback, eventType)`. From an
`extra_module_url` script (kis-nav.js), subscribe to `state_changed` for
instant reaction to entity state updates — no polling needed:
```js
window.hassConnection.then(({ conn }) => {
  conn.subscribeEvents((event) => {
    if (event.data.entity_id === 'sensor.priority_camera') {
      autoSnapPriorityCamera();
    }
  }, 'state_changed');
});
```
Retry with setTimeout if `window.hassConnection` isn't set yet (HA
sets it late in the boot sequence). Keep the 1s setInterval as a
fallback for other periodic work (clock, placeholders) but remove the
specific function from the interval since the subscription handles it.

## 2026-04-22 — Frigate snapshot as placeholder background
Frigate `/api/<camera_name>/latest.jpg` returns the most recent
detection frame (640x480). Set as a CSS custom property per
picture-entity host element:
```js
pe.style.setProperty('--kis-cam-snapshot',
  'url("http://192.168.51.179:5000/api/' + camName + '/latest.jpg?t=' + Date.now() + '")');
```
Use in `ha-card::before` as `background: var(--kis-cam-snapshot, none)`.
Cache-bust with `?t=` ensures a fresh snapshot on each card mount.
Use `background-size: 100% 100%` (stretch) not `cover` (crop) because
Frigate snapshots are 4:3 but the live WebRTC feed is 16:9 — `cover`
causes a visible content shift during the overlay fade-out.

## 2026-04-23 — Real scroll container is hui-sections-view, NOT #view

`applyDynamicHeaderClearance()` sets `overflow-y: auto` + constrained
`height: calc(100vh - (NAV_H + clearance)px)` directly on
`hui-sections-view` via `element.style`. The sections-view outer
height (margin-top + height) fits exactly inside `#view`'s box, so
`#view` never overflows and `#view.scrollTop` is always 0.

Correct save/restore pattern:
```js
var viewEl = huiShadow.querySelector('#view');
var sectionsView = viewEl && viewEl.querySelector('hui-sections-view');
var scrollEl = sectionsView || viewEl;
var saved = scrollEl.scrollTop;
```

iOS WKWebView 15.4+ silently blocks `scrollTop = x` when
`scroll-behavior: smooth` is active. Force `auto` before setting:
```js
scrollEl.style.scrollBehavior = 'auto';
scrollEl.scrollTop = saved;
```

`overflow-anchor` is NOT supported in Safari/WKWebView — JS
save/restore is the only option for iOS scroll preservation.

## 2026-04-23 — button-card .name/.label are grid children, not free-floating

button-card renders `.name` and `.label` as CSS Grid children inside
`.grid`. Their position is controlled by `styles.grid` →
`grid-template-areas`. Setting `position: absolute` on them (via
`styles.name` inline objects OR `extra_styles` shadow CSS) does NOT
reliably remove them from grid flow — the grid engine still assigns
their slots before CSS positioning takes effect, causing overlap.

What DOES work for visual-only changes on `.name`/`.label`:
- Font properties in `styles.name`/`styles.label` arrays (inline styles)
- Color, font-size, font-weight, letter-spacing, text-transform, margin
- These apply correctly because they don't fight the grid layout

What DOES NOT work:
- `position: absolute` in `styles.name` (grid overrides)
- `position: absolute !important` in `extra_styles` `.name {}` (wins
  specificity but grid still assigns overlapping slots)
- `transform: translateY(-50%)` centering (conflicts with grid)

For layout changes beyond the grid's built-in areas (e.g. centering
name across full card width independently of icon/badge), use
`custom_fields` which render in their own named grid area and can be
positioned independently.

## 2026-05-07 — weather-radar-card shadow DOM structure + bottom-bar hide

weather-radar-card (custom HACS card, RainViewer) shadow structure:
```
weather-radar-card (host)
  └── shadowRoot
       └── ha-card
            ├── .banner-stack (hidden by default)
            ├── #mapid (Leaflet map container)
            ├── #div-progress-bar (hidden when show_progress_bar=false)
            └── #bottom-container (32px, position:relative, flex)
                 ├── #timestampid → #timestamp → .ts-date + .ts-time
                 ├── #loading-spinner (hidden by default)
                 └── #attribution (RainViewer credit)
```

No card config property to hide the bottom bar (no `show_timestamp`,
`show_attribution`, or `show_bottom_bar`). Must hide via CSS injection.

The card uses `attributionControl: false` on its Leaflet instance, so
no `.leaflet-control-attribution` element exists — no need to hide it.

kis-nav.js injects into `weather-radar-card.shadowRoot` via
`injectShadowCSS(radar.shadowRoot, 'kis-radar-patch', css)`:
```css
ha-card { height: 100% !important; width: 100% !important; border-radius: 14px; overflow: hidden; }
.leaflet-container { background: var(--ha-card-background, rgba(16,21,31,0.72)) !important; }
#bottom-container { display: none !important; }
```

Host inline styles also set: `height:100%; width:100%; display:block;
borderRadius:14px; overflow:hidden`.

## 2026-05-07 — ha-drawer / ha-sidebar shadow DOM for kiosk-mode sidebar

When kiosk_mode is OFF, HA renders the sidebar. Shadow path:
```
home-assistant > SR > home-assistant-main > SR > ha-drawer > SR
  └── aside.mdc-drawer (position:fixed, height:100vh)
       └── (light DOM child) ha-sidebar > SR
            └── .panels-list (content overflow, no overflow-y:auto)
```

`aside.mdc-drawer` extends behind kis-nav header (64px) and nav bar
(56px) because it's position:fixed at full viewport height. The
`.panels-list` inside `ha-sidebar` shadow root overflows but has no
scroll enabled.

**WARNING:** Injecting CSS into these shadow roots via kis-nav.js
PASSED Playwright QA but FAILED on real devices (2026-05-07). Do not
trust this approach without real-device diagnostic confirmation first.
See dead_ends.md entry of same date.

## 2026-05-17 — mobilev2 FOUC elimination via RAF early-hide loop + readiness gate

Shadow DOM CSS injection via `patchHALayout` retry loop (300ms backoff)
is too slow to hide `hui-sections-view` before its first paint. Under
4x CPU throttle, the element appears visible for ~1.2s before the CSS
arrives.

**Fix — two-layer approach:**

1. **RAF early-hide loop** (`earlyHideLoop`): starts at script load via
   `requestAnimationFrame`, polls every frame for `huiRoot.shadowRoot`.
   The MOMENT it finds it, injects `getHuiRootCSS()` which includes
   `hui-sections-view { opacity: 0; visibility: hidden; }`. This fires
   within 1 frame of the shadow root existing — before `patchHALayout`'s
   first retry. Separate from the full layout patching to minimize time
   to first injection.

2. **Readiness gate** (`armRevealGate`): after `patchHALayout` succeeds
   and injects `getSectionsViewCSS()` (which has `:host { opacity:0 }`
   and `:host(.kis-ready) { opacity:1; transition:250ms }`), arms a
   gate that waits for `Promise.all([whenDefined('kis-scenes'),
   whenDefined('kis-control-panel'), whenDefined('kis-priority-view'),
   whenDefined('kis-settings')])` + `_hass` available + double-RAF.
   Then adds `kis-ready` class → 250ms fade-in. 2000ms failsafe forces
   reveal with console.warn.

3. **Navigation re-arm** (`resetRevealGate`): on `location-changed` /
   `popstate`, synchronously removes `kis-ready`, resets
   `_earlyHideInjected = false`, and restarts `earlyHideLoop`.

CSS injection IDs: `kisv2-hui-patch` (in huiRoot.shadowRoot, targets
`hui-sections-view` as descendant) and `kisv2-sections-patch` (in
sectionsView.shadowRoot, targets `:host`). Both carry opacity:0 rules
— belt and suspenders.

**Key timing insight:** `getComputedStyle` during a RAF callback sees
the pre-injection state, but the actual browser paint happens AFTER all
RAF callbacks complete. So if `earlyHideLoop`'s RAF and a monitoring
script's RAF both fire in the same frame, the monitoring script may
read `opacity: 1` but the paint uses the post-injection `opacity: 0`.
Under normal conditions (no throttle), zero FOUC — the CSS is injected
before the first paint of `hui-sections-view`.

## 2026-05-17 — CSS Grid 1fr eliminates flex box-sizing decoration floor inequality

With `flex: 1 1 0%` + `box-sizing: border-box`, items with padding+border
have a decoration floor (can't shrink below padding+border height), while
items with zero decoration have no floor. This causes unequal distribution
when the container has limited height.

**Fix:** CSS Grid `grid-template-rows: 1fr 1fr 1fr` gives each track an
equal fraction of available space regardless of item decoration. The item's
padding+border come out of its own 1fr allocation. Applied to
`kis-control-panel.js` desktop media query for lock rows + garage pair.

## 2026-05-17 — mobilev2 lovelace_resources cache-bust path

mobilev2 card resources (kis-app-shell.js, kis-control-panel.js, etc.)
are registered in `.storage/lovelace_resources`, NOT in
`configuration.yaml`'s `extra_module_url`. To bump cache-bust:
```bash
ssh ... "sudo sed -i 's|kis-app-shell.js?v=25|kis-app-shell.js?v=26|' \
  /home/cooper5389/homeassistant/config/.storage/lovelace_resources"
```
Then `sudo docker restart homeassistant`. The `lovelace_resources` file
is a JSON file with no `.json` extension, same as other HA storage files.

## 2026-05-17 — Kiosk mode: default-hide on boot, opt-out via entity subscription

Kiosk mode uses two CSS injection IDs — `kisv2-hui-patch` (layout, permanent)
vs `kisv2-kiosk-patch` (chrome-hide, toggled). Inline-style restoration uses
capture-then-restore via `_kioskOriginals`, not hardcoded defaults.
`patchHALayout` re-arms kiosk state on every nav so fresh ha-drawer/ha-sidebar
elements stay correct.

Pattern:
1. `patchHALayout` captures originals (drawer width, type, sidebar display)
   BEFORE the boot-time hide runs. Originals are captured only once.
2. Boot-time hide (when `_hass` is null): unconditionally hides chrome to
   prevent sidebar flash on initial load.
3. `syncKioskMode(hass)`: called from `onHassUpdate` on entity change AND
   at end of `patchHALayout` when `_hass` is available. Reads
   `input_boolean.kiosk_mode` — if ON, applies hide + injects
   `kisv2-kiosk-patch`; if OFF, restores from `_kioskOriginals` + removes
   `kisv2-kiosk-patch`.
4. `_prevKiosk` tracks last-synced state to avoid redundant DOM writes on
   every hass update (~1/sec).

Shadow DOM targets for hide/restore:
- `ha-drawer`: `--mdc-drawer-width` (0px / original), `type` attr (modal / original)
- `ha-sidebar`: `style.display` (none / original)
- `hui-root` shadowRoot: `kisv2-kiosk-patch` style element with `app-header { display: none !important; }`

## 2026-05-17 — MutationObserver on #view required for nav reveal

`location-changed` fires BEFORE HA swaps view children. The
`resetRevealGate()` → `patchHALayout()` call that existed prior to
this fix patched the OLD `hui-sections-view` (about to be destroyed).
HA then creates a new `hui-sections-view` inside a fresh `HUI-VIEW`
element, which inherits `opacity:0` from the parent `kisv2-hui-patch`
but has no `kisv2-sections-patch` and no `kis-ready` class.

Fix: install a `MutationObserver` on `#view` (`childList: true`) that
detects when HA swaps `HUI-VIEW` children. The observer callback
RAF-polls for the new `hui-sections-view` to have a `shadowRoot`,
then calls `patchHALayout(0)` which injects CSS and arms the reveal
gate on the correct element.

Four guards:
1. **Prior observer disconnect** — `_pendingViewObserver.disconnect()`
   at the top of `resetRevealGate()` prevents stacked observers on
   rapid nav.
2. **Defensive `#view` lookup** — observer only installs if `viewEl`
   exists; falls through to failsafe otherwise.
3. **500ms failsafe** — if the observer never fires (same-view nav
   where HA doesn't swap children), the failsafe calls
   `patchHALayout(0)` directly.
4. **RAF-poll for shadowRoot** — HA adds `HUI-VIEW` to `#view` but
   `hui-sections-view` inside it may not have a `shadowRoot` yet on
   the same frame. The `waitForSectionsView` loop polls until ready.
