"""
fix-nav.py — Strip card_mod nav bar from every view in dashboard_mobilev1.json
and inject the kis-nav.js Lovelace resource.

The old approach embedded a position:fixed card inside HA's shadow DOM — broken on iOS.
The new approach loads kis-nav.js as a Lovelace resource; it injects the nav bar
directly into document.body, outside all shadow DOM, so fixed positioning always works.
"""
import json, copy, re

SRC = 'C:/Projects/kintegrated/projects/ha-dashboard/dashboard_mobilev1.json'
DST = SRC  # overwrite in place

with open(SRC, 'r', encoding='utf-8') as f:
    data = json.load(f)

cfg = data['data']['config']

# ── 1. Add the Lovelace resource ────────────────────────────────────────────
resource = {'url': '/local/mobile_v1/kis-nav.js', 'type': 'module'}
if 'resources' not in cfg:
    cfg['resources'] = []
# Ensure idempotent — don't add twice
if not any(r.get('url') == resource['url'] for r in cfg['resources']):
    cfg['resources'].insert(0, resource)
    print('Added Lovelace resource')
else:
    print('Resource already present, skipping')

# ── 2. For each view: remove nav bar section + simplify card_mod ────────────
def is_nav_section(section):
    """
    The nav bar is a section containing a single grid card with 5 button-cards
    whose card_mod style contains 'position: fixed'.
    """
    cards = section.get('cards', [])
    if not cards:
        return False
    for card in cards:
        # Direct grid card with fixed positioning
        mod = card.get('card_mod', {}).get('style', '')
        if isinstance(mod, str) and 'position: fixed' in mod:
            return True
        # Nested: outer grid → inner grid with fixed pos
        for inner in card.get('cards', []):
            inner_mod = inner.get('card_mod', {}).get('style', '')
            if isinstance(inner_mod, str) and 'position: fixed' in inner_mod:
                return True
    return False

views = cfg.get('views', [])
nav_removed = 0

for view in views:
    sections = view.get('sections', [])
    original_count = len(sections)
    view['sections'] = [s for s in sections if not is_nav_section(s)]
    removed = original_count - len(view['sections'])
    if removed:
        nav_removed += removed
        print(f'  Removed {removed} nav section(s) from view "{view.get("path", view.get("title", "?"))}"')

    # Simplify view-level card_mod: keep only the padding-bottom, drop contain:none
    cm = view.get('card_mod', {})
    if cm:
        style = cm.get('style', {})
        if isinstance(style, dict):
            dollar = style.get('$', '')
            if dollar:
                # Replace the full override with just the padding-bottom we still need
                style['$'] = '.sections-container { padding-bottom: 80px !important; overflow-y: auto !important; }'
                cm['style'] = style
                view['card_mod'] = cm
        elif isinstance(style, str) and 'contain' in style:
            # Flat string form
            view['card_mod']['style'] = '.sections-container { padding-bottom: 80px !important; }'

print(f'\nRemoved {nav_removed} nav sections total')

# ── 3. Save ──────────────────────────────────────────────────────────────────
with open(DST, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f'Saved to {DST}')
print('Done. Next: SCP to Pi and reload Lovelace.')
