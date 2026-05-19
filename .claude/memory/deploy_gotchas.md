# Deploy Gotchas

Append new entries at the bottom. Date-stamp every entry.

---

## 2026-04-20: JSON to wrong path
Dashboard to .storage/ not www/. No .json extension. chown root:root, chmod 644.

## 2026-04-20: Wrong permissions
Always root:root 644 on .storage files.

## 2026-04: kis-nav.js disappeared
frontend.extra_module_url stripped from configuration.yaml. QA fails if missing.

## 2026-04: Cache-bust not bumped
Every kis-nav.js deploy needs ?v=N increment + FKB hard refresh.

## 2026-04: HA restart required for JSON changes
HA caches Lovelace in memory. Always docker restart. Alt: push-dashboards.js.

## 2026-04: Z-Wave battery sensors
Config queued until wake. Physical button press required.

## 2026-04-20: iOS LPM breaks cameras + presence
Use camera_view:auto (HLS fallback). Check LPM before debugging.

## 2026-04-21: Day/night stuck
Relied on HA theme names never registered. Now reads sun.sun directly.

## 2026-04-21: Settings version v16
Implement window.KIS_NAV_VERSION read by button-card template.

## 2026-04-21: card-mod not actually installed
`/hacsfiles/card-mod` is ABSENT from `lovelace_resources` on this HA.
Lovelace's schema accepts a `card_mod:` key on any card without validating
that card-mod is loaded — so every card_mod block in the dashboard has been
silently ignored for months. Verify before trusting any card_mod fix:
`ssh ... sudo cat /config/.storage/lovelace_resources | grep -i card-mod`.
If you need styling that today relies on card_mod, either (a) install
card-mod as a HACS custom resource, or (b) rewrite using custom:button-card
native styles (our preferred path, since button-card IS installed and a lot
of the dashboard already uses it).

## 2026-04-21: ha-config cache-bust can drift from ha-dashboard kis-nav version
The kis-nav.js version number (`window.KIS_NAV_VERSION` inside the file)
and the cache-bust query param in `configuration.yaml`
(`frontend.extra_module_url: /local/mobile_v1/kis-nav.js?v=N`) live in two
different repos. A deploy that updates kis-nav.js without bumping `?v=N` in
configuration.yaml ships fine on the filesystem but Fully Kiosk Browser keeps
serving the cached old file — the new code does not run. Checklist for every
kis-nav deploy:
1. Increment `window.KIS_NAV_VERSION` in ha-dashboard `kis-nav.js`.
2. Increment `?v=N` in ha-config `configuration.yaml` to match.
3. Both repos get a commit+push in the same session.
4. `sudo docker restart homeassistant` after configuration.yaml changes.
5. Hard-refresh FKB on Galaxy Tab A9+ and verify the version badge or `window.KIS_NAV_VERSION`
   in a probe matches the new number before declaring the deploy done.

## 2026-04-21: Nest SDM 429 during rapid deploy iteration
Tight deploy-then-test cycles on the Cameras page (sub-60s between refreshes)
burn Google's 5 QPM ExecuteDeviceCommand quota and return
`RESOURCE_EXHAUSTED (429)` on WebRTC stream start. The cells go empty and it
looks exactly like a code regression. Before blaming recent CSS/JS changes:
read the in-UI error banner text. If it says 429 / RESOURCE_EXHAUSTED, the
code is likely fine — wait 90 s with the tablet on a non-camera page for
quota refill, then retest. See dead_ends.md entry of the same date.

## 2026-04-22: go2rtc env var substitution does NOT work
Frigate's `{ENV_VAR}` substitution applies to its own config sections
(cameras, detectors, objects, etc.) but NOT to the `go2rtc:` block.
go2rtc receives the raw template strings and fails silently. Credentials
in `go2rtc.streams` must be hardcoded in the deployed config.yml on Pi.
Keep a `.env.example` in git with placeholder names; the real `.env` is
gitignored but only Frigate (not go2rtc) reads it.

