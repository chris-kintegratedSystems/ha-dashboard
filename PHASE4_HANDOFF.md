# Phase 4 — Handoff

Session close: 2026-04-20. Two repos, two open PRs, merge ha-config first.

---

## What shipped

### Home view layout redesign (`ha-dashboard`)
- `dashboard_mobilev1.json` — home view rebuilt as a `sections` layout with a
  reserved motion-camera zone that appears only when any sticky-motion sensor
  is on, so the column slot doesn't collapse and shove other cards around.
- Column-span tuning so Tab S9 landscape, iPad landscape, and iPhone
  portrait/landscape all render without alignment regressions.

### kis-nav.js loader fix (`ha-config`)
- The Phase 4 `configuration.yaml` SCP initially overwrote the file on the Pi
  and stripped `frontend.extra_module_url`, which silently killed the kis-nav
  header + bottom nav bar on the real device.
- Restored the loader entry and bumped cache-bust from `v=16` → `v=17`:
  ```yaml
  frontend:
    themes: !include_dir_merge_named themes
    extra_module_url:
      - /local/mobile_v1/kis-nav.js?v=17
  ```
- Critical patterns added to `C:\Projects\ha-config\CLAUDE.md` so this
  regression cannot recur silently: `extra_module_url` preservation rule +
  Playwright-limitations note.

### QA pipeline (`ha-dashboard/qa-screenshot.js`)
- **Authenticated Playwright** — loads `HA_QA_TOKEN` from `.env`, injects
  `hassTokens` into localStorage, and sends `Authorization: Bearer …` on
  every request so the dashboard renders exactly like a signed-in session.
- **kis-nav injection gate** — after page load, waits for `#kis-header-bar`
  and `#kis-nav-bar` to exist in `document.body`. If either is missing the
  run exits non-zero. That is the canonical signal that
  `frontend.extra_module_url` is still wired up.
- **8 device profiles** covering every piece of real hardware in both
  orientations — iPad 11-inch, Galaxy Tab S9+, iPhone 17 Pro Max, iPhone 16
  Pro. Viewports are CSS pixels; DPR is explicit per profile.
- **Fully Kiosk real-device capture** — at the end of the run, pulls a live
  PNG from the wall-mounted Tab S9 via the Remote Admin REST API
  (`cmd=getScreenshot`). Requires `FKB_IP` + `FKB_PASSWORD` in `.env` and the
  "Enable Screenshot on Remote Admin" toggle on the tablet. Capture failure
  warns but does not fail the overall run (tablet may be asleep).
- Sweep output: 48 Playwright screenshots (6 views × 8 devices) plus
  `fkb-tabs9.png`. Last verified sweep: all 48 passed the kis-nav gate and
  the FKB capture succeeded.
- `qa-screenshots/` is gitignored; artifacts stay local.

---

## Open PRs

| Repo | PR | Branch | Title |
|------|----|--------|-------|
| `ha-config` | #2 | `phase4/motion-sticky-sensors` | Sticky motion binary_sensors + extra_module_url restore + critical-patterns docs |
| `ha-dashboard` | #4 | `phase4/home-layout-redesign` | Home view redesign + QA pipeline |

**Merge order: `ha-config` #2 FIRST, then `ha-dashboard` #4.**

The dashboard home view depends on the three sticky template
`binary_sensor.*_motion_sticky` entities that PR #2 introduces. If the
dashboard merges first, the motion-camera zone will reference entities that
don't exist yet and the zone won't render until ha-config catches up.

---

## NOT YET IMPLEMENTED — queued for next session

These were discussed but are **not** part of Phase 4. Do not assume any are
done on the current branches.

- **Camera overlay controls**
  - Talk/Listen buttons on every camera card
  - Lock/Unlock buttons on the doorbell camera card
- **Camera name label removal from feeds** — the HA-generated entity-name
  overlay on the camera stream currently sits on top of the image; needs
  CSS or card-swap to hide without breaking the stream.
- **Fullscreen popup** — tapping a camera should open a modal with overlay
  controls and the camera's native aspect ratio preserved (not the
  constrained thumbnail ratio used in the card).
- **Cameras page tap-to-fullscreen** — the dedicated Cameras view should
  inherit the same tap-to-fullscreen-with-overlays behavior.

---

## Deploy + verify checklist (for whoever merges)

After both PRs merge:

1. SCP updated `dashboard_mobilev1.json` to `/config/.storage/` on the Pi.
2. SCP updated `configuration.yaml` to `/config/` on the Pi.
3. `sudo docker restart homeassistant` — HA caches Lovelace + config in
   memory and will not re-read files otherwise.
4. `cd C:\Projects\kintegrated\projects\ha-dashboard && node qa-screenshot.js`
   — must pass the kis-nav gate on all 48 screenshots.
5. Hard refresh on real Tab S9 (Fully Kiosk) and real iPhone (HA Companion
   App). Confirm header + nav + home view render in both day and night
   themes. This is the final gate; Playwright is a floor, not a ceiling.
