/**
 * KIS App Shell — mobilev2
 * K Integrated Systems | Owner: Chris Kuprycz | Irving TX
 *
 * Persistent UI layer for the KIS mobilev2 dashboard.
 * Manages:
 *   - Day/night theme initialization + CSS variable application
 *   - Top header bar (time/date/weather + presence chips + alarm chip)
 *   - Bottom nav bar (HOME + SETTINGS)
 *   - Mini-player (media_player.benjamins_hatch_media_player)
 *   - Settings badge (security + update attention signals)
 *
 * All UI elements scoped to /mobile-v2/ — do NOT render on /dashboard-mobilev1/.
 *
 * Loaded via frontend.extra_module_url in configuration.yaml.
 * Survives Lovelace page transitions.
 *
 * Paired with: kis-dashboard-v2.yaml (page structure)
 * Depends on: kis-design-tokens.js (sizing constants)
 */

(function () {
  'use strict';

  const VERSION = '62';
  window.KIS_APP_SHELL_VERSION = VERSION;

  const DASHBOARD_PREFIX = '/mobile-v2';
  const NAV_H = 80;
  const MEDIA_PLAYER_ENTITY = 'media_player.benjamins_hatch_media_player';
  const ALARM_ENTITY = 'alarm_control_panel.kuprycz_home';
  const ALARM_CODE_LEN = 4;
  const ALARM_VERIFY_TIMEOUT = 5000;

  // ── Badge signals ──────────────────────────────────────────────────────────
  const BADGE_LOCKS = ['lock.front_door_lock', 'lock.back_door_lock', 'lock.gemelli_door_lock'];
  const BADGE_GARAGES = ['cover.ratgdov25i_1746c3_door', 'cover.ratgdov25i_1746b4_door'];

  // ── Nav pages ──────────────────────────────────────────────────────────────
  const PAGES = [
    { label: 'Home',     icon: 'mdi:home-variant', slug: 'home' },
    { label: 'Settings', icon: 'mdi:cog',          slug: 'settings' },
  ];

  // ── Alarm state colors ─────────────────────────────────────────────────────
  const ALARM_NIGHT = {
    disarmed:   { bg:'rgba(16,208,144,0.12)', color:'#10d090', border:'rgba(16,208,144,0.3)',  label:'Disarmed'   },
    armed_away: { bg:'rgba(77,142,240,0.12)', color:'#4d8ef0', border:'rgba(77,142,240,0.3)',  label:'Armed Away' },
    armed_home: { bg:'rgba(245,166,35,0.12)', color:'#f5a623', border:'rgba(245,166,35,0.3)',  label:'Armed Home' },
    arming:     { bg:'rgba(245,166,35,0.12)', color:'#f5a623', border:'rgba(245,166,35,0.3)',  label:'Arming'     },
    pending:    { bg:'rgba(245,166,35,0.12)', color:'#f5a623', border:'rgba(245,166,35,0.3)',  label:'Pending'    },
    triggered:  { bg:'rgba(240,64,96,0.15)',  color:'#f04060', border:'rgba(240,64,96,0.3)',   label:'TRIGGERED'  },
  };
  const ALARM_DAY = {
    disarmed:   { bg:'rgba(8,148,100,0.10)',  color:'#089464', border:'rgba(8,148,100,0.35)',  label:'Disarmed'   },
    armed_away: { bg:'rgba(45,107,196,0.10)', color:'#2d6bc4', border:'rgba(45,107,196,0.35)', label:'Armed Away' },
    armed_home: { bg:'rgba(192,120,8,0.10)',  color:'#c07808', border:'rgba(192,120,8,0.35)',  label:'Armed Home' },
    arming:     { bg:'rgba(192,120,8,0.10)',  color:'#c07808', border:'rgba(192,120,8,0.35)',  label:'Arming'     },
    pending:    { bg:'rgba(192,120,8,0.10)',  color:'#c07808', border:'rgba(192,120,8,0.35)',  label:'Pending'    },
    triggered:  { bg:'rgba(192,40,64,0.10)',  color:'#c02840', border:'rgba(192,40,64,0.35)',  label:'TRIGGERED'  },
  };
  const ALARM_UNKNOWN_NIGHT = { bg:'rgba(100,116,139,0.15)', color:'#94a3b8', border:'rgba(100,116,139,0.3)',  label:'Unknown' };
  const ALARM_UNKNOWN_DAY   = { bg:'rgba(122,134,152,0.10)', color:'#4a5a72', border:'rgba(122,134,152,0.25)', label:'Unknown' };

  const WX_ICONS  = {sunny:'☀️','clear-night':'🌙',partlycloudy:'⛅',cloudy:'☁️',fog:'🌫️',rainy:'🌧️',pouring:'⛈️',snowy:'❄️','snowy-rainy':'🌨️',hail:'🌨️',lightning:'⚡','lightning-rainy':'⛈️',windy:'🌬️','windy-variant':'🌬️',exceptional:'🌡️'};

  // ── Color helper mapping ──────────────────────────────────────────────────
  // Maps input_text entity suffix → CSS variable name on :root
  const COLOR_MAP = [
    { key: 'primary_accent', css: '--kis-accent' },
    { key: 'bg_app',         css: '--kis-bg-app' },
    { key: 'text_primary',   css: '--kis-text-primary' },
    { key: 'text_secondary', css: '--kis-text-secondary' },
    { key: 'success',        css: '--kis-green' },
    { key: 'warning',        css: '--kis-orange' },
    { key: 'error',          css: '--kis-red' },
    { key: 'info',           css: '--kis-blue' },
    { key: 'scene_active',   css: '--kis-scene-active' },
    { key: 'section_label',  css: '--kis-section-label' },
  ];

  // ── Factory defaults (match kis-day.yaml / kis-night.yaml) ────────────────
  const FACTORY = {
    day: {
      primary_accent: '#0088a8',
      bg_app:         '#f0f2f5',
      text_primary:   '#1a2030',
      text_secondary: '#4a5a72',
      success:        '#089464',
      warning:        '#c07808',
      error:          '#c02840',
      info:           '#2d6bc4',
      scene_active:   '#c07808',
      section_label:  '#7a8698',
    },
    night: {
      primary_accent: '#00d4f0',
      bg_app:         '#070910',
      text_primary:   '#eef2f8',
      text_secondary: '#8a9ab8',
      success:        '#10d090',
      warning:        '#f5a623',
      error:          '#f04060',
      info:           '#4d8ef0',
      scene_active:   '#f5a623',
      section_label:  '#4a5570',
    },
  };

  let _hass = null;
  let _currentMode = null; // 'day' or 'night'
  let _updateEntityKeys = [];
  let _entityKeyCount = -1;
  let _rafId = 0;

  // ── Alarm panel local state (UI only — never mirrors entity state) ────────
  let _alarmPanelOpen = false;
  let _alarmKeypadVisible = false;
  let _alarmDigits = [];
  let _alarmError = false;
  let _alarmWaitTimer = null;

  // ── Card registration: forward hass to custom cards ────────────────────────
  const _registeredCards = new Set();
  window.KIS_REGISTER_CARD = (card) => { _registeredCards.add(card); if (_hass) card.hass = _hass; };
  window.KIS_UNREGISTER_CARD = (card) => { _registeredCards.delete(card); };

  // ── Breakpoint Detection Engine ───────────────────────────────────────────
  // Density token values per level (must match KIS_DENSITY in kis-design-tokens.js)
  const DENSITY_TOKENS = {
    compact: {
      '--kis-spacing-h':    '4px',
      '--kis-spacing-b':    '8px',
      '--kis-card-pad-v':   '8px',
      '--kis-card-pad-h':   '10px',
      '--kis-row-h':       '54px',
      '--kis-scene-h':      '44px',
      '--kis-label-fs':     '9px',
      '--kis-name-fs':      '11px',
      '--kis-radius':       '10px',
      '--kis-icon-scene':   '18px',
      '--kis-touch-min':    '44px',
    },
    normal: {
      '--kis-spacing-h':    'clamp(8px, 1vw, 12px)',
      '--kis-spacing-b':    'clamp(12px, 1.5vw, 24px)',
      '--kis-card-pad-v':   '14px',
      '--kis-card-pad-h':   '16px',
      '--kis-row-h':       '80px',
      '--kis-scene-h':      '64px',
      '--kis-label-fs':     '10px',
      '--kis-name-fs':      '14px',
      '--kis-radius':       '14px',
      '--kis-icon-scene':   '26px',
      '--kis-touch-min':    '44px',
    },
  };

  window.KIS_BREAKPOINT = { name: null, columns: 0, density: null, width: 0, height: 0 };

  function classifyBreakpoint(w, h, orient, pointer) {
    const shortDim = Math.min(w, h);
    if (shortDim < 600) {
      return orient === 'landscape'
        ? { name: 'phone-landscape',  columns: 1, density: 'compact', width: w, height: h }
        : { name: 'phone-portrait',   columns: 1, density: 'compact', width: w, height: h };
    }
    if (w >= 1100) {
      return pointer === 'fine'
        ? { name: 'desktop',          columns: 2, density: 'normal', width: w, height: h }
        : { name: 'tablet-landscape', columns: 2, density: 'normal', width: w, height: h };
    }
    return { name: 'tablet-portrait', columns: 1, density: 'normal', width: w, height: h };
  }

  function applyDensityTokens(density) {
    const tokens = DENSITY_TOKENS[density];
    if (!tokens) return;
    let el = document.getElementById('kis-density-vars');
    if (!el) {
      el = document.createElement('style');
      el.id = 'kis-density-vars';
      (document.head || document.documentElement).appendChild(el);
    }
    const vars = Object.entries(tokens).map(([k, v]) => `${k}:${v}`);
    vars.push(`--kis-breakpoint:${window.KIS_BREAKPOINT.name}`);
    el.textContent = `:root{${vars.join(';')}}`;
  }

  function recomputeBreakpoint() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const orient = w >= h ? 'landscape' : 'portrait';
    const pointer = window.matchMedia('(pointer: fine)').matches ? 'fine' : 'coarse';

    const bp = classifyBreakpoint(w, h, orient, pointer);
    const prev = window.KIS_BREAKPOINT.name;
    Object.assign(window.KIS_BREAKPOINT, bp);
    document.body.dataset.kisBp = bp.name;
    applyDensityTokens(bp.density);
    syncWrapperColumns();

    if (prev !== null && prev !== bp.name) {
      for (const card of _registeredCards) {
        if (card._onBreakpointChange) card._onBreakpointChange(bp);
      }
    }
  }

  // Run synchronously on load — zero async dependency
  recomputeBreakpoint();

  window.addEventListener('resize', recomputeBreakpoint);
  if (screen.orientation) {
    screen.orientation.addEventListener('change', recomputeBreakpoint);
  }

  // ── Resolve current theme mode ────────────────────────────────────────────
  function resolveMode(hass) {
    const modeEntity = hass.states['input_select.theme_mode'];
    const mode = modeEntity ? modeEntity.state : 'Auto';
    if (mode === 'Day') return 'day';
    if (mode === 'Night') return 'night';
    // Auto: follow sun
    const sun = hass.states['sun.sun'];
    return (sun && sun.state === 'above_horizon') ? 'day' : 'night';
  }

  // ── Read colors from helpers, fallback to factory ─────────────────────────
  function readColors(hass, mode) {
    const colors = {};
    for (const entry of COLOR_MAP) {
      const entityId = `input_text.kis_${mode}_${entry.key}`;
      const entity = hass.states[entityId];
      if (entity && entity.state && entity.state !== 'unknown' && entity.state.startsWith('#')) {
        colors[entry.key] = entity.state;
      } else {
        colors[entry.key] = FACTORY[mode][entry.key];
      }
    }
    return colors;
  }

  // ── Apply colors as CSS variables on :root ────────────────────────────────
  function applyColors(colors) {
    const root = document.documentElement;
    for (const entry of COLOR_MAP) {
      root.style.setProperty(entry.css, colors[entry.key]);
    }
  }

  // ── Initialize helpers from factory defaults if missing ───────────────────
  async function initializeHelpersIfNeeded(hass) {
    for (const mode of ['day', 'night']) {
      for (const entry of COLOR_MAP) {
        const entityId = `input_text.kis_${mode}_${entry.key}`;
        const entity = hass.states[entityId];
        if (!entity || !entity.state || entity.state === 'unknown' || entity.state === '') {
          try {
            await hass.callService('input_text', 'set_value', {
              entity_id: entityId,
              value: FACTORY[mode][entry.key],
            });
          } catch (e) {
            // Helper may not exist yet (pre-restart); silent fail
          }
        }
      }
    }
  }

  // ── Main theme init ───────────────────────────────────────────────────────
  function initTheme(hass) {
    const mode = resolveMode(hass);
    const colors = readColors(hass, mode);
    applyColors(colors);
    applyDensityTokens(window.KIS_BREAKPOINT.density);
    _currentMode = mode;
  }

  // ── HA connection hook ────────────────────────────────────────────────────
  // Wait for the HA frontend to provide the hass object, then subscribe
  function connectToHA() {
    const doc = document;

    function tryConnect() {
      const haMain = doc.querySelector('home-assistant');
      if (!haMain || !haMain.hass || !haMain.hass.states) {
        requestAnimationFrame(tryConnect);
        return;
      }
      const _mainEl = haMain.shadowRoot?.querySelector('home-assistant-main');
      if (!_mainEl || !_mainEl.shadowRoot) {
        requestAnimationFrame(tryConnect);
        return;
      }

      _hass = haMain.hass;

      // First-boot: seed helpers if needed
      initializeHelpersIfNeeded(_hass);

      // Apply current theme colors
      initTheme(_hass);

      // Watch for hass updates (theme mode, sun, helper changes)
      // Walk the prototype chain to find hass — Lit defines it far up
      // (HassElement, not HomeAssistant), so checking only the immediate
      // prototype misses it, silently skipping the original Lit setter
      // and breaking hass propagation to all HA child components.
      let origDescriptor = null;
      let _proto = Object.getPrototypeOf(haMain);
      while (_proto && !origDescriptor) {
        origDescriptor = Object.getOwnPropertyDescriptor(_proto, 'hass');
        if (!origDescriptor) _proto = Object.getPrototypeOf(_proto);
      }
      let _hassValue = haMain.hass;

      Object.defineProperty(haMain, 'hass', {
        get() { return _hassValue; },
        set(newHass) {
          if (origDescriptor && origDescriptor.set) {
            origDescriptor.set.call(this, newHass);
          }
          _hassValue = newHass;
          _hass = newHass;
          const keyCount = Object.keys(newHass.states).length;
          if (keyCount !== _entityKeyCount) {
            _entityKeyCount = keyCount;
            _updateEntityKeys = Object.keys(newHass.states).filter(k => k.startsWith('update.'));
          }
          // Our instance-level property override shadows Lit's reactive
          // property, breaking its internal propagation to child elements.
          // Explicitly forward hass to home-assistant-main so all
          // downstream panels (config, history, etc.) receive updates.
          const haMainEl = this.shadowRoot?.querySelector('home-assistant-main');
          if (haMainEl) haMainEl.hass = newHass;
          if (!_rafId) {
            _rafId = requestAnimationFrame(() => {
              _rafId = 0;
              onHassUpdate(_hass);
            });
          }
          for (const card of _registeredCards) {
            if (card.isConnected) card.hass = newHass;
            else _registeredCards.delete(card);
          }
        },
        configurable: true,
      });

      // Scan for already-connected kis-* cards that missed connectedCallback registration
      function scanForCards() {
        const KIS_TAGS = ['kis-scenes', 'kis-control-panel', 'kis-settings', 'kis-priority-view'];
        function walk(root, depth) {
          if (depth > 20) return;
          for (const tag of KIS_TAGS) {
            root.querySelectorAll(tag).forEach(el => {
              if (!_registeredCards.has(el)) {
                _registeredCards.add(el);
                el.hass = _hass;
              }
            });
          }
          root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) walk(el.shadowRoot, depth + 1);
          });
        }
        walk(document, 0);
      }
      setTimeout(scanForCards, 1000);
      setTimeout(scanForCards, 3000);
      setTimeout(scanForCards, 6000);
    }

    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', tryConnect);
    } else {
      tryConnect();
    }
  }

  let _prevSun = null;
  let _prevThemeMode = null;

  function onHassUpdate(hass) {
    const sun = hass.states['sun.sun'];
    const themeMode = hass.states['input_select.theme_mode'];

    const sunState = sun ? sun.state : null;
    const tmState = themeMode ? themeMode.state : null;

    // Only re-apply if mode-relevant state changed
    if (sunState !== _prevSun || tmState !== _prevThemeMode) {
      _prevSun = sunState;
      _prevThemeMode = tmState;
      initTheme(hass);
    }

    const kioskState = hass.states['input_boolean.kiosk_mode']?.state ?? null;
    if (kioskState !== _prevKiosk && onV2Dashboard()) syncKioskMode(hass);
  }

  // ── Expose for other cards ────────────────────────────────────────────────
  window.KIS_THEME = {
    getMode: () => _currentMode,
    getFactory: () => FACTORY,
    getColorMap: () => COLOR_MAP,
    reapply: () => { if (_hass) initTheme(_hass); },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Persistent UI: Header, Nav, Mini-Player, Badge ────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  function onV2Dashboard() {
    return window.location.pathname.startsWith(DASHBOARD_PREFIX);
  }

  function getActiveSlug() {
    const match = window.location.pathname.match(/\/mobile-v2\/(\w+)/);
    return match ? match[1] : 'home';
  }

  function navigateV2(slug) {
    const path = `${DASHBOARD_PREFIX}/${slug}`;
    window.history.pushState(null, '', path);
    window.dispatchEvent(new CustomEvent('location-changed', { bubbles: true, composed: true }));
  }

  function getState(hass, entity) {
    return hass && hass.states && hass.states[entity];
  }

  function personState(hass, entity) {
    const ent = getState(hass, entity);
    if (!ent) return 'unknown';
    return ent.state === 'home' ? 'home' : 'away';
  }

  // ── CSS for persistent UI ──────────────────────────────────────────────────
  const SHELL_CSS = `
    /* ── Top header ── */
    #kis-v2-header {
      position: fixed !important;
      top: 0 !important; left: 0 !important; right: 0 !important;
      z-index: 10000001 !important;
      background: rgba(7,9,16,0.92);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      backdrop-filter: blur(20px) saturate(180%);
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; padding: 0 16px;
      padding-top: calc(env(safe-area-inset-top, 0px));
      min-height: 68px; box-sizing: border-box;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      -webkit-transform: translateZ(0); transform: translateZ(0);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif;
    }
    #kis-v2-header[hidden] { display: none !important; }
    #kis-v2-header .kh-left { display: flex; align-items: center; gap: 12px; flex-shrink: 0; min-height: 40px; }
    #kis-v2-header .kh-clock-wrap { display: flex; flex-direction: column; line-height: 1; justify-content: center; }
    #kis-v2-header .kh-clock { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: #eef2f8; font-variant-numeric: tabular-nums; line-height: 1; }
    #kis-v2-header .kh-ampm { font-size: 11px; font-weight: 600; color: #8a9ab8; vertical-align: baseline; }
    #kis-v2-header .kh-date { font-size: 9px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #4a5570; margin-top: 2px; }
    #kis-v2-header .kh-right { display: flex; align-items: center; gap: 6px; flex-shrink: 1; min-width: 0; min-height: 40px; overflow-x: auto; scrollbar-width: none; }
    #kis-v2-header .kh-weather { display: flex; align-items: center; gap: 5px; }
    #kis-v2-header .kh-weather-icon { font-size: 16px; line-height: 1; }
    #kis-v2-header .kh-weather-temp { font-size: 14px; font-weight: 700; color: #f1f5f9; font-variant-numeric: tabular-nums; }
    #kis-v2-header .kh-right::-webkit-scrollbar { display: none; }
    #kis-v2-header .kh-person-pill { display: flex; align-items: center; gap: 4px; padding: 3px 8px 3px 5px; border-radius: 14px; background: rgba(16,21,31,0.72); border: 1px solid rgba(255,255,255,0.06); white-space: nowrap; flex-shrink: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    #kis-v2-header .kh-pdot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
    #kis-v2-header .kh-pdot.home { background: #10d090; box-shadow: 0 0 4px #10d090; }
    #kis-v2-header .kh-pdot.away { background: #4d8ef0; }
    #kis-v2-header .kh-pdot.unknown { background: #4a5570; }
    #kis-v2-header .kh-pname { font-size: 10px; font-weight: 600; color: #eef2f8; }
    #kis-v2-header .kh-alarm { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 16px; border: 1px solid rgba(100,116,139,0.3); font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; color: #94a3b8; background: rgba(100,116,139,0.15); flex-shrink: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    #kis-v2-header .kh-alarm-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; display: inline-block; flex-shrink: 0; animation: kh-pulse 2s ease-in-out infinite; }
    @keyframes kh-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.7); } }

    /* Header day mode */
    #kis-v2-header[data-kis-day] { background: rgba(255,255,255,0.96); border-bottom: 1px solid rgba(0,0,0,0.04); box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03); }
    #kis-v2-header[data-kis-day] .kh-clock { color: #1a2030; }
    #kis-v2-header[data-kis-day] .kh-ampm { color: #4a5a72; }
    #kis-v2-header[data-kis-day] .kh-date { color: #7a8698; }
    #kis-v2-header[data-kis-day] .kh-weather-temp { color: #1a2030; }
    #kis-v2-header[data-kis-day] .kh-person-pill { background: rgba(255,255,255,0.88); border-color: rgba(0,0,0,0.05); }
    #kis-v2-header[data-kis-day] .kh-pdot.home { background: #089464; box-shadow: 0 0 4px #089464; }
    #kis-v2-header[data-kis-day] .kh-pdot.away { background: #2d6bc4; }
    #kis-v2-header[data-kis-day] .kh-pdot.unknown { background: #7a8698; }
    #kis-v2-header[data-kis-day] .kh-pname { color: #1a2030; }

    /* ── Alarm panel ── */
    #kis-alarm-backdrop {
      position: fixed; inset: 0; z-index: 10000002;
      background: rgba(0,0,0,0.6);
      opacity: 0; transition: opacity 0.2s ease;
      pointer-events: none;
    }
    #kis-alarm-backdrop.kap-open { opacity: 1; pointer-events: auto; }
    #kis-alarm-panel {
      position: fixed; z-index: 10000003;
      top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.92);
      width: 320px; background: rgba(16,21,31,0.95);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 24px;
      padding: 32px 28px; box-sizing: border-box;
      -webkit-backdrop-filter: blur(24px) saturate(200%);
      backdrop-filter: blur(24px) saturate(200%);
      box-shadow: 0 16px 64px rgba(0,0,0,0.5);
      opacity: 0;
      transition: transform 0.2s ease, opacity 0.2s ease;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }
    #kis-alarm-panel.kap-open { transform: translate(-50%, -50%) scale(1); opacity: 1; pointer-events: auto; }
    #kis-alarm-panel[hidden] { display: none !important; }
    .kap-state-label { display: block; font-size: 20px; font-weight: 700; color: #eef2f8; text-align: center; }
    .kap-state-time { display: block; font-size: 12px; font-weight: 500; color: #8a9ab8; text-align: center; margin-top: 4px; letter-spacing: 0.06em; }
    .kap-modes { display: flex; gap: 12px; margin-top: 24px; }
    .kap-mode {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 18px 8px; border-radius: 16px; border: 1.5px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.04); cursor: pointer;
      -webkit-tap-highlight-color: transparent; outline: none;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .kap-mode svg { width: 32px; height: 32px; fill: #8a9ab8; transition: fill 0.15s ease; }
    .kap-mode span { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #8a9ab8; transition: color 0.15s ease; }
    .kap-mode.kap-active { border-color: currentColor; }
    .kap-mode.kap-active svg { fill: currentColor; }
    .kap-mode.kap-active span { color: currentColor; }
    .kap-mode.kap-arming { animation: kap-pulse-mode 1.2s ease-in-out infinite; }
    @keyframes kap-pulse-mode { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    .kap-keypad { margin-top: 24px; }
    .kap-dots { display: flex; justify-content: center; gap: 14px; margin-bottom: 16px; }
    .kap-dot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #4a5570; background: transparent; transition: background 0.1s ease, border-color 0.1s ease; }
    .kap-dot.kap-filled { background: #eef2f8; border-color: #eef2f8; }
    .kap-err-msg { font-size: 12px; font-weight: 600; color: #f04060; text-align: center; margin-bottom: 12px; letter-spacing: 0.06em; opacity: 0; transition: opacity 0.15s ease; }
    .kap-err-msg.kap-show { opacity: 1; }
    .kap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .kap-key {
      height: 64px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04); color: #eef2f8;
      font-size: 24px; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      -webkit-tap-highlight-color: transparent; outline: none;
      transition: background 0.1s ease;
      font-family: inherit;
    }
    .kap-key:active { background: rgba(255,255,255,0.12); }
    .kap-key.kap-fn { font-size: 18px; color: #8a9ab8; }
    .kap-cancel { display: block; width: 100%; margin-top: 16px; padding: 14px; border: none; border-radius: 14px; background: rgba(255,255,255,0.04); color: #8a9ab8; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent; }
    @keyframes kap-shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-8px); } 40%,80% { transform: translateX(8px); } }
    .kap-shake .kap-dots { animation: kap-shake 0.4s ease; }

    /* Alarm panel day mode */
    body:has(#kis-v2-header[data-kis-day]) #kis-alarm-panel { background: rgba(255,255,255,0.96); border-color: rgba(0,0,0,0.08); box-shadow: 0 16px 64px rgba(0,0,0,0.15); }
    body:has(#kis-v2-header[data-kis-day]) .kap-state-label { color: #1a2030; }
    body:has(#kis-v2-header[data-kis-day]) .kap-state-time { color: #4a5a72; }
    body:has(#kis-v2-header[data-kis-day]) .kap-mode { background: rgba(0,0,0,0.03); border-color: rgba(0,0,0,0.08); }
    body:has(#kis-v2-header[data-kis-day]) .kap-mode svg { fill: #4a5a72; }
    body:has(#kis-v2-header[data-kis-day]) .kap-mode span { color: #4a5a72; }
    body:has(#kis-v2-header[data-kis-day]) .kap-dot { border-color: #7a8698; }
    body:has(#kis-v2-header[data-kis-day]) .kap-dot.kap-filled { background: #1a2030; border-color: #1a2030; }
    body:has(#kis-v2-header[data-kis-day]) .kap-key { background: rgba(0,0,0,0.03); border-color: rgba(0,0,0,0.08); color: #1a2030; }
    body:has(#kis-v2-header[data-kis-day]) .kap-key:active { background: rgba(0,0,0,0.08); }
    body:has(#kis-v2-header[data-kis-day]) .kap-key.kap-fn { color: #4a5a72; }
    body:has(#kis-v2-header[data-kis-day]) .kap-cancel { background: rgba(0,0,0,0.03); color: #4a5a72; }

    /* ── Bottom nav ── */
    #kis-v2-nav {
      position: fixed !important;
      bottom: 0 !important; left: 0 !important; right: 0 !important;
      z-index: 9999999 !important;
      display: flex; align-items: stretch;
      background: rgba(7,9,16,0.95);
      border-top: 1px solid rgba(255,255,255,0.06);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      min-height: 68px; box-sizing: border-box;
      -webkit-backdrop-filter: blur(24px) saturate(200%);
      backdrop-filter: blur(24px) saturate(200%);
      -webkit-transform: translateZ(0); transform: translateZ(0);
    }
    #kis-v2-nav[hidden] { display: none !important; }
    #kis-v2-nav .knb-btn {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 4px;
      background: none; border: none; cursor: pointer;
      padding: 12px 4px 10px; margin: 4px 2px;
      color: #4a5570; -webkit-tap-highlight-color: transparent;
      outline: none; position: relative;
      transition: color 0.15s ease, background 0.15s ease;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #kis-v2-nav .knb-btn.knb-active { color: #00d4f0; background: rgba(0,212,240,0.08); }
    #kis-v2-nav .knb-btn ha-icon { --mdc-icon-size: 22px; display: block; }
    #kis-v2-nav .knb-label { font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; line-height: 1; }
    #kis-v2-nav .knb-badge {
      position: absolute; top: 4px; right: calc(50% - 18px);
      min-width: 16px; height: 16px; border-radius: 8px;
      font-size: 10px; font-weight: 700; color: #fff;
      display: flex; align-items: center; justify-content: center;
      padding: 0 4px; border: 2px solid rgba(7,9,16,0.92);
      line-height: 1; pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #kis-v2-nav .knb-badge.urgent { background: #f04060; }
    #kis-v2-nav .knb-badge.advisory { background: #f5a623; }
    #kis-v2-nav .knb-badge[hidden] { display: none; }

    /* Nav day mode */
    #kis-v2-nav[data-kis-day] { background: rgba(255,255,255,0.96); border-top: 1px solid rgba(0,0,0,0.04); box-shadow: 0 -1px 3px rgba(0,0,0,0.06), 0 -4px 12px rgba(0,0,0,0.03); }
    #kis-v2-nav[data-kis-day] .knb-btn { color: #7a8698; }
    #kis-v2-nav[data-kis-day] .knb-btn.knb-active { color: #0088a8; background: rgba(0,136,168,0.08); }
    #kis-v2-nav[data-kis-day] .knb-badge { border-color: rgba(255,255,255,0.96); }
    #kis-v2-nav[data-kis-day] .knb-badge.urgent { background: #c02840; }
    #kis-v2-nav[data-kis-day] .knb-badge.advisory { background: #c07808; }

    /* ── Mini-player ── */
    #kis-v2-player {
      position: fixed !important;
      bottom: ${NAV_H}px !important; left: 0 !important; right: 0 !important;
      z-index: 9999998 !important;
      background: rgba(11,14,23,0.95);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      backdrop-filter: blur(20px) saturate(180%);
      border-top: 1px solid rgba(255,255,255,0.06);
      display: flex; align-items: center;
      padding: 8px 14px; gap: 10px; height: 52px; box-sizing: border-box;
      -webkit-transform: translateZ(0); transform: translateZ(0);
      transition: transform 0.25s ease-out, opacity 0.25s ease-out;
    }
    #kis-v2-player[hidden] { transform: translateY(100%); opacity: 0; pointer-events: none; }
    #kis-v2-player .kmp-art { width: 36px; height: 36px; border-radius: 6px; background: #151c2a; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
    #kis-v2-player .kmp-art img { width: 100%; height: 100%; object-fit: cover; }
    #kis-v2-player .kmp-info { flex: 1; min-width: 0; }
    #kis-v2-player .kmp-track { font-size: 12px; font-weight: 600; color: #eef2f8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #kis-v2-player .kmp-artist { font-size: 10px; color: #8a9ab8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #kis-v2-player .kmp-play { background: none; border: none; cursor: pointer; -webkit-tap-highlight-color: transparent; flex-shrink: 0; padding: 4px; display: flex; align-items: center; }
    #kis-v2-player .kmp-play ha-icon { --mdc-icon-size: 24px; color: #00d4f0; }
    #kis-v2-player .kmp-progress { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: #1c2438; }
    #kis-v2-player .kmp-progress-fill { height: 100%; background: #00d4f0; border-radius: 1px; transition: width 1s linear; }

    /* Mini-player day mode */
    #kis-v2-player[data-kis-day] { background: rgba(255,255,255,0.96); border-top: 1px solid rgba(0,0,0,0.04); box-shadow: 0 -1px 3px rgba(0,0,0,0.06); }
    #kis-v2-player[data-kis-day] .kmp-art { background: #e4e8f0; }
    #kis-v2-player[data-kis-day] .kmp-track { color: #1a2030; }
    #kis-v2-player[data-kis-day] .kmp-artist { color: #4a5a72; }
    #kis-v2-player[data-kis-day] .kmp-play ha-icon { color: #0088a8; }
    #kis-v2-player[data-kis-day] .kmp-progress { background: #c0c8d4; }
    #kis-v2-player[data-kis-day] .kmp-progress-fill { background: #0088a8; }
  `;

  // ── Inject persistent UI ──────────────────────────────────────────────────
  let _uiInjected = false;
  let _headerInitialized = false;
  let _prevMediaState = null;

  function injectUI() {
    if (_uiInjected) return;
    if (document.getElementById('kis-v2-nav')) { _uiInjected = true; return; }

    // Styles
    const styleEl = document.createElement('style');
    styleEl.id = 'kis-v2-styles';
    styleEl.textContent = SHELL_CSS;
    document.head.appendChild(styleEl);

    // Bottom nav
    const nav = document.createElement('div');
    nav.id = 'kis-v2-nav';
    if (!onV2Dashboard()) nav.setAttribute('hidden', '');
    PAGES.forEach(page => {
      const btn = document.createElement('button');
      btn.className = 'knb-btn';
      btn.dataset.slug = page.slug;
      btn.setAttribute('aria-label', page.label);
      btn.innerHTML = `<ha-icon icon="${page.icon}"></ha-icon><span class="knb-label">${page.label}</span>`;
      if (page.slug === 'settings') {
        const badge = document.createElement('span');
        badge.className = 'knb-badge';
        badge.setAttribute('hidden', '');
        btn.appendChild(badge);
      }
      btn.addEventListener('click', () => navigateV2(page.slug));
      nav.appendChild(btn);
    });
    document.body.appendChild(nav);

    // Mini-player
    const player = document.createElement('div');
    player.id = 'kis-v2-player';
    player.setAttribute('hidden', '');
    player.innerHTML = `
      <div class="kmp-art"><ha-icon icon="mdi:music-note"></ha-icon></div>
      <div class="kmp-info">
        <div class="kmp-track">Not playing</div>
        <div class="kmp-artist"></div>
      </div>
      <button class="kmp-play" aria-label="Play/Pause">
        <ha-icon icon="mdi:play"></ha-icon>
      </button>
      <div class="kmp-progress"><div class="kmp-progress-fill" style="width:0%"></div></div>
    `;
    player.querySelector('.kmp-play').addEventListener('click', () => {
      if (!_hass) return;
      const ent = getState(_hass, MEDIA_PLAYER_ENTITY);
      if (!ent) return;
      _hass.callService('media_player', ent.state === 'playing' ? 'media_pause' : 'media_play', {
        entity_id: MEDIA_PLAYER_ENTITY,
      });
    });
    player.addEventListener('click', (e) => {
      if (e.target.closest('.kmp-play')) return;
      const ha = document.querySelector('home-assistant');
      if (ha) {
        ha.dispatchEvent(new CustomEvent('hass-more-info', {
          bubbles: true, composed: true,
          detail: { entityId: MEDIA_PLAYER_ENTITY },
        }));
      }
    });
    document.body.appendChild(player);

    // Top header
    const header = document.createElement('div');
    header.id = 'kis-v2-header';
    if (!onV2Dashboard()) header.setAttribute('hidden', '');
    document.body.appendChild(header);

    // Alarm panel backdrop + panel
    const backdrop = document.createElement('div');
    backdrop.id = 'kis-alarm-backdrop';
    backdrop.addEventListener('click', () => closeAlarmPanel());
    document.body.appendChild(backdrop);

    const alarmPanel = document.createElement('div');
    alarmPanel.id = 'kis-alarm-panel';
    if (!onV2Dashboard()) alarmPanel.setAttribute('hidden', '');
    document.body.appendChild(alarmPanel);

    // Event delegation on header: alarm pill → custom panel, person pills → more-info
    header.addEventListener('click', (e) => {
      if (e.target.closest('.kh-alarm')) {
        toggleAlarmPanel();
        return;
      }
      const personEl = e.target.closest('.kh-person-pill');
      if (personEl && personEl.dataset.entity) {
        const ha = document.querySelector('home-assistant');
        if (ha) {
          ha.dispatchEvent(new CustomEvent('hass-more-info', {
            bubbles: true, composed: true,
            detail: { entityId: personEl.dataset.entity },
          }));
        }
      }
    });

    _uiInjected = true;
    syncV2State();
  }

  // ── Sync visibility + active state ─────────────────────────────────────────
  function syncV2State() {
    const nav = document.getElementById('kis-v2-nav');
    const header = document.getElementById('kis-v2-header');
    const player = document.getElementById('kis-v2-player');
    if (!nav || !header) return;

    const alarmPanel = document.getElementById('kis-alarm-panel');
    if (onV2Dashboard()) {
      nav.removeAttribute('hidden');
      header.removeAttribute('hidden');
      if (alarmPanel) alarmPanel.removeAttribute('hidden');
      const activeSlug = getActiveSlug();
      nav.querySelectorAll('.knb-btn').forEach(btn => {
        btn.classList.toggle('knb-active', btn.dataset.slug === activeSlug);
      });
      renderV2Header();
    } else {
      nav.setAttribute('hidden', '');
      header.setAttribute('hidden', '');
      if (player) player.setAttribute('hidden', '');
      if (alarmPanel) { alarmPanel.setAttribute('hidden', ''); closeAlarmPanel(); }
      _headerInitialized = false;
      _prevMediaState = null;
      // Clean up sidebar inset patch so it doesn't leak into other dashboards
      const ha = document.querySelector('home-assistant');
      const main = ha?.shadowRoot?.querySelector('home-assistant-main');
      const sidebar = main?.shadowRoot?.querySelector('ha-drawer')?.querySelector('ha-sidebar');
      if (sidebar?.shadowRoot) removeShadowCSS(sidebar.shadowRoot, 'kisv2-sidebar-inset-patch');
    }
  }

  // ── Alarm panel ────────────────────────────────────────────────────────────

  const ALARM_MODE_ICONS = {
    armed_home: 'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z',
    armed_away: 'M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z',
    disarmed: 'M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z',
  };
  const ALARM_MODE_LABELS = { armed_home: 'Home', armed_away: 'Away', disarmed: 'Disarm' };
  const ALARM_MODE_COLORS_NIGHT = { armed_home: '#f5a623', armed_away: '#4d8ef0', disarmed: '#10d090' };
  const ALARM_MODE_COLORS_DAY = { armed_home: '#c07808', armed_away: '#2d6bc4', disarmed: '#089464' };

  function alarmRelativeTime(isoStr) {
    if (!isoStr) return '';
    const mins = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + ' min ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
    const days = Math.floor(hrs / 24);
    return days + (days === 1 ? ' day ago' : ' days ago');
  }

  function toggleAlarmPanel() {
    if (_alarmPanelOpen) { closeAlarmPanel(); return; }
    _alarmPanelOpen = true;
    _alarmDigits = [];
    _alarmError = false;
    if (_alarmWaitTimer) { clearTimeout(_alarmWaitTimer); _alarmWaitTimer = null; }
    const ent = _hass ? getState(_hass, ALARM_ENTITY) : null;
    const st = ent ? ent.state : 'unavailable';
    _alarmKeypadVisible = (st === 'armed_home' || st === 'armed_away' || st === 'arming' || st === 'pending');
    renderAlarmPanelContent();
    const backdrop = document.getElementById('kis-alarm-backdrop');
    const panel = document.getElementById('kis-alarm-panel');
    if (backdrop) backdrop.classList.add('kap-open');
    if (panel) requestAnimationFrame(() => panel.classList.add('kap-open'));
  }

  function closeAlarmPanel() {
    _alarmPanelOpen = false;
    _alarmKeypadVisible = false;
    _alarmDigits = [];
    _alarmError = false;
    if (_alarmWaitTimer) { clearTimeout(_alarmWaitTimer); _alarmWaitTimer = null; }
    const backdrop = document.getElementById('kis-alarm-backdrop');
    const panel = document.getElementById('kis-alarm-panel');
    if (backdrop) backdrop.classList.remove('kap-open');
    if (panel) panel.classList.remove('kap-open');
  }

  function renderAlarmPanelContent() {
    const panel = document.getElementById('kis-alarm-panel');
    if (!panel || !_hass) return;
    const ent = getState(_hass, ALARM_ENTITY);
    const state = ent ? ent.state : 'unavailable';
    const lastChanged = ent ? ent.last_changed : null;
    const isDayMode = _currentMode === 'day';
    const modeColors = isDayMode ? ALARM_MODE_COLORS_DAY : ALARM_MODE_COLORS_NIGHT;
    const stateLabel = (ALARM_NIGHT[state] || ALARM_UNKNOWN_NIGHT).label;
    const isArmed = state === 'armed_home' || state === 'armed_away';

    let html = `<div class="kap-state-label">${stateLabel}</div>`;
    html += `<div class="kap-state-time">${alarmRelativeTime(lastChanged)}</div>`;

    if (isArmed || state === 'arming' || state === 'pending' || _alarmKeypadVisible) {
      html += `<div class="kap-keypad${_alarmError ? ' kap-shake' : ''}">`;
      html += '<div class="kap-dots">';
      for (let i = 0; i < ALARM_CODE_LEN; i++) {
        html += `<div class="kap-dot${i < _alarmDigits.length ? ' kap-filled' : ''}"></div>`;
      }
      html += '</div>';
      html += `<div class="kap-err-msg${_alarmError ? ' kap-show' : ''}">Wrong code</div>`;
      html += '<div class="kap-grid">';
      for (let d = 1; d <= 9; d++) html += `<button class="kap-key" data-key="${d}">${d}</button>`;
      html += '<button class="kap-key kap-fn" data-key="back">⌫</button>';
      html += '<button class="kap-key" data-key="0">0</button>';
      html += '<button class="kap-key kap-fn" data-key="enter">✓</button>';
      html += '</div>';
      html += '<button class="kap-cancel">Cancel</button>';
      html += '</div>';
    } else if (state === 'disarmed') {
      html += '<div class="kap-modes">';
      for (const mode of ['armed_home', 'armed_away']) {
        const color = modeColors[mode];
        html += `<button class="kap-mode" data-mode="${mode}" style="">`;
        html += `<svg viewBox="0 0 24 24"><path d="${ALARM_MODE_ICONS[mode]}"/></svg>`;
        html += `<span>${ALARM_MODE_LABELS[mode]}</span></button>`;
      }
      html += '</div>';
    } else {
      html += '<div class="kap-modes">';
      for (const mode of ['armed_home', 'armed_away', 'disarmed']) {
        const isActive = state === mode;
        const isTransitioning = (state === 'arming' && mode === 'armed_home') || (state === 'pending' && mode === 'disarmed');
        const color = modeColors[mode];
        const cls = 'kap-mode' + (isActive ? ' kap-active' : '') + (isTransitioning ? ' kap-arming' : '');
        const style = (isActive || isTransitioning) ? `color:${color}` : '';
        html += `<button class="${cls}" data-mode="${mode}" style="${style}">`;
        html += `<svg viewBox="0 0 24 24"><path d="${ALARM_MODE_ICONS[mode]}"/></svg>`;
        html += `<span>${ALARM_MODE_LABELS[mode]}</span></button>`;
      }
      html += '</div>';
    }

    panel.innerHTML = html;

    panel.onclick = (e) => {
      const modeBtn = e.target.closest('.kap-mode');
      if (modeBtn) { handleAlarmMode(modeBtn.dataset.mode); return; }
      const keyBtn = e.target.closest('.kap-key');
      if (keyBtn) {
        const key = keyBtn.dataset.key;
        if (key === 'back') { handleAlarmBackspace(); }
        else if (key === 'enter') { submitAlarmDisarm(); }
        else { handleAlarmDigit(key); }
        return;
      }
      if (e.target.closest('.kap-cancel')) { closeAlarmPanel(); }
    };
  }

  function updateAlarmPanel() {
    if (!_alarmPanelOpen || !_hass) return;
    const panel = document.getElementById('kis-alarm-panel');
    if (!panel) return;
    const ent = getState(_hass, ALARM_ENTITY);
    const state = ent ? ent.state : 'unavailable';
    const lastChanged = ent ? ent.last_changed : null;
    const stateLabel = (ALARM_NIGHT[state] || ALARM_UNKNOWN_NIGHT).label;

    const labelEl = panel.querySelector('.kap-state-label');
    const timeEl = panel.querySelector('.kap-state-time');
    if (labelEl) labelEl.textContent = stateLabel;
    if (timeEl) timeEl.textContent = alarmRelativeTime(lastChanged);

    if (_alarmWaitTimer && state === 'disarmed') {
      clearTimeout(_alarmWaitTimer);
      _alarmWaitTimer = null;
      closeAlarmPanel();
    }
  }

  function handleAlarmMode(mode) {
    if (!_hass) return;
    const ent = getState(_hass, ALARM_ENTITY);
    const currentState = ent ? ent.state : null;
    if (currentState === mode) return;

    if (mode === 'disarmed') {
      _alarmKeypadVisible = true;
      _alarmDigits = [];
      _alarmError = false;
      renderAlarmPanelContent();
      return;
    }

    const svc = mode === 'armed_home' ? 'alarm_arm_home' : 'alarm_arm_away';
    _hass.callService('alarm_control_panel', svc, { entity_id: ALARM_ENTITY });
    closeAlarmPanel();
  }

  function handleAlarmDigit(d) {
    if (_alarmDigits.length >= ALARM_CODE_LEN) return;
    if (_alarmError) {
      _alarmError = false;
      if (_alarmWaitTimer) { clearTimeout(_alarmWaitTimer); _alarmWaitTimer = null; }
    }
    _alarmDigits.push(d);
    updateAlarmDots();
    if (_alarmDigits.length === ALARM_CODE_LEN) {
      submitAlarmDisarm();
    }
  }

  function handleAlarmBackspace() {
    if (_alarmDigits.length === 0) return;
    if (_alarmError) { _alarmError = false; }
    _alarmDigits.pop();
    updateAlarmDots();
  }

  function updateAlarmDots() {
    const panel = document.getElementById('kis-alarm-panel');
    if (!panel) return;
    panel.querySelectorAll('.kap-dot').forEach((dot, i) => {
      dot.classList.toggle('kap-filled', i < _alarmDigits.length);
    });
    const errEl = panel.querySelector('.kap-err-msg');
    if (errEl) errEl.classList.toggle('kap-show', _alarmError);
    const keypad = panel.querySelector('.kap-keypad');
    if (keypad) keypad.classList.toggle('kap-shake', false);
  }

  function submitAlarmDisarm() {
    if (!_hass || _alarmDigits.length === 0) return;
    const code = _alarmDigits.join('');
    _alarmDigits = [];
    updateAlarmDots();

    _hass.callService('alarm_control_panel', 'alarm_disarm', {
      entity_id: ALARM_ENTITY,
      code: code,
    });

    if (_alarmWaitTimer) clearTimeout(_alarmWaitTimer);
    _alarmWaitTimer = setTimeout(() => {
      _alarmWaitTimer = null;
      const ent = getState(_hass, ALARM_ENTITY);
      if (!ent || ent.state !== 'disarmed') {
        showAlarmError();
      }
    }, ALARM_VERIFY_TIMEOUT);
  }

  function showAlarmError() {
    _alarmError = true;
    _alarmDigits = [];
    const panel = document.getElementById('kis-alarm-panel');
    if (!panel) return;
    const keypad = panel.querySelector('.kap-keypad');
    if (keypad) keypad.classList.add('kap-shake');
    updateAlarmDots();
    const errEl = panel.querySelector('.kap-err-msg');
    if (errEl) errEl.classList.add('kap-show');
    setTimeout(() => {
      _alarmError = false;
      if (errEl) errEl.classList.remove('kap-show');
      if (keypad) keypad.classList.remove('kap-shake');
    }, 1500);
  }

  // ── Header rendering ───────────────────────────────────────────────────────
  function renderV2Header() {
    const bar = document.getElementById('kis-v2-header');
    if (!bar || !_hass) return;

    const isDayMode = _currentMode === 'day';

    // Propagate day mode
    const nav = document.getElementById('kis-v2-nav');
    if (isDayMode) {
      bar.setAttribute('data-kis-day', '');
      if (nav) nav.setAttribute('data-kis-day', '');
    } else {
      bar.removeAttribute('data-kis-day');
      if (nav) nav.removeAttribute('data-kis-day');
    }

    // Clock + date
    const now = new Date();
    const h12 = now.getHours() % 12 || 12;
    const min = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dateStr = DAYS[now.getDay()] + ' · ' + MONTHS[now.getMonth()] + ' ' + now.getDate();

    // Alarm
    const alarmEnt = getState(_hass, ALARM_ENTITY);
    const alarmState = alarmEnt ? alarmEnt.state : null;
    const ALARM_COLORS = isDayMode ? ALARM_DAY : ALARM_NIGHT;
    const alarm = ALARM_COLORS[alarmState] || (isDayMode ? ALARM_UNKNOWN_DAY : ALARM_UNKNOWN_NIGHT);

    // Weather
    const wxEnt = getState(_hass, 'weather.forecast_home');
    const temp = wxEnt && wxEnt.attributes && wxEnt.attributes.temperature;
    const tempStr = temp != null ? Math.round(temp) + '°' : '--°';
    const cond = wxEnt ? wxEnt.state : '';
    const wxIcon = WX_ICONS[cond] || '\u{1f324}️';

    // Presence
    const chrisSt = personState(_hass, 'person.chris');
    const claireSt = personState(_hass, 'person.claire');

    if (!_headerInitialized) {
      bar.innerHTML = `
        <div class="kh-left">
          <div class="kh-clock-wrap">
            <div class="kh-clock"><span data-kis="time">${h12}:${min}</span> <span class="kh-ampm" data-kis="ampm">${ampm}</span></div>
            <div class="kh-date" data-kis="date">${dateStr}</div>
          </div>
          <div class="kh-weather">
            <span class="kh-weather-icon" data-kis="wx-icon">${wxIcon}</span>
            <span class="kh-weather-temp" data-kis="wx-temp">${tempStr}</span>
          </div>
        </div>
        <div class="kh-right">
          <div class="kh-person-pill" data-entity="person.chris"><span class="kh-pdot ${chrisSt}" data-kis="chris-dot"></span><span class="kh-pname">Chris</span></div>
          <div class="kh-person-pill" data-entity="person.claire"><span class="kh-pdot ${claireSt}" data-kis="claire-dot"></span><span class="kh-pname">Claire</span></div>
          <div class="kh-alarm" data-kis="alarm" style="background:${alarm.bg};color:${alarm.color};border-color:${alarm.border};">
            <span class="kh-alarm-dot"></span><span data-kis="alarm-label">${alarm.label}</span>
          </div>
        </div>
      `;
      _headerInitialized = true;
    } else {
      const q = sel => bar.querySelector(sel);

      const timeEl = q('[data-kis="time"]');
      const timeStr = h12 + ':' + min;
      if (timeEl && timeEl.textContent !== timeStr) timeEl.textContent = timeStr;

      const ampmEl = q('[data-kis="ampm"]');
      if (ampmEl && ampmEl.textContent !== ampm) ampmEl.textContent = ampm;

      const dateEl = q('[data-kis="date"]');
      if (dateEl && dateEl.textContent !== dateStr) dateEl.textContent = dateStr;

      const wxIconEl = q('[data-kis="wx-icon"]');
      if (wxIconEl && wxIconEl.textContent !== wxIcon) wxIconEl.textContent = wxIcon;

      const wxTempEl = q('[data-kis="wx-temp"]');
      if (wxTempEl && wxTempEl.textContent !== tempStr) wxTempEl.textContent = tempStr;

      const alarmEl = q('[data-kis="alarm"]');
      if (alarmEl) {
        alarmEl.style.background = alarm.bg;
        alarmEl.style.color = alarm.color;
        alarmEl.style.borderColor = alarm.border;
        const labelEl = q('[data-kis="alarm-label"]');
        if (labelEl && labelEl.textContent !== alarm.label) labelEl.textContent = alarm.label;
      }

      const chrisDot = q('[data-kis="chris-dot"]');
      if (chrisDot) chrisDot.className = 'kh-pdot ' + chrisSt;
      const claireDot = q('[data-kis="claire-dot"]');
      if (claireDot) claireDot.className = 'kh-pdot ' + claireSt;
    }

    updateV2Badge(_hass);
    updateV2MiniPlayer(_hass, isDayMode);
  }

  // ── Badge computation ──────────────────────────────────────────────────────
  function updateV2Badge(hass) {
    const badge = document.querySelector('#kis-v2-nav .knb-badge');
    if (!badge) return;

    let urgent = 0;
    let advisory = 0;

    if (hass) {
      BADGE_LOCKS.forEach(id => {
        const ent = getState(hass, id);
        if (ent && ent.state === 'unlocked') urgent++;
      });
      BADGE_GARAGES.forEach(id => {
        const ent = getState(hass, id);
        if (ent && ent.state === 'open') urgent++;
      });
      const alarm = getState(hass, ALARM_ENTITY);
      const chris = getState(hass, 'person.chris');
      const claire = getState(hass, 'person.claire');
      if (alarm && alarm.state === 'disarmed') {
        const allAway = (!chris || chris.state !== 'home') && (!claire || claire.state !== 'home');
        if (allAway) urgent++;
      }
      for (const eid of _updateEntityKeys) {
        if (hass.states[eid]?.state === 'on') advisory++;
      }
    }

    const total = urgent + advisory;
    if (total === 0) {
      badge.setAttribute('hidden', '');
    } else {
      badge.removeAttribute('hidden');
      badge.textContent = total > 9 ? '9+' : String(total);
      badge.className = 'knb-badge ' + (urgent > 0 ? 'urgent' : 'advisory');
    }
  }

  // ── Mini-player rendering ──────────────────────────────────────────────────
  function updateV2MiniPlayer(hass, isDayMode) {
    const player = document.getElementById('kis-v2-player');
    if (!player) return;

    if (isDayMode) {
      player.setAttribute('data-kis-day', '');
    } else {
      player.removeAttribute('data-kis-day');
    }

    const ent = hass ? getState(hass, MEDIA_PLAYER_ENTITY) : null;
    const state = ent ? ent.state : 'off';
    const attrs = ent ? (ent.attributes || {}) : {};
    const hasMedia = !!(attrs.media_title || attrs.media_artist);
    const isActive = (state === 'playing' || state === 'paused') && hasMedia;

    if (!isActive) {
      if (_prevMediaState !== 'hidden') {
        player.setAttribute('hidden', '');
        _prevMediaState = 'hidden';
      }
      return;
    }

    if (_prevMediaState === 'hidden' || _prevMediaState === null) {
      player.removeAttribute('hidden');
    }
    _prevMediaState = state;

    const track = attrs.media_title || 'Unknown';
    const artist = attrs.media_artist || '';
    const art = attrs.entity_picture || '';

    const trackEl = player.querySelector('.kmp-track');
    if (trackEl && trackEl.textContent !== track) trackEl.textContent = track;

    const artistEl = player.querySelector('.kmp-artist');
    if (artistEl && artistEl.textContent !== artist) artistEl.textContent = artist;

    const artBox = player.querySelector('.kmp-art');
    if (artBox) {
      if (art) {
        const img = artBox.querySelector('img');
        if (img) { if (img.src !== art) img.src = art; }
        else { artBox.innerHTML = `<img src="${art}" alt="">`; }
      } else if (!artBox.querySelector('ha-icon')) {
        artBox.innerHTML = '<ha-icon icon="mdi:music-note"></ha-icon>';
      }
    }

    const playIcon = player.querySelector('.kmp-play ha-icon');
    const targetIcon = state === 'playing' ? 'mdi:pause' : 'mdi:play';
    if (playIcon && playIcon.getAttribute('icon') !== targetIcon) {
      playIcon.setAttribute('icon', targetIcon);
    }

    const duration = attrs.media_duration || 0;
    const position = attrs.media_position || 0;
    const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
    const fill = player.querySelector('.kmp-progress-fill');
    if (fill) fill.style.width = pct.toFixed(1) + '%';
  }

  // ── Extend onHassUpdate to drive UI ────────────────────────────────────────
  const _origOnHassUpdate = onHassUpdate;
  onHassUpdate = function(hass) {
    _origOnHassUpdate(hass);
    if (onV2Dashboard()) {
      renderV2Header();
      updateAlarmPanel();
    }
  };

  // ── Shadow DOM CSS injection (full-width, hide HA chrome) ──────────────
  function injectShadowCSS(shadowRoot, id, css) {
    if (!shadowRoot) return false;
    const existing = shadowRoot.querySelector('#' + id);
    if (existing) { existing.textContent = css; return true; }
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    shadowRoot.appendChild(style);
    return true;
  }

  function removeShadowCSS(shadowRoot, id) {
    if (!shadowRoot) return;
    const el = shadowRoot.querySelector('#' + id);
    if (el) el.remove();
  }

  const KIOSK_CSS = `
    app-header { display: none !important; }
    ha-app-layout {
      --header-height: 0px !important;
      --app-header-height: 0px !important;
    }
    #view { height: 100vh !important; }
  `;

  const KIOSK_DRAWER_HOST_CSS = ':host(.kis-kiosk-collapsed) { --mdc-drawer-width: 0px !important; }';
  const KIOSK_SIDEBAR_HOST_CSS = ':host(.kis-kiosk-hidden) { display: none !important; }';

  const SIDEBAR_INSET_CSS = `
    :host {
      padding-top: calc(68px + env(safe-area-inset-top, 0px)) !important;
      padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
      box-sizing: border-box !important;
      height: 100% !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .panels-list {
      overflow-y: auto !important;
      flex: 1 !important;
      min-height: 0 !important;
    }
  `;

  let _kioskOriginals = null;
  let _prevKiosk = null;
  let _patchesApplied = false;

  function forceReflow(...elements) {
    for (const el of elements) {
      if (el && typeof el.offsetHeight === 'number') void el.offsetHeight;
    }
  }

  // ISSUE C3 (2026-05-17): iPhone Companion App portrait does NOT show HA
  // sidebar overlay or hamburger when kiosk is OFF. WKWebView strict config
  // suppresses modal-drawer summon path on <470px viewports. All other
  // devices/orientations work. Accepted as scope-limited — mobilev2 is the
  // iPhone primary dashboard; escape paths exist (Mobile Safari, app
  // reinstall, default-dashboard setting).
  function syncKioskMode(hass) {
    if (!_kioskOriginals) return;
    const entity = hass?.states?.['input_boolean.kiosk_mode'];
    const isOn = !entity || entity.state === 'on';

    const ha = document.querySelector('home-assistant');
    const main = ha?.shadowRoot?.querySelector('home-assistant-main');
    const drawer = main?.shadowRoot?.querySelector('ha-drawer');
    const sidebar = drawer?.querySelector('ha-sidebar');
    const panel = drawer?.querySelector('ha-panel-lovelace') || main?.shadowRoot?.querySelector('ha-panel-lovelace');
    const huiRoot = panel?.shadowRoot?.querySelector('hui-root');

    // Inject :host() class rules into shadow roots (idempotent)
    if (drawer?.shadowRoot) {
      injectShadowCSS(drawer.shadowRoot, 'kisv2-kiosk-drawer-host', KIOSK_DRAWER_HOST_CSS);
    }
    if (sidebar?.shadowRoot) {
      injectShadowCSS(sidebar.shadowRoot, 'kisv2-kiosk-sidebar-host', KIOSK_SIDEBAR_HOST_CSS);
    }

    if (isOn) {
      if (drawer) {
        drawer.classList.add('kis-kiosk-collapsed');
        drawer.style.setProperty('--mdc-drawer-width', '0px');
        if (sidebar) {
          sidebar.classList.add('kis-kiosk-hidden');
          sidebar.style.display = 'none';
        }
        if (drawer.hasAttribute('open')) drawer.removeAttribute('open');
        drawer.setAttribute('type', 'modal');
      }
      if (huiRoot?.shadowRoot) {
        injectShadowCSS(huiRoot.shadowRoot, 'kisv2-kiosk-patch', KIOSK_CSS);
      }
      if (sidebar?.shadowRoot) {
        removeShadowCSS(sidebar.shadowRoot, 'kisv2-sidebar-inset-patch');
      }
      forceReflow(drawer, sidebar, huiRoot);
    } else {
      if (drawer) {
        drawer.classList.remove('kis-kiosk-collapsed');
        drawer.style.removeProperty('--mdc-drawer-width');
        if (_kioskOriginals?.drawerType) drawer.setAttribute('type', _kioskOriginals.drawerType);
        else drawer.removeAttribute('type');
        if (sidebar) {
          sidebar.classList.remove('kis-kiosk-hidden');
          sidebar.style.removeProperty('display');
        }
      }
      if (huiRoot?.shadowRoot) {
        removeShadowCSS(huiRoot.shadowRoot, 'kisv2-kiosk-patch');
      }
      if (sidebar?.shadowRoot) {
        injectShadowCSS(sidebar.shadowRoot, 'kisv2-sidebar-inset-patch', SIDEBAR_INSET_CSS);
      }
      forceReflow(drawer, sidebar, huiRoot);
    }

    _prevKiosk = entity?.state ?? null;
    try { localStorage.setItem('kis-kiosk-state', isOn ? 'on' : 'off'); } catch (e) {}
  }

  const HEADER_H = 68;

  function getHuiRootCSS() {
    return `
      #view {
        padding-top: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        -webkit-overflow-scrolling: touch !important;
        box-sizing: border-box;
      }
      hui-sections-view {
        padding-top: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        opacity: 0;
        visibility: hidden;
      }
      hui-sections-view.kis-ready {
        opacity: 1;
        visibility: visible;
        transition: opacity 250ms ease-out, visibility 0s linear 0s;
      }
    `;
  }

  function getAppLayoutCSS() {
    return `
      #contentContainer, [part="content"], .content {
        padding-top: 0 !important;
        margin-top: 0 !important;
        overflow-y: visible !important;
      }
    `;
  }

  function getSectionsViewCSS() {
    return `
      :host {
        display: block;
        margin-top: ${HEADER_H}px;
        padding-top: 0 !important;
        padding-bottom: 68px !important;
        box-sizing: border-box;
        --kis-spacing-b: clamp(10px, 1.5vw, 24px);
        --kis-spacing-h: calc(var(--kis-spacing-b) / 2);
        --ha-view-sections-column-max-width: none !important;
        --column-max-width: none !important;
        --ha-view-sections-column-gap: var(--kis-spacing-b) !important;
        --ha-view-sections-row-gap: var(--kis-spacing-h) !important;
        opacity: 0;
        visibility: hidden;
        transition: opacity 250ms ease-out, visibility 0s linear 250ms;
      }
      :host(.kis-ready) {
        opacity: 1;
        visibility: visible;
        transition: opacity 250ms ease-out, visibility 0s linear 0s;
      }
      .wrapper {
        padding: 0 !important;
        margin-top: 0 !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        max-width: 100% !important;
      }
      .container, .sections-container, [class*="container"] {
        margin-top: 0 !important;
        padding-top: var(--kis-spacing-b) !important;
        max-width: 100% !important;
        padding-left: 12px !important;
        padding-right: 12px !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
      .wrapper.top-margin, .top-margin {
        margin-top: 0 !important;
      }
      hui-section, hui-grid-section {
        --grid-section-header-margin: 0 !important;
        flex: 1 !important;
        min-height: 0 !important;
      }
      hui-section > hui-grid-section {
        height: 100% !important;
      }
      .container, .sections-container {
        align-items: stretch !important;
        align-content: start !important;
      }
      .container ha-sortable > div {
        align-items: stretch !important;
        grid-template-rows: auto auto !important;
      }
      .container ha-sortable > div > div {
        display: flex !important;
        flex-direction: column !important;
      }
      .section-header, [class*="header"] {
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .section-header:empty, .section-header:has(> :empty) {
        display: none !important;
      }
    `;
  }

  function getGridSectionCSS() {
    return `
      .header { display: none !important; }
      ha-sortable { height: 100%; }
      ha-sortable > div { height: 100%; grid-template-columns: 1fr !important; }
      hui-card { display: block; height: 100%; }
    `;
  }

  function patchGridSections(sectionsRoot) {
    const gridSections = sectionsRoot.querySelectorAll('hui-section, hui-grid-section');
    gridSections.forEach((gs, i) => {
      if (gs.shadowRoot) {
        injectShadowCSS(gs.shadowRoot, 'kisv2-gridsection-patch', getGridSectionCSS());
      }
    });
  }

  let _kisColSheet = null;
  let _kisColSheetRoot = null;
  function syncWrapperColumns() {
    if (!onV2Dashboard()) return;
    const cols = window.KIS_BREAKPOINT.columns;
    try {
      const ha = document.querySelector('home-assistant');
      const main = ha?.shadowRoot?.querySelector('home-assistant-main');
      const drawer = main?.shadowRoot?.querySelector('ha-drawer');
      const panel = (drawer?.querySelector('ha-panel-lovelace')) || main?.shadowRoot?.querySelector('ha-panel-lovelace');
      const huiRoot = panel?.shadowRoot?.querySelector('hui-root');
      const viewEl = huiRoot?.shadowRoot?.querySelector('#view');
      const sectionsView = viewEl?.querySelector('hui-sections-view');
      const sr = sectionsView?.shadowRoot;
      const wrapper = sr?.querySelector('.wrapper');
      if (!wrapper) return;
      wrapper.style.setProperty('--content-column-count', String(cols));
      wrapper.style.setProperty('--column-count', String(cols));
      wrapper.classList.toggle('kis-single-col', cols === 1);
      if (!_kisColSheet) {
        _kisColSheet = new CSSStyleSheet();
        _kisColSheet.replaceSync(
          '.wrapper.kis-single-col .content .section { grid-column: 1 / -1 !important; }'
        );
      }
      if (_kisColSheetRoot !== sr) {
        sr.adoptedStyleSheets = [...sr.adoptedStyleSheets, _kisColSheet];
        _kisColSheetRoot = sr;
      }
    } catch (e) { /* not ready yet */ }
  }

  // ── Early-hide: hide HA chrome + mobilev2 content before first paint ──
  let _earlyHideInjected = false;
  let _earlyChromeHidden = false;
  function earlyHideLoop() {
    if (_earlyHideInjected || !onV2Dashboard()) return;
    const ha = document.querySelector('home-assistant');
    const main = ha?.shadowRoot?.querySelector('home-assistant-main');
    const drawer = main?.shadowRoot?.querySelector('ha-drawer');

    // Bug E: hide HA chrome the frame drawer is available (before huiRoot)
    if (drawer && !_earlyChromeHidden) {
      const sidebar = drawer.querySelector('ha-sidebar');
      // Capture originals BEFORE modification so patchHALayout finds true defaults
      if (!_kioskOriginals) {
        _kioskOriginals = {
          drawerWidth: drawer.style.getPropertyValue('--mdc-drawer-width'),
          drawerType: drawer.getAttribute('type'),
          sidebarDisplay: sidebar ? sidebar.style.display : '',
        };
      }
      // Only early-hide if last-known kiosk state was ON (or unknown/first-load)
      const lastKiosk = localStorage.getItem('kis-kiosk-state');
      if (lastKiosk !== 'off') {
        drawer.classList.add('kis-kiosk-collapsed');
        drawer.style.setProperty('--mdc-drawer-width', '0px');
        if (drawer.hasAttribute('open')) drawer.removeAttribute('open');
        drawer.setAttribute('type', 'modal');
        if (sidebar) {
          sidebar.classList.add('kis-kiosk-hidden');
          sidebar.style.display = 'none';
        }
        if (drawer.shadowRoot) {
          injectShadowCSS(drawer.shadowRoot, 'kisv2-kiosk-drawer-host', KIOSK_DRAWER_HOST_CSS);
        }
        if (sidebar?.shadowRoot) {
          injectShadowCSS(sidebar.shadowRoot, 'kisv2-kiosk-sidebar-host', KIOSK_SIDEBAR_HOST_CSS);
        }
      }
      _earlyChromeHidden = true;
    }

    const panel = (drawer?.querySelector('ha-panel-lovelace')) || main?.shadowRoot?.querySelector('ha-panel-lovelace');
    const huiRoot = panel?.shadowRoot?.querySelector('hui-root');
    if (huiRoot?.shadowRoot) {
      injectShadowCSS(huiRoot.shadowRoot, 'kisv2-hui-patch', getHuiRootCSS());
      const lastKiosk = localStorage.getItem('kis-kiosk-state');
      if (lastKiosk !== 'off') {
        injectShadowCSS(huiRoot.shadowRoot, 'kisv2-kiosk-patch', KIOSK_CSS);
      }
      _earlyHideInjected = true;
      return;
    }
    requestAnimationFrame(earlyHideLoop);
  }

  let _revealGateActive = false;
  let _revealFailsafe = null;

  function armRevealGate(sectionsView) {
    if (_revealGateActive) return;
    _revealGateActive = true;

    _revealFailsafe = setTimeout(() => {
      if (!sectionsView.classList.contains('kis-ready')) {
        console.warn('[kis-app-shell] reveal failsafe fired — a custom element may have failed to register');
        sectionsView.classList.add('kis-ready');
      }
      _revealGateActive = false;
    }, 2000);

    Promise.all([
      customElements.whenDefined('kis-scenes'),
      customElements.whenDefined('kis-control-panel'),
      customElements.whenDefined('kis-priority-view'),
      customElements.whenDefined('kis-settings'),
    ]).then(() => {
      function checkReady() {
        if (!_hass || !window.KIS_BREAKPOINT.name) { requestAnimationFrame(checkReady); return; }
        requestAnimationFrame(() => requestAnimationFrame(() => {
          sectionsView.classList.add('kis-ready');
          clearTimeout(_revealFailsafe);
          _revealGateActive = false;
        }));
      }
      checkReady();
    });
  }

  let _pendingViewObserver = null;
  let _viewObserverFailsafe = null;

  function resetRevealGate() {
    _patchesApplied = false;
    _revealGateActive = false;
    _earlyHideInjected = false;
    _earlyChromeHidden = false;
    if (_revealFailsafe) { clearTimeout(_revealFailsafe); _revealFailsafe = null; }

    // Guard 1: disconnect prior observer on rapid nav
    if (_pendingViewObserver) { _pendingViewObserver.disconnect(); _pendingViewObserver = null; }
    if (_viewObserverFailsafe) { clearTimeout(_viewObserverFailsafe); _viewObserverFailsafe = null; }

    const ha = document.querySelector('home-assistant');
    const main = ha?.shadowRoot?.querySelector('home-assistant-main');
    const drawer = main?.shadowRoot?.querySelector('ha-drawer');
    const panel = drawer?.querySelector('ha-panel-lovelace') || main?.shadowRoot?.querySelector('ha-panel-lovelace');
    const huiRoot = panel?.shadowRoot?.querySelector('hui-root');
    const viewEl = huiRoot?.shadowRoot?.querySelector('#view');
    const sv = viewEl?.querySelector('hui-sections-view');
    if (sv) sv.classList.remove('kis-ready');
    requestAnimationFrame(earlyHideLoop);

    // Guard 2: defensive #view lookup — only install observer if viewEl exists
    if (viewEl) {
      let fired = false;

      function onViewSwap() {
        if (fired) return;
        fired = true;
        if (_pendingViewObserver) { _pendingViewObserver.disconnect(); _pendingViewObserver = null; }
        if (_viewObserverFailsafe) { clearTimeout(_viewObserverFailsafe); _viewObserverFailsafe = null; }
        // HA swaps HUI-VIEW children; hui-sections-view inside may not have
        // a shadowRoot yet. RAF-poll until it does, then patch.
        function waitForSectionsView(n) {
          const newSv = viewEl.querySelector('hui-sections-view');
          if (newSv?.shadowRoot) { patchHALayout(0); return; }
          if (n < 60) requestAnimationFrame(() => waitForSectionsView(n + 1));
        }
        requestAnimationFrame(() => waitForSectionsView(0));
      }

      _pendingViewObserver = new MutationObserver(onViewSwap);
      _pendingViewObserver.observe(viewEl, { childList: true });

      // Guard 3: failsafe — if observer doesn't fire within 500ms, patch directly
      _viewObserverFailsafe = setTimeout(() => {
        _viewObserverFailsafe = null;
        onViewSwap();
      }, 500);
    }
  }

  function unpatchHALayout() {
    const ha = document.querySelector('home-assistant');
    const main = ha?.shadowRoot?.querySelector('home-assistant-main');
    const drawer = main?.shadowRoot?.querySelector('ha-drawer');
    const panel = drawer?.querySelector('ha-panel-lovelace') || main?.shadowRoot?.querySelector('ha-panel-lovelace');
    const huiRoot = panel?.shadowRoot?.querySelector('hui-root');
    const huiShadow = huiRoot?.shadowRoot;

    if (huiShadow) {
      removeShadowCSS(huiShadow, 'kisv2-hui-patch');
      removeShadowCSS(huiShadow, 'kisv2-kiosk-patch');
      const appLayout = huiShadow.querySelector('ha-app-layout');
      if (appLayout?.shadowRoot) {
        removeShadowCSS(appLayout.shadowRoot, 'kisv2-applayout-patch');
      }
      const viewEl = huiShadow.querySelector('#view');
      const sectionsView = viewEl?.querySelector('hui-sections-view');
      if (sectionsView?.shadowRoot) {
        removeShadowCSS(sectionsView.shadowRoot, 'kisv2-sections-patch');
        sectionsView.shadowRoot.querySelectorAll('hui-section, hui-grid-section').forEach(gs => {
          if (gs.shadowRoot) removeShadowCSS(gs.shadowRoot, 'kisv2-gridsection-patch');
        });
      }
    }

    if (drawer) {
      drawer.classList.remove('kis-kiosk-collapsed');
      drawer.style.removeProperty('--mdc-drawer-width');
      if (_kioskOriginals?.drawerType) drawer.setAttribute('type', _kioskOriginals.drawerType);
      else drawer.removeAttribute('type');
      const sidebar = drawer.querySelector('ha-sidebar');
      if (sidebar) {
        sidebar.classList.remove('kis-kiosk-hidden');
        sidebar.style.removeProperty('display');
        if (sidebar.shadowRoot) {
          removeShadowCSS(sidebar.shadowRoot, 'kisv2-sidebar-inset-patch');
          removeShadowCSS(sidebar.shadowRoot, 'kisv2-kiosk-sidebar-host');
        }
      }
      if (drawer.shadowRoot) {
        removeShadowCSS(drawer.shadowRoot, 'kisv2-kiosk-drawer-host');
      }
      forceReflow(drawer, sidebar);
    }

    _kioskOriginals = null;
    _prevKiosk = null;
    _patchesApplied = false;
    _earlyHideInjected = false;
    _earlyChromeHidden = false;
    _kisColSheetRoot = null;
  }

  function patchHALayout(attempt) {
    attempt = attempt || 0;
    if (!onV2Dashboard()) return;

    if (_patchesApplied) {
      try {
        const ha = document.querySelector('home-assistant');
        const huiShadow = ha?.shadowRoot
          ?.querySelector('home-assistant-main')?.shadowRoot
          ?.querySelector('ha-drawer ha-panel-lovelace, ha-panel-lovelace')?.shadowRoot
          ?.querySelector('hui-root')?.shadowRoot;
        if (huiShadow?.querySelector('#kisv2-hui-patch')) {
          const sv = huiShadow.querySelector('#view hui-sections-view');
          if (sv?.shadowRoot?.querySelector('#kisv2-sections-patch')) return;
        }
      } catch (_) { /* fall through to full patch */ }
      _patchesApplied = false;
    }

    try {
      const ha = document.querySelector('home-assistant');
      if (!ha?.shadowRoot) throw new Error('no ha root');

      const main = ha.shadowRoot.querySelector('home-assistant-main');
      if (!main?.shadowRoot) throw new Error('no main');

      let panel = null;
      const drawer = main.shadowRoot.querySelector('ha-drawer');
      if (drawer) {
        panel = drawer.querySelector('ha-panel-lovelace');
        // Capture originals before any hide — first drawer encounter only
        if (!_kioskOriginals) {
          const sidebar = drawer.querySelector('ha-sidebar');
          _kioskOriginals = {
            drawerWidth: drawer.style.getPropertyValue('--mdc-drawer-width'),
            drawerType: drawer.getAttribute('type'),
            sidebarDisplay: sidebar ? sidebar.style.display : '',
          };
        }
        // Inject :host() class rules for class-based kiosk toggling
        if (drawer.shadowRoot) {
          injectShadowCSS(drawer.shadowRoot, 'kisv2-kiosk-drawer-host', KIOSK_DRAWER_HOST_CSS);
        }
        const sidebarBoot = drawer.querySelector('ha-sidebar');
        if (sidebarBoot?.shadowRoot) {
          injectShadowCSS(sidebarBoot.shadowRoot, 'kisv2-kiosk-sidebar-host', KIOSK_SIDEBAR_HOST_CSS);
        }
        // Boot-time: hide chrome if last-known kiosk was ON or unknown.
        // Once _hass is available, syncKioskMode handles state-aware toggling.
        if (!_hass && localStorage.getItem('kis-kiosk-state') !== 'off') {
          drawer.classList.add('kis-kiosk-collapsed');
          drawer.style.setProperty('--mdc-drawer-width', '0px');
          if (sidebarBoot) {
            sidebarBoot.classList.add('kis-kiosk-hidden');
            sidebarBoot.style.display = 'none';
          }
          if (drawer.hasAttribute('open')) drawer.removeAttribute('open');
          drawer.setAttribute('type', 'modal');
        }
      }
      if (!panel) panel = main.shadowRoot.querySelector('ha-panel-lovelace');
      if (!panel?.shadowRoot) throw new Error('no panel');

      const huiRoot = panel.shadowRoot.querySelector('hui-root');
      if (!huiRoot?.shadowRoot) throw new Error('no hui-root');

      const huiShadow = huiRoot.shadowRoot;
      injectShadowCSS(huiShadow, 'kisv2-hui-patch', getHuiRootCSS());
      // Boot-time kiosk CSS injection (before _hass is available)
      if (!_hass && localStorage.getItem('kis-kiosk-state') !== 'off') {
        injectShadowCSS(huiShadow, 'kisv2-kiosk-patch', KIOSK_CSS);
      }

      const appLayout = huiShadow.querySelector('ha-app-layout');
      if (appLayout?.shadowRoot) {
        injectShadowCSS(appLayout.shadowRoot, 'kisv2-applayout-patch', getAppLayoutCSS());
      }

      const viewEl = huiShadow.querySelector('#view');
      if (viewEl) {
        const sectionsView = viewEl.querySelector('hui-sections-view');
        if (sectionsView?.shadowRoot) {
          injectShadowCSS(sectionsView.shadowRoot, 'kisv2-sections-patch', getSectionsViewCSS());
          patchGridSections(sectionsView.shadowRoot);
          syncWrapperColumns();
          armRevealGate(sectionsView);
        }
      }

      if (_hass) syncKioskMode(_hass);
      _patchesApplied = true;
    } catch (e) {
      if (attempt < 30) {
        setTimeout(() => patchHALayout(attempt + 1), Math.min(300 * (attempt + 1), 2000));
      }
    }
  }

  // ── Boot persistent UI ────────────────────────────────────────────────────
  function bootUI() {
    if (customElements.get('ha-icon')) {
      injectUI();
    } else {
      customElements.whenDefined('ha-icon').then(() => setTimeout(injectUI, 200));
    }

    // Re-apply density tokens after HA's theme init completes (fixes race where
    // HA's style writes drop --kis-card-h during initial page load)
    setTimeout(recomputeBreakpoint, 100);

    function onLocationChange() {
      syncV2State();
      if (onV2Dashboard()) {
        resetRevealGate();
        setTimeout(() => patchHALayout(0), 500);
      } else {
        unpatchHALayout();
      }
    }
    window.addEventListener('location-changed', onLocationChange);
    window.addEventListener('popstate', onLocationChange);

    // Bug D + iOS resume fix: re-arm reveal gate when app returns from background
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && onV2Dashboard()) {
        resetRevealGate();
        setTimeout(() => patchHALayout(0), 500);
        if (_hass) syncKioskMode(_hass);
      }
    });
    window.addEventListener('pageshow', () => {
      if (onV2Dashboard()) {
        resetRevealGate();
        setTimeout(() => patchHALayout(0), 500);
        if (_hass) syncKioskMode(_hass);
      }
    });

    window.addEventListener('kis-color-changed', () => {
      if (_hass) applyColors(readColors(_hass, resolveMode(_hass)));
    });

    // Tick header every second for live clock
    setInterval(() => {
      if (onV2Dashboard() && _hass) renderV2Header();
    }, 1000);

    // Initial layout patch with retries
    setTimeout(() => patchHALayout(0), 500);

    // HA may swap sections-view after patchHALayout succeeds on an earlier
    // instance. Re-run the full patch at staggered delays to catch the final one.
    setTimeout(() => patchHALayout(0), 2000);
    setTimeout(() => patchHALayout(0), 5000);

  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  connectToHA();
  requestAnimationFrame(earlyHideLoop);
  bootUI();

})();