## 2026-04-22: go2rtc nest: URL must be query-param-only
go2rtc v1.9.10 `nest:` source reads ALL 5 params from `url.Query()` —
it never parses the URL path. The path-based format
`nest:///enterprises/PROJECT/devices/DEVICE?client_id=...` puts
project_id and device_id in the path where go2rtc ignores them →
"wrong query" error. Correct format:
`nest:?client_id=X&client_secret=X&refresh_token=X&project_id=X&device_id=X`

## 2026-04-22: Frigate 5-cam CPU overload causes WebRTC freeze-resume cycle
Running 5 cameras at 640x480@5fps detect on a Pi 5 (CPU detector,
91ms inference) pegs all 4 cores at 100%. Symptoms: live WebRTC feeds
freeze for a few seconds then resume cyclically; Frigate logs show
`corrupt decoded frame`, `cabac decode failed`, `Connection timed out`;
ffmpeg watchdog restarts camera processes. go2rtc has no CPU left to
serve WebRTC packets consistently.
**Fix:** reduce detect fps to 2 on non-critical cameras (nest_cam_1/2),
disable detect+motion entirely on cameras using external detection
(nanit). Result: CPU idle went from 0% → 42%, inference speed from
91ms → 34ms. For 5+ cameras on Pi 5 without a Coral USB, budget at
most ~9 detect fps total (e.g. 1×5fps + 2×2fps).

## 2026-04-22: Frigate detect.enabled:false does NOT stop ffmpeg
Setting `detect: enabled: false` on a Frigate camera stops inference
but does NOT stop the ffmpeg decode process. Frigate still spawns
ffmpeg for the `roles: [detect]` input to feed the motion processor.
Adding `motion: enabled: false` stops the Python-side processing but
the ffmpeg process STILL runs (lower priority, but still consumes CPU).
The only way to fully eliminate the ffmpeg process is to remove the
camera from the `cameras:` section — but that removes the HA entity.
Accept the residual CPU cost for streaming-only cameras.

## 2026-05-06: Frigate integration reload required for new camera discovery
Restarting the Frigate Docker container after adding a new camera to
config.yml makes Frigate see the camera, but HA does NOT auto-discover
the new entity. Must reload the Frigate config entry via HA REST API:
POST /api/config/config_entries/entry/{entry_id}/reload
Frigate entry_id on this install: 01KPV496CWFDH0PEP7YBE5PPVM
homeassistant.reload_all also works but is slower.

## 2026-05-06: Reolink h264 vs h265 RTSP path quirk
Reolink RLC-820A serves BOTH h264Preview_01_* and h265Preview_01_*
RTSP paths simultaneously regardless of encoder setting in the camera
UI. Always use h264Preview paths in go2rtc config. Using h265 paths
causes browser transcode issues (reproduces the Nest decoder problem).

## 2026-05-07: Stacked PR merges to base branch, not main
When PR B is stacked on PR A (B's baseRefName = A's branch, not main),
`gh pr merge B` merges into A's branch — NOT into main. To land both on
main, either: (1) merge A first (which targets main), B's base auto-
updates; or (2) change B's base to main before merging. In this session,
PR #49 (stacked on #48) was merged into #48's branch, requiring #48 to
be reopened and merged to main. Check `gh pr view --json baseRefName`
before merging any PR to confirm the target.

## 2026-05-07: input_boolean with initial: true resets on HA restart
`input_boolean.kiosk_mode` has `initial: true` in configuration.yaml.
Every `docker restart homeassistant` resets it to ON. If you need kiosk
mode OFF for testing after a restart, call:
`POST /api/services/input_boolean/turn_off` with
`{"entity_id": "input_boolean.kiosk_mode"}`.
Don't forget this during deploy-test cycles that involve HA restarts.

## 2026-04-22: Frigate snapshot aspect ratio ≠ live feed aspect ratio
Frigate's `/api/<cam>/latest.jpg` snapshots are the detection frame
(640x480, 4:3). Live WebRTC feeds are the camera's native resolution
(typically 16:9). Using a snapshot as a placeholder background causes
a visible aspect ratio jump on transition. Fix: use
`background-size: 100% 100%` (stretch) instead of `cover` (crop) on
the placeholder so it fills the exact same container rectangle as the
video, producing a seamless dimensional transition.

