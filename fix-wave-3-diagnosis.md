# Fix Wave 3 — Diagnosis Results
## 2026-05-11

### Diagnosis 1 — Camera feed renders BLANK

**Root cause confirmed:** `hui-picture-entity-card` element is created via `document.createElement()` but never upgrades. DOM probe shows the element exists as a child of `.camera-slide` but has NO shadow root — `setConfig()` was never successfully called.

The current code (from fix wave 2) uses `customElements.whenDefined('hui-picture-entity-card')` as a fallback when `pe.setConfig` is undefined at creation time. Research confirms this is a dead end — HA only lazy-loads the element when referenced in YAML or triggered by HA's internal helpers.

**Camera entity state:** All 5 cameras report `state: recording`, `supported_features: 2`, valid `entity_picture` proxy URLs. No camera-side issues.

**Fix approach:** Use `window.loadCardHelpers()` to get HA's card element factory, then `helpers.createCardElement(config)` which properly handles lazy loading and element upgrade. Use `camera_view: 'auto'` instead of `'live'` to avoid Nest quota burn.

### Diagnosis 2 — Top empty band (60px gap)

**Root cause confirmed:** `#view` element inside `hui-root` shadow root has `padding-top: 56px`. This is HA's built-in compensation for its toolbar/app-header. Combined with the sections-view `margin-top: 68px`, total gap = 56 + 68 = 124px to the sections view top, then 4px container padding = 128px to first section.

The `getHuiRootCSS()` function hides `app-header` with `display: none` and sets `--header-height: 0px`, but `#view` still has its own `padding-top: 56px` from HA's layout system.

**Fix:** Add `padding-top: 0 !important` to the `#view` rule in `getHuiRootCSS()`. Then the sections-view `margin-top: 68px` alone provides the correct clearance below the custom header.

### Diagnosis 3 — Scene cards inconsistent heights

**Root cause confirmed:** Tab S9 data shows Section 0 (scenes left) height=137px, Section 1 (scenes right) height=108px. Even though `containerAlignItems: stretch` is set, the two grid sections have different heights.

The difference: Section 0 has `title: "SCENES"` which adds a `.section-label` div (font-size 9px, padding 4px 2px, margin 0 0 6px 0, plus 1px border-bottom ≈ ~22px). Section 1 has no title. Both sections' `:host` heights should equal via stretch, but the scene-btn cards inside section 0 end up shorter because the label takes vertical space.

Wait — actually the sections are different GRID SECTIONS at the HA level, and the container uses `align-items: stretch`. So both sections should have the same height. Section 0 = 137px, section 1 = 108px — the stretch ISN'T working correctly for these two.

Actually, checking the data more carefully: the container grid shows `grid-template-columns: 696px 696px 0px` — only 2 content columns. Sections 0 and 1 are in the same row. With stretch, they should have equal height. But section 0 = 137, section 1 = 108. This means stretch is NOT equalizing.

**Revised root cause:** The sections use `column_span: 1` and are in a 2-column grid. HA's grid container has `align-items: stretch` confirmed. But the grid ROWS don't force equal height across columns unless the ROW height is set. With `grid-auto-rows: auto`, each row's height is the MAX of its children. Both sections should be 137px (the taller one), but section 1 is only 108px.

This suggests the grid sections may not both be in the same row, or there's a different layout mechanism. The `top` values are identical (128) confirming they ARE in the same row. The `bottom` values differ (265 vs 236). With stretch, section 1 should also extend to 265. This means `align-items: stretch` IS set on the container but something prevents section 1 from stretching.

**Most likely:** The kis-scenes card in section 1 has a max-height or doesn't fill its container. The `:host` of section 1 may have height set by its content, and the kis-scenes card inside doesn't stretch to fill. Fix: ensure both scenes cards and their grid sections stretch to row height.

### Diagnosis 4 — Scene card dark backgrounds (wrong for day theme)

**Root cause confirmed:** Fix wave 2 changed scene btn backgrounds from `var(--ha-card-background, ...)` to hardcoded `${KIS_TOKENS.night.bgCardSolid}` = `#10151f`. This is always dark regardless of theme.

The screenshot confirms: scene buttons render with dark `#10151f` background even in day mode. Lock/garage cards correctly show theme-appropriate backgrounds because they use `var(--ha-card-background, ...)`.

**Fix:** Change scene button background back to `var(--ha-card-background, ${KIS_TOKENS.night.bgCardSolid})`. Research confirms CSS custom properties cascade into shadow DOM automatically, and both `kis_day.yaml` and `kis_dark.yaml` define `ha-card-background`.

### Diagnosis 5 — Priority view & security card alignment

**Data (Tab S9 1440x900):**
- Section 2 (security): top=279, bottom=783, height=504
- Section 3 (priority): top=279, bottom=721, height=442
- Top edges: ALIGNED (both 279) ✓
- Bottom edges: MISALIGNED by 62px (783 vs 721) ✗

Section 2 (security card) is 504px tall, section 3 (priority view) is 442px. The priority view viewport is 706×399, ratio = 1.769 ≈ 16:9. The priority view's height should be viewport(399) + label + dots = ~442px.

The security card stretches to fill the grid row height. But the grid row height is set by the TALLER child. Here, security card at 504px is taller than priority view at 442px. So the ROW is 504px, and priority view should stretch to 504px — but it doesn't because the priority view has aspect-ratio constraining its height.

**Fix:** Priority view should NOT use `height: 100%` on `:host` when aspect-ratio is set (this conflicts). Instead, the security card should MATCH the priority view's height. The priority view drives the height (16:9 anchor), not the other way around. Need to make the grid row height be determined by priority view, then security card stretches to match.

### Diagnosis 6 — Carousel dots positioning

**Current:** Dots div (`.dots`) is appended AFTER the `.carousel-viewport` in the shadow DOM. CSS: `display: flex; justify-content: center; gap: 6px; padding: 8px 0 4px;`. This renders dots BELOW the viewport, not overlaid.

**Fix:** Move dots inside the viewport div (or make viewport `position: relative` and dots `position: absolute; bottom: 10%`). Add auto-fade class toggle with 3s timeout.

### Diagnosis 7 — Spacing system absence

**Current gap sources (Tab S9):**
- Header to first content: 60px (from #view padding-top 56px + container 4px)
- Scenes row to security row: 14px (grid row-gap 12px + margin)
- Scene buttons horizontal gap: `${KIS_TOKENS.gap.scene}` = `10px`
- Lock cards vertical gap: `.kis-cp { gap: 8px }`
- Garage pair gap: `.garage-pair { gap: 8px }`
- Grid column gap: `--ha-view-sections-column-gap: 12px` (from sections patch)
- Grid row gap: `--ha-view-sections-row-gap: 12px` (from sections patch)

**All hardcoded, no responsive derivation.** Different values everywhere: 8px, 10px, 12px.

**Plan:** Introduce `--kis-spacing-b` and `--kis-spacing-h` as CSS custom properties. B = `clamp(10px, 1.5vw, 24px)`, H = B/2. Set on sections-view `:host`. Apply B for section gaps, H for intra-card gaps.
