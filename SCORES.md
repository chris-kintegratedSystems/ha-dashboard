# KIS Dashboard Design Scorecard
**Scoring date:** April 11, 2026  
**Reviewer:** Product Agent  
**Files evaluated:**
- `mockup.html` — Original (landscape tablet target)
- `mockup-iphone.html` — iPhone portrait (390×844px)
- `mockup-tablet.html` — Tablet portrait (1024×1366px)

---

## Scoring Rubric

| Criterion | Description |
|-----------|-------------|
| **Alignment & Symmetry** | Elements evenly spaced, columns/rows align, no jagged edges |
| **Information Density** | Right amount of info per screen — not sparse or cluttered |
| **Tap Target Quality** | Touch targets ≥ 48px, thumb-reachable, no tiny-only interactive elements |
| **Visual Hierarchy** | Most important info reads first; typography scale is clear |
| **Portrait Optimization** | Exploits vertical space well; no horizontal scroll; no clipping |

---

## Scorecard

| Criterion | Original `mockup.html` | `mockup-iphone.html` | `mockup-tablet.html` |
|-----------|:---:|:---:|:---:|
| Alignment & Symmetry | 7 | 8 | 9 |
| Information Density | 6 | 7 | 9 |
| Tap Target Quality | 5 | 9 | 8 |
| Visual Hierarchy | 7 | 8 | 9 |
| Portrait Optimization | 4 | 9 | 8 |
| **Total /50** | **29** | **41** | **43** |
| **Weighted avg /10** | **5.8** | **8.2** | **8.6** |

---

## Design Analysis

### Original — `mockup.html` — Score: 29/50 (5.8)

**What it does well:**
The original mockup established the design language perfectly — the obsidian + cyan color system, glass morphism cards with top-shine effects, the ambient radial background gradient, and the card accent lines all look excellent on a large landscape screen. The 5-column quick actions row and 2×2 grids for climate and lights are ideal for wide viewports. The media player bar is well-proportioned and the camera 3-col grid fills landscape real estate effectively.

**Where it needs work:**
Portrait mode is the core problem. The single-row status bar is only 60px tall and tries to fit clock, weather, alarm badge, and presence avatars in one row — at 390px wide this clips text and crushes the layout. The 5-column quick-action grid shrinks to 3-col at 520px but even then icons are sub-48px on iPhone. The 2-col security layout is cramped below 480px. Most critically, the climate and lights pages use `height: 100%` grid fills that cause severe clipping in portrait where vertical space is limited — temperature numbers get cut off. Nav labels at 9px are too small for quick readability, and the top-line active indicator (though visually nice) is physically too close to the status bar to draw the eye cleanly on iPhone. The bottom safe-area inset is declared but not visually balanced.

---

### iPhone Portrait — `mockup-iphone.html` — Score: 41/50 (8.2)

**What it does well:**
The 2-row status bar is the headline improvement — clock and alarm badge on Row 1, weather and presence on Row 2, giving each element full legibility at 390px wide without any overflow. The 3×2 quick-actions grid (capped at 3 columns) produces square, easily-tappable scene cards with 80px minimum height — a huge improvement over the original's cramped 5-col layout. All security cards are stacked single-column, so locks and garages each get a full-width row with lock names, subtitles, and badges all readable at a glance. Climate scrolls as a vertical list with 140px min-height cards so the 52px temperature number is never clipped. The camera feed areas use `aspect-ratio: 16/9` ensuring they scale correctly to whatever width is available. The cyan-pill bottom indicator (instead of the original top-line) is ergonomically placed for thumb recognition. Bottom nav has 10px labels and 52px min-height items.

**Where it needs work:**
Information density on the Home page is moderate — the single-column security layout means scrolling to see all 5 cards (3 locks + 2 garages + status). Users will scroll more on this design than on the tablet version. The scenes section only shows 5 cards (the sixth was left out to avoid an orphaned final row of 2). Quick-action cards could benefit from a subtle count badge (e.g. "3 lights on") to reduce the need to navigate to the Lights tab just for status. The bottom nav adds a 5th "Scenes" tab which creates a small navigational redundancy since scenes are already on the Home page — a minor UX inconsistency to resolve.

---

### Tablet Portrait — `mockup-tablet.html` — Score: 43/50 (8.6)

**What it does well:**
This design is the strongest of the three for information density and visual balance. The 72px single-row status bar has ample breathing room — the 32px clock, 24px temperature, and presence avatars all sit comfortably without crowding. Quick actions use the full 5-column row with 96px tall cards and 52px icon wraps, making each scene both immediately legible and easy to tap. The 2-column security layout with 20px card padding looks premium — lock names are 14px, subtitles are 11px, and badges have more generous padding than the original. Climate and lights each use a 2×2 grid with explicit min-height of 200px and 180px respectively, which solves the clipping issue without collapsing to single-column. Camera view uses a 3-col grid where each feed has a full 16:9 aspect ratio — at 1024px width each feed is approximately 320px wide, which is large enough to see detail. The dedicated Scenes tab provides a more expanded scene browser with sub-labels. The 6-item bottom nav (adding "Network") expands utility without crowding — at 1024px wide, 6 tabs still give each item ~170px of horizontal space with comfortable 11px labels.

**Where it needs work:**
The Network tab currently routes back to Home (placeholder behavior) — that page needs its own section in implementation. The 2×2 climate/lights grids will need overflow-y scroll on older iPads where the viewport height is shorter than expected (e.g. iPad Air 9.7", ~1024px tall in portrait). Climate cards at `min-height: 200px` are fine on the Tab S9+ (1366px tall) but may stack awkwardly if total height < 500px content. These are implementation concerns rather than design flaws.

---

## Recommendation

**Use `mockup-tablet.html` as the basis for the primary HA dashboard implementation.**

The tablet portrait design hits the sweet spot: it preserves all of the original's visual premium (glass morphism, gradient backgrounds, card shine effects) while fully solving the portrait layout problems. The 2×2 grids remain rich in information density, the 5-wide quick-actions row is more usable than the cramped original, and the 72px status bar gives the dashboard a confident, spacious feel on a 10"+ screen.

For the iPhone-sized companion view, use `mockup-iphone.html` as the responsive breakpoint target — implementing it via CSS media queries (`max-width: 480px`) rather than as a separate file. The 2-row status bar, single-column security stacking, and scrollable climate/lights pages should be the mobile-first fallback behavior.

**Priority implementation order:**
1. Tablet portrait layout (mockup-tablet.html) — primary production target
2. Add responsive breakpoints from mockup-iphone.html for phones
3. Implement the Network tab content (placeholder in current mockup)
4. Consider merging the Scenes tab shortcut with a long-press gesture on Home page QA cards

---

*Scorecard produced by Product Agent — April 11, 2026*
