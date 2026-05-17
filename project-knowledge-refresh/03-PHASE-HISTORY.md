# 03 — Phase History

What each phase actually shipped, indexed by version and PR number.
For user-facing changelog, see `RELEASE_NOTES.md` in the repo.

---

## mobilev1 Phases

### Phase 1 — Product spec + mockups (2026-04-11 to 2026-04-13)
Shipped `PRD.md`, `DESIGN-SPEC-v16.md`, interactive v17 mockup.
Chris approved layout, typography, color system, and KIS brand
alignment. No code shipped.

### Phase 2 — Full 6-view dashboard (2026-04-13 to 2026-04-14)
**kis-nav v11 to v16.** Lovelace JSON for all 6 views (Home, Climate,
Lights, Cameras, Media, Settings). kis-nav.js injected outside HA
shadow tree with weather, presence, alarm, clock, now-playing strip,
active-route nav highlight. Kiosk mode on all devices.

### Phase 3 — Motion camera + scene tracking (2026-04-15)
**kis-nav v17 to v18.** Conditional motion camera on Home keyed off
legacy sticky sensors. Six scene wrapper scripts for active-state
feedback.

### Phase 4 — Home sections + Nanit + cameras (2026-04-16 to 2026-04-20)
**kis-nav v18 to v23. PRs #4, #5, #6.**
- Home view rewritten to `type: sections` with reserved camera zone
- Nanit integration — RTMP restream Docker container on Pi
- Camera fullscreen popups via `browser_mod.popup`
- Cameras page rewrite: `type: panel` + native `grid` card
- QA pipeline hardened to 8 device profiles x 6 views
- Deploy-path sanity: `.storage/lovelace.*` is canonical, `www/` is dead letter

**Critical pattern discovered:** card-mod is NOT installed on this HA.
All `card_mod:` blocks were being silently ignored.

### Phase 5A — Day/night + Lights v1 (2026-04-21 early)
**kis-nav v24 to v25.** Day/night palette flip driven by `sun.sun`.
CSS custom property bridge pattern on `document.documentElement` for
shadow DOM inheritance. Nest camera motion switched to trigger-based
template binary_sensors.

### Phase 5B — Priority display zone (2026-04-21 mid)
**kis-nav v26 to v34. PRs #9, #10, #11, #12.**
Carousel via `custom:simple-swipe-card`. Camera placeholder went through
4 iterations (v29 DOM race, v31-32 WebView decoder starvation, v33
overlay-only safe, v34 `playing`-gated reveal). Multi-cam Nest stagger.
Efficiency rules added from retrospective.

### Phase 5B-ext — Priority zone layout fill (2026-04-21 late)
**kis-nav v35. PR #13.** `button-card` `adoptedStyleSheets` override
via `extra_styles :host !important`. Auto-snap carousel + per-camera
60s swipe cooldown.

### Phase 5C — Lights redesign + motion priority (2026-04-21 to 2026-04-22)
**kis-nav v36 to v38.** Glass-morph room cards, amber-fill brightness
bars, day/night palette. Interior-camera freshness-based priority
arbitration. Branches pushed, awaiting PR.

### Post-Phase 5 maintenance (2026-04-22 to 2026-05-07)
- **PR #14-16:** Frigate camera entity references, dynamic camera labels, Nanit carousel
- **PR #17-20:** Camera labels fix, scroll restore, priority zone portrait height
- **PR #27-34:** Theme-aware lock/garage cards, Secure scene, sizing hooks, column alignment, agent install
- **PR #38:** Camera Follow Code — stateful priority camera lock with 60s hold
- **PR #39:** Gemelli lock entity ID fix
- **PR #41:** Camera Follow Code key mapping — physical-room keys, retire izzy/entity-stem keys
- **PR #43-45:** WebRTC investigation docs, session close, work queue updates
- **PR #46:** Kiosk mode toggle on Settings page
- **PR #48-51:** Weather radar carousel, radar cleanup, Reolink RLC-820A live view, radar bottom bar fix
- **PR #52-53:** Policing framework bootstrap

---

## mobilev2 Phases

### mobilev2 Phase 1 — Foundation (2026-05-16 to 2026-05-17)
**PRs #54, #55, #56.**

Full dashboard rebuild on custom-card architecture:
- `kis-app-shell.js` — persistent app shell with hass bridge, theme
  engine, FOUC prevention (RAF early-hide + readiness gate), kiosk
  toggle, shadow DOM patching at 4 injection points
- `kis-design-tokens.js` — shared sizing/color/responsive constants
- `kis-scenes.js` — 6-column scene grid
- `kis-control-panel.js` — door locks + garage doors with CSS Grid layout
- `kis-priority-view.js` — camera/vehicle carousel with motion override state machine
- `kis-settings.js` — theme mode, kiosk toggle, 10-key color picker
- `kis-dashboard-v2.yaml` — sections-view dashboard definition

