# HANDOFF.md — ha-dashboard
# Last updated: 2026-05-23

## Last session summary
iOS resume bugs fixed and shipped as v66 of kis-app-shell.js.
mobilev2 is now in maintenance-only mode. v3 rebuild planned.

**Content invisible on resume (v60-v62 arc):** Phase 5's idempotent
early-exit prevented `armRevealGate()` from firing on resume because
`_patchesApplied` was still true and stylesheets survived suspension.
Fixed by clearing `_patchesApplied = false` at top of
`resetRevealGate()`.

**Header/nav not painted on iPad resume (v63-v66 arc):** Body-level
position:fixed elements survive in DOM but WKWebView compositor stops
painting them. Fixed by layering three repaint techniques in
`resumeUIChrome()`: translate3d GPU nudge + position:fixed reanchor +
synthetic scroll. Confirmed via pull-to-refresh diagnostic evidence.

**Architecture decision:** These bugs are inherent to the body-level
injection pattern (kis-app-shell.js injects header/nav/player into
document.body, outside HA's shadow DOM). v3 will use standard
Lovelace custom cards inside views — no body injection, no compositor
workarounds. Do NOT extend the v66 bandage pattern.

## Current state
- ha-dashboard branch: hotfix/ipad-resume-final
- ha-config branch: hotfix/cache-bust-v66
- Open PRs:
  - ha-config #51: fix(frontend): bump kis-app-shell.js cache-bust to v66
    https://github.com/chris-kintegratedSystems/ha-config/pull/51
  - ha-dashboard #82: fix(app-shell): iOS resume — reveal gate + compositor repaint (v66)
    https://github.com/chris-kintegratedSystems/ha-dashboard/pull/82
  - ha-dashboard #68: Issue 1 Stage 5 (paused — do not touch)
- Closed PRs (superseded):
  - ha-config #50: closed, superseded by #51
  - ha-dashboard #81: closed, superseded by #82
- Deployed state: v66 on Pi, matches hotfix/ipad-resume-final branch

## Next steps
- Merge PRs #51 (ha-config first) then #82 (ha-dashboard)
- v3 dashboard architecture planning session
- Do NOT add more repaint workarounds to mobilev2

## Known issues
- PR #68 (Issue 1 Stage 5) is paused — do not touch
- v66 compositor fix is a bandage dependent on iPadOS-specific behavior
- Future iOS updates may break the synthetic scroll trick — answer is
  to ship v3, not add more workarounds
