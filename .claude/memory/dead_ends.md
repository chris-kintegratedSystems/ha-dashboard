# Dead Ends — Approaches That Failed

Append new entries at the bottom. Date-stamp every entry.
Include the FAILED approach AND what worked instead.

---

## 2026-04 (Phase 3): card-mod + Jinja for state-driven styling
**Tried:** card-mod with Jinja templates for conditional borders/glows/colors
on button-card state blocks (scene active-state).
**Failed:** Jinja doesn't render visibly inside button-card state blocks even
when condition is forced true. getComputedStyle shows no applied styles.
**Fix:** button-card native JS template syntax `[[[ ]]]` in `styles.card`.
ALL state-driven visual feedback must use this pattern.

## 2026-04 (Phase 3): Bubble Card for state-driven styling
**Tried:** Bubble Card for dynamic color/icon changes.
**Failed:** Shadow DOM issues — card-mod CSS can't penetrate Bubble Card's
shadow root to style internal elements.
**Fix:** Use custom:button-card exclusively for state-driven UI.

## 2026-04 (Phase 3): Mushroom cards for state-driven styling
**Tried:** Mushroom cards with card-mod for conditional styling.
**Failed:** Same shadow DOM issue as Bubble Card — styles don't reach internals.
**Fix:** Use custom:button-card with native `[[[ ]]]` templates.

## 2026-04 (Phase 3): tile + card-mod for state-driven styling
**Tried:** HA native tile card with card-mod for dynamic visuals.
**Failed:** Shadow DOM blocks card-mod CSS from reaching tile internals.
**Fix:** Use custom:button-card. This is the ONLY card type confirmed working
for state-driven borders, glows, colors in this project.

## 2026-04 (Phase 3/PR #3): Conditional cards without section visibility
**Tried:** Section containing only conditional cards (motion cameras) without
a visibility condition on the section container itself.
**Failed:** Section reserved its grid slot even when all children were hidden,
creating a "ghost column" — empty gap in the layout.
**Fix:** Add section-level visibility block with OR logic across all child
conditions. If ANY child can be visible, section is visible.

## 2026-04-20: card_mod aspect-ratio on picture-entity
**Tried:** card_mod CSS `aspect-ratio: 16/9 !important` on picture-entity cards
inside a sections view for uniform camera card sizing.
**Failed:** DOM inspection confirmed card_mod's aspect-ratio rule never reaches
ha-card's computed style inside picture-entity. `getComputedStyle(haCard).aspectRatio`
reads `"auto"` regardless of what card_mod declares.
**Fix:** Use the native `aspect_ratio: "16:9"` PROPERTY on picture-entity card
config. Goes through HA's internal styling path and does apply.

## 2026-04-20: sections view for uniform camera grid
**Tried:** `type: sections` with multiple picture-entity cards for the Cameras page.
Expected HA to equalize card heights across columns.
**Failed:** Sections sizes children independently and runs its own height-equalization
per column, not per cell. A 2+3 split produced unequal card sizes.
**Fix:** Switch to `type: panel` with a single native HA `grid` card (`columns: 2`,
`square: false`) wrapping all picture-entity cards with native `aspect_ratio: "16:9"`.

## 2026-04-20: Dashboard JSON deployed to /config/www/
**Tried:** SCP dashboard_mobilev1.json to `/config/www/mobile_v1/`.
**Failed:** HA silently ignored it. Dashboard didn't update. No error logged.
**Fix:** Target path must be `.storage/lovelace.dashboard_mobilev1` (no .json
extension), `chown root:root`, `chmod 644`, then `docker restart homeassistant`.

## 2026-04-20: kis-nav.js day/night via HA theme names
**Tried:** kis-nav.js checked `hass.themes.theme === 'kis-day'` and
`hass.themes.darkMode === false` for day mode detection.
**Failed:** kis-day and kis-night themes were never registered in HA.
**Fix:** Read `sun.sun` entity directly for auto mode. Add `input_select.theme_mode`
for manual override.

