# ha-dashboard Policing Tenants

**Status:** Active — enforced by `ha-policing-agent` during dashboard development sessions
**Last updated:** 2026-05-09
**Source:** Adapted from kis-meta/policing/TENANTS.md for ha-dashboard risk profile

---

## Operating model

Three tenants gate CC actions during ha-dashboard sessions. The `ha-policing-agent` subagent enforces them. CC routes around blocks autonomously. After 3 consecutive blocks on apparently-related intent, the agent escalates to operator regardless of whether the next action would otherwise pass.

The policing agent does not propose alternatives on BLOCK. It returns the violated tenant number and reason. CC reasons toward an alternative that doesn't violate any tenant.

**Reversibility is the central principle.** ha-dashboard's safety model relies on git history and the live Pi state as recovery points. Operations that affect the live home automation system or cannot be reversed from git are tenant-gated.

---

## T0: Subagent Consultation Requirement (meta-tenant)

CC must invoke `ha-policing-agent` via the Task tool before any of the following:

1. Any operation classified as irreversible or production-affecting under T1
2. Any SSH/SCP command targeting the Pi (192.168.51.179)
3. Any HA REST API call that writes state (POST/PUT/DELETE to HA endpoints)
4. Any external resource fetch (MCP server invocations, web fetches, Drive API calls) for content that should be local

CC does NOT need to consult for read-only operations: file reads, `git status`, `git log`, `git diff`, `git show`, `gh pr list`, `gh pr view`, `gh api` GET requests, `node -e` JSON validation, `node qa-screenshot.js`, Playwright runs, local npm/pnpm commands, file edits within ha-dashboard/.

**On consultation:**
- CC writes a pending entry to `customers/ha-dashboard/policing/audit-log.yaml` with action_id, intent, command, pre_state
- CC invokes the agent via Task tool, passing the audit log path and the action_id
- Agent reads the entry, evaluates against T1-T2, writes decision to the same entry
- CC reads the decision, executes only on APPROVE

**On launch:** before any other action this session, CC invokes `ha-policing-agent` with intent `"session-start verification"`. If the agent fails to load or reports inability to read TENANTS.md, CC halts and surfaces to operator.

**Violation of T0** = CC executed a T0-required operation without consulting the agent. This is the most severe possible tenant violation because it indicates the policing system itself is being bypassed.

---

## T1: No Production-Affecting Operation Without Operator Approval

The following operations affect the live Pi or are irreversible and require operator approval before execution:

### Production deploys (Pi-affecting)
- SCP/SSH of dashboard JSON to the Pi (`dashboard_mobilev1.json`, `dashboard_tabletv1.json` to `.storage/`)
- SCP/SSH of `kis-nav.js` to the Pi (`/config/www/mobile_v1/`)
- `sudo docker restart homeassistant` or any HA restart command
- Any `sudo` command on the Pi
- Cache-bust version bumps in `configuration.yaml` (ha-config repo)

### HA REST writes
- Any POST/PUT/DELETE to `http://192.168.51.179:8123/api/...`
- WebSocket calls via `push-dashboards.js` (writes Lovelace config to live HA)
- Any `hass-cli` or `ha` CLI write commands

### Destructive git operations
- `git push --force` or `--force-with-lease` to `main` or `master`
- `gh repo delete`
- `rm -rf` of any directory containing tracked git history
- Direct commits to `main` (must use feature branches)

### Cross-repo modifications
- Any write to files outside `customers/ha-dashboard/` (especially `kis-meta/`, `ha-config/`, other customer repos)
- Any `git` operation in a repo other than ha-dashboard

### Schema changes to dashboard config
- Deleting views from `dashboard_mobilev1.json` or `dashboard_tabletv1.json`
- Removing `button_card_templates` entries that may be referenced by other cards
- Changes to the `resources` section (adding/removing HACS cards)

Operations that LOOK risky but are reversible and do NOT require T1 approval:
- Local file edits within ha-dashboard/ (recoverable from git)
- `git rm` of tracked files (recoverable from git history)
- Branch creation/deletion (recoverable from reflog)
- Adding new views, cards, or templates to dashboard JSON
- `node qa-screenshot.js` runs (read-only capture)
- npm/pnpm install of dev dependencies
- Feature branch pushes (`git push origin <feature-branch>`)
- `gh pr create`, `gh pr edit`, `gh pr comment`

**Approval format:** operator approval is granted by an explicit message containing "approve T1: <action_id>" or "approve T1 batch: <action_ids>" for batched related operations.

**On BLOCK:** agent returns "BLOCK T1: <reason>". CC may attempt alternatives that achieve a similar goal without a production-affecting operation. If 3 consecutive related-intent attempts BLOCK, agent escalates to operator.

---

## T2: Credential Leak Prevention

CC must not:

1. Echo, log, print, or include in any tool output the value of any secret: HA tokens, SSH keys, Pi credentials, Nest SDM tokens, FKB passwords, or any environment variable from `.env`
2. Commit `.env` to git
3. Hardcode credentials in dashboard JSON, kis-nav.js, or any committed file
4. Include credential values in QA screenshot filenames, commit messages, or PR descriptions

**Self-enforcement primary:** CC self-polices these behaviors. The agent flags patterns it sees in proposed commands as best-effort.

**Agent flags (best-effort):**
- Commands containing `echo $` followed by known env var names (`HA_TOKEN`, `HA_QA_TOKEN`, `FKB_PASSWORD`, `FKB_IP`, `PI_USER`, `PI_HOST`)
- Any `git add` that includes `.env`
- Commands writing credential-shaped strings to committed files
- SSH commands that embed passwords inline instead of using key auth

**On BLOCK:** agent returns "BLOCK T2: <reason>". CC must rephrase the operation to avoid exposing secrets.

---

## Audit log review (operator responsibility)

The policing agent's effectiveness depends on operator review of `customers/ha-dashboard/policing/audit-log.yaml` after each session. Operator must:

1. Confirm every T0-required operation has a corresponding agent consultation entry
2. Confirm every BLOCK was followed by a different action that received APPROVE (or by escalation to operator)
3. Confirm no operations executed with a BLOCK decision recorded
4. Confirm no T1-T2 violations occurred without explicit approval

**Estimated time per session:** 10-20 minutes.
