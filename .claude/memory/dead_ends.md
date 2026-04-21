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
