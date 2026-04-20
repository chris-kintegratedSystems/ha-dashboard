# ha-dashboard — Claude Code Project

Mobile + tablet dashboard JSONs and the shared kis-nav.js fixed UI for
Chris's Home Assistant. See parent `C:\Projects\kintegrated\CLAUDE.md`
for KIS master context and `C:\Projects\ha-config\CLAUDE.md` for HA-side
deploy rules.

---

## Architecture

- `dashboard_mobilev1.json` / `dashboard_tabletv1.json` — Lovelace storage
  files that get SCP'd to `/config/.storage/lovelace.<id>` on the Pi.
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

### Real-device verification is the final gate
Playwright screenshots are a floor, not a ceiling. After every deploy,
verify on actual hardware:

- Tab S9 via Fully Kiosk hard refresh
- iPhone via HA Companion App hard refresh
- Day AND night theme on both devices

Optional — capture the actual Fully Kiosk rendering via its remote
admin API and attach alongside the Playwright screenshots:

```bash
curl -s "http://<tablet-ip>:2323/?cmd=screenShot" -o qa-screenshots/tabs9-real.png
```

---

## Deploy pattern

1. Edit dashboard JSON locally, validate with `node -e "require('./dashboard_mobilev1.json')"`.
2. SCP to `/tmp/` on Pi, then `sudo cp` into `/config/.storage/`.
3. If kis-nav.js changed: SCP to `/config/www/mobile_v1/`, bump `?v=N` in
   `configuration.yaml`, `sudo docker restart homeassistant`.
4. If only the dashboard JSON changed: still `docker restart homeassistant` —
   HA caches the Lovelace config in memory and won't re-read the file otherwise.
5. Run `node qa-screenshot.js` — pass is necessary but not sufficient.
6. Verify on iPhone + Tab S9. Only then open the PR.
