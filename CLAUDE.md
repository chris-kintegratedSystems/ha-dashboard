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

### Camera QA — rate-limit-safe testing

Three tools, three purposes. Google Nest SDM enforces **5 QPM per
camera** on `ExecuteDeviceCommand`; rapid camera-view QA iteration
burns the quota and returns 429 RESOURCE_EXHAUSTED that looks like a
code regression (empty cells). Pick the right tool:

**STANDARD QA** (`qa-screenshot.js`, no flags):
- When: final pre-PR sweep, non-camera views, or when you NEED real
  Nest streams
- Cost: triggers Nest stream requests (5 QPM per device limit)
- Rule: never run `cameras` or `home` more than once per minute during
  iteration
- Use targeted mode to limit device count:
  ```bash
  node qa-screenshot.js cameras tabs9plus-landscape,iphone17promax-portrait
  ```

**MOCK MODE** (`qa-screenshot.js --mock-cameras`):
- When: iterating on camera zone layout, card sizing, borders,
  placeholder styling, section headers, grid alignment, day/night
  theming on camera-containing views
- Cost: ZERO Nest API calls. `camera.nest_cam_2` and
  `camera.nest_cam_1` show a static SVG "CAMERA MOCK" placeholder.
  Vivint doorbell and Nanit cameras still load live (no rate limits).
- Works with existing view + device filters:
  ```bash
  node qa-screenshot.js cameras --mock-cameras
  node qa-screenshot.js cameras tabs9plus-landscape --mock-cameras
  node qa-screenshot.js --mock-cameras
  ```
- Use this for all iterative layout work on cameras and home views.
  Run real (no flag) once at the end for final verification.

**FKB BURST** (`qa-camera-burst.js`):
- When: verifying camera loading transitions (crossfade, placeholder
  flash, stream init timing), testing motion-trigger visual
  sequences, checking what the real tablet actually shows
- Cost: ZERO API calls — captures what the Tab S9 is already
  displaying via Fully Kiosk Remote Admin REST
- Use `--trigger doorbell|living_room|bens_room` to fire motion via HA REST
  before the burst, so the capture covers the full
  motion→takeover→stream sequence on the real device
- Use for the crossfade/placeholder flash bug specifically
- Example:
  ```bash
  node qa-camera-burst.js --trigger doorbell --count 12 --interval 500
  ```

**`--camera-delay N`** on `qa-screenshot.js`: when running real
(non-mocked) camera screenshots, spaces out device profiles on
camera-containing views by N ms (default 15000). Only applies when
`--mock-cameras` is NOT set and the sweep includes `cameras` or `home`.
Lets a full 8-device sweep stay under the Nest 5 QPM quota at the cost
of ~2 minutes extra.

**Recommended workflow during camera-related development:**
1. Iterate with `--mock-cameras` for layout (run as many times as you
   want — zero API cost)
2. When layout is right, deploy to Pi
3. Use `qa-camera-burst.js` to verify loading transitions on real
   device
4. One final `qa-screenshot.js` run (no flag) for the PR screenshots

**Rule:** During camera/home view iteration, ALWAYS use
`--mock-cameras` unless explicitly testing live stream rendering. If
you hit a 429 from Nest, STOP Playwright camera runs for 5 minutes,
then resume with `--mock-cameras` only.

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

## Camera Follow Code — Priority Camera State Machine

The priority camera zone on the Home view is driven by a stateful
lock-and-hold system called "Camera Follow Code" (implemented in
ha-config, consumed here via `sensor.priority_camera`).

### How it works
- `sensor.priority_camera` reads from `input_text.priority_camera_lock`
  (passthrough — lock values are physical-room keys, no remapping)
- 7 automations in ha-config's `automations.yaml` (aliased "Camera
  Follow Code — <step>") manage lock acquisition, preemption, and
  release with a 60-second trailing hold
- Doorbell is a hard override — always wins regardless of current lock

### Dashboard wiring
The 5 conditional cards in the priority swipe section each check
`sensor.priority_camera == '<key>'` (doorbell / living_room / bens_room /
nanit_benjamin / nanit_travel). Only one card is visible at a time
(the locked camera).

### kis-nav.js contract
`PRIORITY_CAMERA_MAP` keys (doorbell / living_room / bens_room /
nanit_benjamin / nanit_travel) match `sensor.priority_camera` output
values.

