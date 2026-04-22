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
5. Hard-refresh FKB on Tab S9 and verify the version badge or `window.KIS_NAV_VERSION`
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

## 2026-04-22: Frigate snapshot aspect ratio ≠ live feed aspect ratio
Frigate's `/api/<cam>/latest.jpg` snapshots are the detection frame
(640x480, 4:3). Live WebRTC feeds are the camera's native resolution
(typically 16:9). Using a snapshot as a placeholder background causes
a visible aspect ratio jump on transition. Fix: use
`background-size: 100% 100%` (stretch) instead of `cover` (crop) on
the placeholder so it fills the exact same container rectangle as the
video, producing a seamless dimensional transition.
