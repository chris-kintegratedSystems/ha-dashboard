# 05 — Design System

mobilev2 design system reference. Sourced from
`MOBILEV2_ARCHITECTURE.md`, `kis-design-tokens.js`, and
`kis-app-shell.js`. Last refreshed: 2026-05-17.

---

## Design Tokens (`kis-design-tokens.js`)

Single source of truth for all visual constants. Exports `KIS_TOKENS`
and `KIS_SECTION_LABEL_CSS`.

### Token categories

| Category | Key | Examples |
|----------|-----|---------|
| Typography | `fontSize`, `fontWeight`, `letterSpacing` | `clock: '22px'`, `semibold: '600'`, `section: '0.18em'` |
| Spacing | `padding`, `gap` | `card: '18px 16px'`, `scene: '10px'` |
| Fixed sizes | `size` | `navHeight: '80px'`, `iconScene: '26px'` |
| Radii | `radius` | `card: '14px'`, `chip: '20px'` |
| Night colors | `night` | `bgApp: '#070910'`, `accent: '#00d4f0'` |
| Day colors | `day` | `bgNav: 'rgba(255,255,255,0.96)'`, `accent: '#0088a8'` |
| State chips | `stateChip` | `locked: { border, bg, text }` |
| Gradients | `gradient` | `cool: 'linear-gradient(...)'` |
| Blur | `blur` | `nav: 'blur(24px) saturate(200%)'` |
| Breakpoints | `breakpoints` | `singleColumn: '(max-width: 1099px)'` |
| Transitions | `transition` | `fast: '0.15s ease'`, `camFade: '100ms ease'` |

### `KIS_DENSITY` (Stage 1 addition)

5 named breakpoints with density taxonomy:

| Breakpoint | Media query | Density class |
|-----------|------------|---------------|
| phone-portrait | `max-width: 599px` | Compact |
| phone-landscape | `(min-width: 600px) and (max-width: 1099px) and (orientation: landscape)` | Compact-wide |
| tablet-portrait | `(min-width: 600px) and (max-width: 1099px) and (orientation: portrait)` | Comfortable |
| tablet-landscape | `(min-width: 1100px) and (max-width: 1599px)` | Spacious |
| desktop | `min-width: 1600px` | Spacious-wide |

`DENSITY_TOKENS` exports per-breakpoint sizing values consumed via
CSS custom properties (e.g., `--kis-row-h`, `--kis-scene-h`).

Tokens injected via `<style id="kis-density-vars">` element in `<head>`
with a `:root {}` rule. **NOT** inline `setProperty()` on
`document.documentElement` — HA's theme system strips unrecognized
inline CSS custom properties.

### Theme CSS variables (on `:root`)

Applied by the app shell based on mode + user overrides:
`--kis-accent`, `--kis-bg-app`, `--kis-text-primary`,
`--kis-text-secondary`, `--kis-green`, `--kis-orange`, `--kis-red`,
`--kis-blue`, `--kis-scene-active`, `--kis-section-label`

Cards read via `var(--kis-accent, fallback)`.

---

## Color System — Day/Night

Theme mode driven by `input_select.theme_mode` (Auto / Day / Night).
Auto resolves via `sun.sun` (`below_horizon` = night).

Day/night colors set by the app shell on `:root` via CSS custom
properties. All custom cards inherit through shadow DOM boundaries.

The bridge pattern: CSS custom properties on `document.documentElement`
inherit through every shadow-DOM boundary, so any card can pick up the
correct palette with `var(--kis-accent, fallback)`.

---

## Shadow DOM Injection Points (4 levels)

The app shell patches HA's shadow DOM at four injection points, each
with a stable ID for idempotent updates:

| ID | Target | Purpose |
|----|--------|---------|
| `kisv2-hui-patch` | `hui-root` shadowRoot | Hide `app-header`, set view height to `100vh`, control `.kis-ready` reveal transition, hide `hui-sections-view` pre-ready |
| `kisv2-applayout-patch` | `ha-app-layout` (if present) | Zero `--header-height` |
| `kisv2-sections-patch` | `hui-sections-view` shadowRoot | `margin-top`, gap overrides, `:host` visibility rules, container/grid layout |
| `kisv2-gridsection-patch` | Each `hui-grid-section` shadowRoot | Hide `.container .header`, force `column_span` via `grid-template-columns` |

### Shadow DOM traversal path
```
document.body
  > home-assistant.shadowRoot
    > home-assistant-main.shadowRoot
      > ha-panel-lovelace.shadowRoot
        > hui-root.shadowRoot          <- kisv2-hui-patch
          > #view
            > hui-sections-view.shadowRoot  <- kisv2-sections-patch
              > hui-grid-section(s)         <- kisv2-gridsection-patch
```

---

## Custom Cards