### Slideshow fallback
When `sensor.priority_camera == 'none'`, the existing slideshow logic
(`input_number.priority_slide_index`) takes over unchanged.

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
- Print the ordered list of open PRs with full clickable GitHub URLs
  (ha-config FIRST, ha-dashboard SECOND; oldest PR number first within
  each repo). Every PR reference MUST be a complete
  `https://github.com/chris-kintegratedSystems/<repo>/pull/<number>` URL
  on its own line — never a bare `#9` or repo-only reference. Chris taps
  the URL from the terminal; constructing URLs by hand is not acceptable.
- Get PR data via `gh pr list --repo chris-kintegratedSystems/<repo> --state open --json number,title,url`.
  If `gh` is unavailable, construct URLs from the PR numbers known during
  the session using `https://github.com/chris-kintegratedSystems/<repo>/pull/<number>`.
- Format each PR on its own line:
  `<repo> #<number>: <title>`
  then the full URL on the very next line by itself (no inline URLs).
- Then ask: **"Want me to merge these, or will you do it on GitHub?"**
- If Chris says "merge them" / "merge all" / similar: execute
  `gh pr merge <number> --repo chris-kintegratedSystems/<repo> --merge`
  for each PR in the printed order. Do NOT use `--squash` or `--rebase`
  unless Chris specifies. If any merge fails (conflicts, failing checks,
  branch protection), stop immediately and report which PR failed and
  why — do not proceed to the remaining PRs.
- If Chris says he will do it on GitHub: WAIT for confirmation.
- After all merges are complete (either path): run
  `git checkout master && git pull origin master` on BOTH repos. Verify
  the merged commits appear in `git log`.

### Phase 5: SESSION HANDOFF
Upload SESSION_HANDOFF to Drive ha-dashboard folder
(parent ID: 1eNj0A4aKHcihpgiR4xTgRl6CvuBl9H1c) with:
date, what was done, deployed state, open PRs, known issues, next session work

### Phase 6: FINAL REPORT
Print a GREEN / RED checklist. GREEN is the usual pass list. RED must
contain three subsections, each with full clickable URLs on their own lines
— never inline with other text, always tappable from the terminal.

**GREEN** (pass list, as before):
- Memory files updated
- All changes committed and pushed
- All PRs merged (or list remaining)
- Both repos on master, up to date
- Session handoff saved
- Deployed state matches git
- No scratch files
- Ready for next session

**RED** — three subsections, every URL on its own line:

*(1) PRs to merge* — for every open PR across both repos, print one line
with `<repo> #<number>: <title>` then the full URL on the next line by
itself. Get PR data via `gh pr list --repo chris-kintegratedSystems/<repo>
--state open --json number,title,url` on BOTH repos. If `gh` is
unavailable, construct URLs from known PR numbers using
`https://github.com/chris-kintegratedSystems/<repo>/pull/<number>`.
List ha-config PRs FIRST, ha-dashboard PRs SECOND.

*(2) Latest commits* — for each repo on its current branch, run
`git rev-parse HEAD` and `git log --oneline -1`. Print the branch name,
short hash, and commit message on one line, then the full commit URL on
the next line by itself:
`https://github.com/chris-kintegratedSystems/<repo>/commit/<full-sha>`.

*(3) Drive uploads* — for any file uploaded to Drive during Phase 5,
print the filename on one line, then the full Drive view URL on the next
line by itself:
`https://drive.google.com/file/d/<file-id>/view`.
Use the file `id` returned by `create_file` — do not guess.

End with: "Safe to exit" or "Not safe — [reason]"

### Rules:
- NEVER auto-commit without asking
- PR merges: when Chris says "merge them", "merge all", or similar,
  execute the merges using `gh pr merge <number> --repo
  chris-kintegratedSystems/<repo> --merge` in the correct order —
  ha-config FIRST, ha-dashboard SECOND, oldest PR number first within
  each repo. After all merges complete, run `git checkout master &&
  git pull origin master` on BOTH repos and verify merged commits
  appear in `git log`. If any merge fails (conflicts, failing checks,
  branch protection), stop immediately and report which PR failed.
  If Chris does NOT say to merge, print the clickable URLs and wait
  for him to merge manually on GitHub — same as before.
- Save memory files BEFORE committing — they go in the same push
- Always push BEFORE saying "safe to exit"
- Always pull master AFTER PRs are merged
- Flag deployed/git mismatches clearly
- "Safe to exit" means next session starts with just:
  git checkout master && git pull origin master && new branch