## 2026-04-21: bramkragten/swipe-card with conditional picture-entity children
**Tried:** bramkragten/swipe-card for the priority display zone carousel.
**Failed:** Reproducible setConfig crash on Fully Kiosk Browser refresh.
**Fix:** Use nutteloost/simple-swipe-card v2.8.2 instead.

## 2026-04-21: markdown card + card_mod for thin section headers
**Tried:** Render section labels (SCENES, SECURITY, GARAGE, etc) as `type: markdown`
cards with inline HTML + `card_mod` CSS stripping the `ha-card` background/padding.
**Failed:** card-mod is NOT installed on this HA instance — `/hacsfiles/card-mod`
is absent from `lovelace_resources`. Every `card_mod` block in the dashboard is
silently ignored. Headers rendered as full-fat white cards wasting ~40-50px each.
**Root-cause check:** `sudo cat /config/.storage/lovelace_resources` on the Pi
— card-mod was never added as a resource, even though the dashboard has 30+
`card_mod` usages. A lot of "half-working" styling across this codebase is
actually just being ignored.
**Fix:** Use `custom:button-card` (which IS installed) with a reusable template
`section_label` in `button_card_templates`. button-card's native `styles.card`
/ `styles.name` arrays apply without any external CSS framework — no card-mod
dependency. Template: show_name true, show_icon false, card { background:none,
border:none, box-shadow:none, padding:0, min-height:0 }, name { font-size 9px,
weight 600, letter-spacing 0.15em, uppercase, padding 4px 2px, border-bottom
hairline }. Day/night colors via CSS custom properties flipped by kis-nav.js
(see css_dom_patterns.md → CSS-variable bridge).
**Broader lesson:** before assuming card_mod styling will work, verify card-mod
is actually installed — the `card_mod` key is accepted silently by Lovelace's
schema whether card-mod is loaded or not.

## 2026-04-21: Camera placeholder via DOM-injected overlay inside picture-entity
**Tried:** kis-nav.js v29 created a `<div class="kis-cam-placeholder">` inside
each picture-entity's `ha-card` (via `shadowRoot.querySelector('ha-card').appendChild`)
at opacity 1, then faded to opacity 0 on `loadeddata` / `playing` / `load`.
**Failed:** Visible black→white→video flash on Tab S9 FKB refresh. The DOM
injection loses the race against picture-entity's first paint — the user sees
the raw `<video>` element (black, then first frame) BEFORE the overlay lands
on top. Polling the picture-entity tree at 180ms (burst) is not fast enough.
**Fix:** Replace the overlay DIV with a CSS pseudo-element (`ha-card::before`)
defined entirely in the shadow-root `<style>` block, and gate the live feed
(hui-image / video / img / ha-hls-player / ha-camera-stream) at `opacity: 0`.
The pseudo-element exists the moment our stylesheet lands — no DOM node to
insert, no race. JS only flips a `data-kis-feed-ready` attribute on the host;
a CSS rule fades feed in and placeholder out. Day/night palette travels via
documentElement CSS variables (--kis-cam-placeholder-bg / -text / -border) —
custom properties inherit through shadow DOM. Runs on `customElements.
whenDefined('hui-picture-entity-card').then(…)` plus a 60 ms burst fallback.

