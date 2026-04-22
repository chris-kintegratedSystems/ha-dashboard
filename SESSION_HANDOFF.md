# Session Handoff — 2026-04-20

End-of-day handoff. Two repos, two open PRs, Pi state clean.

---

## What shipped today

### Phase 4 — Home view layout redesign
- `dashboard_mobilev1.json` home view rebuilt as a `sections` layout with
  a reserved motion-camera zone keyed off three sticky template
  `binary_sensor.*_motion_sticky` entities (2-minute delay_off).
- Column-span tuning so Tab S9 landscape, iPad landscape, and iPhone
  portrait/landscape all render without alignment regressions.
- Ha-config side: added the three sticky binary_sensor templates +
  restored the `frontend.extra_module_url` loader that an earlier
  configuration.yaml push had stripped. `kis-nav.js` cache-bust bumped
  to `?v=17`.
- PRs: `ha-config#2` merged, `ha-dashboard#4` merged.

### QA pipeline v2
- `qa-screenshot.js` rewritten as authenticated Playwright (long-lived
  `HA_QA_TOKEN` in `.env`, `hassTokens` injected into localStorage,
  Bearer header on every request).
- **kis-nav injection gate** — run fails non-zero if `#kis-header-bar`
  or `#kis-nav-bar` is missing from `document.body` after navigation.
- **8 device profiles** covering every real piece of hardware in both
  orientations (iPad 11, Galaxy Tab S9+, iPhone 17 Pro Max, iPhone 16
  Pro). Full sweep = 48 Playwright screenshots + 1 Fully Kiosk real-
  device PNG.
- **Targeted iteration mode** — `node qa-screenshot.js cameras
  tabs9plus-landscape,iphone17promax-portrait` does one view + two
  devices in ~15 seconds; full 48-shot sweep runs only once before
  commit/PR.

### Nanit integration
- `indiefan/nanit` RTMP restream container on the Pi (bind-mounted
  `/home/cooper5389/nanit/data:/data` for session persistence).
- `camera.nanit_benjamin` + `camera.nanit_travel` wired as HA ffmpeg
  cameras against the local RTMP streams; baby UIDs stored in
  `secrets.yaml`.
- Two picture-entity cards on the Cameras page.
- Motion/sound/cry events deferred — fork publishes via MQTT auto-
  discovery but the Pi has no MQTT broker yet.
- PRs: `kis-team#2` (nanit/docker-compose.yaml), `ha-config#3`
  (ffmpeg cameras + docs + `secrets.yaml.example`), `ha-dashboard#5`
  (Cameras page picture-entity cards). All merged.

### Camera overlays + fullscreen popups
- Tap any camera card (3 conditional Home motion cards + 5 Cameras
  page cards) → `browser_mod.popup` opens fullscreen.
- Popup content is a `picture-elements` card whose inner `ha-card` is
  forced to `100vw × 100vh` via `card_mod`. Overlay buttons are
  `custom:button-card` templates positioned via picture-elements
  `style: { top, right | bottom, left }`.
- Buttons: close X (top-right, `position: fixed` via `:host` card_mod,
  `z-index: 9999`, viewport-anchored), unlock/lock on doorbell,
  disabled placeholders for Talk + Listen on all cameras.
- PR: `ha-dashboard#6` — **OPEN**.

### Cameras page uniform-card layout
- Multiple rounds of iteration. The win was switching from
  `type: sections` to `type: panel` with a single native HA `grid`
  card (`columns: 2`, `square: false`) and using the native
  `aspect_ratio: "16:9"` **property** on each picture-entity — NOT
  `card_mod` CSS, which DOM inspection confirmed doesn't reach
  `ha-card` inside picture-entity (`getComputedStyle(haCard).aspectRatio`
  reads `"auto"` regardless of what card_mod declares).
- All 5 cards now render at identical dimensions in every viewport.
- Memory written:
  `.claude/projects/…/memory/feedback_picture_entity_aspect.md`.

### Agent definitions
- `ha-dashboard/.claude/agents/ha-lovelace-expert.md` added. Research-
  first agent: scans HA community forum, official docs, GitHub issues
  on card repos; produces an implementation brief for the engineer
  rather than writing code itself. Invoke before any new card type,
  layout restructure, or HACS install — or any time an approach has
  failed twice.

---

## Current deployed state (on the Pi)