---

## Efficiency Rules

Derived from the Phase 5B retrospective on 2026-04-21. The camera
placeholder fix burned through 6 iterations (v29–v34) and ~90 minutes
because research happened too late, deploys were too frequent, and Nest
rate limits were mistaken for code regressions. These rules keep that
from repeating.

### 1. Research before code — mandatory after first failure, AND with teeth

**Definition of "failure":** any deploy or patch that does not produce
the intended effect on the first QA probe.

**On first failure:**

- STOP. Do not write another code attempt.
- Next message from CC MUST BE a research brief in this format:
  - **a) What was attempted** — the exact change and where it shipped
  - **b) What was expected** — the behavior the change should have
        produced
  - **c) What actually happened** — measurement-backed observation
        (probe output, DOM inspection, console output — not vibes)
  - **d) Hypothesis for root cause** — minimum 3 possibilities,
        ordered by likelihood with reasoning
  - **e) Verification plan** — which DOM/CSS/docs/source will be
        inspected to discriminate between hypotheses
  - **f) Pause for Chris approval** before proceeding to the next
        code attempt
- If CC cannot produce all six sections (e.g. no measurement data
  available, hypotheses feel like guesses), CC is NOT allowed to
  iterate — invoke the `ha-lovelace-expert` subagent instead.

**On second failure of the same problem (even with research):**

- STOP. Invoke the `ha-lovelace-expert` subagent automatically. Do not
  continue iterating on CC's own authority.

**On third failure:**

- HARD STOP. Revert all commits on the current branch since the first
  failure. Close any open PR as superseded. Open a new research-only
  PR with findings and wait for Chris to re-scope the work.

**Deploy counter — kis-nav.js version bumps:**

If the session has shipped a `kis-nav.js` version bump (any v → v+1),
no second bump is permitted in the same session without explicit
Chris approval. This caps the blast radius of speculative fixes that
burn cache-bust versions faster than the debugging loop can converge.

**Historical note:** The v29–v34 camera placeholder arc burned 5
iterations because the root cause (`loadeddata` fires on a black
I-frame, not on visible frames) was not understood until the research
agent ran. Research first would have made v34 the second attempt,
not the sixth. This rule has teeth to prevent that from repeating.

### Probe before deploy — measure the DOM first

Before deploying a layout or CSS fix to the Pi, write a throwaway
Playwright probe script that measures the actual rendered DOM state on
the live dashboard. The probe should answer: what are the computed
styles, rendered dimensions, shadow-root structure, and specificity
winners for the elements you're about to change?

The priority-zone fix (v35→v37) burned 3 deploys because each failure
revealed a new DOM reality that could have been discovered with a
pre-fix probe:

- button-card's adoptedStyleSheets override extra_styles at equal
  specificity (needed !important)
- hui-grid-section lives inside a shadow root (can't query from light
  DOM)
- ResizeObserver attaches before swipe-card's shadow root mounts
  (findSwipeCardEl returns null)

All three would have been caught by a single probe script run BEFORE
writing any fix code.

**Rule:** For any fix that changes CSS, layout, or shadow-DOM
injection targeting the dashboard:

1. Write a scratch probe script (Playwright, authenticated, same
   device profiles as QA)
2. Measure the CURRENT state: element dimensions, computed styles,
   shadow-root children, CSS variable values
3. Identify which rules are winning (check adoptedStyleSheets, inline
   styles, shadow `<style>` elements)
4. THEN write the fix informed by the probe results
5. Delete the probe script before committing (it's scratch — never
   committed)

The probe costs ~30 seconds to run. A failed deploy costs ~5 minutes
plus a version bump. Three failed deploys cost 15 minutes plus 3
version bumps plus 3 HA restarts. Probe first.

### Real-device-first for WebView bugs

Playwright uses desktop Chromium which has different rendering
behavior than Android WebView (Tab S9 FKB) and iOS WKWebView (iPhone
HA Companion). Bugs that only reproduce on real hardware CANNOT be
verified with Playwright.

**Rule:** if a bug involves camera streams, video elements, or shadow
DOM CSS rendering on the Tab S9, use `qa-camera-burst.js` (FKB
screenshots) as the PRIMARY verification tool. Playwright is for
layout regression only, not for confirming stream-related fixes work.

### Deploy budget — max 3 kis-nav.js versions per session