### kis-app-shell (`kis-app-shell.js`)
Persistent UI layer — not a card in the Lovelace sense. Loaded via
`lovelace_resources`. Owns: hass bridge, theme engine, header bar,
nav bar, mini-player, badge signals, shadow DOM patching, FOUC
prevention, kiosk toggle, alarm panel.

### kis-scenes (`custom-cards/kis-scenes.js`)
6-column CSS grid of scene buttons. Responsive: 3x2 on phones via
density-driven grid.

### kis-control-panel (`custom-cards/kis-control-panel.js`)
Door locks + garage doors. Desktop: CSS Grid with `grid-template-rows`.
Mobile: flex column, garage pair stacks at <430px. `bp.columns` layout
from Stage 2.

### kis-priority-view (`custom-cards/kis-priority-view.js`)
Camera/vehicle carousel with touch/swipe, velocity-based gesture
detection. Motion override state machine:
`default > motion > sticky (120s) > default`.

### kis-settings (`custom-cards/kis-settings.js`)
Theme mode selector, kiosk toggle, 10-key color picker, about section.

---

## Anti-Patterns (confirmed broken in this project)

| Don't | Why | Do Instead |
|-------|-----|-----------|
| Use `card_mod` for styling | card-mod is NOT installed (HACS resource missing). HA accepts `card_mod:` silently but ignores it. | Use button-card native styles or shadow DOM CSS in custom cards |
| Use Mushroom cards for state-driven visuals | Shadow DOM issues prevent reliable state-reactive styling | Use `custom:button-card` with `[[[ ]]]` JS templates |
| Use Bubble Card for state-driven visuals | Shadow DOM issues | Use `custom:button-card` |
| Use `tile` + `card_mod` | Shadow DOM issues, card-mod not installed | Use `custom:button-card` |
| Put dashboard JSON in `/config/www/` | HA reads storage-mode dashboards from `.storage/` only | Deploy to `.storage/lovelace.*` |
| Use `type: sections` + `card_mod` for camera grids | Sections equalizes column heights, not cell heights. `card_mod` `aspect-ratio` never reaches computed style. | `type: panel` + native `grid` card + `aspect_ratio` prop |
| Set `aspect-ratio` via card_mod on picture-entity | Never reaches `ha-card` computed style | Built-in `aspect_ratio: "16:9"` card property |
| Use `overflow-anchor` on iOS | Not supported in Safari/WKWebView | JS save/restore of `scrollTop` |
| Set `scrollTop` with `scroll-behavior: smooth` on iOS | WKWebView 15.4+ silently blocks programmatic scrollTop | Force `scrollBehavior = 'auto'` first |
| Gate media element `opacity: 0` for camera placeholders | Starves Android WebView decoder — cells stay empty | Overlay-only `ha-card::before` pseudo-element |
| Use `document.documentElement.style.setProperty()` for persistent CSS vars | HA's theme system strips unrecognized inline custom properties | Named `<style>` element with `:root {}` rule |
| Deploy kis-nav.js without bumping `?v=N` | FKB caches old file | Bump `window.KIS_NAV_VERSION` AND `?v=N` together |
| Load mobilev2 resources via `extra_module_url` | That's for kis-nav.js (mobilev1) | Register in `.storage/lovelace_resources` |
| Skip `docker restart homeassistant` after changes | HA caches everything in memory | Always restart |

---

## Component Patterns

### button-card native JS for state-driven feedback
`custom:button-card` with `[[[ ]]]` JS template syntax in
`styles.card` for any conditional styling (borders, glows, colors
based on entity state). This is the confirmed working approach for
state-reactive visuals in this project.

### Custom card lifecycle
```
constructor() -> attachShadow({mode:'open'}) -> connectedCallback() ->
  KIS_REGISTER_CARD(this) -> _render() -> set hass() -> _update()
disconnectedCallback() -> KIS_UNREGISTER_CARD(this)
```
Separate `_render()` (one-time DOM build) from `_update()` (reactive
state patch). Keep `_update()` fast — fires ~1/sec.

### FOUC prevention (two-layer)
1. **RAF early-hide loop**: polls for `huiRoot.shadowRoot` every frame,
   injects `opacity: 0` on `hui-sections-view` within 1 frame of shadow
   root existing
2. **Readiness gate**: waits for all custom elements defined + `_hass`
   available + double-RAF, then adds `kis-ready` class for 250ms
   fade-in. 2000ms failsafe.

---

## Acceptance Criteria — Home View (Issue 1)

Per the Issue 1 responsive breakpoint proposal:
- All 8 device profiles render without overflow or clipping
- Single-column layout on phones and portrait tablets
- Two-column layout on landscape tablets and desktop
- Density tokens size controls appropriately for each device class
- No FOUC on any device profile
- Day and night themes correct on all profiles
- Touch targets minimum 44x44px on all controls