## 2026-04-21: simple-swipe-card .active-slide class for horizontal swipes
**Tried:** kis-nav.js v25 MutationObserver watching `class` attribute changes
across the simple-swipe-card subtree, expecting to detect which child slide
has the `.active-slide` class and push that index to
`input_number.priority_slide_index`.
**Failed:** The dynamic header never updated on swipe — observer never fired
because the class never flipped. Playwright DOM inspection in
`swipe-inspect.js` showed active-slide is NOT present on any slide in
horizontal mode. Reading the nutteloost/simple-swipe-card v2.8.2 source
confirmed the CSS rule is `.vertical .slide.active-slide { ... }` — the class
is applied unconditionally by the JS but only has visual meaning (and only
seems to be reliably toggled) in vertical mode. For horizontal mode it's
dead.
**Fix:** Read `cardEl.currentIndex` directly (the card exposes it as a
property) and observe the `.slider` element's inline `style` mutations inside
the shadow root — the transform matrix changes on every swipe. Back it up
with a `transitionend` listener on `.slider` and a 750 ms `setInterval` poll
that re-reads `currentIndex`. Full pattern documented in
`css_dom_patterns.md` under "simple-swipe-card — read currentIndex, watch
.slider transform".
**Broader lesson:** When a custom element ships a property for its public
state (here `currentIndex`), read it directly rather than inferring from
class names. Classes are a rendering detail; properties are the API.

## 2026-04-21: Host opacity:0 + shadow-root CSS hiding hui-image/video (v31/v32)
**Tried:** kis-nav v31/v32 shadow-root CSS that held the host at `opacity:0`
via a prototype patch on `hui-picture-entity-card.connectedCallback`, PLUS
CSS inside each picture-entity's shadow root forcing
`hui-image, hui-image > *, hui-image img, hui-image video, ha-hls-player,
ha-camera-stream, ha-camera-stream video { opacity: 0 !important }`
until a `.kis-feed-ready` class was added. Intent: zero flash from a raw
black `<video>` element painting before the stream arrives.
**Failed:** Empty light-gray cells on the real Tab S9 (Android WebView
146.0.7680.x) even 4+ minutes after the `.kis-feed-ready` class had
been added by markFeedReady. Playwright on the dev laptop rendered fine
so the break only showed up on the actual hardware. Root cause
unconfirmed but consistent with WebView starving the decoder when the
entire video element tree is held at `opacity: 0` during stream
initialization — it never paints pixels even after the class lifts the
opacity gate. Also obscured a real Nest `RESOURCE_EXHAUSTED (429)`
error that was happening in parallel (our rapid test iteration burned
the 5 QPM ExecuteDeviceCommand quota), making the regression look
purely CSS-driven when it was both.
**Fix:** v33 switched to overlay-only — shadow-root CSS paints ONLY a
`ha-card::before` pseudo-element over the top of the native feed (solid
bg + pulse label); hui-image / video / ha-hls-player / ha-camera-stream
rendering is left completely untouched. Feed paints pixels normally;
when `.kis-feed-ready` adds, `::before { opacity: 0 }` fades the overlay
off revealing the live stream beneath. Host stays at opacity:1 the whole
time. Also removed `position: relative !important` + width/height:100%
overrides on ha-card / hui-image that were redundant with HA's native
layout and may have contributed to the break.
**Broader lesson:** Intrusive CSS that forces opacity:0 on MEDIA
elements (video, hls-player, camera-stream) is dangerous on embedded
WebViews. Overlay on TOP of native rendering is always safer than
gating native rendering off. Also: when a regression appears only on
real hardware and not in Playwright, suspect WebView-specific behavior
before blaming your JS.

