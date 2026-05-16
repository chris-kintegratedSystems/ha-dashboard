# KIS Design Language v2

Extracted from `dashboard_mobilev1.json` and `kis-nav.js` (v52) on 2026-05-09.
Single source of truth for all visual decisions in the mobilev2 dashboard.

---

## 1. Typography

### Font Stack
```
-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Roboto, Arial, sans-serif
```
Used universally across kis-nav.js header, nav bar, mini-player, and all button-card labels.

### Type Scale

| Token | Size | Weight | Spacing | Transform | Usage |
|-------|------|--------|---------|-----------|-------|
| `temp-hero` | 52px | 300 | -0.04em | none | Climate current temperature |
| `temp-large` | 48px | 300 | -0.02em | none | Weather temperature (Home swipe) |
| `clock` | 22px | 700 | -0.02em | none | Header clock |
| `card-name` | 15px | 600 | 0.03em | none | Card titles, scene names, lock names |
| `card-value` | 14px | 700 | none | none | Weather temp (header), media track |
| `settings-title` | 13px | 600 | none | none | Settings row labels, about labels |
| `card-label` | 11px | 400-600 | 0.08em | uppercase | Sublabels, descriptions, chip labels |
| `header-ampm` | 11px | 600 | none | none | AM/PM indicator |
| `section-label` | 10px | 700 | 0.18em | uppercase | Section headers (SCENES, SECURITY, etc.) |
| `header-person` | 10px | 600 | none | none | Person pill names |
| `header-date` | 9px | 500 | 0.12em | uppercase | Date line in header |
| `nav-label` | 9px | 600 | 0.08em | uppercase | Bottom nav tab labels |
| `chip-text` | 9px | 700 | 0.12em | uppercase | State chips (LOCKED, COOL, etc.) |
| `badge-text` | 10px | 700 | none | none | Notification badge count |
| `cam-label` | 9px | 600 | 0.15em | uppercase | Camera placeholder label |

### Numeric Treatment
- `font-variant-numeric: tabular-nums` on all numeric displays (clock, temperatures, progress percentages)
- Line-height: `1` on hero temperatures for tight vertical fit

---

## 2. Spacing System

### Card Internals
| Token | Value | Usage |
|-------|-------|-------|
| `card-pad` | 18px 16px | Standard card (scenes, locks, cars, weather) |
| `card-pad-compact` | 14px 16px | Settings rows |
| `card-pad-climate` | 12px 14px | Climate thermostat cards |
| `card-pad-theme-btn` | 12px 8px | Theme selector buttons (Auto/Day/Night) |

### Gaps
| Token | Value | Usage |
|-------|-------|-------|
| `gap-scene` | 10px | Between scene buttons (horizontal-stack) |
| `gap-header` | 8px | Between header left/right sections |
| `gap-header-left` | 12px | Between clock and weather in header |
| `gap-pills` | 6px | Between person pills |
| `gap-pill-inner` | 4px | Between dot and name inside person pill |
| `gap-mini-player` | 10px | Between mini-player elements |
| `gap-nav-btn` | 4px | Between icon and label in nav button |
| `gap-alarm-inner` | 5px | Between alarm dot and text |

### Fixed Dimensions
| Token | Value | Usage |
|-------|-------|-------|
| `nav-height` | 80px | Bottom nav bar (includes safe area buffer) |
| `nav-min-height` | 68px | Nav bar minimum without safe area |
| `header-min-height` | 68px | Top header bar minimum |
| `mini-player-height` | 52px | Mini-player bar |
| `mini-player-bottom` | 80px | Positioned above nav bar |
| `icon-size-nav` | 22px | Nav bar icon size (--mdc-icon-size) |
| `icon-size-theme` | 20px | Theme button icon size |
| `icon-size-scene` | 26px | Scene button icon size |
| `icon-size-lock` | 26px | Lock/garage button icon size |
| `icon-size-car` | 56px | Car card icon size |
| `climate-btn` | 40px x 40px | +/- temperature adjustment buttons |
| `media-art` | 52px x 52px | Media album art thumbnail |
| `mini-player-art` | 36px x 36px | Mini-player album art |
| `person-dot` | 7px | Person presence indicator dot |
| `alarm-dot` | 5px | Alarm status pulsing dot |
| `badge-size` | 16px (min-width + height) | Notification badge |