Every deploy cycle costs ~5 minutes (edit, SCP, cache-bust bump in
ha-config, HA restart, FKB refresh, verify). Rapid iteration burns
both time and Nest SDM quota.

**Rule:** never deploy more than 3 kis-nav.js versions in a single
session. If the third attempt does not fix the bug, STOP and run a
research brief. Do not deploy a 4th speculative fix.

### Nest camera quota budget

Google Nest SDM enforces 5 QPM per device on `ExecuteDeviceCommand`.
Rapid deploy-test cycles on camera-containing views burn this quota,
producing 429 RESOURCE_EXHAUSTED errors that look identical to code
regressions.

**Rules:**

- Budget 3 real-stream camera page loads per session max
- After that, use `--mock-cameras` or `qa-camera-burst.js` exclusively
- If you hit 429, do NOT rewrite code. Navigate the tablet away from
  cameras for 90 seconds, then retest the SAME code
- Read the in-UI error banner text before blaming recent CSS/JS changes

### Post-compaction mandatory re-read

Conversation compaction loses failure history and design decisions.
After any compaction event, the FIRST action before proposing any
approach is to re-read all four `.claude/memory/` files:

- `dead_ends.md`
- `component_compat.md`
- `css_dom_patterns.md`
- `deploy_gotchas.md`

Do not rely on compacted context for what has already been tried. If a
proposed approach matches a failed pattern in `dead_ends.md`, use the
noted workaround instead of re-testing.

### Save Everything — minimize back-and-forth

During Phase 1 (STATUS CHECK), auto-resolve obvious cleanup items
instead of asking about each one:

- Delete all scratch files automatically: probe scripts, "(1)"
  duplicate files, prompt drafts, `.lock` files
- KEEP files matching `SESSION_HANDOFF*.md` or `CHAT_CHECKPOINT*.md`
- Only ask about files that are genuinely ambiguous (e.g., a design
  doc that might be a keeper)
- Default to deleting, not asking

### No debug UI in production deploys

Never ship visible debug overlays (badges, pills, `console.log`
noise) to the Pi in a production deploy. If debug output is needed
for diagnosis, add it in a separate commit that is reverted before
the PR. The v27 swipe debug badge required an entire version bump
(v28) just to remove it.

**Rule:** debug instrumentation goes in a local-only scratch file or
behind a flag that is OFF by default and never auto-enabled on real
devices.

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

---

## Working Standard — Research Before Implementing Fixes

To reduce failed attempts and wasted effort, always follow a
research-first rule before implementing any fix.

**Bug that has already failed once:**
- Read the relevant source files before writing any code
- Web search the specific browser/platform behavior involved
- Confirm root cause before implementing

**New bug involving browser, HA internals, or third-party behavior:**
- Web search first, read source files second
- Ask clarifying questions if root cause is ambiguous

**New bug in our own code with a clear root cause:**
- Read source files, web search optional

**Diagnostic-first pattern for stubborn bugs:**
When a fix has failed once, the next step is a diagnostic pass —
instrument the code, log the relevant state, report findings to Chris
BEFORE applying any fix. Never attempt a second fix without confirmed
root cause.

---

## iOS WKWebView Scroll Container — Critical Pattern (2026-04-23)

When kis-nav.js needs to save/restore scroll position on the Home
page, the target element is `hui-sections-view`, NOT `#view`.

Why: `applyDynamicHeaderClearance()` sets `overflow-y: auto` and a
constrained height directly on `hui-sections-view` via inline style.
The sections-view fits exactly inside `#view`'s box, so `#view` never
overflows and `#view.scrollTop` is always 0.

Correct pattern:
  const viewEl = huiShadow.querySelector('#view');
  const sectionsView = viewEl && viewEl.querySelector('hui-sections-view');
  const scrollEl = sectionsView || viewEl;
  const saved = scrollEl.scrollTop;

Additional iOS gotcha: iOS WKWebView 15.4+ silently blocks programmatic
`scrollTop = x` when `scroll-behavior: smooth` is set on the element.
Always force `scrollEl.style.scrollBehavior = 'auto'` before setting
scrollTop, then restore the original value after.

`overflow-anchor` is NOT supported in Safari/WKWebView — the browser
native scroll anchoring fix does not exist on iOS. JS save/restore is
the only option. PC browsers have native scroll anchoring so this bug
only appears on iOS.
