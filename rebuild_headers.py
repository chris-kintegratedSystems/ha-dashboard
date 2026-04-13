import json

# ─────────────────────────────────────────────────────────────────────────────
# Shared JS label (used in both mobile and tablet – font sizes differ via CSS)
# ─────────────────────────────────────────────────────────────────────────────

MOBILE_LABEL = (
    "[[[\n"
    "  const d = new Date();\n"
    "  const hh = d.getHours() % 12 || 12;\n"
    "  const mm = String(d.getMinutes()).padStart(2,'0');\n"
    "  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';\n"
    "  const time = hh + ':' + mm + ' ' + ampm;\n"
    "  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];\n"
    "  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];\n"
    "  const dateStr = days[d.getDay()] + ' \\u00b7 ' + months[d.getMonth()] + ' ' + d.getDate();\n"
    "  const alarmState = (states['alarm_control_panel.kuprycz_home'] || {}).state || 'unknown';\n"
    "  const alarmBg = {disarmed:'rgba(16,208,144,0.12)',armed_away:'rgba(77,142,240,0.10)',armed_home:'rgba(245,166,35,0.10)',arming:'rgba(245,166,35,0.10)',pending:'rgba(245,166,35,0.10)',triggered:'rgba(240,64,96,0.15)'}[alarmState] || 'rgba(100,116,139,0.15)';\n"
    "  const alarmColor = {disarmed:'#10d090',armed_away:'#4d8ef0',armed_home:'#f5a623',arming:'#f5a623',pending:'#f5a623',triggered:'#f04060'}[alarmState] || '#94a3b8';\n"
    "  const alarmLabel = {disarmed:'Disarmed',armed_away:'Armed Away',armed_home:'Armed Home',arming:'Arming',pending:'Pending',triggered:'TRIGGERED'}[alarmState] || 'Unknown';\n"
    "  const wx = states['weather.forecast_home'] || {};\n"
    "  const temp = wx.attributes && wx.attributes.temperature != null ? Math.round(wx.attributes.temperature) + '\\u00b0' : '--\\u00b0';\n"
    "  const cond = wx.state || '';\n"
    "  const condStr = {sunny:'Sunny','clear-night':'Clear',partlycloudy:'Partly Cloudy',cloudy:'Cloudy',fog:'Foggy',rainy:'Rainy',pouring:'Heavy Rain',snowy:'Snowy','snowy-rainy':'Sleet',hail:'Hail',lightning:'Lightning','lightning-rainy':'Storms',windy:'Windy','windy-variant':'Windy',exceptional:'Unusual'}[cond] || cond || '--';\n"
    "  const weatherIcon = {sunny:'\\u2600\\ufe0f','clear-night':'\\ud83c\\udf19',partlycloudy:'\\u26c5',cloudy:'\\u2601\\ufe0f',fog:'\\ud83c\\udf2b\\ufe0f',rainy:'\\ud83c\\udf27\\ufe0f',pouring:'\\u26c8\\ufe0f',snowy:'\\u2744\\ufe0f','snowy-rainy':'\\ud83c\\udf28\\ufe0f',hail:'\\ud83c\\udf28\\ufe0f',lightning:'\\u26a1','lightning-rainy':'\\u26c8\\ufe0f',windy:'\\ud83c\\udf2c\\ufe0f','windy-variant':'\\ud83c\\udf2c\\ufe0f',exceptional:'\\ud83c\\udf21\\ufe0f'}[cond] || '\\ud83c\\udfe1';\n"
    "  function avatar(entity, initials) {\n"
    "    const home = (states[entity] || {}).state === 'home';\n"
    "    return '<div style=\"width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;background:' + (home?'rgba(16,208,144,0.12)':'rgba(74,85,112,0.08)') + ';color:' + (home?'#10d090':'#4a5570') + ';border:1.5px solid ' + (home?'rgba(16,208,144,0.50)':'rgba(74,85,112,0.40)') + ';flex-shrink:0;\">' + initials + '</div>';\n"
    "  }\n"
    "  return '<div style=\"display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto;gap:5px 8px;width:100%;\">' +\n"
    "    '<div style=\"display:flex;flex-direction:column;gap:1px;\">' +\n"
    "      '<span style=\"font-size:26px;font-weight:700;color:#f1f5f9;line-height:1.1;font-variant-numeric:tabular-nums;\">' + time + '</span>' +\n"
    "      '<span style=\"font-size:10px;color:#64748b;letter-spacing:0.04em;\">' + dateStr + '</span>' +\n"
    "    '</div>' +\n"
    "    '<div style=\"display:flex;align-items:center;justify-content:flex-end;\">' +\n"
    "      '<div style=\"display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:100px;font-size:10px;font-weight:600;background:' + alarmBg + ';color:' + alarmColor + ';white-space:nowrap;\">' +\n"
    "        '<span style=\"width:7px;height:7px;border-radius:50%;background:' + alarmColor + ';flex-shrink:0;\"></span>' +\n"
    "        alarmLabel +\n"
    "      '</div>' +\n"
    "    '</div>' +\n"
    "    '<div style=\"display:flex;align-items:center;gap:5px;\">' +\n"
    "      '<span style=\"font-size:18px;line-height:1;\">' + weatherIcon + '</span>' +\n"
    "      '<span style=\"font-size:15px;font-weight:600;color:#f1f5f9;\">' + temp + '</span>' +\n"
    "      '<span style=\"font-size:10px;color:#64748b;\">' + condStr + '</span>' +\n"
    "    '</div>' +\n"
    "    '<div style=\"display:flex;align-items:center;gap:5px;justify-content:flex-end;\">' +\n"
    "      avatar('person.chris', 'C') +\n"
    "      avatar('person.claire', 'CL') +\n"
    "      avatar('person.benjamin', 'B') +\n"
    "    '</div>' +\n"
    "  '</div>';\n"
    "]]]"
)