### Border Radii
| Token | Value | Usage |
|-------|-------|-------|
| `radius-card` | 14px | All primary cards, climate, media, settings |
| `radius-btn` | 12px | Scene/lock/garage buttons, nav buttons, theme buttons |
| `radius-chip` | 20px | Status chips (LOCKED, COOL, etc.) and mushroom chips |
| `radius-pill` | 14px | Person pills in header |
| `radius-alarm` | 16px | Alarm status pill |
| `radius-art` | 10px | Album art rounded corners |
| `radius-climate-btn` | 8px | +/- temperature buttons |
| `radius-mini-art` | 6px | Mini-player album art |

### Progress Bars
- Height: 3px (climate, media) or 2px (mini-player)
- Track: `#1c2438` (night), `#c0c8d4` (day)
- Border-radius: 3px (track) or 1px (fill)

---

## 3. Color System

### Night Mode (Default — Dark)

#### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| `bg-app` | `#070910` | Lovelace background (--lovelace-background) |
| `bg-card` | `rgba(16,21,31,0.72)` | Card surfaces (--ha-card-background) |
| `bg-card-solid` | `#10151f` | Solid card background (--card-background-color) |
| `bg-empty` | `#0b0e17` | Empty/unavailable state background |
| `bg-nav` | `rgba(7,9,16,0.95)` | Nav bar with blur backdrop |
| `bg-header` | `rgba(7,9,16,0.92)` | Header bar with blur backdrop |
| `bg-mini-player` | `rgba(11,14,23,0.95)` | Mini-player with blur backdrop |
| `bg-progress-track` | `#1c2438` | Progress bar track |
| `bg-cam-placeholder` | `#151c2a` | Camera placeholder overlay |

#### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `border-card` | `rgba(255,255,255,0.06)` | Card borders, dividers, nav border |
| `border-card-weak` | `rgba(255,255,255,0.04)` | Muted state cards |
| `border-focus` | `rgba(0,212,240,0.22)` | Swipe hint, accent borders |

#### Text
| Token | Value | Usage |
|-------|-------|-------|
| `text-primary` | `#eef2f8` | Primary text, card names, person names |
| `text-secondary` | `#8a9ab8` | Secondary text, sublabels, artist names |
| `text-disabled` | `#4a5570` | Disabled text, inactive nav, date line |
| `text-muted` | `#2a3448` | Very muted (empty state icons, dividers) |

#### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `accent` | `#00d4f0` | Primary accent — active nav, play button, progress fill |
| `accent-active-bg` | `rgba(0,212,240,0.08)` | Active nav button background |
| `green` | `#10d090` | Locked state, home presence, secure status |
| `green-glow` | `0 0 4px #10d090` | Home presence dot glow |
| `blue` | `#4d8ef0` | Climate cool, media accent, border-left indicators, away presence |
| `orange` | `#f5a623` | Heat mode, advisory badge, lights bar fill |
| `red` | `#f04060` | Unlocked state, urgent badge, garage open, alert |
| `red-alert` | `#e81c24` | Tesla red accent |
| `cyan-bright` | `#00d4f0` | Mercedes icon, swipe hint |
| `purple` | `#9d6ef0` | Clear-night weather icon |

#### State Chips (inline border + bg + text)
| State | Border | Background | Text |
|-------|--------|------------|------|
| Cool | `rgba(77,142,240,0.35)` | `rgba(77,142,240,0.08)` | `#4d8ef0` |
| Heat | `rgba(245,166,35,0.35)` | `rgba(245,166,35,0.08)` | `#f5a623` |
| Auto | `rgba(16,208,144,0.35)` | `rgba(16,208,144,0.08)` | `#10d090` |
| Off | `rgba(74,85,112,0.20)` | `rgba(74,85,112,0.08)` | `#4a5570` |
| Fan | `rgba(0,212,240,0.35)` | `rgba(0,212,240,0.08)` | `#00d4f0` |
| Locked | `rgba(16,208,144,0.35)` | `rgba(16,208,144,0.08)` | `#10d090` |
| Unlocked | `rgba(240,64,96,0.35)` | `rgba(240,64,96,0.08)` | `#f04060` |