| Component | Version / path |
|-----------|----------------|
| `kis-nav.js` | cache-bust `?v=17`, file at `/config/www/mobile_v1/kis-nav.js` |
| `configuration.yaml` → `frontend.extra_module_url` | `/local/mobile_v1/kis-nav.js?v=17` (verified present) |
| `dashboard_mobilev1` | storage key `lovelace.dashboard_mobilev1` (root:root 644). Latest commit `7386da4` deployed — panel + grid + aspect_ratio. |
| `dashboard_tabletv1` | storage key `lovelace.dashboard_tabletv1`. Unchanged today. |
| Camera entities | `camera.doorbell`, `camera.nest_cam_1`, `camera.nest_cam_2`, `camera.nanit_benjamin`, `camera.nanit_travel` |
| Motion sticky sensors | `binary_sensor.doorbell_motion_sticky`, `nest_cam_2_motion_sticky`, `nest_cam_1_motion_sticky` (2-min delay_off) |
| go2rtc | `alexxit/go2rtc:latest`, running **v1.9.14**. Only `doorbell` stream configured. Nest + Nanit NOT in go2rtc. |
| Nanit container | `indiefan/nanit`, bind-mounted `/home/cooper5389/nanit/data:/data`, RTMP `:1935` |
| `/tmp/` scratch | CLEAN (six stale `dashboard_*.json` files removed 2026-04-20) |

---

## Open PRs — merge order

| Order | Repo | PR | Branch | What it does |
|-------|------|----|--------|--------------|
| 1 | `ha-config` | #4 | `fix/go2rtc-docs-accurate` | Doc-only correction to go2rtc state in CLAUDE.md. Zero code impact. Merge first (trivial). |
| 2 | `ha-dashboard` | #6 | `feature/camera-overlays` | Camera overlays + fullscreen popups + panel+grid Cameras layout + ha-lovelace-expert agent definition + doc updates. After merge: deploy `dashboard_mobilev1.json` to `.storage/lovelace.dashboard_mobilev1` + `sudo docker restart homeassistant`. |

Neither PR has a hard dependency on the other.

---

## Open items — queued for next session

1. **Camera two-way audio.** Wire doorbell (and optionally Nest
   cameras) into go2rtc with backchannel enabled. Install
   `custom:webrtc-camera` HACS card. Vivint DBC300 backchannel support
   still unverified. Dashboard UI already has disabled placeholder
   buttons ready to activate.
2. **Nanit motion / sound / cry.** Add a mosquitto broker container,
   flip `NANIT_MQTT_ENABLED=true` in nanit compose, then extend the
   Home motion-camera zone conditions to include the new
   `binary_sensor.nanit_*_motion` entities.
3. **Nanit password secret.** `NANIT_PASSWORD` is plain-text inside
   `/home/cooper5389/nanit/docker-compose.yaml`. Convert to a
   docker-compose `.env` (gitignored) or a `secrets:` mount before
   the next container touch.
4. **Pi health check.** `home-assistant_v2.db` size, SD wear, Z-Wave
   packet-drop rate on the garage TriSensor. Routine, not blocking.
5. **Release notes system.** Human-readable changelog between deploys,
   sourced from commit messages + PR titles. Currently nothing ties
   deploys to a release tag.
6. **Camera name label suppression.** HA's entity-name overlay sits on
   top of the feed; hide it without breaking the stream.
7. **Lights page polish.** 10–15px gap between room headers and grids;
   requires stack-in-card (HACS).

---

## Lessons learned (memory-worthy)

1. **Dashboard deploy path:** `.storage/lovelace.dashboard_mobilev1` is
   the ONLY valid target. `/config/www/mobile_v1/` is a dead letter —
   HA never reads dashboard JSON from there. The Nanit deploy burned
   ~1h to this on 2026-04-20 before the pattern got written into both
   CLAUDE.md files.
2. **HA layout containers are not fungible.** `type: sections` equalizes
   column heights, not cell heights — fights against per-card
   aspect-ratio. For pixel-uniform grids, use `type: panel` + native
   `grid` card (or `horizontal-stack`). Documented in
   `ha-dashboard/CLAUDE.md` → "Layout patterns that work".
3. **`card_mod` does not reach everywhere.** `card_mod` CSS targeting
   `ha-card` inside `picture-entity` silently doesn't apply for some
   properties (verified: `aspect-ratio`). When `card_mod` fails twice,
   check whether the card type has a native prop that does the job —
   `picture-entity` has `aspect_ratio: "16:9"`. Saved to memory.
4. **Research before implement.** The Cameras uniform-card arc ate
   multiple rounds of card_mod iteration before we switched approach.
   Going forward, when an approach fails twice, invoke
   `ha-lovelace-expert` for a research brief instead of iterating CSS.
   Agent definition landed today.
5. **Targeted QA during iteration, full sweep at end.** A 2-device
   view-specific run is ~15s; the full 48-shot sweep is ~2min. Only
   run the full sweep once, right before commit/PR. Saved to memory.

---

## Repo hygiene (2026-04-20 close-out)

- `ha-dashboard` working tree: clean on `feature/camera-overlays`
  after final commit. `.claude/settings.local.json` gitignored.
- `ha-config` working tree: has untracked `qa/compare.js` and
  `vivint_init_patched.py` — NOT committed today (scoped for a
  later session).
- Merged local branches eligible for deletion once PR #4 and #6 land:
  `feature/nanit-cameras`, `phase3/motion-camera-scene-tracking`,
  `phase4/home-layout-redesign` (all pushed + merged upstream).
- Pi `/tmp/` scratch cleared.