## 2026-04-21: loadeddata fires too early for the reveal gate (v33 → v34)
**Tried:** v33 `watchFeedReady` revealed the camera feed on any of
`loadeddata` / `playing` / `canplay` firing, plus an initial
`readyState >= 2` check. The overlay faded out via a 300ms CSS transition
the moment ANY of those signals fired.
**Failed:** On Android WebView 146 (Tab S9 FKB), the Nest SDM WebRTC
pipeline fires `loadeddata` as soon as ONE frame is buffered — which on
low-light outdoor cams or during encoder warmup is usually a black
I-frame. The 300ms overlay fade-out then cross-dissolved the (day-mode
near-white) placeholder into an empty / black-I-frame `<video>` element.
User saw "black → white → video" on every camera mount. Playwright
Chromium doesn't reproduce it (UA-default `<video>` background is
transparent there, not black) so the sweep looked clean.
**Fix (v34):** Reveal only on `playing` for `<video>` (drop `loadeddata`
+ `canplay`); keep `load` on `<img>`. Initial / polled readyState check
raised from `>= 2` (HAVE_CURRENT_DATA) to `>= 3 && !paused`
(HAVE_FUTURE_DATA, actually playing). PLUS paint the `<video>`
element's OWN `background-color` to match the placeholder via the same
shadow-root stylesheet — neutralizes Android WebView's UA-default black
on empty `<video>` for any residual window where the overlay is fading
and the video has no frame. Safe because `background-color` is not
`opacity` — doesn't starve the decoder (the v31/v32 killer). 3s safety
timer + 5s interval cap preserved as the backstop.
**Broader lesson:** when gating a reveal animation on a media element,
`loadeddata` = "one buffered frame" is not "visible frames". Use
`playing` (or `timeupdate` + `!paused` + `readyState >= 3`). And on
embedded WebViews, the UA-default `<video>` background CAN leak
through any transparent overlay layer — set the video's own
`background-color` as a belt to the overlay's suspenders.

## 2026-04-21: Rapid test iteration exhausts Nest SDM rate limit — looks like code regression
**Tried:** Iterating on kis-nav placeholder CSS with tight loops of
`scp kis-nav.js → docker restart homeassistant → FKB hard refresh →
navigate to cameras → screenshot` in under a minute each cycle.
**Failed:** After ~3 cycles, the cameras page showed
`Failed to start WebRTC stream: Nest API error: Too Many Requests
response from API (429): RESOURCE_EXHAUSTED (429): Rate limited for
the ExecuteDeviceCommand API for the user.` This looks identical to a
code regression (empty cells) but is actually Google's 5 QPM quota
refusing to start new WebRTC sessions.
**Fix:** When iterating on camera-related code, wait ≥60s between
test cycles. If 429 appears, navigate Tab S9 AWAY from cameras (home
page) for 90s to let active streams tear down and quota refill.
Verifying the error banner text before chasing CSS/JS is critical —
don't rewrite working code because the cameras "look broken".
**Broader lesson:** Before blaming your own recent changes, read the
actual in-UI error banner. HA surfaces upstream errors inline (Nest
429, Vivint auth, etc) right on the card, and those look very similar
to "my CSS broke it" at a glance.

## 2026-04-21: button-card `styles.card: height: 100%` alone to fill swipe-card slide
**Tried:** Added `{ height: '100%' }`, `{ 'min-height': '100%' }`, `{ width: '100%' }`
to `styles.card` on each button-card in the priority-zone swipe-card,
expecting the tile to fill simple-swipe-card's 568px `.slide` height
(established via `grid_options: { rows: 9 }`).
**Failed:** Tile still rendered at ~153px content height. Playwright
probe showed `tileHostH: 568px` (swipe-card cascade reaches the host
correctly) but `tileInnerHaCardH: 153px` (ha-card inside button-card's
shadow root did not stretch).
**Root cause:** button-card's shadow DOM is `:host > #aspect-ratio >
ha-card`. `styles.card` IS applied to ha-card directly, but when
`aspect_ratio:` config is unset the parent `#aspect-ratio` div is
`display: inline` with no height. `height: 100%` on ha-card resolves
against a zero-height parent and collapses.
**Fix:** Add `extra_styles` to the button-card (top-level key, not
inside `styles`) with the full `:host → #aspect-ratio → ha-card`
chain all set to `height: 100%; display: block`. Full pattern in
`css_dom_patterns.md` → "button-card fill parent height — extra_styles
:host chain". No card-mod required; `extra_styles` emits a raw
`<style>` into the shadow root.
**Broader lesson:** When a custom element doesn't fill its parent,
check its shadow-DOM structure before assuming the config property
"just wraps in height:100%" — intermediate divs often break the
cascade. button-card specifically has an `#aspect-ratio` div that
becomes a zero-height wrapper unless `aspect_ratio:` is set; use
`extra_styles` to force every ancestor in the chain explicitly.

