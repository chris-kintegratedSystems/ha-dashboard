with open('C:/Projects/kintegrated/projects/ha-dashboard/mockup-iphone.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Alarm badge id
html = html.replace('<div class="bar-alarm disarmed">', '<div class="bar-alarm disarmed" id="alarm-badge">')

# Weather ids
html = html.replace('<span class="bar-weather-temp">78°</span>', '<span class="bar-weather-temp" id="weather-temp">78°</span>')
html = html.replace('<span class="bar-weather-desc">Dallas · Partly Cloudy</span>', '<span class="bar-weather-desc" id="weather-desc">Dallas · Partly Cloudy</span>')

# Presence avatar ids
html = html.replace(
    '<div class="presence-avatar home" title="Chris — Home">C</div>',
    '<div class="presence-avatar home" id="presence-chris" title="Chris — Home">C</div>'
)
html = html.replace(
    '<div class="presence-avatar home" title="Claire — Home">CL</div>',
    '<div class="presence-avatar home" id="presence-claire" title="Claire — Home">CL</div>'
)

# Scene onclick handlers
html = html.replace('class="qa-card qa-morning" onclick="activateScene(this)"', "class=\"qa-card qa-morning\" onclick=\"haActivateScene('scene.morning_mode', this)\"")
html = html.replace('class="qa-card qa-night active-scene" onclick="activateScene(this)"', "class=\"qa-card qa-night\" onclick=\"haActivateScene('scene.night_mode', this)\"")
html = html.replace('class="qa-card qa-away" onclick="activateScene(this)"', "class=\"qa-card qa-away\" onclick=\"haActivateScene('scene.chill_mode', this)\"")
html = html.replace('class="qa-card qa-welcome" onclick="activateScene(this)"', "class=\"qa-card qa-welcome\" onclick=\"haActivateScene('scene.day_mode', this)\"")
html = html.replace('class="qa-card qa-movie" onclick="activateScene(this)"', "class=\"qa-card qa-movie\" onclick=\"haActivateScene('scene.chill_mode', this)\"")

# Lock cards
html = html.replace(
    'class="card lock-card icon-locked" onclick="toggleLock(this)">\n            <div class="card-accent"></div>\n            <div class="lock-icon-wrap">\n              <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>\n            </div>\n            <div class="lock-info">\n              <div class="lock-name">Front Door</div>',
    'class="card lock-card icon-locked" id="lock-front" data-entity="lock.front_door_lock" onclick="haToggleLock(this)">\n            <div class="card-accent"></div>\n            <div class="lock-icon-wrap">\n              <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>\n            </div>\n            <div class="lock-info">\n              <div class="lock-name">Front Door</div>'
)
html = html.replace(
    'class="card lock-card icon-locked" onclick="toggleLock(this)">\n            <div class="card-accent"></div>\n            <div class="lock-icon-wrap">\n              <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>\n            </div>\n            <div class="lock-info">\n              <div class="lock-name">Back Door</div>',
    'class="card lock-card icon-locked" id="lock-back" data-entity="lock.back_door_lock" onclick="haToggleLock(this)">\n            <div class="card-accent"></div>\n            <div class="lock-icon-wrap">\n              <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>\n            </div>\n            <div class="lock-info">\n              <div class="lock-name">Back Door</div>'
)
html = html.replace(
    'class="card lock-card icon-unlocked state-alert" onclick="toggleLock(this)">',
    'class="card lock-card icon-unlocked state-alert" id="lock-gemelli" data-entity="lock.gemelli_door_lock" onclick="haToggleLock(this)">'
)

# Garage cards
html = html.replace(
    'class="card lock-card icon-closed" onclick="toggleGarage(this)">\n            <div class="card-accent" style="background:var(--green)"></div>\n            <div class="lock-icon-wrap">\n              <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="9" y1="22" x2="9" y2="14"/><line x1="15" y1="22" x2="15" y2="14"/><line x1="9" y1="14" x2="15" y2="14"/></svg>\n            </div>\n            <div class="lock-info">\n              <div class="lock-name">Left Garage</div>',
    'class="card lock-card icon-closed" id="cover-left" data-entity="cover.ratgdov25i_1746c3_door" onclick="haToggleGarage(this)">\n            <div class="card-accent" style="background:var(--green)"></div>\n            <div class="lock-icon-wrap">\n              <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="9" y1="22" x2="9" y2="14"/><line x1="15" y1="22" x2="15" y2="14"/><line x1="9" y1="14" x2="15" y2="14"/></svg>\n            </div>\n            <div class="lock-info">\n              <div class="lock-name">Left Garage</div>'
)
html = html.replace(
    'class="card lock-card icon-closed" onclick="toggleGarage(this)">\n            <div class="card-accent" style="background:var(--green)"></div>\n            <div class="lock-icon-wrap">\n              <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="9" y1="22" x2="9" y2="14"/><line x1="15" y1="22" x2="15" y2="14"/><line x1="9" y1="14" x2="15" y2="14"/></svg>\n            </div>\n            <div class="lock-info">\n              <div class="lock-name">Right Garage</div>',
    'class="card lock-card icon-closed" id="cover-right" data-entity="cover.ratgdov25i_1746b4_door" onclick="haToggleGarage(this)">\n            <div class="card-accent" style="background:var(--green)"></div>\n            <div class="lock-icon-wrap">\n              <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="9" y1="22" x2="9" y2="14"/><line x1="15" y1="22" x2="15" y2="14"/><line x1="9" y1="14" x2="15" y2="14"/></svg>\n            </div>\n            <div class="lock-info">\n              <div class="lock-name">Right Garage</div>'
)

# Climate cards
html = html.replace('<!-- Living Room / Daikin -->\n      <div class="card climate-card">', '<!-- Living Room / Daikin -->\n      <div class="card climate-card" id="climate-daikin" data-entity="climate.daikin">')
html = html.replace('<!-- Gemelli Suite -->\n      <div class="card climate-card">', '<!-- Gemelli Suite -->\n      <div class="card climate-card" id="climate-gemelli" data-entity="climate.gemelli">')
html = html.replace('<!-- Master Bedroom -->\n      <div class="card climate-card">', '<!-- Master Bedroom -->\n      <div class="card climate-card" id="climate-master" data-entity="climate.master">')
html = html.replace('<!-- Upstairs -->\n      <div class="card climate-card">', '<!-- Upstairs -->\n      <div class="card climate-card" id="climate-upstairs" data-entity="climate.upstairs">')

# Climate +/- buttons
html = html.replace('<button class="climate-btn">\u2212</button>', "<button class=\"climate-btn\" onclick=\"haSetClimateTemp(this.closest('.climate-card'), -1)\">\u2212</button>")
html = html.replace('<button class="climate-btn">+</button>', "<button class=\"climate-btn\" onclick=\"haSetClimateTemp(this.closest('.climate-card'), 1)\">+</button>")

# Light chips
chip_map = [
    ('on"><span class="chip-dot"></span>Countertop</span>', 'on" data-entity="light.countertop_lights" onclick="haToggleLight(this)"><span class="chip-dot"></span>Countertop</span>'),
    ('on"><span class="chip-dot"></span>Chandelier</span>', 'on" data-entity="light.kitchen_chandelier" onclick="haToggleLight(this)"><span class="chip-dot"></span>Chandelier</span>'),
    ('off"><span class="chip-dot"></span>Ceiling</span>\n          <span class="light-chip on"><span class="chip-dot"></span>Island</span>', 'off" data-entity="light.kitchen_ceilings_lights" onclick="haToggleLight(this)"><span class="chip-dot"></span>Ceiling</span>\n          <span class="light-chip on" data-entity="light.kitchen_island_light" onclick="haToggleLight(this)"><span class="chip-dot"></span>Island</span>'),
    ('off"><span class="chip-dot"></span>Ceiling</span>\n          <span class="light-chip on"><span class="chip-dot"></span>Lamp 2</span>', 'off" data-entity="light.living_room_ceiling" onclick="haToggleLight(this)"><span class="chip-dot"></span>Ceiling</span>\n          <span class="light-chip on" data-entity="light.living_room_lamp_2" onclick="haToggleLight(this)"><span class="chip-dot"></span>Lamp 2</span>'),
    ('on"><span class="chip-dot"></span>Garage Light</span>', 'on" data-entity="light.garage_light" onclick="haToggleLight(this)"><span class="chip-dot"></span>Garage Light</span>'),
    ('on"><span class="chip-dot"></span>Patio String</span>', 'on" data-entity="light.outdoor_switch_2" onclick="haToggleLight(this)"><span class="chip-dot"></span>Patio String</span>'),
    ('off"><span class="chip-dot"></span>Front Porch</span>', 'off" data-entity="light.front_porch_lights" onclick="haToggleLight(this)"><span class="chip-dot"></span>Front Porch</span>'),
    ('off"><span class="chip-dot"></span>Front Walkway</span>', 'off" data-entity="light.front_walkway_lights" onclick="haToggleLight(this)"><span class="chip-dot"></span>Front Walkway</span>'),
    ('on"><span class="chip-dot"></span>Upper Outdoor</span>', 'on" data-entity="light.upper_outdoor_lights" onclick="haToggleLight(this)"><span class="chip-dot"></span>Upper Outdoor</span>'),
    ('off"><span class="chip-dot"></span>Left Patio</span>', 'off" data-entity="light.left_outdoor_patio_lights" onclick="haToggleLight(this)"><span class="chip-dot"></span>Left Patio</span>'),
    ('on"><span class="chip-dot"></span>Center Patio</span>', 'on" data-entity="light.center_outdoor_patio" onclick="haToggleLight(this)"><span class="chip-dot"></span>Center Patio</span>'),
    ('off"><span class="chip-dot"></span>Benjamin Hatch</span>', 'off" data-entity="light.benjamins_hatch_light" onclick="haToggleLight(this)"><span class="chip-dot"></span>Benjamin Hatch</span>'),
    ('off"><span class="chip-dot"></span>Ben\'s Light</span>', 'off" data-entity="light.bens_light" onclick="haToggleLight(this)"><span class="chip-dot"></span>Ben\'s Light</span>'),
]
for old, new in chip_map:
    html = html.replace('<span class="light-chip ' + old, '<span class="light-chip ' + new)

# Light group All On/Off buttons
html = html.replace('<button class="lg-btn all-on">All On</button>', '<button class="lg-btn" onclick="haLightGroupAll(this, true)">All On</button>')
html = html.replace('<button class="lg-btn">All Off</button>', '<button class="lg-btn" onclick="haLightGroupAll(this, false)">All Off</button>')
html = html.replace('<button class="lg-btn">All On</button>', '<button class="lg-btn" onclick="haLightGroupAll(this, true)">All On</button>')

# Remove static state-on-glow
html = html.replace('class="card light-group-card lg-kitchen state-on-glow"', 'class="card light-group-card lg-kitchen"')
html = html.replace('class="card light-group-card lg-outdoor state-on-glow"', 'class="card light-group-card lg-outdoor"')

# Camera feeds - remove crosshair/placeholder content and add img tags
old_cam_inner = '          <div class="cam-crosshair">\n            <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" stroke-dasharray="4 6"/><line x1="20" y1="2" x2="20" y2="10"/><line x1="20" y1="30" x2="20" y2="38"/><line x1="2" y1="20" x2="10" y2="20"/><line x1="30" y1="20" x2="38" y2="20"/></svg>\n          </div>\n          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.07;">\n            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>\n          </div>\n          '
html = html.replace(old_cam_inner, '          ')

# Fix doorbell cam timestamp id + add img
html = html.replace(
    '          <div class="cam-live-badge"><span class="cam-live-dot"></span>LIVE</div>\n          <div class="cam-timestamp" id="cam-ts-1">3:47:22 PM</div>\n        </div>\n        <div class="cam-info">\n          <span class="cam-name">Doorbell</span>',
    '          <img id="cam-doorbell" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" alt="">\n          <div class="cam-live-badge"><span class="cam-live-dot"></span>LIVE</div>\n          <div class="cam-timestamp" id="cam-ts-1">--:--:-- --</div>\n        </div>\n        <div class="cam-info">\n          <span class="cam-name">Doorbell</span>'
)
html = html.replace(
    '          <div class="cam-live-badge"><span class="cam-live-dot"></span>LIVE</div>\n          <div class="cam-timestamp">3:47:22 PM</div>\n        </div>\n        <div class="cam-info">\n          <span class="cam-name">Izzy</span>',
    '          <img id="cam-izzy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" alt="">\n          <div class="cam-live-badge"><span class="cam-live-dot"></span>LIVE</div>\n          <div class="cam-timestamp">--:--:-- --</div>\n        </div>\n        <div class="cam-info">\n          <span class="cam-name">Izzy</span>'
)
html = html.replace(
    '          <div class="cam-live-badge"><span class="cam-live-dot"></span>LIVE</div>\n          <div class="cam-timestamp">3:47:22 PM</div>\n        </div>\n        <div class="cam-info">\n          <span class="cam-name">Living Room</span>',
    '          <img id="cam-living" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" alt="">\n          <div class="cam-live-badge"><span class="cam-live-dot"></span>LIVE</div>\n          <div class="cam-timestamp">--:--:-- --</div>\n        </div>\n        <div class="cam-info">\n          <span class="cam-name">Living Room</span>'
)

# Media page - add IDs
html = html.replace(
    "      <!-- Benjamin's Hatch Speaker -->\n      <div class=\"card media-card\">",
    "      <!-- Benjamin's Hatch Speaker -->\n      <div class=\"card media-card\" id=\"media-hatch\" data-entity=\"media_player.benjamins_hatch_media_player\">"
)

print("Transforms done")
print("  haToggleLock:", html.count("haToggleLock"))
print("  haToggleGarage:", html.count("haToggleGarage"))
print("  haActivateScene:", html.count("haActivateScene"))
print("  data-entity:", html.count('data-entity='))
print("  climate ids:", html.count('id="climate-'))
print("  cam img:", html.count('<img id="cam-'))

with open('C:/Projects/kintegrated/projects/ha-dashboard/mockup-iphone.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Written OK")
