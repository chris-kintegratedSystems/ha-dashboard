# Stage 3 — Mechanism Inspection: kis-settings.js Spacing

## Current Density Token Values (from kis-design-tokens.js)

| Token | Compact (phone) | Normal (tablet/desktop) |
|-------|-----------------|------------------------|
| `--kis-spacing-h` | 4px | clamp(8px, 1vw, 12px) |
| `--kis-spacing-b` | 8px | clamp(12px, 1.5vw, 24px) |
| `--kis-card-pad-v` | 8px | 14px |
| `--kis-card-pad-h` | 10px | 16px |

## Rendered Values (DevTools inspection at normal density, 834×1194)

| CSS Site | Selector | Current Value | Source | Recommended Action |
|----------|----------|---------------|--------|-------------------|
| Section gap | `.kis-settings { gap }` | 8px | Hardcoded | **Migrate** → `var(--kis-spacing-h, 8px)` |
| Section label margin | `.kis-section-label { margin-top }` | 8px (CSS) / 0px first-child | Hardcoded | **Migrate** → `var(--kis-spacing-h, 8px)` |
| Card padding | `.card { padding }` | 18px 16px | `T.padding.card` | **Migrate** → `var(--kis-card-pad-v, 18px) var(--kis-card-pad-h, 16px)` |
| Theme button row gap | `.theme-row { gap }` | 8px | Hardcoded | **Migrate** → `var(--kis-spacing-h, 8px)` |
| Color picker wrap gap | `.color-picker-wrap { gap }` | 8px | Hardcoded | **Migrate** → `var(--kis-spacing-h, 8px)` |
| Color row padding-h | `.color-row { padding }` | 10px 16px | Hardcoded | **Migrate h-only** → `10px var(--kis-card-pad-h, 16px)` |
| Contrast row padding-h | `.contrast-row { padding }` | 10px 16px | Hardcoded | **Migrate h-only** → `10px var(--kis-card-pad-h, 16px)` |
| Wrap padding-bottom | `.kis-settings { padding-bottom }` | 16px | Hardcoded | **Leave** — structural clearance for nav bar |
| Theme button padding | `.theme-btn { padding }` | 12px 8px | `T.padding.themeBtn` | **Leave** — button-specific, not card spacing |
| Theme button gap | `.theme-btn { gap }` | 4px | Hardcoded | **Leave** — icon-to-label gap, not density-responsive |
| Color button padding | `.color-btn { padding }` | 12px | Hardcoded | **Leave** — button-specific |
| About row padding | `.about-row { padding }` | 10px 0px | Hardcoded | **Leave** — card provides horizontal padding; 0 is intentional |
| Preview strip padding | Inline `14px 16px` | 14px 16px | Inline in `_updatePreview` | **Leave** — inline template, not CSS class |

## Migration Impact Summary

### What changes visually

On **normal density** (tablet/desktop):
- Card padding changes from `18px 16px` to `14px 16px` (4px tighter vertically). This is the density token value for normal — tighter than the legacy `T.padding.card` but matches the density spec.
- All gaps/margins remain effectively the same (8px → `clamp(8px, 1vw, 12px)` evaluates to ~8px at most viewport widths).

On **compact density** (phone):
- Card padding tightens from `18px 16px` to `8px 10px` — significant space saving.
- Gaps tighten from `8px` to `4px`.
- Section label margins tighten from `8px` to `4px`.
- Color/contrast row horizontal padding tightens from `16px` to `10px`.

### box-sizing: border-box (L2 check)

No elements in kis-settings.js consume density HEIGHT tokens (`--kis-row-h`, `--kis-scene-h`). All migrated tokens are padding/spacing, not height. **box-sizing: border-box is N/A** for this stage.

### No structural changes

Zero new sections, controls, or reordering. Token consumption only.

## Migration Count

- **7 sites migrate** (5 gap/margin, 1 full card padding, 1 partial padding)
- **6 sites left unchanged** (buttons, structural, inline templates)
