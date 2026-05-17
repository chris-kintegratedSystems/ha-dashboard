# mobilev2 Architecture Reference

How to build new pages on the KIS mobilev2 dashboard platform.

---

## 1. File Structure

```
ha-dashboard/
├── kis-app-shell.js          # Persistent UI layer (header, nav, mini-player, theme, hass bridge)
├── kis-design-tokens.js      # Shared sizing/spacing/color/responsive constants
├── custom-cards/
│   ├── kis-scenes.js         # Scene buttons (Home page, top section)
│   ├── kis-control-panel.js  # Door locks + garage doors (Home page, left column)
│   ├── kis-priority-view.js  # Camera/vehicle carousel (Home page, right column)
│   └── kis-settings.js       # Theme, kiosk, color picker (Settings page)
├── kis-dashboard-v2.yaml     # Lovelace dashboard definition (deployed to Pi as storage-mode JSON)
├── dashboard_mobilev1.json   # Legacy mobilev1 dashboard (still deployed, separate dashboard)
├── kis-nav.js                # Legacy mobilev1 fixed UI layer
└── qa-screenshot.js          # Playwright QA tool (8 device profiles × 6 views)
```

### Loading chain
1. HA loads `kis-app-shell.js` via `lovelace_resources` (`.storage/lovelace_resources` on the Pi)
2. App shell self-boots: connects to HA, injects UI, patches shadow DOM
3. HA loads each `custom-cards/kis-*.js` via the same `lovelace_resources` store
4. Each card calls `window.KIS_REGISTER_CARD(this)` → app shell forwards `hass` updates

---

## 2. Component Pattern (Custom Card Lifecycle)

Every mobilev2 custom card follows this structure:

```js
import { KIS_TOKENS, KIS_SECTION_LABEL_CSS } from '../kis-design-tokens.js';

class KisMyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
  }

  connectedCallback() {
    window.KIS_REGISTER_CARD(this);
    this._render();
  }

  disconnectedCallback() {
    window.KIS_UNREGISTER_CARD(this);
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  setConfig(config) {
    this._config = config;
  }

  _render() { /* Build shadow DOM once */ }
  _update() { /* Patch DOM with latest hass state */ }
}

customElements.define('kis-my-card', KisMyCard);
```

Key rules:
- Always `attachShadow({ mode: 'open' })` — the app shell never reaches inside, but Playwright probes need access.
- Register/unregister in `connectedCallback`/`disconnectedCallback` — never in constructor.
- Separate `_render()` (one-time DOM build) from `_update()` (reactive state patch). Keep `_update()` fast — it fires on every hass change (~1/sec).
- Import tokens from `kis-design-tokens.js` — never hardcode colors, spacing, or font sizes.

---

## 3. App Shell Responsibilities

`kis-app-shell.js` owns everything that persists across Lovelace page transitions:

| Responsibility | Implementation |
|---------------|----------------|
| **hass bridge** | `connectToHA()` — RAF-polls for `home-assistant` element, intercepts its `hass` property setter via `Object.defineProperty`, forwards to all registered cards |
| **Theme engine** | `resolveMode()` + `applyTheme()` — reads `input_select.theme_mode`, applies CSS vars to `:root`, exposes `window.KIS_THEME` API |
| **Header bar** | Clock, date, weather icon+temp, presence pills, alarm chip |
| **Nav bar** | Fixed bottom nav with page buttons (currently Home + Settings) |
| **Mini-player** | Media player state for `media_player.benjamins_hatch_media_player` |
| **Badge signals** | Security (unlocked doors/open garages) + HA update notifications on Settings nav icon |
| **Shadow DOM patching** | `patchHALayout()` injects CSS into HA's shadow roots to hide native chrome and set layout constraints |
| **FOUC prevention** | `earlyHideLoop()` + `armRevealGate()` — two-layer system that hides HA content until all cards are defined and hass is available |
| **Navigation re-arm** | `resetRevealGate()` on `location-changed`/`popstate` — re-hides and re-arms reveal for each page transition |

### Exposed APIs

```js
window.KIS_REGISTER_CARD(cardElement)   // Cards call this to receive hass
window.KIS_UNREGISTER_CARD(cardElement) // Cleanup on disconnect
window.KIS_THEME.getMode()             // Returns 'day' | 'night'
window.KIS_THEME.getFactory()          // Returns FACTORY defaults object
window.KIS_THEME.getColorMap()         // Returns COLOR_MAP array
window.KIS_THEME.reapply()             // Force theme re-application
window.KIS_APP_SHELL_VERSION           // Current version string
```

