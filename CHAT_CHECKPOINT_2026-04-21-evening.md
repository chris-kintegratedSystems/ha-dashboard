# CHAT CHECKPOINT — 2026-04-21 (Evening Session)

## Session Summary
Continued KIS ha-dashboard project work focused on motion camera priority logic design and priority display zone layout fixes. Also created efficiency rules prompt and updated the dashboard page map reference.

## Deployed State
- kis-nav.js: v35 (v36 approved but not yet deployed)
- Cache-bust: ?v=35
- Both repos: master/main, clean (as of earlier session)
- Active Claude Code session working on priority zone fix (branch: fix/priority-zone-layout)

## Drive File Registry
| File | Drive ID |
|------|----------|
| CHAT_CHECKPOINT_2026-04-21.md (earlier) | 1HVGAhXjA0B4MHJM-DG8SZc5s48GP7scI |
| SESSION_HANDOFF_2026-04-21.md | 1k6-wrLKzaUF5p_aielsGtzaTaHxPErRu |
| CLAUDE.md | 1nML0YsUfgDRVfXtkLD76HLQeGo_jtpZv |
| Vehicle-Tiles-Design-Plan.md | 1pCdYy5HiRzlFnjnT2ylgmlm5kopO21Kp |
| Motion-Camera-Priority-Logic.md | 1-_-4hHGG1LSXp9yAtsX2B6rRQfN5jbCt |
| Parent folder (ha-dashboard) | 1eNj0A4aKHcihpgiR4xTgRl6CvuBl9H1c |

## Active Design Decisions

### Priority Display Zone — Sizing Logic (NEW THIS SESSION)
- 16:9 camera at right column width determines the zone height (height = width × 9/16)
- LEFT column cards (3 locks + 2 garage) expand vertically to match that height
- Exact bottom-edge match between left and right columns (full label-height subtraction math)
- Content scales to fit the zone — NO clipping, NO overflow hidden
- Zone height is device-responsive: recalculates on device/orientation change, then stays fixed
- Camera feed: 16:9 preserved, fills zone naturally since zone IS 16:9
- Vehicle tiles: 3 separate placeholder cards (Porsche tile 0, Tesla tile 1, Mercedes tile 2), content vertically centered
- Weather tile: single simple placeholder card, content vertically centered, future home for alerts + radar
- Dynamic section header KEPT: extensible label map keyed by slide index (PORSCHE 911 / TESLA MODEL Y / MERCEDES G580 / WEATHER / MOTION DETECTED: [camera])
- Camera is a TILE inside carousel (not a replacement) — user can swipe to vehicles/weather during motion
- 60-second swipe cooldown after user swipes away from camera tile

### Motion Camera Priority Logic (NEW THIS SESSION)
- Hybrid: freshness-based priority for interior cameras + doorbell always overrides
- Sticky delay: 5s → 30s (bridges Nest motion pulse gaps)
- Doorbell (Tier 1): ALWAYS overrides interior cameras immediately
- Interior cameras: freshness-based (camera quiet 60+ seconds = "fresh", beats "stale" cameras with constant motion)
- Fresh beats stale, same-tier fresh = most-recent-wins, both stale = hold current
- 30-second linger after ALL motion clears before carousel returns
- Helpers needed: input_text.active_priority_camera, timer.priority_camera_linger, input_datetime for freshness tracking
- Prompt file: fix-motion-timing-final.md (also uploaded to Drive)

### Efficiency Rules (drafted, prompt ready)
7 rules from Phase 5B retrospective:
1. Research after first failure
2. Real-device-first for WebView bugs
3. Max 3 deploys per session
4. Nest quota budget (3 real loads max)
5. Post-compaction mandatory memory re-read
6. Save Everything auto-cleanup
7. No debug UI in production

NOTE: These rules are ALREADY in CLAUDE.md on the repo (verified by reading Drive copy). The efficiency rules prompt was for adding them, but they're already present.

## Pending Work Queue (ordered)

### In Progress (Claude Code session active)
1. **Priority zone layout fix** — branch fix/priority-zone-layout, v36 approved
   - Prompt: priority-zone-complete.md (latest version with all clarifications)
   - Research phase completed by Claude Code
   - Implementation approved, in progress

### Ready to Run (prompts created this session)
2. **Motion camera priority logic** — freshness + doorbell override + 30s linger
   - Prompt: fix-motion-timing-final.md
   - Drive: 1-_-4hHGG1LSXp9yAtsX2B6rRQfN5jbCt
   - Branch: fix/motion-camera-timing (ha-config only unless sensor output changes)

### From Earlier Session (still valid)
3. Release notes system
4. Nanit cameras (hands-on auth required)
5. Tesla + Wall Connector (hands-on OAuth required)

## Workflow Notes
- Do NOT upload every prompt to Drive — only checkpoints. Chris flagged this as wasting time.
- Keep prompts as simple copy-paste files. No Google Docs creation for prompts.
- Research rules ARE in CLAUDE.md already but trigger "after first failure" — for known-difficult tasks that have failed across sessions, front-load research in the prompt explicitly.

## Vehicles
- Porsche 911 Targa 4 GTS (green, gas)
- Tesla Model Y "Gembella" (anime wrap, EV)
- Mercedes G580 W4E "GEMELLI" (blue, EV)
- Vehicle tiles design plan: Drive ID 1pCdYy5HiRzlFnjnT2ylgmlm5kopO21Kp