Key technical patterns:
- `window.KIS_REGISTER_CARD()` / `KIS_UNREGISTER_CARD()` for hass forwarding
- 4 CSS injection IDs (`kisv2-hui-patch`, `kisv2-applayout-patch`,
  `kisv2-sections-patch`, `kisv2-gridsection-patch`)
- Two-layer FOUC prevention: RAF early-hide + `whenDefined` readiness gate
- Resources registered via `lovelace_resources`, not `extra_module_url`

### Issues 2, 3, 4 — Bug fixes (2026-05-17)

**Issue 2 — First-nav blank after reload (PR #57):**
`location-changed` fires BEFORE HA swaps view children.
`resetRevealGate()` patched the OLD `hui-sections-view`. Fix:
`MutationObserver` on `#view` detects child swap, RAF-polls for new
`hui-sections-view` shadow root, then re-patches.

**Issue 3 — Kiosk toggle bidirectional (PR #58, #59):**
Default-hide kiosk on boot (prevents sidebar flash). Opt-out via
`input_boolean.kiosk_mode` entity subscription. Inline-style
restoration via captured `_kioskOriginals`. Sidebar overlap fix when
kiosk OFF — inject padding matching chrome bar heights.

**Issue 4 — Alarm panel UX (PR #60, #62):**
HA's native `more-info-alarm_control_panel` has `_currentMode`
optimistic cache bug (Lit `willUpdate` reference equality issue).
Replaced with custom inline alarm panel reading `hass.states` fresh
on every render. Centered modal, state-branched content (disarmed =
mode buttons, armed = keypad directly), auto-close on arm, disarm
closes on entity transition.

### Issue 1 — Responsive breakpoint system (in progress)

**Stage 1 — Detection layer + token plumbing (PR #64, merged 2026-05-17):**
- `KIS_DENSITY` breakpoint taxonomy: 5 named breakpoints mapped to
  device classes (phone-portrait, phone-landscape, tablet-portrait,
  tablet-landscape, desktop)
- `kis-design-tokens.js` exports `DENSITY_TOKENS` with per-breakpoint
  sizing values
- Density tokens injected via `<style>` element (not inline styles on
  `:root` — HA's theme system strips unrecognized inline CSS custom
  properties)
- `KIS_BREAKPOINT` exposed on `window` for card consumption

**Stage 2 — Orientation-aware Home layout (PR #65, merged 2026-05-17):**
- `syncWrapperColumns()` in `kis-app-shell.js` — JS-based column
  override via `adoptedStyleSheets` on `hui-sections-view` shadow root
- `kis-control-panel.js` — `_onBreakpointChange` handler, `bp.columns`
  layout system, `--kis-row-h` density token consumption,
  `box-sizing: border-box` invariant
- `kis-scenes.js` — density-driven 3x2 grid on phones
- `MOBILEV2_INVENTORY.md` updated with Stage 2 version bumps

**Stage 3 — Settings tokens (next):**
Density-aware sizing in `kis-settings.js`.

**Stage 4 — Validation sweep:**
Cross-card consistency check on all 8 device profiles.

**Stage 5 — Real-device sign-off:**
Tab S9 + iPhone + iPad verification of all breakpoints.

---

## Critical Technical Patterns (cumulative)

These patterns were discovered through iteration and should be applied
in all future dashboard work:

1. **card-mod is NOT installed** — all `card_mod:` blocks are silently
   ignored. Use `custom:button-card` native styles.
2. **button-card `adoptedStyleSheets` override** — `extra_styles` `:host`
   rules need `!important` to win against button-card's own stylesheet.
3. **HA theme-strip behavior** — HA's theme init removes unrecognized
   inline CSS custom properties from `:root`. Use a named `<style>`
   element with `:root {}` rule instead of `setProperty()`.
4. **`adoptedStyleSheets` cascade tier** — injected styles via
   `adoptedStyleSheets` on shadow roots beat `<style>` elements at equal
   specificity. Used for column overrides in `kis-app-shell.js`.
5. **`MutationObserver` on `#view`** — required for nav reveal because
   `location-changed` fires before HA swaps view children. Observer
   detects child swap, then RAF-polls for new shadow root.
6. **`box-sizing: border-box` invariant** — CSS Grid `1fr` gives equal
   fractions of available space regardless of item decoration, but only
   if items use `border-box`. Applied to all density-token-driven heights.
7. **Deploy to `.storage/lovelace.*`** — never `www/` for dashboard JSONs.
   No `.json` extension. `root:root` 644.
8. **Camera placeholder overlay-only** — never gate media element opacity
   (starves Android WebView decoder). Use `ha-card::before` pseudo-element.
9. **Reveal gate on `playing` not `loadeddata`** — `loadeddata` fires on
   black I-frame; `playing` means actual frames rendering.
10. **iOS WKWebView scroll** — `overflow-anchor` not supported; use JS
    save/restore. Force `scrollBehavior = 'auto'` before setting `scrollTop`.