---

## 4. CSS Injection Points

The app shell patches HA's shadow DOM at four levels. Each injection has a stable ID for idempotent updates:

| ID | Target Shadow Root | Purpose |
|----|-------------------|---------|
| `kisv2-hui-patch` | `ha-panel-lovelace → hui-root` shadowRoot | Hides `app-header`, sets view height to `100vh`, controls `.kis-ready` reveal transition |
| `kisv2-applayout-patch` | `hui-root → ha-app-layout` (if present) | Zeroes `--header-height` |
| `kisv2-sections-patch` | `hui-sections-view` shadowRoot | `margin-top`, `--column-gap`, `--row-gap`, `:host` visibility rules, container/grid layout for the sections wrapper |
| `kisv2-gridsection-patch` | Each `hui-grid-section` shadowRoot | Hides `.container .header`, forces `column_span` via `grid-template-columns` |

### Injection utility
```js
function injectShadowCSS(shadowRoot, id, css) {
  let el = shadowRoot.getElementById(id);
  if (!el) { el = document.createElement('style'); el.id = id; shadowRoot.appendChild(el); }
  if (el.textContent !== css) el.textContent = css;
}
```

### Shadow DOM traversal path
```
document.body
  → querySelector('home-assistant').shadowRoot
    → querySelector('home-assistant-main').shadowRoot
      → querySelector('ha-panel-lovelace').shadowRoot
        → querySelector('hui-root').shadowRoot        ← kisv2-hui-patch
          → querySelector('#view')
            → querySelector('hui-sections-view').shadowRoot  ← kisv2-sections-patch
              → querySelectorAll('hui-grid-section')  ← kisv2-gridsection-patch (each)
```

---

## 5. Layout Primitives

### Dashboard YAML structure
mobilev2 uses `type: sections` views with `max_columns: 2`. Each section is `type: grid` containing exactly one custom card.

```yaml
views:
  - title: Home
    path: home
    type: sections
    max_columns: 2
    sections:
      - type: grid
        column_span: 2          # Full-width top section
        cards: [{ type: custom:kis-scenes }]
      - type: grid
        column_span: 1          # Left column
        cards: [{ type: custom:kis-control-panel }]
      - type: grid
        column_span: 1          # Right column
        cards: [{ type: custom:kis-priority-view }]
```

### Grid section column span
HA's `hui-grid-section` does not natively honor `column_span` in all cases. The app shell forces it via CSS injection into each `hui-grid-section` shadow root:
```css
:host { grid-column: span N; }  /* where N = section's column_span value */
```
This is applied by `patchGridSections()` which reads `column_span` from the dashboard config.

### Card sizing contract
Cards set their own height. The containing `hui-grid-section` does NOT enforce height — cards use:
- `kis-scenes`: intrinsic (6-column grid of buttons)
- `kis-control-panel`: `contain: size` + desktop `grid-template-rows: auto 1fr 1fr 1fr auto 1fr` / mobile flex column with `ResizeObserver` for min-height
- `kis-priority-view`: fills available height (carousel with aspect-ratio items)

---

## 6. Breakpoints

Two breakpoints control the entire responsive system:

| Token | Media Query | Meaning |
|-------|------------|---------|
| `singleColumn` | `max-width: 1099px` | Phone + portrait tablet — cards stack vertically, `max_columns` collapses to 1 |
| `twoColumn` | `min-width: 1100px` | Landscape tablet + desktop — Home shows side-by-side columns |

These live in `KIS_TOKENS.breakpoints` and are used by cards via `window.matchMedia()`.

### Tested device matrix
| Device | Viewport | Scale | Classification | Notes |
|--------|----------|-------|---------------|-------|
| Galaxy Tab A9+ landscape | 1280×799 | 1.5x | twoColumn | **Real wall kiosk** (SM-X210, FKB, Android 16, Chrome 147 WebView) |
| iPad 11" portrait | 834×1194 | 2x | singleColumn | |
| iPad 11" landscape | 1194×834 | 2x | twoColumn | |
| Generic tablet-landscape | 1440×900 | 2x | twoColumn | Spec representative — coverage for wider tablet-landscape devices, not the actual wall kiosk |
| iPhone 17 Pro Max portrait | 440×956 | 3x | singleColumn | |
| iPhone 17 Pro Max landscape | 956×440 | 3x | singleColumn | |
| iPhone 16 Pro portrait | 402×874 | 3x | singleColumn | |
| iPhone 16 Pro landscape | 874×402 | 3x | singleColumn | |

