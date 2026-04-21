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

## 2026-04-21: card-mod not actually installed
`/hacsfiles/card-mod` is ABSENT from `lovelace_resources` on this HA.
Lovelace's schema accepts a `card_mod:` key on any card without validating
that card-mod is loaded — so every card_mod block in the dashboard has been
silently ignored for months. Verify before trusting any card_mod fix:
`ssh ... sudo cat /config/.storage/lovelace_resources | grep -i card-mod`.
If you need styling that today relies on card_mod, either (a) install
card-mod as a HACS custom resource, or (b) rewrite using custom:button-card
native styles (our preferred path, since button-card IS installed and a lot
of the dashboard already uses it).
