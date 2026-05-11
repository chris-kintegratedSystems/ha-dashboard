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
 * Loaded via lovelace.resources in configuration.yaml.
 * Survives Lovelace page transitions.
 *
 * Paired with: kis-dashboard-v2.yaml (page structure)
 * Depends on: kis-design-tokens.js (sizing constants)
 */

(function () {
  'use strict';

  const VERSION = '2';
  window.KIS_APP_SHELL_VERSION = VERSION;

  const DASHBOARD_PREFIX = '/mobile-v2';
  const NAV_H = 80;
  const MEDIA_PLAYER_ENTITY = 'media_player.benjamins_hatch_media_player';

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

  // ── Card registration: forward hass to custom cards ────────────────────────
  const _registeredCards = new Set();
  window.KIS_REGISTER_CARD = (card) => { _registeredCards.add(card); if (_hass) card.hass = _hass; };
  window.KIS_UNREGISTER_CARD = (card) => { _registeredCards.delete(card); };

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
    _currentMode = mode;
  }

  // ── HA connection hook ────────────────────────────────────────────────────
  // Wait for the HA frontend to provide the hass object, then subscribe
  function connectToHA() {
    const doc = document;

    function tryConnect() {
      const haMain = doc.querySelector('home-assistant');
      if (!haMain || !haMain.hass) {
        requestAnimationFrame(tryConnect);
        return;
      }

      _hass = haMain.hass;

      // First-boot: seed helpers if needed
      initializeHelpersIfNeeded(_hass);

      // Apply current theme colors
      initTheme(_hass);

      // Watch for hass updates (theme mode, sun, helper changes)
      const origDescriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(haMain), 'hass'
      );
      let _hassValue = haMain.hass;

      Object.defineProperty(haMain, 'hass', {
        get() { return _hassValue; },
        set(newHass) {
          if (origDescriptor && origDescriptor.set) {
            origDescriptor.set.call(this, newHass);
          }
          _hassValue = newHass;
          _hass = newHass;
          onHassUpdate(newHass);
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

    // Check if any color helper changed (for live preview from settings)
    const newMode = resolveMode(hass);
    for (const entry of COLOR_MAP) {
      const entityId = `input_text.kis_${newMode}_${entry.key}`;
      const entity = hass.states[entityId];
      if (entity && entity.state && entity.state.startsWith('#')) {
        const current = document.documentElement.style.getPropertyValue(entry.css).trim();
        if (current !== entity.state) {
          applyColors(readColors(hass, newMode));
          break;
        }
      }
    }
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

    // Event delegation on header: person pills + alarm
    header.addEventListener('click', (e) => {
      let entityId = null;
      if (e.target.closest('.kh-alarm')) entityId = 'alarm_control_panel.kuprycz_home';
      const personEl = e.target.closest('.kh-person-pill');
      if (personEl && personEl.dataset.entity) entityId = personEl.dataset.entity;
      if (entityId) {
        const ha = document.querySelector('home-assistant');
        if (ha) {
          ha.dispatchEvent(new CustomEvent('hass-more-info', {
            bubbles: true, composed: true,
            detail: { entityId },
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

    if (onV2Dashboard()) {
      nav.removeAttribute('hidden');
      header.removeAttribute('hidden');
      const activeSlug = getActiveSlug();
      nav.querySelectorAll('.knb-btn').forEach(btn => {
        btn.classList.toggle('knb-active', btn.dataset.slug === activeSlug);
      });
      renderV2Header();
    } else {
      nav.setAttribute('hidden', '');
      header.setAttribute('hidden', '');
      if (player) player.setAttribute('hidden', '');
      _headerInitialized = false;
      _prevMediaState = null;
    }
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
    const alarmEnt = getState(_hass, 'alarm_control_panel.kuprycz_home');
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
      const alarm = getState(hass, 'alarm_control_panel.kuprycz_home');
      const chris = getState(hass, 'person.chris');
      const claire = getState(hass, 'person.claire');
      if (alarm && alarm.state === 'disarmed') {
        const allAway = (!chris || chris.state !== 'home') && (!claire || claire.state !== 'home');
        if (allAway) urgent++;
      }
      // Advisory: any HACS/integration update available
      const updateEntities = Object.keys(hass.states).filter(k => k.startsWith('update.'));
      for (const eid of updateEntities) {
        if (hass.states[eid].state === 'on') advisory++;
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

  const HEADER_H = 68;

  function getHuiRootCSS() {
    return `
      app-header { display: none !important; }
      ha-app-layout {
        --header-height: 0px !important;
        --app-header-height: 0px !important;
      }
      #view {
        height: 100vh !important;
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
      }
    `;
  }

  function getAppLayoutCSS() {
    return `
      :host {
        --header-height: 0px !important;
        --app-header-height: 0px !important;
      }
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
        padding-bottom: ${NAV_H}px !important;
        box-sizing: border-box;
        --kis-spacing-b: clamp(10px, 1.5vw, 24px);
        --kis-spacing-h: calc(var(--kis-spacing-b) / 2);
        --ha-view-sections-column-max-width: none !important;
        --column-max-width: none !important;
        --ha-view-sections-column-gap: var(--kis-spacing-b) !important;
        --ha-view-sections-row-gap: var(--kis-spacing-b) !important;
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
      hui-grid-section {
        --grid-section-header-margin: 0 !important;
        align-self: stretch !important;
      }
      .container, .sections-container {
        align-items: stretch !important;
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
      .header { min-height: 0 !important; margin: 0 !important; padding: 0 !important; }
      .header:has(h2:empty), .header:not(:has(h2)), .header:has(h2:not(:empty)):not(.has-title) { display: none !important; }
      h2:empty { display: none !important; }
      ha-sortable { height: 100%; }
      ha-sortable > div { min-height: 100%; }
      hui-card { display: block; height: 100%; }
    `;
  }

  function patchGridSections(sectionsRoot) {
    const gridSections = sectionsRoot.querySelectorAll('hui-grid-section');
    gridSections.forEach((gs, i) => {
      if (gs.shadowRoot) {
        injectShadowCSS(gs.shadowRoot, 'kisv2-gridsection-patch', getGridSectionCSS());
      }
    });
    equalizeRowHeights(gridSections);
  }

  function equalizeRowHeights(gridSections) {
    if (!gridSections.length) return;
    const rows = new Map();
    for (const gs of gridSections) {
      const top = Math.round(gs.getBoundingClientRect().top);
      if (!rows.has(top)) rows.set(top, []);
      rows.get(top).push(gs);
    }
    for (const [, group] of rows) {
      if (group.length < 2) continue;
      const maxH = Math.max(...group.map(gs => gs.getBoundingClientRect().height));
      for (const gs of group) {
        if (gs.getBoundingClientRect().height < maxH - 1) {
          gs.style.minHeight = maxH + 'px';
        }
      }
    }
  }

  function patchHALayout(attempt) {
    attempt = attempt || 0;
    if (!onV2Dashboard()) return;

    try {
      const ha = document.querySelector('home-assistant');
      if (!ha?.shadowRoot) throw new Error('no ha root');

      const main = ha.shadowRoot.querySelector('home-assistant-main');
      if (!main?.shadowRoot) throw new Error('no main');

      let panel = null;
      const drawer = main.shadowRoot.querySelector('ha-drawer');
      if (drawer) {
        panel = drawer.querySelector('ha-panel-lovelace');
        // Hide sidebar and force full-width content
        drawer.style.setProperty('--mdc-drawer-width', '0px');
        const sidebar = drawer.querySelector('ha-sidebar');
        if (sidebar) sidebar.style.display = 'none';
        // Force drawer to not show aside
        if (drawer.hasAttribute('open')) drawer.removeAttribute('open');
        drawer.setAttribute('type', 'modal');
      }
      if (!panel) panel = main.shadowRoot.querySelector('ha-panel-lovelace');
      if (!panel?.shadowRoot) throw new Error('no panel');

      const huiRoot = panel.shadowRoot.querySelector('hui-root');
      if (!huiRoot?.shadowRoot) throw new Error('no hui-root');

      const huiShadow = huiRoot.shadowRoot;
      injectShadowCSS(huiShadow, 'kisv2-hui-patch', getHuiRootCSS());

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
          setTimeout(() => equalizeRowHeights(sectionsView.shadowRoot.querySelectorAll('hui-grid-section')), 1000);
          setTimeout(() => equalizeRowHeights(sectionsView.shadowRoot.querySelectorAll('hui-grid-section')), 3000);
        }
      }
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

    window.addEventListener('location-changed', () => { syncV2State(); patchHALayout(0); });
    window.addEventListener('popstate', () => { syncV2State(); patchHALayout(0); });

    // Tick header every second for live clock
    setInterval(() => {
      if (onV2Dashboard() && _hass) renderV2Header();
    }, 1000);

    // Initial layout patch with retries
    setTimeout(() => patchHALayout(0), 500);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  connectToHA();
  bootUI();

})();
