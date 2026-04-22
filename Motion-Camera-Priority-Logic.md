Fix motion camera timing and priority switching logic on the Home page.

Context: ha-dashboard and ha-config repos. Read CLAUDE.md and .claude/memory/ files first.

DESIGN OVERVIEW:

The priority display zone on the Home page shows a swipeable carousel 
by default. When motion is detected on a camera, the carousel is replaced 
by that camera's live feed. The switching logic determines which camera 
"wins" the priority zone when multiple cameras have active motion.

Previous logic: "most recent wins" — whichever camera fired last takes 
over. This caused problems: constant motion in a room (kids playing) 
would dominate the priority zone and block more important events 
(doorbell) from showing.

New logic: HYBRID — freshness-based priority for interior cameras, 
with doorbell as a hard override.

FOUR REQUIREMENTS:

REQUIREMENT 1: Sticky delay 30 seconds (up from 5s)
Increase delay_off / auto_off on all three sticky sensors to 30 seconds 
in ha-config configuration.yaml:
- binary_sensor.doorbell_motion_sticky: delay_off 00:00:30
- binary_sensor.living_room_camera_motion_sticky: auto_off 00:00:30
- binary_sensor.izzy_camera_motion_sticky: auto_off 00:00:30

Bridges gaps between Nest motion event pulses during continuous motion.

REQUIREMENT 2: Doorbell always overrides (Tier 1)
The doorbell is a SECURITY camera. When doorbell motion fires, it 
IMMEDIATELY takes over the priority zone regardless of what interior 
camera is currently showing and regardless of freshness calculations.

No freshness check needed for doorbell — it always wins.

REQUIREMENT 3: Interior cameras use freshness-based priority
For camera.living_room_camera and camera.izzy_camera, use a 
"freshness" concept to decide which camera gets priority:

DEFINITION OF FRESH: A camera is "fresh" if it had NO motion for 
at least 60 seconds before the current motion event started. In other 
words, the gap between the previous sticky turning OFF and the current 
sticky turning ON is >= 60 seconds.

A camera is "stale" if it has had ongoing or very recent motion 
(sticky turned off less than 60 seconds ago, or has been continuously 
active).

PRIORITY RULES for interior cameras:
- FRESH motion always beats STALE motion
  (New event in a quiet room beats ongoing activity in a busy room)
- If both are FRESH: most-recent-wins (latest sticky turn-on)
- If both are STALE: hold the current camera (don't switch between 
  two busy rooms)
- If current camera is STALE and a new FRESH event fires on another 
  interior camera: switch to the fresh one
- If current camera is FRESH and a STALE camera fires: stay on current

EXAMPLE SCENARIOS:

Scenario A — Kids in izzy room, doorbell rings:
- Izzy has constant motion (stale after 60s of continuous activity)
- Doorbell fires → doorbell takes over immediately (Tier 1 override)
- Doorbell clears → if izzy still active, switches back to izzy
  (stale but only active camera)

Scenario B — Kids in izzy room, living room motion fires:
- Izzy has constant motion (stale)
- Living room fires after being quiet for 5 minutes (fresh)
- Living room takes over (fresh beats stale)
- Living room has continued motion, becomes stale after 60s
- Izzy room gets a fresh event after a brief pause → izzy takes over

Scenario C — Both rooms quiet, both fire nearly simultaneously:
- Both are fresh → most recent wins
- Normal hold-until-clear within same freshness tier

Scenario D — Izzy room is stale, living room is also stale:
- Both have constant motion → hold whichever is currently showing
- Don't ping-pong between two busy rooms

REQUIREMENT 4: Linger 30 seconds before returning to carousel
When ALL sticky sensors turn off (no active motion anywhere), keep 
showing the LAST active camera feed for 30 additional seconds. This 
gives time to glance at what triggered the motion.

During the 30-second linger:
- Camera feed stays visible
- If ANY camera fires new motion → cancel linger, show that camera
- After 30 seconds with no new motion → priority_camera becomes 
  "none", carousel returns