#### Gradients
| Token | Value | Usage |
|-------|-------|-------|
| `gradient-cool` | `linear-gradient(to right, #4d8ef0, #00d4f0)` | Cool mode progress |
| `gradient-heat` | `linear-gradient(to right, #f0a030, #f06040)` | Heat mode progress |

### Day Mode (Light)

#### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| `bg-nav-day` | `rgba(255,255,255,0.96)` | Nav bar |
| `bg-header-day` | `rgba(255,255,255,0.96)` | Header bar |
| `bg-mini-player-day` | `rgba(255,255,255,0.96)` | Mini-player |
| `bg-mini-art-day` | `#e4e8f0` | Mini-player album art bg |
| `bg-person-pill-day` | `rgba(255,255,255,0.88)` | Person pills |
| `bg-progress-track-day` | `#c0c8d4` | Progress bar track |
| `bg-cam-placeholder-day` | `#f0f2f5` | Camera placeholder |

#### Borders (Day)
| Token | Value | Usage |
|-------|-------|-------|
| `border-nav-day` | `rgba(0,0,0,0.04)` | Nav/header border |
| `border-person-day` | `rgba(0,0,0,0.05)` | Person pill border |
| `shadow-nav-day` | `0 -1px 3px rgba(0,0,0,0.06), 0 -4px 12px rgba(0,0,0,0.03)` | Nav bar shadow |
| `shadow-header-day` | `0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03)` | Header bar shadow |

#### Text (Day)
| Token | Value | Usage |
|-------|-------|-------|
| `text-primary-day` | `#1a2030` | Primary text, clock, names |
| `text-secondary-day` | `#4a5a72` | AM/PM, artist |
| `text-tertiary-day` | `#7a8698` | Date, nav inactive, section labels |

#### Accent (Day)
| Token | Value | Usage |
|-------|-------|-------|
| `accent-day` | `#0088a8` | Active nav, play button, progress fill |
| `accent-active-bg-day` | `rgba(0,136,168,0.08)` | Active nav button bg |
| `green-day` | `#089464` | Home presence dot |
| `green-glow-day` | `0 0 4px #089464` | Home presence glow |
| `blue-day` | `#2d6bc4` | Away presence |
| `badge-urgent-day` | `#c02840` | Urgent badge |
| `badge-advisory-day` | `#c07808` | Advisory badge |

#### CSS Custom Properties (set by kis-nav.js on documentElement)
| Property | Night | Day |
|----------|-------|-----|
| `--kis-section-label` | `#4a5570` | `#7a8698` |
| `--kis-section-rule` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.06)` |
| `--kis-cam-placeholder-bg` | `#151c2a` | `#f0f2f5` |
| `--kis-cam-placeholder-text` | `#4a5570` | `#7a8698` |
| `--kis-cam-placeholder-border` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.06)` |
| `--kis-lights-room-bg` | `rgba(16,21,31,0.72)` | `rgba(255,255,255,0.85)` |
| `--kis-lights-room-border` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.08)` |
| `--kis-lights-room-name` | `#eef2f8` | `#1b2230` |
| `--kis-lights-room-count` | `#8a95a6` | `#6a7689` |
| `--kis-lights-row-rule` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.06)` |
| `--kis-lights-name` | `#cfd5e0` | `#2b3142` |
| `--kis-lights-bar-track` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.09)` |
| `--kis-lights-bar-fill` | `#f5a623` | `#f5a623` |
| `--kis-zone-h` | computed | computed |
| `--kis-card-h` | computed | computed |

---

## 4. Component Patterns

