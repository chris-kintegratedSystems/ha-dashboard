# Stage 5 — Real-Device Sign-Off Checklist

Issue 1: Responsive Breakpoint System
Date: 2026-05-17

Automated FKB captures (Steps 2-3) passed. This checklist is for
Chris's hands-on verification on real devices. Takes ~15 minutes.

For each item: write PASS, FAIL, or NOTE after the dash.
If FAIL: add severity (blocker / regression / cosmetic) and one
sentence describing what's wrong.

FKB captures for comparison: `qa/post-stage5/a9plus/`

---

## Section A: Galaxy Tab A9+ (Wall Kiosk, FKB)

Walk to the tablet (or pick up if at desk).

- [ ] Screen wakes and dashboard is showing —
- [ ] Two-column layout: control panel left, camera right —
- [ ] Scenes row: tap each of the 6 scene buttons. Note any that fail to respond, lag, or show wrong visual feedback —
- [ ] Lock cards: tap Front Door, Back Door, Gemelli. Each should toggle or show lock detail —
- [ ] Garage cards: tap Left Garage, Right Garage. Confirm state chips update —
- [ ] Tap SETTINGS in nav bar. Settings view renders and scrolls smoothly —
- [ ] In Settings, change theme: Day > Night > Auto. Transitions smooth, no flash —
- [ ] In Settings, toggle Kiosk Mode OFF > ON. Sidebar appears then disappears —
- [ ] Tap a color picker row. Color picker UI appears and works —
- [ ] Tap HOME in nav bar. Home renders with correct 2-column layout —
- [ ] Overall: any visible FOUC (white flash, elements jumping before settle)? —

---

## Section B: Chris's iPhone (HA Companion App)

Open HA Companion App. Navigate to mobile-v2 dashboard, Home view.

- [ ] Home loads: 1-column layout, compact density (tight spacing) —
- [ ] Scenes: 3x2 grid, all 6 buttons visible —
- [ ] Touch each scene button — responsive, visual feedback works —
- [ ] Lock cards: tap each. Responds correctly —
- [ ] Garage cards: tap each. State chips update —
- [ ] Navigate to Settings. Compact card padding (tighter than tablet) —
- [ ] Change theme mode in Settings. Transition works on phone —
- [ ] Rotate phone to landscape. View adapts (still 1 column, no overflow) —
- [ ] Rotate back to portrait. Clean rotation, no layout break —
- [ ] Any FOUC visible? —

---

## Section C: Chris's iPad (HA Companion App)

Open HA Companion App. Navigate to mobile-v2 dashboard, Home view.

- [ ] PORTRAIT: 1-column normal-density layout —
- [ ] Rotate to LANDSCAPE: 2-column layout with priority view on right —
- [ ] Rotate back to PORTRAIT: clean rotation, no FOUC or broken layout —
- [ ] Navigate Settings > Home > Settings in landscape. Layout holds —
- [ ] In Settings: rotate during scroll. No scroll-position glitch —
- [ ] Tap a color picker row in both orientations — UI works —

---

## Section D: Claire's iPhone (Optional)

If accessible. Same as Section B but on Claire's device.

- [ ] Home loads with compact density, 1-column —
- [ ] Theme switch works —
- [ ] Any FOUC? —
- [ ] Note: check if Low Power Mode is on (known WKWebView gotcha) —

---

## Summary

After completing all sections, fill in:

- A9+ overall: PASS / FAIL
- iPhone overall: PASS / FAIL
- iPad overall: PASS / FAIL
- Claire's iPhone: PASS / FAIL / SKIPPED
- Blocker count: ___
- Regression count: ___
- Cosmetic count: ___

**Recommendation:** CLOSE Issue 1 / HOLD for fixes / ___