# Tablet label — same JS but larger sizes
TABLET_LABEL = MOBILE_LABEL \
    .replace("font-size:26px;font-weight:700", "font-size:36px;font-weight:700") \
    .replace("'<span style=\"font-size:10px;color:#64748b;letter-spacing:0.04em;\">'", "'<span style=\"font-size:13px;color:#64748b;letter-spacing:0.04em;\">'") \
    .replace("width:26px;height:26px", "width:36px;height:36px") \
    .replace("font-size:9px;font-weight:700", "font-size:11px;font-weight:700") \
    .replace("'<span style=\"font-size:15px;font-weight:600;color:#f1f5f9;\">'", "'<span style=\"font-size:18px;font-weight:600;color:#f1f5f9;\">'") \
    .replace("'<span style=\"font-size:10px;color:#64748b;\">' + condStr", "'<span style=\"font-size:12px;color:#64748b;\">' + condStr")

# ─────────────────────────────────────────────────────────────────────────────
# Header section dicts
# ─────────────────────────────────────────────────────────────────────────────

MOBILE_HEADER = {
    "title": "",
    "type": "grid",
    "cards": [
        {
            "type": "custom:button-card",
            "show_name": False,
            "show_state": False,
            "show_icon": False,
            "show_label": True,
            "tap_action": {"action": "none"},
            "label": MOBILE_LABEL,
            "styles": {
                "card": [
                    {"background": "#0f1117"},
                    {"border-radius": "16px"},
                    {"padding": "12px 16px"},
                    {"border": "none"},
                    {"box-shadow": "none"},
                    {"margin-bottom": "4px"}
                ],
                "label": [
                    {"width": "100%"},
                    {"white-space": "normal"},
                    {"font-family": "'DM Sans', system-ui, sans-serif"}
                ]
            }
        }
    ],
    "sticky": True
}

TABLET_HEADER = {
    "title": "",
    "type": "grid",
    "column_span": 4,
    "cards": [
        {
            "type": "custom:button-card",
            "show_name": False,
            "show_state": False,
            "show_icon": False,
            "show_label": True,
            "tap_action": {"action": "none"},
            "label": TABLET_LABEL,
            "styles": {
                "card": [
                    {"background": "#0f1117"},
                    {"border-radius": "16px"},
                    {"padding": "12px 16px"},
                    {"border": "none"},
                    {"box-shadow": "none"},
                    {"margin-bottom": "4px"}
                ],
                "label": [
                    {"width": "100%"},
                    {"white-space": "normal"},
                    {"font-family": "'DM Sans', system-ui, sans-serif"}
                ]
            }
        }
    ],
    "sticky": True
}

# ─────────────────────────────────────────────────────────────────────────────
# Process mobile dashboard
# ─────────────────────────────────────────────────────────────────────────────

with open('dashboard_mobilev1.json', 'r', encoding='utf-8') as f:
    mobile = json.load(f)

views = mobile['data']['config']['views']

# Home view (index 0): replace sections[0] with new sticky header
views[0]['sections'][0] = MOBILE_HEADER

# Other views (1-4): prepend sticky header
for i in range(1, 5):
    views[i]['sections'].insert(0, MOBILE_HEADER)

with open('dashboard_mobilev1.json', 'w', encoding='utf-8') as f:
    json.dump(mobile, f, indent=2, ensure_ascii=False)

print("Mobile dashboard saved.")

# ─────────────────────────────────────────────────────────────────────────────
# Process tablet dashboard
# ─────────────────────────────────────────────────────────────────────────────

with open('dashboard_tabletv1.json', 'r', encoding='utf-8') as f:
    tablet = json.load(f)

views = tablet['data']['config']['views']

# Home view (index 0):
#   sections[0] is thin alarm/presence bar — remove it
#   sections[1] (now [0] after removal) is old sticky header — replace
del views[0]['sections'][0]
views[0]['sections'][0] = TABLET_HEADER

# Other views (1-5): sections[0] is existing sticky header — replace
for i in range(1, 6):
    views[i]['sections'][0] = TABLET_HEADER

with open('dashboard_tabletv1.json', 'w', encoding='utf-8') as f:
    json.dump(tablet, f, indent=2, ensure_ascii=False)

print("Tablet dashboard saved.")
print("Done: mobile + tablet headers rebuilt")