## 2026-04-21: button-card extra_styles :host without !important
**Tried:** Using `extra_styles: ":host { width: 100%; display: block }"`
alone to make a button-card fill a simple-swipe-card slide.
**Failed:** button-card's own `adoptedStyleSheets` set `:host {
display: flex; max-width: fit-content; flex: 0 0 auto }` at equal
specificity, and those WIN unless you use `!important`. Probe showed
only one `<style>` element in the shadow root (the extra_styles one)
yet computed styles still reflected button-card's sheet — the competing
rules come from adoptedStyleSheets, invisible to `querySelectorAll
('style')`.
**Fix:** Append `!important` to every `:host` property the override
needs to win: `width`, `min-width`, `max-width`, `flex`, `display`,
`height`. See `css_dom_patterns.md` → "button-card extra_styles needs
!important on :host".

## 2026-04-21: querying hui-grid-section from light DOM
**Tried:** `document.querySelector('hui-sections-view')
.querySelectorAll('hui-grid-section')` from kis-nav.js to find the
right column for the priority-zone ResizeObserver.
**Failed:** The `hui-grid-section` elements live inside a shadow root
of `hui-sections-view`. `querySelectorAll` doesn't cross shadow
boundaries. The observer attached to nothing and `--kis-zone-h` was
never published.
**Fix:** walk UP from a known-deep element (the `simple-swipe-card`,
findable via recursive shadow-root descent) using
`el.getRootNode().host` when crossing shadow boundaries. Pattern in
`css_dom_patterns.md`.

## 2026-04-21: ResizeObserver attach race on shadow-mount
**Tried:** caching `_zoneSwipeCard = findSwipeCardEl(rightSection)`
once in `installZoneHeightObserver()` during initial attach.
**Failed:** The swipe-card's shadow root was not yet mounted when the
observer attached, so `findSwipeCardEl` returned null. Subsequent
ResizeObserver fires updated the CSS custom property (`--kis-zone-h`)
but left `_zoneSwipeCard.style.height` empty because the cached
reference was permanently null. Result: tiles sized correctly but the
swipe-card container stayed at intrinsic ~100px tall.
**Fix:** re-find the swipe-card at the top of every
`recomputeZoneHeight()` call if `_zoneSwipeCard` is null or
disconnected. Cheap (a few shadow-root walks) and self-heals.

## 2026-04-21: Lights page expand/collapse via input_boolean that doesn't exist
**Tried:** `type: conditional` cards inside each Lights room whose
condition gates on `state: on` of `input_boolean.lights_<room>_expanded`.
The chevron button called `input_boolean.toggle` on the same entity. On
tablet, tapping the chevron appeared to do nothing and no per-light rows
ever rendered.
**Failed:** All four `input_boolean.lights_*_expanded` helpers were
in state `unavailable` — they had never been created in HA. The
conditional cards evaluated false permanently, so per-light rows never
mounted. `input_boolean.toggle` on an unavailable entity is a silent
no-op, producing zero user-visible feedback. HA also does not log a
warning for referencing an undeclared helper in Lovelace.
**Fix:** Spec change removed expand/collapse entirely (all rooms always
expanded). Deleted the conditional wrappers and the chevron buttons.
**Broader lesson:** Any Lovelace card that depends on an `input_*`
helper will silently fail if the helper is never declared in
`configuration.yaml` (or created via HA UI). Before building a flow
around a helper, check it exists via `curl /api/states/<entity>` —
"unavailable" is the giveaway. Listing every helper this dashboard
references in a pre-deploy probe prevents this class of bug.

## 2026-04-21: grid_options: full alone doesn't widen custom:button-card in sections view
**Tried:** `grid_options: { columns: 'full', rows: 'auto' }` on a
`custom:button-card` room wrapper inside a `type: sections` view to
make it fill the section's column.
**Failed:** card rendered at content-width (~280 px) with the rest of
the column empty, on both Tab S9 landscape and iPhone portrait. The
`grid_options` setting was present in the deployed JSON per
`.storage/lovelace.*` inspection but did not win over button-card's
own `:host` rules.
**Root cause:** button-card ships `adoptedStyleSheets` with `:host {
display: flex; max-width: fit-content; flex: 0 0 auto }` that win at
equal specificity against HA's sections-view grid placement rules.
Same class of bug as the priority-zone tile collapse (2026-04-21
entry above).
**Fix:** Add `extra_styles: ":host { width: 100% !important; max-width:
100% !important; min-width: 0 !important; display: block !important;
flex: 1 1 100% !important; box-sizing: border-box }"` to every
button-card that needs to fill its parent in a grid / sections /
flex container. `grid_options: { columns: 'full' }` is still required
— without it the section grid gives the card a narrower column slot.
Both pieces are needed: `grid_options` for the placement, `extra_styles`
with !important for the element width inside that slot.

