# 01 — Project Overview

> Canonical entry point for any session working on the ha-dashboard project.
> Start here before opening any other file. See the other numbered docs for
> detail: entities (02), phase history (03), open work (04).
> User-facing changelog is in `RELEASE_NOTES.md`.

---

## What this project is

A pair of linked Home Assistant projects for Chris's personal residence:

- **ha-dashboard** — Lovelace JSON for the Tab S9+ wall kiosk and iPhone
  Companion dashboards (`dashboard_mobilev1.json`, `dashboard_tabletv1.json`)
  plus the shared fixed-UI module `kis-nav.js`.
- **ha-config** — the HA-side companion: `configuration.yaml`,
  `automations.yaml`, `scenes.yaml`, `scripts.yaml`. Defines the helpers,
  template sensors, motion stickies, and priority-zone automations the
  dashboards depend on.

The two repos ship as a unit — a dashboard change that introduces a new
`--kis-*` CSS variable needs a paired `kis-nav.js` version bump in
ha-dashboard AND a cache-bust bump in ha-config `configuration.yaml`.

---

## Current deployed version

| Thing | Version | Source of truth |
|-------|---------|-----------------|
| `kis-nav.js` | **v38** | `window.KIS_NAV_VERSION = 38` in `kis-nav.js` line ~61 |
| `configuration.yaml` cache-bust | **v38** | `frontend.extra_module_url: /local/mobile_v1/kis-nav.js?v=38` |
| `ha-dashboard` `master` HEAD | `4ee6fc6` | Merge of PR #13 (priority-zone layout fix) |
| `ha-config` `main` HEAD | `87d3b2d` | Merge of PR #12 (priority-zone layout fix) |

Verify at any time:

```bash
ssh cooper5389@192.168.51.179 \
  'grep -E "KIS_NAV_VERSION\s*=" /home/cooper5389/homeassistant/config/www/mobile_v1/kis-nav.js; \
   grep -E "kis-nav.js\?v=" /home/cooper5389/homeassistant/config/configuration.yaml'
```

---

## Repos

Both repos are **private** on GitHub under `chris-kintegratedSystems`.

| Repo | URL | Local clone |
|------|-----|-------------|
| ha-dashboard | https://github.com/chris-kintegratedSystems/ha-dashboard | `C:\Projects\kintegrated\projects\ha-dashboard\` |
| ha-config | https://github.com/chris-kintegratedSystems/ha-config | `C:\Projects\ha-config\` |

**Access:** Chris's GitHub account owns both. `gh` CLI is authenticated
locally; the saved session can `gh pr create`, `gh pr merge`, `gh api`, etc.

**Branching model:**
- `master` (ha-dashboard) and `main` (ha-config) are the deploy trunks.
- All work happens on feature branches named `phase<N>[a-z]/<topic>` or
  `fix/<topic>` or `feature/<topic>`.
- PRs are reviewed and merged via the web UI or `gh pr merge`. Squash is
  NOT used — merges preserve the full commit trail.

### Branches currently pushed but without open PRs

At the time this doc was written (2026-04-22):

| Repo | Branch | Commits ahead of trunk |
|------|--------|------------------------|
| ha-config | `fix/motion-camera-timing` | 1 (freshness-based motion priority) |
| ha-config | `fix/lights-page-redesign` | 2 (motion-timing + cache-bump + patio entity fix) |
| ha-dashboard | `fix/lights-page-redesign` | 2 (probe-before-deploy rule + v38 lights page) |

Open PRs for these via `gh pr create` or the web UI when ready.

---

## Deploy architecture

```
  Your PC (Windows 11, Bash)                         Pi (192.168.51.179)
 ─────────────────────────────           ─────────────────────────────────
  ha-dashboard                            /home/cooper5389/homeassistant/
    dashboard_mobilev1.json     ──SCP─▶    config/.storage/
    dashboard_tabletv1.json     ──SCP─▶      lovelace.dashboard_mobilev1
                                                 (no .json, root:root 644)
                                               lovelace.dashboard_tabletv1
    kis-nav.js                  ──SCP─▶    config/www/mobile_v1/kis-nav.js
                                                 (static asset; served at
                                                  /local/mobile_v1/kis-nav.js)
  ha-config
    configuration.yaml          ──SCP─▶    config/configuration.yaml
    automations.yaml            ──SCP─▶    config/automations.yaml
    scenes.yaml                 ──SCP─▶    config/scenes.yaml
    scripts.yaml                ──SCP─▶    config/scripts.yaml
                                           sudo docker restart homeassistant
```

