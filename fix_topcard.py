import json, copy

WEATHER_ICON_DEF = (
    "const weatherIcon = ({sunny:'\u2600\ufe0f','clear-night':'\U0001f319',"
    "partlycloudy:'\u26c5',cloudy:'\u2601\ufe0f',fog:'\U0001f32b\ufe0f',"
    "rainy:'\U0001f327\ufe0f',pouring:'\u26c8\ufe0f',snowy:'\u2744\ufe0f',"
    "'snowy-rainy':'\U0001f328\ufe0f',hail:'\U0001f328\ufe0f',lightning:'\u26a1',"
    "'lightning-rainy':'\u26c8\ufe0f',windy:'\U0001f32c\ufe0f',"
    "'windy-variant':'\U0001f32c\ufe0f',exceptional:'\U0001f321\ufe0f'})"
    "[cond] || '\U0001f324\ufe0f';"
)

# ─── MOBILE ───────────────────────────────────────────────────────
with open('C:/Projects/kintegrated/projects/ha-dashboard/dashboard_mobilev1.json', encoding='utf-8') as f:
    mobile = json.load(f)

top_section = mobile['data']['config']['views'][0]['sections'][0]
top_card = top_section['cards'][0]
label = top_card['label']

# 1. Fix clock font: remove monospace, add tabular-nums
label = label.replace(
    "font-family:monospace;font-size:28px;font-weight:700;letter-spacing:-0.02em;color:#f1f5f9;",
    "font-size:28px;font-weight:700;letter-spacing:-0.02em;color:#f1f5f9;font-variant-numeric:tabular-nums;"
)

# 2. Fix temp font
label = label.replace(
    "font-size:16px;font-weight:700;color:#f1f5f9;font-family:monospace;",
    "font-size:16px;font-weight:700;color:#f1f5f9;font-variant-numeric:tabular-nums;"
)

# 3. Add weatherIcon const after condStr definition
label = label.replace(
    '|| cond || "--";',
    '|| cond || "--";\n  ' + WEATHER_ICON_DEF,
    1
)

# 4. Insert icon span before temp span
OLD_TEMP = "\"<span style='font-size:16px;font-weight:700;color:#f1f5f9;font-variant-numeric:tabular-nums;'>\"+tempStr+"
NEW_TEMP = (
    "\"<span style='font-size:18px;line-height:1;margin-right:2px;'>\"+weatherIcon+\"</span>\""
    "+\"<span style='font-size:16px;font-weight:700;color:#f1f5f9;font-variant-numeric:tabular-nums;'>\"+tempStr+"
)
label = label.replace(OLD_TEMP, NEW_TEMP, 1)

top_card['label'] = label
top_section['sticky'] = True

# Add top section to all other views
for view in mobile['data']['config']['views'][1:]:
    view['sections'].insert(0, copy.deepcopy(top_section))

with open('C:/Projects/kintegrated/projects/ha-dashboard/dashboard_mobilev1.json', 'w', encoding='utf-8') as f:
    json.dump(mobile, f, ensure_ascii=False, indent=2)

print("Mobile done")
print("  clock font OK:", "tabular-nums" in label and "font-family:monospace;font-size:28px" not in label)
print("  temp font OK:", "font-variant-numeric" in label and "font-family:monospace" not in label)
print("  icon added:", "weatherIcon" in label)
for v in mobile['data']['config']['views']:
    first_card_type = v['sections'][0]['cards'][0].get('type','?')
    print(f"  view '{v['title']}': first section sticky={v['sections'][0].get('sticky')}, first card type={first_card_type}")


# ─── TABLET ───────────────────────────────────────────────────────
with open('C:/Projects/kintegrated/projects/ha-dashboard/dashboard_tabletv1.json', encoding='utf-8') as f:
    tablet = json.load(f)

top_section_t = tablet['data']['config']['views'][0]['sections'][0]
top_card_t = top_section_t['cards'][0]
label_t = top_card_t['label']

# 1. Fix clock font
label_t = label_t.replace(
    'font-family:monospace;font-size:36px;font-weight:500;color:#f1f5f9;line-height:1;margin-bottom:2px;',
    'font-size:36px;font-weight:500;color:#f1f5f9;line-height:1;margin-bottom:2px;font-variant-numeric:tabular-nums;'
)

# 2. Fix temp font
label_t = label_t.replace(
    'font-family:monospace;color:#f1f5f9;font-size:15px;',
    'color:#f1f5f9;font-size:15px;font-variant-numeric:tabular-nums;'
)

# 3. Add weatherIcon const after condStr
label_t = label_t.replace(
    "|| cond || '--';",
    "|| cond || '--';\n  " + WEATHER_ICON_DEF,
    1
)

# 4. Insert icon before temp (tablet uses single-quote HTML style)
OLD_TEMP_T = "'<span style=\"color:#f1f5f9;font-size:15px;font-variant-numeric:tabular-nums;\">' + tempStr +"
NEW_TEMP_T = (
    "'<span style=\"font-size:18px;line-height:1;margin-right:2px;\">' + weatherIcon + '</span>' +"
    "'<span style=\"color:#f1f5f9;font-size:15px;font-variant-numeric:tabular-nums;\">' + tempStr +"
)
label_t = label_t.replace(OLD_TEMP_T, NEW_TEMP_T, 1)

top_card_t['label'] = label_t
top_section_t['sticky'] = True
# Update column_span if present
if 'column_span' not in top_section_t:
    top_section_t['column_span'] = 4

for view in tablet['data']['config']['views'][1:]:
    view['sections'].insert(0, copy.deepcopy(top_section_t))

with open('C:/Projects/kintegrated/projects/ha-dashboard/dashboard_tabletv1.json', 'w', encoding='utf-8') as f:
    json.dump(tablet, f, ensure_ascii=False, indent=2)

print("Tablet done")
print("  clock font OK:", "tabular-nums" in label_t and "font-family:monospace;font-size:36px" not in label_t)
print("  temp font OK:", "font-variant-numeric" in label_t and "font-family:monospace" not in label_t)
print("  icon added:", "weatherIcon" in label_t)
for v in tablet['data']['config']['views']:
    first_card_type = v['sections'][0]['cards'][0].get('type','?')
    print(f"  view '{v['title']}': first section sticky={v['sections'][0].get('sticky')}, first card type={first_card_type}")
