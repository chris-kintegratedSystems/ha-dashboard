# 00 — How to Use This Project

This Claude Project is the **planning layer** for Chris's Home Assistant
dashboard. It holds reference docs, entity inventories, design decisions,
and the work queue. It does NOT execute code.

---

## Workflow

1. **Claude Project (this)** — planning, design review, architecture
   decisions, queue management. Chris opens this project on the web UI
   to discuss what to build next, review proposals, and track state.

2. **Claude Code (CC)** — execution. CC sessions run on Chris's Windows
   PC at `C:\Projects\kintegrated\customers\ha-dashboard\`. CC reads
   its own `CLAUDE.md`, memory files, and the repos directly. It
   writes code, deploys to the Pi, runs QA, and opens PRs.

3. **Slack bridge** — `#general` and `#dev-log` channels at
   kintegratedsystems.slack.com. Agents post status, blockers, and
   completion notices. Chris may issue instructions from his iPhone
   via Slack.

**Rule of thumb:** if you're deciding *what* to build or *why*, use
this Project. If you're deciding *how* and writing code, that's a CC
session.

---

## Current Status (2026-05-17)

### mobilev2 (active development)
Custom-card-based dashboard with a persistent app shell. Full-width
custom elements replace Lovelace's native card chrome.

**Live views:** Home, Settings
**Planned views:** Climate, Lights, Cameras, Media

**Deployed resource versions:**

| Resource | Version | Cache-bust |
|----------|---------|------------|
| kis-app-shell.js | v42 | `?v=42` |
| kis-control-panel.js | v30 | `?v=30` |
| kis-scenes.js | v11 | `?v=11` |
| kis-settings.js | v7 | `?v=7` |
| kis-priority-view.js | v15 | `?v=15` |
| kis-design-tokens.js | (ES import) | N/A |

All files deployed and in sync as of 2026-05-17.

### mobilev1 (maintenance only)
Legacy JSON-card-based dashboard. Still deployed on Galaxy Tab A9+
(SM-X210) as the primary wall-mount UI. kis-nav.js v38 is the current
deployed version. No active development planned — maintenance and bug
fixes only.

---

## Active Issue Track

| Issue | Title | Status | Key PRs |
|-------|-------|--------|---------|
| 1 | Responsive breakpoint system | **In progress** — Stage 1 + Stage 2 merged, Stage 3 (settings tokens) in flight | #64, #65 |
| 2 | First-nav blank view after reload | **Closed** | #57 |
| 3 | Kiosk toggle bidirectional | **Closed** | #58 |
| 4 | Alarm panel UX | **Closed** — custom alarm panel with disarm keypad, state-branched content, auto-close | #60, #62 |

### Issue 1 stages detail
- **Stage 1** (PR #64, merged): Detection layer — `KIS_DENSITY` breakpoint
  taxonomy, `kis-design-tokens.js` token system, `<style>` injection for
  density vars (avoids HA theme-strip behavior on `:root` inline styles)
- **Stage 2** (PR #65, merged): Orientation-aware Home layout — `adoptedStyleSheets`
  column override in `kis-app-shell.js`, `bp.columns`-based layout in
  `kis-control-panel.js`, 3x2 phone grid in `kis-scenes.js`, `box-sizing: border-box`
  invariant for density-token heights
- **Stage 3** (next): Settings tokens — density-aware sizing in `kis-settings.js`
- **Stage 4**: Validation sweep across all cards
- **Stage 5**: Real-device sign-off (Galaxy Tab A9+ + iPhone + iPad)

---

## Key repos

| Repo | Local path | Purpose |
|------|-----------|---------|
| ha-dashboard | `C:\Projects\kintegrated\customers\ha-dashboard` | Dashboard code, custom cards, QA tools |
| ha-config | `C:\Projects\kintegrated\customers\ha-config` | HA configuration, automations, entity definitions |

---

## When updating this project

Re-upload knowledge files when any of these drift:
- Entity inventory changes (new device, renamed entity)
- Phase or issue completes
- Architecture decision made (new custom card, new pattern)
- Work queue reprioritized

Each file in this project corresponds to one knowledge file numbered
00 through 06. Replace the file in the project, don't append — these
are snapshots of current truth, not append-only logs.
