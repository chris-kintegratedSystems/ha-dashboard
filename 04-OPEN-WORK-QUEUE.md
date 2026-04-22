# 04 — Open Work Queue

> What's left to do. Active branches up top; then prioritized backlog;
> then deferred items that have an owner waiting. Completed items from
> the legacy `TASKS.md` are NOT duplicated here — see `03-PHASE-HISTORY.md`
> for what shipped.
>
> Update this file when work begins, finishes, or priority shifts. Old
> `TASKS.md` remains as historical record — this file is the canonical
> current-state queue.

Last updated: 2026-04-22

---

## Active branches awaiting PR

These are pushed to origin but no PR is open yet. Either open via
`gh pr create` or via the GitHub web UI. Ordering matters: ha-config
motion-camera-timing must merge before the ha-config lights-page-redesign
(the latter is branched off the former).

| Repo | Branch | HEAD | Merge order | Notes |
|------|--------|------|-------------|-------|
| ha-config | `fix/motion-camera-timing` | `d2e9faf` | 1 | Freshness-based motion priority (doorbell Tier 1, fresh vs stale for interior cameras). 30 s stickies + linger preserved. Exposed via `sensor.priority_camera` with unchanged alphabet `doorbell/living_room/izzy/none`. |
| ha-config | `fix/lights-page-redesign` | `81ddeb7` | 2 (after motion-timing) | Cache-bump v37 → v38 + stale patio light entity fix in `CLAUDE.md`. Branched off `fix/motion-camera-timing` to keep the freshness work included. |
| ha-dashboard | `fix/lights-page-redesign` | `6560835` | 3 | v38 Lights page redesign — glass-morph room cards, amber-fill brightness bars, no expand/collapse, day/night palette. Also includes `753fa60` (probe-before-deploy rule in CLAUDE.md). |

Real-world verification still needed for both sets of changes:

- **Motion priority:** real motion events in the house (see scenario
  matrix in the fix/motion-camera-timing commit body). Cannot be
  meaningfully simulated from the dev workstation.
- **Lights redesign:** tap-toggle and hold-more-info on real device
  (Tab S9 + iPhone). Playwright sweeps confirm rendering but not
  gesture handling. See `qa-camera-burst.js` companion for similar
  WebView vs Chromium regressions in the past.

---

## Active deferred work (unshipped, unbranched)

In rough priority order as of 2026-04-22:

### 1. Camera two-way audio (talk + listen)
- Vivint DBC300 backchannel support in go2rtc is unverified.
- Requires go2rtc backchannel config + `custom:webrtc-camera` HACS card.
- Current UI has disabled placeholder buttons in the camera popup.
- Blocker: `custom:webrtc-camera` install requires Chris approval for a
  new HACS custom resource.

### 2. Nanit motion / sound / cry events
- `indiefan/nanit` fork publishes via MQTT auto-discovery. Chris's HA
  stack has **no MQTT broker** yet.
- Path: add mosquitto container → flip `NANIT_MQTT_ENABLED=true` →
  extend the priority-camera state machine to accept
  `binary_sensor.nanit_*_motion` inputs.
- Nanit cameras are on the Cameras page but do NOT currently
  participate in the Home-page motion-triggered takeover.

### 3. Camera name-label suppression on feeds
- HA's entity-name overlay sits on top of the live camera stream.
- Needs CSS (via kis-nav shadow-root injection?) or a card swap to
  suppress without breaking the stream.
- Purely cosmetic; not urgent.

### 4. Climate tap-to-toggle HVAC
- Deferred by Chris 2026-04-19. Leave as-is until asked.

### 5. Release / version tagging
- `RELEASE_NOTES.md` now exists but releases are not yet tagged in git.
- Proposal: tag `v<N>` on every merge that bumps `kis-nav.js`, so
  `git show v38` returns the full shipping context.

### 6. Pi operational cleanup — Nanit secret
- Move `NANIT_PASSWORD` out of plain-text
  `C:\Projects\kintegrated\nanit\docker-compose.yaml` into an
  `.env` or `secrets:` mount. Currently flagged in
  `C:\Projects\ha-config\CLAUDE.md` under Nanit Integration.

---

## Known non-blocking cosmetic items

- **Lights page — Ceiling light labels.** Kitchen "Ceiling" and Living
  Room "Ceiling" share a name. Not a bug — rooms provide context in the
  header — but watch for user confusion reports.
- **Outdoor light count phrasing.** "5/7 on" at night when all outdoor
  lights are on except Left Patio + Center Patio is expected sunset
  behavior; not a bug.

---

## Recent learnings to apply forward

Pulled from the v36 → v38 cycle. If you see one of these patterns in
new work, short-circuit to the fix — don't re-discover.

1. **button-card inside sections / flex / grid always needs
   `extra_styles` `:host !important`.** `grid_options: 'full'` alone
   doesn't win against button-card's `max-width: fit-content`. Pattern
   documented in `.claude/memory/css_dom_patterns.md` and
   `component_compat.md`.
2. **Helpers referenced by Lovelace fail silently if unavailable.**
   Before shipping a conditional or a template that reads from an
   `input_*` helper, verify the helper exists via
   `curl .../api/states/<entity>` — a response `{"message":"Entity not
   found."}` or `"state":"unavailable"` means the card will silently
   never work.
3. **Probe before deploy.** Playwright-inspect the live DOM before any
   fix touches CSS / layout / shadow-DOM injection. The priority-zone
   v35→v37 and Lights page v38 both hit multi-deploy stalls that a
   ~30-second probe would have caught.
4. **card-mod is NOT installed on this HA.** Every `card_mod:` block is
   silently ignored. Use `custom:button-card` native styles instead.
   Verified via `.storage/lovelace_resources`.
5. **Android WebView ≠ Playwright Chromium.** Camera stream-related
   regressions may pass Playwright and fail on Tab S9. Use
   `qa-camera-burst.js` for the final gate on any camera-related fix.

---

## Legacy doc references

The following files remain in the repo as primary-source history and are
NOT the current-state queue. Use them only for archaeology:

- `TASKS.md` — task board through Phase 4 + camera overlays. Superseded
  by this file for current state.
- `PHASE2_HANDOFF.md`, `PHASE4_HANDOFF.md` — per-phase handoffs.
  Summaries folded into `03-PHASE-HISTORY.md`.
- `DESIGN-SPEC-v16.md` — original design spec. Still the reference for
  typography, color tokens, and KIS brand alignment.
- `Motion-Camera-Priority-Logic.md` — design doc for the priority-zone
  state machine. Implementation shipped; kept for design context.
- `Vehicle-Tiles-Design-Plan.md` — design doc for the carousel vehicle
  tiles. Implementation shipped.
- `SESSION_HANDOFF*.md` / `CHAT_CHECKPOINT*.md` — per-session snapshots.
  Safe to delete when stale; keep the most recent two for context.
