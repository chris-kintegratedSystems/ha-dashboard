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