## 2026-04-23: Scroll restore reading #view.scrollTop (v43)
**Tried:** Save/restore `#view.scrollTop` when `sensor.priority_camera`
transitions. Two attempts — v43 on `hotfix/scroll-restore-priority-reset`.
**Failed:** `#view.scrollTop` is always 0. `hui-sections-view` fits
exactly inside `#view`'s box (margin-top + height = `#view` height), so
`#view` never overflows. The real scroll container is `hui-sections-view`
itself — it has `overflow-y: auto` + constrained height set by
`applyDynamicHeaderClearance()`.
**Fix:** Read/write `hui-sections-view.scrollTop` instead, with
`scrollBehavior = 'auto'` forced before programmatic set (iOS WKWebView
silently blocks scrollTop= when smooth is active).
**Broader lesson:** When two nested elements both have `overflow-y: auto`,
the inner one with the constrained height is the actual scroll container.
Check which element's `scrollTop` is non-zero before writing save/restore
code.

## 2026-04-23: zoneIs2ColumnMode() gate blocking portrait 16:9 height
**Tried:** `zoneIs2ColumnMode()` gated the ResizeObserver callback in
`installZoneHeightObserver()` — intended to only apply 16:9 height in
tablet 2-column layout.
**Failed:** In portrait/single-column mode, the priority zone section
spans full viewport width, `sectionW < innerWidth * 0.75` returns false,
so `clearZoneVars()` ran and the carousel collapsed to content height.
**Fix:** Remove the `zoneIs2ColumnMode()` gate. The `W * 9/16` math in
`recomputeZoneHeight()` works at any column width — it should always run.
Keep the home-page guard (`clearZoneVars()` when not on Home) intact.

## 2026-04-23: styles.name position:absolute for card centering (PRs #23–#25)
**Tried:** Three approaches to center lock/garage card name + pin label to bottom:
1. PR #23: `position:absolute` in `styles.name`/`styles.label` arrays (inline style objects)
2. PR #24: Same positioning in `styles.name`/`styles.label` but with font properties moved to extra_styles `.name`/`.label` selectors
3. PR #25: All font + positioning in `extra_styles` shadow CSS with `!important`, `styles.name`/`styles.label` set to `[{display:block}]`
**Failed:** All three caused name and label text to overlap in the center of the card. button-card's grid engine manages `.name` and `.label` elements as grid children — `position:absolute` in inline styles (approach 1) is overridden by grid layout. Shadow CSS with `!important` (approaches 2–3) wins the specificity battle but the grid still assigns both elements to overlapping positions before absolute positioning kicks in, and the result is fragile across HA versions.
**Fix:** Reverted to `285b15e` (PR #23 state) which was the closest to working — name has inline `position:absolute` and grid is single-row `'i . badge'` so name/label float free. Overlap exists but is less severe than approaches 2–3. A proper fix likely requires a different card structure (e.g. `custom_fields` for the centered name) rather than fighting button-card's grid.
**Broader lesson:** button-card's `.name` and `.label` are grid children managed by the card's internal layout engine. Overriding their positioning with CSS (inline or shadow) is inherently fragile. For layout changes that go beyond the grid's built-in areas, use `custom_fields` (which render in their own grid area) or restructure the card template.

## 2026-04-23: button-card scene chip — card_mod `#icon { width/height }` direct
**Tried:** Making a dynamic-size scene chip by setting `width: var(--scene-chip-size); height: var(--scene-chip-size)` on `#icon` via `card_mod`, with `styles.icon.width/height` on the ha-icon.
**Failed:** `#icon` inside button-card's shadow has default `position:absolute; width:100%; height:100%` (from button-card's `styles.ts`). External width/height declarations on `#icon` compete with the 100% defaults and lose — `#icon` sizes to its content (the ha-icon) instead of the declared clamp values. Playwright measured `#icon` at ~icon-size (25×25) on Tab S9 landscape where the target was 48×48. Chip background painted at icon-size dimensions, so visually the chip was invisible — it looked identical to a bare icon.
**Fix:** Don't style `#icon` directly. See the 2nd and 3rd entries below.