## 2026-05-10: mobilev2 resources need WebSocket cache-bust
mobilev2 cards (kis-app-shell.js, kis-priority-view.js, etc.) are loaded
via `lovelace_resources` (NOT `extra_module_url`). Cache-bust is done by
updating the resource URL via WebSocket:
`lovelace/resources/update` with `resource_id` + `url` including `?v=N`.
After updating, `docker restart homeassistant` is required. Browsers
(and FKB) will re-fetch the JS if the URL changed. Unlike kis-nav.js
(which uses `extra_module_url` in configuration.yaml), mobilev2 resource
URLs live in `.storage/lovelace_resources` — no configuration.yaml edit
needed. Get resource IDs from:
`sudo cat /config/.storage/lovelace_resources | python -c "import sys,json; ..."`

## 2026-05-17: sed-based lovelace_resources cache-bust (simpler than WebSocket)
Direct sed on the Pi is faster than WebSocket for single-resource bumps:
```bash
ssh cooper5389@192.168.51.179 "sudo sed -i 's|kis-app-shell.js?v=25|kis-app-shell.js?v=26|' \
  /home/cooper5389/homeassistant/config/.storage/lovelace_resources && \
  sudo docker restart homeassistant"
```
Works because HA re-reads `.storage/lovelace_resources` on restart. Still
need the docker restart regardless of which method changes the file.

## 2026-05-17: Deploy YAML changes (kis-dashboard-v2.yaml)
The dashboard YAML source of truth is `kis-dashboard-v2.yaml` in the
ha-dashboard repo. After editing, deploy like any other static asset:
```bash
scp kis-dashboard-v2.yaml cooper5389@192.168.51.179:/tmp/ && \
ssh cooper5389@192.168.51.179 "sudo cp /tmp/kis-dashboard-v2.yaml \
  /home/cooper5389/homeassistant/config/www/mobile_v2/kis-dashboard-v2.yaml && \
  sudo chown root:root /home/cooper5389/homeassistant/config/www/mobile_v2/kis-dashboard-v2.yaml && \
  sudo chmod 644 /home/cooper5389/homeassistant/config/www/mobile_v2/kis-dashboard-v2.yaml && \
  sudo docker restart homeassistant"
```
Note: this YAML lives in `www/` (static asset served at `/local/...`),
NOT in `.storage/`. HA reads it via lovelace resource loading, not as a
storage-mode dashboard. Docker restart is still required.

## 2026-05-17: FKB Remote Admin on Galaxy Tab A9+
Wall kiosk device: Samsung Galaxy Tab A9+ (SM-X210), Android 16, Chrome 147 WebView.
- LAN IP: 192.168.51.150 (DHCP — may change, prefer reservation)
- Endpoint: http://192.168.51.150:2323/
- Auth: FKB_PASSWORD in .env (1Password reference)
- Useful commands: deviceInfo, loadUrl, getKioskInfo, getScreenshot
- Used for: viewport probing, start URL changes, kiosk lock toggle,
  brightness control via Remote API (alternative to HA integration),
  real-device screenshot capture in qa-camera-burst.js
- CSS viewport: 1280×799 @ DPR 1.5 (NOT 1440×900 as previously assumed)
- Physical resolution: 1920×1200

## 2026-05-19: kis-app-shell.js loads via extra_module_url (not lovelace_resources)
Since v55, kis-app-shell.js loads via `frontend.extra_module_url` in
ha-config `configuration.yaml` (alongside kis-nav.js). The old entry in
`.storage/lovelace_resources` was removed. To bump the cache-bust:
1. Edit `?v=N` in ha-config `configuration.yaml` extra_module_url list
2. SCP configuration.yaml to Pi `/config/`
3. `sudo docker restart homeassistant`
Do NOT edit `.storage/lovelace_resources` for kis-app-shell.js — it's
no longer there. Other mobilev2 cards (kis-control-panel, kis-scenes,
kis-settings, kis-priority-view) still use lovelace_resources.

## 2026-05-17: Drift diagnostic — line-ending caveat
MD5 comparison between local repo files and Pi-deployed files may show
false drift due to CRLF (local Windows) vs LF (Pi Debian). Always
normalize line endings before treating an MD5 mismatch as real drift.
Content-identical files with line-ending-only differences are NOT drift
— SCP handles this transparently and the Pi copy is functionally
identical.
