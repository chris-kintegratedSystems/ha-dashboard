# ha-dashboard — Claude Code Project

Mobile + tablet dashboard JSONs and the shared kis-nav.js fixed UI for
Chris's Home Assistant. See parent `C:\Projects\kintegrated\CLAUDE.md`
for KIS master context and `C:\Projects\ha-config\CLAUDE.md` for HA-side
deploy rules.

---

## Architecture

- `dashboard_mobilev1.json` / `dashboard_tabletv1.json` — Lovelace storage
  files that get SCP'd to `/config/.storage/lovelace.<id>` on the Pi.
  These are storage-mode dashboards — HA reads them from `.storage/`,
  NOT from `www/`. See "Critical Patterns → dashboard target path".
- `kis-nav.js` — fixed header + nav + mini-player. Injects into
  `document.body` from **outside** the HA shadow DOM tree. Loaded via
  `frontend.extra_module_url` in `configuration.yaml`, NOT via dashboard
  resources. See ha-config CLAUDE.md for the cache-bust pattern.

---

## Critical Patterns

### QA screenshots MUST use authenticated Playwright
`qa-screenshot.js` requires a long-lived HA access token in `.env` as
`HA_QA_TOKEN` (or legacy `HA_TOKEN`). Anonymous Chromium sessions cannot
load kis-nav.js, HA themes, or authenticated entity state, so they do
NOT represent what the real device sees.

The script fails the run if either `#kis-header-bar` or `#kis-nav-bar`
is missing from `document.body` after page load. If kis-nav DOM elements
are not found, QA fails — **do not open a PR**. The usual cause is the
`frontend.extra_module_url` loader got stripped from `configuration.yaml`
or the `?v=N` cache-bust was not bumped after a kis-nav.js change.

Device profiles (matches real hardware):
- `tabs9-landscape` — 2800 × 1752 @ 2x
- `iphone-portrait` — 430 × 932 @ 3x
- `iphone-landscape` — 932 × 430 @ 3x

### Dashboard target path — `.storage/`, never `www/`
The mobilev1 and tabletv1 dashboards are storage-mode dashboards. HA
reads them from:

```
/home/cooper5389/homeassistant/config/.storage/lovelace.dashboard_mobilev1
/home/cooper5389/homeassistant/config/.storage/lovelace.dashboard_tabletv1
```

Ownership must be `root:root`, permissions `644` — HA writes these
files as root inside the container, and non-root ownership breaks the
next HA-side save.

**`/config/www/` is a DEAD LETTER for dashboard JSONs.** That directory
is the static-asset tree HA serves at `/local/...`. It is the correct
home for `kis-nav.js`, theme CSS, images, and anything you want the
browser to fetch directly — but HA never reads dashboard Lovelace
configs from there. A JSON dropped in `www/mobile_v1/` will sit there
forever, completely ignored by the running dashboard.

Root cause of 2026-04-20 incident: Nanit dashboard cards were SCP'd to
`www/mobile_v1/dashboard_mobilev1.json` and HA silently ignored them.
Fix was `sudo cp` from `www/` to `.storage/lovelace.dashboard_mobilev1`
+ `chown root:root` + `chmod 644` + `sudo docker restart
homeassistant`.

**Deploy-path sanity check before any dashboard SCP:**
1. Target path must contain `.storage/lovelace.`
2. Filename has **no** `.json` extension (HA's storage keys are bare)
3. After copy: `sudo chown root:root` + `sudo chmod 644`
4. HA caches Lovelace config in memory — `sudo docker restart
   homeassistant` is mandatory even for JSON-only changes

### Real-device verification is the final gate
Playwright screenshots are a floor, not a ceiling. After every deploy,
verify on actual hardware:

- Tab S9 via Fully Kiosk hard refresh
- iPhone via HA Companion App hard refresh
- Day AND night theme on both devices

`qa-screenshot.js` automatically captures a real-device PNG from the
wall-mounted Tab S9 at the end of the run when `FKB_IP` and
`FKB_PASSWORD` are set in `.env` — saved to `qa-screenshots/fkb-tabs9.png`.
If the tablet is asleep or offline the capture is skipped with a
warning; it never fails the overall QA run.

Manual one-off:

```bash
curl -s "http://${FKB_IP}:2323/?cmd=getScreenshot&password=${FKB_PASSWORD}" -o qa-screenshots/fkb-tabs9.png
```

---

## Deploy pattern

1. Edit dashboard JSON locally, validate with `node -e "require('./dashboard_mobilev1.json')"`.
2. SCP the JSON to `/tmp/` on the Pi (cooper5389-writable), then:
   ```bash
   sudo cp /tmp/dashboard_mobilev1.json \
     /home/cooper5389/homeassistant/config/.storage/lovelace.dashboard_mobilev1
   sudo chown root:root \
     /home/cooper5389/homeassistant/config/.storage/lovelace.dashboard_mobilev1
   sudo chmod 644 \
     /home/cooper5389/homeassistant/config/.storage/lovelace.dashboard_mobilev1
   ```
   **Note:** the target filename drops the `.json` extension. Target must
   contain `.storage/lovelace.` — do NOT deploy to `/config/www/` (see
   "Critical Patterns → dashboard target path").
3. If kis-nav.js changed: SCP to `/config/www/mobile_v1/` (this IS the
   right path for static assets), bump `?v=N` in `configuration.yaml`,
   `sudo docker restart homeassistant`.
4. If only the dashboard JSON changed: still `sudo docker restart
   homeassistant` — HA caches the Lovelace config in memory and won't
   re-read the storage file otherwise.
5. Run `node qa-screenshot.js` — pass is necessary but not sufficient.
6. Verify on iPhone + Tab S9. Only then open the PR.

### Alternative: WebSocket push (no file touch, no restart)
`C:\Projects\kintegrated\scripts\push-dashboards.js` pushes both
dashboards via HA's `lovelace/config/save` WebSocket call. HA persists
the new config to `.storage/` internally and hot-reloads connected
clients. No SCP, no restart. Requires `HA_TOKEN` env var. Useful for
rapid iteration; the SCP path above remains the canonical deploy for
production.
