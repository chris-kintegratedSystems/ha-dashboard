# 06 — Agent Definitions

CC subagents configured in
`C:\Projects\kintegrated\customers\ha-dashboard\.claude\agents\`.
Last verified: 2026-05-17.

6 agent files exist. The 4 originally defined agents plus 2 additions
(ha-lovelace-expert for research, ha-policing-agent for governance).

---

## ui-designer

**File:** `.claude/agents/ui-designer.md`
**Role:** Visual design and UX decisions. Layout design, information
hierarchy, component placement, visual feedback patterns, design
specifications.

**Does:** Produces design specs for dashboard-engineer to implement.
Considers day/night modes, tablet landscape and iPhone portrait,
touch ergonomics, glanceability.

**Does NOT:** Write YAML, JSON, or JavaScript. Edit files. Make
deployment decisions.

---

## dashboard-engineer

**File:** `.claude/agents/dashboard-engineer.md`
**Role:** Implements dashboard changes in code. Edits
`dashboard_mobilev1.json`, `kis-nav.js`, custom cards, and dashboard
YAML.

**Key rules enforced:**
- `custom:button-card` with native JS `[[[ ]]]` for all state-driven styling
- Never use card-mod, Bubble Card, Mushroom, or tile+card_mod
- Cache-bust version bumping on every deploy
- CRLF line ending preservation in JSON files
- Surgical edits only — minimum necessary changes

---

## ha-systems

**File:** `.claude/agents/ha-systems.md`
**Role:** HA configuration outside the dashboard. Handles
`configuration.yaml`, `scripts.yaml`, `automations.yaml`, template
sensors, helpers, Z-Wave, integrations, Pi infrastructure.

**Does NOT:** Touch `dashboard_mobilev1.json` or `kis-nav.js`.

**Key entity IDs hardcoded:** covers, locks, alarm, climate, cameras,
person entities.

---

## release-manager

**File:** `.claude/agents/release-manager.md`
**Role:** Git workflow, PR creation, release notes, deploy
coordination across ha-dashboard and ha-config repos. Enforces branch
discipline and clean session handoffs.

**Key responsibilities:**
- Branch naming: `phase<N>/`, `hotfix/`, `feature/`
- PR description template (What Changed, Why, Files, Testing, Screenshots)
- Release notes drafting before version bumps
- Session close checklist (git status clean, repos pushed, handoff written)

---

## ha-lovelace-expert

**File:** `.claude/agents/ha-lovelace-expert.md`
**Role:** Research-first brief producer. Searches HA community forums,
docs, and GitHub issues for proven approaches before implementation.

**When invoked:**
- Before any new card type introduction
- Before any layout restructure
- Before any new HACS component install
- When dashboard-engineer has tried 2+ approaches and neither worked

**Produces:** Implementation brief with recommended approach, known
pitfalls, working examples (with links), alternatives, and testing
notes.

**Does NOT:** Write code or edit files.

---

## ha-policing-agent

**File:** `.claude/agents/ha-policing-agent.md`
**Role:** Governance and policing. Gates CC actions per the policing
framework tenants. Reviews pending actions, evaluates against policy,
writes decisions.

Added as part of the policing framework bootstrap (PRs #52, #53).

---

## Agent workflow pattern

For any dashboard implementation work:

1. **ha-lovelace-expert** researches the approach (produces brief)
2. **ui-designer** produces design spec (if layout/UX changes)
3. **dashboard-engineer** implements (follows brief + spec)
4. **ha-systems** handles HA-side config changes (if needed)
5. **release-manager** manages git, PRs, release notes
6. **ha-policing-agent** validates actions against policy (automated)

The `CLAUDE.md` efficiency rules mandate: if an approach fails twice,
STOP and invoke `ha-lovelace-expert` for research before continuing.
On third failure, hard stop and revert.