---

## 7. Page Authoring Checklist

To add a new page to mobilev2:

- [ ] Create `custom-cards/kis-<page-name>.js` following the component pattern (Section 2)
- [ ] Import from `kis-design-tokens.js` — never hardcode visual constants
- [ ] Register the card tag via `customElements.define('kis-<page-name>', ...)`
- [ ] Add the JS file to `lovelace_resources` on the Pi (with `?v=1` cache-bust)
- [ ] Add a nav entry to `PAGES` array in `kis-app-shell.js`
- [ ] Add a view entry in `kis-dashboard-v2.yaml` with `type: sections`
- [ ] Add the card's tag to the `armRevealGate()` `whenDefined` list in `kis-app-shell.js`
- [ ] Test on all 8 device profiles via `node qa-screenshot.js <view-slug>`
- [ ] Verify day AND night theme
- [ ] Deploy: bump `lovelace_resources` cache-bust, `docker restart homeassistant`

---

## 8. Design Tokens

`kis-design-tokens.js` exports `KIS_TOKENS` — the single source of truth for all visual constants.

### Categories

| Category | Key | Example values |
|----------|-----|----------------|
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

### Also exports
- `KIS_SECTION_LABEL_CSS` — a CSS string for the standard section label style (uppercase, spaced, secondary color)

### Theme CSS variables
The app shell applies these CSS custom properties on `:root` based on current mode + user overrides:
`--kis-accent`, `--kis-bg-app`, `--kis-text-primary`, `--kis-text-secondary`, `--kis-green`, `--kis-orange`, `--kis-red`, `--kis-blue`, `--kis-scene-active`, `--kis-section-label`

Cards can read these via `var(--kis-accent, fallback)` for live theming.

---

## 9. Anti-Patterns

Things that have been tried and do NOT work in this architecture:

| Don't | Why | Do instead |
|-------|-----|-----------|
| Use `card_mod` for styling | card-mod is not installed (HACS resource missing); HA accepts the key but silently ignores it | Use button-card native styles or shadow DOM CSS in custom cards |
| Put dashboard JSON in `/config/www/` | HA reads storage-mode dashboards from `.storage/` only — `www/` is for static assets | Deploy to `.storage/lovelace.dashboard_mobilev2` |
| Use `type: sections` + `card_mod` for camera grids | Sections equalizes column heights, not cell heights; card_mod `aspect-ratio` never reaches computed style | Use `type: panel` + native `grid` card + `aspect_ratio` prop |
| Set `aspect-ratio` via card_mod on picture-entity | The rule never reaches `ha-card`'s computed style inside picture-entity | Use the built-in `aspect_ratio: "16:9"` card property |
| Rely on `overflow-anchor` on iOS | Not supported in Safari/WKWebView | Use JS save/restore of `scrollTop` |
| Set `scrollTop` with `scroll-behavior: smooth` on iOS | WKWebView 15.4+ silently blocks programmatic scrollTop when smooth scroll is set | Force `scrollBehavior = 'auto'` before setting scrollTop |
| Deploy kis-nav.js without bumping `?v=N` in configuration.yaml | FKB caches the old file; new code never runs | Always bump both `window.KIS_NAV_VERSION` and `?v=N` together |
| Load mobilev2 resources via `extra_module_url` | That's for kis-nav.js (mobilev1); mobilev2 uses `lovelace_resources` | Register in `.storage/lovelace_resources` with `?v=N` |
| Use `flex: 1 1 0%` for equal distribution with varying decoration | Items with different padding/border get unequal sizes | Use CSS Grid `1fr` tracks |
| Skip `docker restart homeassistant` after JSON changes | HA caches Lovelace in memory | Always restart after any dashboard or resource change |
| Run camera QA more than once per minute without `--mock-cameras` | Burns Nest SDM 5 QPM quota → 429 errors that look like code bugs | Use `--mock-cameras` for layout iteration |