IMPLEMENTATION:

In ha-config, create these helpers:

1. input_text.active_priority_camera
   Values: doorbell / living_room / izzy / none
   Initial: none
   Tracks which camera currently owns the priority zone.

2. timer.priority_camera_linger  
   Duration: 00:00:30
   Fires when all motion clears. On finish, sets 
   active_priority_camera to "none".

3. input_datetime helpers (or attributes) to track when each interior 
   camera's sticky LAST turned off. Used to calculate freshness.
   Options:
   - input_datetime.last_motion_clear_living_room
   - input_datetime.last_motion_clear_izzy
   Or: store as attributes on the automation/sensor if cleaner.
   The key data point: "when did this camera's sticky last go from 
   on → off?" Compare to now() to determine if >= 60 seconds gap.

4. Automation triggered by state changes on all three sticky sensors 
   AND the linger timer finishing. Implements the full logic:

   ON STICKY TURN ON:
     camera = which camera's sticky turned on
     current = states('input_text.active_priority_camera')

     IF camera is doorbell:
       → set to doorbell, cancel linger timer (Tier 1, always wins)

     ELSE IF current is "none":
       → set to this camera, cancel linger timer

     ELSE IF current is doorbell and doorbell sticky is still on:
       → do nothing (doorbell holds against all interior cameras)

     ELSE IF current is an interior camera with active sticky:
       → calculate freshness of INCOMING camera:
         time_since_last_clear = now() - last_motion_clear_[incoming]
         incoming_is_fresh = time_since_last_clear >= 60 seconds
       → calculate freshness of CURRENT camera:
         current_is_fresh = has current been continuously active < 60s?
         (if current sticky has been on for >= 60s, it's stale)
       → IF incoming is fresh AND current is stale: switch to incoming
       → ELSE: hold current

     ELSE IF current camera's sticky is OFF (cleared):
       → switch to incoming, cancel linger timer

   ON STICKY TURN OFF:
     camera = which camera's sticky turned off
     → record last_motion_clear timestamp for this camera

     IF camera matches active_priority_camera:
       → check if any other sticky is still on
       → IF doorbell still on: switch to doorbell
       → ELSE IF any interior camera still on: switch to it
         (if multiple, pick the freshest one)
       → ELSE: start timer.priority_camera_linger (30 seconds)

   ON LINGER TIMER FINISH:
     → set active_priority_camera to "none"

5. Simplify sensor.priority_camera to read from input_text:
   state: "{{ states('input_text.active_priority_camera') }}"

CRITICAL: sensor.priority_camera output values MUST remain exactly:
doorbell, living_room, izzy, none
kis-nav.js PRIORITY_CAMERA_MAP depends on these exact strings.

TESTING SEQUENCE:
1. All quiet → trigger izzy → shows izzy
2. Izzy active 60+ seconds (stale) → trigger living room (fresh) → 
   switches to living room (fresh beats stale)
3. Living room active → trigger doorbell → switches to doorbell 
   immediately (Tier 1)
4. Clear doorbell, living room still active → switches to living room
5. Clear living room, izzy still active → switches to izzy
6. Clear izzy → linger 30 seconds → carousel returns
7. During linger → trigger doorbell → linger cancels, shows doorbell
8. Both izzy and living room stale (constant motion) → holds 
   whichever is current, no ping-pong
9. Both quiet, both fire within 5 seconds → most recent wins (both fresh)

Branch: fix/motion-camera-timing
ha-config commit: feat: freshness-based motion priority with doorbell override and 30s linger
ha-dashboard commit: only if sensor output format changes (it should NOT)

DO NOT:
- Change sensor.priority_camera output values (doorbell/living_room/izzy/none)
- Modify kis-nav.js PRIORITY_CAMERA_MAP or overlay controller
- Touch placeholder/feed-ready CSS
- Use a freshness threshold other than 60 seconds without asking
- Use sticky delays other than 30 seconds without asking
- Use a linger duration other than 30 seconds without asking