## 2026-04-23: button-card scene chip — padding-based extension on `#icon`
**Tried:** `card_mod { #icon { padding: calc((var(--scene-chip-size) - var(--scene-icon-size)) / 2); border-radius: ...; } ha-icon { --mdc-icon-size: var(--scene-icon-size); width: var(...); height: var(...); } }`. Padding was meant to extend `#icon` out from the ha-icon child. Worked on the old hardcoded code when both `size:"28px"` set ha-icon dimensions AND `padding:10px` wrapped it.
**Failed:** Without the top-level `size` prop, ha-icon's element box doesn't respect the `width`/`height` set via external CSS — ha-icon sizes via `--mdc-icon-size` which propagates through `:host { width: 100% }` on the custom element. Result: chip computed `padding` correctly but was applied to an ha-icon that rendered much larger than `--scene-icon-size`, making the chip render at ~100px on Tab S9 landscape (target was 48). Compounding: bigger chip → bigger content-min → bigger card → worse layout.
**Fix:** Use button-card's exposed `styles.img_cell` API instead of card_mod on `#icon`. See next entry.

## 2026-04-23: button-card scene chip — final fix via `styles.img_cell`
**Works:** Button-card exposes `styles.img_cell` as the style hook for the grid cell that backs the icon (grid-area `"i"`). This element is block-level, NOT `position:absolute`, and honors explicit `width/height/background/border-radius`. Writing the chip dimensions through this native API avoids the card_mod specificity fight entirely.
```yaml
size: clamp(14px, calc(var(--kis-card-h) * 0.30), 28px)  # top-level — feeds ha-icon via button-card's internal size path
styles:
  img_cell:
    - background: rgba(<r>,<g>,<b>,0.22)
    - width: clamp(24px, calc(var(--kis-card-h) * 0.58), 48px)
    - height: clamp(24px, calc(var(--kis-card-h) * 0.58), 48px)
    - border-radius: clamp(6px, calc(var(--kis-card-h) * 0.14), 12px)
    - padding: 0
  icon:
    - color: "#hex or var(--kis-state-accent)"
```
**Why this wins:** `styles.img_cell` is button-card's intended hook for the chip container. No card_mod needed. No shadow-piercing. No `!important`. Pre-flight Playwright probe (modifying a deployed card's config in-memory via `setConfig()` and measuring `#img-cell.getBoundingClientRect()`) confirmed the clamped values resolve at the element exactly: 48/40/28 at `--kis-card-h` 83/69/48, 0px delta.
**Broader lesson:** Before fighting button-card's shadow DOM with card_mod + `!important`, check whether the thing you want to style has a dedicated `styles.*` hook. Button-card's style surface (`card`, `name`, `label`, `icon`, `img_cell`, `grid`, `state`, `custom_fields`) covers most layout needs natively and avoids the specificity war documented throughout this file.
