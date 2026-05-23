# mobilev2 Performance Fix Results
**Date:** 2026-05-23
**Repo:** ha-dashboard
**Target:** kis-app-shell.js `onHassUpdate` hot path + supporting code
**Versions:** v57 (baseline) -> v59 (final)

---

## Baseline (Phase 0 probe, pre-fixes)

| Metric | Value |
|--------|-------|
| Duration | 60s |
| Total hass updates | 511 |
| Average | 8.5/s |
| Peak | 17/s |
| Min | 0/s |

Hot path cost per hass update (v57):
- ~25-30 state reads (`hass.states[...]`)
- 1 full state enumeration (`Object.keys(hass.states).filter()` over ~500+ entities)
- 10 `getPropertyValue` calls (COLOR_MAP polling loop)
- ~15 `querySelector` calls
- 3 redundant `patchHALayout` shadow DOM walks per navigation

---

## What changed

| Phase | Change | PR |
|-------|--------|----|
| 1 | Gate kis-nav.js to v1 only -- skip all DOM/timers/observers on mobilev2 | ha-dashboard #76, ha-config #45 |
| 2 | Cache `update.*` entity keys -- eliminate full state enumeration per tick | ha-dashboard #77, ha-config #46 |
| 3 | RAF-throttle `onHassUpdate` -- coalesce burst updates into single render pass | ha-dashboard #78, ha-config #47 |
| 4 | Event-drive color preview -- remove 10-read + 10-getPropertyValue polling loop | ha-dashboard #79, ha-config #48 |
| 5 | Make `patchHALayout` idempotent -- early-exit when stylesheets already injected | ha-dashboard #80, ha-config #49 |

---

## Final probe (post all 5 phases, v59)

| Metric | Value |
|--------|-------|
| Duration | 60s |
| Total hass updates | 684 |
| Average | 11.4/s |
| Peak | 24/s |
| Min | 0/s |
| Buckets | [13,16,14,12,7,12,15,24,9,15,11,12,12,0,1,15,12,12,14,9,14,14,17,12,14,8,14,0,0,10,12,9,8,13,12,9,12,13,12,8,12,13,12,14,14,14,8,15,14,12,14,17,11,13,13,4,4,8,14,12] |

### Interpreting the numbers

The probe measures **input rate** (hass state changes arriving from HA), not processing cost. The higher total (684 vs 511) reflects normal variance in HA entity activity between probe windows -- more sensors reporting, different automation triggers. The perf fixes reduced **work done per update**, not the number of updates arriving.

**Per-update work eliminated:**
- Phase 1: All kis-nav.js overhead (timers, observers, DOM walks) -- no longer runs on v2
- Phase 2: `Object.keys(hass.states).filter(k => k.startsWith('update.'))` -- was O(n) over ~500 entities per tick, now cached and only recomputed when entity count changes
- Phase 3: Burst of 5-10 state changes in one 16ms frame coalesced into 1 `onHassUpdate` call instead of 5-10
- Phase 4: 10 state reads + 10 `document.documentElement.style.getPropertyValue()` calls + 10 string trims + 10 comparisons eliminated from every tick
- Phase 5: 2 out of 3 `patchHALayout` calls per navigation short-circuit at the top instead of walking the full shadow DOM tree

---

## Real-device verification

| Device | Result |
|--------|--------|
| iPhone (HA Companion) | Phase 4 verified -- color save/reset works, theme mode switching intact |
| Phase 5 console check | `window.KIS_APP_SHELL_VERSION === '59'`, `#kisv2-hui-patch` confirmed in huiRoot shadow root |

---

## Regressions

None caught. Each phase was deployed and verified independently before merging:
- Phase 1: Confirmed kis-nav.js still functions on mobilev1 dashboard
- Phase 2: Badge update count still renders correctly
- Phase 3: Header clock, weather, alarm chip all update within 1 frame of state change
- Phase 4: Color picker save + reset + theme mode auto-switch all functional
- Phase 5: Cold load, navigation, kiosk toggle all unaffected

---

## Subjective notes

Awaiting Chris's real-device feel notes. To be appended after extended use.

---

*Generated 2026-05-23 by Claude Code during perf fix series.*
