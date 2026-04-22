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
(`camera.living_room_camera`, `camera.izzy_camera`) with a generated
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
  if (!['doorbell','living_room','izzy'].includes(cam)) {
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
