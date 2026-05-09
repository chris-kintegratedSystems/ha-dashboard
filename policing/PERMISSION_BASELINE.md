# ha-dashboard Permission Baseline

**Status:** Active — read at session start alongside TENANTS.md
**Applies to:** All ha-dashboard development sessions
**Last updated:** 2026-05-09

---

## Purpose

This document instructs CC on **pattern preference** for ha-dashboard work. CC should treat operations on the allowlist as routine and operations on the denylist as requiring explicit operator approval.

---

## Allowlist — operations CC executes routinely without operator preamble

CC may execute these without announcing intent or pausing for confirmation.

### Read operations
- File reads inside `customers/ha-dashboard/` (any path)
- `git status`, `git log`, `git diff`, `git show`, `git ls-files`, `git branch -l`, `git tag -l`, `git remote -v`
- `gh pr list`, `gh pr view`, `gh api` GET requests, `gh run list`
- `node -e "require('./dashboard_mobilev1.json')"` (JSON validation)
- `node qa-screenshot.js` with any flags (`--mock-cameras`, view/device filters)
- `node qa-camera-burst.js` with any flags

### Write operations inside ha-dashboard
- File creation, edit, deletion inside `customers/ha-dashboard/`
- File creation, edit in `.claude/` trees within ha-dashboard
- Scratch/probe scripts in ha-dashboard root (deleted before commit)
- `git add`, `git commit` for tracked files inside ha-dashboard
- `git checkout`, `git switch`, `git branch` (create/delete/rename) on feature branches
- `git stash`, `git stash pop`, `git stash drop`

### Git remote operations on feature branches
- `git push origin <feature-branch>` (any name except `main`, `master`)
- `git push -u origin <feature-branch>` (branch tracking setup)

### GitHub PR operations
- `gh pr create` (any base branch)
- `gh pr edit`, `gh pr comment`, `gh pr ready`

### npm/pnpm operations
- `npm install`, `npm ci`, `pnpm install` (dev dependency management)
- `npm run <script>`, `pnpm run <script>` (project scripts)
- `npx <tool>` for local dev tools

### QA and testing
- Playwright screenshot runs (any device profile, any view filter)
- Mock camera mode (`--mock-cameras`)
- FKB burst captures (`qa-camera-burst.js`)
- JSON schema validation
- Local dev server starts

---

## Denylist — operations that ALWAYS require operator approval

CC must announce, wait for explicit operator approval, and only execute on approval.

### Production Pi operations (T1 gated)
- SCP/SSH to 192.168.51.179 (any command — deploy, restart, file copy)
- `sudo docker restart homeassistant`
- `sudo cp`, `sudo chown`, `sudo chmod` on Pi paths
- `push-dashboards.js` WebSocket deploy
- Any write to Pi filesystem

### HA REST API writes (T1 gated)
- POST/PUT/DELETE to `http://192.168.51.179:8123/api/...`
- Any command that changes live HA state (entity state, service calls)

### Destructive git operations (T1 gated)
- `git push --force` or `--force-with-lease` to `main`/`master`
- Direct commits to `main` (must use feature branches)
- `gh repo delete`
- `rm -rf` of directories containing tracked git history

### Cross-repo operations (T1 gated)
- Any write to files outside `customers/ha-dashboard/`
- Git operations in repos other than ha-dashboard
- Edits to `configuration.yaml` in ha-config (cache-bust bumps)
- Any operation in `kis-meta/`, `ha-config/`, or other project directories

### Dashboard schema changes (T1 gated)
- Deleting views from dashboard JSONs
- Removing button_card_templates that may be referenced elsewhere
- Changes to the `resources` section

### External resource operations
- MCP server invocations for content not named by operator
- Web fetches for arbitrary external content
- Drive API writes

---

## Shell patterns CC should AVOID when alternatives exist

These trigger CLI residual prompts and slow the session:

- **Heredoc-to-temp-file then execute** — prefer `bash -c '...'` inline
- **Multi-line scripts saved to disk** for one-off operations — inline instead
- **`chmod +x` on temp files** — use `bash /path/to/script` instead
- **`cd <path> && <command>` across multiple repos** — prefer `git -C <path>`

---

## CC behavioral instructions

1. **Prefer allowlist patterns.** If multiple ways exist, pick the one in the allowlist.
2. **Don't narrate routine actions.** For allowlist operations, execute and move on.
3. **Batch when possible.** Multiple allowlist operations in one invocation reduce prompt frequency.
4. **When in doubt, surface to operator.** If an operation isn't clearly allowlist or denylist, treat it as denylist.

---

## Maintenance

When new operation patterns emerge mid-session that aren't covered:

- If pattern is reversible and inside ha-dashboard: CC announces once, on approval adds to "session-local allowlist additions" in the audit log, proceeds without future prompts.
- If pattern is novel and affects production: treat as T1, route through standard T1 approval.
- After session: operator reviews audit log, decides which session-local additions become permanent.