### Card Structure (button-card)
All interactive cards follow this pattern:
```json
{
  "type": "custom:button-card",
  "styles": {
    "card": [
      { "padding": "18px 16px" },
      { "border-radius": "14px" },
      { "background": "var(--ha-card-background, rgba(16,21,31,0.72))" },
      { "border": "1px solid rgba(255,255,255,0.06)" },
      { "box-shadow": "none" }
    ]
  }
}
```

### Scene Buttons
- Icon: 26px, centered
- Name: 11px, weight 700, uppercase, letter-spacing 0.12em
- Active state (triggered within 1 hour): colored border + glow (color matches scene identity)
- Tap action: `call-service` → `script.turn_on`
- Layout: `horizontal-stack` of 5 equal-width buttons

### Lock Cards
- Layout: name left, chip right (`flex, space-between`)
- Icon: `mdi:lock` / `mdi:lock-open`, 26px
- Chip: 9px bold uppercase, rounded pill (20px radius)
- Locked: green chip (#10d090 border/text, rgba bg), green icon
- Unlocked: red chip (#f04060 border/text, rgba bg), red icon
- Tap: `lock.lock` / `lock.unlock` (toggle)

### Garage Cards
- Side-by-side in `horizontal-stack`
- Same chip pattern as locks
- Closed: neutral, Open: alert coloring
- Entity: `cover.*` with `open`/`closed` states

### Climate Cards
- Full-width, border-left 3px solid `#4d8ef0`
- Room label: 10px uppercase header with mode chip
- Large temperature: 52px center
- +/- adjustment: 40px rounded square buttons
- Progress bar: 3px height showing setpoint position
- Min-height: 140px

### Camera Cards (picture-entity)
- Native `aspect_ratio: "16:9"` (NOT card_mod)
- `fit_mode: "fill"`, `show_state: false`, `show_name: false`
- Tap: Browser Mod fullscreen popup with picture-elements overlay
- Placeholder: `ha-card::before` overlay with label, `playing`-gated reveal

### Section Labels (template: section_label)
- 10px, weight 700, letter-spacing 0.18em, uppercase
- Color: `rgba(138,154,184,0.55)`
- No background, transparent card, no borders
- Bottom rule via border-bottom on ha-card

---

## 5. Responsive Behavior

### Breakpoints
| Breakpoint | Behavior |
|------------|----------|
| `< 1100px` (portrait) | Single column, sections stack vertically |
| `>= 1100px` (landscape) | Two columns, scenes span full width |

### Home View Layout (sections, max_columns: 2)
- **Section 0 (Scenes):** `column_span: 2` — full width in landscape
- **Section 1 (Security):** `column_span: 1` — left column in landscape
- **Section 2 (Priority Zone):** `column_span: 1` — right column in landscape

### Priority Zone Sizing
The 16:9 priority camera zone is the dimensional anchor:
```
--kis-zone-h = sectionWidth * 9/16
--kis-card-h = (--kis-zone-h - labelHeight - 4*gapHeight) / 4
```
Published on `documentElement` by `recomputeZoneHeight()` in kis-nav.js.

### Cameras View
- `type: panel` with single `grid` card (`columns: 2`, `square: false`)
- Each picture-entity gets native `aspect_ratio: "16:9"`
- NOT sections view (sections equalize column heights, not cell heights)

### Swipe Zone Cards
All cards in the priority swipe section use:
```css
:host {
  height: var(--kis-zone-h, 400px) !important;
  width: 100% !important;
  display: block !important;
}
```

### Nav Bar
- Fixed bottom, full width
- `padding-bottom: env(safe-area-inset-bottom)` for iPhone notch
- `min-height: 68px` without safe area

### Header Bar
- Fixed top, full width
- `padding-top: calc(env(safe-area-inset-top))` for status bar
- `min-height: 68px`

---

## 6. Interactive Patterns

### Tap Actions
| Component | Tap | Hold | Double-Tap |
|-----------|-----|------|------------|
| Scene button | `script.turn_on` | none | none |
| Lock card | `lock.lock` / `lock.unlock` | `more-info` | none |
| Garage card | `cover.open_cover` / `cover.close_cover` | `more-info` | none |
| Climate card | `climate.set_temperature` (+1) | `set_temperature` (-1) | `more-info` |
| Camera card | Browser Mod fullscreen popup | none | none |
| Media player | `media_play_pause` | `more-info` | none |
| Nav button | Navigate to page | none | none |
| Person pill | `more-info` (shows map) | none | none |
| Alarm pill | `more-info` (alarm panel) | none | none |
| Mini-player body | `more-info` (media player) | none | none |
| Mini-player play | `media_play_pause` | none | none |

### Camera Fullscreen Popup (Browser Mod)
- `size: "fullscreen"`, `dismissable: true`
- Content: `picture-elements` card forced to `100vw x 100vh`
- Close button: `position: fixed`, top-right, z-index 9999
- Control buttons: bottom-center, positioned with `calc(50% +/- offset)`
- Dismiss: tap outside, Escape key, or close X button

### State-Driven Styling
All state-based visual changes use button-card `state` array or JS template conditions in `label`. No card-mod (NOT INSTALLED on this instance).

### Glassmorphism
Nav bar, header, mini-player all use:
```css
-webkit-backdrop-filter: blur(20-24px) saturate(180-200%);
backdrop-filter: blur(20-24px) saturate(180-200%);
```

---

## 7. Day/Night Rules

### Trigger
- `input_select.theme_mode` with values: `Auto`, `Day`, `Night`
- Auto mode: follows `sun.sun` state (above_horizon = day)
- kis-nav.js reads both entities every 1-second tick

### Mechanism
- `data-kis-day` attribute toggled on `#kis-header-bar`, `#kis-nav-bar`, `#kis-mini-player`, `document.body`
- CSS custom properties set on `document.documentElement` for card-level theming
- HA theme variables (`--ha-card-background`, `--primary-text-color`, etc.) also switch

### What Changes (Day vs Night)
| Element | Night | Day |
|---------|-------|-----|
| App background | `#070910` | Light (HA theme) |
| Nav bar bg | `rgba(7,9,16,0.95)` + blur | `rgba(255,255,255,0.96)` + blur + shadow |
| Header bg | `rgba(7,9,16,0.92)` + blur | `rgba(255,255,255,0.96)` + blur + shadow |
| Primary text | `#eef2f8` | `#1a2030` |
| Active nav | `#00d4f0` on dark | `#0088a8` on light |
| Section labels | `#4a5570` | `#7a8698` |
| Camera placeholder | `#151c2a` | `#f0f2f5` |
| Presence dot (home) | `#10d090` | `#089464` |
| Badge borders | Dark glass | White glass |

### What Stays Consistent
- Accent colors in cards (green/red/blue/orange) — same hex in both modes
- Progress bar gradients — same in both modes
- Lights bar fill — `#f5a623` in both modes
- Camera stream rendering — identical
- Icon sizes — identical
- Border radii — identical
- Typography scale — identical

---

## 8. Weather Icon/Color Mapping

| Condition | Icon | Color |
|-----------|------|-------|
| sunny | `mdi:weather-sunny` | `#f5a623` |
| clear-night | `mdi:weather-night` | `#9d6ef0` |
| cloudy | `mdi:weather-cloudy` | `#8a9ab8` |
| partlycloudy | `mdi:weather-partly-cloudy` | `#4d8ef0` |
| rainy/pouring | `mdi:weather-pouring` | `#4d8ef0` |
| snowy | `mdi:weather-snowy` | `#eef2f8` |
| fog | `mdi:weather-fog` | `#8a9ab8` |
| windy | `mdi:weather-windy` | `#8a9ab8` |
| lightning | `mdi:weather-lightning` | `#f5a623` |
| lightning-rainy | `mdi:weather-lightning-rainy` | `#f5a623` |
| hail | `mdi:weather-hail` | (default `#8a9ab8`) |
