# SESSION HANDOFF — 2026-04-21 (PM) — Efficiency Rules retrospective

## What was done

### PR #12 (ha-dashboard) — efficiency rules in CLAUDE.md — MERGED
Added a new `## Efficiency Rules` section to the ha-dashboard CLAUDE.md,
inserted between "Save Everything" Command and Deploy pattern. Seven
rules derived from the Phase 5B retrospective (v29-v34 camera
placeholder arc, ~90 minutes / 6 iterations):

1. **Research before code — mandatory after first failure.** Next
   action after one failed approach is ALWAYS research, not another
   code attempt.
2. **Real-device-first for WebView bugs.** Playwright ≠ Android
   WebView / iOS WKWebView. Use `qa-camera-burst.js` as primary
   verification for stream-related bugs.
3. **Deploy budget: max 3 kis-nav.js versions per session.** If the
   third attempt fails, STOP and run a research brief.
4. **Nest camera quota budget: 3 real-stream camera page loads max
   per session.** After that, mock-cameras or FKB burst only. 429
   means wait 90s, don't rewrite code.
5. **Post-compaction mandatory re-read.** After any context
   compaction, re-read all four `.claude/memory/` files before
   proposing approaches.
6. **Save Everything minimize back-and-forth.** Phase 1 auto-deletes
   scratch files (probe scripts, "(1)" dupes, prompt drafts, .lock);
   KEEPS `SESSION_HANDOFF*.md` / `CHAT_CHECKPOINT*.md`; only asks
   about genuinely ambiguous files.
7. **No debug UI in production deploys.** Debug overlays go behind
   flags or in reverted commits.

## Deployed state
- No code changes this PR — docs only. Pi state unchanged from earlier
  today (kis-nav.js v34 + configuration.yaml `?v=34`).

## Open PRs
None. PR #12 merged.

## Known issues
- iPhone day-mode verification of kis-nav v34 still pending (Chris to
  confirm on HA Companion App).
- `Vehicle-Tiles-Design-Plan.md` untracked in ha-dashboard — roadmap
  for next phase (Porsche / Tesla Gembella / Mercedes Gemelli).

## Next session work
1. Vehicle tiles phase (Porsche / Tesla Fleet / Mercedes me integrations
   + simple-swipe-card layout). See Vehicle-Tiles-Design-Plan.md.
2. If Chris reports black-flash not fully gone on iPhone: consider
   reducing 3s safety fallback to 1500ms or adding `loadedmetadata`
   + `readyState >= 2` as secondary signal.

## Memory updates in this session
None — the efficiency rules are process policy, went into CLAUDE.md
directly rather than `.claude/memory/` (which is reserved for
technical patterns / dead-ends / compat notes / deploy gotchas).
