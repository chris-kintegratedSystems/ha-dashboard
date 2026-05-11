# Fix Wave 3 — Research Findings
## 2026-05-11

### 1. Camera Display Inside Custom Cards

**Recommended pattern:** `document.createElement('hui-picture-entity-card')` + `setConfig()` + `.hass` assignment. HA's frontend lazy-loads the element on first createElement call. The element starts as HTMLElement; HA's `create-element-base.ts` internally uses `customElements.whenDefined()` to upgrade and fire `ll-rebuild`.

**Critical: Do NOT gate on `customElements.whenDefined('hui-picture-entity-card')` yourself.** This creates a circular dependency (confirmed dead end in this project, 2026-05-10). HA handles upgrade internally.

**Correct sequence:**
1. `const card = document.createElement('hui-picture-entity-card')`
2. `card.setConfig({ type: 'picture-entity', entity: 'camera.xxx', camera_view: 'auto', show_state: false, show_name: false })`
3. `card.hass = this._hass`
4. Append to DOM

**Config note:** `setConfig()` MUST be called BEFORE `.hass`. Reversing order causes render errors.

**Alternative:** Use `window.loadCardHelpers()` which returns `helpers.createCardElement(config)`. This wraps HA's internal element factory and handles lazy loading + error cards.

**Nest cameras:** `camera_view: 'auto'` preferred over `'live'` — live triggers new WebRTC/HLS stream request per mount, burning 5 QPM quota.

**Why current code fails:** The `whenDefined` gate prevents the element from ever upgrading. DOM probe confirms `hui-picture-entity-card` exists but has NO shadow root — setConfig was never called or element never upgraded.

Sources: HA frontend create-element-base.ts, custom-card-helpers npm, community.home-assistant.io/t/blank-or-black-nest-cam-cards/581051

### 2. Responsive Spacing

**HA sections view CSS variables (from hui-sections-view.ts source):**
- `--ha-view-sections-row-gap` (default 24px)
- `--ha-view-sections-column-gap` (default 32px)
- `--ha-view-sections-narrow-column-gap` (default 8px, used at ≤600px)
- `--ha-view-sections-column-max-width` (default 500px)
- `--ha-view-sections-extra-top-margin` (default 80px)

**Community approach:** Fixed px values in theme YAML. No confirmed examples of `clamp()` in HA theme variables. However, `clamp()` works in injected `<style>` elements (kis-app-shell pattern).

**Recommended approach for B/H:** Define as CSS custom properties injected via kis-app-shell.js using `clamp()` values. Set on `:host` of sections-view or via `document.documentElement.style.setProperty()`.

Formula: `--kis-spacing-b: clamp(10px, 1.5vw, 24px)`, `--kis-spacing-h: calc(var(--kis-spacing-b) / 2)`

### 3. CSS aspect-ratio in Sections Layout

**Key finding:** CSS Grid default `align-items: normal` resolves to `stretch` for regular elements but to `start` for elements with intrinsic aspect ratio. A `<div>` with CSS `aspect-ratio: 16/9` is treated differently — when stretch sets the block size, `aspect-ratio` may be ignored.

**Practical implication:** In HA sections, two side-by-side grid sections with `align-items: stretch` will try to equal height. If one child has `aspect-ratio: 16/9`, the browser may override the aspect ratio to accommodate stretch. The priority view needs to handle this by computing height from width explicitly or using `max-height` to enforce 16:9.

**Working pattern:** Use `aspect-ratio: 16/9` on the viewport container (inner element), NOT on `:host`. This way the grid section can stretch `:host` while the viewport maintains its aspect ratio.

### 4. Theme Variable Inheritance

**Canonical variable:** `--card-background-color` (NOT `--ha-card-background`). HA frontend source `color.globals.ts` defines `--card-background-color` with defaults `#ffffff` (light) / `#1c1c1c` (dark). `--ha-card-background` is NOT a core HA variable — it's a theme addition.

**CSS custom properties cascade into shadow DOM automatically.** No special wiring needed. HA re-sets root-level variables on theme change → all shadow roots inherit new values automatically.

**Correct pattern:** `var(--card-background-color, #fff)` for card backgrounds. BUT — checking the kis themes: both `kis_day.yaml` and `kis_dark.yaml` define `ha-card-background` as a custom theme variable. So in THIS project, `var(--ha-card-background)` DOES work because the themes explicitly set it. Both `--ha-card-background` and `--card-background-color` are available.

**Lock/garage cards currently use:** `var(--ha-card-background, ${KIS_TOKENS.night.bgCard})` — this works in both themes because the theme YAML defines `ha-card-background`.

### 5. Carousel Dots

**Standard pattern:** Overlay dots using `position: absolute` inside the carousel container. All major swipe cards (simple-swipe-card, css-swipe-card, swiper-card) use this pattern. None add extra height below for dots.

**Auto-fade:** `auto_hide_pagination: 3000` (3s timeout), `fade-duration: 300ms`. Dots appear on interaction, fade after inactivity.

**Recommended CSS:**
```css
.dots {
  position: absolute;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  transition: opacity 400ms ease;
  z-index: 5;
}
.dots.fade-out { opacity: 0; pointer-events: none; }
```

Source: simple-swipe-card GitHub, community.home-assistant.io/t/simple-swipe-card/888415