**Deploy-path rule:** dashboards go to `.storage/` (no `.json` extension,
`root:root 644`); `kis-nav.js` goes to `www/mobile_v1/`. Anything put in
`www/` that looks like a Lovelace storage blob is silently ignored by HA.

> **⚠️ DASHBOARD TARGETS — COPY EXACTLY. DO NOT DEPLOY TO `www/`:**
> ```
> /home/cooper5389/homeassistant/config/.storage/lovelace.dashboard_mobilev1
> /home/cooper5389/homeassistant/config/.storage/lovelace.dashboard_tabletv1
> ```
> No `.json` extension. `root:root` ownership. `644` permissions.
> `sudo docker restart homeassistant` afterwards — HA caches Lovelace
> configs in memory. `/config/www/mobile_v1/dashboard_*.json` is a
> **dead letter**: HA never reads dashboard configs from there. Burned
> ~1h on 2026-04-20 (Nanit incident) and again on 2026-04-23
> (lock/garage v16 restore) because this was not loud enough.

**Restart rule:** every JSON or config change requires
`sudo docker restart homeassistant` — HA caches Lovelace configs in memory.
The WebSocket push alternative (`C:\Projects\kintegrated\scripts\push-dashboards.js`)
skips the restart but is reserved for rapid iteration, not canonical
production deploys.

**Cache-bust rule:** every `kis-nav.js` change requires both
`window.KIS_NAV_VERSION` in the JS AND `?v=N` in `configuration.yaml`'s
`frontend.extra_module_url` — and both must match. Drift means Fully Kiosk
keeps serving the cached old file.

---

## QA pipeline

Every pre-PR deploy runs `qa-screenshot.js` which:

- Loads both dashboards via Playwright + long-lived HA token (`HA_QA_TOKEN`
  in `.env`).
- Navigates through 6 views × 8 device profiles = 48 screenshots.
- Fails the run if `#kis-header-bar` or `#kis-nav-bar` are missing after
  page load (catches stripped `frontend.extra_module_url` or stale cache
  bust).
- Captures one Fully Kiosk real-device PNG from the Tab S9 Remote Admin
  REST API (`FKB_IP` + `FKB_PASSWORD` in `.env`).

**Flags:**

- `--mock-cameras` — replaces Nest feeds with an SVG placeholder; zero API
  calls. Use this for iterative layout work on camera-containing views.
- `--camera-delay N` — staggers device profiles on camera views by N ms;
  keeps a real-stream sweep under Nest's 5 QPM `ExecuteDeviceCommand`
  quota.
- Positional `<view> <device-csv>` — narrow a sweep to one view + a
  comma-separated device list for targeted iteration.

The targeted pattern during UI iteration:

```bash
node qa-screenshot.js lights tabs9plus-landscape,iphone17promax-portrait --mock-cameras
```

Then a full 48-shot sweep once at the end, right before PR.

For camera loading-transition bugs that only reproduce on real hardware,
use `qa-camera-burst.js` (pure FKB captures, zero Nest API). For motion-
triggered visual sequences, pass `--trigger doorbell|living_room|izzy` to
fire motion via HA REST before the burst.

---

## Key CLAUDE.md references

- **Project-level rules:** `C:\Projects\kintegrated\projects\ha-dashboard\CLAUDE.md`
  — read at session start. Covers deploy gotchas, QA commands, efficiency
  rules, the "Save Everything" checkpoint procedure, and the mandatory
  `.claude/memory/` discipline (dead_ends, component_compat,
  css_dom_patterns, deploy_gotchas — all four should be read on session
  start).
- **HA-side rules:** `C:\Projects\ha-config\CLAUDE.md` — entity inventory,
  Z-Wave quirks, go2rtc / Nest / Nanit specifics, deploy targets.
- **KIS master:** `C:\Projects\kintegrated\CLAUDE.md` — business-level
  context for the parent KIS org.

---

## Contact for resolution

| Who | Role | How |
|-----|------|-----|
| Chris | Owner, final approver | Slack #general (Chris online) |
| Claire | HA user (wife) | Via Chris |
| Benjamin | HA user (child) | Via Chris |

For a blocker mid-session, post to `#general` tagging @Chris with the
specific decision needed. Do not sit idle.
