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

### HACS community card installs — self-serve when safe
Claude Code MAY install HACS custom cards directly via SSH (curl + chmod)
without stopping to ask, IF all of these are true:
1. The card was recommended by ha-lovelace-expert research brief
2. The install is a simple JS file download (no Docker, no auth, no config flow)
3. The install path is /config/www/community/<card-name>/
4. The card is registered in dashboard resources (lovelace or configuration.yaml)

Pattern:
  ssh cooper5389@192.168.51.179 'sudo mkdir -p /home/cooper5389/homeassistant/config/www/community/<card>/ && \
    sudo curl -sL -o /home/cooper5389/homeassistant/config/www/community/<card>/<card>.js <github-release-url> && \
    sudo chmod 644 /home/cooper5389/homeassistant/config/www/community/<card>/<card>.js'
Then add the resource to configuration.yaml or lovelace resources and restart.

Do NOT self-serve:
- HACS integrations (require HA config flow in UI)
- Anything requiring OAuth, 2FA, or interactive auth
- Docker containers
- Core HA integrations (use HA UI)

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

**8 device profiles** cover every piece of real hardware in both
orientations (defined at the top of `qa-screenshot.js`):

- `ipad11-portrait` / `ipad11-landscape` (834×1194 / 1194×834, 2x)
- `tabs9plus-portrait` / `tabs9plus-landscape` (876×1400 / 1400×876, 2x)
- `iphone17promax-portrait` / `iphone17promax-landscape` (440×956 / 956×440, 3x)
- `iphone16pro-portrait` / `iphone16pro-landscape` (402×874 / 874×402, 3x)

Full sweep = 48 Playwright screenshots (6 views × 8 devices) plus one
Fully Kiosk real-device PNG from the wall-mounted Tab S9 via the Remote
Admin REST API (`cmd=getScreenshot`). Set `FKB_IP` + `FKB_PASSWORD` in
`.env` to enable the FKB capture; failure warns but never fails the
overall QA run.

**Targeted iteration** (see `memory/feedback_qa_targeted.md`): during
UI iteration on a single view, pass that view + a short device list to
shave the sweep to ~15 seconds:

```bash
node qa-screenshot.js cameras tabs9plus-landscape,iphone17promax-portrait
```

Run the full 48-shot sweep once at the end, right before commit + PR.

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

## Session Knowledge Capture

`.claude/memory/` holds four append-only project-memory files that
accumulate the hard-won lessons from every dashboard session. These
are committed to the repo — they travel with the code.

| File | What belongs here |
|------|-------------------|
| `dead_ends.md` | Approaches that looked promising but failed, with the workaround that worked. Tried / Failed / Fix triples, date-stamped. |
| `component_compat.md` | Card types, layout types, and HACS integrations — WORKS / BROKEN / PARTIAL with notes. Updated whenever a new card is evaluated. |
| `css_dom_patterns.md` | Shadow DOM traversal paths, kis-nav CSS patch IDs, grid/flex recipes, safe-area quirks. Write tight; these get re-read a lot. |
| `deploy_gotchas.md` | Deploy-path, permission, cache-bust, and restart pitfalls. Anything that would cause a silent "change didn't land" failure. |

### Mandatory session discipline

**At session START** — before editing any dashboard JSON, kis-nav.js,
or touching the Pi — read all four memory files. They are short. Doing
this up front prevents re-learning the same dead end. If a proposed
approach matches a failed pattern in `dead_ends.md`, pick the noted
workaround instead of re-testing.

**At session END** — BEFORE the final commit of the session — append
new lessons to whichever files apply. What counts as a lesson:
- An approach that failed and cost iteration time → `dead_ends.md`
- A new component evaluated (works or broken) → `component_compat.md`
- A non-obvious shadow-DOM / CSS / layout trick that worked →
  `css_dom_patterns.md`
- A deploy-path, permission, cache, or restart issue → `deploy_gotchas.md`

Format every entry with a date heading (`## YYYY-MM-DD: <short title>`)
and include enough context that a future session can act on it without
re-discovering the root cause. Entries belong in the same commit as
the work that produced the lesson — so the lesson and its evidence ship
together.

These files replace ad-hoc "what did I learn today" notes. Do not
create new session-handoff markdown files for this purpose.

---

## "Save Everything" Command

When Chris says "save everything", "checkpoint", or "safe to exit?",
run the full 6-phase checkpoint:

1. STATUS CHECK — report uncommitted work, open PRs, scratch files
2. UPDATE MEMORY — capture session lessons to .claude/memory/ files
   BEFORE committing (so they're included in the push)
3. COMMIT + PUSH — stage everything (code + memory), push to origin
4. PR MERGE — guide Chris through merging on GitHub, pull fresh master
5. SESSION HANDOFF — upload to Drive for cross-session continuity
6. FINAL REPORT — green/red checklist + next steps

### Phase 1: STATUS CHECK
Report for both ha-dashboard and ha-config repos:
- Current branch, uncommitted changes, unpushed commits, open PRs
- Scratch files present
- Deployed state mismatches
Ask before proceeding if anything needs action. WAIT for answer.

### Phase 2: UPDATE MEMORY FILES (BEFORE committing)
Scan session for new lessons. Append to .claude/memory/:
- dead_ends.md — failed approaches + what worked instead
- component_compat.md — new cards/components tested (works/broken)
- css_dom_patterns.md — new CSS/DOM selectors, injection points
- deploy_gotchas.md — deploy issues encountered + prevention
If no new lessons, skip. Don't add empty entries.
DO NOT commit yet — these get committed with code in Phase 3.

### Phase 3: COMMIT + PUSH
- Delete scratch files
- git add -A (stages code + memory files together)
- Commit with descriptive message
- Push to origin
- Open PRs if branches don't have them yet

### Phase 4: PR MERGE
- Print merge order with GitHub links (ha-config first, ha-dashboard second)
- WAIT for Chris to confirm merges done on GitHub
- After confirmed: git checkout master && git pull origin master on BOTH repos
- Verify merged commits appear in git log

### Phase 5: SESSION HANDOFF
Upload SESSION_HANDOFF to Drive ha-dashboard folder
(parent ID: 1eNj0A4aKHcihpgiR4xTgRl6CvuBl9H1c) with:
date, what was done, deployed state, open PRs, known issues, next session work

### Phase 6: FINAL REPORT
Print green/red checklist:
- Memory files updated
- All changes committed and pushed
- All PRs merged (or list remaining)
- Both repos on master, up to date
- Session handoff saved
- Deployed state matches git
- No scratch files
- Ready for next session
End with: "Safe to exit" or "Not safe — [reason]"

### Rules:
- NEVER auto-commit without asking
- NEVER merge PRs (guide Chris to merge on GitHub, then verify)
- Save memory files BEFORE committing — they go in the same push
- Always push BEFORE saying "safe to exit"
- Always pull master AFTER PRs are merged
- Flag deployed/git mismatches clearly
- "Safe to exit" means next session starts with just:
  git checkout master && git pull origin master && new branch

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

---

## Layout patterns that work

### Cameras page — `type: panel` + native `grid` card, not `type: sections`
The Cameras view uses `type: panel` with a single HA-native `grid` card
(`columns: 2`, `square: false`) wrapping all 5 `picture-entity` cards.
Each picture-entity gets `aspect_ratio: "16:9"` as a **native property**
— not via `card_mod` CSS.

**Why not `type: sections`:** HA sections sizes children independently
and runs its own height-equalization pass per column. Multiple attempts
on 2026-04-20 to force identical dimensions via `card_mod` CSS on
ha-card (fixed height, `aspect-ratio: 16/9 !important`, object-fit
overrides) all failed — a 2+3 split produced unequal cards because
sections equalize column heights, not cell heights. Panel + grid card
equalizes cells directly.

**Why native `aspect_ratio` and not card_mod:** DOM inspection on
2026-04-20 showed `card_mod`'s `aspect-ratio` rule never reaches
ha-card's computed style inside picture-entity (`getComputedStyle`
reads `"auto"` regardless of what card_mod declares). The built-in
`aspect_ratio: "16:9"` prop goes through HA's internal styling path
and does apply. Reuse this pattern for any uniform camera grid.

### Camera fullscreen popup — picture-elements inside Browser Mod
Tapping a camera card on Home or Cameras opens a fullscreen popup via
`browser_mod.popup` with:

- `size: "fullscreen"`, `dismissable: true`
- Content is a `picture-elements` card whose `ha-card` is forced to
  `width: 100vw; height: 100vh` via `card_mod`
- Overlay buttons (close X, lock/unlock, talk, listen) are
  `custom:button-card` templates positioned with picture-elements
  `style: { top, right | bottom, left }`
- The `cam_close` template uses `:host { position: fixed !important;
  top: 16px !important; right: 16px !important; z-index: 9999 !important }`
  so the X anchors to the viewport corner regardless of feed size
- All popup definitions (3 on Home motion, 5 on Cameras) share the
  same close-button template — changes propagate everywhere via
  `button_card_templates`

Dismissal: tap outside, press Escape, or tap the close X. All three
routes call `browser_mod.close_popup`.

---

## Agent workflow — research before implement

Layout changes, new card types, and HACS installs go through
`.claude/agents/ha-lovelace-expert.md` **before** any JSON is touched.

The rule: if an approach has failed twice, stop and invoke
`ha-lovelace-expert` for a research brief (community forum + HA docs +
GitHub issues) rather than iterating CSS hacks. The 2026-04-20 Cameras
session burned multiple rounds on `card_mod` aspect-ratio fixes before
recognizing that sections + card_mod was the wrong path and switching
to panel + grid card + native `aspect_ratio` prop. Researching first
would have shortened that loop.

Available project agents (`.claude/agents/`):
- `ha-lovelace-expert` — research-first brief producer for Lovelace
  card/layout/HACS questions. Does NOT write code or edit files.
  Consume its brief, then implement.
- Plus the KIS-org agents inherited from `C:\Projects\kintegrated\CLAUDE.md`:
  PM, Product, Dev, QA.
