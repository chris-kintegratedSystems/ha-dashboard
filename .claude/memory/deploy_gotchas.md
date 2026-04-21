# Deploy Gotchas

Append new entries at the bottom. Date-stamp every entry.

---

## 2026-04-20: JSON to wrong path
Dashboard to .storage/ not www/. No .json extension. chown root:root, chmod 644.

## 2026-04-20: Wrong permissions
Always root:root 644 on .storage files.

## 2026-04: kis-nav.js disappeared
frontend.extra_module_url stripped from configuration.yaml. QA fails if missing.

## 2026-04: Cache-bust not bumped
Every kis-nav.js deploy needs ?v=N increment + FKB hard refresh.

## 2026-04: HA restart required for JSON changes
HA caches Lovelace in memory. Always docker restart. Alt: push-dashboards.js.

## 2026-04: Z-Wave battery sensors
Config queued until wake. Physical button press required.

## 2026-04-20: iOS LPM breaks cameras + presence
Use camera_view:auto (HLS fallback). Check LPM before debugging.

## 2026-04-21: Day/night stuck
Relied on HA theme names never registered. Now reads sun.sun directly.

## 2026-04-21: Settings version v16
Implement window.KIS_NAV_VERSION read by button-card template.
