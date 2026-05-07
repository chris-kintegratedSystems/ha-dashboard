# Open Work Queue — ha-dashboard

Tracked follow-up items that don't belong in a PR but need to happen.
Each item has a source (which session/PR surfaced it) and a status.

---

## Reolink permanent install + full integration

**Source:** Tier A validation (PR #50, 2026-05-06)
**Status:** Blocked on physical ceiling install

1. **Permanent ceiling install + camera key rename**
   `reolink_living_room_temp` → `reolink_living_room` across Frigate
   config, HA entity, dashboard JSON, and kis-nav.js PRIORITY_CAMERA_MAP.
   Requires physical install on living room ceiling first.

2. **Detection enablement**
   Enable detect on substream (640×360 @ 10fps). Expected ~5-10%
   additional Pi 5 CPU. Requires Frigate camera config change + role
   addition.

3. **Recording enablement**
   Enable record on main stream. Disk capacity calculation needed
   (205 GB free on NVMe as of May 2026 audit). Retention policy TBD.

4. **Motion sticky template binary_sensor**
   Create `binary_sensor.reolink_living_room_motion` following the
   existing motion sticky template pattern used by other cameras.

5. **Priority camera state machine extension**
   Add `reolink_living_room` to Camera Follow Code automations in
   ha-config. Requires:
   - New automation "Camera Follow Code — Reolink living room"
   - PRIORITY_CAMERA_MAP update in kis-nav.js (v52 bump)
   - Conditional card in Home view priority swipe section
   - `sensor.priority_camera` passthrough test

6. **Real-motion testing window**
   Walk-through validation after detection is enabled — verify person
   detection, motion triggers, and priority camera lock/release cycle
   work end-to-end.

---

## Sidebar non-scrollable when HA chrome visible (kiosk_mode OFF)

**Source:** Phase 4 kiosk toggle work (2026-05-07)
**Status:** Deferred — fix attempted and reverted

When kiosk_mode is toggled OFF, HA sidebar appears but is not scrollable.
`aside.mdc-drawer` is `position: fixed` at `100vh`, extending behind
kis-nav bars. `.panels-list` overflows but has no `overflow-y: auto`.
A kis-nav.js shadow injection fix was attempted (commit `e5a17c7`),
passed Playwright QA, but failed on real devices. Reverted in `9bee466`.

Next approach: diagnostic-first — confirm injection lands on real
devices before writing another fix. Consider MutationObserver timing,
adoptedStyleSheets specificity, or modifying kis-nav positioning instead.

See: `ha-config/INVESTIGATION_KIOSK_AND_SIDEBAR_BUGS.md` (Bug 2)

---

## Kiosk CSS not applying on iPhone / desktop browsers

**Source:** Phase 4 kiosk toggle work (2026-05-07)
**Status:** Deferred — not investigated

kiosk-mode toggle works on iPad + Tab S9 but HA chrome does not
appear/disappear on iPhone Companion or desktop browsers when
`input_boolean.kiosk_mode` is toggled. Possible causes: per-device CSS
caching, Companion app URL still has `?kiosk`, template evaluation
timing (only on load, not reactive).

See: `ha-config/INVESTIGATION_KIOSK_AND_SIDEBAR_BUGS.md` (Bug 1)

---

## Optiplex 7070 micro migration research

**Source:** Tier A CPU measurements (2026-05-06)
**Status:** Queued — research only, no purchase decision

Pi 5 capacity at 2K@25fps is ~10% CPU per Tier A camera. Beyond 3
cameras, the Pi 5 hits sustainable capacity limits (93% peak observed
at 4K@25fps with existing fleet).

Research scope:
- Spec a used Dell Optiplex 7070 micro for Frigate migration
- Estimated cost ~$190 for used unit
- Biggest jump in price-per-camera-capacity in the KIS tier framework
- Would move home fleet from Lite (Pi 5) to Standard tier
- Hardware decode (Intel Quick Sync) eliminates the 37% FFmpeg CPU
  warning that's cosmetic on Pi 5 but real on scale
