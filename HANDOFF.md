# HANDOFF.md — ha-dashboard
# Last updated: 2026-05-19

## Last session summary
Bug D + Bug E fixes shipped as v55 of kis-app-shell.js.

**Bug E (initial chrome flash on cold load):** Eliminated by moving
kis-app-shell.js from Lovelace resources to frontend.extra_module_url.
Script now loads during HA frontend boot (~51ms), before HA chrome
paints (~493ms). earlyHideLoop catches drawer at DOM creation and
hides it before first paint. localStorage gate prevents hide-then-show
flicker for kiosk=off users. tryConnect guard hardened to wait for
hass.states + home-assistant-main shadow root before installing
property interceptor (prevents crash during early boot).

**Bug D (iPad background/foreground strips patches):** Fixed with
visibilitychange + pageshow event listeners that re-run patchHALayout
and syncKioskMode when app returns to foreground.

**Deploy mechanism change (IMPORTANT):** kis-app-shell.js now loads
via `frontend.extra_module_url` in ha-config configuration.yaml
(since v55). Cache-bust updates happen there, NOT in
`.storage/lovelace_resources`. The lovelace_resources entry was
removed from the Pi. Future sessions update the `?v=N` parameter in
configuration.yaml.

## Current state
- Branch: feat/initial-load-and-foreground-fixes
- Open PRs:
  - ha-config #43: feat(frontend): load kis-app-shell.js via extra_module_url
    https://github.com/chris-kintegratedSystems/ha-config/pull/43
  - ha-dashboard #75: feat(app-shell): v55 — initial-load flash + iPad foreground fixes
    https://github.com/chris-kintegratedSystems/ha-dashboard/pull/75
  - ha-dashboard #74: chore(qa): add .gitignore for scratch screenshots
    https://github.com/chris-kintegratedSystems/ha-dashboard/pull/74
  - ha-dashboard #68: Issue 1 Stage 5 (paused — do not touch)

## Next steps
- Merge PRs #43 (ha-config) and #75 + #74 (ha-dashboard)
- Level 1 theming: color HA's native boot splash (black/logo + white/loading)
  to match KIS theme — separate work, not in scope of Bug E
- Tab A9+ FKB splash screen config — separate work
- mobilev2 Phase 2 (Climate view) when ready

## Known issues
- HA native boot splash (black logo screen + white "Loading data" spinner)
  still visible on cold load — this is HA core rendering before any custom
  JS executes. Bug E fix eliminated the chrome flash that came AFTER these
  splash screens. Requires Level 1 theming or FKB splash config.
- PR #68 (Issue 1 Stage 5) is paused — do not touch
